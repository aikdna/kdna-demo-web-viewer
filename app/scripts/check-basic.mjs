import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import './smoke.mjs'
const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = p => readFileSync(path.join(app,p),'utf8')
const pkg = JSON.parse(read('package.json'))
assert.equal(pkg.private,true)
for (const [name,version] of Object.entries({next:'16.2.12',react:'19.2.7','react-dom':'19.2.7'})) assert.equal(pkg.dependencies[name],version)
const page = read('app/page.jsx')
for (const api of ['useKDNARead','KDNAFileInput','KDNAReadStatus','KDNAReadView']) assert.ok(page.includes(api))
assert.doesNotMatch(page, /dangerouslySetInnerHTML|KDNAFileDropzone|KDNALoadPlan|password|activation|Runtime Capsule|payload\.kdnab/)
assert.ok(page.includes('Cross-request expansion is unsupported'))
assert.ok(!pkg.dependencies['@aikdna/kdna-web-server'])
const browser = createRequire(path.join(app,'package.json')), host = createRequire(path.join(app,'host/package.json'))
assert.notEqual(browser.resolve('@aikdna/kdna-core'),host.resolve('@aikdna/kdna-core'))
assert.equal(browser('@aikdna/kdna-read/package.json').version,'0.3.0-rc.component-semantics.2')
assert.equal(host('@aikdna/kdna-read/package.json').version,'0.3.0-rc.component-semantics.2')
assert.equal(host('@aikdna/kdna-core/package.json').version,'0.24.0-rc.component-semantics.2')
assert.equal(browser('@aikdna/kdna-core/package.json').version,'0.24.0-rc.component-semantics.2')
const reactEntry = browser.resolve('@aikdna/kdna-react')
assert.ok(existsSync(path.join(path.dirname(reactEntry),'index.d.ts')))
for (const name of ['@aikdna/kdna-react/src/index.cjs','@aikdna/kdna-web-client/src/client.cjs','@aikdna/kdna-core/src/index.js']) assert.throws(()=>browser(name),{code:'ERR_PACKAGE_PATH_NOT_EXPORTED'})
for (const file of ['app/api/kdna/[...route]/route.js','app/api/demo-context/route.js']) assert.doesNotMatch(read(file), /from ['"]@aikdna\/kdna-web-server/)
console.log('Fixed framework, two private graphs, closed public imports and declaration presence match')
