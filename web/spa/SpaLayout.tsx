import React from 'react'

type SpaLayoutProps = {
  title: string
  description: string
  children: React.ReactNode
}

export function SpaLayout({ title, description, children }: SpaLayoutProps) {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : ''

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/spa/vrf-demo.html', label: 'VRF Demo' },
    { href: '/spa/relay-demo.html', label: 'Relay Demo' },
    { href: '/spa/nist-tests.html', label: 'NIST Tests' },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/50 bg-card/60">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <a href="/" className="flex items-center gap-2 text-xl font-bold font-display">
                <span>
                  <span className="text-primary">ꓘ</span>
                  <span className="text-secondary">K</span>
                </span>
              </a>
              <span className="hidden sm:block text-muted-foreground">/</span>
              <span className="hidden sm:block text-sm font-medium text-muted-foreground">{title}</span>
            </div>

            <nav className="flex flex-wrap gap-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={[
                      'inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-medium transition-colors border',
                      isActive
                        ? 'bg-primary/10 text-primary border-primary/30'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border-transparent',
                    ].join(' ')}
                  >
                    {item.label}
                  </a>
                )
              })}
            </nav>
          </div>

          <h1 className="text-3xl font-bold font-display mt-5">{title}</h1>
          <p className="text-muted-foreground mt-2 max-w-3xl">{description}</p>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
