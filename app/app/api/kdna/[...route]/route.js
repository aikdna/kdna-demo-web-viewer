import { limits, localUrl, sameOrigin } from '../../../../host/context.mjs'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
let active = 0
export async function POST(request, context) {
  const params = await context.params
  if (params?.route?.length !== 1 || params.route[0] !== 'read') return Response.json({ code: 'DEMO_OPERATION_UNSUPPORTED' }, { status: 501 })
  if (active >= 2) return Response.json({ code: 'DEMO_BUSY' }, { status: 429 })
  let reader, responseReader, timer
  const controller = new AbortController()
  const abort = () => controller.abort()
  active++
  try {
    if (!sameOrigin(request)) return Response.json({ code: 'DEMO_ORIGIN_REJECTED' }, { status: 403 })
    const host = localUrl(process.env.KDNA_DEMO_HOST_URL)
    const secret = process.env.KDNA_DEMO_INTERNAL_TOKEN
    if (!secret || secret.length < 32) throw new Error('config')
    request.signal.addEventListener('abort', abort, { once: true })
    if (request.signal.aborted) abort()
    timer = setTimeout(abort, limits.timeout)
    const cancelled = new Promise((_, reject) => {
      if (controller.signal.aborted) reject(new Error('aborted'))
      else controller.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true })
    })
    cancelled.catch(() => {})
    // This is bounded byte forwarding. Only the official Host parses KDNA/forms.
    async function collect(stream, maximum) {
      const source = stream?.getReader()
      if (!source) return new Uint8Array()
      if (!reader) reader = source; else responseReader = source
      const chunks = []; let length = 0
      for (;;) {
        const next = await Promise.race([source.read(), cancelled])
        if (next.done) break
        length += next.value.byteLength
        if (length > maximum) throw new Error('limit')
        chunks.push(next.value)
      }
      return Buffer.concat(chunks, length)
    }
    if (Number(request.headers.get('content-length')) > limits.request) return Response.json({ code: 'DEMO_REQUEST_TOO_LARGE' }, { status: 413 })
    const body = await collect(request.body, limits.request)
    const response = await fetch(new URL('/read', host), { method: 'POST', redirect: 'error',
      headers: { 'content-type': request.headers.get('content-type') ?? '', 'x-demo-internal-token': secret },
      body, signal: controller.signal, cache: 'no-store' })
    const bytes = await collect(response.body, limits.response)
    const headers = new Headers(response.headers)
    for (const name of ['connection','transfer-encoding','keep-alive']) headers.delete(name)
    headers.set('cache-control', 'no-store')
    return new Response(bytes.byteLength ? bytes : null, { status: response.status, headers })
  } catch { return Response.json({ code: controller.signal.aborted ? 'DEMO_REQUEST_CANCELLED' : 'DEMO_TRANSPORT_UNAVAILABLE' }, { status: 502 }) }
  finally { clearTimeout(timer); request.signal.removeEventListener('abort', abort); reader?.releaseLock(); responseReader?.releaseLock(); active-- }
}
export function GET() { return Response.json({ code: 'DEMO_OPERATION_UNSUPPORTED' }, { status: 405 }) }
