import type { NextRequest } from 'next/server'
import { serveKktpFile } from '../_serveKktpFile'

export const runtime = 'nodejs'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return serveKktpFile(req, path)
}

