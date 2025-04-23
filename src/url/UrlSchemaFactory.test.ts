import { describe, it, expect } from 'vitest';
import { UrlSchemaFactory } from './UrlSchemaFactory.js';
import { FileUrlSchema } from './FileUrlSchema.js';
import { NatsUrlSchema } from './NatsUrlSchema.js';
import { SmoldotUrlSchema } from './SmoldotUrlSchema.js';
import { SubdotApp } from './SubdotSchema.js';

// Language: typescript

describe('UrlSchemaFactory.parseUrlSchema', () => {
    // File URL tests
    describe('file URL', () => {
        it('should return a FileUrlSchema for a valid file URL', () => {
            const urlString = "file:///path/to/file.txt";
            const schema = UrlSchemaFactory.parseUrlSchema(urlString);
            expect(schema).toBeInstanceOf(FileUrlSchema);
            // Check path extraction
            expect((schema as any).path).toBe("/path/to/file.txt");
        });

        it('should throw error for file URL with missing path', () => {
            const urlString = "file:///";
            expect(() => {
                UrlSchemaFactory.parseUrlSchema(urlString);
            }).toThrow("File URL must have a path");
        });
    });

    // Nats URL tests
    describe('nats URL', () => {
        it('should return a NatsUrlSchema for a valid nats URL', () => {
            const urlString = "nats://localhost:4222/?foo=bar";
            const schema = UrlSchemaFactory.parseUrlSchema(urlString);
            expect(schema).toBeInstanceOf(NatsUrlSchema);
            // Validate properties
            expect((schema as any).host).toBe("localhost");
            expect((schema as any).port).toBe(4222);
            expect((schema as any).query).toEqual({ foo: "bar" });
        });

        it('should throw error for nats URL with missing hostname', () => {
            const urlString = "nats:///?foo=bar";
            expect(() => {
                UrlSchemaFactory.parseUrlSchema(urlString);
            }).toThrow("NATS URL must have a host");
        });
    });

    // Smoldot URL tests
    describe('smoldot URL', () => {
        it('should return a SmoldotUrlSchema for a valid smoldot URL with chain param', () => {
            const urlString = "smoldot.wss://rpc.example.com/?chain=myChain&types=custom";
            const schema = UrlSchemaFactory.parseUrlSchema(urlString);
            expect(schema).toBeInstanceOf(SmoldotUrlSchema);
            // Validate properties
            expect((schema as any).host).toBe("rpc.example.com");
            expect((schema as any).query).toEqual({ chain: "myChain", types: "custom" });
        });

        it('should throw error for smoldot URL missing the chain parameter', () => {
            const urlString = "smoldot.wss://rpc.example.com/?types=custom";
            expect(() => {
                UrlSchemaFactory.parseUrlSchema(urlString);
            }).toThrow("Smoldot URL must specify a chain");
        });
    });

    // Unsupported URL scheme tests
    describe('unsupported URL scheme', () => {
        it('should throw error for unsupported URL scheme', () => {
            const urlString = "http://example.com";
            expect(() => {
                UrlSchemaFactory.parseUrlSchema(urlString);
            }).toThrow("Unsupported URL scheme: http");
        });
    });
});