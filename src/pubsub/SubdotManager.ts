import { JetStreamKvStore } from "./nats/kv_store.js";
import { FilterJob } from "./api/job.js";
import { CommandInterface } from "../cli/command/CommandInterface.js";
import { NatsConnectionFactory } from "./nats/NatsConnectionFactory.js";
import { IConnection } from "./api/connection.js";
import { StringCodec } from "nats";
import { v4 as uuidv4 } from "uuid";

/**
 * Configuration class for SubdotManager.
 */
export class SubdotManagerConfig {
    kvBucketName = process.env.SUBDOT_KV_BUCKET_NAME || "subdot_filters"; // Shared with SubdotWorker
    natsUrl = process.env.NATS_URL?.split(",") || ["nats://localhost:4222"];
}

/**
 * Manages Subdot subscriptions using a KV store.
 */
export class SubdotManager implements CommandInterface {
    private readonly kvKeyPrefix = "filters/";
    private kv: JetStreamKvStore<FilterJob>;
    private conn: IConnection;

    private constructor(
        private readonly config: SubdotManagerConfig,
        kv: JetStreamKvStore<FilterJob>,
        conn: IConnection
    ) {
        this.kv = kv;
        this.conn = conn;
    }

    /**
     * Static async constructor for SubdotManager.
     * @param config The configuration for SubdotManager.
     * @returns An instance of SubdotManager.
     */
    static async create(config: SubdotManagerConfig): Promise<SubdotManager> {
        const connFactory = new NatsConnectionFactory(config.natsUrl);
        const conn = await connFactory.create();
        const kv = new JetStreamKvStore<FilterJob>(conn, config.kvBucketName);
        return new SubdotManager(config, kv, conn);
    }

    async run(): Promise<void> {
        console.log("🚀 SubdotManager is running with config:", this.config);

        // TODO: put subject into config for subdot manager
        const subject = "subdot.manager.filters.new";
        const sub = this.conn.subscribe(subject);
        const sc = StringCodec();

        (async () => {
            for await (const msg of sub) {
                try {
                    const payload = sc.decode(msg.data);
                    console.log("📥 Received new filter specification:", payload);

                    const spec = JSON.parse(payload);
                    const job: FilterJob = {
                        id: spec.id || uuidv4(),
                        createdAt: Date.now(),
                        source: spec.source,
                        target: spec.target,
                        filter: typeof spec.filter === "string" ? { query: spec.filter } : spec.filter,
                        inputFormat: spec.inputFormat || "json",
                        outputFormat: spec.outputFormat || "json",
                        heartbeatTtlMs: spec.heartbeatTtlMs || 60000
                    };

                    await this.createSubscription(job);
                } catch (err) {
                    console.error("❌ Error processing new filter message:", err);
                }
            }
        })().catch((err) => console.error("❌ Subscription failed:", err));
    }

    async createSubscription(job: FilterJob): Promise<void> {
        const kvKey = this.kvKeyPrefix + job.id;
        const existingJob = await this.kv.get(kvKey);
        if (existingJob) {
            console.log(`⚠️ Subscription for job ${job.id} already exists.`);
            return;
        }
        await this.kv.put(kvKey, job);
        console.log(`✅ Subscription created for job ${job.id}`);
    }

    async removeSubscription(jobId: string): Promise<void> {
        const kvKey = this.kvKeyPrefix + jobId;
        const existingJob = await this.kv.get(kvKey);
        if (!existingJob) {
            console.log(`⚠️ No active subscription found for job ${jobId}.`);
            return;
        }
        await this.kv.delete(kvKey);
        console.log(`🛑 Subscription removed for job ${jobId}`);
    }

    async cleanupExpired(): Promise<void> {
        const now = Date.now();
        await this.kv.watch(this.kvKeyPrefix, async (key, job) => {
            if (job && now - job.createdAt > job.heartbeatTtlMs) {
                console.log(`⏳ Job ${key} has expired. Cleaning up...`);
                await this.removeSubscription(key.replace(this.kvKeyPrefix, ""));
            }
        });
    }

    async cleanupAll(): Promise<void> {
        const keys = await this.kv.listKeys(this.kvKeyPrefix);
        for (const key of keys) {
            await this.kv.delete(key);
            console.log(`🛑 Subscription removed for key ${key}`);
        }
    }

    async listActiveSubscriptions(): Promise<Map<string, FilterJob>> {
        const keys = await this.kv.listKeys(this.kvKeyPrefix);
        const subscriptions = new Map<string, FilterJob>();

        for (const key of keys) {
            const job = await this.kv.get(key);
            if (job) {
                subscriptions.set(key.replace(this.kvKeyPrefix, ""), job);
            }
        }

        return subscriptions;
    }
}
