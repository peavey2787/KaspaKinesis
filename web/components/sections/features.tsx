'use client'

import { motion } from 'framer-motion'
import { 
  Shuffle, Radio, Database, Shield, Users, Server,
  Layers, Eye, Zap, Lock, Globe, RefreshCw
} from 'lucide-react'
import { ScrollReveal, StaggerContainer, StaggerItem } from '../animations'
import { cn } from '@/lib/utils'

const features = [
  {
    icon: Shuffle,
    title: 'Recursive Folding',
    description: 'Transforms Kaspa PoW artifacts through cryptographic mixing and whitening into NIST-grade entropy. Every random number is traceable back to public blockchain data.',
    gradient: 'from-neon-cyan to-blue-500',
    tag: 'Core Primitive',
  },
  {
    icon: Radio,
    title: 'Kaspa Relay',
    description: 'Decentralized mailbox system using the BlockDAG itself. Enables CGNAT↔CGNAT connectivity without centralized TURN/STUN servers.',
    gradient: 'from-kaspa-primary to-neon-green',
    tag: 'Networking',
  },
  {
    icon: Database,
    title: 'Deterministic State Engine',
    description: 'All game state derives from ordered inputs and VRF outputs. Given the same seed and actions, any observer can reconstruct exact game history.',
    gradient: 'from-purple-500 to-neon-purple',
    tag: 'State Management',
  },
  {
    icon: Shield,
    title: 'Auditability & NIST Tests',
    description: 'Built-in NIST SP 800-22 test suite integration. Run statistical tests on entropy outputs to verify randomness quality.',
    gradient: 'from-neon-green to-emerald-500',
    tag: 'Security',
  },
  {
    icon: Users,
    title: 'Spectator & Replay',
    description: '(Coming soon) Any observer can join mid-session and catch up by replaying anchored state. Full transparency for esports, audits, or debugging.',
    gradient: 'from-orange-500 to-yellow-500',
    tag: 'Observability',
  },
  {
    icon: Server,
    title: 'Serverless by Design',
    description: 'No game servers required. Players connect directly through Kaspa Relay. The blockchain provides coordination, timing, and entropy.',
    gradient: 'from-pink-500 to-rose-500',
    tag: 'Infrastructure',
  },
]

interface FeatureCardProps {
  feature: typeof features[0]
  index: number
}

function FeatureCard({ feature, index }: FeatureCardProps) {
  const Icon = feature.icon

  return (
    <motion.div
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ duration: 0.3 }}
      className="group relative h-full"
    >
      {/* Glow effect on hover */}
      <div className={cn(
        'absolute -inset-0.5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl',
        `bg-gradient-to-r ${feature.gradient}`
      )} style={{ opacity: 0.2 }} />
      
      <div className="relative h-full glass rounded-2xl p-6 lg:p-8 border border-border/50 group-hover:border-primary/30 transition-all duration-300">
        {/* Tag */}
        <span className="tag text-xs mb-4 inline-block">{feature.tag}</span>

        {/* Icon */}
        <div className={cn(
          'w-14 h-14 rounded-xl mb-6 flex items-center justify-center',
          `bg-gradient-to-br ${feature.gradient}`
        )}>
          <Icon className="w-7 h-7 text-background" />
        </div>

        {/* Content */}
        <h3 className="text-xl font-bold font-display mb-3 text-foreground group-hover:gradient-text transition-all duration-300">
          {feature.title}
        </h3>
        <p className="text-muted-foreground leading-relaxed">
          {feature.description}
        </p>

        {/* Hover indicator */}
        <motion.div
          initial={{ width: 0 }}
          whileHover={{ width: '100%' }}
          className={cn(
            'absolute bottom-0 left-0 h-1 rounded-b-2xl',
            `bg-gradient-to-r ${feature.gradient}`
          )}
        />
      </div>
    </motion.div>
  )
}

export function FeaturesSection() {
  return (
    <section id="features" className="section relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card/20 to-background" />
      <div className="absolute inset-0 bg-dots opacity-30" />
      
      {/* Floating orbs */}
      <motion.div
        animate={{ 
          x: [0, 50, 0],
          y: [0, -30, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        className="absolute top-1/4 left-10 w-64 h-64 bg-neon-cyan/5 rounded-full blur-3xl"
      />
      <motion.div
        animate={{ 
          x: [0, -50, 0],
          y: [0, 30, 0],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
        className="absolute bottom-1/4 right-10 w-64 h-64 bg-kaspa-primary/5 rounded-full blur-3xl"
      />

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal className="text-center mb-16">
          <span className="tag mb-4 inline-block">Core Primitives</span>
          <h2 className="section-title mb-4">
            Built for <span className="gradient-text">Provable Fairness</span>
          </h2>
          <p className="section-subtitle mx-auto">
            Six foundational primitives that make{' '}
            <span className="font-semibold">
              <span className="text-primary">ꓘ</span>
              <span className="text-secondary">K</span>
            </span>{' '}
            possible. Each component is designed for transparency, auditability, and decentralization.
          </p>
        </ScrollReveal>

        <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <StaggerItem key={feature.title}>
              <FeatureCard feature={feature} index={index} />
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Stats row */}
        <ScrollReveal delay={0.3} className="mt-20">
          <div className="glass rounded-2xl p-8 lg:p-12 border border-border/50">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
              {[
                { value: '0', label: 'Servers Required', icon: Server },
                { value: '100%', label: 'Auditable Entropy', icon: Eye },
                { value: 'NIST', label: 'Test Compliant', icon: Shield },
                { value: '∞', label: 'Replay Capability', icon: RefreshCw },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="space-y-2"
                >
                  <stat.icon className="w-8 h-8 text-primary mx-auto mb-3" />
                  <div className="text-3xl lg:text-4xl font-bold font-display gradient-text">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
