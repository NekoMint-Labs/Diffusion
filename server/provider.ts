/** Pure wire boundary. Transport and semantic validation live in the gateway, not here. */
import { DEPTH_OUTPUT_BUDGET, type ThinkingDepth } from '../src/ai/contracts.ts';
export type AIProtocol = 'chat-completions' | 'responses';
export type JSONMode = 'json-object' | 'none';
export interface ModelRequestConfig { aiModel: string; aiProtocol?: AIProtocol; aiJSONMode?: JSONMode }
export interface ModelRequestOptions { model?: string; depth?: ThinkingDepth }
export class ProviderOutputError extends Error {
    readonly code: 'invalid-output' | 'incomplete-output' | 'refusal';
    constructor(code: 'invalid-output' | 'incomplete-output' | 'refusal') { super(code); this.name = 'ProviderOutputError'; this.code = code; }
}
function record(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ProviderOutputError('invalid-output');
    return value as Record<string, unknown>;
}
export function modelRequest(config: ModelRequestConfig, instructions: string, data: unknown, options: ModelRequestOptions = {}): { path: string; body: Record<string, unknown> } {
    const input = JSON.stringify(data);
    const json = config.aiJSONMode !== 'none';
    const model = options.model || config.aiModel;
    // `auto` maps to null, so no override is emitted at all. The budget itself is the provider's
    // own wire parameter, and the two protocols do not spell it the same way: `/responses` caps
    // output with `max_output_tokens`, chat completions with `max_tokens`. Emitting the wrong name
    // would be a silent no-op at best and a 400 at worst, so the mapping lives here and nowhere else.
    const budget = options.depth ? DEPTH_OUTPUT_BUDGET[options.depth] : null;
    if (config.aiProtocol === 'responses') return { path: '/responses', body: {
        model, stream: false, store: false, instructions,
        input: [{ role: 'user', content: input }], ...(json ? { text: { format: { type: 'json_object' } } } : {}),
        ...(budget ? { max_output_tokens: budget } : {}),
    } };
    return { path: '/chat/completions', body: {
        model, stream: false,
        messages: [{ role: 'system', content: instructions }, { role: 'user', content: input }],
        ...(json ? { response_format: { type: 'json_object' } } : {}),
        ...(budget ? { max_tokens: budget } : {}),
    } };
}
export function modelJSON(protocol: AIProtocol | undefined, envelope: unknown): unknown {
    const root = record(envelope);
    let output = '';
    if (protocol === 'responses') {
        if (root.status && root.status !== 'completed') throw new ProviderOutputError('incomplete-output');
        if (!Array.isArray(root.output)) throw new ProviderOutputError('invalid-output');
        for (const item of root.output.slice(0, 32)) {
            const message = record(item);
            if (message.type !== 'message') continue; // Reasoning/tool metadata is never executable intent.
            if (message.status && message.status !== 'completed') throw new ProviderOutputError('incomplete-output');
            if (!Array.isArray(message.content)) throw new ProviderOutputError('invalid-output');
            for (const value of message.content.slice(0, 32)) {
                const part = record(value);
                if (part.type === 'refusal') throw new ProviderOutputError('refusal');
                if (part.type === 'output_text' && typeof part.text === 'string') output += part.text;
            }
        }
    } else {
        if (!Array.isArray(root.choices) || !root.choices.length) throw new ProviderOutputError('invalid-output');
        const choice = record(root.choices[0]);
        if (choice.finish_reason && choice.finish_reason !== 'stop') throw new ProviderOutputError('incomplete-output');
        const message = record(choice.message);
        if (message.refusal) throw new ProviderOutputError('refusal');
        if (typeof message.content !== 'string') throw new ProviderOutputError('invalid-output');
        output = message.content;
    }
    if (!output.trim() || output.length > 100000) throw new ProviderOutputError('invalid-output');
    try { return JSON.parse(output); } catch { throw new ProviderOutputError('invalid-output'); }
}
