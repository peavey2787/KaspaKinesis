'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  Home, Gamepad2, Shuffle, Radio, TestTube, BookOpen,
  ChevronLeft, Menu, X
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/game-demo', label: 'Game Demo', icon: Gamepad2 },
  { href: '/vrf-demo', label: 'VRF Demo', icon: Shuffle },
  { href: '/relay-demo', label: 'Relay Demo', icon: Radio },
  { href: '/nist-tests', label: 'NIST Tests', icon: TestTube },
  { href: '/docs', label: 'Documentation', icon: BookOpen },
]

interface SubAppLayoutProps {
  children: React.ReactNode
  title: string
  description: string
  accentColor?: string
}

export function SubAppLayout({ children, title, description, accentColor = 'primary' }: SubAppLayoutProps) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="flex items-center justify-between h-16 px-4 lg:px-6">
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 text-muted-foreground hover:text-foreground"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Title */}
          <div className="flex items-center gap-3">
            <Link href="/" className="text-2xl font-bold font-display gradient-text">
              ꓘK
            </Link>
            <span className="hidden sm:block text-muted-foreground">/</span>
            <h1 className="hidden sm:block text-lg font-semibold text-foreground">{title}</h1>
          </div>

          {/* Back to home */}
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Home</span>
          </Link>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:flex w-64 flex-col fixed left-0 top-16 bottom-0 border-r border-border/50 bg-card/50">
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary border border-primary/30'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
          </motion.div>
        )}

        {/* Mobile sidebar */}
        <motion.aside
          initial={{ x: '-100%' }}
          animate={{ x: sidebarOpen ? 0 : '-100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed left-0 top-0 bottom-0 w-72 z-50 lg:hidden glass border-r border-border/50"
        >
          <div className="flex items-center justify-between h-16 px-4 border-b border-border/50">
            <span className="text-xl font-bold font-display gradient-text">ꓘK</span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary border border-primary/30'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </motion.aside>

        {/* Main content */}
        <main className="flex-1 lg:ml-64">
          {/* Page header */}
          <div className="border-b border-border/50 bg-gradient-to-r from-card/50 to-transparent">
            <div className="px-4 lg:px-8 py-8">
              <h2 className="text-2xl lg:text-3xl font-bold font-display mb-2">{title}</h2>
              <p className="text-muted-foreground max-w-2xl">{description}</p>
            </div>
          </div>

          {/* Page content */}
          <div className="p-4 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
