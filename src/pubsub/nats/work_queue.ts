import { IJobQueue } from "../api/queue.js";
import { IJob } from "../api/job.js";
import { IConnection } from "../api/connection.js";
import { JSONCodec } from "nats";

export class JetStreamWorkQueue<T extends IJob> implements IJobQueue<T> {
    private readonly codec = JSONCodec<T>();

    constructor(
        private readonly conn: IConnection,
        private readonly stream: string,
        private readonly consumer: string,
    ) { }

    async pull(timeoutMs = 1_000): Promise<T | null> {
        const js = this.conn.raw.jetstream();
        const cons = await js.consumers.get(this.stream, this.consumer);
        const msgs = await cons.fetch({ max_messages: 1, expires: timeoutMs });
        for await (const m of msgs) {
            const job = this.codec.decode(m.data);
            (job as any).__raw = m;          // stash raw msg for ack
            return job;
        }
        return null;
    }

    async ack(job: T): Promise<void> {
        const raw = (job as any).__raw;
        if (raw) raw.ack();
    }
}
