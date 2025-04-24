import { ApiPromise, WsProvider } from '@polkadot/api';
import type { EventRecord, Header } from '@polkadot/types/interfaces';
import { BasicEvent } from '../../model/BasicEvent.js';
import { SourceSubstream } from './SourceSubstream.js';
import { Vec } from '@polkadot/types';
import { SmoldotUrlSchema } from '../../url/SmoldotUrlSchema.js';
import { logger } from '../../utils/Logger.js';
import { BufferedSourceSubstream } from './BufferedSourceSubstream.js';


export class SmoldotSourceSubstream extends BufferedSourceSubstream<BasicEvent> implements SourceSubstream {
  private api!: ApiPromise;
  private provider!: WsProvider;
  private running = false;
  private parsedUrl: SmoldotUrlSchema;

  constructor(
    url: string, // Accept a string as the URL
    private outputFormat?: string,
    maxBufferSize?: number // Optional parameter to override default buffer size
  ) {
    super(maxBufferSize); // Pass maxBufferSize to the parent class constructor
    this.parsedUrl = SmoldotUrlSchema.parse(url); // Parse the string into SmoldotUrlSchema

    if (this.outputFormat !== 'json') {
      logger.warn(`Unsupported output format: ${this.outputFormat}. Defaulting to 'json'.`);
      this.outputFormat = 'json'; // Default to 'json' if unsupported format is provided
    }
  }

  async start(): Promise<void> {
    logger.info(`🔗 Connecting to ${this.parsedUrl}...`);
    const wsUrl = this.getWebSocketUrl(); // Get the WebSocket-compatible URL
    this.provider = new WsProvider('wss://rpc.polkadot.io');

    try {
      this.api = await ApiPromise.create({ provider: this.provider });
      logger.info(`✅ Connected to ${wsUrl}`);
    } catch (error) {
      logger.error(`Failed to connect to ${wsUrl}: ${error}`);
      throw error;
    }

    this.running = true;

    this.api.rpc.chain.subscribeFinalizedHeads(async (header: Header) => {
      if (!this.api) {
        logger.error('API is not initialized.');
        return;
      }
      if (!this.running) {
        logger.info('Subscription stopped.');
        return;
      }

      const blockHash = header.hash;
      const blockNumber = header.number.toString();
      logger.debug(`Received finalized block: ${blockNumber} (hash: ${blockHash})`);

      try {
        const historicApi = await this.api.at(blockHash);
        const events = await historicApi.query.system.events();

        (events as Vec<EventRecord>).forEach(({ event, phase }) => {
          logger.debug(`📦 Event: ${event.section}.${event.method} [${phase.toString()}]`);
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
      let wsUrl = `${scheme}://${this.parsedUrl.host}`;
      if (this.parsedUrl.path) {
        wsUrl += this.parsedUrl.path; // Append the path if it exists
      }
      logger.debug(`WebSocket URL resolved: ${wsUrl}`);
      return wsUrl;
    }
    const errorMessage = `Invalid WebSocket scheme: ${scheme}`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  protected isRunning(): boolean {
    return this.running; // Implement the abstract method from BufferedSourceSubstream
  }
}
