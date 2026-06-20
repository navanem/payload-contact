// Copies CSS assets from src/ into the mirrored path under dist/.
// tsc emits only .js/.d.ts, so CSS modules must be copied separately.
// Uses Node built-ins only; works cross-platform (Windows included).
import { cp, mkdir, readdir } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const srcDir = join(root, 'src')
const distDir = join(root, 'dist')

async function collectCss(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectCss(full)))
    } else if (entry.isFile() && entry.name.endsWith('.css')) {
      files.push(full)
    }
  }
  return files
}

const cssFiles = await collectCss(srcDir)
for (const file of cssFiles) {
  const target = join(distDir, relative(srcDir, file))
  await mkdir(dirname(target), { recursive: true })
  await cp(file, target)
}

console.log(`copy-assets: copied ${cssFiles.length} CSS file(s) to dist/`)
