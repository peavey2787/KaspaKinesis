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
            Why existing approaches fail, and how ꓘK fixes them.
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
              <h3 className="text-2xl font-bold font-display">The ꓘK Solution</h3>
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

        {/* Arrow connector for desktop */}
        <div className="hidden lg:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            whileInView={{ scale: 1, rotate: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="w-16 h-16 rounded-full glass border-2 border-primary/50 flex items-center justify-center"
          >
            <span className="text-3xl gradient-text">→</span>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
