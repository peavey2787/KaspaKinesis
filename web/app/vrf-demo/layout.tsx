import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'VRF Demo | ꓘK Kaspa Kinesis',
  description: 'Visualize entropy extraction from Kaspa blocks using the Recursive Folding algorithm.',
}

export default function VRFDemoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
