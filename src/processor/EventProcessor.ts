import { LogEvent } from '../model/LogEvent.js';

/**
 * Interface for processing BasicEvents with filters and dispatching to actors.
 */
export interface EventProcessor {
  
  /**
   * Processes an incoming event. May apply filtering and dispatching.
   * @param event - The input event to process.
   * @returns An AsyncGenerator that yields processed events.
   */
  process(event: LogEvent): AsyncGenerator<LogEvent>;

  /**
   * Validates the incoming event before processing.
   * @param event - The event to validate.
   * @returns A boolean indicating whether the event is valid.
   */
  validate(event: LogEvent): boolean;
}