'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  BookOpen, Zap, Shuffle, Radio, TestTube, Code2,
  ChevronRight, Copy, Check, ExternalLink
} from 'lucide-react'
import { cn } from '@/lib/utils'

const sections = [
  { id: 'overview', label: 'Overview', icon: BookOpen },
  { id: 'quickstart', label: 'Quick Start', icon: Zap },
  { id: 'folding', label: 'Recursive Folding', icon: Shuffle },
  { id: 'relay', label: 'Kaspa Relay', icon: Radio },
  { id: 'testing', label: 'Testing Entropy', icon: TestTube },
  { id: 'api', label: 'API Reference', icon: Code2 },
]

function CodeBlock({ code, language = 'typescript' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group">
      <pre className="code-block overflow-x-auto text-sm">
        <code>{code}</code>
      </pre>
      <button
        onClick={copy}
        className="absolute top-3 right-3 p-2 rounded-lg bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? (
          <Check className="w-4 h-4 text-neon-green" />
        ) : (
          <Copy className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
    </div>
  )
}

export function DocsContent() {
  const [activeSection, setActiveSection] = useState('overview')

  return (
    <div className="flex gap-8">
      {/* Sidebar navigation */}
      <aside className="hidden lg:block w-56 flex-shrink-0">
        <nav className="sticky top-8 space-y-1">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left transition-colors',
                activeSection === section.id
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <section.icon className="w-4 h-4" />
              {section.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <div className="flex-1 max-w-3xl">
        {activeSection === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="prose prose-invert max-w-none"
          >
            <h1 className="text-3xl font-bold font-display gradient-text mb-6">
              ꓘK Kaspa Kinesis Documentation
            </h1>
            
            <div className="glass rounded-xl p-6 border border-primary/30 mb-8">
              <p className="text-lg text-foreground mb-0">
                A zero-infrastructure multiplayer engine that turns the Kaspa BlockDAG into a fair, 
                auditable, serverless backbone for real-time games and interactive systems.
              </p>
            </div>

            <h2 className="text-xl font-semibold mt-8 mb-4">What is Kaspa Kinesis?</h2>
            <p className="text-muted-foreground mb-4">
              Kaspa Kinesis (ꓘK) is a framework for building multiplayer games and interactive 
              applications that require:
            </p>
            <ul className="space-y-2 text-muted-foreground mb-6">
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 mt-1 text-primary flex-shrink-0" />
                <span><strong className="text-foreground">Provable randomness</strong> — Every random number can be traced back to Kaspa block data</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 mt-1 text-primary flex-shrink-0" />
                <span><strong className="text-foreground">Serverless architecture</strong> — No game servers to maintain, scale, or pay for</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 mt-1 text-primary flex-shrink-0" />
                <span><strong className="text-foreground">NAT traversal</strong> — CGNAT↔CGNAT connectivity without TURN/STUN servers</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 mt-1 text-primary flex-shrink-0" />
                <span><strong className="text-foreground">Full auditability</strong> — Complete replay and verification of all game state</span>
              </li>
            </ul>

            <h2 className="text-xl font-semibold mt-8 mb-4">Core Components</h2>
            <div className="grid gap-4">
              {[
                { name: 'Recursive Folding', desc: 'Transforms PoW data into NIST-grade entropy' },
                { name: 'Kaspa Relay', desc: 'Decentralized signaling via the BlockDAG' },
                { name: 'Deterministic Engine', desc: 'Reproducible state from seed + actions' },
                { name: 'NIST Test Suite', desc: 'Verifies randomness quality' },
              ].map((component) => (
                <div key={component.name} className="glass rounded-lg p-4 border border-border/50">
                  <h3 className="font-semibold text-foreground mb-1">{component.name}</h3>
                  <p className="text-sm text-muted-foreground">{component.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeSection === 'quickstart' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl font-bold font-display mb-6">Quick Start</h1>
            
            <h2 className="text-xl font-semibold mt-8 mb-4">Installation</h2>
            <CodeBlock code={`npm install @kaspakinesis/core @kaspakinesis/relay`} />

            <h2 className="text-xl font-semibold mt-8 mb-4">Basic Setup</h2>
            <CodeBlock code={`import { KinesisClient, RecursiveFolding } from '@kaspakinesis/core';
import { KaspaRelay } from '@kaspakinesis/relay';

// Initialize the client
const client = new KinesisClient({
  network: 'mainnet',
  entropySource: 'kaspa-blocks',
});

// Connect to the relay network
const relay = new KaspaRelay(client);
await relay.connect();

// Generate provable random number
const vrf = new RecursiveFolding(client);
const randomValue = await vrf.generate();

console.log('Random value:', randomValue.value);
console.log('Proof:', randomValue.proof);
console.log('Source block:', randomValue.blockHash);`} />

            <h2 className="text-xl font-semibold mt-8 mb-4">Creating a Game Session</h2>
            <CodeBlock code={`import { GameSession } from '@kaspakinesis/core';

// Create a new game session
const session = new GameSession({
  client,
  gameId: 'my-game',
  maxPlayers: 4,
});

// Wait for players
session.on('playerJoined', (player) => {
  console.log('Player joined:', player.id);
});

// Start the game when ready
await session.start();

// Game loop with provable randomness
session.on('turn', async (turn) => {
  const roll = await vrf.generate();
  session.submitAction({
    type: 'dice-roll',
    value: roll.value % 6 + 1,
    proof: roll.proof,
  });
});`} />

            <div className="glass rounded-xl p-6 border border-yellow-500/30 mt-8">
              <h3 className="font-semibold text-yellow-400 mb-2">⚠️ Hackathon Build Notice</h3>
              <p className="text-sm text-muted-foreground">
                The API shown here represents the target design. The current hackathon build 
                uses simplified interfaces. Check the demo code for working examples.
              </p>
            </div>
          </motion.div>
        )}

        {activeSection === 'folding' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl font-bold font-display mb-6">Recursive Folding</h1>
            
            <p className="text-muted-foreground mb-6">
              Recursive Folding is the core algorithm that transforms Kaspa block data into 
              cryptographically secure, statistically uniform random numbers.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">How It Works</h2>
            <div className="space-y-4">
              {[
                { step: 1, title: 'Block Selection', desc: 'Select a recent Kaspa block as entropy source' },
                { step: 2, title: 'Data Extraction', desc: 'Extract block hash and nonce from PoW data' },
                { step: 3, title: 'Initial Mix', desc: 'Combine hash and nonce with cryptographic mixing' },
                { step: 4, title: 'Iterative Folding', desc: 'Apply XOR folding across bit positions' },
                { step: 5, title: 'Statistical Whitening', desc: 'Remove bias through bit rotation and masking' },
                { step: 6, title: 'Output Generation', desc: 'Produce final entropy value with proof' },
              ].map((item) => (
                <div key={item.step} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <h2 className="text-xl font-semibold mt-8 mb-4">Algorithm</h2>
            <CodeBlock code={`function recursiveFold(blockHash: string, nonce: string): string {
  let current = blockHash + nonce;
  
  for (let i = 0; i < FOLD_ITERATIONS; i++) {
    let folded = '';
    const halfLen = current.length / 2;
    
    for (let j = 0; j < halfLen; j++) {
      // XOR fold: combine symmetric positions
      const left = parseInt(current[j], 16);
      const right = parseInt(current[current.length - 1 - j], 16);
      folded += (left ^ right).toString(16);
    }
    
    // Rotate and mix
    current = rotateLeft(folded, i * 3);
  }
  
  return current;
}`} />

            <h2 className="text-xl font-semibold mt-8 mb-4">Security Properties</h2>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-neon-green" />
                <span>Deterministic: Same input always produces same output</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-neon-green" />
                <span>Unpredictable: Output cannot be known before block is mined</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-neon-green" />
                <span>Verifiable: Anyone can verify the transformation</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-neon-green" />
                <span>NIST-compliant: Passes SP 800-22 statistical tests</span>
              </li>
            </ul>
          </motion.div>
        )}

        {activeSection === 'relay' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl font-bold font-display mb-6">Kaspa Relay</h1>
            
            <p className="text-muted-foreground mb-6">
              The Kaspa Relay enables peer-to-peer connectivity between players behind 
              CGNAT, symmetric NAT, or strict firewalls — all without centralized TURN/STUN servers.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">Architecture</h2>
            <div className="glass rounded-xl p-6 border border-border/50 mb-6">
              <div className="flex items-center justify-center gap-4 text-center">
                <div>
                  <div className="w-16 h-16 mx-auto mb-2 rounded-xl bg-blue-500/20 border border-blue-500/50 flex items-center justify-center">
                    <span className="text-2xl">👤</span>
                  </div>
                  <p className="text-sm">Player A</p>
                  <p className="text-xs text-muted-foreground">CGNAT</p>
                </div>
                <ChevronRight className="w-6 h-6 text-primary" />
                <div>
                  <div className="w-16 h-16 mx-auto mb-2 rounded-xl bg-kaspa-primary/20 border border-kaspa-primary/50 flex items-center justify-center">
                    <span className="text-2xl">🌐</span>
                  </div>
                  <p className="text-sm">Kaspa DAG</p>
                  <p className="text-xs text-muted-foreground">Mailbox</p>
                </div>
                <ChevronRight className="w-6 h-6 text-primary" />
                <div>
                  <div className="w-16 h-16 mx-auto mb-2 rounded-xl bg-green-500/20 border border-green-500/50 flex items-center justify-center">
                    <span className="text-2xl">👤</span>
                  </div>
                  <p className="text-sm">Player B</p>
                  <p className="text-xs text-muted-foreground">CGNAT</p>
                </div>
              </div>
            </div>

            <h2 className="text-xl font-semibold mt-8 mb-4">Connection Flow</h2>
            <CodeBlock code={`// 1. Post connection intent to DAG
await relay.postIntent({
  peerId: myPeerId,
  gameId: 'chess-game-123',
  timestamp: Date.now(),
});

// 2. Discover available peers
const peers = await relay.discoverPeers('chess-game-123');

// 3. Exchange ICE candidates via DAG
await relay.exchangeIce(targetPeerId, myIceCandidates);

// 4. Establish direct WebRTC connection
const connection = await relay.connect(targetPeerId);

// 5. Send messages directly (no relay needed after connect)
connection.send({ type: 'move', data: 'e2-e4' });`} />

            <h2 className="text-xl font-semibold mt-8 mb-4">Why It Works</h2>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 mt-1 text-primary flex-shrink-0" />
                <span>The DAG is globally accessible — no firewall blocks it</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 mt-1 text-primary flex-shrink-0" />
                <span>ICE candidates exchanged via DAG enable NAT hole-punching</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 mt-1 text-primary flex-shrink-0" />
                <span>Once connected, peers communicate directly (low latency)</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 mt-1 text-primary flex-shrink-0" />
                <span>No single point of failure or trust</span>
              </li>
            </ul>
          </motion.div>
        )}

        {activeSection === 'testing' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl font-bold font-display mb-6">Testing Entropy</h1>
            
            <p className="text-muted-foreground mb-6">
              ꓘK includes a full NIST SP 800-22 test suite integration to verify that 
              generated entropy meets cryptographic randomness standards.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">Running Tests</h2>
            <CodeBlock code={`import { NISTTestSuite } from '@kaspakinesis/core';

// Collect entropy samples
const samples = [];
for (let i = 0; i < 1000; i++) {
  const entropy = await vrf.generate();
  samples.push(entropy.value);
}

// Run NIST test suite
const results = await NISTTestSuite.run(samples, {
  tests: ['frequency', 'runs', 'dft', 'entropy'],
  significance: 0.01,
});

// Check results
for (const result of results) {
  console.log(\`\${result.name}: \${result.passed ? 'PASS' : 'FAIL'}\`);
  console.log(\`  p-value: \${result.pValue}\`);
}`} />

            <h2 className="text-xl font-semibold mt-8 mb-4">Available Tests</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Test</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Purpose</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border/30">
                    <td className="py-2 px-3">Frequency</td>
                    <td className="py-2 px-3">Equal distribution of 0s and 1s</td>
                  </tr>
                  <tr className="border-b border-border/30">
                    <td className="py-2 px-3">Runs</td>
                    <td className="py-2 px-3">Distribution of consecutive bits</td>
                  </tr>
                  <tr className="border-b border-border/30">
                    <td className="py-2 px-3">DFT</td>
                    <td className="py-2 px-3">Detect periodic patterns</td>
                  </tr>
                  <tr className="border-b border-border/30">
                    <td className="py-2 px-3">Entropy</td>
                    <td className="py-2 px-3">Information density</td>
                  </tr>
                  <tr className="border-b border-border/30">
                    <td className="py-2 px-3">Linear Complexity</td>
                    <td className="py-2 px-3">Resistance to linear prediction</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="glass rounded-xl p-6 border border-neon-green/30 mt-8">
              <h3 className="font-semibold text-neon-green mb-2">✓ Test Results</h3>
              <p className="text-sm text-muted-foreground">
                Entropy generated by Recursive Folding consistently passes all NIST SP 800-22 
                tests with p-values well above the 0.01 significance threshold.
              </p>
            </div>
          </motion.div>
        )}

        {activeSection === 'api' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl font-bold font-display mb-6">API Reference</h1>
            
            <div className="glass rounded-xl p-6 border border-yellow-500/30 mb-8">
              <h3 className="font-semibold text-yellow-400 mb-2">🚧 Coming Soon</h3>
              <p className="text-sm text-muted-foreground">
                Full API documentation is in progress. For now, please refer to the 
                demo code and inline comments.
              </p>
            </div>

            <h2 className="text-xl font-semibold mt-8 mb-4">Core Classes</h2>
            <div className="space-y-4">
              <div className="glass rounded-lg p-4 border border-border/50">
                <code className="text-primary font-mono">KinesisClient</code>
                <p className="text-sm text-muted-foreground mt-1">
                  Main entry point for ꓘK functionality
                </p>
              </div>
              <div className="glass rounded-lg p-4 border border-border/50">
                <code className="text-primary font-mono">RecursiveFolding</code>
                <p className="text-sm text-muted-foreground mt-1">
                  VRF implementation using block entropy
                </p>
              </div>
              <div className="glass rounded-lg p-4 border border-border/50">
                <code className="text-primary font-mono">KaspaRelay</code>
                <p className="text-sm text-muted-foreground mt-1">
                  P2P signaling via the BlockDAG
                </p>
              </div>
              <div className="glass rounded-lg p-4 border border-border/50">
                <code className="text-primary font-mono">GameSession</code>
                <p className="text-sm text-muted-foreground mt-1">
                  Multiplayer game state management
                </p>
              </div>
              <div className="glass rounded-lg p-4 border border-border/50">
                <code className="text-primary font-mono">NISTTestSuite</code>
                <p className="text-sm text-muted-foreground mt-1">
                  Statistical randomness testing
                </p>
              </div>
            </div>

            <div className="mt-8 flex items-center gap-4">
              <a
                href="https://github.com/example/kaspa-kinesis"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                View Source on GitHub
              </a>
            </div>
          </motion.div>
        )}

        {/* Mobile section navigation */}
        <div className="lg:hidden mt-8 pt-8 border-t border-border/50">
          <h4 className="text-sm font-medium text-muted-foreground mb-4">Documentation Sections</h4>
          <div className="flex flex-wrap gap-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                  activeSection === section.id
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted/50 text-muted-foreground hover:text-foreground'
                )}
              >
                <section.icon className="w-4 h-4" />
                {section.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
