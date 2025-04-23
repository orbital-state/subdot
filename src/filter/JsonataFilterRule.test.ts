import { describe, it, expect } from 'vitest';
import { JsonataFilterRule } from './JsonataFilterRule.js';
import { BasicEvent } from '../model/BasicEvent.js';
import { LogEvent } from '../model/LogEvent.js';

describe('JsonataFilterRule', () => {
    it('should return true for events matching the Jsonata query', async () => {
        const query = '$.field1 = "test"';
        const rule = new JsonataFilterRule(query);
        const event = new BasicEvent({ field1: 'test', field2: 42 });
        await expect(rule.matches(event)).resolves.toBe(true);
    });

    it('should return false for events not matching the Jsonata query', async () => {
        const query = '$.field1 = "test"';
        const rule = new JsonataFilterRule(query);
        const event = new BasicEvent({ field1: 'not-test', field2: 42 });
        await expect(rule.matches(event)).resolves.toBe(false);
    });

    // it('should handle invalid Jsonata queries gracefully', () => {
    //     const query = '$.field1 = ';
    //     const rule = new JsonataFilterRule(query);
    //     const event = new BasicEvent({ field1: 'test', field2: 42 });
    //     expect(rule.matches(event)).resolves.toBe(false);
    // });

    it('should throw error for invalid Jsonata queries', () => {
        const invalidQuery = '$.field1 = ';
        expect(() => new JsonataFilterRule(invalidQuery)).toThrow();
    });

    it('should handle events with missing fields gracefully', async () => {
        const query = '$.field1 = "test"';
        const rule = new JsonataFilterRule(query);
        const event = new BasicEvent({ field2: 42 });
        await expect(rule.matches(event)).resolves.toBe(false);
    });

    it('should handle nested fields in the event', async () => {
        const query = '$.nested.field1 = "test"';
        const rule = new JsonataFilterRule(query);
        const event = new BasicEvent({ nested: { field1: 'test' }, field2: 42 });
        await expect(rule.matches(event)).resolves.toBe(true);
    });
    
    it('should return false for events not matching the nested Jsonata query', async () => {
        const query = '$.nested.field1 = "test"';
        const rule = new JsonataFilterRule(query);
        const event = new BasicEvent({ nested: { field1: 'not-test' }, field2: 42 });
        await expect(rule.matches(event)).resolves.toBe(false);
    });
    
    it('should handle nested fields with missing subfields gracefully', async () => {
        const query = '$.nested.field1 = "test"';
        const rule = new JsonataFilterRule(query);
        const event = new BasicEvent({ nested: {}, field2: 42 });
        await expect(rule.matches(event)).resolves.toBe(false);
    });
});

// Additional tests with queries without the "$." prefix
describe('JsonataFilterRule without prefix', () => {
    it('should return true for events matching the Jsonata query', async () => {
        const query = 'field1 = "test"';
        const rule = new JsonataFilterRule(query);
        const event = new BasicEvent({ field1: 'test', field2: 42 });
        await expect(rule.matches(event)).resolves.toBe(true);
    });

    it('should return false for events not matching the Jsonata query', async () => {
        const query = 'field1 = "test"';
        const rule = new JsonataFilterRule(query);
        const event = new BasicEvent({ field1: 'not-test', field2: 42 });
        await expect(rule.matches(event)).resolves.toBe(false);
    });

    it('should throw error for invalid Jsonata queries', () => {
        const invalidQuery = 'field1 = ';
        expect(() => new JsonataFilterRule(invalidQuery)).toThrow();
    });

    it('should handle events with missing fields gracefully', async () => {
        const query = 'field1 = "test"';
        const rule = new JsonataFilterRule(query);
        const event = new BasicEvent({ field2: 42 });
        await expect(rule.matches(event)).resolves.toBe(false);
    });

    it('should handle nested fields in the event', async () => {
        const query = 'nested.field1 = "test"';
        const rule = new JsonataFilterRule(query);
        const event = new BasicEvent({ nested: { field1: 'test' }, field2: 42 });
        await expect(rule.matches(event)).resolves.toBe(true);
    });
    
    it('should return false for events not matching the nested Jsonata query', async () => {
        const query = 'nested.field1 = "test"';
        const rule = new JsonataFilterRule(query);
        const event = new BasicEvent({ nested: { field1: 'not-test' }, field2: 42 });
        await expect(rule.matches(event)).resolves.toBe(false);
    });
    
    it('should handle nested fields with missing subfields gracefully', async () => {
        const query = 'nested.field1 = "test"';
        const rule = new JsonataFilterRule(query);
        const event = new BasicEvent({ nested: {}, field2: 42 });
        await expect(rule.matches(event)).resolves.toBe(false);
    });

    it('should return a promise that resolves to a boolean', async () => {
        const query = 'field1 = "test"';
        const rule = new JsonataFilterRule(query);
        const event = new BasicEvent({ field1: 'test' });
        const result = rule.matches(event);
        expect(result).toBeInstanceOf(Promise);
        await expect(result).resolves.toBe(true);
    });

    it('should resolve false when evaluation throws an error', async () => {
        // Use a query that accesses a property of an undefined value
        const query = 'nonexistentField > 10';
        const rule = new JsonataFilterRule(query);
        const event = new BasicEvent({ field1: 'test' });
        await expect(rule.matches(event)).resolves.toBe(false);
    });

    it('should work correctly with complex nested queries', async () => {
        const query = 'nested.level.field = "value"';
        const rule = new JsonataFilterRule(query);
        const eventMatching = new BasicEvent({ nested: { level: { field: 'value' } } });
        const eventNotMatching = new BasicEvent({ nested: { level: { field: 'wrong' } } });
        await expect(rule.matches(eventMatching)).resolves.toBe(true);
        await expect(rule.matches(eventNotMatching)).resolves.toBe(false);
    });
});