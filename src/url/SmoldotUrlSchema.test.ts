import { describe, it, expect } from 'vitest';
import { SmoldotUrlSchema } from './SmoldotUrlSchema.js';
import { SubdotProtocol, SubdotApp } from './SubdotSchema.js';

// Language: typescript

describe('SmoldotUrlSchema.parse', () => {
    it('should correctly parse URL with search parameters', () => {
        const urlString = "smoldot.wss://rpc.polkadot.io/?chain=myChain&types=myTypes";
        const schema = SmoldotUrlSchema.parse(urlString);

        // Check scheme: protocol property from URL has a trailing colon
        expect(schema.scheme.toString()).toBe("smoldot.wss");
        // Check scheme: protocol property from URL confirm custom SubdotApp definition
        expect(schema.getApp()).toBe(SubdotApp.Smoldot);
        // Check scheme: protocol property from URL confirm custom SubdotProtocol definition
        expect(schema.getProtocol()).toBe(SubdotProtocol.WSS);
        expect(schema.host).toBe("rpc.polkadot.io");
        // Port is undefined when not specified
        expect(schema.port).toBeUndefined();
        // pathname is "/" so expect empty string as per parsing logic (or "/" if preserved)
        expect(schema.path).toBe('/');
        // Verify query extracted from search parameters
        expect(schema.query).toEqual({ chain: "myChain", types: "myTypes" });
    });

    it('should serialize to string correctly', () => {
        const urlString = "smoldot.wss://rpc.polkadot.io/?chain=myChain&types=myTypes";
        const schema = SmoldotUrlSchema.parse(urlString);

        // Check that the serialized URL matches the original
        expect(schema.toString()).toBe(urlString);
    });
    
    it('should handle the case when no app is a part of URL', () => {
        const urlString = "wss://rpc.polkadot.io/?chain=myChain&types=myTypes";
        const schema = SmoldotUrlSchema.parse(urlString);

        // Check scheme: protocol property from URL has a trailing colon
        expect(schema.scheme.toString()).toBe("smoldot.wss");
        // Check scheme: protocol property from URL confirm custom SubdotApp definition
        expect(schema.getApp()).toBe(SubdotApp.Smoldot);
        // Check scheme: protocol property from URL confirm custom SubdotProtocol definition
        expect(schema.getProtocol()).toBe(SubdotProtocol.WSS);
        expect(schema.host).toBe("rpc.polkadot.io");
    });

    it('should correctly parse URL with only hostname as chain value', () => {
        // URL without search parameters and hostname does not include '='.
        const urlString = "smoldot://myChain";
        const schema = SmoldotUrlSchema.parse(urlString);

        expect(schema.scheme.toString()).toBe("smoldot.wss");
        expect(schema.host).toBe("myChain");
        // Query becomes { chain: hostname }
        expect(schema.query).toEqual({ chain: "myChain" });
    });

    it('should throw an error if chain parameter is missing', () => {
        // Since new URL(...) always provides hostname if protocol present,
        // to simulate missing chain, we pass an empty hostname.
        // This can be done by using a URL like "smoldot://"
        expect(() => {
            SmoldotUrlSchema.parse("smoldot://");
        }).toThrow("Invalid Smoldot URL: chain parameter is missing");
    });
});