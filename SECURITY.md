# Security policy

## Supported version

Security fixes are applied to the latest release on `main`.

## Report a vulnerability

Please use GitHub's private vulnerability reporting for this repository. Do not
open a public issue containing exploit details, credentials, protected asset
content, or deployment configuration.

## Deployment guidance

This repository is a local reference demo, not a production deployment recipe.
Before adapting it for a public service:

- terminate TLS before credential-bearing KDNA requests;
- add authentication, application authorization, rate limits, and audit policy;
- use a private, writable server-side storage location with bounded retention;
- keep encrypted payloads, passwords, license keys, and key material out of
  browser responses and logs;
- run the KDNA route in the Next.js Node.js runtime;
- review the security model published by `@aikdna/kdna-web-server@0.3.0`.

The application keeps a temporary exact PostCSS override in `package.json`
because the pinned Next.js release otherwise resolves a version affected by a
CSS serialization advisory. Keep the override until Next.js resolves an equal
or newer safe version itself.

The UI only renders the public projection returned by the current KDNA Web
Client and Web Server contracts. Errors shown in the browser must stay within
their bounded public shape. A user-selected file necessarily exists in the
browser before upload; the server must not return protected container entries
or credential material in its responses.
