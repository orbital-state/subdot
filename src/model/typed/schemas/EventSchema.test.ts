import { describe, it, expect } from 'vitest';
import { EventSchema } from './EventSchema.js';
import { LogEvent } from '../../LogEvent.js';
import { Result, Ok, Err } from '../../../utils/Result.js';

describe('EventSchema', () => {
  it('should correctly initialize with sourcePattern and fields', () => {
    const sourcePattern = /testSource/;
    const fields = new Map<string, string>([
      ['field1', 'string'],
      ['field2', 'number'],
    ]);

    const schema = new EventSchema(sourcePattern, fields);

    expect(schema.sourcePattern).toBe(sourcePattern);
    expect(schema.fields).toEqual(fields);
  });

  it('should validate a log event that matches the schema', () => {
    const sourcePattern = /testSource/;
    const fields = new Map<string, string>([
      ['field1', 'string'],
      ['field2', 'number'],
    ]);

    const schema = new EventSchema(sourcePattern, fields);

    const logEvent: LogEvent = {
      payload: { field1: 'testValue', field2: 42 },
      metadata: { stream: 'testSource' },
    };

    const result = schema.validate(logEvent);
    expect(result.ok).toBe(true);
    if (result.ok) {
      if (result.ok) {
        expect(result.value).toBeNull();
      }
    }
  });

  it('should fail validation if the source does not match the pattern', () => {
    const sourcePattern = /testSource/;
    const fields = new Map<string, string>([
      ['field1', 'string'],
      ['field2', 'number'],
    ]);

    const schema = new EventSchema(sourcePattern, fields);

    const logEvent: LogEvent = {
      payload: { field1: 'testValue', field2: 42 },
      metadata: { stream: 'wrongSource' },
    };

    const result = schema.validate(logEvent);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual(
        expect.arrayContaining([
          "Source pattern mismatch: expected pattern '/testSource/', but got 'wrongSource'."
        ])
      );
    }
  });

  it('should validate a log event if sourcePattern is null', () => {
    const sourcePattern = null;
    const fields = new Map<string, string>([
      ['field1', 'string'],
      ['field2', 'number'],
    ]);

    const schema = new EventSchema(sourcePattern, fields);

    const logEvent: LogEvent = {
      payload: { field1: 'testValue', field2: 42 },
      metadata: { stream: 'anySource' },
    };

    const result = schema.validate(logEvent);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBeNull();
    }
  });

  it('should fail validation if a field type does not match', () => {
    const sourcePattern = /testSource/;
    const fields = new Map<string, string>([
      ['field1', 'string'],
      ['field2', 'number'],
    ]);

    const schema = new EventSchema(sourcePattern, fields);

    const logEvent: LogEvent = {
      payload: { field1: 'testValue', field2: 'notANumber' }, // Invalid type
      metadata: { stream: 'testSource' },
    };

    const result = schema.validate(logEvent);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual(
        expect.arrayContaining([
          "Field type mismatch for 'field2': expected type 'number', but got 'string'.",
        ])
      );
    }
  });

  it('should fail validation if a required field is missing', () => {
    const sourcePattern = /testSource/;
    const fields = new Map<string, string>([
      ['field1', 'string'],
      ['field2', 'number'],
    ]);

    const schema = new EventSchema(sourcePattern, fields);

    const logEvent: LogEvent = {
      payload: { field1: 'testValue' }, // Missing 'field2'
      metadata: { stream: 'testSource' },
    };

    const result = schema.validate(logEvent);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual(
        expect.arrayContaining([
          "Missing required field: 'field2'.",
          "Field type mismatch for 'field2': expected type 'number', but got 'undefined'.",
        ])
      );
    }
  });
});