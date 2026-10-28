# Reproduce the SDK → API → GUI evidence demo

This is a first-party, synthetic integration example. The Python SDK produces
the signed evidence. The API loads the TypeScript SDK and recomputes the checks.
The GUI displays that API report and preserves the evidence for inspection.
The browser does not independently repeat the cryptographic verification.

## Reviewed revisions

| Component | Revision |
| --- | --- |
| VCP SDK and generated evidence | `eb8df265a09f2415154de2ae2a617bb502c558d2` |
| Explorer API and SDK adapter | `31fe74c36a5d8cac0951de54e30e18197f5b0574` |
| Explorer GUI | The checkout containing this guide and `tools/run-evidence-demo.mjs` |
| VCP specification targeted by the SDK | `b23acb266f88df81d960d36d58fb64ceaa0dd5ed` (`v1.2.0`) |

The CI workflow pins the SDK and API commits. SDK `0.1.0` is a prerelease;
the SDK's implementation interpretations are not newly adopted protocol rules.
This example changes no frozen specification, historical evidence or release tag.

## Start the local example

Use Node.js 24.22.1 (or a later 24.x patch) and npm 11+. Start from this GUI
checkout. In a fresh working parent directory, create the two sibling checkouts:

```sh
git clone https://github.com/veritaschain/vcp-sdk.git ../vcp-sdk
git -C ../vcp-sdk checkout eb8df265a09f2415154de2ae2a617bb502c558d2
git clone https://github.com/veritaschain/vcp-explorer-api.git ../vcp-explorer-api
git -C ../vcp-explorer-api checkout 31fe74c36a5d8cac0951de54e30e18197f5b0574

npm --prefix ../vcp-sdk/typescript ci
npm --prefix ../vcp-explorer-api ci
npm ci

node tools/run-evidence-demo.mjs
```

Open **http://localhost:5173/evidence-demo**. Choose a case and select **Run
verification**. The launcher builds all three components, enables the API's
optional evidence routes, and serves the production GUI build on loopback.
Ctrl+C stops the two processes it started. No package installation, real trade,
external anchoring, or upload is performed by the launcher.

If the checkouts are elsewhere or the default ports are occupied:

```sh
node tools/run-evidence-demo.mjs --sdk-dir /path/to/vcp-sdk --api-dir /path/to/vcp-explorer-api --api-port 3301 --gui-port 5517
```

The launcher explicitly selects the local API for both `VITE_API_BASE_URL` and
`VITE_EVIDENCE_API_BASE_URL`, overriding inherited endpoint settings. Its build
uses `VITE_USE_MOCK=false` and the browser router. Ordinary GUI builds may use
different settings; rerun the normal build before publishing a different mode.
The local integration build is not a public deployment.

## Expected results and their meaning

| Case | Local checks | Full evidence | What differs |
| --- | --- | --- | --- |
| Intact signed evidence | `VALID` | `INDETERMINATE` | Three synthetic INIT/SIG/ORD events and configured demo keys |
| Payload changed after signing | `INVALID` | `INVALID` | Order price changes from `151.230` to `999.000`; the original signature, hash and proof remain |
| Trusted key unavailable | `INDETERMINATE` | `INDETERMINATE` | Exact same evidence as intact; separate configuration supplies no trusted key |

The full evidence result includes the missing external anchor and root
authentication checks. No case supplies a real external timestamp or receipt.
Only `external_anchor` and `root_authenticity` are excluded from the separately
labeled local aggregate, and both remain visible in the report. A local `VALID`
does not establish full evidence verification, conformance, certification,
production suitability, source identity or completeness of real-world activity.

The RFC 8032 TEST 1 signing seed is **public**. Anyone can sign using it. It
demonstrates cryptographic mechanics and is never an operational identity.
The trust configuration is an explicit operator choice, separate from the
evidence bundle; a key included in evidence is not automatically trusted.

## Evidence and verification path

`vcp-sdk/examples/explorer-demo/bundle.json` contains the cases, the exact event
JSONL and AnchorRecord strings, and genuine SDK-generated inclusion proofs.
Each proof carries its actual three-leaf `tree_size`. `trust.json` independently
selects the event/root public keys for each case. Neither file contains a canned
verification report. The generator is `vcp-sdk/tools/generate_explorer_demo.py`.

The API parses the inner evidence with the SDK's strict bigint-preserving
parser. Each request recomputes hashes, event and root signatures, batch
bindings, chain continuity and inclusion. Inclusion uses the hash recomputed
from the supplied payload, not just the event's stale claimed hash. Detached
proof IDs, indices, counts and roots must also match the supplied batch.

The outer HTTP JSON carries the signed records as strings. The GUI never parses
and reserializes those strings before display or download, so nanosecond integers
such as `1793145600123456789` remain exact. API reports are labeled as API
verification; the GUI additionally rejects internally inconsistent summary and
check statuses. A network or report error clears the old result and never
substitutes legacy mock data.

The existing `/v1/events` API fixtures and legacy dashboard are separate.
This example does not turn those historical mock fixtures into verified data.

## Configuration and HTTP contract

The launcher supplies these API variables as absolute local paths:

| Variable | Purpose |
| --- | --- |
| `VCP_EVIDENCE_BUNDLE` | SDK-generated bundle JSON |
| `VCP_EVIDENCE_TRUST` | Separate case/key configuration |
| `VCP_EVIDENCE_SDK_MODULE` | Built `vcp-sdk/typescript/dist/index.js` |
| `VCP_EVIDENCE_ORIGIN` | One exact GUI HTTP origin allowed by CORS |
| `HOST` / `PORT` | Loopback binding and selected API port |

The SDK, bundle and trust variables must all be present. Invalid or unsupported
configuration prevents startup. Without this configuration, the optional routes
are not registered. Clients cannot select file paths, modules or trust keys over
HTTP. A module path is executable operator configuration, not untrusted evidence.

- `GET /v1/evidence-demo/cases` returns case metadata and disclosure.
- `GET /v1/evidence-demo/cases/:id/verification` returns a freshly computed
  report, the exact evidence strings, real proofs and trust-setting information.
- Unknown cases/routes return `404`; errors do not become passing verdicts.

For the complete adapter contract and verification limits, see the API's
`docs/EVIDENCE_DEMO.md` and the SDK's `examples/explorer-demo/README.md` at the
pinned revisions above.

## Run the real integration checks

After installing dependencies, the HTTP check starts the actual API, uses the
actual SDK and production GUI build, checks all three statuses and exact evidence
strings, and shuts down the owned processes:

```sh
node tools/run-evidence-demo.mjs --check
```

The browser test additionally exercises case selection, per-check scope,
downloads, a mobile viewport, and failure behavior. It never mocks a successful
verification response. A network failure is deliberately injected to check
that an earlier local success is removed.

```sh
npm install --prefix /tmp/vcp-evidence-browser-tools --ignore-scripts --no-audit --save-exact playwright@1.56.1
node /tmp/vcp-evidence-browser-tools/node_modules/playwright/cli.js install chromium
PW_MODULE=/tmp/vcp-evidence-browser-tools/node_modules/playwright node tools/run-evidence-demo.mjs --browser-check
```

On Linux, Playwright may also require its documented system libraries; the CI
uses `install --with-deps chromium` on Ubuntu 24.04. The test saves screenshots
and `results.json` under ignored `evidence-demo-test-output/`. These are
first-party test results, not independent reproduction or evidence of an
external anchor. The tested local environment is Linux; no Windows browser
execution is asserted.

To regenerate the evidence, use a Python environment with the SDK's declared
dependencies, then run from the SDK checkout:

```sh
PYTHONPATH=python/src python tools/generate_explorer_demo.py
git diff --exit-code -- examples/explorer-demo/bundle.json examples/explorer-demo/trust.json
```

The SDK tests verify regeneration and cross-language checks. The API has a
separate `npm run test:evidence` integration suite; its environment and the
ordinary test suite are documented in the API guide.
