import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NatsTargetSubstream } from './NatsTargetSubstream.js';
import { connect, StringCodec } from 'nats';
import { NatsUrlSchema } from '../../url/NatsUrlSchema.js';
import { logger } from '../../utils/Logger.js';
import { BasicEvent } from '../../model/BasicEvent.js';

vi.mock('nats', () => ({
    connect: vi.fn(),
    StringCodec: vi.fn(() => ({
        encode: vi.fn((value: string) => new TextEncoder().encode(value)), // Return Uint8Array
    })),
}));

vi.spyOn(logger, 'info'); // Mock logger.info

describe('NatsTargetSubstream', () => {
    const mockUrl = 'nats://user:pass@localhost:4222/test/subject';
    const mockSubjectPrefix = 'test.subject';
    let substream: NatsTargetSubstream;

    beforeEach(() => {
        substream = new NatsTargetSubstream(mockUrl);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should have non empty subject', () => {
        expect(substream['subjectPrefix']).toBeTruthy();
    });

    it('should initialize with correct url and subjectPrefix', () => {
        expect(substream).toBeDefined();
        expect(substream['url']).toBe(mockUrl);
        expect(substream['subjectPrefix']).toBe(mockSubjectPrefix);
    });

    it('should parse and normalize subjectPrefix correctly', () => {
        const parsedSchema = NatsUrlSchema.parse(mockUrl);
        console.log(parsedSchema.subjectPrefix);
        expect(parsedSchema.subjectPrefix).toBe('test.subject');
        expect(parsedSchema.getHost()).toBe('localhost');
        expect(parsedSchema.user).toBe('user');
        expect(parsedSchema.pass).toBe('pass');
    });

    it('should start and connect to NATS server', async () => {
        const parsedSchema = NatsUrlSchema.parse(mockUrl);
        const mockConnection = { close: vi.fn() };
        vi.mocked(connect).mockResolvedValue(mockConnection as any);

        await substream.start();

        expect(connect).toHaveBeenCalledWith({
            servers: parsedSchema.getServers(),
            user: parsedSchema.user,
            pass: parsedSchema.pass,
        });
        expect(logger.info).toHaveBeenCalledWith(
            `Connected to NATS server at ${parsedSchema.getServers()}, using subject: ${parsedSchema.subjectPrefix}`
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