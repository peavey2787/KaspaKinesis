'use client'

import { motion } from 'framer-motion'
import { AlertTriangle, Check, Shuffle, Radio, Shield, Eye } from 'lucide-react'
import { ScrollReveal, StaggerContainer, StaggerItem } from '../animations'

const problems = [
  {
    icon: AlertTriangle,
    title: 'Trusted entropy is hard.',
    description: 'On-chain RNG is extractable, off-chain RNG is opaque.',
  },
  {
    icon: Radio,
    title: 'Peer connectivity is fragile.',
    description: 'CGNAT, firewalls, and missing infra kill true P2P.',
  },
]

const solutions = [
  {
    icon: Shuffle,
    title: 'Recursive Folding',
    description: 'Mixes and whitens PoW artifacts into NIST-grade randomness.',
    color: 'text-neon-cyan',
  },
  {
    icon: Radio,
    title: 'Kaspa Relay',
    description: 'Decentralized mailbox enabling CGNAT↔CGNAT connectivity without TURN/STUN.',
    color: 'text-kaspa-primary',
  },
  {
    icon: Eye,
    title: 'Audit-Ready by Design',
    description: 'All entropy inputs and outputs are public and reproducible.',
    color: 'text-neon-green',
  },
]

export function ProblemSolutionSection() {
  return (
    <section id="problem-solution" className="section relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card/30 to-background" />
      <div className="absolute inset-0 bg-grid opacity-30" />

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal className="text-center mb-16">
          <h2 className="section-title mb-4">
            The <span className="text-red-500">Problem</span> → The{' '}
            <span className="gradient-text">Solution</span>
          </h2>
          <p className="section-subtitle mx-auto">
            Why existing approaches fail, and how{' '}
            <span className="font-semibold">
              <span className="text-primary">ꓘ</span>
              <span className="text-secondary">K</span>
            </span>{' '}
            fixes them.
          </p>
        </ScrollReveal>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16">
          {/* Problems */}
          <StaggerContainer className="space-y-6">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="text-2xl font-bold font-display">The Problem</h3>
            </div>

            {problems.map((problem, index) => (
              <StaggerItem key={index}>
                <motion.div
                  whileHover={{ x: 5 }}
                  className="glass p-6 rounded-xl border-red-500/20 hover:border-red-500/40 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                      <problem.icon className="w-6 h-6 text-red-400" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-foreground mb-2">
                        {problem.title}
                      </h4>
                      <p className="text-muted-foreground">
                        "{problem.description}"
                      </p>
                    </div>
                  </div>
                </motion.div>
              </StaggerItem>
            ))}

            {/* Visual divider on mobile */}
            <div className="lg:hidden flex items-center gap-4 py-8">
              <div className="flex-1 h-px bg-gradient-to-r from-red-500/50 via-muted to-neon-cyan/50" />
              <span className="text-2xl">→</span>
              <div className="flex-1 h-px bg-gradient-to-r from-neon-cyan/50 via-muted to-neon-green/50" />
            </div>
          </StaggerContainer>

          {/* Solutions */}
          <StaggerContainer className="space-y-6" staggerDelay={0.15}>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                <Check className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-2xl font-bold font-display">
                The{' '}
                <span className="font-bold">
                  <span className="text-primary">ꓘ</span>
                  <span className="text-secondary">K</span>
                </span>{' '}
                Solution
              </h3>
            </div>

            {solutions.map((solution, index) => (
              <StaggerItem key={index}>
                <motion.div
                  whileHover={{ x: 5, scale: 1.01 }}
                  className="glass p-6 rounded-xl border-primary/20 hover:border-primary/40 hover:shadow-glow-sm transition-all duration-300"
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center`}>
                      <solution.icon className={`w-6 h-6 ${solution.color}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className={`text-lg font-semibold ${solution.color}`}>
                          {solution.title}
                        </h4>
                        <Check className="w-4 h-4 text-neon-green" />
                      </div>
                      <p className="text-muted-foreground">
                        {solution.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>

        <div className="mt-16">
          <ScrollReveal className="text-center">
            <h3 className="text-3xl sm:text-4xl font-bold font-display mb-4">
              From IETF Drafts to Quantum-Secure Entropy
            </h3>
            <p className="text-muted-foreground max-w-3xl mx-auto">
              Research, formal specifications, and public write-ups that shaped the core protocol,
              threat model, and randomness pipeline behind the engine.
            </p>
          </ScrollReveal>

          <div className="grid lg:grid-cols-2 gap-6 mt-10">
            <a
              href="https://datatracker.ietf.org/doc/draft-koding-kktp/00/"
              target="_blank"
              rel="noopener noreferrer"
              className="group glass p-6 rounded-xl border border-border/50 hover:border-secondary/60 transition-colors"
              aria-label="KKTP Protocol IETF Draft"
            >
              <h4 className="text-xl font-semibold font-display mb-3">KKTP Protocol (IETF Draft)</h4>
              <p className="text-muted-foreground">
                The official specification for the ꓘK Transport Protocol.
              </p>
              <p className="mt-3 text-secondary group-hover:text-secondary/80 transition-colors">
                View IETF Draft →
              </p>
            </a>

            <a
              href="https://datatracker.ietf.org/doc/draft-koding-kktp-threat-model/"
              target="_blank"
              rel="noopener noreferrer"
              className="group glass p-6 rounded-xl border border-border/50 hover:border-secondary/60 transition-colors"
              aria-label="KKTP Threat Model"
            >
              <h4 className="text-xl font-semibold font-display mb-3">KKTP Threat Model</h4>
              <p className="text-muted-foreground">
                Formal analysis of attack vectors (Sybil, Grinding, Replay) and cryptographic mitigations.
              </p>
              <p className="mt-3 text-secondary group-hover:text-secondary/80 transition-colors">
                View Threat Model →
              </p>
            </a>

            <a
              href="https://kodinglsfun.substack.com/p/the-death-of-the-cheater-solving"
              target="_blank"
              rel="noopener noreferrer"
              className="group glass p-6 rounded-xl border border-border/50 hover:border-secondary/60 transition-colors"
              aria-label="The G.H.F. Architecture write-up"
            >
              <h4 className="text-xl font-semibold font-display mb-3">
                The G.H.F. Architecture (Genesis, Heartbeat, Finality)
              </h4>
              <p className="text-muted-foreground">
                The Death of the Cheater: Solving the Data Availability Trilemma.
              </p>
              <div className="mt-4 space-y-2 text-muted-foreground">
                <p>
                  The Innovation: our "State-Anchored Delta-Chain" pattern.
                </p>
                <p>
                  The Benefit: achieves CGNAT independence and ledger-only auditability by using the
                  Kaspa ledger as a decentralized relay instead of centralized STUN/TURN servers.
                </p>
              </div>
              <p className="mt-3 text-secondary group-hover:text-secondary/80 transition-colors">
                Read the G.H.F. Architecture →
              </p>
            </a>

            <a
              href="https://kodinglsfun.substack.com/p/a-verifiable-cheatresistant-hybrid"
              target="_blank"
              rel="noopener noreferrer"
              className="group glass p-6 rounded-xl border border-border/50 hover:border-secondary/60 transition-colors"
              aria-label="Verifiable Randomness write-up"
            >
              <h4 className="text-xl font-semibold font-display mb-3">Verifiable Randomness (VRF)</h4>
              <p className="text-muted-foreground">
                A Hybrid Blockchain-Quantum Randomness Beacon.
              </p>
              <div className="mt-4 space-y-2 text-muted-foreground">
                <p>
                  Technical deep-dive into recursive folding across Bitcoin, Kaspa, and NIST QRNG sources.
                </p>
                <p>
                  Note: the engine has been hardened since this publication to utilize an HMAC-SHA256
                  recursive loop for superior collision resistance.
                </p>
              </div>
              <p className="mt-3 text-secondary group-hover:text-secondary/80 transition-colors">
                Read the VRF Deep Dive →
              </p>
            </a>

            <a
              href="https://kodinglsfun.substack.com/p/sovereign-gaming-on-kaspa-your-node"
              target="_blank"
              rel="noopener noreferrer"
              className="group glass p-6 rounded-xl border border-border/50 hover:border-secondary/60 transition-colors"
              aria-label="Sovereign Gaming roadmap"
            >
              <h4 className="text-xl font-semibold font-display mb-3">Philosophy & Future Roadmap</h4>
              <p className="text-muted-foreground">
                Sovereign Gaming: Your Node is Your Console - limitations of modern Web3 gaming and the
                roadmap for the Genesis Heartbeat Final pattern.
              </p>
              <p className="mt-3 text-secondary group-hover:text-secondary/80 transition-colors">
                Read the Roadmap →
              </p>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
