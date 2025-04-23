import { EventMetadata } from "./EventMetadata.js";

/**
 * Base interface for an event. The structure of the log event is unknown and flexible.
 * This serves as a generic placeholder for any log event payload.
 */
export interface LogEvent {
    payload: any | Record<string, any>;
    metadata?: EventMetadata;
}