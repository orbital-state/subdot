import { JetStreamClient, KV } from "nats";

/**
 * Ensures that a KV bucket exists. If it doesn't, it creates one with the specified TTL.
 * 
 * @param js - The JetStream client instance.
 * @param name - The name of the KV bucket.
 * @param ttlMs - The TTL for the bucket entries in milliseconds.
 * @returns The KV bucket instance.
 */
export async function createOrGetKvBucket(js: JetStreamClient, name: string, ttlMs: number): Promise<KV> {
  try {
    return await js.views.kv(name);
  } catch {
    return await js.views.kv(name, { ttl: Number(BigInt(ttlMs) * 1_000_000n) }); // Convert ms to nanoseconds
  }
}