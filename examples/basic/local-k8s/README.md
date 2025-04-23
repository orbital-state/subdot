

# Local Kubernetes Example

This example demonstrates how to run Subdot in a local Kubernetes cluster using desktop-docker (or similar). It includes the necessary steps to set up the environment, deploy Subdot, and interact with it.

## Step1: Set up your local Kubernetes cluster

Make sure you have a local Kubernetes cluster running. You can use tools like Docker Desktop, Minikube, or Kind to set up a local cluster.

## Step2: Install Subdot

Clone the Subdot repository and from the root directory, run the following command to install Subdot:

```bash
kubectl apply -d k8s/kustomize/base
```

This will deploy Subdot components, including the Subscription Manager and Worker pods. But most importantly, it will also create a NATS server and a JetStream stream for Subdot to use (dev-mode).

## Step3: Forward NATS service port

```bash
kubectl port-forward -n subdot service/nats 4222:4222
```
This command forwards the NATS service port to your local machine, allowing you to interact with the NATS server using the nats CLI or other tools.

Follow `doc/nats-101.md` for more details on how to use the nats CLI to interact with the NATS server.

## Step4: Create a subscription

You can create a subscription by sending a request to the SubdotManager. The SubdotManager will create a SubdotWorker deployment for the subscription and start processing events.

```bash
subdot sub \
  --name <subscription-name> \
  --source-subject <source-subject> \
  --query <jsonata-query> \
  --target-subject <target-subject>
```

Above we have `sub` as short for `subscribe`. The command will create a subscription with the specified name, source subject, JSONata query, and target subject. Where? 

The same can be achieved by performing more direct manipulation on the NATS server. For example, you can publish a message to the `subdot.workqueue` subject with the subscription details. The idea is to simulate actions of the SubdotManager (but skipping creation of SubdotWorker deployment - we assume it already exists).

```bash
nats stream update subdot_workqueue --subjects="subdot.workqueue"
```

Then, you can publish a message to the `subdot.workqueue` subject with the subscription details. For example:

```bash

nats pub --jetstream subdot.workqueue "$(cat <<EOF
{
  "id": "my-subscription",
  "source": {
    "subject": "events.raw"
  },
  "filter": {
    "query": "$.data.type = 'transfer'"
  },
  "target": {
    "subject": "events.filtered"
  },
  "createdAt": $(date +%s000),
  "heartbeatTtlMs": 60000
}
EOF
)"
```

This will publish a message to the `subdot.workqueue` subject with the subscription details. The SubdotWorker will then 

1. start an instance of the subdot filter, which is a lightweight process that will
    i. continuously listen for messages on the source subject
   ii. apply the JSONata query to filter the payload
  iii. publish the filtered events to the target subject.
2. if stopped, the worker will stop processing events and terminate the instance of the subdot filter.

To confirm that the subscription was created successfully, you can check the logs of the SubdotWorker pod.

You should see logs indicating that the worker is processing events from the source subject and publishing filtered events to the target subject. For example: "▶️ start job my-subscription". This means the SubdotWorker successfully pulled the job and launched a filter instance.


## Step5: Send events, watch them get filtered, and verify the output

Now let us continue with tests: send events, watch them get filtered, and verify the output.

We use nats core when we publish the event. 

```bash
nats pub events.raw "$(cat <<EOF
{
  "data": {
    "type": "transfer",
    "amount": 100
  }
}
EOF
)"
```

Please note that in this example, we are using the `events.raw` subject as the source subject and the `events.filtered` subject as the target subject. The JSONata query filters events based on the `type` field in the payload. 

One should see logs in the SubdotWorker pod indicating that the worker is processing events from the source subject and publishing filtered events to the target subject. 

```
2025-04-23T00:23:55.125Z [INFO]: ▶️  Starting job my-subscription
2025-04-23T00:23:55.126Z [INFO]: 🔗 Subscribed to NATS subject events.raw
2025-04-23T00:24:14.474Z [INFO]: 📤 Published to NATS subject events.filtered
2025-04-23T00:24:28.085Z [INFO]: 📤 Published to NATS subject events.filtered
```

This concludes by expired heartbeat. The FilterWorker will stop processing events as without properly managed liveness check of the heartbeat its instance will be terminated.