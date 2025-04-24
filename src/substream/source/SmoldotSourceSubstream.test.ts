import { describe, it, expect, vi } from 'vitest';
import { SmoldotSourceSubstream } from './SmoldotSourceSubstream.js';
import { SmoldotUrlSchema } from '../../url/SmoldotUrlSchema.js';

// filepath: src/substream/source/SmoldotSourceSubstream.test.ts

vi.mock('../../url/SmoldotUrlSchema.js', () => ({
  SmoldotUrlSchema: {
    parse: vi.fn(),
  },
}));

describe('SmoldotSourceSubstream - getWebSocketUrl', () => {
  it('should return a valid ws:// URL also when path is empty string', () => {
    (SmoldotUrlSchema.parse as ReturnType<typeof vi.fn>).mockReturnValue({
      scheme: 'smoldot.ws',
      host: 'example.com',
      path: '',
    });

    const substream = new SmoldotSourceSubstream('smoldot.ws://example.com');
    const wsUrl = substream['getWebSocketUrl']();
    expect(wsUrl).toBe('ws://example.com');
  });

  it('should return a valid ws:// URL', () => {
    (SmoldotUrlSchema.parse as ReturnType<typeof vi.fn>).mockReturnValue({
      scheme: 'smoldot.ws',
      host: 'example.com',
      path: '/stream',
    });

    const substream = new SmoldotSourceSubstream('smoldot.ws://example.com/stream');
    const wsUrl = substream['getWebSocketUrl']();
    expect(wsUrl).toBe('ws://example.com/stream');
  });

  it('should return a valid wss:// URL', () => {
    (SmoldotUrlSchema.parse as ReturnType<typeof vi.fn>).mockReturnValue({
      scheme: 'smoldot.wss',
      host: 'secure.example.com',
      path: '/secure-stream',
    });

    const substream = new SmoldotSourceSubstream('smoldot.wss://secure.example.com/secure-stream');
    const wsUrl = substream['getWebSocketUrl']();
    expect(wsUrl).toBe('wss://secure.example.com/secure-stream');
  });

  it('should throw an error for an invalid scheme', () => {
    (SmoldotUrlSchema.parse as ReturnType<typeof vi.fn>).mockReturnValue({
      scheme: 'smoldot.http',
      host: 'example.com',
      path: '/invalid',
    });

    const substream = new SmoldotSourceSubstream('smoldot.http://example.com/invalid');
    expect(() => substream['getWebSocketUrl']()).toThrowError('Invalid WebSocket scheme: http');
  });

  it('should throw an error for a missing scheme', () => {
    (SmoldotUrlSchema.parse as ReturnType<typeof vi.fn>).mockReturnValue({
      scheme: '',
      host: 'example.com',
      path: '/missing-scheme',
    });

    const substream = new SmoldotSourceSubstream('example.com/missing-scheme');
    expect(() => substream['getWebSocketUrl']()).toThrowError('Invalid WebSocket scheme: ');
  });

  it('should handle URLs without a path', () => {
    (SmoldotUrlSchema.parse as ReturnType<typeof vi.fn>).mockReturnValue({
      scheme: 'smoldot.ws',
      host: 'example.com',
      path: '',
    });

    const substream = new SmoldotSourceSubstream('smoldot.ws://example.com');
    const wsUrl = substream['getWebSocketUrl']();
    expect(wsUrl).toBe('ws://example.com');
  });
});