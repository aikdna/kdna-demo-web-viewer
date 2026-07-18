import assert from 'node:assert/strict'
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
