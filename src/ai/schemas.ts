import { z } from 'zod';
const key = z.string().min(1).max(200);
const text = z.string().min(1).max(20000);
const relationKind = z.enum(['resonance', 'tension', 'gap', 'support', 'bridge']);
const structureRelation = z.object({ a: key, b: key, kind: relationKind, label: z.string().min(1).max(80), explanation: z.string().min(1).max(320).optional() }).strict();
export const semanticIntentSchema = z.discriminatedUnion('type', [
    z.object({ type: z.literal('respond_in_field'), text }).strict(),
    z.object({ type: z.literal('surface_possibility'), text, sourceId: key.optional() }).strict(),
    z.object({ type: z.literal('surface_question'), text }).strict(),
    z.object({ type: z.literal('surface_relation'), a: key, b: key, kind: relationKind, label: z.string().min(1).max(80), explanation: z.string().min(1).max(320).optional(), sourceId: key.optional() }).strict(),
    z.object({ type: z.literal('surface_structure'), groups: z.array(z.object({ label: z.string().min(1).max(80), thoughtIds: z.array(key).min(1).max(12) }).strict()).max(6), relations: z.array(structureRelation).max(6), note: z.string().min(1).max(500).optional() }).strict(),
    z.object({ type: z.literal('request_recall'), thoughtId: key }).strict(),
    z.object({ type: z.literal('request_thread'), text }).strict(),
    z.object({ type: z.literal('request_deep_dive'), text }).strict(),
    z.object({ type: z.literal('request_crystal_preview'), text }).strict(),
    z.object({ type: z.literal('surface_evidence'), sourceId: key, outcome: z.enum(['support', 'challenge', 'partial', 'prior-art', 'inconclusive', 'conflicting']), text }).strict(),
]);
export const responseSchema = z.object({ intents: z.array(semanticIntentSchema).max(8), providerLabel: z.string().max(200), mock: z.boolean() }).strict();
const thought = z.object({ id: key, text: z.string().max(1600), kind: z.enum(['thought', 'crystal', 'source']) }).strict();
const capsule = z.object({ goal: z.string().max(800), confirmed: z.array(z.string().max(500)).max(8), tentative: z.array(z.string().max(500)).max(8), openQuestions: z.array(z.string().max(500)).max(4), sources: z.array(key).max(24), rebuiltAt: z.number() }).strict();
export const packetSchema = z.object({ contract: z.string().max(2000), projectId: key, scopeMode: z.enum(['selection', 'field']), scope: z.array(thought).max(24), local: z.array(thought).max(12),
    relations: z.array(z.object({ a: key, b: key, kind: relationKind, label: z.string().max(300) }).strict()).max(16),
    thread: z.object({ id: key, capsule: capsule.optional(), recent: z.array(z.object({ role: z.enum(['user', 'assistant']), text: z.string().max(1600) }).strict()).max(6) }).strict().optional(),
    retrieved: z.object({ thoughts: z.array(thought).max(4), sources: z.array(z.object({ id: key, title: z.string().max(1000), excerpt: z.string().max(2500), inspected: z.string().max(1000), url: z.string().url().optional() }).strict()).max(4) }).strict(),
    permissions: z.object({ web: z.boolean(), projectSources: z.boolean() }).strict(), tools: z.array(z.string().max(100)).max(10), maxCandidates: z.number().int().min(1).max(5)
}).strict();
export const userIntentSchema = z.object({ kind: z.enum(['ask', 'probe', 'thread', 'deep', 'crystal', 'diffuse', 'continue', 'angle', 'question', 'organize']), text: z.string().min(1).max(12000), requestId: key }).strict();
export const thinkingDepthSchema = z.enum(['auto', 'light', 'standard', 'deep']);
export const requestSchema = z.object({ packet: packetSchema, intent: userIntentSchema, model: z.string().min(1).max(200).optional(), depth: thinkingDepthSchema.optional() }).strict();
/** Strict parse of the gateway's honest self-report. Used by the client provider, not the server. */
export const capabilitiesSchema = z.object({
    configured: z.boolean(), defaultModel: z.string().max(200).nullable(), models: z.array(z.string().min(1).max(200)).max(1000),
    allowModelOverride: z.boolean(),
    depth: z.object({ supported: z.boolean(), mode: z.enum(['output-budget', 'none']), levels: z.array(thinkingDepthSchema).max(8) }).strict(),
}).strict();

const structuredPurpose = z.enum(['thought-extraction', 'thought-extraction-recheck', 'relation-inference', 'ingestion-repair']);
export const structuredRequestSchema = z.object({
    purpose: structuredPurpose,
    instructions: z.string().min(1).max(16000),
    input: z.unknown(),
    model: z.string().min(1).max(200).optional(),
    depth: thinkingDepthSchema.optional(),
}).strict();
export const structuredResponseSchema = z.object({
    value: z.unknown(),
    providerLabel: z.string().max(200),
    mock: z.boolean(),
    model: z.object({ requested: z.string().max(200), effective: z.string().max(200).nullable() }).strict().optional(),
}).strict();
