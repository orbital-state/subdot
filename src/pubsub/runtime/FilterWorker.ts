import { FilterJob } from "../api/job.js";
import { IKeyValueStore } from "../api/kv.js";
import { IWorker } from "../api/worker.js";
import { NatsConnection, StringCodec } from "nats";
import { logger } from "../../utils/Logger.js";
import { BasicEventProcessor } from "../../processor/BasicEventProcessor.js";
import { JsonataFilterRule } from "../../filter/JsonataFilterRule.js";
import { BasicEvent } from "../../model/BasicEvent.js";
import { FilterRegistry } from "./FilterRegistry.js";

export class FilterWorker implements IWorker<FilterJob> {
  private readonly startedAt = Date.now();
  private readonly sc = StringCodec();
  private subscription: AsyncIterable<any> | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(
    public readonly job: FilterJob,
    private readonly kv: IKeyValueStore,
    private readonly nats: NatsConnection,
    private readonly registry: FilterRegistry // Add registry as a dependency
  ) {}

  async start() {
    logger.info(`▶️  Starting job ${this.job.id}`);

    // initial heartbeat and periodic schedule
    await this.heartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.heartbeat().catch(err => logger.error(`💓 Heartbeat error for job ${this.job.id}`, err));
    }, this.job.heartbeatTtlMs / 2);

    const rule = new JsonataFilterRule(this.job.filter?.query || "true");
    const processor = new BasicEventProcessor([rule]);

    // Subscription logic based on useJetStream
    if (this.job.source.useJetStream) {
      // TODO: Implement JetStream subscription logic in the future
      logger.warn(`⚠️ JetStream subscription is not implemented yet.`);
    } else {
      this.subscription = this.nats.subscribe(this.job.source.subject);
      logger.info(`🔗 Subscribed to NATS subject ${this.job.source.subject}`);
    }

    if (!this.subscription) {
      logger.error(`❌ Subscription is null. Cannot process messages.`);
      return;
    }

    for await (const msg of this.subscription) {
      try {
        const json = this.sc.decode(msg.data);
        const raw = JSON.parse(json);
        const event = BasicEvent.from(raw);

        logger.debug(`📥 Received:`, event);

        const result = await processor.process(event);
        if (result) {
          const output = JSON.stringify(result);

          // Publishing logic based on useJetStream
          if (this.job.target.useJetStream) {
            // TODO: Implement JetStream publishing logic in the future
            logger.warn(`⚠️ JetStream publishing is not implemented yet.`);
          } else {
            this.nats.publish(this.job.target.subject, this.sc.encode(output));
            logger.info(`📤 Published to NATS subject ${this.job.target.subject}`);
          }
        }
      } catch (err) {
        logger.error(`❌ Processing error`, err);
      }
    }
  }

  async stop(): Promise<void> {
    logger.info(`⏹️  Stopping job ${this.job.id}`);
    // stop heartbeat timer
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.subscription) {
      // Optional cleanup logic
    }
  }

  async heartbeat(): Promise<void> {
    if (this.job.id) {
      await this.registry.heartbeat(this.job.id);
      logger.debug(`💓 Heartbeat sent for job ${this.job.id}`);
    }
  }

  async isExpired(currentTime: number = Date.now()): Promise<boolean> {
    if (!this.kv || !this.job.id) return false;

    const lastHeartbeat = await this.kv.getValue(`heartbeat.${this.job.id}`);
    if (!lastHeartbeat) return true; // No heartbeat found

    const last = parseInt((lastHeartbeat.value as any).toString(), 10); // Ensure `value` is parsed correctly
    return currentTime - last > this.job.heartbeatTtlMs;
  }
}
