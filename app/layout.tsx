import type { Metadata, Viewport } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'ꓘK Kaspa Kinesis — Provable Randomness meets Decentralized Networking',
  description:
    'A zero-infrastructure multiplayer engine that turns the Kaspa BlockDAG into a fair, auditable, serverless backbone for real-time games and interactive systems.',
  keywords: [
    'Kaspa',
    'BlockDAG',
    'VRF',
    'Verifiable Random Function',
    'Multiplayer',
    'Web3',
    'Gaming',
    'Decentralized',
    'Provable Randomness',
    'P2P',
    'CGNAT',
    'Serverless',
  ],
  authors: [{ name: 'Kaspa Kinesis Team' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://kaspakinesis.io',
    title: 'ꓘK Kaspa Kinesis — Provable Randomness meets Decentralized Networking',
    description:
      'A zero-infrastructure multiplayer engine that turns the Kaspa BlockDAG into a fair, auditable, serverless backbone for real-time games and interactive systems.',
    siteName: 'Kaspa Kinesis',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ꓘK Kaspa Kinesis',
    description:
      'Provable Randomness meets Decentralized Networking. Zero-infrastructure multiplayer engine powered by Kaspa BlockDAG.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  themeColor: '#00f5ff',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} font-sans min-h-screen bg-background text-foreground`}
      >
        {children}
      </body>
    </html>
  )
}
