#!/usr/bin/env bash
set -euo pipefail

SUBJECT="subdot.manager.filters.new"

# Usually, if testing locally, the NATS server is running on localhost
# Run the following before the script
# export NATS_URL=nats://localhost:4222 

# Check for empty NATS_URL and use default if unset
if [ -z "${NATS_URL:-}" ]; then
  echo "Using default NATS URL: nats://nats:4222"
else
  echo "Using NATS URL: $NATS_URL"
fi

nats --server "$NATS_URL" pub "$SUBJECT" \
  "$(cat "$(dirname "$0")/large-transfers.filter.json")"
echo "✅  Filter Spec sent to $SUBJECT"
