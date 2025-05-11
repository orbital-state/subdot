import { JetStreamKvStore } from "./nats/kv_store.js";
import { FilterJob } from "./api/job.js";
import { CommandInterface } from "../cli/command/CommandInterface.js";
import { StringCodec, JSONCodec } from "nats";
import { v4 as uuidv4 } from "uuid";
import { NatsUrlSchema } from "../url/NatsUrlSchema.js";
import { logger } from "../utils/Logger.js";
import { SubdotRuntime, SubdotConfig } from "./runtime/SubdotRuntime.js";
import { FilterRegistry } from "./runtime/FilterRegistry.js";

export class SubdotManagerConfig implements SubdotConfig {
    kvBucketName = process.env.SUBDOT_KV_BUCKET_NAME || "subdot_filters";
    natsUrl = process.env.NATS_URL?.split(",") || ["nats://localhost:4222"];
    new_filter_subject = "subdot.manager.filters.new";
    workqueueSubject = process.env.SUBDOT_WORKQUEUE_SUBJECT || "subdot.workqueue";
    orphanSubject = process.env.SUBDOT_ORPHAN_SUBJECT || "subdot.manager.filters.orphan";
    streamName = process.env.SUBDOT_STREAM_NAME || "subdot_workqueue";
    consumerName = process.env.SUBDOT_CONSUMER_NAME || "subdot_worker_consumer";
    workSubject = process.env.SUBDOT_WORKQUEUE_SUBJECT || "subdot.workqueue";
    heartbeatTtlMs = Number(process.env.HEARTBEAT_TTL_MS) || 60000;
}

export class SubdotManager implements CommandInterface {
    private readonly kvFiltersKeyPrefix = "filters.";
    private readonly workqueueSubject: string;
    private runtime: SubdotRuntime;
    private registry: FilterRegistry;

    private constructor(
        private readonly config: SubdotManagerConfig,
        runtime: SubdotRuntime,
        registry: FilterRegistry
    ) {
        this.runtime = runtime;
        this.registry = registry;
        this.workqueueSubject = config.workqueueSubject;
    }

    static async create(config: SubdotManagerConfig): Promise<SubdotManager> {
        const runtime = await SubdotRuntime.create(config);
        const registry = new FilterRegistry(runtime.kv, runtime.kv); // Use runtime.kv directly
        return new SubdotManager(config, runtime, registry);
    }

    async enqueuePendingJobs(): Promise<void> {
        logger.info(`enqueuePendingJobs triggered`);
        const js = this.runtime.conn.jetstream();
        const jc = JSONCodec<FilterJob>();
        const jobs = await this.registry.listJobs("PENDING");
        for (const job of jobs) {
            const hb = await this.registry.getLastHeartbeat(job.id);
            const now = Date.now();
            if (hb && now - hb <= job.heartbeatTtlMs) {
                logger.info(`⏳ Skipping job ${job.id} as it is receiving heartbeats.`);
                continue;
            }
            await js.publish(this.workqueueSubject, jc.encode(job));
            logger.info(`🔄 Enqueued pending job ${job.id}`);
            job.status = 'RUNNING';
            await this.registry.updateJob(job);
        }
    }

    async run(): Promise<void> {
        logger.info("🚀 SubdotManager is running with config:", this.config);
        await this.enqueuePendingJobs();
        setInterval(() => {
            this.enqueuePendingJobs().catch(logger.error);
        }, 30_000);
        setInterval(() => {
            this.reportExpired().catch(logger.error);
        }, 30_000);
        await this.handleSubscriptionRequests();
    }

    async handleSubscriptionRequests(): Promise<void> {
        const subject = this.config.new_filter_subject;
        const sub = this.runtime.conn.subscribe(subject);
        const sc = StringCodec();
        logger.info(`▶️  Subscribed to ${subject} on ${this.config.natsUrl}`);
        logger.info(`📬 Waiting for new filter specifications...`);
        (async () => {
            for await (const msg of sub) {
                try {
                    const payload = sc.decode(msg.data);
                    logger.info("📥 Received new filter specification:", payload);
                    const spec = JSON.parse(payload);
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
        const existingJob = await this.registry.getJob(job.id);
        if (existingJob) {
            logger.warn(`⚠️ Subscription for job ${job.id} already exists.`);
            return;
        }
        await this.registry.addJob(job);
        logger.info(`✅ Subscription created for job ${job.id}`);
        const js = this.runtime.conn.jetstream();
        const jc = JSONCodec<FilterJob>();
        await js.publish(this.workqueueSubject, jc.encode(job));
        logger.info(`📨 Published job ${job.id} into work-queue`);
    }

    async removeSubscription(jobId: string): Promise<void> {
        const existingJob = await this.registry.getJob(jobId);
        if (!existingJob) {
            logger.warn(`⚠️ No active subscription found for job ${jobId}.`);
            return;
        }
        await this.registry.deleteJob(jobId);
        logger.info(`🛑 Subscription removed for job ${jobId}`);
    }

    async reportExpired(): Promise<void> {
        logger.info(`reportExpired triggered`);
        const now = Date.now();
        const jobs = await this.registry.listJobs();
        for (const job of jobs) {
            if (job.status === 'RUNNING' || job.status === 'PENDING') {
                const last = await this.registry.getLastHeartbeat(job.id);
                if (!last || now - last > job.heartbeatTtlMs) {
                    job.status = 'PENDING';
                    await this.registry.updateJob(job);
                    logger.info(`⏳ Job ${job.id} heartbeat expired, status reset to PENDING`);
                } else {
                    if (job.status === 'PENDING') {
                        job.status = 'RUNNING';
                        await this.registry.updateJob(job);
                        logger.info(`🚀 Job ${job.id} status updated to RUNNING`);
                    } else {
                        logger.info(`💓 Job ${job.id} is still active and RUNNING, last heartbeat at ${last}`);
                    }
                }
            }
        }
        const orphans = await this.registry.findOrphans(60_000);
        const sc = StringCodec();
        const js = this.runtime.conn.jetstream();
        for (const jobId of orphans) {
            await js.publish(this.config.orphanSubject, sc.encode(jobId));
            logger.info(`💀 Orphan job ${jobId}, sent kill notice`);
            await this.registry.deleteHeartbeat(jobId);
            logger.info(`🗑️  Cleaned up heartbeat for orphaned job ${jobId}`);
        }
    }

    async cleanupAll(): Promise<void> {
        const jobs = await this.registry.listJobs();
        for (const job of jobs) {
            await this.registry.deleteJob(job.id);
            logger.info(`🛑 Subscription removed for job ${job.id}`);
        }
    }

    async listActiveSubscriptions(): Promise<Map<string, FilterJob>> {
        const jobs = await this.registry.listJobs();
        const subscriptions = new Map<string, FilterJob>();
        for (const job of jobs) {
            subscriptions.set(job.id, job);
        }
        return subscriptions;
    }
}
