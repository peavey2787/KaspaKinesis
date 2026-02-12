'use client'

import { useEffect } from 'react'

export default function RelayDemoPage() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.location.replace('/spa/relay-demo.html')
    }
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
      <div className="glass rounded-xl border border-border/50 p-8 max-w-lg text-center">
        <h1 className="text-2xl font-bold mb-3">Opening Relay Demo</h1>
        <p className="text-muted-foreground mb-6">
          Redirecting you to the standalone SPA to avoid WASM resolver issues in Next.js.
        </p>
        <a className="btn-secondary inline-flex" href="/spa/relay-demo.html">
          Open Relay Demo SPA
        </a>
      </div>
    </div>
  )
}
