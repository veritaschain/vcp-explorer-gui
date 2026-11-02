#!/usr/bin/env bash
# Exercise the built image, including headers on assets and non-2xx responses.
set -euo pipefail

image="${1:-vcp-explorer-gui:ci}"
temporary_directory=$(mktemp -d)
container=

cleanup() {
  status=$?
  trap - EXIT
  if [[ -n "$container" ]]; then
    docker logs "$container" || true
    docker rm -f "$container" >/dev/null || true
  fi
  rm -rf "$temporary_directory"
  exit "$status"
}
trap cleanup EXIT

container=$(docker run --detach --cap-drop ALL --security-opt no-new-privileges \
  --publish 127.0.0.1::8080 "$image")
test "$(docker exec "$container" id -u)" -ne 0
docker exec "$container" nginx -t
base_url="http://$(docker port "$container" 8080/tcp)"

curl --fail --silent --show-error --retry 10 --retry-all-errors --retry-delay 1 \
  --max-time 5 --retry-max-time 30 --dump-header "$temporary_directory/index.headers" \
  --output "$temporary_directory/index.html" "$base_url/"

# Check the Dockerfile's real health command, rather than only probing the host.
health=starting
for attempt in {1..40}; do
  health=$(docker inspect --format '{{.State.Health.Status}}' "$container")
  if [[ "$health" == healthy ]]; then break; fi
  if [[ "$health" == unhealthy ]]; then
    echo 'The image health check failed.' >&2
    exit 1
  fi
  sleep 1
done
test "$health" = healthy

header_value() {
  awk -v wanted="$2" 'tolower($0) ~ "^" wanted ": *" {
    sub(/^[^:]*: */, ""); sub(/\r$/, ""); print
  }' "$1"
}

csp=$(header_value "$temporary_directory/index.headers" content-security-policy)
[[ "$csp" == *"script-src 'self';"* ]]
[[ "$csp" == *"object-src 'none';"* ]]
[[ "$csp" == *"frame-ancestors 'self';"* ]]
[[ "$csp" != *unsafe-eval* ]]

asset=$(sed -n 's/.*src="\([^"]*\/assets\/[^"]*\.js\)".*/\1/p' "$temporary_directory/index.html")
test -n "$asset"
for path in / /search /evidence-demo "$asset" /api/v1/events /assets/not-found.js; do
  expected_status=200
  case "$path" in /api/*|/assets/not-found.js) expected_status=404;; esac
  actual_status=$(curl --silent --show-error --max-time 5 \
    --dump-header "$temporary_directory/response.headers" --output /dev/null \
    --write-out '%{http_code}' "$base_url$path")
  test "$actual_status" = "$expected_status"
  test "$(header_value "$temporary_directory/response.headers" content-security-policy)" = "$csp"
  test "$(header_value "$temporary_directory/response.headers" x-content-type-options)" = nosniff
  test "$(header_value "$temporary_directory/response.headers" x-frame-options)" = SAMEORIGIN
  test "$(header_value "$temporary_directory/response.headers" referrer-policy)" = strict-origin-when-cross-origin
done

echo 'Container smoke passed: non-root runtime, health, SPA routes, assets, API 404 and security headers.'
