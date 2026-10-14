import { describe, expect, it, vi } from 'vitest';
import { evidenceRequest } from '../../src/ui/reference/evidenceRequest.ts';

describe('evidence request termination', () => {
    it.each(['timeout', 'network-unavailable'] as const)('releases an unresponsive engine on %s and ignores its later output', async failure => {
        const abort = new AbortController();
        let finish!: (value: string) => void;
        const request = evidenceRequest(() => new Promise<string>(resolve => { finish = resolve; }), abort.signal);
        await Promise.resolve(); abort.abort(failure);
        await expect(request).rejects.toMatchObject({ name: 'ThinkingError', failure, message: failure });
        finish('late search data');
        await expect(request).rejects.toMatchObject({ failure });
    });
    it('never starts an offline request', async () => {
        const abort = new AbortController(); abort.abort('network-unavailable');
        const run = vi.fn(async () => 'unexpected');
        await expect(evidenceRequest(run, abort.signal)).rejects.toMatchObject({ failure: 'network-unavailable' });
        expect(run).not.toHaveBeenCalled();
    });
    it('preserves explicit Stop instead of reporting it as a network failure', async () => {
        const abort = new AbortController(), stop = new DOMException('Cancelled', 'AbortError');
        const request = evidenceRequest(() => new Promise<never>(() => {}), abort.signal);
        abort.abort(stop);
        await expect(request).rejects.toBe(stop);
    });
});
