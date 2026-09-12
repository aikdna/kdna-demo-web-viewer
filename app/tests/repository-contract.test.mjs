import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const text = name => readFileSync(new URL(name,import.meta.url),'utf8')
test('the basic page uses four public React APIs and explicit actions',()=>{
 const page=text('../app/page.jsx')
 for(const api of ['useKDNARead','KDNAFileInput','KDNAReadStatus','KDNAReadView']) assert.ok(page.includes(api))
 assert.doesNotMatch(page,/LoadPlan|KDNAAssetInspector|dangerouslySetInnerHTML|JsonPanel/)
})
test('official basic Host is isolated from the browser dependency graph',()=>{
 const pkg=JSON.parse(text('../package.json')),host=JSON.parse(text('../host/package.json'))
 assert.equal(pkg.private,true);assert.ok(!pkg.dependencies['@aikdna/kdna-web-server'])
 assert.equal(host.dependencies['@aikdna/kdna-read'],'file:vendor/aikdna-kdna-read-0.3.0-rc.component-semantics.2.tgz')
})
test('Apache license remains complete and unchanged',()=>{
 const license=text('../../LICENSE')
 assert.equal(createHash('sha256').update(license).digest('hex'),'699a9bdd9d3fb95f2146586a5fb1d7a6a6197a43422914f86869fed84c34222c')
})
