import { ApiPromise, WsProvider } from '@polkadot/api';
import type { EventRecord, Header } from '@polkadot/types/interfaces';
import { BasicEvent } from '../../model/BasicEvent.js';
import { SourceSubstream } from './SourceSubstream.js';
import { Vec } from '@polkadot/types';
import { SmoldotUrlSchema } from '../../url/SmoldotUrlSchema.js';
import { logger } from '../../utils/Logger.js';

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
    private outputFormat?: string,
    maxBufferSize?: number // Optional parameter to override default buffer size
  ) {
    this.parsedUrl = SmoldotUrlSchema.parse(url); // Parse the string into SmoldotUrlSchema

    if (this.outputFormat !== 'json') {
      logger.warn(`Unsupported output format: ${this.outputFormat}. Defaulting to 'json'.`);
      this.outputFormat = 'json'; // Default to 'json' if unsupported format is provided
    }

    if (maxBufferSize) {
      this.maxBufferSize = maxBufferSize;
      logger.info(`Max buffer size set to ${this.maxBufferSize} bytes.`);
    }
  }

  async start(): Promise<void> {
    logger.info(`🔗 Connecting to ${this.parsedUrl}...`);
    const wsUrl = this.getWebSocketUrl(); // Get the WebSocket-compatible URL
    this.provider = new WsProvider(wsUrl);

    try {
      this.api = await ApiPromise.create({ provider: this.provider });
      logger.info(`✅ Connected to ${wsUrl}`);
    } catch (error) {
      logger.error(`Failed to connect to ${wsUrl}: ${error}`);
      throw error;
    }

    this.running = true;

    this.api.rpc.chain.subscribeFinalizedHeads(async (header: Header) => {
      if (!this.running) return;

      const blockHash = header.hash;
      const blockNumber = header.number.toString();
      logger.debug(`Received finalized block: ${blockNumber} (hash: ${blockHash})`);

      try {
        const historicApi = await this.api.at(blockHash);
        const events = await historicApi.query.system.events();

        (events as Vec<EventRecord>).forEach(({ event, phase }) => {
          logger.info(`📦 Event: ${event.section}.${event.method} [${phase.toString()}]`);
          const basicEvent: BasicEvent = BasicEvent.from({
            blockNumber,
            method: event.method,
            section: event.section,
            data: event.data.toHuman(),
            phase: phase.toString()
          });

          this.enqueueEvent(basicEvent);
        });
      } catch (error) {
        logger.error(`Error processing block ${blockNumber}: ${error}`);
      }
    });
  }

  stop(): void {
    this.running = false;
    this.provider.disconnect();
    logger.info(`🛑 Disconnected from ${this.parsedUrl}`);
  }

  private getWebSocketUrl(): string {
    const scheme = String(this.parsedUrl.scheme).replace('smoldot.', ''); // Convert to string and remove "smoldot." prefix
    if (scheme === 'ws' || scheme === 'wss') {
      const wsUrl = `${scheme}://${this.parsedUrl.host}${this.parsedUrl.path || ''}`;
      logger.debug(`WebSocket URL resolved: ${wsUrl}`);
      return wsUrl;
    }
    const errorMessage = `Invalid WebSocket scheme: ${scheme}`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  private enqueueEvent(event: BasicEvent): void {
    const eventSize = this.calculateEventSize(event);

    if (this.currentBufferSize + eventSize > this.maxBufferSize) {
      logger.warn(`[SmoldotSourceSubstream] Buffer full, dropping event`);
      return;
    }

    this.eventQueue.push(event);
    this.currentBufferSize += eventSize;
    logger.debug(`Event enqueued. Current buffer size: ${this.currentBufferSize} bytes.`);
  }

  private calculateEventSize(event: BasicEvent): number {
    const size = Buffer.byteLength(JSON.stringify(event), 'utf-8');
    logger.debug(`Calculated event size: ${size} bytes.`);
    return size;
  }

  async *[Symbol.asyncIterator](): AsyncIterator<BasicEvent> {
    while (this.running || this.eventQueue.length > 0) {
      if (this.eventQueue.length > 0) {
        const event = this.eventQueue.shift()!;
        this.currentBufferSize -= this.calculateEventSize(event); // Adjust buffer size
        logger.debug(`Event dequeued. Current buffer size: ${this.currentBufferSize} bytes.`);
        yield event;
      } else {
        await new Promise(resolve => setTimeout(resolve, 100)); // prevent tight loop
      }
    }
    logger.info(`Async iterator stopped.`);
  }
}
