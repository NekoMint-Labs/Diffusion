import { z } from 'zod';
import { CORE_CONTRACT, type AIResponse, type ContextPacket, type UserIntent } from '../core/semantics.ts';
import type { AIProvider } from './contracts.ts';
import { ThinkingError } from './errors.ts';
import { parseSemantics, semanticInstructions } from './prompt.ts';
import { isCompactReading, COMPACT_READING_LIMIT, type FocusReadingResult } from './readingFocus.ts';

const envelope = z.object({ intents: z.array(z.record(z.unknown())).max(5) }).strict();
const readingSchema = z.object({ point: z.string().trim().min(1)
    .refine(text => Array.from(text).length <= COMPACT_READING_LIMIT) }).strict();
const readableTypes = new Set(['respond_in_field', 'surface_possibility']);
const trialActions = new Set(['ask', 'continue', 'angle', 'diffuse']);

/** Trial-only generation strategy. The extra field never enters Core or persistence.
 * The normal semantic policy and runtime gates still decide which candidates may surface. */
export async function respondWithReading(provider: AIProvider, packet: ContextPacket, intent: UserIntent, signal: AbortSignal) {
    signal.throwIfAborted();
    const readings = new Map<string, FocusReadingResult>();
    if (provider.mock || packet.thread || !trialActions.has(intent.kind))
        return { response: await provider.respond(packet, intent, signal), readings };
    const instructions = CORE_CONTRACT + '\n' + semanticInstructions(intent, packet.maxCandidates)
        + `\nReading-trial extension: the semantic shapes above still apply, with ONE optional display field: reading: {"point":"one complete card key point"} on respond_in_field or surface_possibility only. Keep text as the complete original answer. For text of at most ${COMPACT_READING_LIMIT} Unicode characters, omit reading: the card shows the complete text. For longer text, also return reading.point, at most ${COMPACT_READING_LIMIT} Unicode characters, significantly shorter than text. Incorporate every premise, negation and uncertainty essential to its meaning in this one sentence. Do not append a separate conditions list. If a faithful short point cannot be given, omit reading. Never shorten requested code, exact quotations or a document in text to meet the card budget. This display field grants no permission to mutate a Field. Return {"intents":[...]} as JSON only.`;
    const raw = await provider.structured({ purpose: 'field-answer', instructions,
        input: { intent, context: { ...packet, contract: CORE_CONTRACT } } }, signal);
    signal.throwIfAborted();
    if (raw.mock) throw new ThinkingError('semantic-validation-failure', provider.label);
    const parsed = envelope.safeParse(raw.value);
    if (!parsed.success) throw new ThinkingError('semantic-validation-failure', provider.label);
    const modelLabel = raw.model?.requested ? raw.model.effective && raw.model.effective !== raw.model.requested
        ? `${raw.model.requested} → ${raw.model.effective}` : raw.model.requested : '';
    const label = (raw.providerLabel || provider.label) + (modelLabel ? ' / ' + modelLabel : '');
    const semantics = parsed.data.intents.map(({ reading: _reading, ...semantic }) => semantic);
    const intents = parseSemantics({ intents: semantics }, intent.kind);
    parsed.data.intents.forEach((item, index) => {
        const candidate = intents[index];
        if (!readableTypes.has(candidate.type) || !('text' in candidate) || isCompactReading(candidate.text)) return;
        const reading = readingSchema.safeParse(item.reading);
        // A missing/invalid display field preserves the answer. Never make a repair request.
        if (!reading.success) return;
        readings.set(candidate.text, { focus: { point: reading.data.point, conditions: [], highlights: [] },
            provider: label, mock: false });
    });
    const response: AIResponse = { intents, mock: false, providerLabel: raw.providerLabel || provider.label,
        ...(raw.model ? { model: raw.model } : {}) };
    return { response, readings };
}
