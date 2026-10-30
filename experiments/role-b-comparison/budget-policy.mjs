import crypto from 'node:crypto';
export const BUDGET_ARMS = Object.freeze([
    { id: 'high-1600', maxTokens: 1600, thinking: 'enabled', effort: 'high' },
    { id: 'high-4000', maxTokens: 4000, thinking: 'enabled', effort: 'high' },
    { id: 'low-1600', maxTokens: 1600, thinking: 'enabled', effort: 'low' },
    { id: 'off-1600', maxTokens: 1600, thinking: 'disabled', effort: null },
].map(Object.freeze));
export const BUDGET_CASES = Object.freeze(['ask', 'continue']);
export const MAX_BUDGET_REQUESTS = 8;
export const TOTAL_OUTPUT_CAP = 17600;
export function budgetRequest(body, armId) {
    const arm = BUDGET_ARMS.find(a => a.id === armId);
    if (!arm) throw new Error('Unknown budget arm');
    if (body.model !== 'deepseek-v4-pro' || body.max_tokens !== 1600 || body.stream !== false || body.thinking !== undefined || body.reasoning_effort !== undefined) throw new Error('Expected frozen V4 Pro / Standard request before intervention');
    return { ...body, max_tokens: arm.maxTokens, thinking: { type: arm.thinking }, ...(arm.effort ? { reasoning_effort: arm.effort } : {}) };
}
export function promptFingerprint(body) {
    const copy = structuredClone(body);
    delete copy.max_tokens; delete copy.thinking; delete copy.reasoning_effort;
    copy.messages = copy.messages.map(message => {
        if (message.role !== 'user') return message;
        const input = JSON.parse(message.content);
        if (input.intent?.requestId) input.intent.requestId = '<request-id>';
        return { ...message, content: JSON.stringify(input) };
    });
    return crypto.createHash('sha256').update(JSON.stringify(copy)).digest('hex');
}
export function budgetSchedule() {
    return BUDGET_CASES.flatMap((scenario, index) => (index ? [...BUDGET_ARMS].reverse() : BUDGET_ARMS).map(arm => ({ scenario, arm })));
}
export function assertRequestLimit(currentCount, caseCount) {
    if (currentCount >= MAX_BUDGET_REQUESTS || caseCount >= 1) throw new Error('Budget experiment request ceiling reached; no retries');
}
