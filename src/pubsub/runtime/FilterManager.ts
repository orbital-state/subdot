import { AckPolicy, JetStreamClient, JetStreamManager, RetentionPolicy, StorageType } from "nats";
import { createOrGetKvBucket } from "../nats/kv_helper.js";
import { IManager } from "../api/manager.js";
import { FilterJob } from "../api/job.js";
import { IWorker, IWorkerFactory } from "../api/worker.js";

export class FilterManager implements IManager<FilterJob> {
  private readonly workers = new Map<string, IWorker<FilterJob>>();

  constructor(
    private readonly factory: IWorkerFactory<FilterJob>,
    private readonly js: JetStreamClient, // JetStream client for setup
  ) { }

  /**
   * Sets up required infrastructure: streams, kv, queues, consumers.
   */
  async initialize() {
    const kvBucketName = "subdot_filters";
    const streamName = "subdot_workqueue";
    const consumerName = "subdot_worker_consumer";
    const subject = "subdot.workqueue";

    // Create filter KV bucket
    await createOrGetKvBucket(this.js, kvBucketName, 60_000);

   // Access the JetStream manager
   const jsm = await this.js.jetstreamManager();

    // Ensure stream exists
    await ensureStreamExists(jsm, streamName, subject);

    // Ensure consumer exists
    await ensureConsumerExists(jsm, streamName, consumerName, subject);
  }

  async launch(job: FilterJob) {
    if (this.workers.has(job.id)) return;
    const w = await this.factory.create(job);
    // fire-and-forget
    w.start().catch(err => console.error(`❌ worker ${job.id} error:`, err));
    this.workers.set(job.id, w);
  }

  async cleanupExpired() {
    const now = Date.now();
    for (const [id, w] of this.workers) {
      if (await w.isExpired(now)) { // Await the asynchronous isExpired method
        await w.stop();
        this.workers.delete(id);
      }
    }
  }

  async stopAll() {
    await Promise.all([...this.workers.values()].map(w => w.stop()));
    this.workers.clear();
  }

  /**
   * Stop a specific worker by job ID, used for orphan kill handling.
   */
  async stopJob(id: string) {
    const w = this.workers.get(id);
    if (w) {
      await w.stop();
      this.workers.delete(id);
      console.log(`🛑 Orphaned job ${id} stopped by manager`);
    }
  }

  activeJobs() {
    return this.workers;
  }


}

export async function ensureStreamExists(jsm: JetStreamManager, streamName: string, subject: string) {
  // Define the stream configuration
  const streamConfig = {
    name: streamName,
    subjects: [subject],
    retention: RetentionPolicy.Workqueue,
    storage: StorageType.Memory,
    max_msgs: 1000, // Maximum number of messages in the stream equals the number of jobs
    max_bytes: 10_000_000,
    max_age: 0,
    num_replicas: 1,
  };

  try {
    // Attempt to add the stream; if it already exists with the same configuration, this is a no-op
    await jsm.streams.add(streamConfig);
    console.log(`✅ Stream "${streamName}" is ensured.`);
  } catch (err) {
    // If the stream exists but with a different configuration, handle accordingly
    if (err instanceof Error && err.message.includes("stream already exists")) {
      console.log(`ℹ️ Stream "${streamName}" already exists with a different configuration.`);
      // Optionally, retrieve the existing stream's configuration
      const existingStream = await jsm.streams.info(streamName);
      console.log("Existing stream configuration:", existingStream.config);
    } else {
      // Handle other errors
      console.error("❌ Failed to ensure stream:", err);
    }
  }
}

export async function ensureConsumerExists(jsm: JetStreamManager, streamName: string, consumerName: string, subject: string) {
  try {
    await jsm.consumers.info(streamName, consumerName);
    console.log(`✅ Consumer "${consumerName}" exists.`);
  } catch (err) {
    if (err instanceof Error && err.message.includes("consumer not found")) {
      console.log(`ℹ️ Consumer "${consumerName}" not found. Creating...`);
      await jsm.consumers.add(streamName, {
        durable_name: consumerName,
        ack_policy: AckPolicy.Explicit,
        filter_subject: subject,
      });
      console.log(`✅ Consumer "${consumerName}" created.`);
    } else {
      throw err;
    }
  }
}
