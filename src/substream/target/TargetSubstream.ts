import { BasicEvent } from "../../model/BasicEvent.js";

export interface TargetSubstream {
    start(): Promise<void>;
    push(data: BasicEvent): Promise<void>;
    stop(): Promise<void>;
}