'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  BookOpen, Zap, Code2, Radio,
  Copy, Check, ShieldCheck, Globe2
} from 'lucide-react'
import { cn } from '@/lib/utils'

const sections = [
  { id: 'overview', label: 'Overview', icon: BookOpen },
  { id: 'quickstart', label: 'Quick Start', icon: Zap },
  { id: 'sdk', label: 'ꓘK Game Engine SDK', icon: Code2 },
  { id: 'lowlevel', label: 'Kaspa Low Level', icon: Globe2 },
]

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group my-4">
      <pre className="code-block overflow-x-auto text-sm bg-[#0a0a0a] p-4 rounded-xl border border-border/50">
        <code className="text-primary/90">{code}</code>
      </pre>
      <button onClick={copy} className="absolute top-3 right-3 p-2 rounded-lg bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity">
        {copied ? <Check className="w-4 h-4 text-neon-green" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
      </button>
    </div>
  )
}

export function DocsContent() {
  const [activeSection, setActiveSection] = useState('overview')

  return (
    <div className="flex flex-col gap-6">
      {/* Top navigation */}
      <div className="flex flex-wrap gap-2">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all',
              activeSection === section.id
                ? 'bg-primary text-black'
                : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/70'
            )}
          >
            <section.icon className="w-4 h-4" />
            {section.label}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="w-full">

        {/* SECTION: OVERVIEW */}
        {activeSection === 'overview' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="prose prose-invert max-w-none">
            <h1 className="text-4xl font-bold font-display mb-4 italic">
              <span className="text-primary">ꓘ</span>
              <span className="text-secondary">K</span>
              <span className="text-foreground/90"> Kaspa Kinesis</span>
            </h1>

            <div className="glass rounded-xl p-6 border border-primary/30 mb-8 bg-primary/5">
              <p className="text-lg text-foreground mb-0 leading-relaxed">
                The world’s first <strong>Zero-Ops Multiplayer Engine</strong> built for the high-speed Kaspa BlockDAG. We replace managed game servers with a decentralized, high-frequency "Heartbeat" protocol that is 100% auditable and cheat-proof.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
               <div className="p-4 rounded-xl border border-border/50 glass">
                  <h3 className="text-primary flex items-center gap-2 mb-2"><Radio className="w-4 h-4"/> CGNAT Bypass</h3>
                  <p className="text-sm text-muted-foreground">Peer-to-peer discovery via the DAG. No STUN/TURN servers required.</p>
               </div>
               <div className="p-4 rounded-xl border border-border/50 glass">
                  <h3 className="text-neon-green flex items-center gap-2 mb-2"><ShieldCheck className="w-4 h-4"/> Real-time Audit</h3>
                  <p className="text-sm text-muted-foreground">Every move is anchored in 500ms heartbeats. Impossible to rewrite history.</p>
               </div>
            </div>

            <h2 className="text-xl font-semibold mb-4">The Competitive Edge</h2>
            <div className="overflow-x-auto border border-border/50 rounded-xl glass shadow-2xl">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-widest">
                  <tr>
                    <th className="px-4 py-3">Vector</th>
                    <th className="px-4 py-3">Legacy Web3</th>
                    <th className="px-4 py-3 italic font-bold">
                      <span className="text-foreground/90">Kaspa Kinesis (</span>
                      <span className="text-primary">ꓘ</span>
                      <span className="text-secondary">K</span>
                      <span className="text-foreground/90">)</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  <tr><td className="px-4 py-3 font-medium">Anti-Cheat</td><td className="px-4 py-3">None / Server-side</td><td className="px-4 py-3 text-neon-green">PoW-Anchored Audit Trail</td></tr>
                  <tr><td className="px-4 py-3 font-medium">Latency</td><td className="px-4 py-3">15s+ (Settlement)</td><td className="px-4 py-3 font-bold">~500ms Heartbeats</td></tr>
                  <tr><td className="px-4 py-3 font-medium">Infrastructure</td><td className="px-4 py-3">Private Game Servers</td><td className="px-4 py-3 text-primary">Zero-Managed Ops</td></tr>
                  <tr><td className="px-4 py-3 font-medium">Networking</td><td className="px-4 py-3">Centralized TURN</td><td className="px-4 py-3 italic">Native BlockDAG Relay</td></tr>
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* SECTION: QUICKSTART */}
        {activeSection === 'quickstart' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl font-bold font-display mb-6">Quick Start</h1>
            <h2 className="text-xl font-semibold mb-4">Zero-Ops Initialization</h2>
            <p className="text-sm text-muted-foreground mb-4">The developer provides wallet credentials and uses the public engine API. This example shows init + host/join/leave + shutdown.</p>
            <CodeBlock code={`import { KKGameEngine } from './kktp/kkGameEngine.js';

// Host flow
const host = new KKGameEngine();
await host.init({
  password: '1234',
  walletName: 'demo_host_wallet',
  network: 'testnet-10',
  onBalanceChange: (balance) => console.log('Host balance:', balance),
});

const hosted = await host.createLobby({
  name: 'Demo Lobby',
  maxPlayers: 8,
  displayName: 'HostPlayer',
});
console.log('Share join code:', hosted.joinCode);

// Guest flow (usually another client/device)
const guest = new KKGameEngine();
await guest.init({
  password: '1234',
  walletName: 'demo_guest_wallet',
  network: 'testnet-10',
  onBalanceChange: (balance) => console.log('Guest balance:', balance),
});

await guest.joinLobby(hosted.joinCode, 'GuestPlayer');
await guest.sendLobbyMessage('hello lobby');

// Leave + shutdown when done
await guest.leaveLobby('done');
await guest.shutdown();

await host.leaveLobby('done');
await host.shutdown();`} />
            <h2 className="text-xl font-semibold mt-8 mb-4">Start a Game, Record Moves, Audit for Cheating</h2>
            <p className="text-sm text-muted-foreground mb-4">Use the same engine instance to run a match, anchor moves, end the game, then verify integrity with the anti-cheat audit.</p>
            <CodeBlock code={`import { KKGameEngine } from './kktp/kkGameEngine.js';

const game = new KKGameEngine();
await game.init({
  password: '1234',
  walletName: 'demo_wallet',
  network: 'testnet-10',
});

await game.startGame({
  gameId: 'match-001',
  playerId: 'player-1',
});

await game.recordMove('move_left', { x: 12, y: 4 });
await game.recordMove('attack', { targetId: 'enemy-1', damage: 18 });

const end = await game.endGame({
  score: 42,
  coins: 3,
  result: 'win',
});

// Audit the just-finished session (or pass end.auditData directly)
const audit = await game.auditCheating();
if (!audit.passed) {
  console.error('Cheating/anomaly detected:', audit.reasons);
}

await game.shutdown();`} />
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl mt-6">
               <p className="text-xs text-yellow-500 font-bold uppercase tracking-widest mb-1">Notice</p>
               <p className="text-xs text-muted-foreground leading-normal">The engine automatically calls <code>prepareRunway()</code> on init to ensure you have enough UTXOs for 500ms heartbeat anchoring.</p>
            </div>
          </motion.div>
        )}


        {/* SECTION: KK GAME ENGINE SDK */}
        {activeSection === 'sdk' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl font-bold font-display mb-4 flex items-center gap-3">
              <Code2 className="text-primary w-8 h-8" /> ꓘK Game Engine SDK
            </h1>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Full developer entry point for KKGameEngine with advanced facades.
            </p>

            <div className="glass rounded-2xl border border-primary/20 bg-black/40 overflow-hidden">
              <iframe
                title="KK Game Engine SDK"
                src="/kktp/engine/kaspa/index.html"
                className="w-full h-[75vh]"
                loading="lazy"
              />
            </div>
          </motion.div>
        )}


        {/* SECTION: KASPA LOW LEVEL */}
        {activeSection === 'lowlevel' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl font-bold font-display mb-4 flex items-center gap-3">
              <Globe2 className="text-primary w-8 h-8" /> Kaspa Low Level
            </h1>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Advanced low-level Kaspa SDK modules and debugging utilities.
            </p>

            <div className="glass rounded-2xl border border-primary/20 bg-black/40 overflow-hidden">
              <iframe
                title="Kaspa Low Level SDK"
                src="/kktp/engine/kaspa/lowLevel.html"
                className="w-full h-[75vh]"
                loading="lazy"
              />
            </div>
          </motion.div>
        )}

      </div>
    </div>
  )
}
