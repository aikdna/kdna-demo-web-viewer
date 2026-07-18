# Changelog

## 0.1.0 - 2026-07-18

- Rebuild the reference viewer on KDNA Core 0.20.0, Web Client 0.2.2,
  Web Server 0.3.0, and React 0.3.0 using exact dependency coordinates.
- Replace the removed historical asset URL with the public 0.1.1
  Laozi-inspired reference asset.
- Serialize Runtime Capsule context explicitly instead of passing objects to
  React as children.
- Add production-build, real-browser inspect-to-load, public-surface, CodeQL,
  and release-context gates.
- Keep Core and Web Server on Next.js's server-package boundary so the
  published Runtime schemas resolve without being rewritten by the bundler.
- Override Next.js's compatible PostCSS dependency to 8.5.10 so the production
  dependency audit does not retain the earlier CSS serialization advisory.
- Document the browser/server credential and storage boundary without implying
  Host delivery, model consumption, content correctness, or production safety.
- Verify the public Core 0.20.0 password conformance fixture through browser
  inspect, locked LoadPlan, password unlock, and Runtime Capsule loading.
- Require the full canonical Apache-2.0 license and bind stable releases to a
  unique first CHANGELOG heading on authoritative `origin/main` history.
