'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Play, CheckCircle, XCircle, Clock, AlertTriangle,
  BarChart3, Binary, Shuffle, Info, Download, RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'

type TestStatus = 'pending' | 'running' | 'passed' | 'failed' | 'warning'

interface NISTTest {
  id: string
  name: string
  description: string
  status: TestStatus
  pValue?: number
  result?: string
  category: 'basic' | 'block' | 'spectral' | 'template'
}

const initialTests: NISTTest[] = [
  {
    id: 'frequency',
    name: 'Frequency (Monobit) Test',
    description: 'Tests whether the number of 0s and 1s are approximately equal.',
    status: 'pending',
    category: 'basic',
  },
  {
    id: 'block-frequency',
    name: 'Frequency within Block',
    description: 'Tests frequency of 1s within M-bit blocks.',
    status: 'pending',
    category: 'block',
  },
  {
    id: 'runs',
    name: 'Runs Test',
    description: 'Tests the total number of uninterrupted sequences of identical bits.',
    status: 'pending',
    category: 'basic',
  },
  {
    id: 'longest-run',
    name: 'Longest Run of Ones',
    description: 'Tests the longest run of ones within M-bit blocks.',
    status: 'pending',
    category: 'block',
  },
  {
    id: 'binary-matrix',
    name: 'Binary Matrix Rank',
    description: 'Tests the rank of disjoint sub-matrices of the sequence.',
    status: 'pending',
    category: 'spectral',
  },
  {
    id: 'dft',
    name: 'Discrete Fourier Transform',
    description: 'Tests for periodic features in the sequence.',
    status: 'pending',
    category: 'spectral',
  },
  {
    id: 'non-overlapping',
    name: 'Non-overlapping Template',
    description: 'Tests for occurrences of pre-specified target strings.',
    status: 'pending',
    category: 'template',
  },
  {
    id: 'overlapping',
    name: 'Overlapping Template',
    description: 'Tests for the number of occurrences of m-bit runs of ones.',
    status: 'pending',
    category: 'template',
  },
  {
    id: 'universal',
    name: 'Maurer\'s Universal',
    description: 'Tests whether the sequence can be significantly compressed.',
    status: 'pending',
    category: 'basic',
  },
  {
    id: 'linear-complexity',
    name: 'Linear Complexity',
    description: 'Tests whether the sequence is complex enough to be random.',
    status: 'pending',
    category: 'spectral',
  },
  {
    id: 'serial',
    name: 'Serial Test',
    description: 'Tests the frequency of all possible overlapping m-bit patterns.',
    status: 'pending',
    category: 'template',
  },
  {
    id: 'approximate-entropy',
    name: 'Approximate Entropy',
    description: 'Compares frequency of overlapping blocks of consecutive lengths.',
    status: 'pending',
    category: 'basic',
  },
  {
    id: 'cumulative-sums',
    name: 'Cumulative Sums',
    description: 'Tests whether the cumulative sum is too large or small.',
    status: 'pending',
    category: 'basic',
  },
  {
    id: 'random-excursions',
    name: 'Random Excursions',
    description: 'Tests the number of cycles having exactly K visits.',
    status: 'pending',
    category: 'spectral',
  },
  {
    id: 'random-excursions-variant',
    name: 'Random Excursions Variant',
    description: 'Tests the total number of times a particular state is visited.',
    status: 'pending',
    category: 'spectral',
  },
]

const categoryLabels: Record<string, string> = {
  basic: 'Basic Tests',
  block: 'Block Tests',
  spectral: 'Spectral Tests',
  template: 'Template Tests',
}

const statusConfig = {
  pending: { color: 'text-muted-foreground', bg: 'bg-muted/30', icon: Clock },
  running: { color: 'text-blue-400', bg: 'bg-blue-500/10', icon: RefreshCw },
  passed: { color: 'text-neon-green', bg: 'bg-neon-green/10', icon: CheckCircle },
  failed: { color: 'text-red-400', bg: 'bg-red-500/10', icon: XCircle },
  warning: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: AlertTriangle },
}

export function NISTTestRunner() {
  const [tests, setTests] = useState<NISTTest[]>(initialTests)
  const [isRunning, setIsRunning] = useState(false)
  const [entropySource, setEntropySource] = useState<'simulated' | 'custom'>('simulated')
  const [customEntropy, setCustomEntropy] = useState('')
  const [showInfo, setShowInfo] = useState(false)

  const runTests = useCallback(async () => {
    setIsRunning(true)
    
    // Reset all tests
    setTests(prev => prev.map(t => ({ ...t, status: 'pending' as TestStatus, pValue: undefined, result: undefined })))

    // Run tests sequentially with simulated results
    for (let i = 0; i < tests.length; i++) {
      await new Promise(r => setTimeout(r, 200))
      
      setTests(prev => prev.map((t, idx) => 
        idx === i ? { ...t, status: 'running' } : t
      ))

      await new Promise(r => setTimeout(r, 300 + Math.random() * 500))

      // Simulate results
      const pValue = Math.random()
      let status: TestStatus = 'passed'
      let result = 'Random'

      if (pValue < 0.01) {
        status = 'failed'
        result = 'Non-Random'
      } else if (pValue < 0.05) {
        status = 'warning'
        result = 'Marginally Random'
      }

      setTests(prev => prev.map((t, idx) => 
        idx === i ? { ...t, status, pValue, result } : t
      ))
    }

    setIsRunning(false)
  }, [tests.length])

  const resetTests = () => {
    setTests(initialTests)
  }

  const passedCount = tests.filter(t => t.status === 'passed').length
  const failedCount = tests.filter(t => t.status === 'failed').length
  const warningCount = tests.filter(t => t.status === 'warning').length
  const completedCount = passedCount + failedCount + warningCount

  const categories = ['basic', 'block', 'spectral', 'template']

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={runTests}
            disabled={isRunning}
            className={cn(
              'btn-primary flex items-center gap-2',
              isRunning && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Running Tests...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run NIST SP 800-22 Tests
              </>
            )}
          </button>
          <button onClick={resetTests} className="btn-secondary flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Reset
          </button>
        </div>

        <button
          onClick={() => setShowInfo(!showInfo)}
          className="btn-ghost flex items-center gap-2"
        >
          <Info className="w-4 h-4" />
          About NIST Tests
        </button>
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
              <h3 className="font-semibold mb-3">About NIST SP 800-22</h3>
              <p className="text-sm text-muted-foreground mb-4">
                The NIST Statistical Test Suite (SP 800-22) is a collection of tests developed by the 
                National Institute of Standards and Technology to evaluate the randomness of binary 
                sequences produced by random or pseudorandom number generators.
              </p>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <h4 className="font-medium text-foreground">What it tests:</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Frequency distribution of bits</li>
                    <li>• Pattern repetition</li>
                    <li>• Compression resistance</li>
                    <li>• Spectral characteristics</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-foreground">Interpreting results:</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• <span className="text-neon-green">Pass</span>: p-value ≥ 0.01</li>
                    <li>• <span className="text-yellow-400">Warning</span>: 0.01 &lt; p-value &lt; 0.05</li>
                    <li>• <span className="text-red-400">Fail</span>: p-value &lt; 0.01</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary stats */}
      {completedCount > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="glass rounded-xl p-4 border border-border/50 text-center">
            <div className="text-3xl font-bold text-foreground">{completedCount}</div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </div>
          <div className="glass rounded-xl p-4 border border-neon-green/30 text-center">
            <div className="text-3xl font-bold text-neon-green">{passedCount}</div>
            <div className="text-sm text-muted-foreground">Passed</div>
          </div>
          <div className="glass rounded-xl p-4 border border-yellow-500/30 text-center">
            <div className="text-3xl font-bold text-yellow-400">{warningCount}</div>
            <div className="text-sm text-muted-foreground">Warnings</div>
          </div>
          <div className="glass rounded-xl p-4 border border-red-500/30 text-center">
            <div className="text-3xl font-bold text-red-400">{failedCount}</div>
            <div className="text-sm text-muted-foreground">Failed</div>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {isRunning && (
        <div className="glass rounded-lg p-4 border border-border/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Running tests...</span>
            <span className="text-sm text-muted-foreground">
              {tests.filter(t => t.status !== 'pending' && t.status !== 'running').length} / {tests.length}
            </span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-neon-cyan to-neon-green"
              initial={{ width: 0 }}
              animate={{ 
                width: `${(tests.filter(t => t.status !== 'pending' && t.status !== 'running').length / tests.length) * 100}%` 
              }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      {/* Test results by category */}
      {categories.map((category) => {
        const categoryTests = tests.filter(t => t.category === category)
        
        return (
          <div key={category} className="glass rounded-xl border border-border/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-border/50 bg-card/50">
              <h3 className="font-semibold">{categoryLabels[category]}</h3>
            </div>
            <div className="divide-y divide-border/30">
              {categoryTests.map((test) => {
                const StatusIcon = statusConfig[test.status].icon
                
                return (
                  <motion.div
                    key={test.id}
                    initial={false}
                    animate={{
                      backgroundColor: test.status === 'running' 
                        ? 'rgba(59, 130, 246, 0.05)' 
                        : 'transparent',
                    }}
                    className="px-6 py-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <StatusIcon className={cn(
                            'w-4 h-4',
                            statusConfig[test.status].color,
                            test.status === 'running' && 'animate-spin'
                          )} />
                          <span className="font-medium text-foreground">{test.name}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{test.description}</p>
                      </div>
                      
                      {test.pValue !== undefined && (
                        <div className="text-right">
                          <div className={cn(
                            'text-sm font-mono font-medium',
                            statusConfig[test.status].color
                          )}>
                            p = {test.pValue.toFixed(4)}
                          </div>
                          <div className={cn(
                            'text-xs',
                            statusConfig[test.status].color
                          )}>
                            {test.result}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Export results */}
      {completedCount === tests.length && (
        <div className="flex justify-center">
          <button className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Results (JSON)
          </button>
        </div>
      )}
    </div>
  )
}
