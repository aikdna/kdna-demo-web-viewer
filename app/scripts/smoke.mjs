import { createNextHandlers } from '@aikdna/kdna-web-server/nextjs'
import {
  KDNAAssetInspector,
  KDNAFileDropzone,
  KDNALoadPlanGate,
  KDNAPasswordUnlockDialog,
} from '@aikdna/kdna-react'

for (const [name, value] of Object.entries({
  createNextHandlers,
  KDNAAssetInspector,
  KDNAFileDropzone,
  KDNALoadPlanGate,
  KDNAPasswordUnlockDialog,
})) {
  if (typeof value !== 'function') {
    throw new Error(`KDNA Next.js template dependency missing export: ${name}`)
  }
}

console.log('KDNA Next.js template smoke passed')
