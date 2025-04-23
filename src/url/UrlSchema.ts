import { SubdotSchema } from "./SubdotSchema.js";

export interface UrlSchema {
    readonly scheme: string | SubdotSchema;
    readonly host?: string;
    readonly port?: number;
    readonly user?: string;
    readonly pass?: string;
    readonly path?: string;
    readonly query: string | Record<string, string> | URLSearchParams | string[][] | undefined;
    
    toString(): string;
    getScheme(): SubdotSchema;
    getApp(): string | undefined;
    getProtocol(): string;
    getHost(): string | undefined;
    getPort(): number | undefined;
    getUser(): string | undefined;
    getPass(): string | undefined;
    getPath(): string | undefined;
    getQuery(): string | Record<string, string> | URLSearchParams | string[][] | undefined;
    validate(): boolean;
    parse(urlString: string): UrlSchema;
    isValid(): boolean;
    isSecure(): boolean;
    isInsecure(): boolean;
    isLocal(): boolean;
    isRemote(): boolean;
    isFile(): boolean;
}

export interface AppUrlSchema {
    isNats(): boolean;
    isKafka(): boolean;
    isHttp(): boolean;
    isHttps(): boolean;
    isWs(): boolean;
    isWss(): boolean;
    isMqtt(): boolean;
    isAmqp(): boolean;
    isRedis(): boolean;
    isPostgres(): boolean;
    isMysql(): boolean;
    isMongo(): boolean;
    isCassandra(): boolean;
}