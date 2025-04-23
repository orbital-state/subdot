import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FilterPipeline } from './FilterPipeline.js';

// filepath: /home/yy/dev/w3f/subdot/src/cli/command/FilterPipeline.test.ts

vi.mock('../../substream/source/createSourceSubstream.js', () => ({
  createSourceSubstream: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    [Symbol.asyncIterator]: async function* () {
      yield { id: 1, data: 'event1' };
      yield { id: 2, data: 'event2' };
    },
  })),
}));

vi.mock('../../substream/target/createTargetSubstream.js', () => ({
  createTargetSubstream: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    push: vi.fn(),
  })),
}));

vi.mock('../../processor/BasicEventProcessor.js', () => ({
  BasicEventProcessor: vi.fn(() => ({
    process: vi.fn(async function* (event) {
      yield { ...event, processed: true };
    }),
  })),
}));

describe('FilterPipeline', () => {
  let filterPipeline: FilterPipeline;

  beforeEach(() => {
    filterPipeline = new FilterPipeline('$.data', 'sourceUrl', 'targetUrl', 'json', 'json');
  });

  describe('Substream lifecycle', () => {
    it('should start and stop substreams correctly', async () => {
      const sourceStart = vi.spyOn(filterPipeline['sourceSubstream'], 'start');
      const sourceStop = vi.spyOn(filterPipeline['sourceSubstream'], 'stop');
      const targetStart = vi.spyOn(filterPipeline['targetSubstream'], 'start');
      const targetStop = vi.spyOn(filterPipeline['targetSubstream'], 'stop');

      await filterPipeline.execute();

      expect(sourceStart).toHaveBeenCalledOnce();
      expect(targetStart).toHaveBeenCalledOnce();
      expect(sourceStop).toHaveBeenCalledOnce();
      expect(targetStop).toHaveBeenCalledOnce();
    });
  });

  describe('Event processing', () => {
    it('should process and push events correctly', async () => {
      const pushSpy = vi.spyOn(filterPipeline['targetSubstream'], 'push');

      await filterPipeline.execute();

      expect(pushSpy).toHaveBeenCalledTimes(2);
      expect(pushSpy).toHaveBeenCalledWith({ id: 1, data: 'event1', processed: true });
      expect(pushSpy).toHaveBeenCalledWith({ id: 2, data: 'event2', processed: true });
    });
  });

  describe('Error handling', () => {
    it('should handle errors and stop substreams', async () => {
      const sourceStop = vi.spyOn(filterPipeline['sourceSubstream'], 'stop');
      const targetStop = vi.spyOn(filterPipeline['targetSubstream'], 'stop');
      vi.spyOn(filterPipeline['processor'], 'process').mockImplementationOnce(() => {
        throw new Error('Processing error');
      });

      await expect(filterPipeline.execute()).rejects.toThrow('Processing error');

      expect(sourceStop).toHaveBeenCalledOnce();
      expect(targetStop).toHaveBeenCalledOnce();
    });
  });
});