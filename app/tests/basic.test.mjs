import test from 'node:test'
import assert from 'node:assert/strict'
import { selectKDNA, releaseKDNASelection } from '@aikdna/kdna-web-client'
import { coordinate, localUrl, trustedSecret, sameOrigin, applicationOrigin } from '../host/context.mjs'
import { demoFixture } from './fixtures.mjs'
test('public selection and fresh context bind a valid synthetic 1.1 asset without a read',async()=>{
 const result=await selectKDNA(demoFixture());assert.equal(result.status,'selected')
 const data={selection:result.selection,sessionId:'demo:unit',judgmentId:'judgment:demo'}
 const a=coordinate(data,'http://127.0.0.1:3210'),b=coordinate(data,'http://127.0.0.1:3210')
 assert.notEqual(a.association_id,b.association_id);assert.notEqual(a.correlation.request_id,b.correlation.request_id)
 const request=JSON.parse(a.outbound_request_json);assert.equal(request.mode,'exact_selection');assert.equal(request.handle,null)
 assert.deepEqual(a.expected_asset,result.selection.asset);assert.equal(a.expected_asset.asset_version,'1.1.0')
 releaseKDNASelection(result.selection)
})
test('invalid input remains rejected by public Core-backed selection',async()=>{
 assert.equal((await selectKDNA(new Uint8Array([1]))).status,'rejected')
 assert.equal((await selectKDNA(new Uint8Array(10485761))).status,'rejected')
})
test('local coordination rejects remote destinations and does not trust browser secrets',()=>{
 for(const url of ['https://example.com','http://localhost:3210','http://user@127.0.0.1']) assert.throws(()=>localUrl(url))
 assert.equal(trustedSecret('browser-claim','a'.repeat(64)),false)
 assert.equal(trustedSecret('a'.repeat(64),'a'.repeat(64)),true)
})

test('configured external origin admits Next normalized URL only with matching Host and Origin',()=>{
 const origin='http://127.0.0.1:3210'
 const req=(headers)=>new Request('http://localhost:3210/api/demo-context',{headers})
 assert.equal(sameOrigin(req({host:'127.0.0.1:3210',origin}),origin),true)
 assert.equal(sameOrigin(req({host:'localhost:3210',origin}),origin),false)
 assert.equal(sameOrigin(req({host:'127.0.0.1:3210',origin:'http://example.com'}),origin),false)
 assert.equal(sameOrigin(req({host:'127.0.0.1:3210','sec-fetch-site':'cross-site'}),origin),false)
 assert.equal(sameOrigin(req({origin}),origin),false)
 assert.throws(()=>applicationOrigin(''))
})
