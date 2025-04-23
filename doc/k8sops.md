




## Target architecture (high‑level)

```
┌──────────────────────────┐
│  (CLI / API) Subscriber  │
│  - sends {init|continue} │
└────────────┬─────────────┘
             │ subdot.filters.subscriptions
             ▼
┌──────────────────────────────────────────────────────────┐
│ Subscription‑Manager (K8s Operator, 1 replica)          │
│ • JetStream durable consumer "subscription‑mgr"         │
│ • Reconciles CRD <Subscription> → Deploys Filter svc    │
│ • Maintains KV bucket subdot_filters (TTL per entry)    │
│ • Writes manifests back to Git (Flux/Argo → GitOps)     │
└─────┬────────┬───────────────────────────────┬──────────┘
      │        │                               │
      │Heartbeats (subdot.filters.beats.<id>)  │
      │        │                               │
      ▼        ▼                               ▼
┌──────────┐┌──────────┐       …        ┌──────────┐
│ Filter A ││ Filter B │                │ Filter N │   <- Deployment/ReplicaSet, HPA via KEDA
│ QueueGrp ││ QueueGrp │                │ QueueGrp │   (image: subdot-filter)
└─┬────────┘└─┬────────┘                └──────────┘
  │            │                                     processed events →
  └────────────┴── subdot.filters.events.<subscriberId> ────────────────▶  Subscriber
```

3.1 JetStream plumbing (day 1‑2)

    Streams

        subdot.filters.subscriptions → Interest policy, 7‑day retention.

        subdot.workqueue → WorkQueue policy.

        subdot.filters.events.* → Interest or Limits per tenant.

    KV bucket subdot_filters

        Keys: subs/<subscriberId> → JSON { query, outputSubject, lastBeatAt, ttl }.

        Set max_age so entries evaporate automatically.

3.2 Custom Resource Definition <Subscription> (day 2)

apiVersion: subdot.io/v1alpha1
kind: Subscription
metadata:
  name: <subscriberId>
spec:
  query: "jsonata‑expr"
  outputSubject: "subdot.filters.events.<id>"
  replicas: 3          # desired workers
  ttlSeconds: 120
status:
  phase: Active | Expired | Error
  lastHeartbeat: <rfc3339>

3.3 Subscription‑Manager operator (day 3‑7)

Concern	Approach
Framework	Go + Kubebuilder (best‑in‑class CRDs) – but a quick PoC in TypeScript using operator-framework/javascript‑operator also works.
Reconcile loop	1) Pop message from subdot.filters.subscriptions.
2) Upsert corresponding <Subscription> CR.
3) Store/update KV entry.
GitOps	Commit the CR manifest to a dedicated branch (or repo) watched by Flux/ Argo CD.
Scaling	For each CR create a Deployment named filter‑<id>, replicas = spec.replicas.
Optional: KEDA scaler driven by JetStream pending metric in the work‑queue.
Expiry	If KV entry disappears (or lastBeatAt + ttl < now), set CR status.phase=Expired; delete Deployment.
3.4 Filter‑Worker container (day 4‑8)

    Base the current src/pubsub/worker/** code on NestJS or plain ts‑node.

    Entrypoint contract via env‑vars:

        SUBDOT_QUERY – JSONata string

        OUTPUT_SUBJECT – NATS subject

        SUBSCRIPTION_ID – for heart‑beats / metrics

    Work loop

        Join JetStream queue group named "filter-"+$SUBSCRIPTION_ID on the canonical source stream (e.g. blocks.finalized).

        Apply SUBDOT_QUERY; publish matches to $OUTPUT_SUBJECT.

        Every ttl/2 seconds publish heartbeat to subdot.filters.beats.$SUBSCRIPTION_ID.

        Watch KV for deletion ‑> graceful process.exit(0).

3.5 Enhance OOP & tests (parallel, day 2‑9)

    Refactor NatsClient into stateless helpers and interfaces (IConnectionFactory, IJobSource, IKvProvider).

    Inject dependencies via constructor → allows Jest unit‑tests with in‑memory mocks.

    Add reconnection & error hooks (JetStream nc.closed() promise).

3.6 CI / CD (day 6‑10)

    Build multi‑arch images (docker‑buildx bake).

    Kind‑based integration test: boot‑up NATS JetStream (nats‑box Helm chart) + the operator + a demo subscription; assert message flow.

    Lint via eslint, type‑check via tsc --noEmit, unit tests via vitest or jest.

## Risks & mitigation

- **Single point of failure** – operator is stateless, but the KV bucket is a single point of failure.	Use JetStream for durable subscriptions.
- **Noisy neighbour** – one badly written query cripples cluster	Quota each worker (CPU/mem limits) & tie each subscription to its own Deployment/queue group.
- **Operator restart loses state** - State lives in CRDs + KV bucket; operator is stateless.
- **High cardinality of CRDs** - For thousands of subscriptions switch to sharded workers: group small queries into the same Deployment (roadmap v2).
- **Duplicate delivery** - Use JetStream WorkQueue consumer → at‑least‑once; filters must be idempotent.