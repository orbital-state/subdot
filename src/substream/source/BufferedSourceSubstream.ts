import { BufferedQueue } from '../../utils/BufferedQueue.js';
import { logger } from '../../utils/Logger.js';


export abstract class BufferedSourceSubstream<E> {
  protected eventQueue: BufferedQueue<E>;

  constructor(maxBufferSize: number = 10485760) {
    this.eventQueue = new BufferedQueue<E>(maxBufferSize);
  }

  public enqueueEvent(event: E): void {
    const success = this.eventQueue.enqueue(event, this.calculateEventSize);
    if (!success) {
      logger.warn(`[BufferedSourceSubstream] Event dropped due to buffer limit.`);
    }
  }

  public calculateEventSize(event: E): number {
    return Buffer.byteLength(JSON.stringify(event), 'utf-8');
  }

  async *[Symbol.asyncIterator](): AsyncIterator<E> {
    while (this.isRunning() || !this.eventQueue.isEmpty()) {
      const event = this.eventQueue.dequeue(this.calculateEventSize.bind(this));
      if (event) {
        yield event;
      } else {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    logger.info(`[BufferedSourceSubstream] Async iterator stopped.`);
  }

  public getBufferSize(): number {
    return this.eventQueue.getBufferSize();
  }

  public getQueueLength(): number {
    return this.eventQueue.getQueueLength();
  }

  // Subclasses should define this to indicate running state
  public abstract isRunning(): boolean;
}
