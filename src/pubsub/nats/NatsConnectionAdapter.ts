/**
 * NatsConnectionAdapter
 *
 * Purpose:
 * A wrapper around the NATS connection that provides a unified interface (IConnection)
 * for both plain NATS usage and JetStream functionality.
 *
 * This adapter allows publishing, subscribing, and interacting
 * with JetStream (streams, key-value stores, and message acknowledgment).
 */

import {
  connect,
  NatsConnection,
  JetStreamClient,
  Subscription,
  SubscriptionOptions,
  PublishOptions,
  StringCodec,
} from "nats";
import { IConnection } from "../api/connection.js";

export class NatsConnectionAdapter implements IConnection {
  private _nc?: NatsConnection;

  constructor(private readonly servers: string[]) {}

  get raw(): NatsConnection {
    if (!this._nc) throw new Error("Not connected");
    return this._nc;
  }

  get connected(): boolean {
    return !!this._nc && !this._nc.isClosed();
  }

  async connect(): Promise<IConnection> {
    if (!this._nc) {
      this._nc = await connect({ servers: this.servers });
    }
    return this;
  }

  subscribe(subject: string, opts?: SubscriptionOptions): Subscription {
    return this.raw.subscribe(subject, opts);
  }

  publish(
    subject: string | Uint8Array,
    data?: Uint8Array,
    opts?: PublishOptions
  ): void {
    if (typeof subject === "string") {
      this.raw.publish(subject, data, opts);
    } else {
      const sc = StringCodec();
      this.raw.publish(sc.decode(subject), data, opts);
    }
  }

  jetstream(): JetStreamClient {
    return this.raw.jetstream();
  }

  async close(): Promise<void> {
    await this._nc?.close();
  }

  onClosed(cb: (err?: Error) => void): void {
    this._nc?.closed().then(() => cb()).catch(cb);
  }
}
