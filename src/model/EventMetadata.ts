import { EventSchema } from "./typed/schemas/EventSchema.js";

/**
 * The metadata attached to an event, including an optional source along with extra arbitrary fields.
 */
export type EventMetadata = {
    id?: string;
    schema?: EventSchema;
    type?: string;
    version?: string;
    stream?: string; // Renamed from 'source' to 'stream'
    timestamp?: Date | number | string;
} & Record<string, any>;