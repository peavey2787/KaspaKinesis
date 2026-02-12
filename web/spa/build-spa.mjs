import { build } from 'esbuild'
import { copyFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const outDir = path.join(rootDir, 'public', 'spa')

await build({
  entryPoints: [
    path.join(rootDir, 'spa', 'vrf-demo.tsx'),
    path.join(rootDir, 'spa', 'relay-demo.tsx'),
    path.join(rootDir, 'spa', 'nist-tests.tsx'),
  ],
  outdir: outDir,
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  sourcemap: true,
  keepNames: true,
  loader: {
    '.js': 'jsx',
  },
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  alias: {
    '@': rootDir,
  },
})

const wasmSource = path.join(rootDir, 'kktp', 'engine', 'kaspa', 'kas-wasm', 'kaspa_bg.wasm')
const wasmTarget = path.join(outDir, 'kaspa_bg.wasm')
await copyFile(wasmSource, wasmTarget)
