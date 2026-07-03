# KDNA Demo: Web Asset Viewer

Official demo showing how to build a browser-based KDNA asset viewer using `@aikdna/kdna-react` and `@aikdna/kdna-web-server`.

## What this demo proves

A developer who has never seen KDNA can:

1. Clone this repo
2. Run `npm install && npm run dev`
3. Open `http://localhost:3000`
4. Drop a `.kdna` file into the browser
5. See the asset's metadata, LoadPlan, and judgment context — all rendered in React

No CLI required. No backend beyond the Next.js API route.

## Quick start

```bash
git clone https://github.com/aikdna/kdna-demo-web-viewer.git
cd kdna-demo-web-viewer/app
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

## Get a .kdna file to try

```bash
curl -LO https://github.com/aikdna/kdna-assets/releases/download/agent-project-context-v0.1.2/agent-project-context-v0.1.2.kdna
```

Drag the downloaded `.kdna` file into the browser UI.

## What's inside

- `app/` — Next.js app (scaffolded with `create-kdna-web-app`)
  - `app/page.jsx` — React UI with `KDNAFileDropzone`, `KDNAAssetInspector`, `KDNALoadPlanGate`
  - `app/api/kdna/[...route]/route.js` — Server API using `@aikdna/kdna-web-server`
  - `app/layout.jsx` — Root layout
- Uses `@aikdna/kdna-react` for browser components
- Uses `@aikdna/kdna-web-server` for server-side validation and load

## Why KDNA?

Without KDNA, giving an AI agent domain judgment means either:
- Pasting a long prompt every time (fragile, unverifiable)
- Hoping the agent "knows" your domain (uncontrollable)

KDNA packages judgment into a `.kdna` file — inspectable, verifiable, and loadable with one command. This demo shows the browser side of that equation.

## Related

- [KDNA CLI](https://github.com/aikdna/kdna-cli) — command-line runtime
- [KDNA React](https://github.com/aikdna/kdna-react) — React components used in this demo
- [KDNA Web Server](https://github.com/aikdna/kdna-web-server) — server adapters used in this demo
- [Create KDNA Web App](https://github.com/aikdna/create-kdna-web-app) — scaffolder that generated this app
- [KDNA Assets](https://github.com/aikdna/kdna-assets) — official asset catalog

## License

Apache 2.0
