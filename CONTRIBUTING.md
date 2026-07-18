# Contributing

This repository is a deliberately small reference integration. Changes should
keep the browser/server boundary visible and reproducible.

## Requirements

- Node.js 20.9 or newer
- The public `laozi-wuwei-0.1.1.kdna` asset for browser verification
- Core commit `1e77e3e`'s public `test_protected_entry.kdna` conformance fixture

## Local checks

```bash
cd app
npm ci
npm test
npm run build
KDNA_DEMO_ASSET=/path/to/laozi-wuwei-0.1.1.kdna \
KDNA_PROTECTED_DEMO_ASSET=/path/to/test_protected_entry.kdna \
npm run test:e2e
```

Before opening a pull request, run `npm run ci` with `KDNA_DEMO_ASSET` set.

## Boundaries

- Keep all KDNA package coordinates exact.
- Do not bypass inspect or LoadPlan by unpacking or reading expanded asset data.
- Do not render Runtime objects directly as React children. Serialize or project
  them into deliberate UI fields.
- Do not log credentials, provider responses, raw protected payloads, or local
  storage paths.
- Do not claim that loading proves Host delivery, model use, behavior change,
  or content quality.
- Update README, CHANGELOG, tests, and the lockfile when public behavior or the
  coordinated dependency set changes.

Commits must include a Developer Certificate of Origin sign-off (`git commit -s`).
