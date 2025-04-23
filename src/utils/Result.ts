export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

// Utility functions for creating Result instances
export const Ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const Err = <E>(error: E): Result<never, E> => ({ ok: false, error });