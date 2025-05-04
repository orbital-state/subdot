# Filter Registry in Subdot

This document captures the design and responsibilities around the filter registry, which leverages a JetStream Key-Value (KV) bucket (`subdot_filters`) and a work-queue (`subdot.workqueue`).

## Roles and Flow

1. **SubdotManager**
   - **Registry**: Stores new `FilterJob` definitions in the KV under keys `filters/<jobId>`.
   - **Enqueue**: Publishes each job into the work-queue subject so that workers can pick it up:
     - Immediately after creation via API.
     - On startup, by scanning all keys in KV and re-publishing pending jobs.
     - Periodically (every 30s) to ensure no orphaned jobs.
   - **Heartbeat Cleanup**: Watches KV entries and removes any job whose `createdAt + heartbeatTtlMs` has expired.
   - **Removal**: Deletes a job from KV (and stops it when seen by a worker) upon explicit API request or TTL expiry.

2. **SubdotWorker**
   - **Initialization**: Ensures the KV bucket and work-queue stream/consumer exist.
   - **Processing Loop**:
     - Pulls jobs from the queue (`subdot.workqueue`).
     - Launches a `FilterWorker` for each new job ID, and acks the message.
     - Periodically checks for expired workers and stops them.

## Key Concepts

- **KV Bucket (`subdot_filters`)**: Canonical source of truth for active subscriptions.
- **Work-Queue (`subdot.workqueue`)**: Transient delivery channel for new or re-queued jobs.
- **Job Lifecycle**:
  1. API call creates a `FilterJob` spec → Manager writes KV → Manager publishes to queue.
  2. Worker pulls from queue → spawns filter in runtime → acks.
  3. Manager periodically re-queues any KV entry missing from processing to handle restarts or missed delivery.
  4. TTL-based cleanup removes stale jobs from KV (and thus ceases worker activity).

## Configuration

- KV bucket name: `SUBDOT_KV_BUCKET_NAME` or `subdot_filters`
- Work-queue subject: `SUBDOT_WORKQUEUE_SUBJECT` or `subdot.workqueue`
- TTL default: `heartbeatTtlMs = 60000` (can be customized per job)

This registry pattern ensures high availability and recoverability: if a manager or worker restarts, the backlog in KV is re-enqueued automatically, and workers always see the complete set of active subscriptions.