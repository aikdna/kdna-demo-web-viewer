import http from 'node:http'
import { setTimeout as delay } from 'node:timers/promises'
import { createKDNARouter } from '@aikdna/kdna-web-server/express'
import { limits, trustedSecret } from './context.mjs'

const port = Number(process.env.KDNA_DEMO_HOST_PORT)
const secret = process.env.KDNA_DEMO_INTERNAL_TOKEN
const policy = process.env.KDNA_DEMO_POLICY ?? 'allow'
const delayMs = Number(process.env.KDNA_DEMO_DELAY_MS ?? 0)
if (!Number.isInteger(port) || port < 1024 || port > 65535 || !secret || secret.length < 32
    || !['allow', 'deny', 'transport'].includes(policy) || !Number.isInteger(delayMs) || delayMs < 0 || delayMs > 2000) throw new Error('DEMO_HOST_CONFIG_INVALID')
let active = 0, calls = 0, stopping = false
const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' })
    res.end(JSON.stringify({ ok: true, basic: true, expand: 'unsupported', active, calls })); return
  }
  if (!trustedSecret(req.headers['x-demo-internal-token'], secret)) { res.writeHead(403); res.end(); return }
  if (req.method !== 'POST' || req.url !== '/read') { res.writeHead(404); res.end(); return }
  if (stopping || active >= 2) { res.writeHead(429); res.end(); return }
  active++; calls++
  const cancellation = new AbortController()
  const abort = () => cancellation.abort()
  const onClose = () => { if (!res.writableFinished) abort() }
  req.once('aborted', abort); res.once('close', onClose)
  const trustedContext = Object.freeze({ localCaller: true })
  // A new basic Host per HTTP call: no retained snapshot or cross-request handles.
  const router = createKDNARouter({ maxReads: 1, maxConcurrentReads: 1,
    maxInputBytes: limits.file, maxRequestBytes: limits.request, maxResponseBytes: limits.response,
    policyTimeoutMs: limits.timeout, requestTimeoutMs: limits.timeout, deliveryTimeoutMs: limits.timeout,
    getContext: () => trustedContext,
    observePolicy: async observation => {
      if (delayMs) { try { await delay(delayMs, undefined, { signal: cancellation.signal }) } catch { return null } }
      if (policy === 'transport') throw new Error('DEMO_CONFIGURED_TRANSPORT_FAILURE')
      return { decision: observation.context === trustedContext && !cancellation.signal.aborted && policy === 'allow' ? 'allow' : 'deny',
        scope: observation.snapshot.ir.nodes.map(node => node.id), epoch: 'demo:local-basic', policyId: 'demo:operator-policy' }
    } })
  try { await router(req, res) }
  finally { req.off('aborted', abort); res.off('close', onClose); active-- }
})
server.requestTimeout = 6000; server.headersTimeout = 6000; server.keepAliveTimeout = 1000
server.listen(port, '127.0.0.1', () => console.log(JSON.stringify({ event: 'host-ready', pid: process.pid, port, policy, delayMs })))
function stop() {
  if (stopping) return
  stopping = true; server.closeAllConnections()
  server.close(() => { console.log(JSON.stringify({ event: 'host-closed', pid: process.pid, port, active, calls })); process.exit(0) })
}
process.on('SIGTERM', stop); process.on('SIGINT', stop)
