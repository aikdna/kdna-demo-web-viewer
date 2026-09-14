import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
export default async function globalTeardown() {
  const directory = process.env.KDNA_EVIDENCE_DIR
  if (!directory) return
  const records = readdirSync(directory).filter(n => n.startsWith('resource-') && n.endsWith('.json'))
  for (const name of records) {
    const record = JSON.parse(readFileSync(path.join(directory,name),'utf8'))
    if (!record.closed || record.ports.some(x => x.open)) throw new Error('DEMO_TEST_RESOURCE_NOT_CLOSED')
  }
  console.log('Recorded local app process groups closed: ' + records.length)
}
