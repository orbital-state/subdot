import { LogEvent } from "../model/LogEvent.js";

export interface Actor {
    handle(event: LogEvent): Promise<void>;
}

