import { IKeyValueStore } from "../api/kv.js";
import { EventEmitter } from "node:events";

export interface HeartbeatEvent {
  id: string;
  expired: boolean;
}

export class HeartbeatMonitor extends EventEmitter {
  constructor(
    private readonly kv: IKeyValueStore,
    private readonly ttlMs: number,
  ) {
    super();
  }

  async init(prefix = "subs/") {
    await this.kv.watch(prefix, async (key, value) => {
      if (!value) {
        this.emit("expired", <HeartbeatEvent>{ id: key, expired: true });
      } else {
        const last = parseInt(value as string, 10);
        const now = Date.now();
        if (now - last > this.ttlMs) {
          this.emit("expired", <HeartbeatEvent>{ id: key, expired: true });
        }
      }
    });

    // Periodic scan fallback
    setInterval(async () => {
      const keys = await this.kv.listKeys(prefix);
      for (const key of keys) {
        const value = await this.kv.get(key) as { value: string } | null;
        if (value && value.value) {
          const last = parseInt(value.value as string, 10);
          const now = Date.now();
          if (now - last > this.ttlMs) {
            this.emit("expired", <HeartbeatEvent>{ id: key, expired: true });
          }
        }
      }
    }, this.ttlMs);
  }
}
