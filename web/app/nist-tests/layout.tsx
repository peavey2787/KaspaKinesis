import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'NIST Tests | ꓘK Kaspa Kinesis',
  description: 'Run NIST SP 800-22 statistical tests on generated entropy to verify randomness quality.',
}

export default function NISTTestsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
