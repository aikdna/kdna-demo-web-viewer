import fs from 'node:fs/promises'
import path from 'node:path'

export default async function globalTeardown() {
  await fs.rm(path.resolve('.kdna-test-storage'), { recursive: true, force: true })
}
