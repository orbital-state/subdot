# 🧠 Subdot Architecture: Why Both JetStream and KV?

Subdot uses both **JetStream** and **NATS KV Store**—and while this may seem redundant at first glance, these tools serve very distinct and complementary purposes in the system.

---

## 🧱 JetStream vs KV: Roles & Responsibilities

| Purpose              | JetStream                            | KV Store                             |
|----------------------|--------------------------------------|---------------------------------------|
| What it is           | A streaming message queue (like Kafka) | A distributed key-value store over NATS |
| Used for             | Delivering filter jobs to workers     | Tracking job metadata, heartbeat, liveness |
| Pattern              | `subdot_workqueue` stream with consumers | `subdot_filters` KV bucket            |
| Accessed by          | `SubdotWorker` (pulls jobs)           | `SubdotManager`, `SubdotInstance`     |
| Retention            | One-time delivery (ack-based)         | Persistent job state + TTL expiration |
| Why it's used        | Decouples manager from worker runtime | Enables visibility, coordination, cleanup |

---

## 🛠️ In Code

### 🔁 JetStream (`subdot_workqueue`)
Used for **transient delivery** of jobs to workers.

- Created in `FilterManager.initialize()`
- Used for fire-and-forget delivery of `FilterJob`s
- Example:
  ```ts
  const job = await this.queue!.pull(1_000);
  ```

### 🧠 KV Store (`subdot_filters`)
Used for **persistent, shared state** across Subdot components.

- Tracks:
  - Job configuration
  - Heartbeats from running jobs
  - Cleanup metadata (e.g., TTL expiry)
- Accessed in:
  - `SubdotManager.createSubscription()`
  - `SubdotInstance` heartbeat logic
  - `SubdotManager.cleanupExpired()`

---

## 🔄 Job Flow Overview

```text
[CLI or Manager]
  ├─> Write job to KV (job config)
  └─> Publish job to JetStream (trigger filter)

[Worker]
  ├─> Pull job from JetStream
  ├─> Optionally update KV (heartbeat)
  └─> Launch filter

[Manager]
  └─> Periodically scan KV
       ├─> Identify expired jobs
       └─> Clean up (based on heartbeat TTL)
```

---

## 🤔 Why Not Just One?

Each system solves a **very different problem**:

- **JetStream** = Durable, ordered, ACKable event delivery
- **KV Store** = Distributed, persistent state with TTL and watchability

Using **only JetStream**:
- No persistent record of jobs, hard to introspect or manage liveness

Using **only KV**:
- No durable, one-time job delivery mechanism across restarts or failures

---

## ✅ TL;DR

| Component                     | Purpose                                |
|------------------------------|----------------------------------------|
| `subdot_workqueue` (JetStream) | One-time job delivery to workers       |
| `subdot_filters` (KV Store)     | Persistent job tracking, heartbeat, cleanup |

This dual-layer design allows Subdot to scale like a **microservice**, yet remain easy to debug and manage like a **CLI tool**.
