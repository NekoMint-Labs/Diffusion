#!/usr/bin/env node
/**
 * Opt-in verification against real providers.
 *
 * The contract tests prove Diffusion speaks each provider's protocol correctly against fixtures.
 * They cannot prove a protocol is still the one the provider serves today. This script closes that
 * gap on a machine that has real keys, and it is deliberately NOT part of the test suite:
 *
 *   - it never runs in CI;
 *   - it never requires a secret to be present (a missing key is a SKIP, not a failure);
 *   - it never prints, stores or transmits a key anywhere except the provider's own endpoint;
 *   - it reports CONTRACT VERIFIED and LIVE VERIFIED as different things, because they are.
 *
 * Usage:  OPENAI_API_KEY=... node --experimental-strip-types scripts/smoke-providers.mjs
 *         or:  pnpm run smoke:providers
 */
import { DirectAIProvider } from '../src/ai/direct.ts';
import { DIRECT_PROVIDERS, outputBudget, reasoningEffort } from '../src/ai/providers.ts';
import { classifyFailure, failureText } from '../src/ai/errors.ts';

/** Every provider Diffusion can talk to directly. A provider with no key in the environment is
 * reported as skipped, never as passed: an unverified path must not look verified. */
const CANDIDATES = [
    { id: 'openai', keys: ['OPENAI_API_KEY'] },
    { id: 'anthropic', keys: ['ANTHROPIC_API_KEY'] },
    { id: 'gemini', keys: ['GEMINI_API_KEY', 'GOOGLE_API_KEY'] },
    { id: 'deepseek', keys: ['DEEPSEEK_API_KEY'] },
];
/** A model to try when the environment does not name one. These are only *starting points* for a
 * live check: if discovery reports models, the first one is used instead, so a stale guess here
 * cannot masquerade as a passing result. */
const FALLBACK_MODEL = { openai: 'gpt-4o-mini', anthropic: 'claude-3-5-haiku-latest', gemini: 'gemini-2.0-flash', deepseek: 'deepseek-chat' };

const packet = {
    contract: 'smoke',
    projectId: 'smoke',
    scopeMode: 'selection',
    scope: [{ id: 'smoke-1', text: 'A quiet idea that has not been decided yet.', kind: 'thought' }],
    local: [],
    relations: [],
    retrieved: { thoughts: [], sources: [] },
    permissions: { web: false, projectSources: false },
    tools: [],
    maxCandidates: 1,
};

function keyFor(candidate) {
    for (const name of candidate.keys) if (process.env[name]) return { name, value: process.env[name] };
    return null;
}
/** Never let a secret reach the transcript, even if a provider echoes it back in an error. */
function safe(text, secrets) {
    let output = String(text);
    for (const secret of secrets) if (secret && secret.length >= 8) output = output.split(secret).join('[redacted]');
    return output;
}

async function verify(candidate, key) {
    const descriptor = DIRECT_PROVIDERS[candidate.id];
    const secrets = [key.value];
    const lines = [];
    // Discovery first: a real list beats a hardcoded guess, and an empty or failed list is a
    // legitimate outcome that must not stop the check.
    let model = process.env.SMOKE_MODEL || FALLBACK_MODEL[candidate.id] || '';
    let listed = null;
    try {
        const listing = new DirectAIProvider({ providerId: candidate.id, apiKey: key.value, model, depth: 'auto' });
        listed = await listing.listModels(AbortSignal.timeout(20000));
        lines.push(`  model discovery: ${listed === null ? 'not supported' : `${listed.length} models${listed.length ? ` (first: ${listed[0]})` : ''}`}`);
        if (listed?.length && !process.env.SMOKE_MODEL) model = listed[0];
    }
    catch (error) {
        lines.push(`  model discovery: failed (${classifyFailure(error)}) - manual model entry still applies`);
    }
    lines.push(`  model used: ${model}`);
    const provider = new DirectAIProvider({ providerId: candidate.id, apiKey: key.value, model, depth: 'light' });
    const check = await provider.testConnection(AbortSignal.timeout(30000));
    lines.push(`  connection check: ${check.ok ? `ok${check.effectiveModel ? ` (provider reports ${check.effectiveModel})` : ' (provider reported no model identity)'}` : `failed (${check.failure}: ${safe(failureText(check.failure, descriptor.label), secrets)})`}`);
    if (!check.ok) return { status: 'FAILED', lines };
    try {
        const response = await provider.respond(packet, { kind: 'ask', text: 'Name one thing worth noticing about an undecided idea.', requestId: 'smoke-1' }, AbortSignal.timeout(45000));
        const effective = response.model?.effective ?? null;
        lines.push(`  semantic answer: ${response.intents.length} bounded intent(s), all Core-validated shapes`);
        lines.push(`  model provenance: requested ${response.model?.requested}${effective ? `, provider reports ${effective}` : ', provider reports no identity'}${effective && effective !== response.model?.requested ? ' - SUBSTITUTION, disclosed not hidden' : ''}`);
        lines.push(`  depth mapping: budget ${outputBudget('light', descriptor)}, effort ${reasoningEffort('light', descriptor) ?? 'none'}`);
        return { status: 'LIVE VERIFIED', lines };
    }
    catch (error) {
        lines.push(`  semantic answer: failed (${classifyFailure(error)}: ${safe(error?.message, secrets)})`);
        return { status: 'FAILED', lines };
    }
}

const results = [];
for (const candidate of CANDIDATES) {
    const key = keyFor(candidate);
    const label = DIRECT_PROVIDERS[candidate.id].label;
    if (!key) {
        results.push({ label, status: 'SKIPPED (no key in the environment)' });
        console.log(`\n${label}: SKIPPED - set ${candidate.keys[0]} to verify this provider live.`);
        continue;
    }
    console.log(`\n${label}: contacting the real provider using ${key.name} (value never printed).`);
    const result = await verify(candidate, key);
    for (const line of result.lines) console.log(line);
    results.push({ label, status: result.status });
}

console.log('\n=== LIVE VERIFICATION ===');
for (const result of results) console.log(`  ${result.label}: ${result.status}`);
const live = results.filter(result => result.status === 'LIVE VERIFIED').length;
console.log(`\n${live} provider(s) LIVE VERIFIED, ${results.filter(result => result.status.startsWith('SKIPPED')).length} skipped, ${results.filter(result => result.status === 'FAILED').length} failed.`);
console.log('Everything not listed as LIVE VERIFIED above is CONTRACT VERIFIED only (fixtures), not verified against the real service.');
