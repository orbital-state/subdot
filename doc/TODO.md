
# TODO:

## More testing
- Do full end-to-end testing with a real chain
- Add a small "mock mode" that skips connecting to live chain.


## Schema and Typed Events
- Add a schema validation step to the event processing pipeline.
- Add more tests for the new schema validation.
- Support schema based events instead of BasicEvent (schemaless events)


## Nice and balanced CLI
- Carefully thought about cli options and their order.
- Extend '-f' of FilterImpl to support StructuredLogActor and play nice with -o flag.


## Advanced Error Handling

- Improve debug capability of distributed events over many streams.
 - Start by evolving the idea of functional-style error handling as described in the `doc/schema.md` file.
 - Add a `debug` flag to the type event metadata that will print out the event data and the schema used for validation.
 - Log event data that was dropped by the filters.

## DONE

- implement nested schema validation for nested objects as event data
