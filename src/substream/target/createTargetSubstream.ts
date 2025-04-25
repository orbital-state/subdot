import { TargetSubstream } from './TargetSubstream.js';
import { FileTargetSubstream } from './FileTargetSubstream.js';
import { existsSync } from 'fs';
import { FileUrlSchema } from '../../url/FileUrlSchema.js';

/**
 * Creates a target substream based on the provided target URL.
 * 
 * @param {string} [targetUrl] - The target URL. If not provided, defaults to stdout.
 * @param {'json' | 'plain'} [format='json'] - The format of the target substream. Defaults to 'json'.
 * @returns {TargetSubstream} - The created target substream.
 * @throws {Error} - Throws an error if the target URL is invalid or unsupported.
 */
export function createTargetSubstream(
  targetUrl?: string,
  format: 'json' | 'plain' = 'json'
): TargetSubstream {

  // FileTargetSubstream
  if (!targetUrl || targetUrl === 'stdout' || targetUrl === 'stdout://' || targetUrl === 'file://stdout') {
    return new FileTargetSubstream(undefined, format);
  }
  if (existsSync(targetUrl)) { 
    return new FileTargetSubstream("file://" + targetUrl, format);
  }
  if (targetUrl.startsWith('file://')) {
    const parsed = FileUrlSchema.parse(targetUrl);
    if (!parsed) {
      throw new Error(`[createTargetSubstream] Invalid file URL: ${targetUrl}`);
    }
    if (!existsSync(parsed.fullPath)) {
      throw new Error(`[createTargetSubstream] File does not exist: ${parsed.fullPath}`);
    }
    return new FileTargetSubstream(parsed.fullPath, format);
  }

  // `nats://`
  if (targetUrl.startsWith('nats://')) {
    const { NatsTargetSubstream } = await import('./NatsTargetSubstream.js');
    return new NatsTargetSubstream(undefined, { url: targetUrl, subjectPrefix: 'substreams' });
  }
  NatsTargetSubstream

  // Future: add `kafka://`, `nats://`, etc.
  throw new Error(`[createTargetSubstream] Unsupported target: ${targetUrl}`);
}
