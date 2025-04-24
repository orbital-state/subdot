import { ApiPromise, WsProvider } from '@polkadot/api';
import type { EventRecord, Header } from '@polkadot/types/interfaces';
import { BasicEvent } from '../../model/BasicEvent.js';
import { SourceSubstream } from './SourceSubstream.js';
import { Vec } from '@polkadot/types';
import { SmoldotUrlSchema } from '../../url/SmoldotUrlSchema.js';

export class SmoldotSourceSubstream implements SourceSubstream {
  private api!: ApiPromise;
  private provider!: WsProvider;
  private eventQueue: BasicEvent[] = [];
  private running = false;
  private maxBufferSize: number = 10485760; // Default to 10MB
  private currentBufferSize: number = 0; // Tracks the current buffer size in bytes
  private parsedUrl: SmoldotUrlSchema;

  constructor(
    url: string, // Accept a string as the URL
    private query?: string,
    private output?: string,
    maxBufferSize?: number // Optional parameter to override default buffer size
  ) {
    this.parsedUrl = SmoldotUrlSchema.parse(url); // Parse the string into SmoldotUrlSchema

    if (maxBufferSize) {
      this.maxBufferSize = maxBufferSize;
    }
  }

  async start(): Promise<void> {
    console.log(`🔗 Connecting to ${this.parsedUrl}...`);
    const wsUrl = this.getWebSocketUrl(); // Get the WebSocket-compatible URL
    this.provider = new WsProvider(wsUrl);
    this.api = await ApiPromise.create({ provider: this.provider });

    console.log(`✅ Connected to ${wsUrl}`);

    this.running = true;

    this.api.rpc.chain.subscribeFinalizedHeads(async (header: Header) => {
      if (!this.running) return;

      const blockHash = header.hash;
      const blockNumber = header.number.toString();
      const historicApi = await this.api.at(blockHash);
      const events = await historicApi.query.system.events();

      (events as Vec<EventRecord>).forEach(({ event, phase }) => {
        console.log(`📦 ${event.section}.${event.method} [${phase.toString()}]`);
        const basicEvent: BasicEvent = BasicEvent.from({
          blockNumber,
          method: event.method,
          section: event.section,
          data: event.data.toHuman(),
          phase: phase.toString()
        });

        this.enqueueEvent(basicEvent);

        if (this.output !== 'json') {
          console.log(`📦 ${event.section}.${event.method} [${phase.toString()}]`);
        }
      });

      if (this.output === 'json') {
        console.log(JSON.stringify({ block: blockNumber }));
      }
    });
  }

  stop(): void {
    this.running = false;
    this.provider.disconnect();
  }

  private getWebSocketUrl(): string {
    // Ensure the URL starts with ws:// or wss://
    const scheme = String(this.parsedUrl.scheme).replace('smoldot.', ''); // Convert to string and remove "smoldot." prefix
    if (scheme === 'ws' || scheme === 'wss') {
      return `${scheme}://${this.parsedUrl.host}${this.parsedUrl.path || ''}`;
    }
    throw new Error(`Invalid WebSocket scheme: ${scheme}`);
  }

  private enqueueEvent(event: BasicEvent): void {
    const eventSize = this.calculateEventSize(event);

    if (this.currentBufferSize + eventSize > this.maxBufferSize) {
      console.warn(`[SmoldotSourceSubstream] Buffer full, dropping event`);
      return;
    }

    this.eventQueue.push(event);
    this.currentBufferSize += eventSize;
  }

  private calculateEventSize(event: BasicEvent): number {
    // Approximate the size of the event in bytes by converting it to a JSON string
    return Buffer.byteLength(JSON.stringify(event), 'utf-8');
  }

  async *[Symbol.asyncIterator](): AsyncIterator<BasicEvent> {
    while (this.running || this.eventQueue.length > 0) {
      if (this.eventQueue.length > 0) {
        const event = this.eventQueue.shift()!;
        this.currentBufferSize -= this.calculateEventSize(event); // Adjust buffer size
        yield event;
      } else {
        await new Promise(resolve => setTimeout(resolve, 100)); // prevent tight loop
      }
    }
  }
}
