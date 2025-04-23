import { JetStreamKvStore } from "./nats/kv_store.js";
import { FilterJob } from "./api/job.js";
import { CommandInterface } from "../cli/command/CommandInterface.js";
import { JetStreamConnectionFactory } from "./nats/connection_factory.js";

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

    private constructor(
        private readonly config: SubdotManagerConfig,
        kv: JetStreamKvStore<FilterJob>
    ) {
        this.kv = kv;
    }

    /**
     * Static async constructor for SubdotManager.
     * @param config The configuration for SubdotManager.
     * @returns An instance of SubdotManager.
     */
    static async create(config: SubdotManagerConfig): Promise<SubdotManager> {
        const connFactory = new JetStreamConnectionFactory(config.natsUrl);
        const conn = await connFactory.create();
        const kv = new JetStreamKvStore<FilterJob>(conn, config.kvBucketName);
        return new SubdotManager(config, kv);
    }

    async run(): Promise<void> {
        console.log("🚀 SubdotManager is running with config:", this.config);
        // Possible interactive loop or listener here
    }

    /**
     * Creates a subscription for a given filter job.
     * Stores the job in the KV store.
     * @param job The filter job to subscribe to.
     */
    async createSubscription(job: FilterJob): Promise<void> {
        const kvKey = this.kvKeyPrefix + job.id;

        // Check if the subscription already exists
        const existingJob = await this.kv.get(kvKey);
        if (existingJob) {
            console.log(`⚠️ Subscription for job ${job.id} already exists.`);
            return;
        }

        // Store the job in the KV store
        await this.kv.put(kvKey, job);
        console.log(`✅ Subscription created for job ${job.id}`);
    }

    /**
     * Removes a subscription for a given job ID.
     * Deletes the job from the KV store.
     * @param jobId The ID of the job to unsubscribe from.
     */
    async removeSubscription(jobId: string): Promise<void> {
        const kvKey = this.kvKeyPrefix + jobId;

        // Check if the subscription exists
        const existingJob = await this.kv.get(kvKey);
        if (!existingJob) {
            console.log(`⚠️ No active subscription found for job ${jobId}.`);
            return;
        }

        // Remove the job from the KV store
        await this.kv.delete(kvKey);
        console.log(`🛑 Subscription removed for job ${jobId}`);
    }

    /**
     * Garbage-collects expired subscriptions based on their heartbeat TTL.
     */
    async cleanupExpired(): Promise<void> {
        const now = Date.now();

        // Watch all subscriptions and clean up expired ones
        await this.kv.watch(this.kvKeyPrefix, async (key, job) => {
            if (job && now - job.createdAt > job.heartbeatTtlMs) {
                console.log(`⏳ Job ${key} has expired. Cleaning up...`);
                await this.removeSubscription(key.replace(this.kvKeyPrefix, ""));
            }
        });
    }

    /**
     * Cleans up all active subscriptions.
     */
    async cleanupAll(): Promise<void> {
        const keys = await this.kv.listKeys(this.kvKeyPrefix);
        for (const key of keys) {
            await this.kv.delete(key);
            console.log(`🛑 Subscription removed for key ${key}`);
        }
    }

    /**
     * Lists all active subscriptions.
     * @returns A map of job IDs to FilterJobs.
     */
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