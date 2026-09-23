import { describe, expect, it } from 'vitest';
import {
    DEFAULT_DISCOVERY, DISCOVERY_SOURCE_IDS, DISCOVERY_SOURCES,
    customDiscoveryURL as contractsCustomDiscoveryURL, usableCustomDiscoveryURL,
    describeDiscovery, discoveryAvailable, enabledSources, normalizeDiscoverySettings,
    type DiscoverySettings, type DiscoverySourceId,
} from '../../src/discovery/contracts.ts';
import { customDiscoveryURL, discoveryInvocation } from '../../src/discovery/config.ts';
import { BuiltInDiscoveryRuntime, type DiscoveryRuntime, type EngineRunner } from '../../src/discovery/runtime.ts';
import { DiscoveryEvidenceProvider, discoveryFailure } from '../../src/discovery/engine.ts';
import { DiscoveryError, readArguments, searchArguments, searchOutcome } from '../../src/discovery/envelope.ts';
import { ThinkingError } from '../../src/ai/errors.ts';
import type { EvidenceCandidate } from '../../src/core/model.ts';

const signal = new AbortController().signal;
const settings = (over: Partial<DiscoverySettings> = {}): DiscoverySettings => ({ ...DEFAULT_DISCOVERY, external: true, sources: { exa: true, tavily: false, brave: false }, ...over });
const candidate = (n: number) => ({ title: `Result ${n}`, url: `https://example.org/${n}`, snippet: `Snippet ${n}` });
const searchEnvelope = (candidates: unknown[], over: { status?: string; attempts?: unknown[] } = {}) =>
    JSON.stringify({ version: 1, operation: 'search', status: over.status ?? 'complete', error: null, attempts: over.attempts ?? [], data: { candidates } });
const readEnvelope = (url: string, content: string) =>
    JSON.stringify({ version: 1, operation: 'read', status: 'complete', error: null, data: { evidence: { url, title: 'A source', content, provider: 'Test reader', truncated: false, returned_length: content.length, original_length: content.length } } });

describe('discoveryInvocation hands the native layer identifiers, never secrets', () => {
    it('names the enabled sources and keeps the engine argument contract unchanged', () => {
        const invocation = discoveryInvocation(settings(), searchArguments('a query', 5));
        expect(Object.keys(invocation).sort()).toEqual(['args', 'sources']);
        expect(invocation.sources).toEqual(['exa']);
        expect(invocation.args).toEqual(['search', '--mode', 'balanced', '--format', 'json', '--', 'a query']);
    });

    it('enables no source at all when external exploration is off, or when none is chosen', () => {
        expect(discoveryInvocation(settings({ external: false }), searchArguments('q', 5)).sources).toEqual([]);
        expect(discoveryInvocation(settings({ sources: { exa: false, tavily: false, brave: false } }), searchArguments('q', 5)).sources).toEqual([]);
    });

    it('carries several enabled sources as identifiers, in the product order', () => {
        const all = settings({ sources: { exa: true, tavily: true, brave: true } });
        expect(discoveryInvocation(all, readArguments('https://example.org/a')).sources).toEqual(['exa', 'tavily', 'brave']);
    });

    it('has no place to put a credential, for either operation', () => {
        const invocation = discoveryInvocation(settings(), [...searchArguments('a query', 5), ...readArguments('https://example.org/a')]);
        expect(JSON.stringify(invocation)).not.toMatch(/key|secret|token|bearer/i);
        for (const argument of invocation.args) expect(argument).not.toMatch(/EXA_|TAVILY_|BRAVE_/);
    });

    it('keeps the child environment vocabulary out of the product layer entirely', () => {
        // The id -> credential slot -> child variable mapping now lives once, natively, beside the
        // credential lookup that enforces it (`src-tauri/src/discovery_env.rs`). If a variable name
        // reappears here, so does the opportunity to read a secret in JavaScript.
        for (const id of DISCOVERY_SOURCE_IDS) {
            const descriptor = DISCOVERY_SOURCES[id];
            expect(Object.keys(descriptor).sort()).toEqual(['id', 'keyHint', 'label']);
            expect(JSON.stringify(descriptor)).not.toMatch(/_API_KEY|_ENABLED/);
        }
    });
});

describe('describeDiscovery and discoveryAvailable describe what can really run', () => {
    const keys = { exa: true } as Partial<Record<DiscoverySourceId, boolean>>;

    it('reports not available with no enabled source', () => {
        const status = describeDiscovery(DEFAULT_DISCOVERY, {}, { builtInEngine: true });
        expect(status.ready).toEqual([]);
        expect(status.missingKey).toEqual([]);
        expect(discoveryAvailable(status)).toBe(false);
    });

    it('reports available with one enabled source that holds a key', () => {
        const status = describeDiscovery(settings(), keys, { builtInEngine: true });
        expect(status.engine).toBe('built-in');
        expect(status.engineReady).toBe(true);
        expect(status.ready).toEqual(['exa']);
        expect(status.missingKey).toEqual([]);
        expect(status.reader).toBe(true);
        expect(discoveryAvailable(status)).toBe(true);
    });

    it('lists an enabled source without a key under missingKey and stays unavailable', () => {
        const status = describeDiscovery(settings(), {}, { builtInEngine: true });
        expect(status.ready).toEqual([]);
        expect(status.missingKey).toEqual(['exa']);
        expect(discoveryAvailable(status)).toBe(false);
    });

    it('reports a null engine only when the platform has none, and the product gates on external separately', () => {
        // describeDiscovery describes the engine and source readiness; `external` is the on/off
        // switch the caller applies (`!external || !discoveryAvailable` in useThinkingService) and
        // `discoveryInvocation` honours by naming no source. It does not, and must not, hide a
        // present platform engine.
        expect(describeDiscovery(settings({ external: false }), keys, { builtInEngine: true }).engine).toBe('built-in');
        const none = describeDiscovery(settings(), keys, { builtInEngine: false });
        expect(none.engine).toBeNull();
        expect(none.reader).toBe(false);
        expect(discoveryAvailable(none)).toBe(false);
        const custom = describeDiscovery(settings({ backend: 'custom', customUrl: '' }), keys, { builtInEngine: true });
        expect(custom.engine).toBeNull();
    });

    it('chooses the custom engine only when a URL is configured', () => {
        const status = describeDiscovery(settings({ backend: 'custom', customUrl: 'https://search.example/normalized' }), keys, { builtInEngine: false });
        expect(status.engine).toBe('custom');
        expect(status.reader).toBe(false);
        expect(enabledSources(settings())).toEqual(['exa']);
    });
});

describe('BuiltInDiscoveryRuntime maps the engine envelope without inventing evidence', () => {
    function runner(handle: (args: string[]) => string) {
        const calls: string[][] = [];
        const run: EngineRunner = async (args) => { calls.push(args); return handle(args); };
        return { run, calls };
    }
    const body = 'A paragraph of the fetched page that is definitely longer than twelve characters.\n\nA second paragraph, also long enough to become a block.';

    it('maps search candidates to stage candidate, with no outcome and no passages', async () => {
        const { run } = runner(args => args[0] === 'search' ? searchEnvelope([candidate(1), candidate(2)]) : '');
        const runtime = new BuiltInDiscoveryRuntime(run);
        const outcome = await runtime.search('a query', 5, signal);
        expect(outcome.candidates).toHaveLength(2);
        const [first] = outcome.candidates;
        expect(first).toMatchObject({ id: 'candidate-1', stage: 'candidate', title: 'Result 1', url: 'https://example.org/1', excerpt: 'Snippet 1' });
        expect(first.outcome).toBeUndefined();
        expect(first.passages).toBeUndefined();
        expect(outcome.degraded).toBe(false);
    });

    it('preserves a degraded envelope and the providers that actually returned results', async () => {
        const attempt = (provider: string, result_count: number) => ({ provider, result_count });
        const envelope = searchEnvelope([candidate(1)], { status: 'degraded', attempts: [attempt('exa', 3), attempt('tavily', 0)] });
        const { run } = runner(args => args[0] === 'search' ? envelope : '');
        const outcome = await new BuiltInDiscoveryRuntime(run).search('a query', 5, signal);
        expect(outcome.degraded).toBe(true);
        expect(outcome.providers).toEqual(['exa']);
    });

    it('turns a failed CONFIGURATION_ERROR envelope into not-configured', async () => {
        const failed = JSON.stringify({ version: 1, operation: 'search', status: 'failed', error: { code: 'CONFIGURATION_ERROR' } });
        const { run } = runner(() => failed);
        await expect(new BuiltInDiscoveryRuntime(run).search('a query', 5, signal)).rejects.toMatchObject({ name: 'DiscoveryError', code: 'not-configured' });
        expect(() => searchOutcome(failed, 5)).toThrow(DiscoveryError);
    });

    it('reads once for a fetch/extract pair and refreshes on a later fetch', async () => {
        let reads = 0;
        const { run } = runner(args => {
            if (args[0] === 'search') return searchEnvelope([]);
            reads += 1;
            return readEnvelope(String(args[args.length - 1]), body);
        });
        const runtime = new BuiltInDiscoveryRuntime(run);
        const fetched = await runtime.fetch('https://example.org/a', signal);
        expect(reads).toBe(1);
        expect(fetched.text.trim().length).toBeGreaterThan(0);
        const chunks = await runtime.extract('https://example.org/a', 'paragraph', signal);
        expect(reads).toBe(1);
        expect(chunks.length).toBeGreaterThan(0);
        await runtime.fetch('https://example.org/a', signal);
        expect(reads).toBe(2);
    });

    it('expires a cached reader body rather than serving a stale page', async () => {
        let now = 1000;
        let reads = 0;
        const { run } = runner(args => { reads += 1; return readEnvelope(String(args[args.length - 1]), body); });
        const runtime = new BuiltInDiscoveryRuntime(run, () => now, 100);
        await runtime.fetch('https://example.org/a', signal);
        now += 100;
        await runtime.extract('https://example.org/a', 'paragraph', signal);
        expect(reads).toBe(2);
    });

    it('bounds the reader cache, so an evicted URL is read again', async () => {
        let reads = 0;
        const { run } = runner(args => { reads += 1; return readEnvelope(String(args[args.length - 1]), body); });
        const runtime = new BuiltInDiscoveryRuntime(run, () => 1000, 100000);
        for (let i = 0; i < 20; i += 1)
            await runtime.fetch(`https://example.org/${i}`, signal);
        const afterFetches = reads;
        // The most recent URL is still cached; the first one has been evicted.
        await runtime.extract('https://example.org/19', 'paragraph', signal);
        expect(reads).toBe(afterFetches);
        await runtime.extract('https://example.org/0', 'paragraph', signal);
        expect(reads).toBe(afterFetches + 1);
    });
});

describe('DiscoveryEvidenceProvider translates engine failures into the product vocabulary', () => {
    const found: EvidenceCandidate = { id: 'candidate-1', title: 'A result', url: 'https://example.org/a', excerpt: 'Snippet', stage: 'candidate', inspected: 'Snippet only' };
    function runtime(over: Partial<DiscoveryRuntime> = {}): DiscoveryRuntime {
        return {
            kind: 'built-in',
            search: async () => ({ candidates: [found], degraded: false, providers: ['exa'] }),
            fetch: async url => ({ url, title: 'A', text: 'body text long enough', inspected: 'x' }),
            extract: async () => [],
            metadata: async url => ({ url, title: 'A' }),
            ...over,
        };
    }

    it('turns a DiscoveryError into a ThinkingError with a discovery failure code', async () => {
        const provider = new DiscoveryEvidenceProvider(runtime({ search: async () => { throw new DiscoveryError('invalid-contract'); } }));
        await expect(provider.search('q')).rejects.toMatchObject({ name: 'ThinkingError', failure: 'malformed-provider-response' });
        expect(discoveryFailure(new DiscoveryError('not-configured'))).toBe('discovery-unavailable');
        expect(discoveryFailure(new DiscoveryError('weird-code'))).toBe('invalid-configuration');
        expect(discoveryFailure(new Error('anything else'))).toBe('discovery-unavailable');
    });

    it('passes an already-classified ThinkingError through unchanged', async () => {
        const provider = new DiscoveryEvidenceProvider(runtime({ fetch: async () => { throw new ThinkingError('reader-unavailable'); } }));
        await expect(provider.fetch('https://example.org/a')).rejects.toMatchObject({ name: 'ThinkingError', failure: 'reader-unavailable' });
    });

    it('reports nothing before any search has run', () => {
        expect(new DiscoveryEvidenceProvider(runtime()).provenance()).toBeNull();
    });

    it('counts results and names the sources that answered', async () => {
        const provider = new DiscoveryEvidenceProvider(runtime());
        await provider.search('q');
        expect(provider.provenance()).toEqual({ key: '{count} external results from {sources}.', values: { count: 1, sources: 'exa' } });
    });

    it('reports limited sources when the engine returned a degraded envelope', async () => {
        const provider = new DiscoveryEvidenceProvider(runtime({ search: async () => ({ candidates: [found], degraded: true, providers: ['exa'] }) }));
        await provider.search('q');
        expect(provider.provenance()).toEqual({ key: 'External discovery completed with limited sources ({sources}).', values: { sources: 'exa' } });
    });

    it('states plainly when a search returned no results', async () => {
        const provider = new DiscoveryEvidenceProvider(runtime({ search: async () => ({ candidates: [], degraded: false, providers: [] }) }));
        await provider.search('q');
        expect(provider.provenance()).toEqual({ key: 'External discovery returned no results.', values: {} });
    });
});

describe('normalizeDiscoverySettings rejects junk and defaults everything off', () => {
    it('defaults an absent or unusable record to everything off', () => {
        for (const value of [undefined, null, 'nonsense', 42, [], { external: 'yes', sources: 'nope', backend: 'weird', customUrl: 5 }])
            expect(normalizeDiscoverySettings(value)).toEqual(DEFAULT_DISCOVERY);
    });

    it('keeps only real booleans and a known backend', () => {
        expect(normalizeDiscoverySettings({ external: true, sources: { exa: true, tavily: 'yes', extra: true }, backend: 'custom', customUrl: 'https://x.example' }))
            .toEqual({ external: true, sources: { exa: true, tavily: false, brave: false }, backend: 'custom', customUrl: 'https://x.example' });
    });

    it('bounds the custom URL length', () => {
        expect(normalizeDiscoverySettings({ customUrl: 'x'.repeat(600) }).customUrl).toHaveLength(500);
    });

    it('covers exactly the three named sources', () => {
        expect(DISCOVERY_SOURCE_IDS).toEqual(['exa', 'tavily', 'brave']);
        expect(normalizeDiscoverySettings({ sources: { madeup: true } }).sources).toEqual({ exa: false, tavily: false, brave: false });
    });
});

describe('customDiscoveryURL accepts HTTPS and loopback HTTP only', () => {
    it('normalizes accepted URLs', () => {
        expect(customDiscoveryURL('https://search.example/normalized')).toBe('https://search.example/normalized');
        expect(customDiscoveryURL('https://search.example/normalized/')).toBe('https://search.example/normalized');
        expect(customDiscoveryURL('http://127.0.0.1:8787/api')).toBe('http://127.0.0.1:8787/api');
        expect(customDiscoveryURL('http://localhost:3000/')).toBe('http://localhost:3000');
        expect(customDiscoveryURL('http://[::1]:9000')).toBe('http://[::1]:9000');
    });

    it('rejects remote HTTP, credentials, queries, fragments and non-URLs', () => {
        for (const value of [
            'http://remote.example/api', 'https://user:pass@search.example/', 'https://search.example/?q=1',
            'https://search.example/#frag', 'not a url', '',
        ])
            expect(() => customDiscoveryURL(value)).toThrow();
    });
});

describe('readiness follows URL usability, not mere non-emptiness', () => {
    const keys = { exa: true } as Partial<Record<DiscoverySourceId, boolean>>;
    const custom = (customUrl: string) => describeDiscovery(settings({ backend: 'custom', customUrl }), keys, { builtInEngine: false });

    it('reports no engine for a custom backend with a non-empty but unusable URL', () => {
        for (const url of ['not a url', 'ftp://example.org/x', 'http://example.org/x']) {
            const status = custom(url);
            expect(status.engine).toBeNull();
            expect(status.engineReady).toBe(false);
            expect(discoveryAvailable(status)).toBe(false);
        }
    });

    it('reports the custom engine for a usable URL, remote HTTPS or loopback HTTP', () => {
        for (const url of ['https://example.org/normalized', 'http://127.0.0.1:9999/x']) {
            const status = custom(url);
            expect(status.engine).toBe('custom');
            expect(status.engineReady).toBe(true);
        }
    });

    it('reports no engine for a built-in backend on a build that has none, and names it when present', () => {
        expect(describeDiscovery(settings(), keys, { builtInEngine: false }).engine).toBeNull();
        expect(describeDiscovery(settings(), keys, { builtInEngine: true }).engine).toBe('built-in');
    });

    it('normalizes a valid URL and throws on credentials, a query, a fragment and non-loopback HTTP', () => {
        expect(customDiscoveryURL('https://example.org/normalized/')).toBe('https://example.org/normalized');
        for (const url of ['https://user:pass@example.org/x', 'https://example.org/x?q=1', 'https://example.org/x#frag', 'http://example.org/x'])
            expect(() => customDiscoveryURL(url)).toThrow();
        // The readiness predicate is that same rule, asked without throwing.
        const accepts = (url: string) => { try { customDiscoveryURL(url); return true; } catch { return false; } };
        for (const url of ['https://example.org/normalized/', 'http://example.org/x', 'not a url'])
            expect(usableCustomDiscoveryURL(url)).toBe(accepts(url));
    });

    it('re-exports one validator, so the Advanced field and the readiness model apply one rule', () => {
        expect(customDiscoveryURL).toBe(contractsCustomDiscoveryURL);
    });

    it('reports reader only for the built-in engine, because only the bundled engine reads a page itself', () => {
        expect(describeDiscovery(settings(), keys, { builtInEngine: true }).reader).toBe(true);
        expect(custom('https://example.org/normalized').reader).toBe(false);
        expect(describeDiscovery(settings({ backend: 'custom', customUrl: 'not a url' }), keys, { builtInEngine: true }).reader).toBe(false);
    });
});
