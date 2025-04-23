import { connect } from 'net';
import * as readline from 'readline';
import * as url from 'url';
import { BasicEvent } from '../../model/BasicEvent.js';
import { SourceSubstream } from './SourceSubstream.js';
import Config from '../../config/config.js';
import { logger } from '../../utils/Logger.js';

export class TcpSourceSubstream implements SourceSubstream {
  private buffer: BasicEvent[] = [];
  private resolveQueue: (() => void)[] = [];
  private isDone = false;
  private maxBufferSize: number = 10485760; // 10MB default
  private socket?: ReturnType<typeof connect>;
  private rl?: readline.Interface;

  constructor(
    private readonly tcpUrl: string,
    private readonly format: 'json' | 'plain' = 'json'
  ) {}

  async start(): Promise<void> {
    const configInstance = await Config.getInstance();
    const config = configInstance.getConfig();
    this.maxBufferSize = config.tcp?.maxsourcequeue || 10485760;

    const parsed = url.parse(this.tcpUrl);
    const hostname = parsed.hostname;
    const port = parsed.port ? parseInt(parsed.port, 10) : undefined;

    if (!hostname || !port) {
      throw new Error(`[TcpSourceSubstream] Invalid TCP URL: ${this.tcpUrl}`);
    }

    this.socket = connect(port, hostname);
    this.socket.setEncoding('utf8');

    this.rl = readline.createInterface({
      input: this.socket,
      crlfDelay: Infinity,
    });

    this.rl.on('line', (line) => {
      const data = this.format === 'json' ? this.safeParseJson(line) : line;
      if (data != null) {
        this.enqueue(BasicEvent.from(data));
      }
    });

    this.rl.on('close', () => {
      this.finish();
    });

    this.socket.on('error', (err) => {
      logger.error('[TcpSourceSubstream] Socket error:', err);
      this.finish();
    });
  }

  async stop(): Promise<void> {
    this.finish();
    this.rl?.close();
    this.socket?.destroy();
  }

  private safeParseJson(line: string): any | null {
    try {
      return JSON.parse(line);
    } catch {
      logger.error('[TcpSourceSubstream] Invalid JSON:', line);
      return null;
    }
  }

  private enqueue(event: BasicEvent) {
    if (this.buffer.length >= this.maxBufferSize) {
      logger.warn('[TcpSourceSubstream] Buffer full, dropping event');
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
