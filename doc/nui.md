
**nui** stands for NATS User Interface, a web-based interface for NATS. Official documentation can be found at [NATS NUI Homepage](https://natsnui.app/).

It is a part of the `k8s/kustomize/base` manifests and is deployed using the following command:

```bash
kubectl apply -k k8s/kustomize/base
```

Essentially, one of theway to connect to web interface is to use `kubectl port-forward` command. The following command will forward the port from the NUI pod to your local machine:

```bash
 kubectl port-forward nui-0 31311:31311
```

After running the above command, you can access the NATS NUI web interface by opening your web browser and navigating to `http://localhost:31311`.

## NUI Configuration

One can define the NUI configuration in the GUI. For microservice-to-microservice communication, it is enough to specify 

```yaml
NATS_URL: "nats://nats.subdot.svc.cluster.local:4222"
```
