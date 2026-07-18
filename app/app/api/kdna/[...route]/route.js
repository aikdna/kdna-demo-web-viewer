import { createNextHandlers } from '@aikdna/kdna-web-server/nextjs'

export const runtime = 'nodejs'

const { GET, POST } = createNextHandlers({
  storageDir: process.env.KDNA_STORAGE_DIR ?? '.kdna-storage',
  activationServerUrl: process.env.KDNA_ACTIVATION_URL,
})

export { GET, POST }
