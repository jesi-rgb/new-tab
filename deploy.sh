#!/usr/bin/env bash
#
# Build and deploy the new-tab app to Unikraft Cloud.
#
# Prerequisites:
#   - unikraft CLI installed:  https://unikraft.com/docs/cli/unikraft
#   - a running BuildKit builder (Docker is the easiest way)
#   - logged in:  unikraft login
#
# Usage:
#   ./deploy.sh                 # build + run with defaults
#   ORG=my-org ./deploy.sh      # override the image org/namespace
#   METRO=lon0 ./deploy.sh      # override the metro (default: fra)
#
set -euo pipefail

# --- Config (override via environment variables) -----------------------------
ORG="${ORG:-$(whoami)}"                 # image namespace / org
NAME="${NAME:-new-tab}"                 # app + image name
METRO="${METRO:-fra}"                   # Unikraft Cloud metro (e.g. fra, lon0, dal0)
MEMORY="${MEMORY:-512M}"                # instance memory
PORT_MAP="${PORT_MAP:-443:3000/tls+http}"  # adapter-node listens on 3000
COOLDOWN="${COOLDOWN:-1000}"            # scale-to-zero cooldown (ms)

IMAGE="${ORG}/${NAME}:latest"

echo "==> Building ${IMAGE} (metro: ${METRO})"
unikraft build . --output "${IMAGE}"

echo "==> Deploying ${IMAGE}"
unikraft run \
  --scale-to-zero "policy=on,cooldown-time=${COOLDOWN}" \
  --metro "${METRO}" \
  -p "${PORT_MAP}" \
  -m "${MEMORY}" \
  --image "${IMAGE}"

echo "==> Done. List instances with: unikraft instances list"
