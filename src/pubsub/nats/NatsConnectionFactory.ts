/**
 * NatsConnectionFactory
 *
 * Purpose:
 * Factory for creating NATS connections (plain & JetStream) using NatsConnectionAdapter.
 */
import { IConnectionFactory } from "../api/connection.js";
import { NatsConnectionAdapter } from "./NatsConnectionAdapter.js";

export class NatsConnectionFactory implements IConnectionFactory {
  constructor(private readonly servers: string[]) {}

  /**
   * Creates and returns a connected NatsConnectionAdapter.
   */
  async create() {
    const adapter = new NatsConnectionAdapter(this.servers);
    await adapter.connect();
    return adapter;
  }
}
