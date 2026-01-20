'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Play, Pause, RotateCcw, Shuffle, Users, Clock,
  Zap, Target, Trophy, Info
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Cell {
  id: number
  value: number
  owner: 'player' | 'ai' | null
  isNew: boolean
}

interface GameState {
  grid: Cell[]
  currentTurn: 'player' | 'ai'
  playerScore: number
  aiScore: number
  round: number
  isGameOver: boolean
  vrfSeed: string
  history: string[]
}

const GRID_SIZE = 4

function generateVRFSeed(): string {
  // Simulated VRF seed - in production this would come from Kaspa blocks
  return Array.from({ length: 8 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('')
}

function generateRandomValue(seed: string, index: number): number {
  // Simulated deterministic random - in production uses Recursive Folding
  const combined = seed + index.toString()
  let hash = 0
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash) + combined.charCodeAt(i)
    hash = hash & hash
  }
  return Math.abs(hash % 9) + 1
}

export function ToyGridGame() {
  const [gameState, setGameState] = useState<GameState>(() => initializeGame())
  const [isAnimating, setIsAnimating] = useState(false)
  const [showInfo, setShowInfo] = useState(false)

  function initializeGame(): GameState {
    const seed = generateVRFSeed()
    const grid: Cell[] = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => ({
      id: i,
      value: generateRandomValue(seed, i),
      owner: null,
      isNew: true,
    }))

    return {
      grid,
      currentTurn: 'player',
      playerScore: 0,
      aiScore: 0,
      round: 1,
      isGameOver: false,
      vrfSeed: seed,
      history: [`Game started with VRF seed: ${seed}`],
    }
  }

  const resetGame = useCallback(() => {
    setGameState(initializeGame())
    setIsAnimating(false)
  }, [])

  const handleCellClick = useCallback((cellId: number) => {
    if (isAnimating || gameState.currentTurn !== 'player' || gameState.isGameOver) return

    const cell = gameState.grid[cellId]
    if (cell.owner !== null) return

    setIsAnimating(true)

    setGameState(prev => {
      const newGrid = [...prev.grid]
      newGrid[cellId] = { ...cell, owner: 'player', isNew: false }
      const newPlayerScore = prev.playerScore + cell.value
      const newHistory = [...prev.history, `Player claimed cell ${cellId} (+${cell.value})`]

      // Check if game is over
      const remainingCells = newGrid.filter(c => c.owner === null)
      if (remainingCells.length === 0) {
        return {
          ...prev,
          grid: newGrid,
          playerScore: newPlayerScore,
          isGameOver: true,
          history: [...newHistory, `Game over! ${newPlayerScore > prev.aiScore ? 'Player wins!' : 'AI wins!'}`],
        }
      }

      return {
        ...prev,
        grid: newGrid,
        playerScore: newPlayerScore,
        currentTurn: 'ai',
        history: newHistory,
      }
    })
  }, [isAnimating, gameState])

  // AI turn
  useEffect(() => {
    if (gameState.currentTurn === 'ai' && !gameState.isGameOver) {
      const timeout = setTimeout(() => {
        const availableCells = gameState.grid
          .map((cell, idx) => ({ ...cell, idx }))
          .filter(cell => cell.owner === null)

        if (availableCells.length === 0) return

        // Simple AI: pick the highest value available
        const bestCell = availableCells.reduce((best, cell) => 
          cell.value > best.value ? cell : best
        )

        setGameState(prev => {
          const newGrid = [...prev.grid]
          newGrid[bestCell.idx] = { ...newGrid[bestCell.idx], owner: 'ai', isNew: false }
          const newAiScore = prev.aiScore + bestCell.value
          const newHistory = [...prev.history, `AI claimed cell ${bestCell.idx} (+${bestCell.value})`]

          const remainingCells = newGrid.filter(c => c.owner === null)
          if (remainingCells.length === 0) {
            return {
              ...prev,
              grid: newGrid,
              aiScore: newAiScore,
              isGameOver: true,
              round: prev.round + 1,
              history: [...newHistory, `Game over! ${prev.playerScore > newAiScore ? 'Player wins!' : 'AI wins!'}`],
            }
          }

          return {
            ...prev,
            grid: newGrid,
            aiScore: newAiScore,
            currentTurn: 'player',
            round: prev.round + 1,
            history: newHistory,
          }
        })

        setIsAnimating(false)
      }, 800)

      return () => clearTimeout(timeout)
    } else {
      setIsAnimating(false)
    }
  }, [gameState.currentTurn, gameState.isGameOver, gameState.grid])

  return (
    <div className="space-y-6">
      {/* Game header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={resetGame}
            className="btn-secondary flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            New Game
          </button>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="btn-ghost flex items-center gap-2"
          >
            <Info className="w-4 h-4" />
            How to Play
          </button>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Shuffle className="w-4 h-4" />
          <span>Seed: </span>
          <code className="px-2 py-1 bg-muted rounded text-xs font-mono">
            {gameState.vrfSeed}
          </code>
        </div>
      </div>

      {/* Info panel */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="glass rounded-xl p-6 border border-border/50">
              <h3 className="font-semibold mb-3">How the Toy Grid Game Works</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan mt-2 flex-shrink-0" />
                  <span>Click any unclaimed cell to claim it and add its value to your score.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan mt-2 flex-shrink-0" />
                  <span>The AI will then make its move, choosing the highest-value available cell.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan mt-2 flex-shrink-0" />
                  <span>All cell values are derived from the VRF seed using Recursive Folding.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan mt-2 flex-shrink-0" />
                  <span>Anyone with the seed can verify all random values are deterministic.</span>
                </li>
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scores */}
      <div className="grid grid-cols-2 gap-4">
        <div className={cn(
          'glass rounded-xl p-4 border-2 transition-colors',
          gameState.currentTurn === 'player' && !gameState.isGameOver
            ? 'border-neon-cyan shadow-glow-sm'
            : 'border-border/50'
        )}>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Users className="w-4 h-4" />
            Player (You)
          </div>
          <div className="text-3xl font-bold gradient-text">{gameState.playerScore}</div>
        </div>

        <div className={cn(
          'glass rounded-xl p-4 border-2 transition-colors',
          gameState.currentTurn === 'ai' && !gameState.isGameOver
            ? 'border-neon-purple shadow-neon-purple'
            : 'border-border/50'
        )}>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Zap className="w-4 h-4" />
            AI Opponent
          </div>
          <div className="text-3xl font-bold text-neon-purple">{gameState.aiScore}</div>
        </div>
      </div>

      {/* Game grid */}
      <div className="glass rounded-xl p-6 border border-border/50">
        <div 
          className="grid gap-3 mx-auto"
          style={{ 
            gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
            maxWidth: '400px'
          }}
        >
          {gameState.grid.map((cell, index) => (
            <motion.button
              key={cell.id}
              whileHover={cell.owner === null && gameState.currentTurn === 'player' ? { scale: 1.05 } : {}}
              whileTap={cell.owner === null && gameState.currentTurn === 'player' ? { scale: 0.95 } : {}}
              onClick={() => handleCellClick(index)}
              disabled={cell.owner !== null || gameState.currentTurn !== 'player' || gameState.isGameOver}
              className={cn(
                'aspect-square rounded-lg flex items-center justify-center text-2xl font-bold transition-all duration-300',
                cell.owner === null && 'glass border border-border/50 hover:border-primary/50 cursor-pointer',
                cell.owner === 'player' && 'bg-gradient-to-br from-neon-cyan/20 to-blue-500/20 border-2 border-neon-cyan',
                cell.owner === 'ai' && 'bg-gradient-to-br from-neon-purple/20 to-pink-500/20 border-2 border-neon-purple',
                cell.owner === null && gameState.currentTurn === 'player' && !gameState.isGameOver && 'hover:shadow-glow-sm'
              )}
            >
              <motion.span
                initial={cell.isNew ? { scale: 0 } : false}
                animate={{ scale: 1 }}
                className={cn(
                  cell.owner === 'player' && 'text-neon-cyan',
                  cell.owner === 'ai' && 'text-neon-purple',
                  cell.owner === null && 'text-muted-foreground'
                )}
              >
                {cell.value}
              </motion.span>
            </motion.button>
          ))}
        </div>

        {/* Turn indicator */}
        <div className="mt-6 text-center">
          {gameState.isGameOver ? (
            <div className="flex items-center justify-center gap-2 text-lg font-semibold">
              <Trophy className="w-5 h-5 text-yellow-500" />
              {gameState.playerScore > gameState.aiScore
                ? 'You win!'
                : gameState.playerScore < gameState.aiScore
                ? 'AI wins!'
                : "It's a tie!"}
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              {gameState.currentTurn === 'player' ? 'Your turn' : 'AI thinking...'}
            </div>
          )}
        </div>
      </div>

      {/* History log */}
      <div className="glass rounded-xl p-4 border border-border/50 max-h-48 overflow-y-auto">
        <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Game Log (Auditable)</h4>
        <div className="space-y-1 text-xs font-mono text-muted-foreground">
          {gameState.history.map((entry, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-primary">[{i}]</span>
              <span>{entry}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
