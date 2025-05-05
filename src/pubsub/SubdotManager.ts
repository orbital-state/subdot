import { JetStreamKvStore } from "./nats/kv_store.js";
import { FilterJob } from "./api/job.js";
import { CommandInterface } from "../cli/command/CommandInterface.js";
import { NatsConnectionFactory } from "./nats/NatsConnectionFactory.js";
import { IConnection } from "./api/connection.js";
import { StringCodec, JSONCodec } from "nats";
import { v4 as uuidv4 } from "uuid";
import { NatsUrlSchema } from "../url/NatsUrlSchema.js";
import { logger } from "../utils/Logger.js";

/**
 * Configuration class for SubdotManager.
 */
export class SubdotManagerConfig {
    kvBucketName = process.env.SUBDOT_KV_BUCKET_NAME || "subdot_filters"; // Shared with SubdotWorker
    natsUrl = process.env.NATS_URL?.split(",") || ["nats://localhost:4222"];
    new_filter_subject = "subdot.manager.filters.new";
    workqueueSubject = process.env.SUBDOT_WORKQUEUE_SUBJECT || "subdot.workqueue";
    orphanSubject = process.env.SUBDOT_ORPHAN_SUBJECT || "subdot.manager.filters.orphan";
}

/**
 * Manages Subdot subscriptions using a KV store.
 */
export class SubdotManager implements CommandInterface {
    private readonly kvFiltersKeyPrefix = "filters.";
    private readonly workqueueSubject: string;
    private kv: JetStreamKvStore<FilterJob>;
    private conn: IConnection;

    private constructor(
        private readonly config: SubdotManagerConfig,
        kv: JetStreamKvStore<FilterJob>,
        conn: IConnection
    ) {
        this.kv = kv;
        this.conn = conn;
        this.workqueueSubject = config.workqueueSubject;
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

    /**
     * Enqueue all subscriptions from KV into the JetStream work queue.
     */
    async enqueuePendingJobs(): Promise<void> {
        logger.info(`enqueuePendingJobs triggered`);
        const js = this.conn.jetstream();
        const jc = JSONCodec<FilterJob>();
        const keys = await this.kv.listKeys(this.kvFiltersKeyPrefix);

        for (const key of keys) {
            let job;
            try {
                job = await this.kv.get(key);
            } catch (err) {
                logger.warn(`⚠️ Corrupted entry at ${key}, deleting.`, err);
                await this.kv.delete(key);
                continue;
            }

            // Only enqueue jobs that are PENDING and not receiving heartbeats
            if (job && job.status === 'PENDING') {
                const hbKey = `heartbeat.${job.id}`;
                const hbEntry = await this.kv.getValue(hbKey);
                const now = Date.now();
                const lastHeartbeat = hbEntry ? parseInt(hbEntry.value.toString(), 10) : 0;

                if (hbEntry && now - lastHeartbeat <= job.heartbeatTtlMs) {
                    logger.info(`⏳ Skipping job ${job.id} as it is receiving heartbeats.`);
                    continue;
                }

                await js.publish(this.workqueueSubject, jc.encode(job));
                logger.info(`🔄 Enqueued pending job ${job.id}`);
                // Update status to RUNNING
                job.status = 'RUNNING';
                await this.kv.put(key, job);
            }
        }
    }

    async run(): Promise<void> {
        logger.info("🚀 SubdotManager is running with config:", this.config);

        // Enqueue existing subscriptions at startup and periodically
        await this.enqueuePendingJobs();
        setInterval(() => {
            this.enqueuePendingJobs().catch(logger.error);
        }, 30_000);

        // periodic expiration check
        setInterval(() => {
            this.reportExpired().catch(logger.error);
        }, 30_000);

        // Handle and register new filter requests
        await this.handleSubscriptionRequests();
    }

    async handleSubscriptionRequests(): Promise<void> {
        const subject = this.config.new_filter_subject;
        const sub = this.conn.subscribe(subject);
        const sc = StringCodec();

        logger.info(`▶️  Subscribed to ${subject} on ${this.config.natsUrl}`);
        logger.info(`📬 Waiting for new filter specifications...`);
        (async () => {
            for await (const msg of sub) {
                try {
                    const payload = sc.decode(msg.data);
                    logger.info("📥 Received new filter specification:", payload);

                    const spec = JSON.parse(payload);

                    // Convert NATS URL strings to SubjectConfig
                    let sourceConfig = spec.source;
                    if (typeof spec.source === 'string') {
                        const natsSchema = NatsUrlSchema.validate(spec.source);
                        const q = (natsSchema.getQuery() as Record<string, string> | undefined) ?? {};
                        sourceConfig = {
                            subject: natsSchema.subjectPrefix,
                            useJetStream: q.useJetStream === 'true'
                        };
                    }
                    let targetConfig = spec.target;
                    if (typeof spec.target === 'string') {
                        const natsSchema = NatsUrlSchema.validate(spec.target);
                        const q = (natsSchema.getQuery() as Record<string, string> | undefined) ?? {};
                        targetConfig = {
                            subject: natsSchema.subjectPrefix,
                            useJetStream: q.useJetStream === 'true'
                        };
                    }

                    const job: FilterJob = {
                        id: spec.id || uuidv4(),
                        createdAt: Date.now(),
                        source: sourceConfig,
                        target: targetConfig,
                        filter: typeof spec.filter === "string" ? { query: spec.filter } : spec.filter,
                        inputFormat: spec.inputFormat || "json",
                        outputFormat: spec.outputFormat || "json",
                        heartbeatTtlMs: spec.heartbeatTtlMs || 60000,
                        status: 'PENDING'
                    };

                    await this.createSubscription(job);
                } catch (err) {
                    logger.error("❌ Error processing new filter message:", err);
                }
            }
        })().catch((err) => logger.error("❌ Subscription failed:", err));
    }

    async createSubscription(job: FilterJob): Promise<void> {
        const kvKey = this.kvFiltersKeyPrefix + job.id;
        let existingJob;
        try {
            existingJob = await this.kv.get(kvKey);
        } catch (err) {
            logger.warn(`⚠️ Corrupted entry at ${kvKey}, deleting and recreating.`, err);
            await this.kv.delete(kvKey);
        }
        if (existingJob) {
            logger.warn(`⚠️ Subscription for job ${job.id} already exists.`);
            return;
        }

        // 1) write into KV
        await this.kv.put(kvKey, job);
        logger.info(`✅ Subscription created for job ${job.id}`);

        // 2) enqueue into JetStream work-queue
        const js = this.conn.jetstream();
        const jc = JSONCodec<FilterJob>();
        await js.publish(this.workqueueSubject, jc.encode(job));
        logger.info(`📨 Published job ${job.id} into work-queue`);
    }

    async removeSubscription(jobId: string): Promise<void> {
        const kvKey = this.kvFiltersKeyPrefix + jobId;
        const existingJob = await this.kv.get(kvKey);
        if (!existingJob) {
            logger.warn(`⚠️ No active subscription found for job ${jobId}.`);
            return;
        }
        await this.kv.delete(kvKey);
        // also delete heartbeat entry
        await this.kv.delete(`heartbeat.${jobId}`);
        logger.info(`🛑 Subscription removed for job ${jobId}`);
    }

    /**
     * Remove subscriptions that have exceeded their heartbeat TTL.
     */
    async reportExpired(): Promise<void> {
        logger.info(`reportExpired triggered`);
        const now = Date.now();
        // 1) transition expired RUNNING jobs back to PENDING based on heartbeat
        const jobKeys = await this.kv.listKeys(this.kvFiltersKeyPrefix);
        logger.info(`Found ${jobKeys.length} job keys`);
        for (const key of jobKeys) {
            logger.info(`Checking job ${key}`);
            let job;
            try {
                job = await this.kv.get(key);
            } catch (err) {
                logger.warn(`⚠️ Corrupted entry at ${key}, deleting.`, err);
                await this.kv.delete(key);
                continue;
            }
            if (job && (job.status === 'RUNNING' || job.status === 'PENDING')) {
                // check last heartbeat
                const hbKey = `heartbeat.${job.id}`;
                const hbEntry = await this.kv.getValue(hbKey);
                const last = hbEntry ? parseInt(hbEntry.value.toString(), 10) : 0;
                if (!hbEntry || now - last > job.heartbeatTtlMs) {
                    job.status = 'PENDING';
                    await this.kv.put(key, job);
                    logger.info(`⏳ Job ${job.id} heartbeat expired, status reset to PENDING`);
                } else {
                    if (job.status === 'PENDING') {
                        job.status = 'RUNNING'; 
                        await this.kv.put(key, job);
                        logger.info(`🚀 Job ${job.id} status updated to RUNNING`);                        
                    } else {
                        logger.info(`💓 Job ${job.id} is still active and RUNNING, last heartbeat at ${last}`);
                    }                    
                }
            }
        }
        // 2) detect orphan jobs: heartbeat exists but no subscription
        const hbKeys = await this.kv.listKeys('heartbeat.');
        const sc = StringCodec();
        const js = this.conn.jetstream();
        for (const hbKey of hbKeys) {
            const hbEntry = await this.kv.getValue(hbKey);
            if (!hbEntry) continue;
            const last = parseInt(hbEntry.value.toString(), 10);
            // if heartbeat recent (within default TTL)
            if (now - last <= (60_000)) {
                const jobId = hbKey.replace('heartbeat.', '');
                const subKey = this.kvFiltersKeyPrefix + jobId;
                const exists = await this.kv.get(subKey);
                if (!exists) {
                    // notify orphan job
                    await js.publish(this.config.orphanSubject, sc.encode(jobId));
                    logger.info(`💀 Orphan job ${jobId}, sent kill notice`);
                    // clean up stale heartbeat
                    await this.kv.delete(hbKey);
                    logger.info(`🗑️  Cleaned up heartbeat for orphaned job ${jobId}`);
                }
            }
        }
    }

    async cleanupAll(): Promise<void> {
        const keys = await this.kv.listKeys(this.kvFiltersKeyPrefix);
        for (const key of keys) {
            await this.kv.delete(key);
            logger.info(`🛑 Subscription removed for key ${key}`);
        }
    }

    async listActiveSubscriptions(): Promise<Map<string, FilterJob>> {
        const keys = await this.kv.listKeys(this.kvFiltersKeyPrefix);
        const subscriptions = new Map<string, FilterJob>();

        for (const key of keys) {
            const job = await this.kv.get(key);
            if (job) {
                subscriptions.set(key.replace(this.kvFiltersKeyPrefix, ""), job);
            }
        }

        return subscriptions;
    }
}
