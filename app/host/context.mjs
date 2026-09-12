import { randomUUID, timingSafeEqual } from 'node:crypto'

export const limits = Object.freeze({ file: 10 * 1024 * 1024, request: 12 * 1024 * 1024, response: 1024 * 1024, context: 32768, timeout: 5000 })
export const endpointId = 'demo:basic-local'
export function localUrl(value) {
  const url = new URL(value)
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.username || url.password) throw new Error('DEMO_LOCAL_ENDPOINT_REQUIRED')
  return url
}
export function applicationOrigin(value = process.env.KDNA_DEMO_ORIGIN) {
  return localUrl(value).origin
}
export function sameOrigin(request, configuredOrigin = process.env.KDNA_DEMO_ORIGIN) {
  const origin = applicationOrigin(configuredOrigin)
  if (request.headers.get('host') !== new URL(origin).host) return false
  const supplied = request.headers.get('origin')
  return (!supplied || supplied === origin) && request.headers.get('sec-fetch-site') !== 'cross-site'
}
export function trustedSecret(value, expected) {
  if (typeof value !== 'string' || typeof expected !== 'string' || expected.length < 32) return false
  const a = Buffer.from(value), b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}
export function coordinate(input, origin) {
  const { selection, sessionId, judgmentId } = input ?? {}
  for (const value of [sessionId, judgmentId]) {
    if (typeof value !== 'string' || !value.length || value.length > 128 || Array.from(value).some(c => c.codePointAt(0) < 32 || c.codePointAt(0) === 127)) throw new Error('DEMO_CONTEXT_INPUT_INVALID')
  }
  if (selection?.kind !== 'kdna.web-client-selection/1' || !Number.isSafeInteger(selection.byteLength)
      || selection.byteLength < 1 || selection.byteLength > limits.file) throw new Error('DEMO_CONTEXT_INPUT_INVALID')
  const requestId = 'demo:' + randomUUID(), now = Date.now()
  // Selection metadata creates an observable transport association only.
  // The separate Host independently admits bytes and grants its local policy.
  const request = { request_id: requestId, tuple: selection.tuple, budget_bytes: limits.response,
    mode: 'exact_selection', selection: { asset_id: selection.asset.asset_id,
      asset_version: selection.asset.asset_version, judgment_id: judgmentId }, handle: null }
  return { association_id: 'demo:' + randomUUID(), endpoint_id: endpointId, session_id: sessionId,
    endpoint_url: localUrl(origin).origin + '/api/kdna/read', issued_at_ms: now, expires_at_ms: now + 30000,
    outbound_request_json: JSON.stringify(request), correlation: { state: 'validated', request_id: requestId },
    expected_tuple: selection.tuple, expected_asset: selection.asset,
    expected_digests: { A: selection.digests.A.observed, C: selection.digests.C.observed, E: selection.digests.E.observed },
    expected_snapshot_id: null, max_response_bytes: limits.response, max_read_ms: limits.timeout,
    admission_response_limit_bytes: 4096 }
}
