import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_DISCOVERY, describeDiscovery, normalizeDiscoverySettings, discoveryAvailable } from '../../src/discovery/contracts.ts';
import { discoveryInvocation } from '../../src/discovery/config.ts';

test('Tavily keyless is explicit, usable without a key, and never enables an unselected source', () => {
    const settings = { ...DEFAULT_DISCOVERY, external: true, sources: { exa: false, tavily: true, brave: false }, tavilyKeyless: true };
    const status = describeDiscovery(settings, {}, { builtInEngine: true });
    assert.deepEqual(status.ready, ['tavily']); assert.deepEqual(status.missingKey, []); assert.equal(discoveryAvailable(status), true);
    assert.equal(discoveryInvocation(settings, ['search']).tavilyKeyless, true);
    assert.equal(discoveryInvocation({ ...settings, external: false }, ['search']).tavilyKeyless, undefined);
    assert.equal(discoveryInvocation({ ...settings, sources: { ...settings.sources, tavily: false } }, ['search']).tavilyKeyless, undefined);
    assert.deepEqual(describeDiscovery({ ...settings, tavilyKeyless: false }, {}, { builtInEngine: true }).missingKey, ['tavily']);
    assert.equal(normalizeDiscoverySettings({ tavilyKeyless: 'true' }).tavilyKeyless, false);
    assert.equal(normalizeDiscoverySettings({ tavilyKeyless: true }).tavilyKeyless, true);
});
