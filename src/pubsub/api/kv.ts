export interface IKeyValueStore<V = unknown> {
    listKeys(prefix: string): Promise<string[]>;
    put(key: string, value: V, ttlMs?: number): Promise<void>;
    get(key: string): Promise<V | null>; 
    getValue(key: string): Promise<{ value: V } | null>;
    delete(key: string): Promise<void>;
    watch(prefix: string, onChange: (key: string, value: V | null) => void): Promise<() => void>; // returns unsubscribe
}
