1. MVP Instructions / Prompt for Coding subdot
🎯 MVP Design Instructions

## Goal:

Build a TypeScript-based, lightweight, real-time blockchain event processing CLI+TUI application named subdot, inspired by network tools like nc, terminal UIs like htop, and data languages like KQL/jq.

## 🛠 High-Level MVP Requirements

    Programming language: TypeScript (ESM)

    Primary libraries:

        CLI parsing: commander

        TUI rendering: ink

        Config parsing: toml

        Smoldot (optional light client): @smoldot/smoldot

        Polkadot.js API: @polkadot/api

        (Optional later) NATS streaming client

    Configuration:

        Config file: subdot.toml

        Supports overriding via CLI flags

        Preconfigured sources by default (e.g., Polkadot mainnet)

    Operation Modes:

        CLI monitoring (stdout JSON structured logs)

        TUI live dashboard (ink based, real-time interaction)

        Kubernetes deployment (with smoldot + NATS)

    Graphics/UX:

        Minimalistic

        Clean JSON lines

        Optional colored logs

        Optional Ink-powered UI with event tabs, metrics, counters

    Deployments:

        Local dev

        Docker container (optional)

        K8s manifests using Kustomize (optional)

    Default Event Source:

        Polkadot mainnet WebSocket (wss://rpc.polkadot.io)

        Optionally run Smoldot inside application

        Later NATS JetStream for sourcing historical or sidechain events

## 📦 Code Structure

/src
  /cli
  /config
  /connectors
  /events
  /query
  /output
  /tui
  /utils
index.ts
subdot.toml
package.json
tsconfig.json
README.md

## 📝 Immediate Commands (CLI)

    -h --help → show help
    --version → show version
    --config → custom config file
    --show-config → show config
    -v --verbose → enable verbose logging (-vvv for debug)
    -a --accept → accept incoming connections (server mode)
    -p --publish → publish to NATS or other subdot services
    -s --source → select event source
    -c --consume → connect to source and consume events
    -m --monitor → monitor with TUI or CLI
    replay → replay past events from streams
    tui → launch ink-based dashboard
    -q --query → run DQL query (default), e.g., 
        when pallet == 'balances' and method == 'Transfer' 
            and amount > 1000
        select from, to, amount 
        action log
    -o --output → output format (json, plain text, etc.)
    -i --interactive → enable interactive console mode run DQL queries with auto-completion and syntax highlighting (this is different from tui)    
    -r --replay → replay events from a specific time or block height 
       
    -h --head → head events, works like setting a for limit number of events
    -t --tail → tail events in real-time
    -l --limit → limit number of events
    -p --offset → offset number of events (for pagination)

    --smoldot → run local smoldot 

    # NATS specific
    -n --nats → connect to NATS server
    - Add rate limiting
    - Add backpressure handling
    - Add error handling
    - Add event acknowledgment
    - Add event replay
    - Add event persistence

    # TODO: collection and aggregation

Note that -q --query is the main command for filtering and processing events. It can be used in combination with other commands to customize the output and behavior of the application. This allows for flexible event handling and tailored responses based on user-defined criteria.

✅ Must focus on small, pluggable, cloud-agnostic architecture
✅ Build it operator-first: lightweight, durable, extensible

## URLs 

URLs as supported by `accept` and `publish`:

    wss://rpc.polkadot.io  # Polkadot mainnet webSocket
    wss://westend-rpc.polkadot.io  # Westend testnet webSocket
    wss://rococo-rpc.polkadot.io  # Rococo testnet webSocket
    wss://kusama-rpc.polkadot.io  # Kusama testnet webSocket
    wss://moonbeam-rpc.api.onfinality.io/public-ws  # Moonbeam testnet webSocket
    wss://moonriver-rpc.api.onfinality.io/public-ws  # Moonriver testnet webSocket
    wss://acala-rpc-0.aca-api.network  # Acala testnet webSocket
    ...

    # NATS JetStream URLs
    nats://localhost:4222
    nats://my-nats-server:4222 # connect to a NATS server, will listen to all subjects, streams are selected in the query
    nats://my-nats-server:4222/stream
    nats://my-nats-server:4222/stream/subject
    nats://my-nats-server:4222/stream/subject/queue 

    # Optional: add URI parameters
    nats://my-nats-server:4222/stream/subject?ack=manual&replay=all
    nats://my-nats-server:4222/stream/subject?ack=manual&replay=last
    nats://my-nats-server:4222/stream/subject?ack=manual&replay=last&limit=100

    file://path/to/file.json
    gz://path/to/file.json.gz
    grpc://localhost:50051 # connect to a gRPC server (another subdot instance)
    http://localhost:8080
    https://api.example.com/events
    tcp://localhost:8080  # connect to a TCP server (another subdot instance and send plain text events)


## Example Usage

    subdot --config subdot.toml
    subdot --source wss://rpc.polkadot.io
    subdot --query "when pallet == 'balances' and method == 'Transfer'"
    subdot --tui
    subdot --publish https://externa-host/ --source nats://localhost:4222/stream # connect to a NATS server, will listen to all subjects, streams are selected in the query, bundled events are sent to the external host
    subdot --accept tcp://localhost:50555/stream # accept incoming connections from other subdot instances


## 🧪 Testing

    Unit tests for each module
    Integration tests for connectors and event processing
    E2E tests for CLI and TUI functionality
    Load testing for performance benchmarks

## 🏗️ Future Enhancements

    Advanced filtering and routing
    Historical event replay
    Multi-chain support
    Enhanced TUI features (graphs, charts)
    Customizable alerting and notification system
    Integration with external data sources (e.g., SubQuery, Subsquid)
    Support for additional blockchains and networks
