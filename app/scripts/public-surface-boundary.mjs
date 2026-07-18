import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const textExtensions = new Set(['.css', '.example', '.js', '.jsx', '.json', '.md', '.mjs', '.yml', '.yaml'])

export function collectPublicSurfaceFiles(repoRoot) {
  const output = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    { cwd: repoRoot, encoding: 'utf8' },
  )

  return output
    .split('\0')
    .filter(Boolean)
    .map((relative) => path.join(repoRoot, relative))
}

export function publicTextBoundaryErrors(files, repoRoot) {
  const errors = []

  for (const absolute of files) {
    if (!textExtensions.has(path.extname(absolute))) continue
    const relative = path.relative(repoRoot, absolute)
    const source = fs.readFileSync(absolute, 'utf8')
    if (/\/Users\/|\/home\/runner\/work\/|[A-Za-z]:\\Users\\/.test(source)) {
      errors.push(`${relative} exposes a machine-local path`)
    }
    if (/\bKDNA[A-Za-z0-9_.-]*[-_.]?[vV][0-9]+\b/.test(source)) {
      errors.push(`${relative} contains a KDNA-owned generation label`)
    }
  }

  return errors
}
