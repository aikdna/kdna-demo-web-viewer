'use client'
import { useEffect, useRef, useState } from 'react'
import { useKDNARead, KDNAFileInput, KDNAReadStatus, KDNAReadView } from '@aikdna/kdna-react'

const buttonStyle = { minHeight: 44, padding: '8px 18px', margin: '8px 8px 8px 0', touchAction: 'manipulation' }
function BasicReader({ options }) {
  const reader = useKDNARead(options)
  const pending = useRef({ generation: 0, controller: null, timer: null })
  const [coordinating, setCoordinating] = useState(false)
  const [error, setError] = useState(null)
  const [judgmentId, setJudgmentId] = useState('judgment:demo')
  function interrupt() {
    pending.current.generation++
    pending.current.controller?.abort()
    clearTimeout(pending.current.timer)
    pending.current.controller = null
    setCoordinating(false); setError(null)
  }
  useEffect(() => () => { pending.current.generation++; pending.current.controller?.abort(); clearTimeout(pending.current.timer) }, [])
  async function select(file) { interrupt(); await reader.select(file) }
  async function read() {
    if (!reader.selection) return
    interrupt()
    const generation = pending.current.generation
    const controller = new AbortController(); pending.current.controller = controller
    setCoordinating(true)
    const timer = setTimeout(() => controller.abort(), 5000); pending.current.timer = timer
    try {
      const response = await fetch('/api/demo-context', { method: 'POST', signal: controller.signal,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ selection: reader.selection, sessionId: options.sessionId, judgmentId }) })
      if (!response.ok) throw new Error('context')
      const context = await response.json()
      if (generation !== pending.current.generation) return
      setCoordinating(false)
      clearTimeout(timer)
      await reader.read(context, { signal: controller.signal })
    } catch { if (generation === pending.current.generation) setError(controller.signal.aborted ? 'DEMO_CONTEXT_TIMEOUT' : 'DEMO_CONTEXT_UNAVAILABLE') }
    finally { clearTimeout(timer); if (generation === pending.current.generation) { setCoordinating(false); pending.current.controller = null } }
  }
  const busy = coordinating || reader.phase === 'reading'
  return <section className="dropzone viewer-card" aria-label="Basic KDNA reader">
    <div className="dropzone-copy">
      <span className="step-label">1 · Select an asset</span>
      <strong>Choose a file, then request a read</strong>
      <span>Selection stays in this browser. Nothing is sent until you choose Read.</span>
      <KDNAFileInput onSelect={select} />
    </div>
    <div className="result-section">
      <span className="step-label">2 · Explicit read</span>
      <label htmlFor="judgment-id" style={{ display: 'block', marginTop: 12 }}>Judgment ID</label>
      <input id="judgment-id" name="judgment-id" value={judgmentId} maxLength={128} disabled={busy}
        onChange={event => setJudgmentId(event.target.value)} style={{ minHeight: 44, maxWidth: '100%', fontSize: 16 }} />
      <div>
        <button style={buttonStyle} onClick={read} disabled={!reader.selection || busy || !judgmentId.trim()}>Read</button>
        <button style={buttonStyle} onClick={() => { interrupt(); reader.cancel() }} disabled={!busy}>Cancel</button>
        <button style={buttonStyle} onClick={() => { interrupt(); reader.release() }} disabled={!reader.selection && !busy}>Release</button>
      </div>
      {coordinating ? <p className="status" role="status">Preparing read…</p> : null}
      {error ? <p className="error" role="alert">{error}</p> : null}
      <KDNAReadStatus state={reader} className="status" />
      <KDNAReadView state={reader} maxVisibleNodes={20} maxTextCharacters={4096} />
    </div>
  </section>
}
export default function Page() {
  const [options, setOptions] = useState(null)
  useEffect(() => { setOptions({ endpointUrl: window.location.origin + '/api/kdna/read', endpointId: 'demo:basic-local',
    sessionId: 'demo:' + crypto.randomUUID(), maxFileBytes: 10 * 1024 * 1024, maxConcurrentRequests: 1, timeoutMs: 5000 }) }, [])
  return <main className="shell">
    <header className="hero">
      <p className="eyebrow">KDNA reference integration</p>
      <h1>See a judgment asset cross the web boundary.</h1>
      <p className="lede">Select a valid <code>.kdna</code> file and explicitly request one judgment through the public React Read components and a local reference Host.</p>
    </header>
    {options ? <BasicReader options={options} /> : <p className="status">Preparing local reader…</p>}
    <aside className="boundary-note">
      <strong>Basic, single-request Read</strong>
      <span>Cross-request expansion is unsupported (NOT_PROVEN). The remote response grants no local authorization or action capability. Release clears the current selection and result.</span>
    </aside>
  </main>
}
