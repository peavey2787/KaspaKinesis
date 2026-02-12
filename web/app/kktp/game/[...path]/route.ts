import type { NextRequest } from 'next/server'
import { serveGameFile } from '../_serveGameFile'

export const runtime = 'nodejs'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return serveGameFile(req, path)
}

