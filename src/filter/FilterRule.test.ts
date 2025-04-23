import { describe, it, expect } from 'vitest';
import { IdentityFilterRule } from './FilterRule.js';

describe('IdentityFilterRule', () => {
    it('should always return true', async () => {
        const rule = new IdentityFilterRule();
        expect(await rule.matches({} as any)).toBe(true);
    });
});