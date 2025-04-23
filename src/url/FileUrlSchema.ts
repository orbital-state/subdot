import { BaseUrlSchema } from "./BaseUrlSchema.js";

export class FileUrlSchema extends BaseUrlSchema {
    constructor(
        app: string | undefined,
        path: string,
        query: Record<string, string> = {}
    ) {
        let scheme = 'file';
        if (app !== undefined) {
            scheme = app + '.file';
        }
        super(scheme, undefined, undefined, undefined, undefined, path, query);
    }

    static parse(urlString: string): FileUrlSchema {
        const url = new URL(urlString);
        const protocol = url.protocol.slice(0, -1); // Remove trailing ':'
        let app: string | undefined = undefined;

        if (protocol !== 'file' && protocol.endsWith('.file')) {
            app = protocol.slice(0, -5); // Extract app portion
        }

        const path = url.pathname !== '/' ? url.pathname : '';
        const query = Object.fromEntries(url.searchParams.entries());

        if (!path) {
            throw new Error(`[FileUrlSchema] Invalid file URL: ${urlString}`);
        }

        return new FileUrlSchema(app, path, query);
    }

    get fullPath(): string {
        return this.path as string;
    }
}
