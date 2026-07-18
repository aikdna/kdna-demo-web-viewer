import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { KDNA_LOADER_VERSION } from '@aikdna/kdna-core'
import { KDNAFileDropzone, KDNALoadPlanGate } from '@aikdna/kdna-react'
import { KDNALoadPlanManager } from '@aikdna/kdna-web-client'
import { createNextHandlers } from '@aikdna/kdna-web-server/nextjs'

const packagePath = fileURLToPath(new URL('../package.json', import.meta.url))
const manifest = JSON.parse(await readFile(packagePath, 'utf8'))

assert.equal(KDNA_LOADER_VERSION, '0.20.0')
assert.equal(typeof KDNALoadPlanManager, 'function')
assert.equal(typeof createNextHandlers, 'function')
assert.equal(typeof KDNAFileDropzone, 'function')
assert.equal(typeof KDNALoadPlanGate, 'function')

assert.deepEqual(
  {
    core: manifest.dependencies['@aikdna/kdna-core'],
    client: manifest.dependencies['@aikdna/kdna-web-client'],
    server: manifest.dependencies['@aikdna/kdna-web-server'],
    react: manifest.dependencies['@aikdna/kdna-react'],
  },
  {
    core: '0.20.0',
    client: '0.2.2',
    server: '0.3.0',
    react: '0.3.0',
  },
)

console.log('Exact KDNA web integration smoke passed')
