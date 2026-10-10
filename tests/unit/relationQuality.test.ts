import { describe, expect, it } from 'vitest';
import { relationWordingAllowed, semanticInstructions } from '../../src/ai/prompt.ts';
import { omitRepeatedRelations } from '../../src/ai/relationQuality.ts';
import { createProject, emptySession } from '../../src/core/model.ts';
import type { SemanticIntent } from '../../src/core/semantics.ts';

const relation = { a: 'a', b: 'b', kind: 'gap' as const, label: '指标定义待明确', explanation: '一个想法提出位置偏差指标，另一个追问它比较的对象。' };
describe('relation and structure wording', () => {
    it.each(['只给出一个候选', '最多返回2条关系', 'Return only one relation', 'surface_relation', 'existing thought ID'])('rejects generation instructions: %s', label => {
        expect(relationWordingAllowed(label)).toBe(false);
        expect(relationWordingAllowed('指标定义待明确', label)).toBe(false);
    });
    it('allows concrete question roles without classifying their scientific truth', () => {
        expect(relationWordingAllowed('提出判读疑问', '一个提出指标，另一个询问设备或支撑微移是否影响判读。')).toBe(true);
        expect(relationWordingAllowed('只验证一个指标', '两个想法分别讨论成本和验证顺序。')).toBe(true);
    });
    it('omits exact reversed-endpoint duplicates but preserves genuinely different wording', () => {
        const project = createProject('p', 'p');
        project.relations.r = { ...relation, id: 'r', status: 'confirmed', createdAt: 1 };
        expect(omitRepeatedRelations({ type: 'surface_relation', ...relation, a: 'b', b: 'a' }, project, emptySession(), relationWordingAllowed)).toBeNull();
        expect(omitRepeatedRelations({ type: 'surface_relation', ...relation, label: '提出判读疑问' }, project, emptySession(), relationWordingAllowed)).not.toBeNull();
    });
    it('filters bad and repeated relations without losing groups or unresolved questions', () => {
        const candidate: SemanticIntent = { type: 'surface_structure', groups: [{ label: '指标及待确认条件', thoughtIds: ['a', 'b'] }], relations: [relation, { ...relation, a: 'b', b: 'a' }, { ...relation, label: '只给出一个候选' }], note: '如何区分设备微移和区域不可靠，仍待确认。' };
        expect(omitRepeatedRelations(candidate, createProject('p', 'p'), emptySession(), relationWordingAllowed)).toEqual({ ...candidate, relations: [relation] });
    });
    it('does not hide invalid endpoints before the permission gate', () => {
        const candidate: SemanticIntent = { type: 'surface_structure', groups: [], relations: [{ ...relation, b: 'missing' }] };
        expect(omitRepeatedRelations(candidate, createProject('p', 'p'), emptySession(), relationWordingAllowed)).toEqual(candidate);
    });
    it('leaves non-relation actions unchanged', () => {
        const candidate: SemanticIntent = { type: 'surface_question', text: '这个指标包含哪些变化？' };
        expect(omitRepeatedRelations(candidate, createProject('p', 'p'), emptySession(), relationWordingAllowed)).toBe(candidate);
    });
    // Prompt assertions guard the contract; they do not constitute live semantic acceptance.
    it.each(['probe', 'organize'] as const)('requests endpoint explanations and preserves questions for %s', kind => {
        const text = semanticInstructions({ kind, text: 'fixture', requestId: 'r' }, 1);
        expect(text).toContain('provide one plain explanation naming the contribution of both thoughts');
        expect(text).toContain('Never turn a question into an asserted causal mechanism');
        expect(text).toContain('complementary ideas');
    });
});
