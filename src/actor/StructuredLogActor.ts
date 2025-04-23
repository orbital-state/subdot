import { Actor } from './Actor.js';
import { BasicEvent } from '../model/BasicEvent.js';
import fs from 'fs';

/**
 * Actor that logs structured JSON events to stdout or a file.
 */
export class StructuredLogActor implements Actor {
  constructor(private outputFile?: string) {}

  async handle(event: BasicEvent): Promise<void> {
    const json = JSON.stringify(event, null, 2);
    if (this.outputFile) {
      fs.appendFileSync(this.outputFile, json + '\n');
    } else {
      console.log(json);
    }
  }
}
