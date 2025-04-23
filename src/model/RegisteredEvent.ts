import { LogEvent } from "./LogEvent.js";

/**
 * A specialized log event that extends the base LogEvent interface.
 * This represents a "registered" log event with a unique identifier within the streaming scope.
 * The unique ID ensures traceability, consistency, and persistence for stream processing.
 */
export interface RegisteredEvent extends LogEvent {
    getUniqueId(): string; // Unique identifier for the log event in the streaming scope
}