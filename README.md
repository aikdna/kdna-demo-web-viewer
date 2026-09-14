# KDNA basic web reference demo

A local Next.js reference application for one explicit public Read at a time. Select a valid KDNA file locally, enter its judgment ID, and choose **Read**. The UI uses the public `useKDNARead`, `KDNAFileInput`, `KDNAReadStatus`, and `KDNAReadView` APIs. Selection alone sends no HTTP request.

**Cross-request expansion is unsupported (NOT_PROVEN).** No retained Host session or persistent uploaded-file store is created. Cancel interrupts the current request; Release clears the selection and visible result. Selecting another file invalidates earlier work. Content, diagnostics and proof limits come from the public remote ViewModel; they grant no local authorization or action capability.

## Run locally

Use Node.js 22 or newer. Framework versions remain Next 16.3.5, React 19.2.7 and ReactDOM 19.2.7. The npm package is marked `private: true`. The GitHub release workflow verifies source and browser behavior; it does not publish an npm package.

From `app/`:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm --prefix host ci --ignore-scripts --no-audit --no-fund
npm run build
npm start -- --port 3210 --host-port 3211
```

Open [the local demo](http://127.0.0.1:3210). Both processes bind only to 127.0.0.1. Choose unused ports. Ctrl+C stops the owned Next and basic Host processes; a failed child also stops its companion. `npm run dev` uses the same local process owner with Next development mode.

### Offline install boundary

This repository vendors the KDNA inputs for both dependency graphs. The Next/React
framework graph also needs registry tarballs, so `app/` cannot install offline
with an empty npm cache. Use registry access or a prepared dedicated npm cache.
The loopback Host graph in `app/host/` is fully vendored and can install with an
empty cache using `npm ci --offline --ignore-scripts --no-audit --no-fund`.

The seven direct KDNA dependency declarations resolve to immutable relative
`vendor/` archives. Other dependencies are fixed in the two lockfiles. Install
from those locks with install hooks disabled; do not replace the KDNA archives
with registry versions or peer overrides.

## Test input and checks

```sh
npm run fixtures -- .demo-fixtures
npm test
npx playwright install webkit
npm run build
KDNA_EVIDENCE_DIR="$(mktemp -d)" npm run test:e2e
```

The fixture command generates local synthetic **asset version 1.1.0** files and validates the positive cases with public Core. Their container/payload/Read tuple remains the accepted public 0.2/0.1 contract; 1.1.0 is the test asset version, not a new protocol. Choose `basic-1.1.kdna` and the default `judgment:demo`. Replacement, long text, invalid and oversized fixtures support the local checks. These are test inputs, not formal KDNA assets or a conversion of older examples.

Other files must be accepted by the current public Core graph, fit the 10 MiB input bound, and identify a judgment the caller explicitly selects. No legacy password, activation, upload/inspect/plan/load or execution flow is provided. Errors expose bounded public or application codes. The page never renders raw container payloads.

The browser checks use installed Google Chrome and Playwright 1.61.1 WebKit. Install Google Chrome before running them. `npx playwright install webkit` downloads the matching WebKit build; set `PLAYWRIGHT_BROWSERS_PATH` to a dedicated directory for both installation and testing if desired. Linux also needs the corresponding system libraries (`npx playwright install --with-deps chrome webkit` provisions both CI browsers and dependencies). Tests start production Next/Host processes on temporary loopback ports and close them afterward. They use isolated browser contexts, generate their own synthetic fixtures, and do not read external asset environment variables. Choose a fresh `KDNA_EVIDENCE_DIR` for every run because evidence files are written once.

`npm test` runs the basic public-boundary smoke, direct tests, and browser-matrix contract. `npm run public:check` validates the vendored inputs, documentation, and workflow prerequisites, including hostile mutations. `npm run ci` runs those gates, the online production dependency audit, a production build, and all seven browser scenarios in each of Chrome and WebKit. The browser scenarios cover explicit Read and proof limits, invalid/oversized input, cancel/release, replacement during a request, bounded text and keyboard/mobile controls, Host denial/transport failure, and owned-process shutdown. They do not establish native compatibility or formal release acceptance.

## Two exact dependency graphs

The current graph is pinned to the following vendored candidate packages. These
are repository inputs, not a claim that the coordinates are published on npm.

| Package | Version | Browser/Next | Loopback Host |
|---|---|---|---|
| `@aikdna/kdna-core` | `0.24.0-rc.component-semantics.2` | yes | yes |
| `@aikdna/kdna-read` | `0.3.0-rc.component-semantics.2` | yes | yes |
| `@aikdna/kdna-web-client` | `0.5.0-rc.component-semantics.1` | yes | — |
| `@aikdna/kdna-react` | `0.6.0-rc.component-semantics.1` | yes | — |
| `@aikdna/kdna-web-server` | `0.5.0-rc.component-semantics.1` | — | yes |

Core and Read use identical pinned archive bytes in both graphs. The Host
package remains outside the browser dependency graph. The processes exchange
official HTTP bytes only.

`/api/demo-context` is private application coordination: it supplies a fresh transport association bound to the public selection, endpoint, caller session and request ID. Those browser-facing values prove no identity or authorization. The local startup owner generates a separate internal token for the Next-to-Host hop; the Host applies its independently configured local policy to the real Core inspection. The token is never sent to the browser.

The default local operator policy allows the explicitly requested valid input. For reproducible negative checks, startup accepts `KDNA_DEMO_POLICY=deny` or `transport`, and `KDNA_DEMO_DELAY_MS` from 0 to 2000. These are server launch settings, not browser authority claims. This localhost demo is not a multi-user or internet deployment.

Read responses are bounded to 1 MiB and each Read is limited to 5 seconds. Multipart forwarding is bounded to 12 MiB and context coordination to 32 KiB. Server stream finish is not remote application acknowledgement. Remote identity, authorization, revocation and replay remain subject to the official ViewModel proof limits.

This reference demo implements the local explicit Read flow described above. Retained expansion, native Reader interfaces, formal asset creation, and multi-user deployment are outside its supported behavior.
