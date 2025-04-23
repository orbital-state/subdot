import { JSONCodec } from "nats";
import type { KV } from "nats";
import { IKeyValueStore } from "../api/kv.js";
import { IConnection } from "../api/connection.js";

export class JetStreamKvStore<V = unknown> implements IKeyValueStore<V> {
  private readonly codec = JSONCodec<V>();
  private kv?: KV;

  constructor(
    private readonly conn: IConnection,
    private readonly bucket: string,
  ) {}

  /** Lazily opens the KV bucket (once per instance) */
  private async jsKv(): Promise<KV> {
    if (!this.kv) {
      const js = this.conn.raw.jetstream();
      this.kv = await js.views.kv(this.bucket);
    }
    return this.kv;
  }

  /**
   * Stores a key-value entry.
   * Note: ttlMs is ignored — TTL must be configured at bucket creation - see createOrGetKvBucket
   */
  async put(key: string, value: V, _ttlMs?: number): Promise<void> {
    const kv = await this.jsKv();
    await kv.put(key, this.codec.encode(value));
  }

  async get(key: string): Promise<V | null> {
    const entry = await (await this.jsKv()).get(key).catch(() => null);
    return entry ? this.codec.decode(entry.value) : null;
  }

  async getValue(key: string): Promise<{ value: V } | null> {
    const entry = await (await this.jsKv()).get(key).catch(() => null);
    return entry ? { value: this.codec.decode(entry.value) } : null; // Wrap in an object with `value`
  }

  async delete(key: string): Promise<void> {
    await (await this.jsKv()).delete(key);
  }

  async watch(
    prefix: string,
    onChange: (key: string, value: V | null) => void,
  ): Promise<() => void> {
    const kv = await this.jsKv();
    const sub = await kv.watch({ key: `${prefix}>` });

    (async () => {
      for await (const e of sub) {
        const val = e.operation === "DEL" ? null : this.codec.decode(e.value);
        onChange(e.key, val);
      }
    })().catch(console.error);

    return () => sub.stop();
  }

  /**
   * Lists all keys with the given prefix.
   * @param prefix The prefix to filter keys.
   * @returns An array of keys matching the prefix.
   */
  async listKeys(prefix: string): Promise<string[]> {
    const keys: string[] = [];
    await this.watch(prefix, (key) => {
      keys.push(key);
    });
    return keys;
  }
}
