# Sourcing and Actions in Subdot

This document outlines the current behavior of Subdot (v0.1.0) when sourcing events and routing them via NATS, as well as planned improvements for future releases.

---

## 1. Current Behavior (v0.1.0)

- **Only NATS URLs accepted** as string inputs for `source` and `target` in filter specs.
- The **host, port, and credentials are ignored**; only the NATS subject is extracted.
  - The subject is derived from the `?subject=…` query parameter or from the URL path.
- A bare JSON `SubjectConfig` object can also be provided instead of a URL string.
- The **subject must already exist** in the JetStream cluster (external provisioning).
- **JetStream usage flag** (`useJetStream`) is read from the URL query (`?useJetStream=true`), defaulting to core NATS.

### Example Filter Specification (v0.1.0)
```json
{
  "id": "large-polkadot-transfers",
  "source": "nats://nats:4222?subject=polkadot.events",
  "target": "nats://nats:4222?subject=polkadot.events.large_transfers",
  "filter": "event.section = 'balances' and ...",
  "inputFormat": "json",
  "outputFormat": "json",
  "heartbeatTtlMs": 120000
}
```

---

## 2. Future Behavior (v0.2.0 and beyond)

- **Full URL support** for NATS, Kafka, HTTP, Smoldot, and other transports via `UrlSchemaFactory`.
- **Host and port** will be used to connect to one or more servers, with credentials for authentication.
- **Subject derivation** from path or query remains, but with enhanced validation and defaults.
- **Automatic stream/subject provisioning** in JetStream (create streams/consumers on the fly).
- **Built-in JetStream subscription and publishing** logic for high-throughput, durable work queues.
- **Extended filter and action types**, enabling complex event routing and transformations.

---

>*Note:* Subdot’s core API still revolves around the `FilterJob` JSON structure; these improvements will be backward compatible with v0.1.0 specifications.