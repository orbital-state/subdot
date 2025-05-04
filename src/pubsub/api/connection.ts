import {
  NatsConnection,
  JetStreamClient,
  Subscription,
  SubscriptionOptions,
  PublishOptions,
} from "nats";

export interface IConnection {
    readonly connected: boolean;
    readonly raw: NatsConnection;

    connect(): Promise<IConnection>;      // idempotent
    close(): Promise<void>;
    onClosed(cb: (err?: Error) => void): void;

    // plain‐NATS
    subscribe(subject: string, opts?: SubscriptionOptions): Subscription;
    publish(subject: string | Uint8Array, data?: Uint8Array, opts?: PublishOptions): void;

    // JetStream
    jetstream(): JetStreamClient;
}

export interface IConnectionFactory {
    create(): Promise<IConnection>;
}
