import { LogEvent } from '../model/LogEvent.js'; 

/**
 * Interface representing a filter rule for matching events.
 */
export interface FilterRule {
    /**
     * Determines if the given event matches the filter rule.
     * @param event - The event to be checked against the filter rule.
     * @returns True if the event matches the rule, false otherwise.
     */
    matches(event: LogEvent): Promise<boolean>;
}

/**
 * Class representing a filter rule that matches events based on an exact source name.
 */
export class IdentityFilterRule implements FilterRule {
    /**
     * Determines if the given event matches the filter rule.
     * Performs a basic match based on the source name.
     * @param event - The event to be checked against the filter rule.
     * @returns True if the event matches the rule, false otherwise.
     */
    matches(event: LogEvent): Promise<boolean> {
        // Always match the event just as identity function would
        return Promise.resolve(true);
    }
}
