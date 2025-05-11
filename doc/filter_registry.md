# Filter Registry in Subdot

This document captures the design and responsibilities around the filter registry, which leverages a JetStream Key-Value (KV) bucket (`subdot_filters`) and a work-queue (`subdot.workqueue`).

## Roles and Flow

1. **SubdotManager**
   - **Registry**: Stores new `FilterJob` definitions in the KV under keys `filters/<jobId>` with an initial status `PENDING`.
   - **Enqueue**: Periodically scans KV and publishes only jobs in status `PENDING` to the work-queue (`subdot.workqueue`), then updates their status to `RUNNING`.
   - **Heartbeat & Expiry**:
     - Workers emit a heartbeat entry (`heartbeat.<jobId>`) in KV periodically.
     - Manager periodically checks each `RUNNING` job’s heartbeat timestamp; if expired (no recent heartbeat), resets status back to `PENDING` for re-queue.
   - **Orphan Detection**:
     - Scans heartbeat keys for recent entries whose job record no longer exists in KV.
     - Publishes the orphaned `jobId` on subject `subdot.manager.filters.orphan` to instruct workers to terminate the orphaned job, and marks those jobs as `ORPHAN` if desired.
   - **Removal**: On explicit delete or TTL cleanup, the job is removed from KV. Workers subscribed to orphan notices will stop any still-running instances.

2. **SubdotWorker**
   - **Initialization**: Ensures the KV bucket and work-queue stream/consumer exist.
   - **Work Loop**:
     1. Pulls jobs from the queue (`subdot.workqueue`).
     2. Launches a `FilterWorker` for each new job and acks the message; the manager already marked it `RUNNING`.
     3. Subscribes to orphan notifications (`subdot.manager.filters.orphan`); on receiving a `jobId`, calls `stop()` on that worker.
     4. Periodically calls `isExpired()` to stop local workers whose own heartbeat TTL expired.

## Key Concepts

- **KV Bucket (`subdot_filters`)**: Canonical source of truth for active subscriptions.
- **Work-Queue (`subdot.workqueue`)**: Transient delivery channel for new or re-queued jobs.
- **Job Lifecycle**:
  1. API call creates a `FilterJob` spec → Manager writes KV with status `PENDING` → Manager publishes to queue.
  2. Worker pulls from queue → Manager flips status to `RUNNING` → Worker spawns filter → acks message.
  3. Worker emits heartbeats → Manager uses them to monitor health and to detect expired or orphaned jobs.
  4. If heartbeat expires → Manager resets status to `PENDING` → job is re-queued.
  5. If a heartbeat exists but job was deleted → Manager emits an orphan notice → Worker stops the associated filter.
  6. Explicit deletion or TTL expiry removes job from KV, fully terminating the subscription.

- **Status values**:
  - `PENDING`: Job is registered but not actively being worked on.
  - `RUNNING`: Job has an active worker with a recent heartbeat.
  - `ORPHAN`: Worker still alive (recent heartbeat) but job removed from registry; should be stopped.

## Configuration

- KV bucket name: `SUBDOT_KV_BUCKET_NAME` or `subdot_filters`
- Work-queue subject: `SUBDOT_WORKQUEUE_SUBJECT` or `subdot.workqueue`
- Orphan notifications subject: `SUBDOT_ORPHAN_SUBJECT` or `subdot.manager.filters.orphan`
- Default heartbeat TTL: `heartbeatTtlMs = 60000` (ms)

This registry pattern ensures high availability and recoverability: if a manager or worker restarts, the backlog in KV is re-enqueued automatically, and workers always see the complete set of active subscriptions.

## FilterRegistry

Here’s the updated design for the `FilterRegistry` abstraction and how it fits into Subdot. This class centralizes all KV logic, simplifying higher-level components like `SubdotManager` and `SubdotWorker`.

## 1. Responsibilities of `FilterRegistry`

`FilterRegistry` is the single place to persist and query `FilterJob` records (and their heartbeats) in JetStream KV. It should:

- Own and initialize the KV bucket (`subdot_filters`).
- CRUD on filter jobs:
  - Add new jobs (PENDING).
  - Update existing jobs (status changes, metadata updates).
  - Fetch a single job by ID.
  - List jobs (optionally by status or key‐prefix).
  - Delete jobs (and their heartbeats).
- Heartbeats:
  - Record a heartbeat timestamp for a job.
  - Fetch last heartbeat.
  - Delete expired or orphaned heartbeats.
- Status helpers:
  - Mark a job PENDING/RUNNING/ORPHAN.
  - Query by status.

By pushing all KV logic into this registry, higher-level components (the old `FilterManager`, `SubdotWorker`, future orchestrators) just call into a clean API to drive the work-queue, expiration, and orphan detection.

## 2. Updated `FilterRegistry` API

```typescript
import { JetStreamKvStore } from "./nats/kv_store.js";
import { FilterJob } from "../api/job.js";

export class FilterRegistry {
  constructor(private readonly kv: JetStreamKvStore<FilterJob>) {}

  /** Ensure KV bucket exists (create or get). */
  static async create(bucketName: string, js: JetStreamClient): Promise<FilterRegistry> { /* Implementation */ }

  /** Add a new job under "filters.<id>" */
  addJob(job: FilterJob): Promise<void>;

  /** Overwrite an existing job (e.g., to update status) */
  updateJob(job: FilterJob): Promise<void>;

  /** Remove job and its heartbeat */
  deleteJob(jobId: string): Promise<void>;

  /** Fetch a job or null */
  getJob(jobId: string): Promise<FilterJob | null>;

  /** List all jobs (optionally filter by status) */
  listJobs(status?: FilterJob["status"]): Promise<FilterJob[]>;

  /** Record heartbeat.timestamp under "heartbeat.<id>" */
  heartbeat(jobId: string, ts?: number): Promise<void>;

  /** Return last heartbeat timestamp or null */
  getLastHeartbeat(jobId: string): Promise<number | null>;

  /** Delete a job’s heartbeat entry */
  deleteHeartbeat(jobId: string): Promise<void>;

  /** Find orphaned jobs (heartbeat exists but filter key missing) */
  findOrphans(ttlMs: number): Promise<string[]>;
}
```

### Integration Points

- **SubdotManager** (control‐plane) will use:
  - `registry.addJob()` when a new filter arrives.
  - `registry.listJobs("PENDING")` to enqueue work.
  - `registry.getLastHeartbeat()` + `registry.updateJob()` to reset expired jobs.
  - `registry.findOrphans()` to publish orphan kill notices.

- **SubdotWorker** (data‐plane) will use:
  - `registry.heartbeat()` in each `FilterWorker`.
  - `registry.getLastHeartbeat()` in its local cleanup loop.
  - `registry.deleteHeartbeat()` when a job is deleted.

This updated design ensures that all KV-related logic is encapsulated within `FilterRegistry`, making the system more modular and maintainable.