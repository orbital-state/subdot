import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { execSync, spawn } from 'child_process';
import { connect, StringCodec } from 'nats';

let natsConnection: any;
const sc = StringCodec();

describe('Polkadot Demo Integration Test', () => {
  let subdotManager: any;
  let subdotWorker: any;

  beforeAll(async () => {
    // Step 1: Deploy NATS
    console.log('Deploying NATS...');
    execSync('kubectl apply -k k8s/kustomize/nats', { stdio: 'inherit' });

    // Step 2: Port-forward NATS
    console.log('Port-forwarding NATS...');
    const portForward = spawn('kubectl', ['port-forward', '-n', 'subdot', 'service/nats', '4222:4222']);
    portForward.stdout.on('data', (data) => console.log(data.toString()));
    portForward.stderr.on('data', (data) => console.error(data.toString()));

    // Wait for port-forwarding to stabilize
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Step 3: Build and link Subdot
    console.log('Building and linking Subdot...');
    execSync('npm run build && npm link', { stdio: 'inherit' });

    // Step 4: Start Subdot Manager
    console.log('Starting Subdot Manager...');
    subdotManager = spawn('subdot', ['manager']);
    subdotManager.stdout.on('data', (data) => console.log(`[Manager]: ${data}`));
    subdotManager.stderr.on('data', (data) => console.error(`[Manager]: ${data}`));

    // Step 5: Start Subdot Worker
    console.log('Starting Subdot Worker...');
    subdotWorker = spawn('subdot', ['worker']);
    subdotWorker.stdout.on('data', (data) => console.log(`[Worker]: ${data}`));
    subdotWorker.stderr.on('data', (data) => console.error(`[Worker]: ${data}`));

    // Step 6: Connect to NATS
    console.log('Connecting to NATS...');
    natsConnection = await connect({ servers: 'localhost:4222' });
  });

  afterAll(async () => {
    // Cleanup
    console.log('Cleaning up...');
    if (subdotManager) subdotManager.kill();
    if (subdotWorker) subdotWorker.kill();
    if (natsConnection) await natsConnection.close();
    execSync('kubectl delete -k k8s/kustomize/nats', { stdio: 'inherit' });
  });

  it('should process large Polkadot transfers', async () => {
    // Step 7: Publish filter spec
    console.log('Publishing filter spec...');
    execSync('./examples/advanced/polkadot-demo/send-large-transfer-filter.sh', { stdio: 'inherit' });

    // Step 8: Ensure filter is created in KV
    console.log('Ensuring filter is created in KV...');
    const filterSpec = {
      id: 'large-polkadot-transfers',
      source: 'nats://nats:4222?subject=polkadot.events',
      target: 'nats://nats:4222?subject=polkadot.events.large_transfers',
      filter: "event.section = 'balances' and event.method = 'Transfer' and $number(event.data[2]) > 1000000000000000",
      inputFormat: 'json',
      outputFormat: 'json',
      heartbeatTtlMs: 120000,
    };
    natsConnection.publish('subdot.manager.filters.new', sc.encode(JSON.stringify(filterSpec)));

    // Step 9: Publish a test event to NATS
    console.log('Publishing test event...');
    const testEvent = {
      phase: { ApplyExtrinsic: 3 },
      event: {
        section: 'balances',
        method: 'Transfer',
        data: ['14vL7S…src', '13K1hG…dst', '1200000000000000'], // 1.2 DOT
      },
      blockNumber: 14501877,
      timestamp: '2025-05-04T10:15:22Z',
    };
    natsConnection.publish('polkadot.events', sc.encode(JSON.stringify(testEvent)));

    // Step 10: Verify the filtered event
    console.log('Verifying filtered event...');
    const subscription = natsConnection.subscribe('polkadot.events.large_transfers');
    for await (const message of subscription) {
      const event = JSON.parse(sc.decode(message.data));
      expect(event.event.section).toBe('balances');
      expect(event.event.method).toBe('Transfer');
      expect(Number(event.event.data[2])).toBeGreaterThan(1e15); // 10 DOT
      break;
    }
  });
});