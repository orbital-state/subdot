import { SubdotApp, SubdotProtocol, SubdotSchema } from "./SubdotSchema.js";
import { AppUrlSchema, UrlSchema } from "./UrlSchema.js";

/**
 * BaseUrlSchema is a class that implements the UrlSchema and AppUrlSchema interfaces.
 * It provides methods to parse, validate, and manipulate URLs.
 * This class also includes methods to check the type of URL (e.g., secure, local).
 * It provides additional methods to determine the type of URL, such as isNats, isKafka, etc.
 * Furthermore, scheme is a SubdotSchema object that represents the scheme of the URL as special to subdot project.
 */
export class BaseUrlSchema implements UrlSchema, AppUrlSchema {
    constructor(
        public readonly scheme: string | SubdotSchema,
        public readonly host?: string,
        public readonly port?: number,
        public readonly user?: string,
        public readonly pass?: string,
        public readonly path?: string,
        public readonly query: string | Record<string, string> | URLSearchParams | string[][] | undefined = {}
    ) {
        this.scheme = typeof scheme === 'string' ? SubdotSchema.fromString(scheme) : scheme;
        this.host = host;
        this.port = port;
        this.user = user;
        this.pass = pass;
        this.path = path;
        this.query = query;
    }

    public getHost(): string | undefined {
        return this.host;
    }

    public getPort(): number | undefined {
        return this.port;
    }

    public getUser(): string | undefined {
        return this.user;
    }

    public getPass(): string | undefined {
        return this.pass;
    }

    public getPath(): string | undefined {
        return this.path;
    }

    public getQuery(): string | Record<string, string> | URLSearchParams | string[][] | undefined {
        if (this.query === undefined) {
            return undefined;
        }
        if (typeof this.query === 'string') {
            return this.query;
        }
        const query: Record<string, string> = {};
        if (this.query instanceof URLSearchParams) {
            this.query.forEach((value, key) => {
                query[key] = value;
            });
        } else if (Array.isArray(this.query)) {
            this.query.forEach(([key, value]) => {
                query[key] = value;
            });
        } else {
            Object.entries(this.query).forEach(([key, value]) => {
                query[key] = value as string;
            });
        }
        if (Object.keys(query).length === 0) {
            return undefined;
        }
        return query;
    }

    public validate(): boolean {
        // Basic validation: require a protocol and if not a file URL then a host is required.
        const protocol = this.getProtocol();
        if (!protocol) return false;
        if (protocol !== 'file' && (!this.host || this.host.trim() === '')) {
            return false;
        }
        return true;
    }

    public parse(urlString: string): UrlSchema {
        return BaseUrlSchema.parse(urlString);
    }

    public isValid(): boolean {
        return this.validate();
    }

    public isSecure(): boolean {
        // secure protocols
        const secureProtocols = ['https', 'wss', 'mqtts', 'amqps'];
        return secureProtocols.includes(this.getProtocol());
    }

    public isInsecure(): boolean {
        return !this.isSecure();
    }

    public isLocal(): boolean {
        const localHosts = ['localhost', '127.0.0.1', '::1'];
        return this.host ? localHosts.includes(this.host) : false;
    }

    public isRemote(): boolean {
        return !this.isLocal();
    }

    public isFile(): boolean {
        return this.getProtocol() as SubdotProtocol === SubdotProtocol.FILE;
    }

    public isHttp(): boolean {
        return this.getProtocol() as SubdotProtocol === SubdotProtocol.HTTP;
    }

    public isHttps(): boolean {
        return this.getProtocol() as SubdotProtocol === SubdotProtocol.HTTPS;
    }

    public isWs(): boolean {
        return this.getProtocol() as SubdotProtocol === SubdotProtocol.WS;
    }

    public isWss(): boolean {
        return this.getProtocol() as SubdotProtocol === SubdotProtocol.WSS;
    }

    public isNats(): boolean {
        return (this.getApp() as SubdotApp) === SubdotApp.NATS;
    }

    public isKafka(): boolean {
        return (this.getApp() as SubdotApp) === SubdotApp.Kafka;
    }

    public isSmoldot(): boolean {
        return (this.getApp() as SubdotApp) === SubdotApp.Smoldot;
    }

    public isAmqp(): boolean {
        return this.getProtocol() as SubdotProtocol === SubdotProtocol.AMQP;
    }

    public isMqtt(): boolean {
        return this.getProtocol() as SubdotProtocol === SubdotProtocol.MQTT;
    }

    public isMqtts(): boolean {
        return this.getProtocol() as SubdotProtocol === SubdotProtocol.MQTTS;
    }

    public isRedis(): boolean {
        return this.getApp() as SubdotApp === SubdotApp.Redis;
    }

    public isPostgres(): boolean {
        return this.getApp() as SubdotApp === SubdotApp.Postgres;
    }

    public isMysql(): boolean {
        return this.getApp() as SubdotApp === SubdotApp.MySQL;
    }

    public isMongo(): boolean {
        return this.getApp() as SubdotApp === SubdotApp.MongoDB;
    }

    public isCassandra(): boolean {
        return this.getApp() as SubdotApp === SubdotApp.Cassandra;
    }

    public getScheme(): SubdotSchema {
        return this.scheme as SubdotSchema;
    }

    public getApp(): string | undefined {
        const app = this.getScheme().getApp();
        return app ? app : undefined;
    }

    public getProtocol(): string {
        return this.getScheme().getProtocol();
    }

    public toString(): string {
        const userinfo = this.user ? `${this.user}${this.pass ? `:${this.pass}` : ''}@` : '';
        const hostport = this.host ? `${this.host}${this.port ? `:${this.port}` : ''}` : '';
        const path = this.path ? this.path : '';
        const query = this.getQuery() ? `?${new URLSearchParams(this.getQuery()).toString()}` : '';
        let scheme = this.getScheme().toString();
        return `${scheme}://${userinfo}${hostport}${path}${query}`;
    }

    public static parse(urlString: string): BaseUrlSchema {
        const url = new URL(urlString);
        return new BaseUrlSchema(
            SubdotSchema.fromString(url.protocol.replace(':', '')),
            url.hostname || undefined,
            url.port ? Number(url.port) : undefined,
            url.username || undefined,
            url.password || undefined,
            url.pathname && url.pathname !== '/' ? url.pathname : undefined,
            Object.fromEntries(url.searchParams.entries())
        );
    }
}
