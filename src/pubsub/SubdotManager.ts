import { JetStreamKvStore } from "./nats/kv_store.js";
import { FilterJob } from "./api/job.js";
import { CommandInterface } from "../cli/command/CommandInterface.js";
import { NatsConnectionFactory } from "./nats/NatsConnectionFactory.js";
import { IConnection } from "./api/connection.js";
import { StringCodec, JSONCodec } from "nats";
import { v4 as uuidv4 } from "uuid";
import { NatsUrlSchema } from "../url/NatsUrlSchema.js";

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
    private readonly kvKeyPrefix = "filters/";
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
        const js = this.conn.jetstream();
        const jc = JSONCodec<FilterJob>();
        const keys = await this.kv.listKeys(this.kvKeyPrefix);
        for (const key of keys) {
            const job = await this.kv.get(key);
            // enqueue jobs not already RUNNING
            if (job && job.status !== 'RUNNING') {
                await js.publish(this.workqueueSubject, jc.encode(job));
                console.log(`🔄 Enqueued pending job ${job.id}`);
                // update status to RUNNING
                job.status = 'RUNNING';
                await this.kv.put(key, job);
            }
        }
    }

    async run(): Promise<void> {
        console.log("🚀 SubdotManager is running with config:", this.config);

        const subject = this.config.new_filter_subject;
        const sub = this.conn.subscribe(subject);
        const sc = StringCodec();

        // Enqueue existing subscriptions at startup and periodically
        await this.enqueuePendingJobs();
        setInterval(() => this.enqueuePendingJobs().catch(console.error), 30_000);
        // periodic expiration check
        setInterval(() => this.reportExpired().catch(console.error), 30_000);
        console.log(`▶️  Subscribed to ${subject} on ${this.config.natsUrl}`);

        (async () => {
            for await (const msg of sub) {
                try {
                    const payload = sc.decode(msg.data);
                    console.log("📥 Received new filter specification:", payload);

                    const spec = JSON.parse(payload);

                    // Convert NATS URL strings to SubjectConfig
                    let sourceConfig = spec.source;
                    if (typeof spec.source === 'string') {
                        const natsSchema = NatsUrlSchema.validate(spec.source);
                        const q = (natsSchema.getQuery() as Record<string,string> | undefined) ?? {};
                        sourceConfig = {
                            subject: natsSchema.subjectPrefix,
                            useJetStream: q.useJetStream === 'true'
                        };
                    }
                    let targetConfig = spec.target;
                    if (typeof spec.target === 'string') {
                        const natsSchema = NatsUrlSchema.validate(spec.target);
                        const q = (natsSchema.getQuery() as Record<string,string> | undefined) ?? {};
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

        // 1) write into KV
        await this.kv.put(kvKey, job);
        console.log(`✅ Subscription created for job ${job.id}`);

        // 2) enqueue into JetStream work-queue
        const js = this.conn.jetstream();
        const jc = JSONCodec<FilterJob>();
        await js.publish(this.workqueueSubject, jc.encode(job));
        console.log(`📨 Published job ${job.id} into work-queue`);
    }

    async removeSubscription(jobId: string): Promise<void> {
        const kvKey = this.kvKeyPrefix + jobId;
        const existingJob = await this.kv.get(kvKey);
        if (!existingJob) {
            console.log(`⚠️ No active subscription found for job ${jobId}.`);
            return;
        }
        await this.kv.delete(kvKey);
        // also delete heartbeat entry
        await this.kv.delete(`heartbeat.${jobId}`);
        console.log(`🛑 Subscription removed for job ${jobId}`);
    }

    /**
     * Remove subscriptions that have exceeded their heartbeat TTL.
     */
    async reportExpired(): Promise<void> {
        const now = Date.now();
        // 1) transition expired RUNNING jobs back to PENDING based on heartbeat
        const jobKeys = await this.kv.listKeys(this.kvKeyPrefix);
        for (const key of jobKeys) {
            const job = await this.kv.get(key);
            if (job && job.status === 'RUNNING') {
                // check last heartbeat
                const hbKey = `heartbeat.${job.id}`;
                const hbEntry = await this.kv.getValue(hbKey);
                const last = hbEntry ? parseInt(hbEntry.value.toString(), 10) : 0;
                if (!hbEntry || now - last > job.heartbeatTtlMs) {
                    job.status = 'PENDING';
                    await this.kv.put(key, job);
                    console.log(`⏳ Job ${job.id} heartbeat expired, status reset to PENDING`);
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
                const subKey = this.kvKeyPrefix + jobId;
                const exists = await this.kv.get(subKey);
                if (!exists) {
                    // notify orphan job
                    await js.publish(this.config.orphanSubject, sc.encode(jobId));
                    console.log(`💀 Orphan job ${jobId}, sent kill notice`);
                    // clean up stale heartbeat
                    await this.kv.delete(hbKey);
                    console.log(`🗑️  Cleaned up heartbeat for orphaned job ${jobId}`);
                }
            }
        }
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
