#!/usr/bin/env node
// Public-surface gate for the reference demo.
//
// The demo ships two dependency graphs and no registry-installed KDNA package:
// the browser/Next graph in `app/` and the loopback Host graph in `app/host/`.
// Every KDNA package, and every archive the Host graph needs to resolve its
// vendored KDNA packages, is an immutable relative `vendor/` input. This gate
// therefore locks the *bytes* of each reviewed archive (sha256) and the exact
// coordinate each graph and lockfile must use, instead of asserting that the
// packages came from the npm registry.
//
// It deliberately replaces two weaker registry-era checks:
//   * "each KDNA package must resolve from registry.npmjs.org" now becomes
//     "each KDNA package must resolve from its reviewed vendored archive and
//     must NOT resolve from a registry URL"; and
//   * "the lockfile must not contain local dependency coordinates" now becomes
//     "every local (`file:`) coordinate in either lockfile must be one of the
//     reviewed vendored archives" - the net, not the absence.
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  collectPublicSurfaceFiles,
  publicTextBoundaryErrors,
} from './public-surface-boundary.mjs'

const publicApiNames = ['useKDNARead', 'KDNAFileInput', 'KDNAReadStatus', 'KDNAReadView']

/**
 * The complete review list of relative vendor archives. `sha256` locks the
 * archive bytes themselves, so a republished or swapped archive is refused even
 * when its file name and the lockfile integrity were updated together.
 *
 * `declared: true` marks an archive the graph's own package.json must name;
 * `declared: false` marks an archive only the committed lockfile resolves (the
 * vendored KDNA packages' own transitive graph).
 */
export const VENDORED_ARCHIVES = Object.freeze([
  { graph: 'app', declared: true, name: '@aikdna/kdna-core', version: '0.24.0-rc.component-semantics.2', file: 'aikdna-kdna-core-0.24.0-rc.component-semantics.2.tgz', sha256: 'a9cb3f08735b00657e4848766f0ac517abdcb256121a841f01e662525a0858ea' },
  { graph: 'app', declared: true, name: '@aikdna/kdna-read', version: '0.3.0-rc.component-semantics.2', file: 'aikdna-kdna-read-0.3.0-rc.component-semantics.2.tgz', sha256: '43d0f12a1a63a88d26570bfff821919a5cd478fdbd0568bd9c819bc56078b0f0' },
  { graph: 'app', declared: true, name: '@aikdna/kdna-web-client', version: '0.5.0-rc.component-semantics.1', file: 'aikdna-kdna-web-client-0.5.0-rc.component-semantics.1.tgz', sha256: '1a9d90fbdfab35b249da0db16fe7c1099a1b2c3443c02b737461416397367658' },
  { graph: 'app', declared: true, name: '@aikdna/kdna-react', version: '0.6.0-rc.component-semantics.1', file: 'aikdna-kdna-react-0.6.0-rc.component-semantics.1.tgz', sha256: '388f182f81dc26e84e4ff6988ff456cdabc5e9fcee20d55b01e4d8996024bcf4' },
  { graph: 'host', declared: true, name: '@aikdna/kdna-core', version: '0.24.0-rc.component-semantics.2', file: 'aikdna-kdna-core-0.24.0-rc.component-semantics.2.tgz', sha256: 'a9cb3f08735b00657e4848766f0ac517abdcb256121a841f01e662525a0858ea' },
  { graph: 'host', declared: true, name: '@aikdna/kdna-read', version: '0.3.0-rc.component-semantics.2', file: 'aikdna-kdna-read-0.3.0-rc.component-semantics.2.tgz', sha256: '43d0f12a1a63a88d26570bfff821919a5cd478fdbd0568bd9c819bc56078b0f0' },
  { graph: 'host', declared: true, name: '@aikdna/kdna-web-server', version: '0.5.0-rc.component-semantics.1', file: 'aikdna-kdna-web-server-0.5.0-rc.component-semantics.1.tgz', sha256: '4057a84b76d173470c59f95dc0e73af81aa21d36876f6daf4226c1ceaefc7551' },
  { graph: 'host', declared: false, name: 'ajv', version: '8.20.0', file: 'ajv-8.20.0.tgz', sha256: 'b2f0b3a893bbb8cc5efb6814f08b1499e19e31d5dd73683f5893382f48f6e7b3' },
  { graph: 'host', declared: false, name: 'ajv-formats', version: '3.0.1', file: 'ajv-formats-3.0.1.tgz', sha256: 'f4d6980fd367381fd29199066911e863db8d97496613b6c2c5b91563a150acc5' },
  { graph: 'host', declared: false, name: 'cbor-x', version: '1.6.5', file: 'cbor-x-1.6.5.tgz', sha256: 'df4aff92df3114e92876c55d1385582c5076aa978a3827cbfc335ed4ae5ad326' },
  { graph: 'host', declared: false, name: 'fast-deep-equal', version: '3.1.3', file: 'fast-deep-equal-3.1.3.tgz', sha256: 'b019a0980f27638dc3f85836b0e478f188e00d7a6e5852c0819fa86f56e47b8f' },
  { graph: 'host', declared: false, name: 'fast-uri', version: '3.1.7', file: 'fast-uri-3.1.7.tgz', sha256: '3fa380284be4ecbf471c1dbb8c5da6f517c95f54279f88c2037985d03fdc6d92' },
  { graph: 'host', declared: false, name: 'json-schema-traverse', version: '1.0.0', file: 'json-schema-traverse-1.0.0.tgz', sha256: '023222622df29fc274bde5d3590e47aa1d4a8e3c1d6e2aba029948ed79799b21' },
  { graph: 'host', declared: false, name: '@noble/hashes', version: '1.8.0', file: 'noble-hashes-1.8.0.tgz', sha256: 'e8a765d92c04faaccba8776411c5038cb195f812ee629fce07e1d2e6aec80ea0' },
  { graph: 'host', declared: false, name: 'pako', version: '2.1.0', file: 'pako-2.1.0.tgz', sha256: '49fedc8866b4abfc8e71dc7fe75ad4ef1ff1ac9601b0642cff88ee5bf2338709' },
  { graph: 'host', declared: false, name: 'require-from-string', version: '2.0.2', file: 'require-from-string-2.0.2.tgz', sha256: 'cb694a4965908f7775a0c757f00cf4e624d193cd71d77988fbcca0f597b88d82' },
])

const canonicalLicenseSha256 = '699a9bdd9d3fb95f2146586a5fb1d7a6a6197a43422914f86869fed84c34222c'

function sha256Hex(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

function integrityOf(bytes) {
  return `sha512-${createHash('sha512').update(bytes).digest('base64')}`
}

function vendorRoot(appRoot, graph) {
  return path.join(appRoot, graph === 'host' ? 'host' : '', 'vendor')
}

function coordinateOf(entry) {
  return `file:vendor/${entry.file}`
}

/**
 * Pure assertion over the parsed public manifests and lockfiles. Every input is
 * injectable so a hostile suite can drive mutated copies through exactly the
 * same code path the repository's own gate runs.
 *
 * @returns {string[]} every violation found, in review order.
 */
export function publicSurfaceErrors({
  repoRoot,
  appRoot,
  manifest,
  hostManifest,
  lock = null,
  hostLock = null,
  lockPresent = true,
  readText = (absolute) => fs.readFileSync(absolute, 'utf8'),
  readBytes = (absolute) => fs.readFileSync(absolute),
  publicFiles = null,
}) {
  const errors = []
  const check = (condition, message) => { if (!condition) errors.push(message) }
  const read = (relative) => readText(path.join(repoRoot, relative))

  // 1. Application identity and framework coordinate.
  check(manifest.name === 'kdna-demo-web-viewer', 'package name must identify the demo')
  check(manifest.version === '0.1.2', 'package version must match the release coordinate')
  check(manifest.private === true, 'demo application must not be npm-publishable')
  check(manifest.engines?.node === '>=22', 'Node.js floor must match Next.js and KDNA consumers')
  check(manifest.dependencies?.next === '16.3.5', 'next must be exactly 16.3.5')
  check(manifest.overrides?.postcss === '8.5.23', 'PostCSS security override must stay exact')
  check(manifest.overrides?.sharp === '0.35.4', 'sharp security override must stay exact')
  for (const [name, version] of Object.entries(manifest.dependencies ?? {})) {
    check(!/^[~^*]|\bx\b/i.test(version), `${name} must use an exact dependency coordinate`)
  }
  for (const [graph, graphManifest] of [['app', manifest], ['host', hostManifest]]) {
    const reviewedNames = new Set(VENDORED_ARCHIVES
      .filter((candidate) => candidate.graph === graph)
      .map((candidate) => candidate.name))
    for (const name of Object.keys(graphManifest.dependencies ?? {})) {
      if (!name.startsWith('@aikdna/')) continue
      check(
        reviewedNames.has(name),
        `${graph} graph: manifest declares an unreviewed @aikdna package: ${name}`,
      )
    }
  }

  // 2. Every reviewed archive: exact coordinate, locked bytes, locked version.
  const archiveBytes = new Map()
  for (const entry of VENDORED_ARCHIVES) {
    const graphManifest = entry.graph === 'host' ? hostManifest : manifest
    const expected = coordinateOf(entry)
    if (entry.declared) {
      check(
        graphManifest.dependencies?.[entry.name] === expected,
        `${entry.graph} graph: ${entry.name} must be exactly ${expected}`,
      )
    } else {
      check(
        graphManifest.dependencies?.[entry.name] === undefined,
        `${entry.graph} graph: transitive archive ${entry.name} must not be declared as a direct dependency`,
      )
    }
    const absolute = path.join(vendorRoot(appRoot, entry.graph), entry.file)
    let bytes = null
    try {
      bytes = readBytes(absolute)
    } catch {
      errors.push(`${entry.graph} graph: vendored archive is missing: vendor/${entry.file}`)
      continue
    }
    archiveBytes.set(`${entry.graph}:${entry.file}`, bytes)
    check(
      sha256Hex(bytes) === entry.sha256,
      `${entry.graph} graph: vendor/${entry.file} does not match its reviewed sha256`,
    )
  }

  // 3. Lockfiles: root pin, resolution, version, byte-bound integrity, and the
  //    net of every local coordinate. The net is per graph: a coordinate that is
  //    reviewed for one graph is still unreviewed for the other, and every
  //    `@aikdna/*` package a graph carries has to be one this review list names.
  for (const [graph, graphLock] of lockPresent ? [['app', lock], ['host', hostLock]] : []) {
    if (!graphLock) { errors.push(`${graph} graph: package-lock.json is required for reproducible installation`); continue }
    const reviewedForGraph = VENDORED_ARCHIVES.filter((candidate) => candidate.graph === graph)
    const reviewedCoordinates = new Set(reviewedForGraph.map(coordinateOf))
    const reviewedNames = new Set(reviewedForGraph.map((candidate) => candidate.name))
    check(
      graphLock.packages?.['']?.version === (graph === 'host' ? '0.0.0' : manifest.version),
      `${graph} graph: lockfile root version must match its manifest`,
    )
    const localCoordinates = new Set()
    for (const [entryPath, installed] of Object.entries(graphLock.packages ?? {})) {
      if (entryPath !== '' && typeof installed?.resolved === 'string' && installed.resolved.startsWith('file:')) {
        localCoordinates.add(installed.resolved)
      }
      const scoped = /(?:^|\/)node_modules\/(@aikdna\/[^/]+)$/u.exec(entryPath)
      if (!scoped) continue
      check(
        reviewedNames.has(scoped[1]),
        `${graph} graph: unreviewed @aikdna package in the lockfile: ${scoped[1]}`,
      )
      check(
        !/^https:\/\/registry\.npmjs\.org\//.test(installed?.resolved ?? ''),
        `${graph} graph: ${scoped[1]} must not resolve from a registry URL`,
      )
    }
    for (const [name, value] of Object.entries(graphLock.packages?.['']?.dependencies ?? {})) {
      if (typeof value === 'string' && value.startsWith('file:')) localCoordinates.add(value)
      if (!name.startsWith('@aikdna/')) continue
      check(
        reviewedNames.has(name),
        `${graph} graph: unreviewed @aikdna dependency in the lockfile root: ${name}`,
      )
    }
    for (const coordinate of localCoordinates) {
      check(
        reviewedCoordinates.has(coordinate),
        `${graph} graph: lockfile contains an unreviewed local dependency coordinate: ${coordinate}`,
      )
    }
    for (const entry of VENDORED_ARCHIVES.filter((candidate) => candidate.graph === graph)) {
      const expected = coordinateOf(entry)
      if (entry.declared) {
        check(
          graphLock.packages?.['']?.dependencies?.[entry.name] === expected,
          `${graph} graph: lockfile root must pin ${entry.name} to ${expected}`,
        )
      }
      const installed = graphLock.packages?.[`node_modules/${entry.name}`]
      check(
        installed?.resolved === expected,
        `${graph} graph: lockfile must resolve ${entry.name} to ${expected}`,
      )
      check(
        installed?.version === entry.version,
        `${graph} graph: lockfile must lock ${entry.name} at version ${entry.version}`,
      )
      const bytes = archiveBytes.get(`${graph}:${entry.file}`)
      if (bytes) {
        check(
          installed?.integrity === integrityOf(bytes),
          `${graph} graph: lockfile integrity for ${entry.name} must match vendor/${entry.file} bytes`,
        )
      }
    }
    const lockSource = JSON.stringify(graphLock)
    check(
      !/\bfile:(?!vendor\/)/.test(lockSource),
      `${graph} graph: lockfile must not contain a non-vendor local dependency coordinate`,
    )
  }

  // 4. Graph boundary: the browser must not carry the Host, and the Host must.
  check(
    manifest.dependencies?.['@aikdna/kdna-web-server'] === undefined,
    'the browser graph must not depend on @aikdna/kdna-web-server',
  )
  check(
    typeof hostManifest.dependencies?.['@aikdna/kdna-web-server'] === 'string',
    'the host graph must depend on @aikdna/kdna-web-server',
  )
  for (const route of ['app/app/api/kdna/[...route]/route.js', 'app/app/api/demo-context/route.js']) {
    check(
      !/from ['"]@aikdna\/kdna-web-server/.test(read(route)),
      `${route} must not import the Host package`,
    )
  }

  // 5. The page renders only the public Read components and never a raw object.
  const page = read('app/app/page.jsx')
  for (const api of publicApiNames) check(page.includes(api), `the page must use ${api}`)
  check(!page.includes('dangerouslySetInnerHTML'), 'the page must not inject raw HTML')
  check(!/\{\s*(?:unlock|content|inspect)\s*\|\|/.test(page), 'raw KDNA objects must not be rendered as React children')
  check(!page.includes('payload.kdnab'), 'the page must not reference raw payload entries')
  check(!page.includes('console.'), 'browser flow must not log public or protected response objects')
  // The retired page rendered a Runtime object and had to serialize it explicitly. The
  // current page renders the remote result only through the public view components, so the
  // surviving invariant is that the sole serialization is the bounded request body: no
  // unnamed second serialization may appear, and the request body may not lose its own.
  const serializations = page.match(/JSON\.stringify\(/gu) ?? []
  check(
    serializations.length === 1,
    `the page must serialize exactly one value (the request body); found ${serializations.length}`,
  )
  check(
    /body:\s*JSON\.stringify\(/u.test(page),
    'the page must serialize its request body explicitly',
  )

  // 6. Public narrative: the current local-file contract, with no asset download.
  const readme = read('README.md')
  const contributing = read('CONTRIBUTING.md')
  check(!readme.includes('releases/download/'), 'README must not point at a downloadable asset')
  check(!readme.includes('kdna-work-releases'), 'README must not reference the retired asset download host')
  check(!readme.includes('agent-project-context-v0.1.2'), 'removed historical asset URL must not return')
  check(readme.includes('Node.js 22 or newer'), 'README must declare the Node.js 22 floor that matches the package engine')
  check(readme.includes('Offline install boundary'), 'README must state the offline install boundary of the two graphs')
  check(contributing.includes('Node.js 22 or newer'), 'CONTRIBUTING must declare the Node.js 22 floor that matches the package engine')
  for (const entry of VENDORED_ARCHIVES.filter(candidate => candidate.declared)) {
    check(readme.includes(`| \`${entry.name}\` | \`${entry.version}\` |`), `README must document the current ${entry.name} coordinate ${entry.version}`)
  }
  check(!/KDNA_(?:PROTECTED_)?DEMO_ASSET/u.test(contributing), 'CONTRIBUTING must not require unused external fixture inputs')

  // 7. Licence, notice, workflows and immutable action references.
  const license = read('LICENSE')
  const notice = read('NOTICE')
  const rootIgnore = read('.gitignore')
  const appIgnore = read('app/.gitignore')
  check(!rootIgnore.includes('app/package-lock.json'), 'the root ignore file must not hide the lockfile')
  check(!appIgnore.split(/\r?\n/).includes('package-lock.json'), 'the app ignore file must not hide the lockfile')
  check(Buffer.byteLength(license) >= 11_000 && Buffer.byteLength(license) <= 12_000, 'LICENSE must contain the full Apache-2.0 text')
  check(sha256Hex(license) === canonicalLicenseSha256, 'LICENSE must match the canonical KDNA Apache-2.0 text')
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

  const ciWorkflow = read('.github/workflows/ci.yml')
  const dcoWorkflow = read('.github/workflows/dco.yml')
  const releaseWorkflow = read('.github/workflows/release.yml')
  check(routeUsesNodeRuntime(read('app/app/api/kdna/[...route]/route.js')), 'KDNA route must opt into the verified Node.js runtime')
  // Browser jobs must install both configured engines and the loopback Host,
  // then run the complete suite. Old external asset variables had no consumer.
  check(manifest.scripts?.['test:e2e'] === 'playwright test', 'test:e2e must execute the complete Playwright suite without project filters or list-only flags')
  check(manifest.scripts?.ci === 'npm run test && npm run public:check && npm run audit:production && npm run build && npm run test:e2e', 'ci must execute every source, public, audit, build and browser gate')
  for (const [label, workflow, job, entry] of [
    ['CI', ciWorkflow, 'browser-integration', 'npm run test:e2e'],
    ['release', releaseWorkflow, 'verify', 'npm run ci'],
  ]) {
    const header = `  ${job}:\n`
    const start = workflow.indexOf(header)
    const body = start < 0 ? '' : workflow.slice(start + header.length).split(/\n  [a-zA-Z0-9_-]+:\r?\n/u)[0]
    const commands = [...body.matchAll(/^\s*(?:-\s+)?run:\s+([^\r\n]+)$/gmu)].map(match => match[1].trim())
    const host = commands.indexOf('npm --prefix host ci --ignore-scripts --no-audit --no-fund')
    const browsers = commands.indexOf('npx playwright install --with-deps chrome webkit')
    const suite = commands.indexOf(entry)
    check(host >= 0, `${label} browser job must install the loopback Host graph`)
    check(browsers >= 0, `${label} browser job must install Chrome and WebKit with system dependencies`)
    check(suite >= 0, `${label} browser job must run the complete ${entry} entry without filters`)
    check(host >= 0 && browsers >= 0 && suite > host && suite > browsers, `${label} browser prerequisites must precede the complete suite`)
    check(!/KDNA_(?:PROTECTED_)?DEMO_ASSET/u.test(body), `${label} browser job must not claim unused external fixture inputs`)
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

  // 8. Private or machine-local material anywhere on the public surface.
  errors.push(...publicTextBoundaryErrors(
    publicFiles ?? collectPublicSurfaceFiles(repoRoot),
    repoRoot,
  ))

  return errors
}

function routeUsesNodeRuntime(source) {
  return source.includes("export const runtime = 'nodejs'")
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

function isDirectInvocation() {
  if (!process.argv[1]) return false
  try {
    return fs.realpathSync(path.resolve(process.argv[1]))
      === fs.realpathSync(fileURLToPath(import.meta.url))
  } catch {
    return false
  }
}

if (isDirectInvocation()) {
  const scriptPath = fileURLToPath(import.meta.url)
  const appRoot = path.resolve(path.dirname(scriptPath), '..')
  const repoRoot = path.resolve(appRoot, '..')
  const allowMissingLock = process.argv.includes('--allow-missing-lock')
  const lockPath = path.join(appRoot, 'package-lock.json')
  const hostLockPath = path.join(appRoot, 'host', 'package-lock.json')
  const readJson = (absolute) => JSON.parse(fs.readFileSync(absolute, 'utf8'))

  const lockExists = fs.existsSync(lockPath)
  const hostLockExists = fs.existsSync(hostLockPath)
  const errors = publicSurfaceErrors({
    repoRoot,
    appRoot,
    manifest: readJson(path.join(appRoot, 'package.json')),
    hostManifest: readJson(path.join(appRoot, 'host', 'package.json')),
    lock: lockExists ? readJson(lockPath) : null,
    hostLock: hostLockExists ? readJson(hostLockPath) : null,
    lockPresent: allowMissingLock ? lockExists && hostLockExists : true,
  })

  if (errors.length > 0) {
    for (const error of errors) console.error(`- ${error}`)
    process.exit(1)
  }

  console.log(
    lockExists && hostLockExists
      ? 'Public surface, two graph boundaries, vendored archive locks and registry lock checks passed'
      : 'Public source boundary checks passed; registry lock is intentionally pending',
  )
}
