import { z } from 'zod';
import type { AIProvider, StructuredResponse } from './contracts.ts';
import type { InputRange } from '../core/model.ts';
import { completeStructuredTask } from './stream.ts';
import { IngestionValidationError, resolveSourceQuotes } from './provenance.ts';
export { IngestionValidationError, resolveSourceQuotes } from './provenance.ts';

const quote = z.string().min(1).max(6000);
const proposalSchema = z.object({
    text: z.string().min(1).max(2000),
    sourceQuotes: z.array(quote).min(1).max(6),
}).strict();
export const decompositionResultSchema = z.object({ units: z.array(proposalSchema).max(10) }).strict();

export interface ThoughtUnitProposal {
    text: string;
    sourceQuotes: string[];
    sourceRanges: InputRange[];
}
export interface ThoughtExtraction {
    units: ThoughtUnitProposal[];
    repaired: boolean;
    rechecked: boolean;
    dropped: number;
    providerLabel: string;
    mock: boolean;
    requests: number;
    promptCharacters: number;
    outputCharacters: number;
}

export const THOUGHT_EXTRACTION_INSTRUCTIONS = `Return JSON only: {"units":[{"text":"...","sourceQuotes":["..."]}]}.

Find independently manipulable thoughts in originalText. A Thought deserves separation when the person could independently agree or disagree with it, change it later, question it, connect it to another idea, or pursue it separately. Split separate preferences, concerns, goals, decisions, possibilities, hypotheses, or questions. Do not split merely because of punctuation, sentence boundaries, length, or noun phrases.

Write each text in plain language the person could have written. Preserve their language and first-person voice. Do not add advice, facts, interpretation, labels, categories, or analyst wording. sourceQuotes must contain exact substrings copied from originalText that ground that Thought. Do not generate IDs or offsets. Normally return 1-6 units, never more than 10.

Example 1
originalText: 我喜欢 HCI，但是担心以后不好找工作，而且我不想以后主要靠写代码工作。
good units: 我喜欢 HCI / 我担心 HCI 以后不好找工作 / 我不想以后主要靠写代码工作

Example 2
originalText: 我喜欢 HCI，因为它把技术、设计和人联系在一起。
good: one Thought.

No markdown. No extra fields.`;

const RECHECK_INSTRUCTIONS = `${THOUGHT_EXTRACTION_INSTRUCTIONS}\n\nRe-check once: the previous extraction returned one unit, but the input may contain independently changeable concerns, preferences, goals, decisions, possibilities, hypotheses, or questions. Split only if those ideas are independently manipulable. Do not mechanically split sentences or clauses.`;
const REPAIR_INSTRUCTIONS = `Repair this structured thought extraction. Return only {"units":[{"text":"...","sourceQuotes":["..."]}]}. Preserve valid grounded units when possible. Every sourceQuotes entry must be an exact substring of originalText. Do not add semantic fields, IDs, offsets, advice, or interpretation.`;

function validateUnits(value: unknown, inputId: string, originalText: string): ThoughtUnitProposal[] {
    const parsed = decompositionResultSchema.safeParse(value);
    if (!parsed.success) throw new IngestionValidationError(`Thought extraction contract failed: ${parsed.error.issues[0]?.message ?? 'invalid output'}`);
    return parsed.data.units.map(unit => ({ ...unit, sourceRanges: resolveSourceQuotes(inputId, originalText, unit.sourceQuotes) }));
}
function salvageUnits(value: unknown, inputId: string, originalText: string): ThoughtUnitProposal[] {
    const root = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
    const raw = Array.isArray(root.units) ? root.units.slice(0, 10) : [];
    const out: ThoughtUnitProposal[] = [];
    for (const candidate of raw) {
        const parsed = proposalSchema.safeParse(candidate);
        if (!parsed.success) continue;
        try { out.push({ ...parsed.data, sourceRanges: resolveSourceQuotes(inputId, originalText, parsed.data.sourceQuotes) }); }
        catch { /* An unsupported proposal is safer to drop than to invent provenance. */ }
    }
    return out;
}

/** Suspicion only: this function never creates a split. It merely permits one model re-check. */
export function looksCompoundInput(text: string): boolean {
    const trimmed = text.trim();
    if (!trimmed) return false;
    const paragraphs = trimmed.split(/\n\s*\n|\n/u).filter(Boolean).length;
    const sentences = trimmed.split(/[。！？!?]+/u).map(value => value.trim()).filter(Boolean).length;
    const markers = trimmed.match(/但是|但我|不过|另一方面|一方面|同时|而且|另外|以及|却|可是|\bbut\b|\bhowever\b|\bwhile\b|\balso\b|\bon the other hand\b/giu)?.length ?? 0;
    return paragraphs > 1 || sentences >= 3 || (markers >= 1 && [...trimmed].length >= 14) || (sentences >= 2 && [...trimmed].length >= 42);
}

async function request(provider: AIProvider, purpose: 'thought-extraction' | 'thought-extraction-recheck' | 'ingestion-repair', instructions: string, input: unknown, signal?: AbortSignal): Promise<StructuredResponse> {
    return completeStructuredTask(provider, { purpose, instructions, input }, signal);
}

/** One narrow model responsibility: authored words -> independently manipulable grounded units.
 * A suspicious single-unit result may be challenged exactly once; the guard never splits locally. */
export async function extractThoughts(provider: AIProvider, originalText: string, inputId: string, signal?: AbortSignal): Promise<ThoughtExtraction> {
    let requests = 0;
    let repaired = false;
    let rechecked = false;
    let dropped = 0;
    requests++;
    let response = await request(provider, 'thought-extraction', THOUGHT_EXTRACTION_INSTRUCTIONS, { originalText }, signal);
    let outputCharacters = JSON.stringify(response.value).length;
    let units: ThoughtUnitProposal[];
    try { units = validateUnits(response.value, inputId, originalText); }
    catch (error) {
        const valid = salvageUnits(response.value, inputId, originalText);
        requests++;
        try {
            const repairedResponse = await request(provider, 'ingestion-repair', REPAIR_INSTRUCTIONS, { originalText, problem: error instanceof Error ? error.message : String(error), validUnits: valid.map(({ sourceRanges: _, ...unit }) => unit), invalidOutput: response.value }, signal);
            outputCharacters += JSON.stringify(repairedResponse.value).length;
            units = validateUnits(repairedResponse.value, inputId, originalText);
            response = repairedResponse;
            repaired = true;
        }
        catch {
            units = valid;
            dropped = Math.max(1, (Array.isArray((response.value as { units?: unknown[] })?.units) ? (response.value as { units: unknown[] }).units.length : 1) - valid.length);
        }
    }
    if (units.length === 1 && looksCompoundInput(originalText)) {
        requests++;
        rechecked = true;
        const second = await request(provider, 'thought-extraction-recheck', RECHECK_INSTRUCTIONS, { originalText, previous: units.map(({ sourceRanges: _, ...unit }) => unit) }, signal);
        outputCharacters += JSON.stringify(second.value).length;
        try {
            const secondUnits = validateUnits(second.value, inputId, originalText);
            if (secondUnits.length) {
                units = secondUnits;
                response = second;
            }
        }
        catch {
            // One bounded challenge only. A bad re-check cannot erase a grounded first result.
        }
    }
    return { units, repaired, rechecked, dropped, providerLabel: response.providerLabel, mock: response.mock, requests, promptCharacters: THOUGHT_EXTRACTION_INSTRUCTIONS.length, outputCharacters };
}
