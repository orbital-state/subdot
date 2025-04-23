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

# 2. Running the demo

Once the Kubernetes resources are up and running, you can inspect the demo by executing the following commands:

```bash
# Add your commands here for inspecting the demo
```