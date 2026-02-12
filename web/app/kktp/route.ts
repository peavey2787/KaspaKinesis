import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'

export async function GET(_req: NextRequest) {
  return new Response('OK', {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

