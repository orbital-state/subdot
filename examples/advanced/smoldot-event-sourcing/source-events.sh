#!/bin/bash
# This script demonstrates how to use subdot to filter events from a smoldot source
TARGET=$1
if [ -z "$TARGET" ]; then
    echo "Usage: $0 <target>, which is in {\"nats://localhost:4222\", \"stdout\"}" 
    exit 1
fi

subdot filter \
    --source smoldot.wss://rpc.polkadot.io \
    --query 'true' \
    --target "$TARGET"
