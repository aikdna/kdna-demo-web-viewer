import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = path.resolve(appRoot, '..')

test('the page serializes structured Runtime context', () => {
  const source = fs.readFileSync(path.join(appRoot, 'app', 'page.jsx'), 'utf8')
  assert.match(source, /JSON\.stringify\(value, null, 2\)/)
  assert.ok(source.indexOf('if (visibleContent)') < source.indexOf("if (status === 'locked')"))
  assert.doesNotMatch(source, /\{\s*(?:unlock|content|inspect)\s*\|\|/)
  assert.doesNotMatch(source, /console\./)
})

test('the server route is fixed to the verified Node.js runtime', () => {
  const source = fs.readFileSync(path.join(appRoot, 'app', 'api', 'kdna', '[...route]', 'route.js'), 'utf8')
  const config = fs.readFileSync(path.join(appRoot, 'next.config.mjs'), 'utf8')
  assert.match(source, /export const runtime = 'nodejs'/)
  assert.match(source, /createNextHandlers/)
  assert.match(config, /serverExternalPackages/)
  assert.match(config, /'@aikdna\/kdna-core'/)
  assert.match(config, /'@aikdna\/kdna-web-server'/)
})

test('the public narrative points to the current reference asset', () => {
  const readme = fs.readFileSync(path.join(repoRoot, 'README.md'), 'utf8')
  assert.match(readme, /releases\/download\/0\.1\.1\/laozi-wuwei-0\.1\.1\.kdna/)
  assert.doesNotMatch(readme, /agent-project-context-v0\.1\.2/)
})

test('the license is the canonical complete Apache-2.0 text', () => {
  const license = fs.readFileSync(path.join(repoRoot, 'LICENSE'), 'utf8')
  const notice = fs.readFileSync(path.join(repoRoot, 'NOTICE'), 'utf8')
  assert.ok(Buffer.byteLength(license) >= 11_000)
  assert.equal(
    createHash('sha256').update(license).digest('hex'),
    '699a9bdd9d3fb95f2146586a5fb1d7a6a6197a43422914f86869fed84c34222c',
  )
  assert.match(license, /3\. Grant of Patent License\./)
  assert.match(license, /END OF TERMS AND CONDITIONS/)
  assert.match(notice, /Copyright 2026 KDNA Authors/)
})

test('CI and release pin both public and protected browser assets', () => {
  for (const workflow of ['ci.yml', 'release.yml']) {
    const source = fs.readFileSync(path.join(repoRoot, '.github', 'workflows', workflow), 'utf8')
    assert.match(source, /1e77e3e0d486c330fe9f9262b514ef24c859d469/)
    assert.match(source, /fixtures\/test_protected_entry\.kdna/)
    assert.match(source, /KDNA_PROTECTED_DEMO_ASSET/)
  }

  const release = fs.readFileSync(path.join(repoRoot, '.github', 'workflows', 'release.yml'), 'utf8')
  assert.match(release, /refs\/heads\/main:refs\/remotes\/origin\/main/)
})
