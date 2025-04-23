import { EventSchema } from './schemas/EventSchema.js';
import { EventMetadata } from '../EventMetadata.js';
import { LogEvent } from '../LogEvent.js';
import { Result, Ok } from '../../utils/Result.js';

/**
 * TypedEvent class represents a generic log event with a payload.
 * 
 * Implements schema-driven data model and LogEvent interface.
 * 
 * When constructed, it accepts an event type (string) which is stored in metadata.
 * The event schema is determined from the subclass and stored as part of metadata.
 * 
 * @abstract
 * @class TypedEvent
 * @implements {LogEvent}
 * @param {string} eventType - The event type (string) which is a "name" of the schema.
 * @param {Omit<EventMetadata, 'schema' | 'type'>} metadata - The metadata of the event (must include stream).
 * @param {Map<string, any>} [payload] - The payload of the event.
 */
export abstract class TypedEvent implements LogEvent {
    // metadata now contains stream, event type, and schema.
    metadata: EventMetadata;
    payload: Map<string, any>;

    constructor(eventType: string, metadata: Omit<EventMetadata, 'schema' | 'type'>, payload?: Map<string, any>) {
        // Merge the passed metadata with type and schema.
        const schema = (this.constructor as typeof TypedEvent).getSchema();
        this.metadata = {
            ...metadata,
            type: eventType,
            schema,
        };
        this.payload = payload || new Map();
    }

    /**
     * Abstract method to get the schema of the payload.
     * Must be implemented by subclasses.
     */
    static getSchema(): EventSchema {
        throw new Error('getSchema() must be implemented by subclasses');
    }

    /**
     * Validates a plain object against the schema.
     * @param payload - The plain object to validate.
     * @param schema - The schema to validate against.
     * @throws Error if validation fails.
     */
    static validatePayloadSchema(payload: Record<string, any>, schema: EventSchema): void {
        for (const [key, type] of schema.fields.entries()) {
            if (payload[key] !== undefined && typeof payload[key] !== type) {
                throw new Error(
                    `Invalid type for field "${key}". Expected "${type}", got "${typeof payload[key]}"`
                );
            }
        }
    }

    /**
     * Validates the current event instance against the provided schema.
     * @param schema - The schema to validate the event instance against.
     * @returns {Result<null, string[]>} Result object containing validation status and errors if any.
     */
    validateEventSchema(schema: EventSchema): Result<null, string[]> {
        const validationResult = schema.validate(this);
        if (!validationResult.ok) {
            return validationResult; // Return the errors directly
        }
        return Ok(null); // Validation succeeded
    }

    /**
     * Creates an instance of the subclass from a plain object and validates it against a schema.
     * @param payload - The plain object representing the event payload.
     * @param schema - Optional schema to validate the payload against. Defaults to the subclass's schema.
     * @returns Instance of the subclass.
     */
    static fromSchema<T extends TypedEvent>(
        this: new (eventType: string, metadata: EventMetadata, payload: Map<string, any>) => T,
        payload: Record<string, any>,
        schema?: EventSchema
    ): T {
        const eventSchema = schema || (this as any).getSchema();
        TypedEvent.validatePayloadSchema(payload, eventSchema);
        // Default metadata with an empty stream and empty event type.
        const defaultMetadata: EventMetadata = { stream: '', type: '', schema: eventSchema };
        return new this(defaultMetadata.type as string, defaultMetadata, new Map(Object.entries(payload)));
    }

    /**
     * Converts the instance to a plain object.
     * @returns Plain object representation of the event.
     */
    toObject(): Record<string, any> {
        return Object.fromEntries(this.payload);
    }
}