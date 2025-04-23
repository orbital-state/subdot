import { EventMetadata } from "./EventMetadata.js";
import { LogEvent } from "./LogEvent.js";

/**
 * A schema-agnostic wrapper for incoming log event data.
 * This class encapsulates the raw payload and associated metadata 
 * for use in streaming log processing.
 */
export class BasicEvent implements LogEvent {
  constructor(
      public payload: any | Record<string, any>,
      public metadata?: EventMetadata
  ) {}

  /**
   * Static method to create a BasicEvent instance from raw data.
   * If metadata is present in the raw data, it will be validated and constructed field by field.
   * Otherwise, the raw data will be treated as the payload.
   * 
   * @param raw - The raw input data
   * @returns A new BasicEvent instance
   */
  static from(raw: any): BasicEvent {
    let metadata: EventMetadata | undefined;

    if (raw.metadata) {
      // Construct metadata manually
      metadata = {
        id: raw.metadata.id || undefined,
        schema: raw.metadata.schema || undefined,
        type: raw.metadata.type || "raw",
        version: raw.metadata.version || undefined,
        stream: raw.metadata.stream || undefined,
        timestamp: raw.metadata.timestamp || Date.now(),
        ...raw.metadata // Include any additional fields
      };
    }

    return new BasicEvent(raw.payload || raw, metadata);
  }

  /**
   * Converts the BasicEvent instance to a JSON string.
   * 
   * @returns A JSON string representation of the BasicEvent
   */
  public toJSON(): string {
    if (this.metadata?.type === "raw") {
      // If the type is "raw", we don't want to include the metadata in the JSON output
      return JSON.stringify(this.payload);
    }
    return JSON.stringify({
      payload: this.payload,
      metadata: this.metadata
    });
  }
}