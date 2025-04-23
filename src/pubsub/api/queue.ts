import { IJob } from "./job.js";

export interface IJobQueue<T extends IJob = IJob> {
  pull(timeoutMs?: number): Promise<T | null>;
  ack(job: T): Promise<void>;
  // helper for tests
  push?(job: T): Promise<void>;
}
