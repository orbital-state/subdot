import { BasicEvent } from '../../model/BasicEvent.js';

/**
 * Substream interface for handling streaming data.
 * It provides methods to start and stop the stream, and to process events.
 */
// The interface extends AsyncIterable to allow for asynchronous iteration over events.
// This is useful for processing events as they arrive in a non-blocking manner.
// The start() method is used to initiate the stream, and it can return a Promise or void.
// The stop() method is optional and can be used to gracefully terminate the stream.

export interface SourceSubstream extends AsyncIterable<BasicEvent> {
    start(): Promise<void> | void;
    stop?(): Promise<void> | void;
}
  