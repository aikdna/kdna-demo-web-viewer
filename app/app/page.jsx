'use client'

import {
  KDNAAssetInspector,
  KDNAFileDropzone,
  KDNALoadPlanGate,
  KDNAPasswordUnlockDialog,
} from '@aikdna/kdna-react'
import { useEffect, useState } from 'react'

function JsonPanel({ value }) {
  if (value == null) return null

  return (
    <pre className="json-panel" data-testid="runtime-context">
      {JSON.stringify(value, null, 2)}
    </pre>
  )
}

function AssetViewer({ fileId, inspect, loading, error }) {
  const [unlockedContent, setUnlockedContent] = useState(null)

  useEffect(() => {
    setUnlockedContent(null)
  }, [fileId])

  return (
    <section className="viewer-card">
      <div className="dropzone-copy">
        <span className="step-label">1 · Select an asset</span>
        <strong>{loading ? 'Inspecting the asset…' : 'Drop a .kdna file here, or click to choose one'}</strong>
        <span>Files are uploaded to the local Node.js route for validation and temporary storage.</span>
      </div>

      {error ? <p className="error" role="alert">{error.message}</p> : null}

      {inspect ? (
        <div className="result-section" data-testid="asset-inspector">
          <span className="step-label">2 · Inspect</span>
          <KDNAAssetInspector inspect={inspect} />
        </div>
      ) : null}

      {fileId ? (
        <div
          className="result-section"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <span className="step-label">3 · Plan and load</span>
          <KDNALoadPlanGate fileId={fileId} endpoint="/api/kdna">
            {({ status, content, error: loadError }) => {
              const visibleContent = unlockedContent ?? content

              if (visibleContent) {
                return (
                  <div>
                    <p className="status" data-testid="load-status" aria-live="polite">
                      Runtime context loaded
                    </p>
                    <JsonPanel value={visibleContent} />
                  </div>
                )
              }

              if (status === 'locked') {
                return (
                  <KDNAPasswordUnlockDialog
                    fileId={fileId}
                    endpoint="/api/kdna"
                    onUnlock={(result) => setUnlockedContent(result.content)}
                  />
                )
              }

              if (loadError) {
                return <p className="error" role="alert">{loadError.message}</p>
              }

              return (
                <p className="status" data-testid="load-status" aria-live="polite">
                  Load status: {status}
                </p>
              )
            }}
          </KDNALoadPlanGate>
        </div>
      ) : null}
    </section>
  )
}

export default function Page() {
  return (
    <main className="shell">
      <header className="hero">
        <p className="eyebrow">KDNA reference integration</p>
        <h1>See a judgment asset cross the web boundary.</h1>
        <p className="lede">
          This demo uses the public React components and Node.js server adapter to inspect,
          plan, and load a real <code>.kdna</code> asset without returning protected container
          entries or server-side key material from the server.
        </p>
      </header>

      <KDNAFileDropzone endpoint="/api/kdna" className="dropzone">
        {(state) => <AssetViewer {...state} />}
      </KDNAFileDropzone>

      <aside className="boundary-note">
        <strong>What you are seeing</strong>
        <span>
          Inspect metadata is public. The LoadPlan reports whether loading can continue.
          After authorization, the server returns a Runtime Capsule context for the host to use.
        </span>
      </aside>
    </main>
  )
}
