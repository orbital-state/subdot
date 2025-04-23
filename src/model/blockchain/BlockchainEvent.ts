import { LogEvent } from '../LogEvent.js';
import { EventSchema } from '../typed/schemas/EventSchema.js';
import { EventMetadata } from '../EventMetadata.js';

export class BlockchainEvent implements LogEvent {
  payload: Map<string, any>; // Generic payload to hold any data structure
  metadata: EventMetadata;

  constructor(
    stream: string,
    payload?: Map<string, any>
  ) {
    this.payload = payload || new Map();
    this.metadata = { stream };
  }

  // Getters for the main fields
  get blockHash(): string | undefined {
    return this.payload.get('blockHash');
  }

  get eventType(): string | undefined {
    return this.payload.get('eventType');
  }

  get eventName(): string | undefined {
    return this.payload.get('eventName');
  }

  get eventId(): string | undefined {
    return this.payload.get('eventId');
  }

  get eventVersion(): string | undefined {
    return this.payload.get('eventVersion');
  }

  get timestamp(): string | undefined {
    return this.payload.get('timestamp');
  }

  /**
   * Static method to get the schema of the payload.
   * @returns EventSchema instance representing the schema of the payload
   */
  static getSchema(): EventSchema {
    return new EventSchema(
      /blockchainEvent/,
      new Map<string, any>([
        ['blockHash', 'string'],
        ['eventType', 'string'],
        ['eventName', 'string'],
        ['eventId', 'string'],
        ['eventVersion', 'string'],
        ['timestamp', 'string'],
      ])
    );
  }

  /**
   * Static method to create a BlockchainEvent from a plain object and validate it against a schema.
   * @param payload - The plain object representing the event payload
   * @param schema - Optional schema to validate the payload against. Defaults to the current event schema.
   * @returns BlockchainEvent instance
   * @throws Error if the payload does not match the schema
   */
  static fromSchema(payload: Record<string, any>, schema?: EventSchema): BlockchainEvent {
    const eventSchema = schema || this.getSchema();

    // Validate the payload against the schema
    for (const [key, type] of eventSchema.fields.entries()) {
      if (payload[key] !== undefined && typeof payload[key] !== type) {
        throw new Error(`Invalid type for field "${key}". Expected "${type}", got "${typeof payload[key]}"`);
      }
    }

    // Determine the stream value from metadata or fallback
    const stream = (payload.metadata && payload.metadata.stream) || payload.stream || 'unknown';

    // Create a new BlockchainEvent instance
    return new BlockchainEvent(
      stream,
      new Map(Object.entries(payload))
    );
  }

  /**
   * Converts the BlockchainEvent instance to a plain object.
   * @returns Plain object representation of the event
   */
  toObject(): Record<string, any> {
    return {
      metadata: this.metadata,
      payload: Object.fromEntries(this.payload),
    };
  }
}