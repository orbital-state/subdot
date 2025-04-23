import { CommandInterface } from "../cli/command/CommandInterface.js";
import { JetStreamConnectionFactory } from "./nats/connection_factory.js";
import { JetStreamKvStore } from "./nats/kv_store.js";
import { JetStreamWorkQueue } from "./nats/work_queue.js";
import { FilterManager } from "./runtime/filter_manager.js";
import { FilterWorker } from "./runtime/FilterWorker.js";
import { FilterJob } from "./api/job.js";

/**
 * Configuration class for SubdotWorker.
 */
export class SubdotWorkerConfig {
    kvBucketName = process.env.SUBDOT_KV_BUCKET_NAME || "subdot_filters";
    streamName = process.env.SUBDOT_STREAM_NAME || "subdot_workqueue";
    consumerName = process.env.SUBDOT_CONSUMER_NAME || "subdot_worker_consumer";
    natsUrl = process.env.NATS_URL?.split(",") || ["nats://localhost:4222"];
}

/**
 * Unified SubdotWorker class that implements the worker functionality.
 */
export class SubdotWorker implements CommandInterface {
    private kv: JetStreamKvStore | null = null;
    private queue: JetStreamWorkQueue<FilterJob> | null = null;
    private filterManager: FilterManager | null = null;

    private constructor(private config: SubdotWorkerConfig) {}

    /**
     * Static async constructor for SubdotWorker.
     * @param config The configuration for SubdotWorker.
     * @returns An instance of SubdotWorker.
     */
    static async create(config: SubdotWorkerConfig): Promise<SubdotWorker> {
        const worker = new SubdotWorker(config);
        await worker.initialize();
        return worker;
    }

    /**
     * Initializes the worker by setting up connections, key-value store, and job queue.
     */
    private async initialize(): Promise<void> {
        const connFactory = new JetStreamConnectionFactory(this.config.natsUrl);
        const conn = await connFactory.create();
        const js = conn.raw.jetstream();

        this.kv = new JetStreamKvStore(conn, this.config.kvBucketName);
        this.queue = new JetStreamWorkQueue<FilterJob>(
            conn,
            this.config.streamName,
            this.config.consumerName
        );

        this.filterManager = new FilterManager(
            {
                create: async (job: FilterJob) => new FilterWorker(job, this.kv!, conn.raw),
            },
            js
        );

        await this.filterManager.initialize();
    }

    /**
     * Starts the worker process to continuously process jobs from the queue.
     */
    async run(): Promise<void> {
        console.log("🚀 Starting SubdotWorker with config:", this.config);

        while (true) {
            const job = await this.queue!.pull(1_000);
            if (job) {
                await this.filterManager!.launch(job);
                await this.queue!.ack(job);
                // await this.filterManager!.logJobCompletion(job);
            }
            await this.filterManager!.cleanupExpired(); // Ensure this is awaited
        }
    }
}