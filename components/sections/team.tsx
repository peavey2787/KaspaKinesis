'use client'

import { motion } from 'framer-motion'
import { 
  Code2, Palette, Gamepad2, Network, ShieldCheck, 
  Mail, MessageSquare, ArrowRight, User
} from 'lucide-react'
import { ScrollReveal, StaggerContainer, StaggerItem } from '../animations'
import { cn } from '@/lib/utils'

const roles = [
  {
    icon: Code2,
    title: 'Front-End Developers',
    description: 'Help build beautiful, responsive UI components and improve the demo experiences.',
    skills: ['React', 'Next.js', 'TypeScript', 'Tailwind'],
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Palette,
    title: 'Graphic & Brand Designers',
    description: 'Create visual assets, animations, and establish a cohesive brand identity.',
    skills: ['UI/UX', 'Motion Design', 'Branding', 'Illustration'],
    gradient: 'from-pink-500 to-rose-500',
  },
  {
    icon: Gamepad2,
    title: 'Game Developers',
    description: 'Build more complex game demos and help optimize the deterministic state engine.',
    skills: ['Game Logic', 'State Machines', 'WebGL', 'Physics'],
    gradient: 'from-purple-500 to-violet-500',
  },
  {
    icon: Network,
    title: 'Network & Systems Engineers',
    description: 'Improve the relay system, optimize WebRTC connections, and scale infrastructure.',
    skills: ['WebRTC', 'P2P', 'Networking', 'Rust/Go'],
    gradient: 'from-orange-500 to-amber-500',
  },
  {
    icon: ShieldCheck,
    title: 'Security & Cryptography',
    description: 'Audit the VRF implementation, review entropy quality, and improve security posture.',
    skills: ['Cryptography', 'Security Audits', 'Formal Verification'],
    gradient: 'from-green-500 to-emerald-500',
  },
]

function RoleCard({ role, index }: { role: typeof roles[0]; index: number }) {
  const Icon = role.icon

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="group h-full"
    >
      <div className="h-full glass rounded-xl p-6 border border-border/50 hover:border-primary/30 transition-all duration-300">
        {/* Icon */}
        <div className={cn(
          'w-14 h-14 rounded-xl mb-5 flex items-center justify-center bg-gradient-to-br',
          role.gradient
        )}>
          <Icon className="w-7 h-7 text-white" />
        </div>

        {/* Content */}
        <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
          {role.title}
        </h3>
        <p className="text-muted-foreground text-sm mb-4">
          {role.description}
        </p>

        {/* Skills */}
        <div className="flex flex-wrap gap-2">
          {role.skills.map((skill) => (
            <span key={skill} className="text-xs px-2 py-1 rounded-md bg-muted/50 text-muted-foreground">
              {skill}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

export function TeamSection() {
  return (
    <section id="team" className="section relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-kaspa-secondary/10 to-background" />
      
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Solo builder intro */}
        <ScrollReveal className="text-center mb-16">
          <div className="inline-flex items-center gap-3 px-5 py-3 rounded-full glass border border-border/50 mb-8">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-cyan to-kaspa-primary flex items-center justify-center">
              <User className="w-5 h-5 text-background" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">Solo-Driven Project</p>
              <p className="text-xs text-muted-foreground">Built for the Kaspa Hackathon</p>
            </div>
          </div>

          <h2 className="section-title mb-4">
            Join the <span className="gradient-text">ꓘK</span> Team
          </h2>
          <p className="section-subtitle mx-auto mb-8">
            ꓘK started as a solo hackathon project, but the vision is bigger than one person. 
            I'm looking for passionate collaborators to help build the future of provable, 
            serverless multiplayer systems.
          </p>
        </ScrollReveal>

        {/* Roles grid */}
        <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {roles.map((role, index) => (
            <StaggerItem key={role.title}>
              <RoleCard role={role} index={index} />
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* CTA */}
        <ScrollReveal delay={0.2}>
          <div className="max-w-2xl mx-auto text-center">
            <div className="glass rounded-2xl p-8 lg:p-12 border border-primary/20">
              <MessageSquare className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-bold font-display mb-4">
                Interested in Contributing?
              </h3>
              <p className="text-muted-foreground mb-6">
                Whether you can dedicate an hour or a hundred, I'd love to hear from you. 
                Let's build something remarkable together.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href="mailto:hello@kaspakinesis.io"
                  className="btn-primary flex items-center gap-2"
                >
                  <Mail className="w-5 h-5" />
                  Reach Out
                </a>
                <a
                  href="https://github.com/example/kaspa-kinesis"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary flex items-center gap-2"
                >
                  <Code2 className="w-5 h-5" />
                  Contribute on GitHub
                </a>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
