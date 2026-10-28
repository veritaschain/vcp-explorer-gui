# Static Explorer deployment profile

The `veritaschain/vcp-explorer-gui` repository contains a mock-data reference UI.
The public `https://veritaschain.org/explorer/app/` path is presently served from
`veritaschain/vcp-site/explorer/app/`, **not** automatically from this repository.
The legacy static Explorer is already live there. The new Evidence Demo is not
published, and no public Node evidence-verification API has been verified.

## Why this profile exists

GitHub Pages serves static files but cannot natively rewrite arbitrary
`/explorer/app/events/<id>` requests to the SPA entry point. Using an ordinary
`BrowserRouter` and a production build whose asset base is `/` causes broken
asset or deep links after copying to `/explorer/app/`.

The ordinary Docker development/release build continues to use
`BrowserRouter`. The static-host profile opts into `HashRouter`; its links
look like `/explorer/app/#/events/<id>`, so the server receives only the
existing `/explorer/app/` path.

## Build (reviewed staging instructions, not a deploy command)

Pin the source commit, Node/npm version and lockfile in the build record.

```sh
npm ci
VITE_USE_MOCK=true VITE_ROUTER_MODE=hash \
  VITE_API_BASE_URL= VITE_EVIDENCE_API_BASE_URL= \
  npm run build -- --base=/explorer/app/
npm test
```

The generated `dist/index.html` must reference
`/explorer/app/assets/<hashed>.js` and
`/explorer/app/assets/<hashed>.css`.
The Chromium static-subpath CI must exercise search, event, certificate,
direct hash-route reloads and the explicit **Demo data — not verified**
label before publication.

This build keeps the legacy routes in mock mode and leaves Evidence Demo
unconfigured. A future public Evidence Demo needs a verified public API URL
supplied through `VITE_EVIDENCE_API_BASE_URL` at **build time** (or an explicitly
configured `VITE_API_BASE_URL`). Static files alone do not deploy that API.
Do not copy the local launcher's build to production: it embeds loopback API
URLs and uses the local browser-router profile, not this static-host profile.

## Review and publication boundaries

1. Stage the generated hashed `dist/assets` files and public logo into a new
   `vcp-site` PR without deleting old assets, which remain for rollback.
2. Do **not** blindly overwrite the public `explorer/app/index.html` with
   Vite's generated index. The current site entry point has canonical/OG/JSON-LD
   metadata and the **24 October 2026 integrity-review notice**. Preserve
   these verbatim when updating only script/CSS references to reviewed assets.
3. Confirm the actual GitHub Pages branch/root and deployment mechanism before
   merging that site PR. Passing a GitHub source CI is not a deployment.
4. After publication, use an independent GET of public HTML and its linked
   JS/CSS to confirm exact content hashes and validate rendered route navigation.
   Keep the previous index and bundle hashes for rollback.

## Claims that remain prohibited

- `VITE_USE_MOCK=false` now enables API requests for the legacy routes;
  it does not deploy or establish the availability of a backend. The public
  legacy Explorer still shows synthetic data. Evidence Demo uses its configured
  API independently of this flag. Do not advertise a deployed evidence service
  until its API and published GUI have been verified.
- A displayed event 'certificate' is a demonstration/print view, not
  VeritasChain Certified (VC-Certified) status or a compliance finding.
- PDF printing is handled by the browser; it is not a custom exported
  cryptographic certificate format.
- This deployment profile does not establish VCP/VAP independent reproduction,
  implementation conformance, third-party certification or a published release.
