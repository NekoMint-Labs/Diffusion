import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { AIProvider } from '../../src/ai/contracts.ts';
import { GatewayAIProvider } from '../../src/ai/gateway.ts';
import { answerPreview } from '../../src/shared/answerPreview.ts';
import { AUTHORED_FOCUS, makeCases } from './cases.ts';
import { FocusValidationError, generateFocus, prepareInput, validateFocus } from './protocol.ts';

const args = process.argv.slice(2);
const cases = makeCases();
const mode = args[0] ?? 'offline';
const output = resolve('experiments/role-b-focus/results');
await mkdir(output, { recursive: true });
if (mode === 'offline') {
    let assertions = 0;
    const check = (fn: () => void) => { fn(); assertions++; };
    const receipts = Object.entries(cases).map(([name, fixture]) => {
        const before = JSON.stringify(fixture.project);
        const input = prepareInput(fixture.project, fixture.selection);
        check(() => assert.equal(JSON.stringify(fixture.project), before));
        return { name, input, selection: input.packet.scope.map(t => t.id), background: input.packet.local.map(t => t.id) };
    });
    const constrained = receipts.find(r => r.name === 'constrained')!;
    check(() => assert(!JSON.stringify(constrained.input).includes(cases.constrained.project.thoughts.foreign.text)));
    check(() => assert.deepEqual(constrained.selection, ['question', 'condition']));
    check(() => assert.deepEqual(receipts.find(r => r.name === 'constraint-only')!.background, ['question']));
    check(() => assert(receipts.find(r => r.name === 'linked-background')!.background.includes('foreign')));
    check(() => assert.equal(receipts.find(r => r.name === 'tail-constraint')!.input.truncations.length, 1));
    check(() => assert(!JSON.stringify(receipts.find(r => r.name === 'tail-constraint')!.input).includes('每周只能投入四小时')));
    check(() => assert.deepEqual(validateFocus(AUTHORED_FOCUS, constrained.input), AUTHORED_FOCUS));
    for (const bad of [
        { text: 'A narrative without a separate key point.' },
        { ...AUTHORED_FOCUS, point: '长'.repeat(121) },
        { ...AUTHORED_FOCUS, point: '  ' },
        { ...AUTHORED_FOCUS, consideredSelectionIds: ['question'] },
        { ...AUTHORED_FOCUS, consideredSelectionIds: ['question', 'condition', 'condition'] },
        { ...AUTHORED_FOCUS, consideredSelectionIds: ['question', 'foreign'] },
        { ...AUTHORED_FOCUS, basis: [{ thoughtId: 'foreign', quote: '三维重建' }] },
        { ...AUTHORED_FOCUS, basis: [{ thoughtId: 'question', quote: '不存在于原文的引用' }] },
        { ...AUTHORED_FOCUS, command: 'keep' },
    ]) check(() => assert.throws(() => validateFocus(bad, constrained.input)));
    check(() => assert.equal(validateFocus({ ...AUTHORED_FOCUS, point: '🧪'.repeat(120) }, constrained.input).point.length, 240));
    let calls = 0;
    const provider = { mock: false, structured: async (task: unknown) => { calls++; assert.equal((task as {purpose: string}).purpose, 'exploration-step'); return { value: AUTHORED_FOCUS, providerLabel: 'Authored fixture, not model', mock: false }; } } as unknown as AIProvider;
    const generated = await generateFocus(provider, constrained.input, new AbortController().signal);
    check(() => assert.equal(calls, 1));
    check(() => assert.deepEqual(generated.focus, AUTHORED_FOCUS));
    await assert.rejects(generateFocus({ ...provider, mock: true }, constrained.input, new AbortController().signal)); assertions++;
    const invalidProvider = { ...provider, structured: async () => ({ value: { malformed: true }, providerLabel: 'Fixture', mock: false }) } as unknown as AIProvider;
    try { await generateFocus(invalidProvider, constrained.input, new AbortController().signal); assert.fail('Expected validation failure'); }
    catch (error) { check(() => assert(error instanceof FocusValidationError && (error.response.value as {malformed: boolean}).malformed)); }
    const abort = new AbortController(); abort.abort();
    await assert.rejects(generateFocus(provider, constrained.input, abort.signal)); assertions++;
    check(() => assert.equal(calls, 1));
    const report = { provenance: 'offline authored fixtures; no model calls, no user storage', assertions,
        cases: receipts, authoredFocus: AUTHORED_FOCUS,
        prefixExample: answerPreview('换一个挑法：选那个如果答案是否，你就会放弃这个方向的问题。' + '这是一段较长的解释。'.repeat(30)),
        limits: ['Exact quotes do not prove semantic relevance or truth.', 'These fixtures cannot diagnose the actual screenshot request.', 'The production tail truncation is observed, not repaired here.'] };
    await writeFile(resolve(output, 'offline.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ status: 'PASS', assertions, provenance: report.provenance, cases: receipts.map(({name, selection, background, input}) => ({ name, selection, background, truncations: input.truncations })), report: resolve(output, 'offline.json') }, null, 2));
} else if (mode === 'live') {
    const name = args[1] as keyof typeof cases;
    const variant = args[2];
    if (!Object.hasOwn(cases, name) || !['baseline', 'focused'].includes(variant)) throw new Error('Usage: live CASE baseline|focused');
    const gateway = process.env.ROLE_B_GATEWAY;
    if (!gateway) throw new Error('Set ROLE_B_GATEWAY locally; never paste credentials in feedback.');
    const provider = new GatewayAIProvider({ url: gateway, token: process.env.ROLE_B_TOKEN ?? '', model: process.env.ROLE_B_MODEL ?? '', depth: 'standard' });
    const fixture = cases[name];
    const input = prepareInput(fixture.project, fixture.selection);
    const started = Date.now();
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = resolve(output, stamp + '-' + name + '-' + variant + '.json');
    const signal = AbortSignal.timeout(45000);
    // Save the exact authorized fixture context before contacting the provider. Never save credentials.
    await writeFile(filename, JSON.stringify({ status: 'pending', case: name, variant, input }, null, 2));
    try {
        const result = variant === 'focused' ? await generateFocus(provider, input, signal)
            : await provider.respond(input.packet, { kind: 'continue', text: '继续想', requestId: stamp }, signal);
        await writeFile(filename, JSON.stringify({ status: 'completed', case: name, variant, input, elapsedMs: Date.now() - started, result }, null, 2));
        console.log(JSON.stringify({ status: 'completed', receipt: filename, elapsedMs: Date.now() - started }));
    } catch (error) {
        // Retain malformed model output as evidence, without logging transport headers or credentials.
        await writeFile(filename, JSON.stringify({ status: 'failed', case: name, variant, input, elapsedMs: Date.now() - started, failureClass: error instanceof Error ? error.name : 'Unknown', ...(error instanceof FocusValidationError ? { rawResponse: error.response } : {}) }, null, 2));
        process.exitCode = 1;
        console.error('The single attempt failed. Receipt saved; no automatic retry.');
    }
} else throw new Error('Usage: offline | live CASE baseline|focused');
