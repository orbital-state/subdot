* Feature implementation with class design
## Feature 0: Basic Event Streaming

- Basic event streaming with a simple interface

See example in `examples/basic/cli/`.



## Feature 1: Pluggable, Protocol-agnostic and Representation-agnostic Event Streaming

- Substream abstraction takes care of IO and serialization
- Substream implementations for different protocols (e.g., File, TCP, NATS, Kafka, RabbitMQ)
- Substream implementations should be protocol-agnostic and not tied to a specific event format
- Substream serialization should be able to handle different event formats (e.g., JSON, Protobuf, etc.)

### Description

The system should support multiple event streaming protocols (e.g., Kafka, RabbitMQ, etc.) and allow users to plug in their own implementations. This will enable users to choose the protocol that best fits their needs without being tied to a specific one.

### Class Design

```typescript
// abstract concept
interface Substream {
  onEvent(cb: (event: BasicEvent) => void): void;
  onEnd?(cb: () => void): void;
  start(): void;
}
```

```typescript
class FileSubstream implements Substream { ... }
class TcpSubstream implements Substream { ... }
class NatsSubstream implements Substream { ... }
class KafkaSubstream implements Substream { ... }
class RabbitMQSubstream implements Substream { ... }
```



## Feature 2: Avoid backpressure and event loss
- Substream implementations should be able to handle backpressure and avoid event loss
- Substream implementations should be able to handle high throughput and low latency
- Substream implementations should be able to handle large volumes of data
- Substream implementations should be able to handle different event formats (e.g., JSON, Protobuf, etc.)

### Description

We want to set a reasonable limit on the number of events that can be processed at a time. This will help us avoid backpressure and event loss. We also want to make sure that we can handle high throughput and low latency, so we need to be able to process large volumes of data quickly.

### Solution
- Use a queue to store events that are being processed
- Use a worker pool to process events in parallel
- Use a backoff strategy to handle backpressure
- Use a circuit breaker to handle event loss
- Use a retry strategy to handle transient errors
- Use a dead letter queue to handle permanent errors
- Use a monitoring system to track the health of the system
- Use a logging system to track the events that are being processed

#### Advanced options

> Bounded Buffer with Drop or Backpressure Behavior

Use a bounded buffer (maxBufferSize) and handle overflow (e.g., drop oldest, block, or log/exit):

```typescript
private readonly maxBufferSize = 1000;

private enqueue(event: BasicEvent) {
  if (this.buffer.length >= this.maxBufferSize) {
    console.warn(`[NatsSourceSubstream] Buffer full, dropping event`);
    return;
  }

  this.buffer.push(event);
  this.resolveQueue.forEach((resolve) => resolve());
  this.resolveQueue = [];
}
```


> Push Back to NATS via Flow Control (not native in core nats)

Unfortunately, the core NATS subscription API (subscription = conn.subscribe()) does not support pausing the stream — once you subscribe, you're getting messages. JetStream does, however.

If you plan to use JetStream long-term, look at pullSubscribe() with batch/pull-size and flow control.

> Use an Async Queue (Advanced)


## Feature 3: Modern commander-based CLI architecture

- Use commander.js for CLI
- Use a centralized configuration system via `Config.getInstance(...)`
- Use a shared logger utility
- Use a shared error handling system ?
- Use a shared event handling system ?

- Top-level flags like --config, --verbose
- Dynamic behavior based on subcommands like filter, manager, tui
