# Security policy

## Supported version

Security fixes are applied to the latest release on `main`.

## Report a vulnerability

Please use [GitHub's private vulnerability reporting](https://github.com/aikdna/kdna-demo-web-viewer/security/advisories/new) for this repository. Do not open a public issue containing exploit details, credentials, protected asset content, or deployment configuration.

## Security boundary

This local reference demo runs only on 127.0.0.1. Do not expose it to a network or treat it as multi-user authentication. The local operator controls the Host policy; the default allows explicitly requested valid input. A browser transport context is an association, never authorization or a trusted identity.

The startup owner generates a random internal token for the Next-to-Host hop and passes it only to the two owned processes. The Host checks this token and applies its local policy through the official Host/Core/Read graph. Browser headers and selection metadata cannot replace that trusted context. Browser/Next and basic Host use separate exact dependency graphs and communicate through official HTTP bytes.

Input is limited to 10 MiB, multipart forwarding to 12 MiB, private context coordination to 32 KiB, and response bytes to 1 MiB. Each Read has a 5-second limit. The proxy binds to the configured loopback Host, rejects redirects and foreign origins, preserves official response status/headers/body, and does not parse KDNA or replicate its validator. Only single-request Read is exposed; expansion and earlier activation/execution flows are unsupported.

The four public React APIs own selection and Read lifecycle. Replacement, Cancel, Release and unmount invalidate pending results. The public ViewModel renders text and bounded public codes; it does not grant local capabilities. No raw payload fallback or HTML execution path exists in the page. A completed response or server finish does not prove remote application processing.

Install dependencies only from the two lockfiles and exact relative KDNA vendor tarballs. Keep install hooks disabled. The current Core and Read archives match across both graphs, but the browser and Host lockfiles remain separate. Do not replace archives by version number or merge the Host into the browser graph. Browser installation is an explicit setup step documented in README; the browser tests themselves do not download or install software.

Synthetic fixtures are disposable test assets. No formal assets or private production inputs are included. The complete local check includes the online production dependency audit and both browser projects. Passing those checks does not establish multi-user deployment safety or authorize a release; any deployment needs its own threat model.
