import { describe, expect, it } from 'vitest';
import { composerState } from '../../src/ui/workspace/composer.ts';
import { AIRuntime } from '../../src/ai/runtime.ts';
import { ProjectController } from '../../src/core/controller.ts';
import { demoProject } from '../../src/core/demo.ts';
import { ThinkingError } from '../../src/ai/errors.ts';
import { UNKNOWN_CAPABILITIES, type AIProvider } from '../../src/ai/contracts.ts';

/** P0-2 (intent recovery): the words a person wrote must survive a run that did not succeed, so
 * fixing a mistyped key, waiting out a rate limit or restoring the network and pressing Enter again
 * is the whole recovery. Clearing lives inside the `useThinkingIntents` hook, which needs React to
 * mount, so this file asserts the rule at the two pure seams that decide it:
 *
 * 1. `composerState` — the state function the composer renders. With words still present it is
 *    `writing` (or `submitting` while a run is in flight); it never falls back to `idle` merely
 *    because a run failed.
 * 2. `AIRuntime.run` — the object that owns the terminal outcome the hook branches on
 *    (`if (outcome.status === 'completed') setWords('')`). A failed or cancelled run reports
 *    `'failed'`/`'cancelled'`, never `'completed'`, so the hook has nothing to clear. Driving the
 *    real runtime with a fake provider keeps this in real code rather than a restatement of it.
 */
describe('P0-2: a run that did not succeed leaves the composed words in place', () => {
    const words = 'What connects these?';
    const hooks = { pending: () => { }, notice: () => { }, route: () => { }, anchor: () => ({ x: 0, y: 0 }) };
    const base: AIProvider = { label: 'Test provider', mock: false, capabilities: async () => UNKNOWN_CAPABILITIES, respond: async () => ({ intents: [], providerLabel: 'Test provider', mock: false }), structured: async request => ({ value: request.input, providerLabel: 'Test provider', mock: false }) };
    const withRespond = (respond: AIProvider['respond']): AIProvider => ({ ...base, respond });
    const run = (provider: AIProvider) => new AIRuntime(new ProjectController(demoProject(), async () => { }), async () => provider, hooks).run('ask', words, ['attention']);

    it('shows submitting while the words are in flight, and writing the moment the run is not busy', () => {
        expect(composerState({ composing: true, scoped: false, words, busy: true })).toBe('submitting');
        // A failure, a cancellation and a timeout all arrive here: still composing, still the words.
        expect(composerState({ composing: true, scoped: false, words, busy: false })).toBe('writing');
    });

    it('reports failed for a provider refusal, so the hook keeps the words', async () => {
        const outcome = await run(withRespond(async () => { throw new ThinkingError('authentication-failed'); }));
        expect(outcome.status).toBe('failed');
        expect(outcome.status).not.toBe('completed');
        expect(words.trim()).not.toBe('');
    });

    it('reports cancelled for an aborted run, so the hook keeps the words', async () => {
        const outcome = await run(withRespond(async () => { throw new DOMException('Cancelled', 'AbortError'); }));
        expect(outcome.status).toBe('cancelled');
    });

    it('reports completed only on a real answer, which is the one case the hook clears', async () => {
        const outcome = await run(withRespond(async () => ({ intents: [], providerLabel: 'Test provider', mock: false })));
        expect(outcome.status).toBe('completed');
    });

    it('is idle only when the composer is not the active writing surface', () => {
        expect(composerState({ composing: false, scoped: false, words: '', busy: false })).toBe('idle');
        // Words can still be on screen after leaving; that is not the composer being active.
        expect(composerState({ composing: false, scoped: true, words, busy: false })).toBe('idle');
    });
});
