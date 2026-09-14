import { coordinate, limits, sameOrigin, applicationOrigin } from '../../../host/context.mjs'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function POST(request) {
  let reader, timer
  try {
    if (!sameOrigin(request)) return Response.json({ code: 'DEMO_ORIGIN_REJECTED' }, { status: 403 })
    if (Number(request.headers.get('content-length')) > limits.context) return Response.json({ code: 'DEMO_CONTEXT_INPUT_INVALID' }, { status: 413 })
    const deadline = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), limits.timeout) })
    deadline.catch(() => {})
    reader = request.body?.getReader()
    if (!reader) throw new Error('empty')
    let length = 0; const chunks = []
    for (;;) {
      const part = await Promise.race([reader.read(), deadline])
      if (part.done) break
      length += part.value.byteLength
      if (length > limits.context) throw new Error('limit')
      chunks.push(part.value)
    }
    const input = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    return Response.json(coordinate(input, applicationOrigin()), { headers: { 'cache-control': 'no-store' } })
  } catch { return Response.json({ code: 'DEMO_CONTEXT_INPUT_INVALID' }, { status: 400 }) }
  finally { clearTimeout(timer); reader?.releaseLock() }
}
