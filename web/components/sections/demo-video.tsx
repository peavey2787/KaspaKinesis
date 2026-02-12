'use client'

import { ExternalLink, Play } from 'lucide-react'
import { ScrollReveal } from '../animations'

const YOUTUBE_WATCH_URL = 'https://www.youtube.com/watch?v=eMHwJhGVk08'
const YOUTUBE_EMBED_URL =
  'https://www.youtube.com/embed/eMHwJhGVk08?si=zaovB7HLA9f_AR3X'

export function DemoVideoSection() {
  return (
    <section id="demo-video" className="section relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card/20 to-background" />

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal className="text-center mb-10">
          <span className="tag tag-success mb-4 inline-block">Video Walkthrough</span>
          <h2 className="section-title mb-4">
            Watch the <span className="gradient-text">3-Minute Demo</span>
          </h2>
          <p className="section-subtitle mx-auto">
            See the complete flow from hosting a lobby to multiplayer gameplay.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="glass rounded-2xl p-4 sm:p-6 border border-border/50 max-w-5xl mx-auto">
            <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-border/40 bg-card">
              <iframe
                width="560"
                height="315"
                src={YOUTUBE_EMBED_URL}
                title="Kaspa Kinesis demo video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                className="absolute inset-0 h-full w-full"
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Play className="w-4 h-4 text-primary" />
                Embedded player ready
              </span>
              <a
                href={YOUTUBE_WATCH_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-secondary hover:text-primary transition-colors"
              >
                Open on YouTube
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
