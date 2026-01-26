#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

// Adds a header index comment to all code files so agents can orient quickly.
// Usage:
//   node scripts/add-index.js           # write indexes to default code folders
//   node scripts/add-index.js --dry-run # list files that would be updated
//   node scripts/add-index.js app lib   # limit to specific paths

const fs = require('fs').promises
const path = require('path')

const root = process.cwd()
const DEFAULT_ROOTS = ['app', 'components', 'hooks', 'lib', 'pages', 'supabase']
const IGNORE_DIRS = new Set([
  '.git',
  '.next',
  '.turbo',
  '.vercel',
  'node_modules',
  'public',
  'docs',
  '.vscode',
  '.idea',
  '.cache',
  'coverage',
])

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const customRoots = args.filter((arg) => !arg.startsWith('--'))
const searchRoots = customRoots.length > 0 ? customRoots : DEFAULT_ROOTS

function isCodeFile(filePath) {
  return ['.ts', '.tsx', '.js', '.jsx'].includes(path.extname(filePath))
}

async function walk(dir, files) {
  let entries
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch (err) {
    return files
  }

  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await walk(fullPath, files)
    } else if (entry.isFile() && isCodeFile(fullPath)) {
      files.push(fullPath)
    }
  }

  return files
}

function buildIndexLine(filePath) {
  const relative = path.relative(root, filePath).replace(/\\/g, '/')
  return `// INDEX: ${relative}`
}

async function ensureIndex(filePath) {
  const content = await fs.readFile(filePath, 'utf8')
  const lines = content.split('\n')
  const firstLine = (lines[0] || '').trim()
  const indexLine = buildIndexLine(filePath)

  if (firstLine.startsWith('// INDEX:')) return { changed: false, reason: 'present' }

  // Keep shebang on top if it exists.
  const hasShebang = firstLine.startsWith('#!')
  const newLines = hasShebang ? [lines[0], indexLine, ...lines.slice(1)] : [indexLine, ...lines]
  const nextContent = newLines.join('\n')

  if (!dryRun) {
    await fs.writeFile(filePath, nextContent, 'utf8')
  }

  return { changed: true, reason: hasShebang ? 'inserted-after-shebang' : 'inserted' }
}

async function main() {
  const allFiles = []
  for (const base of searchRoots) {
    const absolute = path.isAbsolute(base) ? base : path.join(root, base)
    await walk(absolute, allFiles)
  }

  const results = []
  for (const file of allFiles) {
    results.push({ file, ...(await ensureIndex(file)) })
  }

  const changed = results.filter((r) => r.changed)
  const skipped = results.length - changed.length
  const prefix = dryRun ? '[dry-run]' : '[write]'

  for (const r of changed) {
    console.log(`${prefix} ${r.reason.padEnd(18)} ${path.relative(root, r.file)}`)
  }
  console.log(`${prefix} updated: ${changed.length}, skipped (already indexed): ${skipped}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
/* eslint-disable @typescript-eslint/no-require-imports */
