import { LogEvent } from '../../LogEvent.js';
import { Result, Ok, Err } from '../../../utils/Result.js';

/**
 * EventSchema class describes the Event Data Model with fields and types.
 * It is a dynamic pattern to describe and validate schema of the payload in runtime.
 */
export class EventSchema {
    /**
     * The expected source pattern of the event.
     * This is a regular expression or null that matches the source of the event.
     */
    sourcePattern: RegExp | null;

    /**
     * A map of fields and their types.
     * The keys are field names and the values are their types.
     */
    fields: Map<string, string>;
    
    constructor(sourcePattern: RegExp | null, fields: Map<string, string>) {
        this.sourcePattern = sourcePattern;
        this.fields = fields;
    }

    /**
     * Validates the event data against the model.
     * @param event The event to validate.
     * @returns A Result object containing null if valid or an array of error messages if invalid.
     */
    validate(event: LogEvent): Result<null, string[]> {
        const errors: string[] = [];

        // Check if the sourcePattern matches the event source, if sourcePattern is not null
        if (this.sourcePattern && !this.sourcePattern.test(event.metadata?.stream || '')) {
            errors.push(`Source pattern mismatch: expected pattern '${this.sourcePattern}', but got '${event.metadata?.stream || ''}'.`);
        }

        // Validate each field in the event against the model
        for (const [field, type] of this.fields.entries()) {
            if (typeof event.payload[field] !== type) {
                errors.push(`Field type mismatch for '${field}': expected type '${type}', but got '${typeof event.payload[field]}'.`);
            }
        }

        // Check if all required fields are present in the event payload
        for (const field of this.fields.keys()) {
            if (!event.payload.hasOwnProperty(field)) {
                errors.push(`Missing required field: '${field}'.`);
            }
        }

        // Return Ok if no errors, otherwise return Err with the list of errors
        return errors.length === 0 ? Ok(null) : Err(errors);
    }
}