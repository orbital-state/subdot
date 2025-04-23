# NATS 101

## Basic introduction to NATS

If you're running a NATS cluster (even a dev/single-image desktop one) locally on localhost:4222, you can interact with it using the nats CLI tool. This CLI is super helpful for inspecting subjects, streams, and key-value stores.

Here’s a basic primer and commands you can use:
```bash
# macOS with Homebrew
brew install nats-io/nats-tools/nats

# Linux or manual install
wget https://github.com/nats-io/natscli/releases/download/v0.2.2/nats-0.2.2-linux-amd64.zip
unzip nats-0.2.2-linux-amd64.zip -d nats-cli
sudo mv nats-cli/nats /usr/local/bin/
rm -rf nats-0.2.2-linux-amd64.zip nats-cli
```

## Connect to your local NATS server

If your NATS server is running on localhost:4222 (default), you can use:

```bash
export NATS_URL=nats://localhost:4222
```

Or specify with -s in each command:

```bash
nats --server nats://localhost:4222 ...
```

## BASIC COMMANDS

### 🔍 List existing Subjects

To see active subjects (recently used), use:

```bash
nats sub '*'
```

This will subscribe to all subjects (wildcard), and you'll see any messages that come in. But NATS doesn’t store messages by default — so unless something is publishing, you won’t see anything.

To inspect more durable state, use JetStream tools (next).

## 💾 List JetStream Streams

```bash
nats stream ls
```

To get detailed info about a specific stream:

```bash
nats stream info <stream-name>
```

## 📦 List JetStream Consumers

```bash
nats consumer ls <stream-name>
```
To get detailed info about a specific consumer:

```bash
nats consumer info <stream-name> <consumer-name>
```

## 📜 List JetStream Messages
To see messages in a stream:

```bash
nats stream get <stream-name> --limit 10
```
To see messages in a consumer:

```bash
nats consumer get <stream-name> <consumer-name> --limit 10
```
To see messages in a specific subject:

```bash
nats stream get <stream-name> --subject <subject-name> --limit 10
```
To see messages in a specific subject with a filter:

```bash
nats stream get <stream-name> --subject <subject-name> --filter <filter> --limit 10
```
To see messages in a specific subject with a filter and a start time:

```bash
nats stream get <stream-name> --subject <subject-name> --filter <filter> --start-time <start-time> --limit 10
```
To see messages in a specific subject with a filter and an end time:

```bash
nats stream get <stream-name> --subject <subject-name> --filter <filter> --end-time <end-time> --limit 10
```
To see messages in a specific subject with a filter and a start time and an end time:

```bash
nats stream get <stream-name> --subject <subject-name> --filter <filter> --start-time <start-time> --end-time <end-time> --limit 10
```

## 🗂️ List Key-Value Buckets

```bash
nats kv ls
```

And to inspect keys in a bucket:

```bash
nats kv keys <bucket-name>
```

To see the value of a specific key:

```bash
nats kv get <bucket-name> <key>
```

To see the value of a specific key with a revision:

```bash
nats kv get <bucket-name> <key> --revision <revision>
```

To see the value of a specific key with a revision and a history:

```bash
nats kv get <bucket-name> <key> --revision <revision> --history
```
To see the value of a specific key with a revision and a history and a history limit:

```bash
nats kv get <bucket-name> <key> --revision <revision> --history --history-limit <history-limit>
```


## Example Commands

### List all JetStream streams

    nats stream ls

### Get detailed stream info

    nats stream info my-stream

### List all Key-Value buckets

    nats kv ls

### List keys in a bucket
    
    nats kv keys my-bucket

### Get a value from a key
    
    nats kv get my-bucket some-key

## Publish and Subscribe

### Publish a message to a subject

```bash
nats pub test --count 10 "Message {{Count}}: {{ Random 10 100 }}"
```
This will publish 10 messages to the `test` subject, with a random number between 10 and 100 in each message.

### Subscribe to a subject

```bash
nats sub test
```
This will subscribe to the `test` subject and print any messages that are published to it.

### Publish a message to a stream

```bash
nats stream publish <stream-name> --subject <subject-name> --data "Hello, World!"
```
This will publish a message to the specified stream and subject.

### Subscribe to a stream

```bash
nats stream sub <stream-name> --subject <subject-name>
```
This will subscribe to the specified stream and subject and print any messages that are published to it.

### Publish a message to a key-value bucket

```bash
nats kv put <bucket-name> <key> "Hello, World!"
```
This will put a value in the specified key-value bucket.

### Get a value from a key-value bucket

```bash
nats kv get <bucket-name> <key>
```
This will get a value from the specified key-value bucket.