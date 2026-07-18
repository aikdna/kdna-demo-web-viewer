import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = path.resolve(appRoot, '..')
const manifest = JSON.parse(fs.readFileSync(path.join(appRoot, 'package.json'), 'utf8'))
const changelog = fs.readFileSync(path.join(repoRoot, 'CHANGELOG.md'), 'utf8')
const tag = process.env.RELEASE_TAG

function fail(message) {
  console.error(message)
  process.exit(1)
}

if (process.env.RELEASE_EVENT_ACTION !== 'published') fail('release event must be published')
if (process.env.RELEASE_IS_DRAFT !== 'false') fail('draft releases are not accepted')
if (process.env.RELEASE_IS_PRERELEASE !== 'false') fail('prereleases are not accepted')
if (tag !== manifest.version) fail(`release tag must exactly equal ${manifest.version}`)
if (!changelog.includes(`## ${manifest.version} - `)) fail('CHANGELOG is missing the release version')

const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim()
const tagCommit = execFileSync('git', ['rev-parse', `${tag}^{commit}`], { cwd: repoRoot, encoding: 'utf8' }).trim()
if (head !== tagCommit) fail('checked-out release tag does not resolve to HEAD')

console.log(`Release context verified for ${tag} at ${head}`)
