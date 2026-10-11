import { describe, expect, it } from 'vitest';
import { discoveryUnavailableText, describeDiscovery, DEFAULT_DISCOVERY } from '../../src/discovery/contracts.ts';
import { discoveryFailure } from '../../src/discovery/engine.ts';
import { envelopeRoot } from '../../src/discovery/envelope.ts';
import { HTTPResponseError } from '../../src/shared/http.ts';

describe('Verify reports the capability and bounded source failure (#22)', () => {
    it('distinguishes permission, source selection, key, address and missing engine', () => {
        const reason = (over: Partial<typeof DEFAULT_DISCOVERY>, keys = {}, builtInEngine = true) => {
            const settings = { ...DEFAULT_DISCOVERY, ...over };
            return discoveryUnavailableText(settings, describeDiscovery(settings, keys, { builtInEngine }));
        };
        expect(reason({})).toContain('is off');
        expect(reason({ external: true })).toBe('settings.search.chooseSource');
        const sources = { exa: true, tavily: false, brave: false };
        expect(reason({ external: true, sources })).toBe('settings.search.keyNeeded');
        expect(reason({ external: true, sources }, { exa: true }, false)).toBe('settings.search.unavailable');
        expect(reason({ external: true, backend: 'custom', customUrl: 'invalid' })).toBe('settings.search.badAddress');
    });
    it.each([
        [new HTTPResponseError(401), 'authentication-failed'],
        [new HTTPResponseError(403), 'permission-denied'],
        [new HTTPResponseError(429), 'rate-limited'],
        [new TypeError('private URL'), 'provider-unreachable'],
        [new DOMException('private', 'TimeoutError'), 'timeout'],
        [new DOMException('private', 'AbortError'), 'cancelled'],
    ])('preserves an existing transport classification', (error, failure) => {
        expect(discoveryFailure(error)).toBe(failure);
    });
    it.each([
        ['auth_error', 'authentication-failed'], ['timeout', 'timeout'],
        ['network_error', 'provider-unreachable'], ['rate_limited', 'rate-limited'],
        ['parameter_error', 'invalid-configuration'], ['parse_error', 'malformed-provider-response'],
    ])('uses unanimous %s attempt types without reading messages', (error_type, failure) => {
        const raw = JSON.stringify({ version: 1, operation: 'search', status: 'failed', data: {}, error: { code: 'PROVIDER_ERROR', message: 'PRIVATE' }, attempts: [{ error_type, message: 'PRIVATE' }] });
        try { envelopeRoot(raw, 'search'); throw new Error('Expected failure'); }
        catch (error) { expect(discoveryFailure(error)).toBe(failure); expect(String(error)).not.toContain('PRIVATE'); }
    });
    it.each([{ types: ['auth_error', 'network_error'] }, { types: ['unknown'] }, { types: [] }])('does not guess from mixed or unknown attempts', ({ types }) => {
        const raw = JSON.stringify({ version: 1, operation: 'search', status: 'failed', data: {}, error: { code: 'PROVIDER_ERROR' }, attempts: types.map(error_type => ({ error_type })) });
        expect(() => envelopeRoot(raw, 'search')).toThrow('provider-failed');
    });
});
