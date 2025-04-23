import { IJob } from "./job.js";
import { IWorker } from "./worker.js";

export interface IManager<T extends IJob = IJob, W extends IWorker<T> = IWorker<T>> {
    launch(job: T): Promise<void>;
    cleanupExpired(): Promise<void>;
    stopAll(): Promise<void>;
    activeJobs(): ReadonlyMap<string, W>;
}
