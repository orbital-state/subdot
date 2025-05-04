# polakdot-k8s/README.md

A local Kubernetes deployment of Subdot with a NATS JetStream server. This setup allows one to run Subdot in a Kubernetes cluster and source events by running a smoldot client. This example demonstrates how to use Subdot in a more complex environment, where one can filter and route events so that they can be actioned upon, like running notifications.

# 1. Installing the package

The demo is designed to work out of the box. However, we assume that this repository is locally checked out and that you can navigate its files while using `kubectl` (pointed at the Kubernetes cluster with the `kubectl` context properly set). For simplicity, we assume the Kubernetes cluster is already up and running and is part of some development environment (e.g., Minikube, Kind, etc.).

## Optional: Helm Installation (To Be Implemented)

In the future, Helm installation will be supported for deploying Subdot. For now, this step is optional and not fully implemented. If you wish to experiment with Helm, you can try the following command:

```bash
cd k8s/helm
helm install subdot ./subdot-helm-chart
```

This will attempt to install the Subdot Helm chart in your Kubernetes cluster. The chart includes all necessary components, such as NATS JetStream, and configures them to work together. Note that this feature is still under development and may not work as expected.

## Current Recommended Approach: Using Kustomize

The recommended way to deploy the demo is by applying the Kustomize scripts. By default, `polkadotDemo: true` is enabled in the `values.yaml` file. This means that the demo will:

- Source Polkadot events from the smoldot client.
- Filter and route events to the NATS JetStream server.
- Send notifications from the filtered NATS core subject.

You can disable this behavior by setting `polkadotDemo: false` in the `values.yaml` file.

To deploy using Kustomize, run the following command:

```bash
kubectl apply -k k8s/kustomize/polkadot-demo
```

This will apply the Kustomize scripts in the `k8s/kustomize/polkadot-demo` directory, creating the necessary resources in your Kubernetes cluster.

# 2. Inspecting deployments

Once the Kubernetes resources are up and running, you can inspect the demo by executing the following commands:

```bash
# Add your commands here for inspecting the demo
kubectl get pods -n subdot
kubectl logs -f <pod-name> -n subdot
```

# 3. Creating a subdot filter

Next, we will create a subdot filter that will capture a typical polkadot event.

## 3.1 Typical Polkadot event

Typical Polkadot event the filter will catch:

```json
{
  "phase": { "ApplyExtrinsic": 3 },
  "event": {
    "section": "balances",
    "method": "Transfer",
    "data": [
      "14vL7S…src",          // from
      "13K1hG…dst",          // to
      "1200000000000000"     // value, Planck (1.2 DOT)
    ]
  },
  "blockNumber": 14501877,
  "timestamp": "2025-05-04T10:15:22Z"
}

## 3.2 Filter creation

We would need a JSONata expression:

```jsonata
event.section = "balances"
  and event.method = "Transfer"
  and $number(event.data[2]) > 1e15  /* 10 · DOT (in Planck) */
```
Namely, see the content of [[large-transfers.filter.json]](large-transfers.filter.json)

```json
{
  "id": "large-polkadot-transfers",
  "source": "nats://nats:4222?subject=polkadot.events",
  "target": "nats://nats:4222?subject=polkadot.events.large_transfers",
  "filter": "event.section = 'balances' and event.method = 'Transfer' and $number(event.data[2]) > 1000000000000000",
  "inputFormat": "json",
  "outputFormat": "json",
  "heartbeatTtlMs": 120000
}
```

Note: In Subdot v0.1.0, the NATS URL host is ignored; only the `subject` query parameter (or path) is used to derive the NATS subject. A separate event sourcing process must ensure the subject is available in the JetStream cluster. Also see `doc/sourcing-n-actions.md` for more details on the current behavior of Subdot when sourcing events and routing them via NATS.

Fields align with what SubdotManager expects in `src/pubsub/SubdotManager.ts` (it coerces a bare filter string into an object).

To recap what we have done so far:

```bash
# 1. Deploy demo (inside cluster or Kind, as before)
kubectl apply -k k8s/kustomize/polkadot-demo

# 2. Wait until subdot-manager pod is Running
kubectl logs -f deploy/subdot-manager             # optional
```

Now, to run the demo end-to-end, we need to publish the filter spec to the NATS server. This will allow the SubdotManager to pick it up and start processing events.

```bash
# 3. Publish the filter spec
cd examples/advanced/polkadot-demo
./send-large-transfer-filter.sh
```

