'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Radio, Wifi, WifiOff, CheckCircle, XCircle, Clock,
  User, Server, GitBranch, ArrowRight, Zap, Shield
} from 'lucide-react'
import { cn } from '@/lib/utils'

type ConnectionState = 'disconnected' | 'posting' | 'discovering' | 'connecting' | 'connected' | 'failed'

interface Peer {
  id: string
  name: string
  status: 'online' | 'connecting' | 'offline'
  latency?: number
}

interface Message {
  id: number
  type: 'system' | 'sent' | 'received'
  content: string
  timestamp: Date
}

export function RelayVisualizer() {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected')
  const [peers, setPeers] = useState<Peer[]>([])
  const [selectedPeer, setSelectedPeer] = useState<Peer | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [dagMessages, setDagMessages] = useState<string[]>([])

  const addMessage = useCallback((type: Message['type'], content: string) => {
    setMessages(prev => [...prev, {
      id: Date.now(),
      type,
      content,
      timestamp: new Date(),
    }])
  }, [])

  const addDagMessage = useCallback((content: string) => {
    setDagMessages(prev => [...prev.slice(-9), content])
  }, [])

  const simulateConnection = useCallback(async () => {
    setConnectionState('posting')
    addMessage('system', 'Posting connection intent to Kaspa DAG...')
    addDagMessage('POST: peer_intent_' + Date.now().toString(36))
    
    await new Promise(r => setTimeout(r, 1500))
    
    setConnectionState('discovering')
    addMessage('system', 'Querying DAG for available peers...')
    addDagMessage('QUERY: active_peers_list')
    
    await new Promise(r => setTimeout(r, 2000))
    
    // Simulate finding peers
    const simulatedPeers: Peer[] = [
      { id: 'peer-1', name: 'Alice (Behind CGNAT)', status: 'online', latency: 45 },
      { id: 'peer-2', name: 'Bob (Symmetric NAT)', status: 'online', latency: 78 },
      { id: 'peer-3', name: 'Charlie (Firewall)', status: 'connecting', latency: undefined },
    ]
    setPeers(simulatedPeers)
    addMessage('system', `Discovered ${simulatedPeers.length} peers via DAG mailbox`)
    addDagMessage('RECV: peer_list_response')
    
    setConnectionState('connecting')
  }, [addMessage, addDagMessage])

  const connectToPeer = useCallback(async (peer: Peer) => {
    setSelectedPeer(peer)
    addMessage('system', `Initiating WebRTC handshake with ${peer.name}...`)
    addDagMessage('POST: ice_candidate_' + peer.id)
    
    await new Promise(r => setTimeout(r, 1000))
    addDagMessage('RECV: ice_response_' + peer.id)
    addMessage('system', 'Exchanging ICE candidates through DAG relay...')
    
    await new Promise(r => setTimeout(r, 1500))
    addDagMessage('POST: sdp_offer_' + peer.id)
    
    await new Promise(r => setTimeout(r, 1000))
    addDagMessage('RECV: sdp_answer_' + peer.id)
    addMessage('system', 'SDP exchange complete. Establishing direct connection...')
    
    await new Promise(r => setTimeout(r, 1500))
    
    setPeers(prev => prev.map(p => 
      p.id === peer.id ? { ...p, status: 'online', latency: Math.floor(Math.random() * 50) + 30 } : p
    ))
    setConnectionState('connected')
    addMessage('system', `✓ Connected to ${peer.name}! Direct P2P channel established.`)
  }, [addMessage, addDagMessage])

  const sendTestMessage = useCallback(() => {
    if (!selectedPeer) return
    const content = 'Hello from ꓘK! ' + new Date().toLocaleTimeString()
    addMessage('sent', content)
    
    setTimeout(() => {
      addMessage('received', 'Echo: ' + content)
    }, 100 + Math.random() * 100)
  }, [selectedPeer, addMessage])

  const reset = () => {
    setConnectionState('disconnected')
    setPeers([])
    setSelectedPeer(null)
    setMessages([])
    setDagMessages([])
  }

  const stateConfig: Record<ConnectionState, { label: string; color: string; icon: typeof Radio }> = {
    disconnected: { label: 'Disconnected', color: 'text-muted-foreground', icon: WifiOff },
    posting: { label: 'Posting to DAG', color: 'text-yellow-500', icon: Radio },
    discovering: { label: 'Discovering Peers', color: 'text-blue-500', icon: Radio },
    connecting: { label: 'Select Peer', color: 'text-orange-500', icon: Wifi },
    connected: { label: 'Connected', color: 'text-neon-green', icon: CheckCircle },
    failed: { label: 'Failed', color: 'text-red-500', icon: XCircle },
  }

  const StateIcon = stateConfig[connectionState].icon

  return (
    <div className="space-y-6">
      {/* Status bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center',
            connectionState === 'connected' ? 'bg-neon-green/20' : 'bg-muted'
          )}>
            <StateIcon className={cn('w-5 h-5', stateConfig[connectionState].color)} />
          </div>
          <div>
            <div className={cn('font-semibold', stateConfig[connectionState].color)}>
              {stateConfig[connectionState].label}
            </div>
            <div className="text-xs text-muted-foreground">
              {selectedPeer ? `Connected to ${selectedPeer.name}` : 'No active connection'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {connectionState === 'disconnected' && (
            <button onClick={simulateConnection} className="btn-primary flex items-center gap-2">
              <Radio className="w-4 h-4" />
              Start Connection
            </button>
          )}
          {connectionState === 'connected' && (
            <button onClick={sendTestMessage} className="btn-primary flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Send Test Message
            </button>
          )}
          <button onClick={reset} className="btn-secondary">
            Reset
          </button>
        </div>
      </div>

      {/* Connection visualization */}
      <div className="glass rounded-xl p-8 border border-border/50">
        <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16">
          {/* Local peer */}
          <motion.div
            animate={{ 
              scale: connectionState !== 'disconnected' ? [1, 1.05, 1] : 1,
            }}
            transition={{ duration: 2, repeat: connectionState !== 'disconnected' && connectionState !== 'connected' ? Infinity : 0 }}
            className="text-center"
          >
            <div className={cn(
              'w-24 h-24 mx-auto mb-3 rounded-2xl flex items-center justify-center transition-all duration-300',
              connectionState === 'connected'
                ? 'bg-gradient-to-br from-neon-cyan to-blue-500 shadow-neon-cyan'
                : 'bg-gradient-to-br from-blue-500/50 to-cyan-500/50'
            )}>
              <User className="w-12 h-12 text-white" />
            </div>
            <p className="font-semibold">You</p>
            <p className="text-xs text-muted-foreground">Behind CGNAT</p>
          </motion.div>

          {/* Connection arrows */}
          <div className="flex flex-col items-center gap-2">
            <motion.div
              animate={{ 
                opacity: connectionState === 'disconnected' ? 0.3 : 1,
                x: ['posting', 'discovering'].includes(connectionState) ? [0, 5, 0] : 0,
              }}
              transition={{ duration: 1, repeat: ['posting', 'discovering'].includes(connectionState) ? Infinity : 0 }}
            >
              <ArrowRight className="w-8 h-8 text-primary rotate-90 lg:rotate-0" />
            </motion.div>
          </div>

          {/* DAG */}
          <motion.div
            animate={{ 
              scale: ['posting', 'discovering', 'connecting'].includes(connectionState) ? [1, 1.03, 1] : 1,
            }}
            transition={{ duration: 1.5, repeat: ['posting', 'discovering', 'connecting'].includes(connectionState) ? Infinity : 0 }}
            className="text-center"
          >
            <div className={cn(
              'w-24 h-24 mx-auto mb-3 rounded-2xl flex items-center justify-center transition-all duration-300',
              ['posting', 'discovering', 'connecting'].includes(connectionState)
                ? 'bg-gradient-to-br from-kaspa-primary to-neon-green shadow-glow-md'
                : 'bg-gradient-to-br from-kaspa-primary/50 to-neon-green/50'
            )}>
              <GitBranch className="w-12 h-12 text-white" />
            </div>
            <p className="font-semibold">Kaspa DAG</p>
            <p className="text-xs text-muted-foreground">Relay Layer</p>
          </motion.div>

          {/* Connection arrows */}
          <div className="flex flex-col items-center gap-2">
            <motion.div
              animate={{ 
                opacity: connectionState === 'connected' ? 1 : 0.3,
                x: connectionState === 'connecting' ? [0, 5, 0] : 0,
              }}
              transition={{ duration: 1, repeat: connectionState === 'connecting' ? Infinity : 0 }}
            >
              <ArrowRight className="w-8 h-8 text-primary rotate-90 lg:rotate-0" />
            </motion.div>
          </div>

          {/* Remote peer */}
          <motion.div
            animate={{ 
              scale: connectionState === 'connected' ? [1, 1.05, 1] : 1,
            }}
            transition={{ duration: 2, repeat: connectionState === 'connected' ? Infinity : 0 }}
            className="text-center"
          >
            <div className={cn(
              'w-24 h-24 mx-auto mb-3 rounded-2xl flex items-center justify-center transition-all duration-300',
              connectionState === 'connected'
                ? 'bg-gradient-to-br from-neon-green to-emerald-500 shadow-neon-green'
                : 'bg-gradient-to-br from-green-500/50 to-emerald-500/50'
            )}>
              <User className="w-12 h-12 text-white" />
            </div>
            <p className="font-semibold">{selectedPeer?.name || 'Remote Peer'}</p>
            <p className="text-xs text-muted-foreground">
              {selectedPeer ? `${selectedPeer.latency}ms latency` : 'Behind CGNAT'}
            </p>
          </motion.div>
        </div>

        {/* Direct connection indicator */}
        {connectionState === 'connected' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neon-green/10 border border-neon-green/30">
              <Shield className="w-4 h-4 text-neon-green" />
              <span className="text-sm text-neon-green font-medium">
                Direct P2P Connection Established (No Server)
              </span>
            </div>
          </motion.div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Peer list */}
        {connectionState === 'connecting' && (
          <div className="glass rounded-xl p-6 border border-border/50">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Wifi className="w-5 h-5 text-primary" />
              Available Peers
            </h3>
            <div className="space-y-3">
              {peers.map((peer) => (
                <motion.button
                  key={peer.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => connectToPeer(peer)}
                  className="w-full p-4 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-3 h-3 rounded-full',
                        peer.status === 'online' ? 'bg-neon-green' :
                        peer.status === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                        'bg-muted'
                      )} />
                      <span className="font-medium">{peer.name}</span>
                    </div>
                    {peer.latency && (
                      <span className="text-xs text-muted-foreground">
                        ~{peer.latency}ms
                      </span>
                    )}
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* DAG activity */}
        <div className="glass rounded-xl p-6 border border-border/50">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-kaspa-primary" />
            DAG Mailbox Activity
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto font-mono text-xs">
            <AnimatePresence mode="popLayout">
              {dagMessages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'px-3 py-2 rounded-lg',
                    msg.startsWith('POST') ? 'bg-blue-500/10 text-blue-400' :
                    msg.startsWith('QUERY') ? 'bg-yellow-500/10 text-yellow-400' :
                    'bg-neon-green/10 text-neon-green'
                  )}
                >
                  {msg}
                </motion.div>
              ))}
            </AnimatePresence>
            {dagMessages.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                No activity yet
              </div>
            )}
          </div>
        </div>

        {/* Message log */}
        <div className={cn(
          "glass rounded-xl p-6 border border-border/50",
          connectionState !== 'connecting' ? 'lg:col-span-2' : ''
        )}>
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            Connection Log
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            <AnimatePresence mode="popLayout">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'px-3 py-2 rounded-lg text-sm',
                    msg.type === 'system' ? 'bg-muted/50 text-muted-foreground' :
                    msg.type === 'sent' ? 'bg-primary/10 text-primary ml-8' :
                    'bg-neon-green/10 text-neon-green mr-8'
                  )}
                >
                  <span className="text-xs opacity-60 mr-2">
                    {msg.timestamp.toLocaleTimeString()}
                  </span>
                  {msg.content}
                </motion.div>
              ))}
            </AnimatePresence>
            {messages.length === 0 && (
              <div className="text-center py-4 text-muted-foreground text-sm">
                Start a connection to see logs
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
