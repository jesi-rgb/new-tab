#!/usr/bin/env bash
#
# Build and deploy the new-tab app to Unikraft Cloud.
#
# Prerequisites:
#   - unikraft CLI installed:  https://unikraft.com/docs/cli/unikraft
#   - a running BuildKit builder (Docker is the easiest way)
#   - logged in:  unikraft login   (org must own the image namespace below)
#
# Usage:
#   ./deploy.sh
#
set -euo pipefail

SERVICE_NAME="new-tab-svc"
INSTANCE_NAME="new-tab"
METRO="fra"
IMAGE="jesi-rgb/new-tab:latest"
DOMAIN="new-tab"

# Create the service if it doesn't exist yet.
# The service holds the stable domain — only needs to run once.
if ! unikraft services list -o quiet 2>/dev/null | grep -q "/$SERVICE_NAME$"; then
  echo "Creating service $SERVICE_NAME..."
  unikraft services create \
    --name "$SERVICE_NAME" \
    --metro "$METRO" \
    --domains "$DOMAIN" \
    --services 443:3000/tls+http
else
  echo "Service $SERVICE_NAME already exists, skipping."
fi

# Remove the existing instance and wait until it's gone.
if unikraft instances list -o quiet 2>/dev/null | grep -q "/$INSTANCE_NAME$"; then
  echo "Removing existing instance..."
  unikraft instances delete "$INSTANCE_NAME"
  echo "Waiting for instance to be removed..."
  unikraft instances wait "$INSTANCE_NAME" --state stopped 2>/dev/null || true
fi

echo "Building image..."
unikraft build . --output "$IMAGE"

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
