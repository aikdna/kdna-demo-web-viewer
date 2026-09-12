# Security boundary

This private reference demo runs only on 127.0.0.1. Do not expose it to a network or treat it as multi-user authentication. The local operator controls the Host policy; the default allows explicitly requested valid input. A browser transport context is an association, never authorization or a trusted identity.

The startup owner generates a random internal token for the Next-to-Host hop and passes it only to the two owned processes. The Host checks this token and applies its local policy through the official Host/Core/Read graph. Browser headers and selection metadata cannot replace that trusted context. Browser/Next and basic Host use separate exact dependency graphs and communicate through official HTTP bytes.

Input is limited to 10 MiB, multipart forwarding to 12 MiB, private context coordination to 32 KiB, and response bytes to 1 MiB. Each Read has a 5-second limit. The proxy binds to the configured loopback Host, rejects redirects and foreign origins, preserves official response status/headers/body, and does not parse KDNA or replicate its validator. Only single-request Read is exposed; expansion and earlier activation/execution flows are unsupported.

The four public React APIs own selection and Read lifecycle. Replacement, Cancel, Release and unmount invalidate pending results. The public ViewModel renders text and bounded public codes; it does not grant local capabilities. No raw payload fallback or HTML execution path exists in the page. A completed response or server finish does not prove remote application processing.

Install dependencies only from the two lockfiles and exact relative KDNA vendor tarballs. Keep install hooks disabled. The two Core 0.23.0 artifacts have different digests and must not be merged by version number. No global cache changes, browser downloads or publication are part of the local checks.

Synthetic fixtures are disposable test assets. No formal assets or private production inputs are included. Historical CI/release and online audit checks remain outside this scoped implementation evidence. Independent review and any later deployment require their own authorization and threat model; this candidate is not a public release.
