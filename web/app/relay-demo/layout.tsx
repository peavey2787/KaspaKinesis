import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Relay Demo | ꓘK Kaspa Kinesis',
  description: 'Visualize CGNAT-to-CGNAT connectivity through the Kaspa Relay system.',
}

export default function RelayDemoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
