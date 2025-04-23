import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { FilterCommand } from './FilterCommand.js';
import { FilterPipeline } from './FilterPipeline.js';

vi.mock('./FilterPipeline', () => {
  return {
    FilterPipeline: vi.fn().mockImplementation(() => ({
      execute: vi.fn(async () => {})
    }))
  };
});

describe('FilterCommand', () => {
  let filterCommand: FilterCommand;
  let mockPipelineExecute: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    filterCommand = new FilterCommand({
      query: '$.data',
      source: 'sourceUrl',
      target: 'targetUrl',
      inputFormat: 'json',
      outputFormat: 'json'
    });

    mockPipelineExecute = (FilterPipeline as unknown as Mock).mock.results[0].value.execute;
  });

  it('should construct pipeline and execute it', async () => {
    await filterCommand.run();
    expect(mockPipelineExecute).toHaveBeenCalled();
  });
});

