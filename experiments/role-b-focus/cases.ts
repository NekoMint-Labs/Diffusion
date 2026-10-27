import { createProject, makeThought } from '../../src/core/model.ts';
export const QUESTION = '我想做一个面向大学生的 AI 学习工具，但不知道应该先验证什么。请先帮我找出最值得验证的一个问题，不要直接给完整开发方案。';
export const CONDITION = '补充条件：我每周只能投入四小时，而且必须先做一个小范围验证；暂时不开发完整产品。';
export const FOREIGN = '我正在研究稀疏视角三维重建，想判断生成的修复图是否有帮助。';
export function makeCases() {
    const base = createProject('role-b-fixture', 'Authored offline fixture, not user storage', 1);
    for (const [id, text] of [['question', QUESTION], ['condition', CONDITION], ['foreign', FOREIGN]])
        base.thoughts[id] = makeThought(text, { x: 0, y: 0 }, 1, id);
    base.thoughts.condition.derivedFrom = ['question'];
    const linked = structuredClone(base);
    linked.thoughts.question.derivedFrom = ['foreign'];
    const tail = structuredClone(base);
    tail.thoughts.question.text = '背景说明。'.repeat(330) + QUESTION + CONDITION;
    return {
        original: { project: base, selection: ['question'] },
        constrained: { project: base, selection: ['question', 'condition'] },
        'constraint-only': { project: base, selection: ['condition'] },
        'linked-background': { project: linked, selection: ['question', 'condition'] },
        'tail-constraint': { project: tail, selection: ['question'] },
    };
}
/** Human-authored proposal for presentation tests. Never call this a model answer. */
export const AUTHORED_FOCUS = {
    decision: 'offer',
    point: '在每周四小时、先做小范围验证的限制下，先问：一名学生是否愿意把一次真实作业交给你试着辅助？',
    conditions: ['这是需求验证的候选切口；不愿提供作业也可能源于隐私顾虑，不能直接判定没有需求。'],
    detail: '先围绕一次真实作业观察对方是否愿意参与；暂时不用开发完整产品。得到反应后，再区分需求不足、隐私顾虑与参与成本。这个例子由开发者编写，用来试验呈现方式，并非本轮模型生成结果。',
    consideredSelectionIds: ['question', 'condition'],
    basis: [{ thoughtId: 'condition', quote: '我每周只能投入四小时' }, { thoughtId: 'question', quote: '请先帮我找出最值得验证的一个问题' }],
};
