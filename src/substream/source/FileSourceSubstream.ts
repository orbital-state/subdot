import * as readline from 'readline';
import { createReadStream } from 'fs';
import { BasicEvent } from '../../model/BasicEvent.js';
import { SourceSubstream } from './SourceSubstream.js';
import { logger } from '../../utils/Logger.js';

export class FileSourceSubstream implements SourceSubstream {
  constructor(
    private readonly filePath?: string,
    private readonly format: 'json' | 'plain' = 'json'
  ) {}

  async start(): Promise<void> {
    logger.debug('[FileSourceSubstream] Stream ready');
  }

  async stop(): Promise<void> {
    logger.debug('[FileSourceSubstream] Stream stopped');
  }

  async *[Symbol.asyncIterator](): AsyncIterator<BasicEvent> {
    const stream = this.filePath
      ? createReadStream(this.filePath, { encoding: 'utf8' })
      : process.stdin;

    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    for await (const line of rl) {
      const data = this.format === 'json' ? this.safeParseJson(line) : line;
      if (data != null) {
        yield BasicEvent.from(data);
      }
    }

    rl.close();
  }

  private safeParseJson(line: string): any | null {
    try {
      return JSON.parse(line);
    } catch {
      logger.error('[FileSourceSubstream] Invalid JSON:', line);
      return null;
    }
  }
}
