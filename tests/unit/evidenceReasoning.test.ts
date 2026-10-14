import { describe, expect, it, vi } from 'vitest';
import type { AIProvider, StructuredResponse } from '../../src/ai/contracts.ts';
import { ThinkingError } from '../../src/ai/errors.ts';
import type { EvidencePassage } from '../../src/core/model.ts';
import { ModelEvidenceReasoner } from '../../src/evidence/reasoning.ts';

const passage: EvidencePassage = { id: 'read-1', text: '你好 is a Chinese greeting meaning hello.', url: 'https://example.org/hello', locator: 'Paragraph 1', inspected: 'Matched to fetched text', retrievedAt: 1, provider: 'Reader' };
const answer = { outcome: 'support', rationale: 'The supplied paragraph defines the greeting.', passageIds: ['read-1'] };
function model(over: Partial<AIProvider> = {}): AIProvider {
    return { label: 'Fixture model', mock: false, respond: vi.fn(), capabilities: vi.fn(), structured: vi.fn(async () => ({ value: answer, providerLabel: 'Fixture model', mock: false })), ...over };
}
describe('explicit evidence assessment through the configured model', () => {
    it('sends only the claim and bounded read passages, retaining actual model attribution', async () => {
        const provider = model();
        const reasoner = new ModelEvidenceReasoner(async () => provider);
        expect(provider.structured).not.toHaveBeenCalled();
        expect(await reasoner.reason('你好 means hello', [passage])).toEqual(answer);
        expect(provider.structured).toHaveBeenCalledWith(expect.objectContaining({ purpose: 'evidence-assessment', input: { claim: '你好 means hello', passages: [passage] } }), undefined);
        expect(reasoner.label).toBe('Fixture model');
    });
    it('rejects invented passage references and malformed output', async () => {
        for (const value of [{ ...answer, passageIds: ['unread'] }, { ...answer, outcome: 'certain' }, { ...answer, rationale: 'x'.repeat(4001) }]) {
            const reasoner = new ModelEvidenceReasoner(async () => model({ structured: vi.fn(async () => ({ value, providerLabel: 'Fixture', mock: false })) }));
            await expect(reasoner.reason('Claim', [passage])).rejects.toMatchObject({ failure: 'malformed-provider-response' });
        }
    });
    it('never treats a demo provider or demo response as real evidence assessment', async () => {
        const provider = model({ mock: true });
        await expect(new ModelEvidenceReasoner(async () => provider).reason('Claim', [passage])).rejects.toMatchObject({ failure: 'unsupported-capability' });
        expect(provider.structured).not.toHaveBeenCalled();
        const demoResponse = model({ structured: vi.fn(async () => ({ value: answer, providerLabel: 'Demo', mock: true })) });
        await expect(new ModelEvidenceReasoner(async () => demoResponse).reason('Claim', [passage])).rejects.toMatchObject({ failure: 'unsupported-capability' });
    });
    it('rejects duplicate identifiers and oversized aggregate input before contacting a model', async () => {
        const create = vi.fn(async () => model());
        const reasoner = new ModelEvidenceReasoner(create);
        await expect(reasoner.reason('Claim', [passage, passage])).rejects.toMatchObject({ failure: 'invalid-configuration' });
        await expect(reasoner.reason('Claim', [1, 2, 3].map(n => ({ ...passage, id: String(n), text: 'x'.repeat(2500) })))).rejects.toMatchObject({ failure: 'invalid-configuration' });
        expect(create).not.toHaveBeenCalled();
    });
    it('preserves provider authentication failures without converting them to search errors', async () => {
        const error = new ThinkingError('authentication-failed');
        const provider = model({ structured: vi.fn(async () => { throw error; }) });
        await expect(new ModelEvidenceReasoner(async () => provider).reason('Claim', [passage])).rejects.toBe(error);
        expect(provider.structured).toHaveBeenCalledTimes(1);
    });
    it('cancels before provider access and rejects late successful output after cancellation', async () => {
        const abort = new AbortController(); abort.abort();
        const create = vi.fn(async () => model());
        await expect(new ModelEvidenceReasoner(create).reason('Claim', [passage], abort.signal)).rejects.toBe(abort.signal.reason);
        expect(create).not.toHaveBeenCalled();
        const pending = new AbortController();
        let finish!: (value: StructuredResponse) => void;
        const provider = model({ structured: vi.fn(() => new Promise<StructuredResponse>(resolve => { finish = resolve; })) });
        const result = new ModelEvidenceReasoner(async () => provider).reason('Claim', [passage], pending.signal);
        await vi.waitFor(() => expect(provider.structured).toHaveBeenCalledOnce());
        pending.abort('timeout'); finish({ value: answer, providerLabel: 'Fixture', mock: false });
        await expect(result).rejects.toBe('timeout');
    });
});
