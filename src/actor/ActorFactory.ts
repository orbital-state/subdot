import { Actor } from "./Actor.js";
import { DummyActor } from "./DummyActor.js"; // Import DummyActor

export class ActorFactory {
    static createActor(type: string): Actor {
      switch (type) {
        case "dummy":
          return new DummyActor();
        // Add more cases for different actor types
        default:
          throw new Error(`Unknown actor type: ${type}`);
      }
    }
  }