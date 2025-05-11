import { IKeyValueStore } from "../api/kv.js";
import { FilterJob } from "../api/job.js";

export class FilterRegistry {
  private readonly filterPrefix = "filters.";
  private readonly heartbeatPrefix = "heartbeat.";

  constructor(
    private readonly filterKV: IKeyValueStore<FilterJob>,
    private readonly heartbeatKV: IKeyValueStore<string>
  ) {}

  async addJob(job: FilterJob): Promise<void> {
    await this.filterKV.put(this.filterPrefix + job.id, job);
  }

  async updateJob(job: FilterJob): Promise<void> {
    await this.filterKV.put(this.filterPrefix + job.id, job);
  }

  async deleteJob(jobId: string): Promise<void> {
    await this.filterKV.delete(this.filterPrefix + jobId);
    await this.heartbeatKV.delete(this.heartbeatPrefix + jobId);
  }

  async getJob(jobId: string): Promise<FilterJob | null> {
    return await this.filterKV.get(this.filterPrefix + jobId);
  }

  async listJobs(status?: FilterJob["status"]): Promise<FilterJob[]> {
    const keys = await this.filterKV.listKeys(this.filterPrefix);
    const jobs: FilterJob[] = [];
    for (const key of keys) {
      const job = await this.filterKV.get(key);
      if (job && (!status || job.status === status)) {
        jobs.push(job);
      }
    }
    return jobs;
  }

  async heartbeat(jobId: string, ts?: number): Promise<void> {
    await this.heartbeatKV.put(this.heartbeatPrefix + jobId, (ts ?? Date.now()).toString());
  }

  async getLastHeartbeat(jobId: string): Promise<number | null> {
    const entry = await this.heartbeatKV.getValue(this.heartbeatPrefix + jobId);
    if (!entry) return null;
    return parseInt(entry.value.toString(), 10);
  }

  async deleteHeartbeat(jobId: string): Promise<void> {
    await this.heartbeatKV.delete(this.heartbeatPrefix + jobId);
  }

  async findOrphans(ttlMs: number): Promise<string[]> {
    const now = Date.now();
    const hbKeys = await this.heartbeatKV.listKeys(this.heartbeatPrefix);
    const orphans: string[] = [];
    for (const hbKey of hbKeys) {
      const jobId = hbKey.replace(this.heartbeatPrefix, "");
      const job = await this.filterKV.get(this.filterPrefix + jobId);
      const entry = await this.heartbeatKV.getValue(hbKey);
      if (!job && entry) {
        const last = parseInt(entry.value.toString(), 10);
        if (now - last <= ttlMs) {
          orphans.push(jobId);
        }
      }
    }
    return orphans;
  }
}
