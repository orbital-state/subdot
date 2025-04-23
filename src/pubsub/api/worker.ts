import { IJob } from "./job.js";

export interface IWorker<T extends IJob = IJob> {
    readonly job: T;
    start(): Promise<void>;
    stop(reason?: Error): Promise<void>;
    isExpired(currentTime: number): Promise<boolean>;
}

export interface IWorkerFactory<T extends IJob = IJob> {
    create(job: T): Promise<IWorker<T>>;
}
