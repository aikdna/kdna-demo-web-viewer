// Synthetic version 1.1.0 test asset. This writer is test-only; Core owns admission.
import { encode } from 'cbor-x'
import { admitNode } from '@aikdna/kdna-core/node'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const b of bytes) { crc ^= b; for (let i = 0; i < 8; i++) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1; }
  return (crc ^ 0xffffffff) >>> 0;
}
export function zip(entries) {
  const local = [], central = [];
  let offset = 0;
  for (const [name, value] of entries) {
    const bytes = Buffer.from(value), filename = Buffer.from(name), crc = crc32(bytes);
    const head = Buffer.alloc(30);
    head.writeUInt32LE(0x04034b50); head.writeUInt16LE(20, 4); head.writeUInt32LE(crc, 14);
    head.writeUInt32LE(bytes.length, 18); head.writeUInt32LE(bytes.length, 22); head.writeUInt16LE(filename.length, 26);
    const directory = Buffer.alloc(46);
    directory.writeUInt32LE(0x02014b50); directory.writeUInt16LE(20, 4); directory.writeUInt16LE(20, 6);
    directory.writeUInt32LE(crc, 16); directory.writeUInt32LE(bytes.length, 20); directory.writeUInt32LE(bytes.length, 24);
    directory.writeUInt16LE(filename.length, 28); directory.writeUInt32LE(offset, 42);
    local.push(head, filename, bytes); central.push(directory, filename); offset += head.length + filename.length + bytes.length;
  }
  const table = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(table.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, table, end]);
}

export function demoFixture(text = 'DEMO_SENTINEL_1.1', id = 'asset:demo-basic') {
  const asset = { asset_id: id, asset_version: '1.1.0', judgment_version: '1.1.0' }
  const payload = { profile: 'kdna.payload.judgment', profile_version: '0.2.0', asset,
    actors: [{ id: 'actor:demo', kind: 'person', name: 'Synthetic demo author' }],
    scope: { statement: 'Local basic Read integration only' },
    judgments: [{ id: 'judgment:demo', label: 'A local synthetic judgment', focus: 'Read a bounded statement',
      subject: { actor_ids: ['actor:demo'], statement: 'A synthetic subject' }, scope: { statement: 'This test only' },
      result_contract: { id: 'contract:demo', form: { term: 'result.form.assertion' }, shape: { kind: 'scalar', scalar_type: 'text' },
        minimum: 1, maximum: 1, allowed_result_types: [{ term: 'result.type.text' }] },
      result: { contract_ref: 'contract:demo', result_type: { term: 'result.type.text' }, value: { kind: 'text', value: text } } }] }
  const manifest = { format_version: '0.2.0', asset_id: id, asset_uid: id + ':uid', asset_type: 'fixture',
    title: 'Basic Demo synthetic 1.1', version: '1.1.0', judgment_version: '1.1.0',
    created_at: '2026-09-08T00:00:00Z', updated_at: '2026-09-08T00:00:00Z',
    compatibility: { min_loader_version: '0.23.0', profile: 'kdna.payload.judgment', profile_version: '0.2.0' },
    payload: { path: 'payload.kdnab', encoding: 'cbor', encrypted: false }, runtime: { mandatory_entries: ['payload.kdnab'] }, access: 'public' }
  return zip([['mimetype','application/vnd.kdna.asset'],['kdna.json',JSON.stringify(manifest)],['payload.kdnab',encode(payload)]])
}
export async function writeFixtures(directory) {
  mkdirSync(directory, { recursive: true })
  for (const [name, bytes] of Object.entries({ 'basic-1.1.kdna': demoFixture(),
    'replacement-1.1.kdna': demoFixture('REPLACEMENT_SENTINEL_1.1', 'asset:demo-replacement'),
    'text-1.1.kdna': demoFixture('<img src=x onerror=alert(1)> ' + 'LONG_TEXT_'.repeat(600)),
    'invalid.kdna': Buffer.from('not a KDNA container'), 'oversized.kdna': Buffer.alloc(10 * 1024 * 1024 + 1) })) {
    if (!['invalid.kdna','oversized.kdna'].includes(name)) {
      const result = await admitNode(bytes)
      if (result.status !== 'accepted') throw new Error('Synthetic fixture rejected: ' + result.reason)
    }
    writeFileSync(path.join(directory,name), bytes)
  }
  return directory
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const destination = path.resolve(process.argv[2] ?? '.demo-fixtures')
  await writeFixtures(destination); console.log('Synthetic 1.1 fixtures validated by public Core: ' + destination)
}
