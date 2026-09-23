import { describe, it, expect } from 'vitest';
import { demoProject, performanceProject } from '../../src/core/demo.ts';
import { compileContext } from '../../src/ai/context.ts';
import { packetSchema, responseSchema, requestSchema } from '../../src/ai/schemas.ts';
import { evidenceCandidateSchema } from '../../src/evidence/schemas.ts';
import { validateProject } from '../../src/core/validation.ts';
describe('typed provider contracts against real Zod', () => {
    it('accepts the compiler output, including a large bounded field', () => {
        expect(packetSchema.parse(compileContext(demoProject(), [])).scope.length).toBe(6);
        expect(packetSchema.parse(compileContext(performanceProject(5000), [])).scope).toHaveLength(24);
    });
    it('accepts a Thread capsule generated from canonical transcript', () => {
        const p = demoProject();
        p.threads.th = { id: 'th', title: 'Attention', scopeIds: ['attention'], messages: [{ id: 'm', role: 'user', text: 'What remains open?', at: 1 }], createdAt: 1 };
        expect(packetSchema.parse(compileContext(p, [], { threadId: 'th' })).thread?.id).toBe('th');
    });
    it('does not permit UI code, geometry, or mutations in a semantic response', () => {
        for (const intent of [{ type: 'move', id: 'attention', x: 10, y: 20 }, { type: 'surface_possibility', text: 'A thought', x: 20 }, { type: 'crystal.form', id: 'attention', text: 'Claim' }]) {
            expect(responseSchema.safeParse({ intents: [intent], providerLabel: 'test', mock: false }).success).toBe(false);
        }
    });
    it('requires bounded semantic response fields', () => {
        expect(responseSchema.parse({ intents: [{ type: 'surface_possibility', text: 'What might be missing?' }], providerLabel: 'Test provider', mock: false }).intents).toHaveLength(1);
        expect(responseSchema.safeParse({ intents: [{ type: 'respond_in_field', text: 'x'.repeat(20001) }], providerLabel: 'test', mock: false }).success).toBe(false);
    });
    it('does not treat an outcome label as objective verification', () => {
        const base = { id: 's', title: 'An outside source', url: 'https://example.org/source', excerpt: 'A snippet', inspected: 'Search excerpt only' };
        expect(evidenceCandidateSchema.parse({ ...base, outcome: 'inconclusive' }).outcome).toBeUndefined();
        expect(evidenceCandidateSchema.safeParse({ ...base, outcome: 'verified' }).success).toBe(false);
        expect(evidenceCandidateSchema.safeParse({ ...base, outcome: 'support', url: 'javascript:alert(1)' }).success).toBe(false);
    });
    it('round-trips the complete request independently from the domain project', () => {
        const p = demoProject();
        expect(validateProject(p)).toBe(p);
        const request = { packet: compileContext(p, ['attention']), intent: { kind: 'ask', text: 'What is unresolved?', requestId: 'request-1' } };
        expect(requestSchema.parse(JSON.parse(JSON.stringify(request))).packet.scope).toHaveLength(1);
    });
});
