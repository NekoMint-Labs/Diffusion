import type { AIProtocol, JSONMode } from './provider.ts';
export interface GatewaySettings {
    host: string;
    port: number;
    origins: string[];
    token: string;
    aiBase: string;
    aiModel: string;
    aiModels: string[];
    aiAllowModelOverride: boolean;
    aiKey: string;
    aiProtocol?: AIProtocol;
    aiJSONMode?: JSONMode;
    searchBase: string;
    searchKey: string;
}
export function operatorURL(value: string): string {
    if (!value)
        return '';
    const url = new URL(value);
    if (url.username || url.password || url.search || url.hash)
        throw new Error('Provider base URLs must not contain credentials, queries, or fragments.');
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)))
        throw new Error('Use HTTPS for remote providers (HTTP is allowed on loopback only).');
    return url.href.replace(/\/$/, '');
}
export function loadConfig(env: Record<string, string | undefined>): GatewaySettings {
    const host = env.HOST || '127.0.0.1', token = env.GATEWAY_TOKEN || '';
    const port = Number(env.PORT || 8787);
    if (!Number.isInteger(port) || port < 1 || port > 65535)
        throw new Error('PORT must be an integer between 1 and 65535.');
    if (!['127.0.0.1', 'localhost', '::1'].includes(host) && token.length < 24)
        throw new Error('Non-loopback binding requires a GATEWAY_TOKEN of at least 24 characters. Terminate HTTPS at a trusted reverse proxy.');
    const origins = (env.ALLOWED_ORIGIN || 'http://127.0.0.1:40000').split(',').map(s => s.trim()).filter(Boolean);
    if (origins.includes('*') || origins.includes('null'))
        throw new Error('Use exact trusted origins; wildcard/null origins are not allowed.');
    const aiProtocol = env.AI_PROTOCOL || 'chat-completions', aiJSONMode = env.AI_JSON_MODE || 'json-object';
    if (aiProtocol !== 'chat-completions' && aiProtocol !== 'responses') throw new Error('AI_PROTOCOL must be chat-completions or responses.');
    if (aiJSONMode !== 'json-object' && aiJSONMode !== 'none') throw new Error('AI_JSON_MODE must be json-object or none.');
    const aiModels = (env.AI_MODELS || '').split(',').map(model => model.trim()).filter(Boolean);
    if (aiModels.some(model => model.length > 200)) throw new Error('Each AI_MODELS entry must be at most 200 characters.');
    const aiAllowModelOverride = ['1', 'true'].includes(env.AI_ALLOW_MODEL_OVERRIDE || '');
    return { host, port, token, origins, aiProtocol, aiJSONMode, aiBase: operatorURL(env.AI_BASE_URL || 'https://api.openai.com/v1'), aiModel: env.AI_MODEL || '', aiModels, aiAllowModelOverride, aiKey: env.AI_API_KEY || '', searchBase: operatorURL(env.SEARCH_BASE_URL || ''), searchKey: env.SEARCH_API_KEY || '' };
}
export { boundedJSON } from '../src/shared/http.ts';
