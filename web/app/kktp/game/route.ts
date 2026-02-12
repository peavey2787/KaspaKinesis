import type { NextRequest } from 'next/server'
import { serveGameFile } from './_serveGameFile'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  return serveGameFile(req, ['index.html'])
}

