import type { DiscoverySettings, DiscoverySourceId } from './contracts.ts';
import { customDiscoveryURL } from './config.ts';
import { searchArguments, searchOutcome } from './envelope.ts';
import { CustomDiscoveryRuntime, type EngineRunner } from './runtime.ts';
export type SearchCheckResult = 'verified' | 'empty';
/** Deliberate, content-free probe. Configuration and evidence are never mutated. */
export async function checkSearchConnection(settings: DiscoverySettings, source: DiscoverySourceId, signal: AbortSignal, run?: EngineRunner): Promise<SearchCheckResult> {
    signal.throwIfAborted();
    const query = 'Diffusion connection test';
    const result = settings.backend === 'custom'
        ? await new CustomDiscoveryRuntime(customDiscoveryURL(settings.customUrl)).search(query, 1, signal)
        : run ? searchOutcome(await run(searchArguments(query, 1), signal), 1) : null;
    signal.throwIfAborted();
    if (!result) throw new Error('unavailable');
    const sourceAnswered = settings.backend === 'custom' || result.providers.some(provider => provider.toLowerCase() === source);
    return sourceAnswered && result.candidates.length > 0 && !result.degraded ? 'verified' : 'empty';
}
