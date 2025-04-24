import { SourceSubstream } from './SourceSubstream.js';
import { FileSourceSubstream } from './FileSourceSubstream.js';
// import { TcpSourceSubstream } from './TcpSourceSubstream.js';
import { SmoldotSourceSubstream } from './SmoldotSourceSubstream.js';
import { existsSync } from 'fs';
import { FileUrlSchema } from '../../url/FileUrlSchema.js';

/**
 * Creates a source substream based on the provided source URL.
 * 
 * @param {string} [sourceUrl] - The source URL. If not provided, defaults to stdin.
 * @param {'json' | 'plain'} [format='json'] - The format of the input stream.
 * @returns {SourceSubstream} - The created source substream.
 * @throws {Error} - Throws an error if the source URL is invalid or unsupported.
 */
export function createSourceSubstream(
  sourceUrl?: string,
  format: 'json' | 'plain' = 'json'
): SourceSubstream {

  // FileSourceSubstream (stdin or file path)
  if (!sourceUrl || sourceUrl === 'stdin' || sourceUrl === 'stdin://' || sourceUrl.startsWith('file://') || existsSync(sourceUrl)) {
    if (!sourceUrl || sourceUrl === 'stdin' || sourceUrl === 'stdin://') {
      return new FileSourceSubstream(undefined, format); // stdin
    }

    if (existsSync(sourceUrl)) {
      return new FileSourceSubstream(sourceUrl, format); // direct file path
    }

    const parsed = FileUrlSchema.parse(sourceUrl);
    if (!parsed) {
      throw new Error(`[createSourceSubstream] Invalid file URL: ${sourceUrl}`);
    }
    if (!existsSync(parsed.fullPath)) {
      throw new Error(`[createSourceSubstream] File does not exist: ${parsed.fullPath}`);
    }
    return new FileSourceSubstream(parsed.fullPath, format);
  }

  // SmoldotSourceSubstream
  if (sourceUrl?.startsWith('smoldot.ws://') || sourceUrl?.startsWith('smoldot.wss://')) {
    // Ensure the URL starts with smoldot.ws:// or smoldot.wss://
    return new SmoldotSourceSubstream(sourceUrl, undefined, format);
  }

  // // TcpSourceSubstream
  // if (sourceUrl.startsWith('tcp://')) {
  //   return new TcpSourceSubstream(sourceUrl, format);
  // }

  // Future: nats://, kafka://, ws://
  throw new Error(`[createSourceSubstream] Unsupported source: ${sourceUrl}`);
}
