'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Github, Twitter, BookOpen, Play, Mail, ExternalLink, Heart } from 'lucide-react'

const footerLinks = {
  product: [
    { label: 'Game Demo', href: '/game-demo' },
    { label: 'VRF Demo', href: '/vrf-demo' },
    { label: 'Relay Demo', href: '/relay-demo' },
    { label: 'NIST Tests', href: '/nist-tests' },
  ],
  resources: [
    { label: 'Documentation', href: '/docs' },
    { label: 'GitHub', href: 'https://github.com/example/kaspa-kinesis', external: true },
    { label: 'README', href: 'https://github.com/example/kaspa-kinesis#readme', external: true },
  ],
  community: [
    { label: 'Twitter', href: 'https://twitter.com/kaspakinesis', external: true },
    { label: 'Discord', href: '#', external: true },
    { label: 'Contact', href: 'mailto:hello@kaspakinesis.io', external: true },
  ],
}

const socialLinks = [
  { icon: Github, href: 'https://github.com/example/kaspa-kinesis', label: 'GitHub' },
  { icon: Twitter, href: 'https://twitter.com/kaspakinesis', label: 'Twitter' },
  { icon: Mail, href: 'mailto:hello@kaspakinesis.io', label: 'Email' },
]

export function Footer() {
  return (
    <footer className="relative border-t border-border/50 bg-gradient-to-b from-background to-kaspa-dark">
      {/* Gradient line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-4 lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2 mb-4">
              <span className="text-3xl font-bold font-display gradient-text">ꓘK</span>
              <span className="text-xl font-semibold text-foreground">Kaspa Kinesis</span>
            </Link>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Turning Kaspa into a serverless multiplayer backbone. 
              Provable randomness meets decentralized networking.
            </p>
            
            {/* Social links */}
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-lg glass flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Product links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Demos</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Resources</h4>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.label}>
                  {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors text-sm"
                    >
                      {link.label}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-muted-foreground hover:text-foreground transition-colors text-sm"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Community links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Community</h4>
            <ul className="space-y-3">
              {footerLinks.community.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors text-sm"
                  >
                    {link.label}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-border/30">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground text-center md:text-left">
              © {new Date().getFullYear()} Kaspa Kinesis. Built with{' '}
              <Heart className="inline w-4 h-4 text-red-500" /> for the Kaspa Hackathon.
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="gradient-text font-semibold">ꓘK Kaspa Kinesis</span>
              {' — '}Turning Kaspa into a serverless multiplayer backbone.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
