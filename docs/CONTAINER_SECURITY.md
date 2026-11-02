# Container and CI security

## Runtime image pin

The production stage uses `nginx/nginx-unprivileged:stable-alpine` at this
multi-platform OCI index digest:

```text
sha256:44e74ca483234093081138b6d7b6f561d55557756a2deefc3a5056148defeb99
```

On 2026-11-02, the digest returned by the
[official Docker registry](https://registry-1.docker.io/v2/nginx/nginx-unprivileged/manifests/stable-alpine)
matched the SHA-256 of the downloaded index bytes. The Linux/amd64 child manifest
is `sha256:7b5016a10b41639c79df145998c67da5e51ca0aaf80083e836f5168c1858a1da`.
Its config identifies NGINX `1.30.6`, user `101`, port `8080`, and source revision
`679834d1aa245a42e680d380c6b57785cfaa2115` of
[nginx/docker-nginx-unprivileged](https://github.com/nginx/docker-nginx-unprivileged).
The child manifest and config bytes were also checked against their digests.
This records the registry content that was selected; it is not a claim of an
independent source-to-binary audit or signature attestation.

The [upstream registry guidance](https://github.com/nginx/docker-nginx-unprivileged#image-registries)
uses the `nginx/nginx-unprivileged` Docker Hub namespace for stable releases from
`1.30.6`. The older `nginxinc/nginx-unprivileged` namespace applies to earlier
releases. The Dockerfile follows the maintained namespace and makes UID/GID
`101:101` explicit. NGINX, Compose, the image health check and CI all use container
port `8080`.

For updates, retrieve the candidate index from the official registry, verify its
content digest, inspect the selected platform config, update the Dockerfile pin,
then run the container smoke against the resulting build. Retain the digest and
review date in this document. A digest stops a mutable tag from silently selecting
different runtime bytes; security updates still require an intentional pin update.
The Node builder currently uses the exact version tag `24.22.1-alpine`, not a
content digest.

## Content Security Policy

The response policy in `nginx.conf` permits same-origin scripts only; it does not
allow inline scripts or `eval`. It permits Google's stylesheet and font origins
because `index.html` uses Google Fonts. Inline styles remain allowed because
React/Framer Motion and the bundled SVG use style attributes.

Connections are limited to the serving origin, the default
`https://explorer.veritaschain.org` API, and the documented local API at
`http://127.0.0.1:3001` or `http://localhost:3001`. A deployment using a different
`VITE_API_BASE_URL` or `VITE_EVIDENCE_API_BASE_URL` must explicitly add that API
origin to `connect-src` and enable the appropriate CORS policy on the API.
The header is supplied by the production NGINX server; it is not a policy for
Vite's development server.

Security headers use `always` at server scope. Static asset locations use
`expires` without overriding `add_header`, so they inherit the same policy as
HTML and error responses. The API prefix returns 404 even when the path has a
static-asset extension. No backend or production authentication is bundled.

## CI action pins and checks

Official action references were resolved on 2026-11-02:

| Action reference | Commit |
| --- | --- |
| [actions/checkout v4](https://api.github.com/repos/actions/checkout/git/ref/tags/v4) | `11d5960a326750d5838078e36cf38b85af677262` |
| [actions/setup-node v4](https://api.github.com/repos/actions/setup-node/git/ref/tags/v4) | `49933ea5288caeca8642d1e84afbd3f7d6820020` |
| [actions/upload-artifact v4](https://api.github.com/repos/actions/upload-artifact/git/ref/tags/v4) | `ea165f8d65b6e75b540449e92b4886f43607fa02` |

The workflow gives its token read-only repository contents access and disables
checkout credential persistence. It runs the existing lint, build and tests,
builds the pinned runtime image, and invokes `tools/smoke-container.sh` against
that image. The smoke starts it with all Linux capabilities dropped and no new
privileges; it checks a nonzero UID, NGINX configuration, Docker health, SPA
routes, a real built JavaScript asset, API rejection and matching security
headers on 200/404 responses.

The change was prepared in an environment without Docker or Podman. Local
application checks do not substitute for this container job. Successful smoke
execution is required before treating the runtime change as validated.
