# subdot

A real-time event processing tool for Substrate-based blockchains.

Think of it as a swiss army knife for blockchain events, a real-time stream processor, a programmable, operator-grade toolkit, a lightweight TUI dashboard, and a modern queryable event router for Polkadot and beyond.

> Inspired by network tools like nc, terminal UIs like htop, and data languages like KQL/jq.

## Overview

Subdot is a lightweight, real-time event processing tool designed for Substrate-based blockchains. It captures finalized events using the Smoldot light client and leverages NATS JetStream for robust, durable message delivery and payload-based filtering.

Subdot is designed to be fast, efficient, and easy to use, with a focus on real-time event processing and programmability. It is built with TypeScript and uses modern libraries for CLI parsing, TUI rendering, and configuration management.

It is designed to evolve into a multi-service architecture supporting advanced analytics and custom subscriber routing. This will enhance the flexibility and scalability of the application, allowing it to adapt to various use cases and user requirements.

## Features
- Real-time event processing
- Streaming DQL execution
- Temporal joins
- Time-based aggregation (binning)
- Event filtering and routing
- Multiple outputs (console, file, NATS, tcp, http)
- Configurable sources
- Kubernetes-ready
- Future: Interactive TUI
- Future: live-editable rules, multi-stream event replay
- Future: enhanced logging and monitoring capabilities
- Future: support for historical backfilling via SubQuery or Subsquid APIs

# Polkadot Streams

## Overview
Subdot is designed to work with Substrate-based blockchains, particularly Polkadot and Kusama. It captures finalized events from the blockchain and routes them into NATS subjects for further processing.

Subdot leverages NATS to route blockchain events into logically structured subject hierarchies. These subjects allow for flexible subscription and stream configuration, enabling selective listening and durable processing using JetStream.

    💡 No need to pre-create NATS subjects: NATS subjects are dynamic. You can publish to any subject at any time — there's no need to predefine them. If you want to persist events, you can create a JetStream stream that binds to a wildcard subject (e.g., polkadot.events.>).

## Subject Design Pattern

Events are published with the subject format:

polkadot.events.<section>.<method>

    <section>: The Substrate pallet/module (e.g., balances, staking, system)

    <method>: The event name inside that section (e.g., Transfer, Reward, ExtrinsicSuccess)

This enables extremely granular control. You can:

    Subscribe to everything: polkadot.events.>

    Just balances events: polkadot.events.balances.*

    Just transfers: polkadot.events.balances.Transfer

    Only system events: polkadot.events.system.*

    Only extrinsic failures: polkadot.events.system.ExtrinsicFailed

## Predefined NATS Subjects (Polkadot)

Below is more of a convention for the subject design pattern. You can use any subject you like, but we recommend using the following format for consistency and ease of use.

    polkadot.events.<section>.<method> 

Here are some useful combinations to start with:

| Subject | Description |
| ------- | ----------- |
| ------- | ----------- |
| polkadot.events.> | All finalized events from Polkadot |
| polkadot.events.system.* | All system-level events like ExtrinsicSuccess, ExtrinsicFailed, NewAccount |   
| ------- | ----------- |
| polkadot.events.> | All finalized events from Polkadot |
| polkadot.events.system.* | All system-level events like ExtrinsicSuccess, ExtrinsicFailed, NewAccount |
| polkadot.events.system.ExtrinsicSuccess | Only successful extrinsic executions |
| polkadot.events.system.ExtrinsicFailed | Only failed extrinsics |
| polkadot.events.balances.Transfer | Token transfers between accounts |
| polkadot.events.balances.* | All events from the Balances pallet |
| polkadot.events.staking.Reward | Staking rewards paid to validators/nominators |
| polkadot.events.staking.Slashed | Slashing events due to misbehavior |
| polkadot.events.treasury.Proposed | New treasury proposals submitted |
| polkadot.events.*.* | Any two-level wildcard for exploration purposes |

    ✨ You can create a durable JetStream stream on any of these using nats stream add and a **subject filter**.

## Example: Create a JetStream for only transfers

```bash
nats stream add polkadot_transfers \
  --subjects "polkadot.events.balances.Transfer" \
  --storage file \
  --retention limits \
  --max-age 48h
```

This keeps only the last 48 hours of Polkadot token transfer events.

## Example: Create a JetStream for all events

```bash
nats stream add polkadot_all_events \
  --subjects "polkadot.events.>" \
  --storage file \
  --retention limits \
  --max-age 48h
```

This keeps only the last 48 hours of all Polkadot events, ensuring efficient storage and retrieval of event data.
