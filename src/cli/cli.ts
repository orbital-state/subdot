import { Command } from 'commander';
import { Config } from '../config/config.js';
import { logger, setLogLevel } from '../utils/Logger.js';
import pkg from '../../package.json' with { type: 'json' };
import { FilterCommand } from './command/FilterCommand.js';
import { SubdotWorker, SubdotWorkerConfig } from '../pubsub/SubdotWorker.js';
import { SubdotManager, SubdotManagerConfig } from '../pubsub/SubdotManager.js';
const { version } = pkg;

export async function runCLI() {
  const program = new Command();

  program
    .name('subdot')
    .description('Subdot real-time event router CLI')
    .option('-v, --verbose', 'enable verbose logging')
    .option('-c, --config <path>', 'set config file', 'subdot.toml')
    .version(version);

  // Parse options early to set log level
  const options = program.opts();

  // Set log level based on verbosity
  if (options.verbose) {
    setLogLevel('debug');
    logger.debug('Verbose logging enabled');
  }

  // Load the configuration file
  const configInstance = await Config.getInstance(options.verbose, options.config);
  const config = configInstance.getConfig();

  if (options.verbose) {
    logger.debug('Loaded configuration:', config);
  }

  // Define commands
  program
    .command('config')
    .description('Manage configuration')
    .option('-l, --list', 'list all available configurations')
    .option('-a, --add <name>', 'add a new configuration')
    .option('-r, --remove <name>', 'remove an existing configuration')
    .option('-e, --edit <name>', 'edit an existing configuration')
    .option('-s, --set <name>', 'set the current configuration')
    .option('-g, --get <name>', 'get the current configuration')
    .option('-d, --default', 'set the default configuration')
    .option('-i, --import <path>', 'import a configuration from a file')
    .option('-e, --export <name>', 'export a configuration to a file')
    .action(() => {
      logger.info('Configuration management is not yet implemented.');
    });

  program
    .command('filter')
    .description('Filter a stream of events')
    .option('-s, --source <url>', 'Source subdot URL to subscribe/listen to events')
    .option('-t, --target <url>', 'Target subdot URL to publish filtered events')
    .option('-q, --query <filter>', 'Query to apply on stream events (e.g., $.type = "finalized")')
    .option('-i, --input-format <format>', 'Input format (e.g., json)', 'json') // Default set to 'json'
    .option('-o, --output-format <format>', 'Output format (e.g., json)', 'json') // Default set to 'json'
    .action(async (options) => {
      logger.debug('Running filter command with options:', options);
      const filter = new FilterCommand({
        query: options.query,
        source: options.source,
        target: options.target,
        inputFormat: options.inputFormat,
        outputFormat: options.outputFormat
      });
      await filter.run();
    });

  program
    .command('manager')
    .description('Run subdot subscription manager')
    .action(async () => {
      logger.info('Starting subdot subscription manager...');
      const managerConfig = new SubdotManagerConfig();
      const manager = await SubdotManager.create(managerConfig);
      await manager.run();
    });

  program
    .command('worker')
    .description('Run subdot filter worker')
    .action(async () => {
      logger.info('Starting subdot filter worker...');
      const workerConfig = new SubdotWorkerConfig();
      const worker = await SubdotWorker.create(workerConfig);
      await worker.run();
    });

  program
    .command('tui')
    .description('Launch TUI for monitoring')
    .action(() => {
      logger.info('TUI monitoring is not yet implemented.');
    });

  program
    .command('help [command]')
    .description('Show help information for a command')
    .action((cmd) => {
      if (cmd) {
        program.commands.find(c => c.name() === cmd)?.help();
      } else {
        program.help();
      }
    });

  if (!process.argv.slice(2).length) {
    program.help(); // Show help if no command is provided
  }

  // Must be at the end
  program.parse(process.argv);
}
