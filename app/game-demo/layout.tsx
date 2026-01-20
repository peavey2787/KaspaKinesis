import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Game Demo | ꓘK Kaspa Kinesis',
  description: 'Try the Toy Grid Game demo - a turn-based game demonstrating provable randomness and deterministic state.',
}

export default function GameDemoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
