#!/usr/bin/env bash
#
# Build and deploy the new-tab app to Unikraft Cloud.
#
# Prerequisites:
#   - unikraft CLI installed:  https://unikraft.com/docs/cli/unikraft
#   - docker running (used to host the BuildKit builder, started automatically)
#   - logged in:  unikraft login   (org must own the image namespace below)
#
# Usage:
#   ./deploy.sh
#
set -euo pipefail

SERVICE_NAME="new-tab-svc"
INSTANCE_NAME="new-tab"
METRO="fra"
ARCH="x86_64"
IMAGE="jesi-rgb/new-tab:latest"
DOMAIN="new-tab"
PROFILE="jesi-rgb"
BUILDKIT_IMAGE="moby/buildkit:latest"

# kraft talks to BuildKit over KRAFTKIT_BUILDKIT_HOST, defaulting to the
# docker-container://buildkitd builder. Only a docker-container:// host is
# ours to manage; anything else (tcp://, unix://) is left to the user.
buildkit_host="${KRAFTKIT_BUILDKIT_HOST:-docker-container://buildkitd}"

ensure_buildkit() {
  case "$buildkit_host" in
  docker-container://*) ;;
  *)
    echo "Using external BuildKit host $buildkit_host, skipping builder startup."
    return
    ;;
  esac

  local container="${buildkit_host#docker-container://}"

  if ! command -v docker >/dev/null 2>&1; then
    echo "docker not found; it is required to run the BuildKit builder." >&2
    exit 1
  fi

  if ! docker info >/dev/null 2>&1; then
    echo "docker daemon is not reachable; start Docker and retry." >&2
    exit 1
  fi

  case "$(docker inspect -f '{{.State.Status}}' "$container" 2>/dev/null)" in
  running)
    echo "BuildKit builder $container already running."
    ;;
  "")
    echo "Starting BuildKit builder $container..."
    docker run -d --name "$container" --privileged "$BUILDKIT_IMAGE" >/dev/null
    ;;
  *)
    echo "Restarting BuildKit builder $container..."
    docker start "$container" >/dev/null
    ;;
  esac

  # buildkitd needs a moment before it accepts connections.
  for _ in $(seq 1 30); do
    if docker exec "$container" buildctl debug workers >/dev/null 2>&1; then
      return
    fi
    sleep 1
  done

  echo "BuildKit builder $container did not become ready in time." >&2
  exit 1
}

# `unikraft <kind> list` exits non-zero when *any* configured client errors
# (e.g. a 401 from an unrelated metro), even though the metros it could reach
# are listed correctly. Under `pipefail` that status would poison every
# existence check, so capture the output and judge on content instead. Empty
# stdout plus a non-empty stderr means the listing genuinely failed.
list_quiet() {
  local kind="$1" out err
  err="$(mktemp)"
  out="$(unikraft "$kind" list -o quiet 2>"$err")" || true
  if [ -z "$out" ] && [ -s "$err" ]; then
    echo "Failed to list ${kind}:" >&2
    cat "$err" >&2
    rm -f "$err"
    exit 1
  fi
  rm -f "$err"
  printf '%s\n' "$out"
}

echo "Switching to $PROFILE..."
unikraft profile use $PROFILE

ensure_buildkit

# Create the service if it doesn't exist yet.
# The service holds the stable domain — only needs to run once.
if grep -q "/$SERVICE_NAME$" <<<"$(list_quiet services)"; then
  echo "Service $SERVICE_NAME already exists, skipping."
else
  echo "Creating service $SERVICE_NAME..."
  unikraft services create \
    --name "$SERVICE_NAME" \
    --metro "$METRO" \
    --domain "$DOMAIN" \
    --service 443:3000/tls+http
fi

# Remove the existing instance and wait until it's gone.
if grep -q "/$INSTANCE_NAME$" <<<"$(list_quiet instances)"; then
  echo "Removing existing instance..."
  unikraft instances delete "$INSTANCE_NAME"
  echo "Waiting for instance to be removed..."
  unikraft instances wait "$INSTANCE_NAME" --state stopped 2>/dev/null || true
fi

echo "Building image..."
# Pin the arch: kraft would otherwise also build the host's arm64 target, which
# fails because the Dockerfile copies the x86_64 musl loader. Unikraft Cloud
# runs x86_64 here, matching `architecture:` in the Kraftfile.
unikraft build . --arch "$ARCH" --output "$IMAGE"

echo "Deploying..."
unikraft instances create \
  --name "$INSTANCE_NAME" \
  --metro "$METRO" \
  --image "$IMAGE" \
  --service "$SERVICE_NAME" \
  --scale-to-zero policy=on \
  -m 512M \
  --autostart

echo ""
echo "Done. Service domain:"
unikraft services get "$SERVICE_NAME" -f domains
