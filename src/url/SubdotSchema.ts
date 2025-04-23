/**
 * SubdotSchema is a class that represents a schema for all subdot URLs.
 * 
 * It is a string that consists of prefix (optional) <app> and suffix <protocol> parts.
 * 
 * For example, `smoldot.wss` is a valid schema for subdot URLs. 
 * This is a longer form of "wss://rpc.polkadot.io" (w/o <app>).
 * Meaning that the full URL can be "smoldot.wss://rpc.polkadot.io" or begin with 
 * "<app>.<protocol>", where we have "<app>" = "smoldot" and "<protocol>" = "wss".
 * 
 * This schema allows for easy identification and routing of subdot URLs.
 */

// Must disjoint from SubdotProtocol
export enum SubdotApp {
    Kafka = "kafka",
    NATS = "nats",
    Smoldot = "smoldot",
    RabbitMQ = "rabbitmq",
    Redis = "redis",
    Postgres = "postgres",
    MySQL = "mysql",
    MongoDB = "mongodb",
    S3 = "s3",
    PubSub = "pubsub",
    EventBridge = "eventbridge",
    Kinesis = "kinesis",
    SNS = "sns",
    SQS = "sqs",
    AzureEventHub = "azure_event_hub",
    AzureServiceBus = "azure_service_bus",
    GooglePubSub = "google_pubsub",
    ActiveMQ = "activemq",
    ZeroMQ = "zeromq",
    Pulsar = "pulsar",
    OPCUA = "opcua",
    KafkaStreams = "kafka_streams",
    Flink = "flink",
    Spark = "spark",
    NiFi = "nifi",
    Logstash = "logstash",
    Filebeat = "filebeat",
    Metricbeat = "metricbeat",
    Prometheus = "prometheus",
    Grafana = "grafana",
    ElasticSearch = "elasticsearch",
    Kibana = "kibana",
    StructuredLog = "log",
    Cassandra = "cassandra",
}

// Must disjoint from SubdotApp
export enum SubdotProtocol {
    HTTP = "http",
    HTTPS = "https",
    WS = "ws",
    WSS = "wss",
    TCP = "tcp",
    TLS = "tls",
    SSL = "ssl",
    UDP = "udp",
    AMQP = "amqp",
    MQTT = "mqtt",
    MQTTS = "mqtts",
    MQTTWS = "mqttws",
    MQTTWSS = "mqttwss",
    GRPC = "grpc",
    CoAP = "coap",
    FILE = "file",
}

export class SubdotSchema {
    private static readonly SCHEMA_REGEX = /^[a-z0-9]+(\.[a-z0-9]+)?$/; // restrict to lowercase
    private static readonly SCHEMA_SEPARATOR = '.';

    private schema: string;

    constructor(schema: string) {
        if (!SubdotSchema.SCHEMA_REGEX.test(schema)) {
            throw new Error(`Invalid subdot schema format: "${schema}"`);
        }
        // Split and validate using enum values.
        const parts = schema.split(SubdotSchema.SCHEMA_SEPARATOR);
        if (parts.length === 1) {
            // single part can be a protocol or app
            // if single part is a valid app, then we pick default protocol
            if (Object.values(SubdotApp).includes(parts[0] as SubdotApp)) {
                this.schema = `${parts[0]}${SubdotSchema.SCHEMA_SEPARATOR}${SubdotSchema.getDefaultProtocol(parts[0])}`;
                return;
            }
            // Otherwise, single part must be a valid protocol
            if (!Object.values(SubdotProtocol).includes(parts[0] as SubdotProtocol)) {
                throw new Error(`Invalid protocol in subdot schema: ${parts[0]}`);
            }
        } else if (parts.length === 2) {
            // two parts: app and protocol
            if (!Object.values(SubdotApp).includes(parts[0] as SubdotApp)) {
                throw new Error(`Invalid app in subdot schema: ${parts[0]}`);
            }
            if (!Object.values(SubdotProtocol).includes(parts[1] as SubdotProtocol)) {
                throw new Error(`Invalid protocol in subdot schema: ${parts[1]}`);
            }
        } else {
            throw new Error(`Subdot schema must have one or two parts: ${schema}`);
        }
        this.schema = schema;
    }

    static getDefaultProtocol(app:string){
        switch(app) {
            case SubdotApp.Kafka:
                return SubdotProtocol.TCP;
            case SubdotApp.NATS:
                return SubdotProtocol.WS;
            case SubdotApp.Smoldot:
                return SubdotProtocol.WSS;

            default:
                throw new Error(`No default protocol for app: ${app}`);
        }
    }

    public getApp(): string {
        const parts = this.schema.split(SubdotSchema.SCHEMA_SEPARATOR);
        return parts.length === 2 ? parts[0] : '';
    }

    public getProtocol(): string {
        const parts = this.schema.split(SubdotSchema.SCHEMA_SEPARATOR);
        return parts.length === 2 ? parts[1] : parts[0];
    }

    public getSchema(): string {
        return this.schema;
    }

    public toString(): string {
        return this.schema;
    }

    public static fromString(schema: string): SubdotSchema {
        return new SubdotSchema(schema);
    }

    public static isValid(schema: string): boolean {
        try {
            new SubdotSchema(schema);
            return true;
        } catch (e) {
            return false;
        }
    }

    // A helper for building a subdot schema from enums.
    public static build(options: { protocol: SubdotProtocol; app?: SubdotApp }): SubdotSchema {
        const schema = options.app ? `${options.app}${SubdotSchema.SCHEMA_SEPARATOR}${options.protocol}` : `${options.protocol}`;
        return new SubdotSchema(schema);
    }
}