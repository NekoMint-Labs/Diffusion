import { bindProposition } from '../../core/proposition.ts';
import { plainAnswerTrialEnabled, propositionTrialEnabled, readingTrialEnabled, rememberReadingFocus } from '../thought/readingFocusStore.ts';
import { summarizeReading } from '../../ai/readingFocus.ts';
import { respondWithReading } from '../../ai/readingResponse.ts';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AIRuntime, type RuntimeHooks } from '../../ai/runtime.ts';
import { DiffuseSession } from '../../ai/diffuse.ts';
import { createThinkingProvider, type ThinkingSelection } from '../../ai/registry.ts';
import { failureText } from '../../ai/errors.ts';
import type { CredentialStore } from '../../credentials/contracts.ts';
import { BuiltInDiscoveryRuntime, CustomDiscoveryRuntime, type DiscoveryRuntime } from '../../discovery/runtime.ts';
import { DiscoveryEvidenceProvider } from '../../discovery/engine.ts';
import { customDiscoveryURL, discoveryAvailable, type DiscoveryStatus } from '../../discovery/contracts.ts';
import { SourceParser } from '../../evidence/parser.ts';
import { SourceImporter } from '../../evidence/importer.ts';
import { ModelEvidenceReasoner } from '../../evidence/reasoning.ts';
import type { ProjectController } from '../../core/controller.ts';
import type { ProjectRepository } from '../../storage/repository.ts';
import type { Settings } from '../settings.ts';
import { useUI } from '../store.ts';

const UNPLACED: RuntimeHooks = {
    pending: () => { }, notice: () => { }, route: () => { },
    anchor: () => ({ x: 300, y: 250 }),
    bounds: () => ({ x: 0, y: 0, width: 1440, height: 900 }),
};
const FALLBACK_BOUNDS = { x: 0, y: 0, width: 1440, height: 900 };

/** The thinking service: whose model answers, where possibilities land, and how sources arrive.
 *
 * Construction and disposal of the AI runtime, the diffuse session, the discovery engine, the
 * source parser and the source importer live here, together with the one rule that ties them to
 * user intent: an explicit new intent stops an exploration that was still running.
 *
 * Thinking and discovery are two independent capabilities, not one provider system. Either may be
 * missing and the product stays usable: with no discovery the model still explores the Field, and
 * with no AI the Field is still manual. Nothing here builds a dependency between them.
 */
export function useThinkingService({ controller, repository, settings, credentials, runTimes, discovery }: {
    controller: ProjectController;
    repository: ProjectRepository;
    settings: Settings;
    credentials: CredentialStore;
    /** How the bundled discovery engine is launched, when this platform has one. */
    runTimes: { builtIn: import('../../discovery/runtime.ts').EngineRunner | null };
    discovery: DiscoveryStatus;
}) {
    const hooks = useRef<RuntimeHooks>(UNPLACED);
    const selection = useRef<ThinkingSelection>(null!);
    // Read through a ref so a settings change never rebuilds the runtime: the runtime is one
    // long-lived object that reads the current selection when a request is made.
    const runtime = useMemo(() => new AIRuntime(controller, () => createThinkingProvider(selection.current, credentials), {
        ...(readingTrialEnabled() ? { respondWithPresentation: async (provider, packet, intent, signal) => {
            const { response, readings, emptyReason } = await respondWithReading(provider, packet, intent, signal, { propositions: propositionTrialEnabled(), plainAnswer: plainAnswerTrialEnabled() });
            return { response, emptyReason, presentText: (text: string, key: string) => {
                const result = readings.get(text);
                if (result) {
                    rememberReadingFocus(key, text, result);
                    if (propositionTrialEnabled()) return bindProposition(result.focus.point, text);
                }
            } };
        } } satisfies Pick<RuntimeHooks, 'respondWithPresentation'> : {}),
        pending: value => hooks.current.pending(value),
        operation: value => hooks.current.operation?.(value),
        notice: value => hooks.current.notice(value),
        // The hook that reports provider failures is forwarded, and it falls back to the plain
        // notice line rather than to silence: `AIRuntime` reaches for `hooks.failure` first, so a
        // defined-but-inert forward would swallow a real failure entirely.
        failure: (failure, subject) => {
            if (hooks.current.failure)
                hooks.current.failure(failure, subject);
            else
                hooks.current.notice(failureText(failure, subject));
        },
        route: (...args) => hooks.current.route(...args),
        anchor: () => hooks.current.anchor(),
        bounds: () => hooks.current.bounds?.() ?? FALLBACK_BOUNDS,
        visibleIds: () => hooks.current.visibleIds?.(),
        measurements: () => hooks.current.measurements?.() ?? {},
    }), [controller, credentials]);
    selection.current = {
        provider: settings.provider, model: settings.model, thinkingDepth: settings.thinkingDepth,
        gateway: settings.gateway, token: settings.token, baseUrl: settings.baseUrl, protocol: settings.protocol,
    };
    /** The engine that would run right now, or null when external discovery is off or unusable.
     * Both are honest answers: `null` means the UI must not promise a search. */
    const engine = useMemo<DiscoveryRuntime | null>(() => {
        if (!settings.discovery.external || !discoveryAvailable(discovery)) return null;
        if (discovery.engine === 'built-in' && runTimes.builtIn) return new BuiltInDiscoveryRuntime(runTimes.builtIn);
        if (discovery.engine === 'custom' && settings.discovery.customUrl) return new CustomDiscoveryRuntime(customDiscoveryURL(settings.discovery.customUrl));
        return null;
    }, [settings.discovery.external, settings.discovery.customUrl, discovery.engine, discovery.ready.length, runTimes.builtIn]);
    const evidence = useMemo(() => engine ? new DiscoveryEvidenceProvider(engine,
        settings.provider === 'off' || settings.provider === 'demo' ? undefined : new ModelEvidenceReasoner(() => createThinkingProvider(selection.current, credentials))) : null, [engine, settings.provider, credentials]);
    const evidenceRef = useRef(evidence);
    evidenceRef.current = evidence;
    const diffuse = useMemo(() => new DiffuseSession(controller, runtime, () => evidenceRef.current), [controller, runtime]);
    const parser = useMemo(() => new SourceParser(), []);
    const importer = useMemo(() => new SourceImporter(controller, repository, parser, text => useUI.getState().patch({ notice: text })), [controller, repository, parser]);

    const focusReading = useCallback(async (text: string, signal: AbortSignal) => {
        signal.throwIfAborted();
        const provider = await createThinkingProvider(selection.current, credentials);
        signal.throwIfAborted();
        return summarizeReading(provider, text, signal);
    }, [credentials, settings.provider, settings.model, settings.thinkingDepth, settings.gateway, settings.token, settings.baseUrl, settings.protocol]);

    function stopDiffuseForIntent() {
        if (['running', 'paused'].includes(diffuse.getSnapshot().phase))
            diffuse.stop('A new explicit user intent replaced this exploration.');
    }
    useEffect(() => () => { diffuse.dispose(); runtime.dispose(); }, [controller, runtime, diffuse]);
    // Resolving/refreshed native credentials replaces the runtime, not the shared file parser.
    // Its extraction worker must live until this parser itself leaves the workspace.
    useEffect(() => () => parser.dispose(), [parser]);
    return { runtime, diffuse, evidence, importer, hooks, stopDiffuseForIntent, focusReading };
}
