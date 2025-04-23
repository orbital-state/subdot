import { BaseUrlSchema } from "./BaseUrlSchema.js";

export class KafkaUrlSchema extends BaseUrlSchema {
    constructor(
        host: string,
        port: number | undefined = undefined,
        path: string,
        query: string | Record<string, string> | URLSearchParams | string[][] | undefined
        // TODO: Add more specific types for query parameters
        // #{ topic: string; acks?: string;
        //     partition?: string; replicationFactor?: string; timeout?: string; }
    ) {
        super('kafka', host, port, undefined, undefined, path, query);
    }
    
    static parse(urlString: string): KafkaUrlSchema {
        const url = new URL(urlString);
        return new KafkaUrlSchema(
            url.hostname,
            url.port ? Number(url.port) : undefined,
            url.pathname !== '/' ? url.pathname : '',
            { topic: url.searchParams.get('topic') || '', ...Object.fromEntries(url.searchParams.entries()) }
        );
    }
}
