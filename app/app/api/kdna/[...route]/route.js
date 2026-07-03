import { createNextHandlers } from '@aikdna/kdna-web-server/nextjs'

const { GET, POST } = createNextHandlers({
  storageDir: process.env.KDNA_STORAGE_DIR ?? '/tmp/kdna-web',
  activationServerUrl: process.env.KDNA_ACTIVATION_URL,
})

export { GET, POST }
