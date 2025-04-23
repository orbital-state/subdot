## Subscription‑Manager (Operator)	

### Control‑plane Pod (one replica)

Primary responsibilities:

- Watch the subscriptions JetStream subject (or REST/API)
‑ Create / scale / delete worker Deployments in the cluster
‑ Garbage‑collect expired subscriptions
‑ (later) write manifests back to Git

## Worker (image: subdot‑worker)

## Data‑plane Pods (many replicas, 1 per subscription or a small pool)

- Pull one FilterJob from the work‑queue or accept it via env vars
‑ Connect to event stream (Polkadot, …)
‑ Apply the subscriber’s JSONata query
‑ Publish matching events to the subscriber’s target subject
‑ Send periodic heart‑beats to the KV bucket


## Architecture

```
          ┌───────────────────────┐
          │ Subscription‑Manager  │
          │  (Deployment: 1 pod)  │
          └──────────┬────────────┘
                     │ creates / scales
   .yaml manifests   │  Deployment per subscription
┌────────────────────▼──────────────────────┐
│ Deployment: subdot‑worker‑<subId>         │
│   replicas: N (configured by Manager)     │
│   env: SUBDOT_QUERY, OUTPUT_SUBJECT, ...  │
└────────┬──────────────────────────────────┘
         │ (K8s schedules pods)
┌────────▼─────────┐  ┌────────▼─────────┐  … (N replicas)
│ subdot‑worker    │  │ subdot‑worker    │
│  Container       │  │  Container       │
│  ‑ pulls / runs  │  │  ‑ pulls / runs  │
│  ‑ heart‑beats   │  │  ‑ heart‑beats   │
└──────────────────┘  └──────────────────┘
```

## What exactly happens inside a Worker Pod

### Boot
    WorkerApp starts, builds its plumbing (JetStreamConnection, JetStreamWorkQueue, etc.).

### Get its assignment
    Two flavours (choose one, both are supported by the class design):

        Work‑queue pull – The pod pulls one FilterJob message from subdot.workqueue.

        Env/Config – The Manager bakes the job params directly into env‑vars; the worker skips the queue and instantiates SubdotInstance immediately.

### Process events
    SubdotInstance subscribes to the source subject (e.g. blocks.finalized), runs the JSONata filter, and publishes matched events to subdot.filters.events.<subscriberId>.

### Heartbeat
    Every ttl/2 ms it writes/refreshes subs/<subscriberId> in the KV bucket so the Manager knows the subscription is alive.

### Shutdown
    If the heartbeat key is deleted (or TTL lapses) or the Manager scales the Deployment to 0, the pod receives SIGTERM, calls SubdotInstance.stop(), flushes, and exits.

## Why we still keep the FilterManager inside the Worker

    It lets a single pod host several queries if we ever choose to shard multiple lightweight subscriptions into one container (cost saver).

    During current phase it manages one SubdotInstance, but the interface already supports >1 without a rewrite.

## TL;DR

    Subscription‑Manager = Kubernetes operator that creates/kills/adjusts pods.

    Worker = the pod that does the filtering work and emits heart‑beats.

With this split, scaling logic and control‑plane decisions stay out of the data‑plane path, keeping the Worker image tiny and stateless while letting the Manager implement sophisticated policies (GitOps, HPA, multi‑tenant limits, etc.).