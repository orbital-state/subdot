import { NatsConnection } from "nats";

export interface IConnection {
    readonly raw: NatsConnection;
    readonly connected: boolean;

    connect(): Promise<IConnection>;      // idempotent
    close(): Promise<void>;
    onClosed(cb: (err?: Error) => void): void;
}

export interface IConnectionFactory {
    create(): Promise<IConnection>;
}
