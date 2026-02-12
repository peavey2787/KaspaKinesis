'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play, Pause, RotateCcw, Shuffle, Box, ArrowRight,
  CheckCircle, Loader2, Hash, Binary, Zap, AlertCircle, ChevronRight, ChevronDown
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { kaspaPortal } from '@/kktp/engine/kaspa/kaspaPortal.js'
import { extractBits } from '@/kktp/engine/kaspa/vrf/core/extractor.js'
import { ensureCanonicalHash, sha256FoldingRule, rotatePositions, whitenEntropy } from '@/kktp/engine/kaspa/vrf/core/folding.js'

interface Block {
  id: number
  hash: string
  nonce: string
  timestamp: number
  processed: boolean
  source: 'kaspa' | 'btc'
}

interface EntropyOutput {
  outputId: string
  blockId: number
  inputHash: string
  foldedValue: string
  foldedFull: string
  finalEntropy: string
  step: number
  isReal: boolean
  proof?: VRFProof
  steps: Array<{ label: string; value: string }>
}

interface VRFProof {
  evidence?: {
    nist?: any
    kaspa?: Array<{ hash?: string; blockHash?: string; id?: string }>
    btc?: Array<{ hash?: string; blockHash?: string; id?: string }>
  }
  finalOutput?: string
  seed?: string
  iterations?: number
}

interface FoldingStep {
  value: string
  label: string
  completed: boolean
}

async function ensurePortalConnected() {
  await kaspaPortal.init()
  if (!kaspaPortal.isReady) {
    // Prefer a user-specified wRPC node URL to avoid Resolver/WASM class-mismatch issues.
    // DAG Dasher stores these settings under `ks-node-settings`.
    let rpcUrl: string | undefined
    let networkId: string | undefined
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem('ks-node-settings') : null
      if (raw) {
        const settings = JSON.parse(raw)
        if (typeof settings?.rpcUrl === 'string' && settings.rpcUrl.trim()) {
          rpcUrl = settings.rpcUrl.trim()
        }
        if (typeof settings?.networkId === 'string' && settings.networkId.trim()) {
          networkId = settings.networkId.trim()
        }
      }
    } catch {
      // ignore settings parse errors
    }

    await kaspaPortal.connect({
      networkId: networkId || 'testnet-10',
      rpcUrl,
      startIntelligence: true,
    })
    console.log('connected')
  }
}

export function VRFVisualizer() {
  const [isRunning, setIsRunning] = useState(false)
  const [blocks, setBlocks] = useState<Block[]>([])
  const [entropyOutputs, setEntropyOutputs] = useState<EntropyOutput[]>([])
  const [currentProcessing, setCurrentProcessing] = useState<number | null>(null)
  const [foldingSteps, setFoldingSteps] = useState<FoldingStep[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isAwaitingBlocks, setIsAwaitingBlocks] = useState(false)
  const [expandedOutputId, setExpandedOutputId] = useState<string | null>(null)
  const [portalReady, setPortalReady] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const outputCountRef = useRef(0)

  const isTransientBlockError = (message: string | null | undefined) => {
    if (!message) return false
    return [
      'Kaspa portal/VRF not ready',
      'Kaspa portal/VRF not ready yet',
      'No Kaspa blocks, you likely forgot to connect to a Kaspa node first.',
      'No Kaspa blocks available',
      'No Bitcoin blocks available',
      'No Kaspa or Bitcoin blocks available',
    ].some((snippet) => message.includes(snippet))
  }

  const isConnecting = isRunning && !portalReady

  // Initialize portal and VRF ONCE on mount (like index.html)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await ensurePortalConnected()
        await kaspaPortal.initVRF()
        if (!cancelled && kaspaPortal.isReady) {
          setPortalReady(true)
          console.log('Kaspa portal and VRF initialized')
        }
      } catch (err) {
        if (!cancelled) setError('Failed to initialize Kaspa portal/VRF')
        console.error('Kaspa portal/VRF init error:', err)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const normalizeBlockHash = (block: any) =>
    block?.hash || block?.blockHash || block?.id || ''

  // Fetch real blocks from Kaspa (scanner) and Bitcoin (required)
  const fetchRealBlocks = useCallback(async () => {
    try {
      setError(null)
      if (!portalReady) throw new Error('Kaspa portal/VRF not ready')
      const kaspaBlocks = await kaspaPortal.getKaspaBlocks(1)
      const btcBlocks = await kaspaPortal.getBitcoinBlocks(1)
      const newBlocks: Block[] = []

      if (kaspaBlocks.length > 0) {
        kaspaBlocks.forEach((kb) => {
          const hash = normalizeBlockHash(kb)
          if (!hash) return
          newBlocks.push({
            id: Date.now() + Math.random(),
            hash,
            nonce: String(kb.nonce || ''),
            timestamp: kb.timestamp || Date.now(),
            processed: false,
            source: 'kaspa',
          })
        })
      }

      if (btcBlocks.length > 0) {
        btcBlocks.forEach((bb) => {
          const hash = normalizeBlockHash(bb)
          if (!hash) return
          newBlocks.push({
            id: Date.now() + Math.random() + 1,
            hash,
            nonce: '',
            timestamp: Date.now(),
            processed: false,
            source: 'btc',
          })
        })
      }

      if (kaspaBlocks.length === 0) {
        throw new Error('No Kaspa blocks available from scanner')
      }

      if (btcBlocks.length === 0) {
        throw new Error('No Bitcoin blocks available')
      }

      if (newBlocks.length === 0) {
        throw new Error('No Kaspa or Bitcoin blocks available')
      }

      return newBlocks
    } catch (err) {
      console.error('Error fetching blocks:', err)
      throw err
    }
  }, [portalReady])

  const addBlock = useCallback(async () => {
    const newBlocks = await fetchRealBlocks()
    setBlocks(prev => [...prev.slice(-(10 - newBlocks.length)), ...newBlocks])
  }, [fetchRealBlocks])

  const processBlock = useCallback(async (block: Block) => {
    setCurrentProcessing(block.id)
    setFoldingSteps([])
    setCurrentStep(0)

    const steps: FoldingStep[] = [
      { value: '', label: 'Initial Mix', completed: false },
      { value: '', label: 'SHA-256 Fold', completed: false },
      { value: '', label: 'SHA-256 Fold II', completed: false },
      { value: '', label: 'Final Fold', completed: false },
    ]

    try {
      // Step 1: Initial Mix
      await new Promise(r => setTimeout(r, 300))
      const hashA = await ensureCanonicalHash(block.hash)
      const hashB = await ensureCanonicalHash(block.hash)
      const combined = hashA
      steps[0] = { ...steps[0], value: combined.slice(0, 32), completed: true }
      setFoldingSteps([...steps])
      setCurrentStep(1)

      // Step 2: Fold with SHA-256
      await new Promise(r => setTimeout(r, 300))
      let folded1: string
      await ensurePortalConnected()
      const blocksForFolding = [
        { hash: hashA, isFinal: true },
        { hash: hashB, isFinal: true },
      ]
      const initialPositions = Array.from({ length: 256 }, (_, i) => i)
      const { bitstring: initialBits } = await extractBits(blocksForFolding, initialPositions)
      const positions1 = await sha256FoldingRule(initialBits, 256)
      const rotated1 = rotatePositions(positions1, 256)
      const { bitstring: foldedBits1 } = await extractBits(blocksForFolding, rotated1)
      folded1 = foldedBits1
      steps[1] = { ...steps[1], value: folded1.slice(0, 32), completed: true }
      setFoldingSteps([...steps])
      setCurrentStep(2)

      // Step 3: Bit Rotation
      await new Promise(r => setTimeout(r, 300))
      const positions2 = await sha256FoldingRule(folded1, 256)
      const rotated2 = rotatePositions(positions2, 256)
      const { bitstring: rotatedBits } = await extractBits(blocksForFolding, rotated2)
      steps[2] = { ...steps[2], value: rotatedBits.slice(0, 32), completed: true }
      setFoldingSteps([...steps])
      setCurrentStep(3)

      // Step 4: Final Whitening
      await new Promise(r => setTimeout(r, 300))
      const finalEntropy = await whitenEntropy(rotatedBits)
      steps[3] = { ...steps[3], value: finalEntropy.slice(0, 32), completed: true }
      setFoldingSteps([...steps])
      setCurrentStep(4)

      const proofResult = await kaspaPortal.prove({
        seedInput: block.hash.slice(0, 32),
        btcBlocks: 1,
        kasBlocks: 1,
      })
      if (!proofResult?.finalOutput) {
        throw new Error('VRF proof missing final output')
      }
      const proof: VRFProof | undefined = proofResult?.proof
      if (proof) {
        proof.finalOutput = proofResult.finalOutput
      }
      if (!proof?.evidence?.kaspa?.length || !proof?.evidence?.btc?.length) {
        throw new Error('VRF proof missing Kaspa or Bitcoin evidence')
      }
      if (!proof?.evidence?.nist) {
        throw new Error('VRF proof missing QRNG evidence')
      }

      const finalOutput = proofResult.finalOutput

      const kaspaEvidenceHash =
        proof?.evidence?.kaspa?.[0]?.hash ||
        proof?.evidence?.kaspa?.[0]?.blockHash ||
        proof?.evidence?.kaspa?.[0]?.id ||
        (block.source === 'kaspa' ? block.hash : '')

      // Complete processing
      await new Promise(r => setTimeout(r, 200))
      outputCountRef.current += 1

      const stepDetails = [
        { label: 'Initial Mix (canonical hash)', value: combined },
        { label: 'Initial Bits', value: initialBits },
        { label: 'SHA-256 Fold Positions', value: JSON.stringify(positions1) },
        { label: 'SHA-256 Fold Output', value: folded1 },
        { label: 'Bit Rotation Positions', value: JSON.stringify(rotated2) },
        { label: 'Bit Rotation Output', value: rotatedBits },
        { label: 'Final Whitening Output', value: finalEntropy },
      ]

      setEntropyOutputs(prev => [...prev.slice(-9), {
        outputId: `${block.id}-${outputCountRef.current}`,
        blockId: block.id,
        inputHash: kaspaEvidenceHash ? kaspaEvidenceHash.slice(0, 16) + '...' : 'n/a',
        foldedValue: folded1.slice(0, 16) + '...',
        foldedFull: folded1,
        finalEntropy: finalOutput.slice(0, 16) + '...',
        step: outputCountRef.current,
        isReal: true,
        proof,
        steps: stepDetails,
      }])

      setBlocks(prev => prev.map(b =>
        b.id === block.id ? { ...b, processed: true } : b
      ))
    } catch (err) {
      console.error('Error processing block:', err)
      setError('Failed to process block through VRF')
    } finally {
      setCurrentProcessing(null)
      setFoldingSteps([])
    }
  }, [])

  useEffect(() => {
    if (isRunning) {
      if (!portalReady) {
        setIsAwaitingBlocks(true)
        return
      }

      setError(null)
      addBlock().catch((err: Error) => {
        const message = err?.message || 'Failed to fetch blocks'
        if (isTransientBlockError(message)) {
          setIsAwaitingBlocks(true)
          return
        }
        setError(message)
      })

      if (blocks.length === 0) {
        setIsAwaitingBlocks(true)
      }

      intervalRef.current = setInterval(() => {
        addBlock().catch((err: Error) => {
          const message = err?.message || 'Failed to fetch blocks'
          if (isTransientBlockError(message)) {
            setIsAwaitingBlocks(true)
            return
          }
          setError(message)
        })
      }, 5000)

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current)
      }
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setIsAwaitingBlocks(false)
    }
  }, [isRunning, addBlock, portalReady, blocks.length])

  useEffect(() => {
    if (blocks.length > 0) {
      setIsAwaitingBlocks(false)
    }
  }, [blocks.length])

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
    setError(null)
    setIsAwaitingBlocks(false)
    outputCountRef.current = 0
  }

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'kaspa': return 'text-kaspa-primary'
      case 'btc': return 'text-orange-400'
      default: return 'text-muted-foreground'
    }
  }

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'kaspa': return 'Kaspa'
      case 'btc': return 'Bitcoin'
      default: return 'Unknown'
    }
  }

  const getNistField = (nist: any, keys: string[]) => {
    for (const key of keys) {
      if (nist && nist[key] != null) return nist[key]
    }
    return undefined
  }

  const kaspaExplorerBase = 'https://explorer-tn10.kaspa.org/blocks/'

  const renderKaspaExplorerLink = (hash: string) => (
    <a
      href={`${kaspaExplorerBase}${hash}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:underline"
    >
      {hash}
    </a>
  )

  const renderProofEvidence = (proof?: VRFProof) => {
    if (!proof?.evidence) {
      return (
        <div className="text-xs text-muted-foreground">
          No proof evidence available for this output.
        </div>
      )
    }

    const kaspaBlocks = proof.evidence.kaspa || []
    const btcBlocks = proof.evidence.btc || []
    const nist = proof.evidence.nist
    const nistPulseIndex = getNistField(nist, ['pulseIndex', 'pulse_index', 'index', 'pulse'])
    const nistOutput = getNistField(nist, [
      'localRandomValue',
      'outputValue',
      'output',
      'value',
      'randomness',
      'seedValue',
      'previousOutputValue',
      'hash',
    ])
    const nistSignature = getNistField(nist, ['signatureValue', 'signature', 'sig'])

    return (
      <div className="space-y-4 text-xs">
        <div>
          <div className="text-muted-foreground mb-1">Kaspa block hashes</div>
          {kaspaBlocks.length > 0 ? (
            <ul className="space-y-1">
              {kaspaBlocks.map((b: any, idx: number) => (
                <li key={`kaspa-${idx}`} className="font-mono text-muted-foreground break-all whitespace-normal">
                  {(() => {
                    const hash = b.hash || b.blockHash || b.id
                    if (!hash) return 'unknown'
                    return renderKaspaExplorerLink(String(hash))
                  })()}
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-muted-foreground">None</div>
          )}
        </div>

        <div>
          <div className="text-muted-foreground mb-1">Bitcoin block hashes</div>
          {btcBlocks.length > 0 ? (
            <ul className="space-y-1">
              {btcBlocks.map((b: any, idx: number) => (
                <li key={`btc-${idx}`} className="font-mono text-muted-foreground break-all whitespace-normal">
                  {(b.hash || b.blockHash || b.id || 'unknown')}
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-muted-foreground">None</div>
          )}
        </div>

        <div>
          <div className="text-muted-foreground mb-1">NIST beacon evidence</div>
          {nist ? (
            <div className="space-y-1">
              <div className="text-muted-foreground">
                Pulse index:{' '}
                <span className="font-mono text-foreground break-all whitespace-normal">
                  {String(nistPulseIndex ?? 'n/a')}
                </span>
              </div>
              <div className="text-muted-foreground">
                Output:{' '}
                <span className="font-mono text-foreground break-all whitespace-normal">
                  {String(nistOutput ?? 'n/a')}
                </span>
              </div>
              <div className="text-muted-foreground">
                Signature:{' '}
                <span className="font-mono text-foreground break-all whitespace-normal">
                  {String(nistSignature ?? 'n/a')}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground">None</div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
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

      {/* Error display */}
      {error && !isTransientBlockError(error) && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

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
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        Block #{block.id.toString().slice(-6)}
                      </span>
                      <span className={cn('text-xs font-medium', getSourceColor(block.source))}>
                        ({getSourceLabel(block.source)})
                      </span>
                    </div>
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
            {blocks.length === 0 && isConnecting && (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-muted-foreground text-sm">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                <span>Connecting to Kaspa...</span>
              </div>
            )}
            {blocks.length === 0 && !isConnecting && isAwaitingBlocks && (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-muted-foreground text-sm">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                <span>Filling up buffer...</span>
              </div>
            )}
            {blocks.length === 0 && !isConnecting && !isAwaitingBlocks && (
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
                {['Initial Mix', 'SHA-256 Fold', 'SHA-256 Fold II', 'Final Fold'].map((stepLabel, step) => (
                  <motion.div
                    key={step}
                    initial={{ opacity: 0.3 }}
                    animate={{
                      opacity: currentStep >= step + 1 ? 1 : 0.3,
                      scale: currentStep === step + 1 ? 1.02 : 1,
                    }}
                    style={{
                      backgroundColor:
                        currentStep >= step + 1
                          ? 'hsl(var(--primary) / 0.05)'
                          : 'hsl(var(--card) / 0.5)',
                    }}
                    className={cn(
                      'p-3 rounded-lg border transition-all',
                      currentStep >= step + 1
                        ? 'border-primary/50'
                        : 'border-border/30'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                        currentStep >= step + 1
                          ? 'bg-primary text-background'
                          : 'bg-muted text-muted-foreground'
                      )}>
                        {step + 1}
                      </span>
                      <span className="text-sm font-medium">{stepLabel}</span>
                      {currentStep === step + 1 && !foldingSteps[step]?.completed && (
                        <Loader2 className="w-3 h-3 ml-auto text-primary animate-spin" />
                      )}
                      {foldingSteps[step]?.completed && (
                        <CheckCircle className="w-4 h-4 ml-auto text-neon-green" />
                      )}
                    </div>
                    {foldingSteps[step]?.value && (
                      <code className="text-xs font-mono text-muted-foreground block truncate">
                        {foldingSteps[step].value}...
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
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Details</th>
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">#</th>
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Input Hash</th>
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Folded</th>
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Final Entropy</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {entropyOutputs.flatMap((output) => {
                  const rows = [
                    (
                      <motion.tr
                        key={`${output.outputId}-row`}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="border-b border-border/30 cursor-pointer hover:bg-muted/20"
                        onClick={() =>
                          setExpandedOutputId((prev) => (prev === output.outputId ? null : output.outputId))
                        }
                      >
                        <td className="py-2 px-3">
                          {expandedOutputId === output.outputId ? (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          )}
                        </td>
                        <td className="py-2 px-3 text-primary">{output.step}</td>
                        <td className="py-2 px-3 font-mono text-xs text-muted-foreground">{output.inputHash}</td>
                        <td className="py-2 px-3 font-mono text-xs text-muted-foreground">{output.foldedValue}</td>
                        <td className="py-2 px-3 font-mono text-xs text-neon-green">{output.finalEntropy}</td>
                      </motion.tr>
                    ),
                  ]

                  if (expandedOutputId === output.outputId) {
                    rows.push(
                      <tr key={`${output.outputId}-expanded`} className="border-b border-border/30 bg-card/40">
                        <td colSpan={5} className="p-4">
                          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
                            VRF Proof Evidence
                          </div>
                          <div className="text-xs text-muted-foreground mb-3">
                            Step-by-step derivation
                          </div>
                          <div className="space-y-2 mb-4">
                            {output.steps.map((stepDetail) => (
                              <div key={stepDetail.label} className="text-xs text-muted-foreground">
                                <div className="mb-1">{stepDetail.label}:</div>
                                <div className="font-mono text-foreground break-all whitespace-normal">
                                  {stepDetail.value}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="text-xs text-muted-foreground mb-3">
                            Full folded entropy:{' '}
                            <span className="font-mono text-foreground break-all whitespace-normal">
                              {output.foldedFull}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mb-3">
                            Full final entropy:{' '}
                            <span className="font-mono text-foreground break-all whitespace-normal">
                              {output.proof?.finalOutput || 'n/a'}
                            </span>
                          </div>
                          {renderProofEvidence(output.proof)}
                        </td>
                      </tr>
                    )
                  }

                  return rows
                })}
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
