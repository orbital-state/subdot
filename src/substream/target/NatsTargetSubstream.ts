import { connect, StringCodec, NatsConnection } from 'nats';
import { TargetSubstream } from './TargetSubstream.js';
import { NatsUrlSchema } from '../../url/NatsUrlSchema.js';
import { BasicEvent } from '../../model/BasicEvent.js';
import { logger } from '../../utils/Logger.js';


export class NatsTargetSubstream implements TargetSubstream {
  private nc?: NatsConnection;
  private readonly url: string;
  private readonly sc = StringCodec();

  constructor(url: string) {
    this.url = url;
  }

  async start(): Promise<void> {
    const parsed = NatsUrlSchema.parse(this.url);

    const servers = parsed.getServers(); // Use getServers method
    const subjectPrefix = parsed.subjectPrefix; // Use subject from NatsUrlSchema

    this.nc = await connect({
      servers,
      ...(parsed.user && { user: parsed.user }),
      ...(parsed.pass && { pass: parsed.pass }),
    });

    logger.info(`Connected to NATS server at ${servers}, using subject: ${subjectPrefix}`);
  }

  private getSubject(event: BasicEvent): string {
    const section = event.payload?.section || 'unknown';
    const method = event.payload?.method || 'unknown';
    return `${this.subjectPrefix}.${section}.${method}`;
  }

  public get subjectPrefix(): string {
    const parsed = NatsUrlSchema.parse(this.url);
    return parsed.subjectPrefix;
  }

  async push(event: BasicEvent): Promise<void> {
    if (!this.nc) throw new Error('NATS connection not initialized');

    const subject = this.getSubject(event);
    await this.nc.publish(subject, this.sc.encode(event.toJSON()));
  }

  async stop(): Promise<void> {
    if (this.nc) await this.nc.close();
  }
}
