import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  collectPublicSurfaceFiles,
  publicTextBoundaryErrors,
} from './public-surface-boundary.mjs'

const scriptPath = fileURLToPath(import.meta.url)
const appRoot = path.resolve(path.dirname(scriptPath), '..')
const repoRoot = path.resolve(appRoot, '..')
const allowMissingLock = process.argv.includes('--allow-missing-lock')
const errors = []

const expectedDependencies = {
  '@aikdna/kdna-core': '0.20.0',
  '@aikdna/kdna-react': '0.3.0',
  '@aikdna/kdna-web-client': '0.2.2',
  '@aikdna/kdna-web-server': '0.3.0',
}

function check(condition, message) {
  if (!condition) errors.push(message)
}

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')
}

function collectFiles(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (['.git', '.next', 'node_modules', 'playwright-report', 'test-results'].includes(entry.name)) continue
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) collectFiles(absolute, files)
    else files.push(absolute)
  }
  return files
}

const manifest = JSON.parse(read('app/package.json'))
check(manifest.name === 'kdna-demo-web-viewer', 'package name must identify the demo')
check(manifest.version === '0.1.1', 'package version must match the release coordinate')
check(manifest.private === true, 'demo application must not be npm-publishable')
check(manifest.engines?.node === '>=20.9.0', 'Node.js floor must match Next.js and KDNA consumers')
check(manifest.overrides?.postcss === '8.5.10', 'PostCSS security override must stay exact')

for (const [name, version] of Object.entries(expectedDependencies)) {
  check(manifest.dependencies?.[name] === version, `${name} must be exactly ${version}`)
}

for (const [name, version] of Object.entries(manifest.dependencies ?? {})) {
  check(!/^[~^*]|\bx\b/i.test(version), `${name} must use an exact dependency coordinate`)
}

const rootIgnore = read('.gitignore')
const appIgnore = read('app/.gitignore')
const license = read('LICENSE')
const notice = read('NOTICE')
check(!rootIgnore.includes('app/package-lock.json'), 'the root ignore file must not hide the lockfile')
check(!appIgnore.split(/\r?\n/).includes('package-lock.json'), 'the app ignore file must not hide the lockfile')
check(Buffer.byteLength(license) >= 11_000 && Buffer.byteLength(license) <= 12_000, 'LICENSE must contain the full Apache-2.0 text')
check(createHash('sha256').update(license).digest('hex') === '699a9bdd9d3fb95f2146586a5fb1d7a6a6197a43422914f86869fed84c34222c', 'LICENSE must match the canonical KDNA Apache-2.0 text')
for (const section of [
  'TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION',
  '1. Definitions.',
  '2. Grant of Copyright License.',
  '3. Grant of Patent License.',
  '4. Redistribution.',
  '9. Accepting Warranty or Additional Liability.',
  'END OF TERMS AND CONDITIONS',
]) {
  check(license.includes(section), `LICENSE is missing: ${section}`)
}
check(notice.includes('Copyright 2026 KDNA Authors'), 'project copyright declaration belongs in NOTICE')

const page = read('app/app/page.jsx')
const route = read('app/app/api/kdna/[...route]/route.js')
const nextConfig = read('app/next.config.mjs')
const readme = read('README.md')
const ciWorkflow = read('.github/workflows/ci.yml')
const dcoWorkflow = read('.github/workflows/dco.yml')
const releaseWorkflow = read('.github/workflows/release.yml')
check(page.includes('JSON.stringify(value, null, 2)'), 'Runtime objects must be serialized explicitly')
check(!/\{\s*(?:unlock|content|inspect)\s*\|\|/.test(page), 'raw KDNA objects must not be rendered as React children')
check(!page.includes('console.'), 'browser flow must not log public or protected response objects')
check(route.includes("export const runtime = 'nodejs'"), 'KDNA route must opt into the verified Node.js runtime')
check(nextConfig.includes("'@aikdna/kdna-core'"), 'KDNA Core must stay on the server package boundary')
check(nextConfig.includes("'@aikdna/kdna-web-server'"), 'KDNA Web Server must stay on the server package boundary')
check(readme.includes('/releases/download/0.1.1/laozi-wuwei-0.1.1.kdna'), 'README must use the current public reference asset')
check(!readme.includes('agent-project-context-v0.1.2'), 'removed historical asset URL must not return')
for (const workflow of [ciWorkflow, releaseWorkflow]) {
  check(workflow.includes('1e77e3e0d486c330fe9f9262b514ef24c859d469'), 'browser workflows must pin the exact Core fixture commit')
  check(workflow.includes('fixtures/test_protected_entry.kdna'), 'browser workflows must install the protected Core fixture')
  check(workflow.includes('KDNA_PROTECTED_DEMO_ASSET'), 'browser workflows must execute the protected fixture')
}
check(releaseWorkflow.includes('refs/heads/main:refs/remotes/origin/main'), 'release workflow must fetch authoritative main exactly')
check(dcoWorkflow.includes('name: DCO'), 'pull requests must expose the required DCO context')
check(dcoWorkflow.includes('node app/scripts/check-dco.mjs'), 'DCO workflow must run the repository-owned verifier')

const workflowRoot = path.join(repoRoot, '.github', 'workflows')
check(fs.existsSync(workflowRoot), 'workflow directory is required')
if (fs.existsSync(workflowRoot)) {
  for (const workflowPath of collectFiles(workflowRoot)) {
    const workflow = fs.readFileSync(workflowPath, 'utf8')
    for (const match of workflow.matchAll(/\buses:\s*[^@\s]+@([^\s#]+)/g)) {
      check(/^[0-9a-f]{40}$/.test(match[1]), `${path.basename(workflowPath)} has a mutable action ref: ${match[0]}`)
    }
  }
}

errors.push(...publicTextBoundaryErrors(collectPublicSurfaceFiles(repoRoot), repoRoot))

const lockPath = path.join(appRoot, 'package-lock.json')
if (!fs.existsSync(lockPath)) {
  if (!allowMissingLock) errors.push('package-lock.json is required for reproducible installation')
} else {
  const lockSource = fs.readFileSync(lockPath, 'utf8')
  const lock = JSON.parse(lockSource)
  const lockedRoot = lock.packages?.['']
  check(lockedRoot?.version === manifest.version, 'lockfile root version must match package.json')
  for (const [name, version] of Object.entries(expectedDependencies)) {
    check(lockedRoot?.dependencies?.[name] === version, `lockfile root must pin ${name}@${version}`)
    const installed = lock.packages?.[`node_modules/${name}`]
    check(installed?.version === version, `lockfile must resolve ${name}@${version}`)
    check(/^https:\/\/registry\.npmjs\.org\//.test(installed?.resolved ?? ''), `${name} must resolve from the npm registry`)
  }
  check(!/\bfile:|\/Users\/|\/home\/runner\/work\//.test(lockSource), 'lockfile must not contain local dependency coordinates')
}

if (errors.length > 0) {
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(
  fs.existsSync(lockPath)
    ? 'Public surface and registry lock checks passed'
    : 'Public source boundary checks passed; registry lock is intentionally pending',
)
