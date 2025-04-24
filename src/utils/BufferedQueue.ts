import { logger } from '../utils/Logger.js';

export class BufferedQueue<T> {
  private queue: T[] = [];
  private currentBufferSize: number = 0;

  constructor(private maxBufferSize: number = 10485760) {} // Default to 10MB

  enqueue(item: T, calculateSize: (item: T) => number): boolean {
    const itemSize = calculateSize(item);

    if (this.currentBufferSize + itemSize > this.maxBufferSize) {
      logger.warn(`[BufferedQueue] Buffer full, dropping item`);
      return false;
    }

    this.queue.push(item);
    this.currentBufferSize += itemSize;
    logger.debug(`Item enqueued. Current buffer size: ${this.currentBufferSize} bytes.`);
    return true;
  }

  dequeue(calculateSize: (item: T) => number): T | undefined {
    if (this.queue.length === 0) return undefined;

    const item = this.queue.shift()!;
    this.currentBufferSize -= calculateSize(item);
    logger.debug(`Item dequeued. Current buffer size: ${this.currentBufferSize} bytes.`);
    return item;
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  getBufferSize(): number {
    return this.currentBufferSize;
  }
  
  getQueueLength(): number {
    return this.queue.length;
  }
}