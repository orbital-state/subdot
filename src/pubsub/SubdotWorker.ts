import { CommandInterface } from "../cli/command/CommandInterface.js";
import { SubdotRuntime, SubdotConfig } from "./runtime/SubdotRuntime.js";
import { FilterRegistry } from "./runtime/FilterRegistry.js";
import { FilterWorker } from "./runtime/FilterWorker.js";
import { StringCodec } from "nats";

export class SubdotWorkerConfig implements SubdotConfig {
    kvBucketName = process.env.SUBDOT_KV_BUCKET_NAME || "subdot_filters";
    streamName = process.env.SUBDOT_STREAM_NAME || "subdot_workqueue";
    consumerName = process.env.SUBDOT_CONSUMER_NAME || "subdot_worker_consumer";
    workSubject = process.env.SUBDOT_WORKQUEUE_SUBJECT || "subdot.workqueue";
    natsUrl = process.env.NATS_URL?.split(",") || ["nats://localhost:4222"];
    orphanSubject = process.env.SUBDOT_ORPHAN_SUBJECT || "subdot.manager.filters.orphan";
    heartbeatTtlMs = Number(process.env.HEARTBEAT_TTL_MS) || 60000;
}

export class SubdotWorker implements CommandInterface {
    private runtime: SubdotRuntime | null = null;
    private registry: FilterRegistry | null = null;
    private workers = new Map<string, FilterWorker>();

    private constructor(private config: SubdotWorkerConfig) {}

    static async create(config: SubdotWorkerConfig): Promise<SubdotWorker> {
        const worker = new SubdotWorker(config);
        await worker.initialize();
        return worker;
    }

    private async initialize(): Promise<void> {
        this.runtime = await SubdotRuntime.create(this.config);
        this.registry = new FilterRegistry(this.runtime.kv, this.runtime.kv);
    }

    async run(): Promise<void> {
        console.log("🚀 Starting SubdotWorker with config:", this.config);
        const sc = StringCodec();
        const orphanSub = this.runtime!.conn.subscribe(this.config.orphanSubject);
        (async () => {
            for await (const msg of orphanSub) {
                const jobId = sc.decode(msg.data);
                console.log(`💀 Received orphan kill for job ${jobId}`);
                const worker = this.workers.get(jobId);
                if (worker) {
                    await worker.stop();
                    this.workers.delete(jobId);
                }
            }
        })().catch(console.error);

        while (true) {
            const job = await this.runtime!.queue.pull(1_000);
            if (job) {
                await this.runtime!.queue.ack(job);
                const worker = new FilterWorker(job, this.runtime!.kv, this.runtime!.conn.raw, this.registry!);
                this.workers.set(job.id, worker);
                worker.start().catch(console.error);
            }
            // Cleanup expired workers
            const now = Date.now();
            for (const [id, worker] of this.workers) {
                if (await worker.isExpired(now)) {
                    await worker.stop();
                    this.workers.delete(id);
                }
            }
        }
    }
}