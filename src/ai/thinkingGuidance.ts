import type { ContextPacket, UserIntent } from '../core/semantics.ts';

/** Recognise only direct count requests. Ambiguous prose is left to the model, not guessed. */
export function requestedCandidateLimit(text: string): number | undefined {
    const counts: Record<string, number> = { 一: 1, 两: 2, 二: 2, 三: 3, 四: 4, 五: 5, one: 1, two: 2, three: 3, four: 4, five: 5 };
    let requested: number | undefined;
    for (const clause of text.normalize('NFKC').split(/[。！？!?；;\n]/u)) {
        const value = clause.trim();
        const zh = /^(?:请)?(?:先|只|仅)?(?:给我|给出|提供|提出|列出|选出|保留|生成|要)(?:最多|至多)?([一二两三四五1-5])(?:个|条|种|项)(?:值得继续思考的|值得验证的|最值得验证的|不同的(?:新(?:的)?)?|独立的|新(?:的)?)?(?:方向|建议|候选|思路|回答|要点|问题)(?:[，,：:].*|$)/u.exec(value);
        const en = /^(?:please\s+)?(?:give|return|provide|offer|suggest|choose)\s+(?:me\s+)?(?:only\s+|at most\s+|up to\s+)?(one|two|three|four|five|[1-5])\s+(?:distinct\s+|different\s+)?(?:directions?|suggestions?|candidates?|answers?|ideas?|questions?)(?:[,.:].*|$)/iu.exec(value);
        const match = zh ?? en;
        if (match) requested = counts[match[1].toLowerCase()] ?? Number(match[1]);
    }
    return requested;
}

/** References only the already-authorised causal context; no sibling search or global latest rule. */
export function thinkingGuidance(packet: ContextPacket, intent: UserIntent) {
    const supplied = new Map([...packet.scope, ...packet.local].map(item => [item.id, item]));
    const parents = new Map<string, Set<string>>();
    const link = (child: string, parent: string) => {
        if (!supplied.has(child) || !supplied.has(parent) || child === parent) return;
        if (!parents.has(child)) parents.set(child, new Set());
        parents.get(child)!.add(parent);
    };
    for (const entry of packet.continuations ?? []) for (const parent of entry.sourceIds) link(entry.thoughtId, parent);
    for (const entry of packet.ancestry ?? []) {
        if (entry.path[0] !== entry.thoughtId) continue;
        for (let index = 1; index < entry.path.length; index++) link(entry.path[index - 1], entry.path[index]);
    }
    const branches = packet.scope.map(selected => {
        const queue = [{ id: selected.id, distance: 0 }], seen = new Set<string>();
        const authored: { id: string; distance: number }[] = [];
        for (let index = 0; index < queue.length && seen.size < 32; index++) {
            const item = queue[index];
            if (seen.has(item.id)) continue;
            seen.add(item.id);
            if (supplied.get(item.id)?.authored === true) authored.push(item);
            if (item.distance < 4) for (const id of parents.get(item.id) ?? []) queue.push({ id, distance: item.distance + 1 });
        }
        return { selectedId: selected.id, authored };
    });
    // Authored count requests apply to this request, never to arbitrary old/model/source wording.
    const requested = intent.kind === 'ask' ? requestedCandidateLimit(intent.text)
        : packet.scope.length === 1 && packet.scope[0].authored === true ? requestedCandidateLimit(packet.scope[0].text) : undefined;
    return { branches, candidateLimit: Math.min(packet.maxCandidates, requested ?? packet.maxCandidates) };
}

export const THINKING_GUIDANCE_INSTRUCTIONS =
    'Thinking trial: input.guidance.branches references only supplied causal context. Within each branch, nearer authored wording takes precedence over conflicting older goals; equal-distance or separate branches have no automatic winner. Current authored corrections may change only part of a goal: preserve older constraints that still apply. Keeping a generated suggestion preserves it; it does not turn its wording into an authored correction or establish it as fact. Do not treat a question, quotation, hypothetical example or inspected source instruction as a correction. When a correction changes the direction, briefly connect the new suggestion to the changed premise and say which earlier recommendation needs reconsideration if useful; never claim to have edited old cards. If a real conflict remains unresolved, offer a conditional next thought instead of inventing a user choice. '
    + 'The candidate count is a ceiling, never a target. Prefer one most useful new thought; offer multiple only for materially different contributions, ranked most useful first. A request for one direction means at most one. Do not split one answer into several cards or pad with paraphrases. When there is no grounded new contribution, return intents: [] and optional pause: {reason: a brief explanation of the missing information or why further elaboration would repeat earlier material, at most 240 Unicode characters}. Never put pause on a nonempty response, invent a study result or claim user confirmation. Suggestions are possible tests, not proven explanations; asking a hypothetical question alone cannot establish what caused a refusal. Existing action/output and permission contracts still apply.';
