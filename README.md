# KDNA Web Asset Viewer

The official reference demo for integrating a `.kdna` judgment asset into a
browser application. It uses the KDNA React components in the browser and the
KDNA Web Server adapter in a Next.js Node.js route.

The demo exercises the compatible consumption path:

```text
upload → inspect → LoadPlan → load and project → Runtime Capsule context
```

It does not claim that a model used the loaded judgment, that the asset's
content is correct, or that this unauthenticated local demo is production-ready.

## Exact stack

| Package | Version | Responsibility |
|---|---:|---|
| `@aikdna/kdna-core` | `0.20.0` | Format and Runtime contracts |
| `@aikdna/kdna-web-client` | `0.2.2` | Browser HTTP boundary |
| `@aikdna/kdna-web-server` | `0.3.0` | Node.js inspect, plan, and load routes |
| `@aikdna/kdna-react` | `0.3.0` | Browser components and hooks |

The application requires Node.js 20.9 or newer because of its Next.js and KDNA
consumer dependencies.

## Run it

```bash
git clone https://github.com/aikdna/kdna-demo-web-viewer.git
cd kdna-demo-web-viewer/app
npm ci
npm run dev
```

Open <http://localhost:3000>.

Download the current Laozi-inspired public reference asset:

```bash
curl -LO https://github.com/aikdna/kdna-assets/releases/download/0.1.1/laozi-wuwei-0.1.1.kdna
```

Drop the file into the page. The UI renders public inspect metadata, the
LoadPlan state, and the loaded Runtime Capsule context. Structured Runtime data
is serialized explicitly; it is never passed to React as a raw object child.

## Verify it

The browser test launches the production Next.js server and loads the immutable
`laozi-wuwei-0.1.1.kdna` reference asset through the real HTTP route. It also
loads Core commit `1e77e3e0d486c330fe9f9262b514ef24c859d469`'s public
`fixtures/test_protected_entry.kdna` conformance vector, verifies the locked
LoadPlan, enters that fixture's openly published test password, and verifies
the returned Runtime Capsule. The fixture and password are public test vectors,
not credentials or examples for protecting a real asset.

```bash
npm test
npm run build
KDNA_DEMO_ASSET=/path/to/laozi-wuwei-0.1.1.kdna \
KDNA_PROTECTED_DEMO_ASSET=/path/to/test_protected_entry.kdna \
npm run test:e2e
```

`npm run ci` runs source checks, a moderate-or-higher production dependency
audit, the production build, and the browser test.

## Security boundary

- Uploaded files are held in server-side temporary storage; the configured
  storage directory must never be publicly served.
- Passwords and license keys are request-scoped. They must be sent over HTTPS
  outside loopback development and must not be logged or persisted.
- The browser receives public inspect fields, LoadPlan state, and authorized
  Runtime Capsule context from the server. The server does not return protected
  payload bytes, passwords, license keys, or server-side key material. The
  browser necessarily holds the local file bytes selected for upload.
- This local demo intentionally omits authentication, application authorization,
  rate limiting, durable shared storage, and audit logging. Add those controls
  before adapting it for a production deployment.
- The verified server target is the Next.js Node.js runtime, not an Edge runtime.

See [SECURITY.md](./SECURITY.md) for reporting and deployment guidance.

## Repository layout

- `app/app/page.jsx` — browser flow and explicit structured-data rendering
- `app/app/api/kdna/[...route]/route.js` — Node.js KDNA server adapter
- `app/next.config.mjs` — server-only package boundary for Core Schema loading
- `app/tests/e2e/viewer.spec.mjs` — real browser and HTTP integration
- `.github/workflows/` — immutable CI, CodeQL, and release verification

## Related projects

- [KDNA Core](https://github.com/aikdna/kdna)
- [KDNA React](https://github.com/aikdna/kdna-react)
- [KDNA Web Client](https://github.com/aikdna/kdna-web-client)
- [KDNA Web Server](https://github.com/aikdna/kdna-web-server)
- [Create KDNA Web App](https://github.com/aikdna/create-kdna-web-app)
- [KDNA Assets](https://github.com/aikdna/kdna-assets)

## License

Apache-2.0
