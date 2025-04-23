import { EventProcessor } from './EventProcessor.js';
import { BasicEvent } from '../model/BasicEvent.js';
import { JsonataFilterRule } from '../filter/JsonataFilterRule.js';
import { Actor } from '../actor/Actor.js';

/**
 * Basic implementation of EventProcessor that is schema-agnostic.
 * Applies JSONata filters and routes events to attached actors.
 */
export class BasicEventProcessor implements EventProcessor {
  constructor(
    private readonly filters: JsonataFilterRule[] = [],
    private readonly actors: Actor[] = []
  ) {}

  validate(event: BasicEvent): boolean {
    // We don't have a schema to validate against, so we assume all events are valid.
    return true;
  }

  async* process(event: BasicEvent): AsyncGenerator<BasicEvent> {
    // Check if the event passes all filters.
    const passes = (await Promise.all(this.filters.map(filter => filter.matches(event)))).every(Boolean);
    if (!passes) {
      // console.debug('Event did not pass filters:', event);
      return; // Skip the event if it does not pass all filters.
    }

    // Yield the event if it passes the filters.
    // console.debug('Event passed filters:', event);
    yield event;

    // Dispatch the event to all attached actors.
    for (const actor of this.actors) {
      await actor.handle(event);
    }
  }
}