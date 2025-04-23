import { Actor } from "./Actor.js";
import { LogEvent } from "../model/LogEvent.js";

// Example implementation of a dummy actor
// Can be used in integration tests
export class DummyActor implements Actor {
    async handle(event: LogEvent): Promise<void> {
        console.log(`Handling event in DummyActor: ${JSON.stringify(event)}`);
        // Implement your logic here
    }
}