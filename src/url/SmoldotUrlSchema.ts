import { BaseUrlSchema } from "./BaseUrlSchema.js";
import { SubdotSchema } from "./SubdotSchema.js";

/**
 * Represents a URL schema for Smoldot.
 * Example: "smoldot://rpc.polkadot.io/chain=chainName&types=types"
 * Or:  "smoldot.wss://rpc.polkadot.io"
 */
export class SmoldotUrlSchema extends BaseUrlSchema {
    constructor(
        scheme: string | SubdotSchema,
        host?: string,
        port?: number,
        user?: string,
        pass?: string,
        path?: string,
        query: Record<string, string> = {}
    ) {
        if (typeof scheme === 'string' && !scheme.includes('.') && scheme !== 'smoldot') {
            // If scheme is a string and does not contain a dot, prepend 'smoldot.'
            scheme = `smoldot.${scheme}`;
        }
        super(scheme, host, port, user, pass, path, query);
    }

    static parse(urlString: string): SmoldotUrlSchema {
        const url = new URL(urlString);
        let query: Record<string, string> = {};

        // Use search parameters if available
        if ([...url.searchParams].length > 0) {
            query = Object.fromEntries(url.searchParams.entries());
        } 
        // if no search params, check if hostname looks like a query string (contains '=')
        else if (url.hostname.includes('=')) {
            query = Object.fromEntries(new URLSearchParams(url.hostname));
        } 
        // Otherwise, treat the hostname as the chain value
        else if (url.hostname) {
            query = { chain: url.hostname };
        } else {
            throw new Error("Invalid Smoldot URL: chain parameter is missing");
        }
        
        return new SmoldotUrlSchema(url.protocol.replace(":", ""), url.hostname, url.port ? parseInt(url.port, 10) : undefined, undefined, undefined, url.pathname, query);
    }
}