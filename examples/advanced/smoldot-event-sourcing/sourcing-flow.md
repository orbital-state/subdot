# Sourcing Flow

Below we describe what happens under the hood when we run `source-events-into-nats.sh` script.
 
### **Steps**:
- Ensure you have the required dependencies installed by running `npm install` in the project directory and `npm run build` as well as `npm link` if necessary. See README.md in the root directory for more details.
    
### **Expected Behavior**:
- Subdot will connect to the specified WebSocket endpoint using Smoldot.
- It will filter events based on the provided query.
- The filtered events will be output in JSON format, including all events if the query is set to true.
- The filtered events will be published to the specified NATS subject (e.g., `polkadot.events.*`).

## The Class Call-chain

The `subdot filter` command in the provided script invokes a chain of classes and methods to process events. Here's the main logic flow:

1. **Command Parsing**:
   - The `filter` command is parsed and executed by the CLI entry point. This is likely handled by a class like `FilterPipeline`.

2. **Source Substream Creation**:
   - The `createSourceSubstream` function is called to create a source substream based on the `--source` argument (`smoldot.wss://rpc.polkadot.io` in this case). This would instantiate the `SmoldotSourceSubstream` class.

3. **Target Substream Creation**:
   - The `createTargetSubstream` function is called to create a target substream based on the `--target` argument (`nats://localhost:4222/polkadot.events`). This would instantiate the `NatsTargetSubstream` class.

4. **Filter Rule Setup**:
   - A `JsonataFilterRule` is created using the `--query` argument (`'true'` in this case). This rule is used to filter events.

5. **Event Processor Initialization**:
   - A `BasicEventProcessor` is initialized with the filter rule. This processor applies the filter to incoming events.

6. **Pipeline Execution**:
   - The `FilterPipeline.execute()` method is called. This method:
     - Starts the source and target substreams.
     - Iterates over events from the source substream.
     - Processes each event using the `BasicEventProcessor`.
     - Pushes the processed events to the target substream.

7. **Source Substream Logic**:
   - The `SmoldotSourceSubstream` connects to the WebSocket endpoint (`smoldot.wss://rpc.polkadot.io`) and subscribes to finalized blockchain events. It parses and enqueues events for processing.

8. **Target Substream Logic**:
   - The `NatsTargetSubstream` connects to the NATS server (`nats://localhost:4222`) and publishes processed events to the specified subject (`polkadot.events`).

### Summary of Classes Invoked:
1. **CLI Command**: `FilterPipeline`
2. **Source Substream**: `SmoldotSourceSubstream`
3. **Target Substream**: `NatsTargetSubstream`
4. **Filter Rule**: `JsonataFilterRule`
5. **Event Processor**: `BasicEventProcessor`

This chain of classes ensures that events are sourced, filtered, and routed to the target destination.

