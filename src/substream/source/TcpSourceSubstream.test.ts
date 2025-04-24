import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { TcpSourceSubstream } from './TcpSourceSubstream.js';
import { connect } from 'net';
import * as readline from 'readline';
import { BasicEvent } from '../../model/BasicEvent.js';
import { logger } from '../../utils/Logger.js';

const TEN_MB = 10 * 1024 * 1024; // 10MB in bytes

vi.mock('net', () => ({
  connect: vi.fn(),
}));

vi.mock('readline', () => ({
  createInterface: vi.fn(),
}));

vi.mock('../../config/config.js', () => ({
  default: {
    getInstance: vi.fn(),
  },
}));

// don't mock the logger really
// vi.mock('../../utils/Logger.js', () => ({
//   logger: {
//     info: vi.fn(),
//     error: vi.fn(),
//     warn: vi.fn(),
//     debug: vi.fn(),
//     level: 'info',
//   },
// }));

class TestableTcpSourceSubstream extends TcpSourceSubstream {
  public testEnqueueEvent(event: BasicEvent) {
    this.enqueueEvent(event); // Call the protected method
  }
}

describe('TcpSourceSubstream', () => {
  let tcpSource: TcpSourceSubstream;

  beforeEach(() => {
    vi.clearAllMocks();
    tcpSource = new TcpSourceSubstream('tcp://localhost:1234', 'json', TEN_MB);
  });

  afterEach(async () => {
    await tcpSource.stop();
  });

  it('should parse valid hostname and port', async () => {
    const mockSocket = { setEncoding: vi.fn(), on: vi.fn(), destroy: vi.fn() };
    (connect as Mock).mockReturnValue(mockSocket);

    const mockRl = { on: vi.fn(), close: vi.fn() };
    (readline.createInterface as Mock).mockReturnValue(mockRl);

    await tcpSource.start();

    expect(connect).toHaveBeenCalledWith(1234, 'localhost');
    expect(mockSocket.setEncoding).toHaveBeenCalledWith('utf8');
    expect(readline.createInterface).toHaveBeenCalledWith({
      input: mockSocket,
      crlfDelay: Infinity,
    });
  });

  it('should throw an error for invalid TCP URL', async () => {
    tcpSource = new TcpSourceSubstream('invalid-url', 'json');
    await expect(tcpSource.start()).rejects.toThrowError(
      '[TcpSourceSubstream] Invalid TCP URL: invalid-url'
    );
  });

  it('should enqueue events and respect buffer size', async () => {
    const mockSocket = { setEncoding: vi.fn(), on: vi.fn(), destroy: vi.fn() };
    (connect as Mock).mockReturnValue(mockSocket);

    const mockRl = { on: vi.fn(), close: vi.fn() };
    (readline.createInterface as Mock).mockReturnValue(mockRl);

    await tcpSource.start();

    const mockEvent = { id: 1, data: 'test' };
    const mockLine = JSON.stringify(mockEvent);

    // Simulate the 'line' event being triggered
    const enqueueSpy = vi.spyOn(tcpSource, 'enqueueEvent'); // Spy on enqueueEvent before triggering the event

    const lineCallback = mockRl.on.mock.calls.find(call => call[0] === 'line')?.[1];
    if (lineCallback) {
      lineCallback(mockLine); // Trigger the 'line' event
    }

    console.log(tcpSource.getQueueLength()); // Inspect the buffer contents
    expect(tcpSource.getQueueLength()).toBe(1);

    expect(enqueueSpy).toHaveBeenCalledTimes(1);
    expect(enqueueSpy).toHaveBeenCalledWith(BasicEvent.from(mockEvent));
    expect(tcpSource.getQueueLength()).toBe(1);

    // Simulate buffer overflow
    for (let i = 0; i < 15; i++) {
      if (lineCallback) {
        lineCallback(mockLine); // Trigger the 'line' event multiple times
      }
    }
    expect(tcpSource.getQueueLength()).toBe(16); // number of events in the buffer
    expect(tcpSource.getBufferSize()).toBeLessThanOrEqual(TEN_MB); // Check buffer size
    console.log('Final queue length:', tcpSource.getQueueLength());
    console.log('Final buffer size:', tcpSource.getBufferSize());
  });

  it('should stop gracefully', async () => {
    const mockSocket = { setEncoding: vi.fn(), on: vi.fn(), destroy: vi.fn() };
    (connect as Mock).mockReturnValue(mockSocket);

    const mockRl = { on: vi.fn(), close: vi.fn() };
    (readline.createInterface as Mock).mockReturnValue(mockRl);

    await tcpSource.start();
    await tcpSource.stop();

    expect(mockRl.close).toHaveBeenCalled();
    expect(mockSocket.destroy).toHaveBeenCalled();
  });

  it('should enqueue events using TestableTcpSourceSubstream', () => {
    const testTcpSource = new TestableTcpSourceSubstream('tcp://localhost:1234', 'json', TEN_MB);
    const mockEvent = BasicEvent.from({ id: 1, data: 'test' });
    // increase logger verbosity
    
    logger.level = 'debug';
    testTcpSource.testEnqueueEvent(mockEvent);
    expect(testTcpSource.getQueueLength()).toBe(1);
  });
});