# subdot

A realtime event-routing framework to develop pubsub-like systems with payload filtering.

## Use-cases and Examples

- `examples/basic/cli`: A simple CLI that pipes and filters events in bash-like fashion (very local perspective).

- `examples/basic/local-k8s`: A local Kubernetes deployment of subdot with a NATS JetStream server. This setup allows you to run subdot in a Kubernetes cluster, making it suitable for production environments. Use-case still covers the local development perspective and mock data.


- `examples/advanced/polkadot-demo`: A helm-based Kubernetes deployment of subdot with a NATS JetStream server. This example demonstrates how to use subdot in a more complex environment, where you can filter and route events so that they can be actioned upon.

---


## ⚡ Quickstart

### Prerequisites

- [Node.js](https://nodejs.org/) (>= 18.x)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- Docker (optional, for local NATS JetStream server)
- Kubernetes + Kustomize (optional, for production deployments)

### Install dependencies

```bash
npm install
```

### Run the CLI

```bash
npm run start
```

This will start the CLI in monitoring mode, capturing events from the default source (Polkadot mainnet WebSocket).

---

## 🛠 Develop SubDot

### Build the Project

To build the project, run:

```bash
npm run build
```

This will compile the TypeScript code into the `/dist` folder.

### Run in Development Mode

To run the project in development mode with hot reload, use:

```bash
npm run dev
```

This uses `tsx` for fast iteration.

### Test the CLI Locally

To test the CLI with specific flags, use:

```bash
npm run start -- --help
```

You can also run the CLI with a specific configuration file:

```bash
npm run start -- --config ./subdot.toml
```

Or with a specific source:

```bash
npm run start -- --source ws://localhost:9944
```

### Make subdot Executable

To make `subdot` available as a global executable:

1. Add a shebang to the top of `src/index.ts`:
   ```typescript
   #!/usr/bin/env node
   import { runCLI } from './cli/cli.js';

   runCLI();
   ```

2. Build the project:
   ```bash
   npm run build
   ```

3. Link the package globally:
   ```bash
   npm link
   ```

4. Test the executable:
   ```bash
   subdot --help
   ```

This will allow you to run `subdot` from anywhere in your terminal.

---

## Docker (Optional)

To build a Docker image for subdot, run:

```bash
docker build -t subdot .
```

This will create a Docker image named `subdot` based on the current directory.

To run the Docker container, use:

```bash
docker run -it --rm subdot
```

This will start the subdot CLI inside a Docker container.

---

## Kubernetes (Optional)

To deploy subdot on Kubernetes, you can use the provided Kustomize manifests. This will allow you to run subdot in a Kubernetes cluster with Smoldot and NATS JetStream.

To deploy, run:

```bash
kubectl apply -k k8s/
```

This will apply the Kustomize manifests in the `k8s/` directory, creating the necessary resources for subdot.

---

## NATS JetStream (Optional)

subdot uses NATS JetStream for durable message delivery and payload-based filtering. You can run a local NATS JetStream server for testing purposes.

To start a NATS JetStream server locally, run:

```bash
docker run -d --name nats-dev -p 4222:4222 -p 8222:8222 nats -js
```

This will start a NATS JetStream server with the default ports exposed. You can access the NATS Monitoring UI at [http://localhost:8222](http://localhost:8222).

---

## 📝 License

Apache License 2.0  
Open-source.  
Built with ❤️ for the blockchain ecosystem.
