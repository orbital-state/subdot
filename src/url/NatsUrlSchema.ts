import { BaseUrlSchema } from "./BaseUrlSchema.js";

export class NatsUrlSchema extends BaseUrlSchema {
    constructor(
        host: string,
        port?: number,
        user?: string,
        pass?: string,
        path?: string,
        query: string | Record<string, string> | URLSearchParams | string[][] | undefined = {}
    ) {
        const normalizedQuery: Record<string, string> = (() => {
            if (!query) return {};
            if (typeof query === 'string') {
                return Object.fromEntries(new URLSearchParams(query));
            }
            if (query instanceof URLSearchParams) {
                return Object.fromEntries(query.entries());
            }
            if (Array.isArray(query)) {
                return Object.fromEntries(query);
            }
            return query;
        })();

        super('nats', host, port, user, pass, path, normalizedQuery);
    }

    public get subjectPrefix(): string {
        // Normalize subjectPrefix: remove trailing . or .*
        // and replace '/' with '.'
        const normalizedSubject = this.path?.replace(/^\//, '') || 'events';
        return normalizedSubject.replace(/\.$/, '').replace(/\//g, '.');
      }

    getServers(): string {
        return `${this.host}:${this.port || 4222}`;
    }

    static parse(urlString: string): NatsUrlSchema {
        const url = new URL(urlString);
        return new NatsUrlSchema(
            url.hostname,
            url.port ? Number(url.port) : undefined,
            url.username || undefined,
            url.password || undefined,
            url.pathname !== '/' ? url.pathname : '',
            Object.fromEntries(url.searchParams.entries())
        );
    }

    static validate(urlString: string): NatsUrlSchema {
        const url = new URL(urlString);
        if (url.protocol !== 'nats:') {
            throw new Error(`Invalid NATS URL scheme: ${url.protocol}`);
        }
        if (!url.hostname) {
            throw new Error("NATS URL must have a host");
        }
        return NatsUrlSchema.parse(urlString);
    }
}