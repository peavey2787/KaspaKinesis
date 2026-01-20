'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Play, Pause, RotateCcw, Shuffle, Box, ArrowRight,
  CheckCircle, Loader2, Hash, Binary, Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Block {
  id: number
  hash: string
  nonce: string
  timestamp: number
  processed: boolean
}

interface EntropyOutput {
  blockId: number
  inputHash: string
  foldedValue: string
  finalEntropy: string
  step: number
}

function generateBlockHash(): string {
  return Array.from({ length: 64 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('')
}

function generateNonce(): string {
  return Array.from({ length: 16 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('')
}

function simulateFolding(hash: string, nonce: string): string[] {
  const steps: string[] = []
  let current = hash + nonce
  
  for (let i = 0; i < 4; i++) {
    // Simulate folding steps
    let folded = ''
    for (let j = 0; j < 32; j++) {
      const idx1 = j
      const idx2 = current.length - 1 - j
      const val = (parseInt(current[idx1], 16) ^ parseInt(current[idx2 % current.length], 16)).toString(16)
      folded += val
    }
    steps.push(folded)
    current = folded
  }
  
  return steps
}

export function VRFVisualizer() {
  const [isRunning, setIsRunning] = useState(false)
  const [blocks, setBlocks] = useState<Block[]>([])
  const [entropyOutputs, setEntropyOutputs] = useState<EntropyOutput[]>([])
  const [currentProcessing, setCurrentProcessing] = useState<number | null>(null)
  const [foldingSteps, setFoldingSteps] = useState<string[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const addBlock = useCallback(() => {
    const newBlock: Block = {
      id: Date.now(),
      hash: generateBlockHash(),
      nonce: generateNonce(),
      timestamp: Date.now(),
      processed: false,
    }
    setBlocks(prev => [...prev.slice(-9), newBlock])
  }, [])

  const processBlock = useCallback((block: Block) => {
    setCurrentProcessing(block.id)
    const steps = simulateFolding(block.hash, block.nonce)
    setFoldingSteps([])
    setCurrentStep(0)

    // Animate folding steps
    steps.forEach((step, i) => {
      setTimeout(() => {
        setFoldingSteps(prev => [...prev, step])
        setCurrentStep(i + 1)
      }, (i + 1) * 300)
    })

    // Complete processing
    setTimeout(() => {
      const finalEntropy = steps[steps.length - 1]
      setEntropyOutputs(prev => [...prev.slice(-9), {
        blockId: block.id,
        inputHash: block.hash.slice(0, 16) + '...',
        foldedValue: steps[1]?.slice(0, 16) + '...',
        finalEntropy: finalEntropy.slice(0, 16) + '...',
        step: entropyOutputs.length + 1,
      }])
      setBlocks(prev => prev.map(b => 
        b.id === block.id ? { ...b, processed: true } : b
      ))
      setCurrentProcessing(null)
      setFoldingSteps([])
    }, steps.length * 300 + 500)
  }, [entropyOutputs.length])

  useEffect(() => {
    if (isRunning) {
      // Add initial block
      addBlock()
      
      intervalRef.current = setInterval(() => {
        addBlock()
      }, 3000)

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current)
      }
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning, addBlock])

  // Process unprocessed blocks
  useEffect(() => {
    if (!currentProcessing && isRunning) {
      const unprocessed = blocks.find(b => !b.processed)
      if (unprocessed) {
        setTimeout(() => processBlock(unprocessed), 500)
      }
    }
  }, [blocks, currentProcessing, isRunning, processBlock])

  const reset = () => {
    setIsRunning(false)
    setBlocks([])
    setEntropyOutputs([])
    setCurrentProcessing(null)
    setFoldingSteps([])
    setCurrentStep(0)
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setIsRunning(!isRunning)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all',
            isRunning
              ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30'
              : 'btn-primary'
          )}
        >
          {isRunning ? (
            <>
              <Pause className="w-4 h-4" />
              Stop Collection
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Start Block Collection
            </>
          )}
        </button>
        <button onClick={reset} className="btn-secondary flex items-center gap-2">
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Block stream */}
        <div className="glass rounded-xl p-6 border border-border/50">
          <div className="flex items-center gap-2 mb-4">
            <Box className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Incoming Blocks</h3>
            {isRunning && (
              <span className="ml-auto flex items-center gap-1 text-xs text-neon-green">
                <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
                Live
              </span>
            )}
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            <AnimatePresence mode="popLayout">
              {blocks.map((block) => (
                <motion.div
                  key={block.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={cn(
                    'p-3 rounded-lg border transition-all',
                    currentProcessing === block.id
                      ? 'bg-primary/10 border-primary/50 shadow-glow-sm'
                      : block.processed
                      ? 'bg-muted/30 border-border/30'
                      : 'bg-card border-border/50'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">
                      Block #{block.id.toString().slice(-6)}
                    </span>
                    {currentProcessing === block.id ? (
                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    ) : block.processed ? (
                      <CheckCircle className="w-4 h-4 text-neon-green" />
                    ) : (
                      <span className="text-xs text-muted-foreground">Pending</span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Hash className="w-3 h-3 text-muted-foreground" />
                      <code className="text-xs font-mono text-muted-foreground truncate">
                        {block.hash.slice(0, 24)}...
                      </code>
                    </div>
                    <div className="flex items-center gap-2">
                      <Binary className="w-3 h-3 text-muted-foreground" />
                      <code className="text-xs font-mono text-muted-foreground">
                        Nonce: {block.nonce.slice(0, 8)}...
                      </code>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {blocks.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Start collection to see incoming blocks
              </div>
            )}
          </div>
        </div>

        {/* Folding visualization */}
        <div className="glass rounded-xl p-6 border border-border/50">
          <div className="flex items-center gap-2 mb-4">
            <Shuffle className="w-5 h-5 text-kaspa-primary" />
            <h3 className="font-semibold">Recursive Folding</h3>
          </div>

          {currentProcessing ? (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground mb-4">
                Processing block through 4-step folding algorithm...
              </div>
              
              {/* Folding steps */}
              <div className="space-y-2">
                {[1, 2, 3, 4].map((step) => (
                  <motion.div
                    key={step}
                    initial={{ opacity: 0.3 }}
                    animate={{ 
                      opacity: currentStep >= step ? 1 : 0.3,
                      scale: currentStep === step ? 1.02 : 1,
                    }}
                    className={cn(
                      'p-3 rounded-lg border transition-all',
                      currentStep >= step
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-border/30 bg-card/50'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                        currentStep >= step
                          ? 'bg-primary text-background'
                          : 'bg-muted text-muted-foreground'
                      )}>
                        {step}
                      </span>
                      <span className="text-sm font-medium">
                        {step === 1 ? 'Initial Mix' : 
                         step === 2 ? 'XOR Fold' :
                         step === 3 ? 'Bit Rotation' :
                         'Final Whitening'}
                      </span>
                      {currentStep === step && (
                        <Loader2 className="w-3 h-3 ml-auto text-primary animate-spin" />
                      )}
                      {currentStep > step && (
                        <CheckCircle className="w-4 h-4 ml-auto text-neon-green" />
                      )}
                    </div>
                    {foldingSteps[step - 1] && (
                      <code className="text-xs font-mono text-muted-foreground block truncate">
                        {foldingSteps[step - 1].slice(0, 32)}...
                      </code>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {isRunning ? 'Waiting for next block...' : 'Start collection to see folding process'}
            </div>
          )}
        </div>
      </div>

      {/* Entropy outputs */}
      <div className="glass rounded-xl p-6 border border-border/50">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-neon-green" />
          <h3 className="font-semibold">Generated Entropy (VRF Output)</h3>
          <span className="ml-auto text-xs text-muted-foreground">
            {entropyOutputs.length} outputs generated
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">#</th>
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Input Hash</th>
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Folded</th>
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Final Entropy</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {entropyOutputs.map((output, i) => (
                  <motion.tr
                    key={output.blockId}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="border-b border-border/30"
                  >
                    <td className="py-2 px-3 text-primary">{output.step}</td>
                    <td className="py-2 px-3 font-mono text-xs text-muted-foreground">{output.inputHash}</td>
                    <td className="py-2 px-3 font-mono text-xs text-muted-foreground">{output.foldedValue}</td>
                    <td className="py-2 px-3 font-mono text-xs text-neon-green">{output.finalEntropy}</td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {entropyOutputs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No entropy generated yet
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
