import type { ContextPacket } from '../core/semantics.ts';

/** Lexical only: preserve technical operators; this does not detect semantic paraphrase. */
function wording(text: string): string {
    return text.normalize('NFKC').toLowerCase().replace(/\s+/gu, ' ').trim().replace(/[.!?。！？]+$/u, '');
}
export function repeatedWording(text: string, previous: readonly string[]): boolean {
    const value = wording(text);
    return !value || previous.some(item => wording(item) === value);
}

/** Session-only rejection history. Never send rejected wording back to the model as context or
 * instructions: the old negative prompt made those suggestions available as fresh premises. */
export class SuggestionHistory {
    private scope = '';
    private texts: string[] = [];
    forContext(packet: ContextPacket): readonly string[] {
        const scope = JSON.stringify([packet.projectId, packet.scope, packet.local, packet.continuations, packet.relations, packet.retrieved, packet.permissions]);
        if (scope !== this.scope) { this.scope = scope; this.texts = []; }
        return this.texts;
    }
    remember(text: string): void { this.texts = [...this.texts, text].slice(-6); }
    clear(): void { this.scope = ''; this.texts = []; }
}

/** The run supplies a frame and budget, not past model output. Exclusions remain in the local
 * validation path; an empty/repeated step ends without replacement calls. */
export function explorationPrompt(prompt: string, step: number, contract: string): string {
    return `${prompt}

Step ${step + 1}: ${contract}
Return at most one concise surface_possibility, or no intents if no useful new direction is available.
Use the owned scope and permitted background. An already stated caveat or wording variant is not new thinking material.`;
}
