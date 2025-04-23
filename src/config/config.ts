import fs from 'fs/promises';
import { parse as parseToml } from 'toml';

const DEFAULT_CONFIG = './subdot.toml';

export class Config {
  private static instance: Config | null = null;
  private config: Record<string, any> | null = null;
  private configPath: string;

  private constructor(configPath: string) {
    this.configPath = configPath;
  }

  public static async getInstance(verbose = false, configPath: string = DEFAULT_CONFIG): Promise<Config> {
    if (!Config.instance) {
      Config.instance = new Config(configPath);
      await Config.instance.loadConfig(verbose);
    }
    return Config.instance;
  }

  private async loadConfig(verbose: boolean): Promise<void> {
    try {
      const data = await fs.readFile(this.configPath, 'utf-8');
      this.config = parseToml(data);
    } catch (error) {
      if (verbose) {
        console.error(`⚠️ Error loading config from ${this.configPath}:`, error);
      }
      this.config = {
        source: {
          url: "wss://rpc.polkadot.io",
        },
        output: {
          format: "json",
        },
        tcp: {
          maxsourcequeue: 10485760, // 10MB
        },
        nats: {
          maxsourcequeue: 10485760, // 10MB
        },
      };
    }
  }

  public getConfig(): Record<string, any> {
    if (!this.config) {
      throw new Error("Configuration not loaded yet.");
    }
    return this.config;
  }
}

export default Config;
