import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { NextRequest } from 'next/server'

const BASE_DIR = path.resolve(process.cwd(), 'kktp')

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json; charset=utf-8',
  '.bin': 'application/octet-stream',
  '.wasm': 'application/wasm',
}

function resolveSafePath(segments: string[]) {
  const abs = path.resolve(BASE_DIR, ...segments)
  const baseWithSep = BASE_DIR.endsWith(path.sep) ? BASE_DIR : `${BASE_DIR}${path.sep}`

  // Prevent path traversal (must stay under BASE_DIR)
  if (abs !== BASE_DIR && !abs.startsWith(baseWithSep)) {
    throw new Error('Invalid path')
  }
  return abs
}

export async function serveKktpFile(_req: NextRequest, segments: string[]) {
  const requestedAbs = resolveSafePath(segments)

  let finalAbs = requestedAbs
  try {
    const st = await fs.stat(requestedAbs)
    if (st.isDirectory()) {
      finalAbs = resolveSafePath([...segments, 'index.html'])
    }
  } catch {
    // fallthrough: stat/read will 404
  }

  try {
    const data = await fs.readFile(finalAbs)
    const ext = path.extname(finalAbs).toLowerCase()
    const contentType = CONTENT_TYPES[ext] ?? 'application/octet-stream'

    return new Response(data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
      },
    })
  } catch {
    return new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  }
}

