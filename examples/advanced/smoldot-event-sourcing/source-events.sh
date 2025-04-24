#!/bin/bash
# This script demonstrates how to use subdot to filter events from a smoldot source
subdot filter \
    --source smoldot.wss://rpc.polkadot.io \
    --query 'true' \
    --output-format json