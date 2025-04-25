import { connect, StringCodec, NatsConnection } from 'nats';
import { TargetSubstream } from './TargetSubstream.js';
import { NatsUrlSchema } from '../../url/NatsUrlSchema.js';
import { BasicEvent } from '../../model/BasicEvent.js';
import { logger } from '../../utils/Logger.js';

export interface NatsTargetOptions {
  url: string;
  subjectPrefix: string;
}

export class NatsTargetSubstream implements TargetSubstream {
  private nc?: NatsConnection;
  private readonly url: string;
  private readonly sc = StringCodec();
  private subjectPrefix: string;

  constructor(_init: unknown, opts: NatsTargetOptions) {
    this.url = opts.url;
    this.subjectPrefix = this.parseSubjectPrefix(this.url);
  }

  private parseSubjectPrefix(url: string): string {
    const parsed = NatsUrlSchema.parse(url);
    // Normalize subjectPrefix: remove trailing . or .*
    return parsed.subject.replace(/\.\*$/, '').replace(/\.$/, '');
  }

  async start(): Promise<void> {
    const parsed = NatsUrlSchema.parse(this.url);

    const servers = parsed.getServers(); // Use getServers method
    const subject = parsed.subject; // Use subject from NatsUrlSchema

    this.nc = await connect({
      servers,
      ...(parsed.user && { user: parsed.user }),
      ...(parsed.pass && { pass: parsed.pass }),
    });

    logger.info(`Connected to NATS server at ${servers}, using subject: ${subject}`);
  }

  private getSubject(event: BasicEvent): string {
    const section = event.payload?.section || 'unknown';
    const method = event.payload?.method || 'unknown';
    return `${this.subjectPrefix}.${section}.${method}`;
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
