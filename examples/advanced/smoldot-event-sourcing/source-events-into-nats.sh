#!/bin/bash
# This script demonstrates how to use subdot to source events from a smoldot source into stdout

subdot filter \
    --source smoldot.wss://rpc.polkadot.io \
    --query 'true' \
    --target nats://localhost:4222/polkadot.events
