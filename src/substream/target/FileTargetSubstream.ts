import { createWriteStream, WriteStream } from 'fs';
import { BasicEvent } from '../../model/BasicEvent.js';
import { TargetSubstream } from './TargetSubstream.js';
import { logger } from '../../utils/Logger.js';

export class FileTargetSubstream implements TargetSubstream {
  private stream?: WriteStream;

  constructor(
    private readonly filePath?: string,
    private readonly format: 'json' | 'plain' = 'json'
  ) {}

  async start(): Promise<void> {
    if (this.filePath) {
      this.stream = createWriteStream(this.filePath, { flags: 'a', encoding: 'utf8' });
      logger.debug(`[FileTargetSubstream] Writing to file: ${this.filePath}`);
    } else {
      this.stream = process.stdout as unknown as WriteStream;
      logger.debug('[FileTargetSubstream] Writing to stdout');
    }
  }

  async push(event: BasicEvent): Promise<void> {
    if (!this.stream) throw new Error('Target stream is not initialized');

    const output = this.format === 'json'
      ? JSON.stringify(event.payload)
      : String(event.payload);

    logger.debug(`[FileTargetSubstream] Pushing event: ${output}`);
    this.stream.write(output + '\n');
  }

  async stop(): Promise<void> {
    if (this.stream && (this.stream as any).fd !== process.stdout.fd) {
      await new Promise((resolve) => this.stream?.end(resolve));
    }
  }
}
