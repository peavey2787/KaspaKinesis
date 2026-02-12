'use client'

import { motion } from 'framer-motion'
import { Play, ExternalLink, Github, ChevronDown } from 'lucide-react'
import { ParticleBackground, BlockDAGBackground } from '@/components/backgrounds'

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0 bg-gradient-to-b from-kaspa-dark via-background to-background" />
      <BlockDAGBackground />
      <ParticleBackground />
      
      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-background/50 to-transparent" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 pt-20">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 mb-8"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-green opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-green" />
            </span>
            <span className="text-sm font-medium text-primary">Hackathon Build — Live Demo Available</span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold font-display tracking-tight mb-6"
          >
            <span>
              <span className="text-primary">ꓘ</span>
              <span className="text-secondary">K</span>
            </span>{' '}
            <span className="text-foreground">Kaspa Kinesis</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl sm:text-2xl md:text-3xl font-display text-muted-foreground mb-6"
          >
            <span className="text-primary">Provable Randomness</span> meets{' '}
            <span className="text-secondary">Decentralized Networking</span>
          </motion.p>

          {/* One-liner */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-lg text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed"
          >
            A zero-infrastructure multiplayer engine that turns the Kaspa BlockDAG into a fair, 
            auditable, serverless backbone for real-time games and interactive systems.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <a href="#demo-video" className="btn-secondary flex items-center gap-2 text-lg px-8 py-4 group">
              <Play className="w-5 h-5 group-hover:scale-110 transition-transform" />
              Watch 3-Minute Demo
            </a>
            <a
              href="/kktp/game/index.html"
              className="btn-secondary flex items-center gap-2 text-lg px-8 py-4"
            >
              <ExternalLink className="w-5 h-5" />
              Try DAG Dasher
            </a>
            <a
              href="https://github.com/peavey2787/KaspaKinesis#readme"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost flex items-center gap-2 text-lg"
            >
              <Github className="w-5 h-5" />
              View README
            </a>
          </motion.div>

          {/* Tech stack badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="mt-16 flex flex-wrap items-center justify-center gap-3"
          >
            {['Kaspa BlockDAG', 'VRF', 'NIST SP 800-22', 'P2P Relay', 'End-to-End Encryption', 'Decentralized'].map((tech) => (
              <span key={tech} className="tag">
                {tech}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <a
            href="#problem-solution"
            className="flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="text-sm font-medium">Explore</span>
            <ChevronDown className="w-5 h-5 animate-bounce" />
          </a>
        </motion.div>
      </div>

    </section>
  )
}
