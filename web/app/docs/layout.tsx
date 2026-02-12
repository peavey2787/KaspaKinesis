import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Documentation | ꓘK Kaspa Kinesis',
  description: 'Comprehensive documentation for Kaspa Kinesis - setup, architecture, and integration guides.',
}

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
