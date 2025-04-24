# Sourcing events with Smoldot

## Overview

This example demonstrates how to use the `smoldot` library to source events from a Smoldot node. It shows how to connect to a Smoldot node, subscribe to events, and output them as JSON events either into stdout, a file or NATS. 


## Step 1: Source the events into stdout

To run Subdot as an event source using Smoldot as a client and output events as JSON, you can use the `filter` command defined in the CLI. Here's how you can do it:

1. **Command Overview**: The `filter` command allows you to specify a source URL, a query for filtering events, and an output format. For Smoldot, you would use a WebSocket URL (e.g., `smoldot.wss://rpc.polkadot.io`) as the source.

2. **Example Command**:
   ```bash
   subdot filter \
     --source smoldot.wss://rpc.polkadot.io \
     --query 'true' \
     --output-format json
   ```

   - `--source`: Specifies the Smoldot WebSocket endpoint (e.g., Polkadot mainnet).
   
   - `--query`: Filters events based on the provided JSONata query (e.g., all events if we query for true). This is the default behavior (if -q flag is omitted).
   - `--output-format`: Specifies the output format as JSON.

3. **Steps**:
   - Ensure you have the required dependencies installed by running `npm install` in the project directory and `npm run build` as well as `npm link` if necessary. See README.md in the root directory for more details.
     
4. **Expected Behavior**:
   - Subdot will connect to the specified WebSocket endpoint using Smoldot.
   - It will filter events based on the provided query.
   - The filtered events will be output in JSON format, including all events if the query is set to true.

If you encounter any issues, ensure that the Smoldot client is properly configured in your workspace and that the `filter` command is implemented to handle Smoldot as a source.

