# Basic CLI Example

This folder contains an example of a basic CLI application that demonstrates how to process and filter blockchain events. The script `run-filter.sh` is the main entry point for this example.

## Overview

The script simulates the processing of blockchain events, such as finalized and pending blocks. It outputs the filtered events in JSON format, including details like block number, hash, and timestamp.

## Usage

Run the script using the following command:

```bash
./run-filter.sh
```

## Example Output

When you run the script, you may see output similar to the following:

```json
{
    "payload": {
        "type": "finalized",
        "blockNumber": 100,
        "hash": "0xabc123",
        "timestamp": "2025-04-16T12:00:00Z"
    }
}
{
    "payload": {
        "type": "finalized",
        "blockNumber": 102,
        "hash": "0xghi789",
        "timestamp": "2025-04-16T12:00:20Z"
    }
}
```

## Notes

- If no configuration file is found, the script will use default settings.
- The output format is JSON for easy integration with other tools or systems.

Feel free to modify the script to suit your specific use case.  