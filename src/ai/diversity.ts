import type { ContextPacket } from '../core/semantics.ts';

/** Lexical only: preserve technical operators; this does not detect semantic paraphrase. */
function wording(text: string): string {
    return text.normalize('NFKC').toLowerCase().replace(/\s+/gu, ' ').trim().replace(/[.!?。！？]+$/u, '');
}
export function repeatedWording(text: string, previous: readonly string[]): boolean {
    const value = wording(text);
    return !value || previous.some(item => wording(item) === value);
}

export function suggestionContext(packet: ContextPacket): string {
    return JSON.stringify([packet.projectId, packet.scope, packet.local, packet.continuations, packet.relations, packet.retrieved, packet.permissions]);
}

const questionFocuses = [
    'Focus on one missing definition or distinction, only if the supplied wording leaves it unresolved. Do not ask to define an already explained term.',
    'Focus on one missing observation that could change the judgment. Do not assume a measurement or result exists.',
    'Focus on one unstated assumption behind the selected reasoning, without asserting that it is false.',
    'Focus on one boundary where the selected idea might stop applying. Keep that boundary conditional.',
    'Focus on one criterion for choosing between options actually supplied in the selection. Do not manufacture a choice.',
];

/** Session-only rejection history. Never send rejected wording back to the model as context or
 * instructions: the old negative prompt made those suggestions available as fresh premises. */
export class SuggestionHistory {
    private scope = '';
    private texts: string[] = [];
    private questionIndex = 0;
    forContext(packet: ContextPacket): readonly string[] {
        const scope = suggestionContext(packet);
        if (scope !== this.scope) { this.scope = scope; this.texts = []; this.questionIndex = 0; }
        return this.texts;
    }
    remember(text: string): void { this.texts = [...this.texts, text].slice(-6); }
    nextQuestionFocus(count: number, availableCharacters: number): string {
        const focuses = questionFocuses.slice(this.questionIndex, this.questionIndex + count);
        const guidance = focuses.length
            ? `For this request, use only the following question focuses, at most one question per focus. Skip a focus if it is already resolved or does not apply. Return fewer questions or an empty intents array rather than filling the requested count.\n${focuses.join('\n')}`
            : 'Earlier requests have already been guided toward definitions, observations, assumptions, boundaries and choice criteria. This does not prove those unknowns were covered or that the topic is exhausted. Do not restart those focuses just to fill the requested count. Return only a genuinely different grounded unknown outside those focuses, or an empty intents array if none is available.';
        // Record attempted guidance only when it fits; never truncate the authored prompt.
        if (guidance.length > availableCharacters) return '';
        this.questionIndex += focuses.length;
        return guidance;
    }
    clear(): void { this.scope = ''; this.texts = []; this.questionIndex = 0; }
}

/** The run supplies a frame and budget, not past model output. Exclusions remain in the local
 * validation path; an empty/repeated step ends without replacement calls. */
export function explorationPrompt(prompt: string, step: number, contract: string): string {
    return `${prompt}

Step ${step + 1}: ${contract}
Return at most one concise surface_possibility, or no intents if no useful new direction is available.
Use the owned scope and permitted background. An already stated caveat or wording variant is not new thinking material.`;
}
