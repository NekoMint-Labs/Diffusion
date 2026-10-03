import { useEffect, useRef, useState } from 'react';
import { t as msg } from '../../shared/i18n.ts';
import type { Settings } from '../settings.ts';
import { DISCOVERY_SOURCE_IDS, DISCOVERY_SOURCES, enabledSources, usableCustomDiscoveryURL, type DiscoverySettings, type DiscoverySourceId, type DiscoveryStatus } from '../../discovery/contracts.ts';
import type { SearchCheckResult } from '../../discovery/connection.ts';
import { ApiKeyLink } from '../primitives/ApiKeyLink.tsx';
import { customDiscoveryURL } from '../../discovery/config.ts';
import { searchCredential } from '../../credentials/contracts.ts';
import { Select } from '../primitives/Select.tsx';
import { StatusLine } from '../primitives/Status.tsx';
import { Button } from '../primitives/Button.tsx';
import { Switch } from '../primitives/Switch.tsx';
import { SettingRow } from '../primitives/SettingRow.tsx';
import { SurfaceGroup } from '../primitives/SurfaceGroup.tsx';

/** Search & Evidence: may Diffusion look outside this Field, and where?
 *
 * A distinct section rather than a block inside AI, because it answers a different question. The
 * AI section answers "who helps Diffusion think?"; this one answers "where may it look?". A person
 * may reasonably want one, both or neither, and mixing them into one technical panel is what made
 * the previous configuration impossible to reason about.
 *
 * Diffusion's bundled discovery engine is deliberately invisible here. It is the thing that talks
 * to sources, falls back between them and normalizes what comes back — not a source the user picks.
 * Offering the engine beside "Exa" would ask someone to choose an internal implementation.
 */
export function SearchSettings({ settings, discovery, sourceKeys, secureStore, onTest, onChange, onCredentialChange }: {
    settings: Settings;
    onTest: (source: DiscoverySourceId, signal: AbortSignal) => Promise<SearchCheckResult>;
    discovery: DiscoveryStatus;
    /** Presence only, never a value: whether a credential is stored for a source. */
    sourceKeys: Partial<Record<DiscoverySourceId, boolean>>;
    /** Whether this build has an OS-backed credential store or only this session. */
    secureStore: boolean;
    onChange: (settings: Settings) => void;
    /** Re-reads credential presence after a key is stored or removed. */
    onCredentialChange: () => void;
}) {
    const [keyDraft, setKeyDraft] = useState<Partial<Record<DiscoverySourceId, string>>>({});
    const [keyError, setKeyError] = useState('');
    const [advanced, setAdvanced] = useState(false);
    const [source, setSource] = useState<DiscoverySourceId>(() => enabledSources(settings.discovery)[0] ?? 'exa');
    const [check, setCheck] = useState<'idle' | 'checking' | 'verified' | 'empty' | 'failed'>('idle');
    const activeRequest = useRef<AbortController | null>(null);
    const custom = settings.discovery.backend === 'custom';
    const configuration = JSON.stringify(custom ? [settings.discovery.external, settings.discovery.backend, settings.discovery.customUrl] : [source, settings.discovery, sourceKeys]);
    useEffect(() => {
        activeRequest.current?.abort(); activeRequest.current = null; setCheck('idle');
        return () => { activeRequest.current?.abort(); };
    }, [configuration]);
    async function testConnection() {
        activeRequest.current?.abort();
        const request = new AbortController(); activeRequest.current = request;
        const timeout = setTimeout(() => request.abort(new Error('timeout')), 25000);
        setCheck('checking');
        try {
            const interrupted = new Promise<never>((_, reject) => request.signal.addEventListener('abort', () => reject(request.signal.reason), { once: true }));
            const result = await Promise.race([onTest(source, request.signal), interrupted]);
            if (activeRequest.current === request && !request.signal.aborted) setCheck(result);
        } catch {
            if (activeRequest.current === request) setCheck('failed');
        } finally { clearTimeout(timeout); }
    }
    const discoverySettings = settings.discovery;
    const setDiscovery = (next: Partial<DiscoverySettings>) => onChange({ ...settings, discovery: { ...discoverySettings, ...next } });

    function invalidateCheck() { activeRequest.current?.abort(); activeRequest.current = null; setCheck('idle'); }
    async function saveKey(id: DiscoverySourceId): Promise<boolean> {
        const draft = (keyDraft[id] ?? '').trim();
        setKeyError('');
        if (!draft)
            return false;
        try {
            const { createCredentialStore } = await import('../../credentials/index.ts');
            const store = await createCredentialStore(secureStore);
            if (draft.length < 8) {
                setKeyError(msg('That key looks too short. Check it and try again.'));
                return false;
            }
            await store.store(searchCredential(id), draft);
            setKeyDraft(current => ({ ...current, [id]: '' }));
            invalidateCheck();
            onCredentialChange();
            return true;
        }
        catch {
            setKeyError(msg('The credential store refused the change.'));
            return false;
        }
    }
    /** The one moment a source key is removed: its own control.
     *
     * It used to be committed on blur, which meant an *empty* field next to a stored key deleted
     * that key: merely tabbing through the panel silently removed the credential the person had
     * configured, and the next search failed with no cause anywhere on screen. */
    async function removeKey(id: DiscoverySourceId): Promise<void> {
        try {
            const { createCredentialStore } = await import('../../credentials/index.ts');
            const store = await createCredentialStore(secureStore);
            await store.forget(searchCredential(id));
            setKeyDraft(current => ({ ...current, [id]: '' }));
            invalidateCheck();
            onCredentialChange();
        }
        catch {
            setKeyError(msg('The credential store refused the change.'));
        }
    }
    const configured = enabledSources(discoverySettings);
    const descriptor = DISCOVERY_SOURCES[source];
    const present = sourceKeys[source] === true;
    const addressUsable = discoverySettings.backend !== 'custom' || usableCustomDiscoveryURL(discoverySettings.customUrl);
    const canTest = discoverySettings.external && addressUsable && discovery.engineReady && (custom || discoverySettings.sources[source] && present && !(keyDraft[source] ?? '').trim());
    const status = !discoverySettings.external
        ? { tone: 'unconfigured' as const, label: msg('Off') }
        : !custom && configured.length === 0 ? { tone: 'limited' as const, label: msg('No search source configured') }
        : !addressUsable ? { tone: 'error' as const, label: msg('settings.search.badAddress') }
        : !custom && !present ? { tone: 'unconfigured' as const, label: msg('settings.search.keyNeeded') }
        : !discovery.engineReady ? { tone: 'limited' as const, label: msg('settings.search.unavailable') }
        : check === 'checking' ? { tone: 'checking' as const, label: msg('Checking...') }
        : check === 'verified' ? { tone: 'connected' as const, label: msg('settings.search.passed') }
        : check === 'failed' ? { tone: 'error' as const, label: msg('settings.search.failed') }
        : check === 'empty' ? { tone: 'limited' as const, label: msg('settings.search.empty') }
        : { tone: 'unconfigured' as const, label: msg('settings.search.notTested') };
    return <>
        <h3>{msg('settings.search.title')}</h3>
        <SurfaceGroup>
            <SettingRow label={msg('settings.search.title')} setting="external-exploration">
                <Switch ariaLabel={msg('settings.search.title')} testId="external-exploration" checked={discoverySettings.external} onChange={checked => setDiscovery({ external: checked })} label={discoverySettings.external ? msg('On') : msg('Off')}/>
            </SettingRow>
        </SurfaceGroup>
        {!discoverySettings.external && <StatusLine {...status} testId="discovery-status"/>}
        {discoverySettings.external && <>
            <SurfaceGroup>
                {!custom && <>
                    <SettingRow label={msg('settings.search.provider')}>
                        <Select testId="search-provider" ariaLabel={msg('settings.search.provider')} value={source} onChange={value => setSource(value as DiscoverySourceId)} options={DISCOVERY_SOURCE_IDS.map(id => ({ value: id, label: DISCOVERY_SOURCES[id].label }))}/>
                    </SettingRow>
                    <SettingRow label={msg('settings.search.enable')}>
                        <Switch ariaLabel={descriptor.label} testId={`source-${source}`} checked={discoverySettings.sources[source]} onChange={checked => setDiscovery({ sources: { ...discoverySettings.sources, [source]: checked } })} label={discoverySettings.sources[source] ? msg('On') : msg('Off')}/>
                    </SettingRow>
                    <SettingRow label={msg('settings.ai.apiKey')} description={<ApiKeyLink url={descriptor.keyUrl}/>}>
                        <span className="settings-key-row">
                            <input aria-label={msg('settings.ai.apiKey')} id={`source-key-field-${source}`} type="password" autoComplete="off" data-testid={`source-key-${source}`} value={keyDraft[source] ?? ''} placeholder={present ? msg('Stored securely') : msg('Not set')} onChange={event => { activeRequest.current?.abort(); activeRequest.current = null; setCheck('idle'); setKeyDraft(current => ({ ...current, [source]: event.target.value })); }}/>
                            {present && !(keyDraft[source] ?? '').trim() ? <Button variant="outline" size="sm" data-testid={`source-key-remove-${source}`} onClick={() => void removeKey(source)}>{msg('Remove')}</Button> : <Button variant="solid" size="sm" data-testid={`source-key-save-${source}`} disabled={!(keyDraft[source] ?? '').trim()} onClick={() => void saveKey(source)}>{msg('Save')}</Button>}
                        </span>
                    </SettingRow>
                    {present && <p className="settings-note">{msg(secureStore ? 'settings.ai.keyStored' : 'settings.ai.keySession')}</p>}
                    {configured.length === 0 && <p className="settings-note" data-testid="discovery-empty">{msg('settings.search.chooseSource')}</p>}
                    {discovery.missingKey.length > 0 && <p className="settings-note" data-testid="discovery-missing-key">{msg(discovery.missingKey.length === 1 ? 'settings.search.missingKey' : 'settings.search.missingKeys', { count: discovery.missingKey.length })}</p>}
                    {keyError && <p className="settings-error" role="alert" data-testid="discovery-key-error">{keyError}</p>}
                </>}
                <div className="ui-group-footer"><StatusLine {...status} testId="discovery-status"/><Button variant="solid" size="sm" data-testid="search-test" disabled={!canTest || check === 'checking'} onClick={() => void testConnection()}>{msg('Test connection')}</Button></div>
                <p className="settings-note">{msg('settings.ai.testCost')}</p>
                {!custom && <p className="settings-note" data-testid="search-enabled-count">{msg('settings.search.enabledCount', { count: configured.length })}</p>}
            </SurfaceGroup>
            <Button variant="ghost" size="sm" data-testid="discovery-advanced" aria-expanded={advanced} onClick={() => setAdvanced(value => !value)}>{advanced ? msg('Hide advanced') : msg('Advanced')}</Button>
            {advanced && <SurfaceGroup title={msg('settings.search.extra')}>
                {!custom && DISCOVERY_SOURCE_IDS.filter(id => id !== source).map(id => <SettingRow label={DISCOVERY_SOURCES[id].label} key={id}><Switch ariaLabel={DISCOVERY_SOURCES[id].label} testId={`source-${id}`} checked={discoverySettings.sources[id]} onChange={checked => setDiscovery({ sources: { ...discoverySettings.sources, [id]: checked } })} label={discoverySettings.sources[id] ? msg('On') : msg('Off')}/></SettingRow>)}
                <SettingRow label={msg('settings.search.endpoint')} setting="discovery-backend"><Select testId="discovery-backend" ariaLabel={msg('settings.search.endpoint')} value={discoverySettings.backend} onChange={value => setDiscovery({ backend: value === 'custom' ? 'custom' : 'built-in' })} options={[{ value: 'built-in', label: msg('settings.search.builtin') }, { value: 'custom', label: msg('settings.search.custom') }]}/></SettingRow>
                {discoverySettings.backend === 'custom' && <SettingRow label={msg('settings.search.endpointUrl')}><input aria-label={msg('settings.search.endpointUrl')} data-testid="discovery-url" value={discoverySettings.customUrl} placeholder="https://example.org/normalized" onChange={event => setDiscovery({ customUrl: event.target.value })} onBlur={event => { try { setDiscovery({ customUrl: customDiscoveryURL(event.target.value) }); } catch { /* Keep invalid input visible for correction. */ } }}/></SettingRow>}
            </SurfaceGroup>}
        </>}
    </>;
}
