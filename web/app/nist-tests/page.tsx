'use client'

import { useEffect } from 'react'

export default function NISTTestsPage() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.location.replace('/spa/nist-tests.html')
    }
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
      <div className="glass rounded-xl border border-border/50 p-8 max-w-lg text-center">
        <h1 className="text-2xl font-bold mb-3">Opening NIST Test Suite</h1>
        <p className="text-muted-foreground mb-6">
          Redirecting you to the standalone SPA to avoid WASM resolver issues in Next.js.
        </p>
        <a className="btn-secondary inline-flex" href="/spa/nist-tests.html">
          Open NIST Test Suite SPA
        </a>
      </div>
    </div>
  )
}
