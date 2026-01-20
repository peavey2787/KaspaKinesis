'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { 
  Play, ExternalLink, BookOpen, Radio, Shuffle, 
  TestTube, Gamepad2, ArrowRight, CheckCircle, Clock, Calendar
} from 'lucide-react'
import { ScrollReveal, StaggerContainer, StaggerItem } from '../animations'
import { cn } from '@/lib/utils'

type DemoStatus = 'live' | 'in-progress' | 'planned'

interface DemoItem {
  title: string
  description: string
  icon: typeof Play
  href: string
  cta: string
  status: DemoStatus
  external?: boolean
}

const demos: DemoItem[] = [
  {
    title: '3-Minute Demo Video',
    description: 'Watch a complete walkthrough of ꓘK capabilities, from entropy generation to multiplayer gameplay.',
    icon: Play,
    href: '#',
    cta: 'Watch Demo',
    status: 'live',
  },
  {
    title: 'Hosted Client Web App',
    description: 'Try the live multiplayer client directly in your browser. No installation required.',
    icon: ExternalLink,
    href: '/game-demo',
    cta: 'Open Client',
    status: 'live',
  },
  {
    title: 'Get Started README',
    description: 'Comprehensive documentation covering setup, architecture, and integration guides.',
    icon: BookOpen,
    href: '/docs',
    cta: 'View README',
    status: 'live',
  },
  {
    title: 'CGNAT ↔ CGNAT Demo',
    description: 'See the Kaspa Relay in action, establishing connections between NAT-blocked peers.',
    icon: Radio,
    href: '/relay-demo',
    cta: 'Try Relay',
    status: 'live',
  },
  {
    title: 'VRF / Block Collection',
    description: 'Visualize entropy extraction from Kaspa blocks in real-time with the Recursive Folding algorithm.',
    icon: Shuffle,
    href: '/vrf-demo',
    cta: 'Explore VRF',
    status: 'live',
  },
  {
    title: 'NIST Test Suite',
    description: 'Run NIST SP 800-22 statistical tests on generated entropy to verify randomness quality.',
    icon: TestTube,
    href: '/nist-tests',
    cta: 'Run Tests',
    status: 'live',
  },
  {
    title: 'Toy Grid Game',
    description: 'A simple turn-based grid game demonstrating all ꓘK primitives working together.',
    icon: Gamepad2,
    href: '/game-demo',
    cta: 'Play Game',
    status: 'live',
  },
]

const statusConfig = {
  live: {
    label: 'Live',
    className: 'tag-success',
    icon: CheckCircle,
  },
  'in-progress': {
    label: 'In Progress',
    className: 'tag-warning',
    icon: Clock,
  },
  planned: {
    label: 'Planned',
    className: 'tag-info',
    icon: Calendar,
  },
}

function DemoCard({ demo }: { demo: DemoItem }) {
  const Icon = demo.icon
  const StatusIcon = statusConfig[demo.status].icon
  const isExternal = demo.external
  const isLive = demo.status === 'live'

  const content = (
    <motion.div
      whileHover={isLive ? { y: -4, scale: 1.01 } : {}}
      className={cn(
        'group relative h-full glass rounded-xl p-6 border transition-all duration-300',
        isLive 
          ? 'border-border/50 hover:border-primary/50 cursor-pointer' 
          : 'border-border/30 opacity-70'
      )}
    >
      {/* Status badge */}
      <div className="flex items-center justify-between mb-4">
        <div className={cn('tag', statusConfig[demo.status].className)}>
          <StatusIcon className="w-3 h-3 mr-1" />
          {statusConfig[demo.status].label}
        </div>
        {isLive && (
          <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
        )}
      </div>

      {/* Icon */}
      <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
        <Icon className="w-6 h-6 text-primary" />
      </div>

      {/* Content */}
      <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
        {demo.title}
      </h3>
      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
        {demo.description}
      </p>

      {/* CTA */}
      {isLive && (
        <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
          {demo.cta}
          {isExternal && <ExternalLink className="w-3 h-3" />}
        </span>
      )}
    </motion.div>
  )

  if (!isLive) {
    return content
  }

  if (isExternal) {
    return (
      <a href={demo.href} target="_blank" rel="noopener noreferrer" className="block h-full">
        {content}
      </a>
    )
  }

  return (
    <Link href={demo.href} className="block h-full">
      {content}
    </Link>
  )
}

export function DemosSection() {
  return (
    <section id="demos" className="section relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card/30 to-background" />
      <div className="absolute inset-0 bg-grid opacity-20" />
      
      {/* Accent orbs */}
      <div className="absolute top-1/3 left-0 w-96 h-96 bg-neon-green/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/3 right-0 w-96 h-96 bg-neon-cyan/5 rounded-full blur-3xl" />

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal className="text-center mb-12">
          <span className="tag tag-success mb-4 inline-block">Hackathon Build</span>
          <h2 className="section-title mb-4">
            What's <span className="gradient-text">Live</span> Now
          </h2>
          <p className="section-subtitle mx-auto">
            Explore working demonstrations of ꓘK capabilities. Each demo showcases 
            a different aspect of the system.
          </p>
        </ScrollReveal>

        <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {demos.map((demo) => (
            <StaggerItem key={demo.title}>
              <DemoCard demo={demo} />
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Quick start CTA */}
        <ScrollReveal delay={0.3} className="mt-16 text-center">
          <div className="glass rounded-2xl p-8 lg:p-12 border border-primary/20 max-w-3xl mx-auto">
            <h3 className="text-2xl font-bold font-display mb-4">
              Ready to dive in?
            </h3>
            <p className="text-muted-foreground mb-6">
              Start with the Toy Grid Game to see all ꓘK primitives working together, 
              or explore the VRF Demo to understand the entropy system.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/game-demo" className="btn-primary flex items-center gap-2">
                <Gamepad2 className="w-5 h-5" />
                Play Toy Grid Game
              </Link>
              <Link href="/docs" className="btn-secondary flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Read Documentation
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
