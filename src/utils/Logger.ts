import { createLogger, format, transports } from 'winston';

let logLevel = process.env.LOG_LEVEL || 'info';

export const logger = createLogger({
  level: logLevel,
  format: format.combine(
    format.timestamp(),
    format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}]: ${message}`)
  ),
  transports: [
    new transports.Console(),
  ],
});

/**
 * Dynamically set the log level.
 * @param level The new log level (e.g., 'debug', 'info', 'warn', 'error').
 */
export function setLogLevel(level: string): void {
  logLevel = level;
  logger.level = level;
}