import { connect, NatsConnection, StringCodec, Subscription } from 'nats';
import { BasicEvent } from '../../model/BasicEvent.js';
import { SourceSubstream } from './SourceSubstream.js';
import { NatsUrlSchema } from '../../url/NatsUrlSchema.js';
import { UrlSchemaFactory } from '../../url/UrlSchemaFactory.js';
import Config from '../../config/config.js';
import { logger } from '../../utils/Logger.js';

// TODO: 
// - implement a proper backoff strategy for reconnections 
// - use BUfferedSourceSubstream to handle backpressure
// - implement a proper error handling strategy
// - implement a proper logging strategy
export class NatsSourceSubstream implements SourceSubstream {
  private connection?: NatsConnection;
  private subscription?: Subscription;
  private buffer: BasicEvent[] = [];
  private resolveQueue: (() => void)[] = [];
  private isDone = false;
  private maxBufferSize: number = 10485760; // Default to 10MB

  constructor(
    private readonly rawUrl: string,
    private readonly format: 'json' | 'plain' = 'json'
  ) {}

  async start(): Promise<void> {
    const configInstance = await Config.getInstance();
    const config = configInstance.getConfig();
    this.maxBufferSize = config.nats?.maxsourcequeue || 10485760;

    const parsed = UrlSchemaFactory.parseUrlSchema(this.rawUrl);

    if (!(parsed instanceof NatsUrlSchema)) {
      throw new Error(`[NatsSourceSubstream] Invalid schema type: expected NatsUrlSchema`);
    }

    const {
      host,
      port = 4222,
      user,
      pass,
      path: subjectPath,
    } = parsed;

    const subject = subjectPath?.replace(/^\//, '') || 'events';
    const servers = `${host}:${port}`;
    const sc = StringCodec();

    this.connection = await connect({
      servers,
      ...(user && { user }),
      ...(pass && { pass }),
    });

    this.subscription = this.connection.subscribe(subject);

    (async () => {
      for await (const msg of this.subscription!) {
        const raw = sc.decode(msg.data);
        const payload = this.format === 'json' ? this.safeParseJson(raw) : raw;
        if (payload != null) {
          this.enqueue(BasicEvent.from(payload));
        }
      }
      this.finish();
    })().catch(err => {
      logger.error('[NatsSourceSubstream] Subscription error:', err);
      this.finish();
    });
  }

  async stop(): Promise<void> {
    this.finish();
    await this.subscription?.unsubscribe();
    await this.connection?.drain();
  }

  private safeParseJson(input: string): any | null {
    try {
      return JSON.parse(input);
    } catch {
      logger.error('[NatsSourceSubstream] Invalid JSON:', input);
      return null;
    }
  }

  private enqueue(event: BasicEvent) {
    if (this.buffer.length >= this.maxBufferSize) {
      logger.warn(`[NatsSourceSubstream] Buffer full, dropping event`);
      return;
    }

    this.buffer.push(event);
    this.resolveQueue.forEach((resolve) => resolve());
    this.resolveQueue = [];
  }

  private finish() {
    this.isDone = true;
    this.resolveQueue.forEach((resolve) => resolve());
    this.resolveQueue = [];
  }

  async *[Symbol.asyncIterator](): AsyncIterator<BasicEvent> {
    while (!this.isDone || this.buffer.length > 0) {
      if (this.buffer.length === 0) {
        await new Promise<void>((resolve) => this.resolveQueue.push(resolve));
      }

      while (this.buffer.length > 0) {
        yield this.buffer.shift()!;
      }
    }
  }
}
