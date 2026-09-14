# Contributing

This repository is a small local reference integration. Keep the browser/server
boundary visible and reproducible.

## Requirements

- Node.js 22 or newer
- Google Chrome and the WebKit build matched to the locked Playwright version
- Registry access or a prepared npm cache for the framework dependencies

## Local checks

```bash
cd app
npm ci --ignore-scripts --no-audit --no-fund
npm --prefix host ci --ignore-scripts --no-audit --no-fund
npx playwright install webkit
KDNA_EVIDENCE_DIR="$(mktemp -d)" npm run ci
```

On Linux, `npx playwright install --with-deps chrome webkit` provisions both
browsers and their system dependencies. The CI and release-verification jobs run
both browser projects. Do not add project filters, skip the Host installation,
or substitute a command that only lists tests.

The browser suite generates synthetic fixtures locally. It starts production
Next and Host processes on temporary loopback ports and verifies their shutdown.
Use a new evidence directory for each run. See README for fixture generation and
individual build/test entry points.

## Boundaries

- Keep KDNA package coordinates and archive bytes exact in both dependency graphs.
- Keep file selection local. Send the read request only after an explicit Read.
- Consume the public Read ViewModel through the public React APIs; do not parse
  container payloads or render raw payload objects in the page.
- Preserve cancellation, release, stale-result suppression and bounded text output.
- Do not log credentials, provider responses, raw protected payloads, or local
  storage paths.
- Keep proof limits visible. A response does not grant local authorization or
  prove remote model use, behavior change, or content quality.
- Update README, CHANGELOG, tests, and lockfiles when their public behavior or
  coordinated dependency set changes.

Commits must include a Developer Certificate of Origin sign-off (`git commit -s`).
