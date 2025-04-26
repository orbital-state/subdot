import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCliProgram } from './cli.js';
import { logger } from '../utils/Logger.js';

vi.spyOn(logger, 'debug'); // Mock logger.debug
vi.spyOn(logger, 'info'); // Mock logger.info

// Modify the test to capture the error thrown by process.exit
const mockExit = vi.spyOn(process, 'exit').mockImplementation((code?: number | string | null | undefined): never => {
  console.log(`process.exit called with code ${code}`);
  throw new Error(`process.exit called with code ${code}`); // Ensure it matches the expected behavior of never
});

describe('CLI Tests', () => {
  let program: ReturnType<typeof getCliProgram>;

  beforeEach(() => {
    program = getCliProgram();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should display the correct version', () => {
    const output = captureCliOutput(() => {
      try {
        program.parse(['--version'], { from: 'user' });
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).toContain('process.exit called with code');
        } else {
          throw error; // Re-throw if it's not an Error instance
        }
      }
    });
    expect(output).toContain(program.version());
  });

  it('should enable debug mode when -v is specified', () => {
    const output = captureCliOutput(() => {
      try {
        program.parse(['-v', 'config'], { from: 'user' });
      } catch (error) {
        if (error instanceof Error) {
          expect(logger.debug).toHaveBeenCalledWith('Verbose logging enabled');
          expect(error.message).toContain('process.exit called with code');
        } else {
          throw error; // Re-throw if it's not an Error instance
        }
      }
    });
  });

  it('should display help when no command is provided', () => {
    const output = captureCliOutput(() => {
      try {
        program.parse(['--help'], { from: 'user' });
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).toContain('process.exit called with code');
        } else {
          throw error; // Re-throw if it's not an Error instance
        }
      }
    });
    expect(output).toContain('Usage: subdot [options] [command]');
  });

  // Fix specific command help test by accounting for the program name in the usage string
  it('should display help for a specific command', () => {
    const output = captureCliOutput(() => {
      try {
        program.parse(['filter', '--help'], { from: 'user' });
      } catch (e) {
        // Help output is shown via an exception in Commander
      }
    });
    expect(output).toContain('Usage: subdot filter [options]');
    expect(output).toContain('--source <url>');
    expect(output).toContain('--target <url>');
  });

  // Updated to handle unknown type for error
  it('should handle process.exit correctly', () => {
    try {
      process.exit(0);
    } catch (error) {
      if (error instanceof Error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('process.exit called with code 0');
      } else {
        throw error; // Re-throw if it's not an Error instance
      }
    }
  });
});

// Utility function to capture CLI output
function captureCliOutput(callback: () => void): string {
  const originalWrite = process.stdout.write;
  let output = '';
  process.stdout.write = (chunk: any): boolean => {
    output += chunk.toString();
    return true;
  };
  try {
    callback();
  } finally {
    process.stdout.write = originalWrite;
  }
  return output;
}