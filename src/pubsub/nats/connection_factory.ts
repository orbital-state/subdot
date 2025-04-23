import { connect, NatsConnection } from "nats";
import { IConnection, IConnectionFactory } from "../api/connection.js";

export class JetStreamConnection implements IConnection {
    private _nc?: NatsConnection;
    constructor(private readonly servers: string[]) { }

    get raw(): NatsConnection {
        if (!this._nc) throw new Error("Not connected");
        return this._nc;
    }
    get connected(): boolean { return !!this._nc && !this._nc.isClosed(); }

    async connect(): Promise<IConnection> {
        if (!this._nc) {
            this._nc = await connect({ servers: this.servers });
        }
        return this;
    }

    async close(): Promise<void> { await this._nc?.close(); }

    onClosed(cb: (err?: Error) => void): void {
        this._nc?.closed().then(() => cb()).catch(cb);
    }
}

export class JetStreamConnectionFactory implements IConnectionFactory {
    constructor(private readonly servers: string[]) { }
    async create(): Promise<IConnection> {
        return new JetStreamConnection(this.servers).connect();
    }
}
