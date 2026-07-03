'use client'

import {
  KDNAAssetInspector,
  KDNAFileDropzone,
  KDNALoadPlanGate,
  KDNAPasswordUnlockDialog,
} from '@aikdna/kdna-react'
import { useState } from 'react'

export default function Page() {
  const [unlock, setUnlock] = useState(null)

  return (
    <main>
      <KDNAFileDropzone endpoint="/api/kdna" onError={console.error}>
        {({ fileId, inspect, loading }) => (
          <section>
            <p>{loading ? 'Uploading...' : 'Drop or choose a .kdna file'}</p>
            {inspect ? <KDNAAssetInspector inspect={inspect} /> : null}
            {fileId ? (
              <KDNALoadPlanGate fileId={fileId} endpoint="/api/kdna">
                {({ status, content }) => {
                  if (status === 'locked') {
                    return (
                      <KDNAPasswordUnlockDialog
                        fileId={fileId}
                        endpoint="/api/kdna"
                        onUnlock={(result) => setUnlock(result.content)}
                      />
                    )
                  }
                  return <pre>{unlock || content || status}</pre>
                }}
              </KDNALoadPlanGate>
            ) : null}
          </section>
        )}
      </KDNAFileDropzone>
    </main>
  )
}
