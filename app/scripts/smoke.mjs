import assert from 'node:assert/strict'
import { useKDNARead, KDNAFileInput, KDNAReadStatus, KDNAReadView } from '@aikdna/kdna-react'
import { selectKDNA, createKDNAWebClient } from '@aikdna/kdna-web-client'
import { admitNode } from '@aikdna/kdna-core/node'
for (const api of [useKDNARead,KDNAFileInput,KDNAReadStatus,KDNAReadView,selectKDNA,createKDNAWebClient,admitNode]) assert.equal(typeof api, 'function')
console.log('Public basic Read imports available')
