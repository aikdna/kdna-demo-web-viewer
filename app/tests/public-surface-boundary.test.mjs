import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  collectPublicSurfaceFiles,
  publicTextBoundaryErrors,
} from '../scripts/public-surface-boundary.mjs'

test('public-surface scanning excludes ignored dependency checkouts but retains repository files', (context) => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kdna-demo-surface-'))
  context.after(() => fs.rmSync(repoRoot, { recursive: true, force: true }))

  execFileSync('git', ['init', '--quiet'], { cwd: repoRoot })
  fs.writeFileSync(path.join(repoRoot, '.gitignore'), 'public-assets/\n')
  fs.writeFileSync(path.join(repoRoot, 'visible.md'), 'public repository source\n')
  fs.mkdirSync(path.join(repoRoot, 'public-assets'), { recursive: true })
  fs.writeFileSync(path.join(repoRoot, 'public-assets', 'dependency-script.mjs'), 'dependency checkout\n')

  const relative = collectPublicSurfaceFiles(repoRoot)
    .map((absolute) => path.relative(repoRoot, absolute))
    .sort()

  assert.deepEqual(relative, ['.gitignore', 'visible.md'])
})

test('public-surface scanning still rejects a machine-local path in this repository', (context) => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kdna-demo-surface-'))
  context.after(() => fs.rmSync(repoRoot, { recursive: true, force: true }))

  execFileSync('git', ['init', '--quiet'], { cwd: repoRoot })
  const machinePath = ['', 'Users', 'example', 'private-file'].join('/')
  fs.writeFileSync(path.join(repoRoot, 'visible.md'), `${machinePath}\n`)
  fs.mkdirSync(path.join(repoRoot, 'public-assets'), { recursive: true })
  fs.writeFileSync(path.join(repoRoot, '.gitignore'), 'public-assets/\n')
  fs.writeFileSync(path.join(repoRoot, 'public-assets', 'dependency-script.mjs'), `${machinePath}\n`)

  const errors = publicTextBoundaryErrors(collectPublicSurfaceFiles(repoRoot), repoRoot)
  assert.deepEqual(errors, ['visible.md exposes a machine-local path'])
})
