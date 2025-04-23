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

Here some predefined streams:


