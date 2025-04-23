import { CommandInterface } from './CommandInterface.js';
import { FilterPipeline } from './FilterPipeline.js';

export class FilterCommand implements CommandInterface {
  private pipeline: FilterPipeline;

  constructor(options: {
    query: string,
    source?: string,
    target?: string,
    inputFormat?: 'json' | 'plain',
    outputFormat?: 'json' | 'plain'
  }) {
    this.pipeline = new FilterPipeline(
      options.query,
      options.source,
      options.target,
      options.inputFormat ?? 'json',
      options.outputFormat ?? 'json'
    );
  }

  async run(): Promise<void> {
    await this.pipeline.execute();
  }
}
