import { createSourceSubstream } from '../../substream/source/createSourceSubstream.js';
import { createTargetSubstream } from '../../substream/target/createTargetSubstream.js';
import { JsonataFilterRule } from '../../filter/JsonataFilterRule.js';
import { BasicEventProcessor } from '../../processor/BasicEventProcessor.js';
import { SourceSubstream } from '../../substream/source/SourceSubstream.js';
import { TargetSubstream } from '../../substream/target/TargetSubstream.js';

export class FilterPipeline {
  private sourceSubstream: SourceSubstream;
  private targetSubstream: TargetSubstream;
  private processor: BasicEventProcessor;

  constructor(
    private readonly filterExpression: string,
    private readonly sourceUrl: string = 'stdin',
    private readonly targetUrl: string = 'stdout',
    private readonly inputFormat: 'json' | 'plain' = 'json',
    private readonly outputFormat: 'json' | 'plain' = 'json'
  ) {
    if (!filterExpression) {
      throw new Error('Filter expression is required');
    }

    this.sourceSubstream = createSourceSubstream(this.sourceUrl, this.inputFormat);
    this.targetSubstream = createTargetSubstream(this.targetUrl, this.outputFormat);
    this.processor = new BasicEventProcessor(
      this.filterExpression ? [new JsonataFilterRule(this.filterExpression)] : []
    );
  }

  async execute(): Promise<void> {
    await this.sourceSubstream.start();
    await this.targetSubstream.start();

    try {
      for await (const event of this.sourceSubstream) {
        for await (const processedEvent of this.processor.process(event)) {
          await this.targetSubstream.push(processedEvent);
        }
      }
    } finally {
      if (this.sourceSubstream.stop) await this.sourceSubstream.stop();
      if (this.targetSubstream.stop) await this.targetSubstream.stop();
    }
  }
}
