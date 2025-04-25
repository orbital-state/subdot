import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NatsTargetSubstream } from './NatsTargetSubstream.js';
import { connect, StringCodec } from 'nats';
import { NatsUrlSchema } from '../../url/NatsUrlSchema.js';
import { logger } from '../../utils/Logger.js';
import { BasicEvent } from '../../model/BasicEvent.js';

// filepath: src/substream/target/NatsTargetSubstream.test.ts

vi.mock('nats', () => ({
    connect: vi.fn(),
    StringCodec: vi.fn(() => ({
        encode: vi.fn(),
    })),
}));

vi.mock('../../url/NatsUrlSchema.js', () => ({
    NatsUrlSchema: {
        parse: vi.fn(),
    },
}));

// don't mock the logger for now
// vi.mock('../../utils/Logger.js', () => ({
//     logger: {
//         info: vi.fn(),
//     },
// }));

describe('NatsTargetSubstream', () => {
    const mockUrl = 'nats://user:pass@localhost:4222';
    const mockSubjectPrefix = 'test.subject';
    const mockOptions = { url: mockUrl, subjectPrefix: mockSubjectPrefix };
    let substream: NatsTargetSubstream;

    beforeEach(() => {
        substream = new NatsTargetSubstream({}, mockOptions);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should initialize with correct url and subjectPrefix', () => {
        expect(substream).toBeDefined();
        expect(substream['url']).toBe(mockUrl);
        expect(substream['subjectPrefix']).toBe(mockSubjectPrefix);
    });

    it('should parse and normalize subjectPrefix correctly', () => {
        vi.mocked(NatsUrlSchema.parse).mockReturnValue({ subject: 'test.subject.*' });
        const result = substream['parseSubjectPrefix'](mockUrl);
        expect(result).toBe('test.subject');
    });

    it('should start and connect to NATS server', async () => {
        const mockServers = ['nats://localhost:4222'];
        vi.mocked(NatsUrlSchema.parse).mockReturnValue({
            getServers: () => mockServers,
            subject: 'test.subject',
            user: 'user',
            pass: 'pass',
        });
        const mockConnection = { close: vi.fn() };
        vi.mocked(connect).mockResolvedValue(mockConnection);

        await substream.start();

        expect(NatsUrlSchema.parse).toHaveBeenCalledWith(mockUrl);
        expect(connect).toHaveBeenCalledWith({
            servers: mockServers,
            user: 'user',
            pass: 'pass',
        });
        expect(logger.info).toHaveBeenCalledWith(
            `Connected to NATS server at ${mockServers}, using subject: test.subject`
        );
        expect(substream['nc']).toBe(mockConnection);
    });

    it('should generate correct subject for an event', () => {
        const mockEvent: BasicEvent = {
            payload: { section: 'testSection', method: 'testMethod' },
            toJSON: () => JSON.stringify({}),
        };
        const result = substream['getSubject'](mockEvent);
        expect(result).toBe('test.subject.testSection.testMethod');
    });

    it('should push an event to NATS', async () => {
        const mockEvent: BasicEvent = {
            payload: { section: 'testSection', method: 'testMethod' },
            toJSON: () => JSON.stringify({ key: 'value' }),
        };
        const mockConnection = { publish: vi.fn() };
        substream['nc'] = mockConnection as any;

        await substream.push(mockEvent);

        expect(substream['sc'].encode).toHaveBeenCalledWith(JSON.stringify({ key: 'value' }));
        expect(mockConnection.publish).toHaveBeenCalledWith(
            'test.subject.testSection.testMethod',
            expect.any(Uint8Array)
        );
    });

    it('should throw an error if push is called without a connection', async () => {
        const mockEvent: BasicEvent = {
            payload: { section: 'testSection', method: 'testMethod' },
            toJSON: () => JSON.stringify({}),
        };

        await expect(substream.push(mockEvent)).rejects.toThrow('NATS connection not initialized');
    });

    it('should stop and close the NATS connection', async () => {
        const mockConnection = { close: vi.fn() };
        substream['nc'] = mockConnection as any;

        await substream.stop();

        expect(mockConnection.close).toHaveBeenCalled();
    });
});