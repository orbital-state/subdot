import {
  AckPolicy,
  JetStreamClient,
  JetStreamManager,
  RetentionPolicy,
  StorageType,
} from "nats";
import { createOrGetKvBucket } from "../nats/kv_helper.js";
import { JetStreamWorkQueue } from "../nats/work_queue.js";
import { JetStreamKvStore } from "../nats/kv_store.js";
import { IConnection } from "../api/connection.js";
import { NatsConnectionFactory } from "../nats/NatsConnectionFactory.js";

export interface SubdotConfig {
  kvBucketName: string;
  streamName: string;
  workSubject: string;
  consumerName: string;
  heartbeatTtlMs: number;
  natsUrl: string[];
}

export class SubdotRuntime {
  public readonly kv: JetStreamKvStore<any>;
  public readonly queue: JetStreamWorkQueue<any>;
  private readonly jsm: JetStreamManager;
  public readonly conn: IConnection;

  private constructor(
    public readonly config: SubdotConfig,
    conn: IConnection,
    jsm: JetStreamManager
  ) {
    this.conn = conn;
    this.jsm = jsm;
    this.kv = new JetStreamKvStore(conn, config.kvBucketName);
    this.queue = new JetStreamWorkQueue(
      conn,
      config.streamName,
      config.consumerName
    );
  }

  static async create(
    config: SubdotConfig,
    NatsConnectionFactoryCtor = NatsConnectionFactory
  ): Promise<SubdotRuntime> {
    const connFactory = new NatsConnectionFactoryCtor(config.natsUrl);
    const conn = await connFactory.create();
    const js = conn.jetstream();
    await createOrGetKvBucket(js, config.kvBucketName, config.heartbeatTtlMs);
    const jsm = await js.jetstreamManager();
    // Ensure stream
    await jsm.streams.add({
      name: config.streamName,
      subjects: [config.workSubject],
      retention: RetentionPolicy.Workqueue,
      storage: StorageType.Memory,
      max_msgs: 1000,
      max_age: 0,
      num_replicas: 1,
    }).catch((err: Error) => {
      if (!/already exists/.test(err.message)) throw err;
    });
    // Ensure consumer
    await jsm.consumers.info(config.streamName, config.consumerName)
      .catch(async (err: Error) => {
        if (/not found/.test(err.message)) {
          await jsm.consumers.add(config.streamName, {
            durable_name: config.consumerName,
            ack_policy: AckPolicy.Explicit,
            filter_subject: config.workSubject,
          });
        } else {
          throw err;
        }
      });
    return new SubdotRuntime(config, conn, jsm);
  }
}
