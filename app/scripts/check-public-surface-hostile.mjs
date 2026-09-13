#!/usr/bin/env node
// Hostile counter-suite for the public-surface gate.
//
// The gate's value is that each of its judgements is falsifiable: a mutation a
// plausible change could really introduce has to be refused, through the very
// code path the repository's own `public:check` runs. Every case below mutates
// an in-memory copy of the parsed manifests/lockfiles or of one read callback,
// then requires `publicSurfaceErrors` to report the matching violation.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { publicSurfaceErrors } from './check-public-surface.mjs'

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = path.resolve(appRoot, '..')
const readJson = (absolute) => JSON.parse(fs.readFileSync(absolute, 'utf8'))
const readBytes = (absolute) => fs.readFileSync(absolute)
const readText = (absolute) => fs.readFileSync(absolute, 'utf8')

const pristine = {
  repoRoot,
  appRoot,
  manifest: readJson(path.join(appRoot, 'package.json')),
  hostManifest: readJson(path.join(appRoot, 'host', 'package.json')),
  lock: readJson(path.join(appRoot, 'package-lock.json')),
  hostLock: readJson(path.join(appRoot, 'host', 'package-lock.json')),
  lockPresent: true,
  readText,
  readBytes,
}

const clean = publicSurfaceErrors(pristine)
assert.deepEqual(clean, [], `the pristine public surface must pass, got:\n${clean.join('\n')}`)

function candidate(overrides = {}) {
  return {
    ...pristine,
    manifest: structuredClone(pristine.manifest),
    hostManifest: structuredClone(pristine.hostManifest),
    lock: structuredClone(pristine.lock),
    hostLock: structuredClone(pristine.hostLock),
    ...overrides,
  }
}

const registryUrl = 'https://registry.npmjs.org/@aikdna/kdna-react/-/kdna-react-0.6.0-rc.component-semantics.1.tgz'

const mutations = new Map([
  ['a KDNA package coordinate is renamed', {
    expected: /@aikdna\/kdna-core must be exactly file:vendor\//u,
    mutate: () => {
      const state = candidate()
      state.manifest.dependencies['@aikdna/kdna-core'] = 'file:vendor/aikdna-kdna-core-0.24.0-rc.component-semantics.3.tgz'
      return state
    },
  }],
  ['a lockfile integrity is tampered with', {
    expected: /lockfile integrity for @aikdna\/kdna-core must match vendor\//u,
    mutate: () => {
      const state = candidate()
      state.lock.packages['node_modules/@aikdna/kdna-core'].integrity = `sha512-${'A'.repeat(86)}==`
      return state
    },
  }],
  ['a KDNA package is pointed at a registry URL in the lockfile', {
    expected: /@aikdna\/kdna-web-client must not resolve from a registry URL/u,
    mutate: () => {
      const state = candidate()
      state.lock.packages['node_modules/@aikdna/kdna-web-client'].resolved = registryUrl
      return state
    },
  }],
  ['a registry coordinate is mixed into the browser manifest', {
    expected: /@aikdna\/kdna-react must be exactly file:vendor\//u,
    mutate: () => {
      const state = candidate()
      state.manifest.dependencies['@aikdna/kdna-react'] = registryUrl
      return state
    },
  }],
  ['a vendored archive is swapped for different bytes', {
    expected: /vendor\/aikdna-kdna-read-0\.3\.0-rc\.component-semantics\.2\.tgz does not match its reviewed sha256/u,
    mutate: () => candidate({
      readBytes: (absolute) => (absolute.endsWith('/vendor/aikdna-kdna-read-0.3.0-rc.component-semantics.2.tgz')
        ? Buffer.concat([readBytes(absolute), Buffer.from('tampered')])
        : readBytes(absolute)),
    }),
  }],
  ['an unreviewed local coordinate enters the lockfile', {
    expected: /lockfile contains an unreviewed local dependency coordinate: file:vendor\/unreviewed-1\.0\.0\.tgz/u,
    mutate: () => {
      const state = candidate()
      state.lock.packages['node_modules/unreviewed'] = { version: '1.0.0', resolved: 'file:vendor/unreviewed-1.0.0.tgz' }
      return state
    },
  }],
  // The coordinate net is per graph: a coordinate that is reviewed for the Host is still
  // unreviewed for the browser, and the other way round.
  ['a Host coordinate appears in the browser lockfile', {
    expected: /app graph: lockfile contains an unreviewed local dependency coordinate: file:vendor\/aikdna-kdna-web-server/u,
    mutate: () => {
      const state = candidate()
      state.lock.packages['node_modules/@aikdna/kdna-web-server'] = {
        version: '0.5.0-rc.component-semantics.1',
        resolved: 'file:vendor/aikdna-kdna-web-server-0.5.0-rc.component-semantics.1.tgz',
      }
      return state
    },
  }],
  ['a Host coordinate enters the browser lockfile root', {
    expected: /app graph: lockfile contains an unreviewed local dependency coordinate: file:vendor\/aikdna-kdna-web-server/u,
    mutate: () => {
      const state = candidate()
      state.lock.packages[''].dependencies['@aikdna/kdna-web-server'] = 'file:vendor/aikdna-kdna-web-server-0.5.0-rc.component-semantics.1.tgz'
      return state
    },
  }],
  ['a browser coordinate appears in the Host lockfile', {
    expected: /host graph: lockfile contains an unreviewed local dependency coordinate: file:vendor\/aikdna-kdna-react/u,
    mutate: () => {
      const state = candidate()
      state.hostLock.packages['node_modules/@aikdna/kdna-react'] = {
        version: '0.6.0-rc.component-semantics.1',
        resolved: 'file:vendor/aikdna-kdna-react-0.6.0-rc.component-semantics.1.tgz',
      }
      return state
    },
  }],
  ['an unreviewed @aikdna package resolves from the registry', {
    expected: /app graph: unreviewed @aikdna package in the lockfile: @aikdna\/kdna-new/u,
    mutate: () => {
      const state = candidate()
      state.lock.packages['node_modules/@aikdna/kdna-new'] = {
        version: '1.0.0',
        resolved: 'https://registry.npmjs.org/@aikdna/kdna-new/-/kdna-new-1.0.0.tgz',
      }
      return state
    },
  }],
  ['the browser manifest declares an unreviewed @aikdna package', {
    expected: /app graph: manifest declares an unreviewed @aikdna package: @aikdna\/kdna-new/u,
    mutate: () => {
      const state = candidate()
      state.manifest.dependencies['@aikdna/kdna-new'] = '1.0.0'
      return state
    },
  }],
  ['the host graph loses the Host package', {
    expected: /the host graph must depend on @aikdna\/kdna-web-server/u,
    mutate: () => {
      const state = candidate()
      delete state.hostManifest.dependencies['@aikdna/kdna-web-server']
      return state
    },
  }],
  ['the browser graph gains the Host package', {
    expected: /the browser graph must not depend on @aikdna\/kdna-web-server/u,
    mutate: () => {
      const state = candidate()
      state.manifest.dependencies['@aikdna/kdna-web-server'] = 'file:vendor/aikdna-kdna-web-server-0.5.0-rc.component-semantics.1.tgz'
      return state
    },
  }],
  ['the README points at a downloadable asset again', {
    expected: /README must not point at a downloadable asset/u,
    mutate: () => candidate({
      readText: (absolute) => (absolute === path.join(repoRoot, 'README.md')
        ? `${readText(absolute)}\n[asset](https://github.com/aikdna/kdna-work-releases/releases/download/0.1.1/laozi-wuwei-0.1.1.kdna)\n`
        : readText(absolute)),
    }),
  }],
  ['the README references the retired asset download host', {
    expected: /README must not reference the retired asset download host/u,
    mutate: () => candidate({
      readText: (absolute) => (absolute === path.join(repoRoot, 'README.md')
        ? `${readText(absolute)}\nSee the kdna-work-releases repository for the published reference asset.\n`
        : readText(absolute)),
    }),
  }],
  ['the page loses its explicit request-body serialization', {
    expected: /the page must serialize its request body explicitly/u,
    mutate: () => candidate({
      readText: (absolute) => (absolute === path.join(appRoot, 'app', 'page.jsx')
        ? readText(absolute).replace('body: JSON.stringify(', 'body: encodePayload(')
        : readText(absolute)),
    }),
  }],
  ['the page gains a second, unspecified serialization', {
    expected: /the page must serialize exactly one value \(the request body\); found 2/u,
    mutate: () => candidate({
      readText: (absolute) => (absolute === path.join(appRoot, 'app', 'page.jsx')
        ? readText(absolute).replace(
          '{coordinating ? <p className="status" role="status">Preparing read…</p> : null}',
          '{coordinating ? <p className="status" role="status">Preparing read…</p> : null}\n      <pre>{JSON.stringify(reader, null, 2)}</pre>',
        )
        : readText(absolute)),
    }),
  }],
])

let rejected = 0
for (const [name, mutation] of mutations) {
  const errors = publicSurfaceErrors(mutation.mutate())
  assert.ok(errors.length > 0, `the gate accepted a hostile candidate: ${name}`)
  assert.ok(
    errors.some((error) => mutation.expected.test(error)),
    `${name} was refused for an unrelated reason; expected ${mutation.expected}:\n${errors.join('\n')}`,
  )
  rejected += 1
}

console.log(`Public-surface hostile mutations rejected: ${rejected}/${mutations.size}.`)
