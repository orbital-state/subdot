# Polkadot Blockchain Real-Time Monitoring System (MVP)

## Overview

This project implements a lightweight, scalable real-time monitoring system for the Polkadot blockchain.  
It captures finalized events using Smoldot light client and leverages NATS JetStream for robust, durable message delivery and payload-based filtering.

The system is designed to evolve into a multi-service architecture supporting advanced analytics and custom subscriber routing.

---

## Core Architecture

- **Event Capture**: Smoldot-based light client captures finalized on-chain events (e.g., balance transfers, staking rewards).
- **Event Stream**: Events are published to a central JetStream **raw events stream**.
- **Filtering Services**: Stateless microservices filter events based on subscriber-defined payload criteria (e.g., specific addresses, pallet types).
- **Routing Streams**: Instead of duplicating full payloads, lightweight mapping messages `{event_id, subscriber_id}` are published to routing streams.
- **Reliable Delivery**: All messages use **manual acknowledgments** to guarantee at-least-once processing without duplication.
- **Dynamic Subscriber Management**: New subscribers and filters can be added or updated in real-time without service restarts.

---

## Key Features

- Real-time monitoring of finalized Polkadot events
- Cloud-agnostic, lightweight, and horizontally scalable
- JetStream durable consumers with manual ack for guaranteed delivery
- Efficient payload filtering without topic explosion
- Easy evolution toward dashboards, analytics, and alerting
- Future support for historical backfilling via SubQuery or Subsquid APIs

---

## Quick System Diagram

```plaintext
[ Smoldot Light Client ]
        ↓
[ NATS JetStream Raw Events Stream ]
        ↓
[ Filtering & Routing Services ]
        ↓
[ Subscriber Routing Streams ]
