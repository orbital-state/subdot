import { UrlSchema } from './UrlSchema.js';
import { FileUrlSchema } from './FileUrlSchema.js';
import { NatsUrlSchema } from './NatsUrlSchema.js';
import { SmoldotUrlSchema } from './SmoldotUrlSchema.js';
import { SubdotApp } from './SubdotSchema.js';

export class UrlSchemaFactory {
    public static parseUrlSchema(urlString: string): UrlSchema {
        const url = new URL(urlString);
        const scheme = url.protocol.replace(':', '');

        switch (scheme) {
            case 'file':
                if (!url.pathname || url.pathname === '/') {
                    throw new Error("File URL must have a path");
                }
                // if protocol ends with '.file', parse the app name
                let app: string | undefined = undefined;
                if (url.protocol.endsWith('.file')) {
                    app = url.protocol.slice(0, -5); // removes '.file'
                }
                // if app is not defined, use structure log as default app
                app = app || SubdotApp.StructuredLog;
                return new FileUrlSchema(undefined, url.pathname);

            case 'nats':
                if (!url.hostname) {
                    throw new Error("NATS URL must have a host");
                }
                return new NatsUrlSchema(
                    url.hostname,
                    url.port ? Number(url.port) : undefined,
                    url.username || undefined,
                    url.password || undefined,
                    url.pathname !== '/' ? url.pathname : undefined,
                    Object.fromEntries(url.searchParams.entries())
                );

            case 'smoldot':
            case 'smoldot.wss': {
                const query = Object.fromEntries(url.searchParams.entries());
                if (!query['chain']) {
                    throw new Error("Smoldot URL must specify a chain");
                }
                return new SmoldotUrlSchema(
                    url.protocol.replace(':', ''),
                    url.hostname,
                    url.port ? Number(url.port) : undefined,
                    url.username || undefined,
                    url.password || undefined,
                    url.pathname !== '/' ? url.pathname : undefined,
                    query
                );
            }
            
            default:
                throw new Error(`Unsupported URL scheme: ${scheme}`);
        }
    }
}
