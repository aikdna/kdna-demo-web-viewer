# KDNA basic web reference demo

A private Next.js application for one explicit public Read at a time. Select a valid KDNA file locally, enter its judgment ID, and choose **Read**. The UI uses the public `useKDNARead`, `KDNAFileInput`, `KDNAReadStatus`, and `KDNAReadView` APIs. Selection alone sends no HTTP request.

**Cross-request expansion is unsupported (NOT_PROVEN).** No retained Host session or persistent uploaded-file store is created. Cancel interrupts the current request; Release clears the selection and visible result. Selecting another file invalidates earlier work. Content, diagnostics and proof limits come from the public remote ViewModel; they grant no local authorization or action capability.

## Run locally

Use Node.js 22 or newer. Framework versions remain Next 16.3.5, React 19.2.7 and ReactDOM 19.2.7. The app is private and has no publication workflow in this delivery.

From `app/`:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm --prefix host ci --ignore-scripts --no-audit --no-fund
npm run build
npm start -- --port 3210 --host-port 3211
```

Open [the local demo](http://127.0.0.1:3210). Both processes bind only to 127.0.0.1. Choose unused ports. Ctrl+C stops the owned Next and basic Host processes; a failed child also stops its companion. `npm run dev` uses the same local process owner with Next development mode.

### Offline install boundary

This repository vendors the KDNA packages only. The Next/React framework graph is
not vendored, so `npm ci --offline` with an empty npm cache fails in `app/` at the
first missing package (`tslib`); that directory resolves 75 registry packages and
an installed tree is about 219 MiB. Use registry access or a prepared npm cache
for `app/`. The loopback host in `app/host/` is fully vendored and installs with
an empty cache (`npm ci --offline`, 12 packages). Not redistributing the framework
tarballs is a deliberate size choice, not a defect.

The seven KDNA packages are immutable relative `vendor/` inputs. Other dependencies are fixed in the two lockfiles. Install only from those locks, with install hooks disabled. Offline installation needs the matching registry tarballs already in a dedicated npm cache; the repository does not silently fetch or replace KDNA RCs.

## Test input and checks

```sh
npm run fixtures -- .demo-fixtures
npm test
npm run test:e2e
```

The fixture command generates local synthetic **asset version 1.1.0** files and validates the positive cases with public Core. Their container/payload/Read tuple remains the accepted public 0.2/0.1 contract; 1.1.0 is the test asset version, not a new protocol. Choose `basic-1.1.kdna` and the default `judgment:demo`. Replacement, long text, invalid and oversized fixtures support the local checks. These are test inputs, not formal KDNA assets or a conversion of older examples.

Other files must be accepted by the current public Core graph, fit the 10 MiB input bound, and identify a judgment the caller explicitly selects. No legacy password, activation, upload/inspect/plan/load or execution flow is provided. Errors expose bounded public or application codes. The page never renders raw container payloads.

The browser checks use installed Chrome and Playwright 1.61.1 WebKit. Set `PLAYWRIGHT_BROWSERS_PATH` to an existing compatible browser installation when needed. They start production Next/Host processes on temporary loopback ports and close them after tests. No browser download is performed by these scripts.

`npm test` runs the new basic public-boundary smoke and direct tests. Production build and actual browser checks are separate. Historical Git-based DCO/release/public collector tests, old CI/release asset fixtures, and online npm audit were **NOT_RUN** for this scoped delivery. Their frozen files and the inherited layout metadata do not describe new acceptance or release authorization. This is not a claim that the legacy `ci` script is green.

## Two exact dependency graphs

The browser/Next graph uses Core 0.23.0, Read 0.2.0, Web Client 0.4.1 and React 0.5.0 from `app/vendor/`. The private basic Host uses Host 0.3.1, its different Core 0.23.0 bytes, and Read 0.1.0 from `app/host/vendor/`. Their same Core version string does not imply the same artifact. Never replace either graph by version number or a peer override. The two processes exchange official HTTP bytes only.

`/api/demo-context` is private application coordination: it supplies a fresh transport association bound to the public selection, endpoint, caller session and request ID. Those browser-facing values prove no identity or authorization. The local startup owner generates a separate internal token for the Next-to-Host hop; the Host applies its independently configured local policy to the real Core inspection. The token is never sent to the browser.

The default local operator policy allows the explicitly requested valid input. For reproducible negative checks, startup accepts `KDNA_DEMO_POLICY=deny` or `transport`, and `KDNA_DEMO_DELAY_MS` from 0 to 2000. These are server launch settings, not browser authority claims. This localhost demo is not a multi-user or internet deployment.

Read responses are bounded to 1 MiB and each Read is limited to 5 seconds. Multipart forwarding is bounded to 12 MiB and context coordination to 32 KiB. Server stream finish is not remote application acknowledgement. Remote identity, authorization, revocation and replay remain subject to the official ViewModel proof limits.

The integration candidate still requires independent acceptance before exact live landing. It does not establish public release, retained expansion, Reader product UI, native compatibility, formal asset production or Open Complete.
