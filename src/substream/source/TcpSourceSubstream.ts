import { connect } from 'net';
import * as readline from 'readline';
import * as url from 'url';
import { BasicEvent } from '../../model/BasicEvent.js';
import { SourceSubstream } from './SourceSubstream.js';
import Config from '../../config/config.js';
import { logger } from '../../utils/Logger.js';
import { BufferedSourceSubstream } from './BufferedSourceSubstream.js';

export class TcpSourceSubstream extends BufferedSourceSubstream<BasicEvent> implements SourceSubstream {
  private socket?: ReturnType<typeof connect>;
  private rl?: readline.Interface;
  private running = false;

  constructor(
    private readonly tcpUrl: string,
    private readonly format: 'json' | 'plain' = 'json',
    maxBufferSize?: number // Optional parameter to override default buffer size
  ) {
    super(maxBufferSize); // Pass maxBufferSize to the parent class constructor
  }

  async start(): Promise<void> {
    const configInstance = await Config.getInstance();

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

    this.running = true;

    this.rl.on('line', (line) => {
      const data = this.format === 'json' ? this.safeParseJson(line) : line;
      if (data != null) {
        this.enqueueEvent(BasicEvent.from(data));
      }
    });

    this.rl.on('close', () => {
      this.running = false;
      logger.info('[TcpSourceSubstream] Connection closed.');
    });

    this.socket.on('error', (err) => {
      logger.error('[TcpSourceSubstream] Socket error:', err);
      this.running = false;
    });
  }

  async stop(): Promise<void> {
    try {
      this.rl?.close();
      this.socket?.destroy();
      logger.info('[TcpSourceSubstream] Stopped.');
    } finally {
      this.running = false;
    }
  }

  private safeParseJson(line: string): any | null {
    try {
      return JSON.parse(line);
    } catch {
      logger.error('[TcpSourceSubstream] Invalid JSON:', line);
      return null;
    }
  }

  protected isRunning(): boolean {
    return this.running;
  }
}
