
## Validation and error handling

We use the following approach to validate the schema and handle errors:

1. **Unified Error Handling**: Both methods now use the same Result type, making the API consistent.
2. **Clearer Intent**: The Result type explicitly communicates whether the operation succeeded or failed.
3. **Extensibility**: You can extend the Result type to include additional metadata or error codes if needed.
4. **Idiomatic**: This approach is inspired by functional programming paradigms, making it easier to reason about and test.

## Example of using the schema validation

```typescript
const schema = new EventSchema(/example/, new Map([['field1', 'string'], ['field2', 'number']]));
const event: LogEvent = {
    metadata: { stream: 'wrongStream' },
    payload: { field1: 123, field3: 'extraField' },
};

const result = schema.validate(event);
if (!result.ok) {
    console.error('Validation failed with errors:', result.error);
} else {
    console.log('Validation succeeded');
}
```