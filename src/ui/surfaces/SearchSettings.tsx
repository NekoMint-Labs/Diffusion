import { useState } from 'react';
import { t as msg } from '../../shared/i18n.ts';
import type { Settings } from '../settings.ts';
import { DISCOVERY_SOURCE_IDS, DISCOVERY_SOURCES, enabledSources, usableCustomDiscoveryURL, type DiscoverySettings, type DiscoverySourceId, type DiscoveryStatus } from '../../discovery/contracts.ts';
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
export function SearchSettings({ settings, discovery, sourceKeys, secureStore, onChange, onCredentialChange }: {
    settings: Settings;
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
    const discoverySettings = settings.discovery;
    const setDiscovery = (next: Partial<DiscoverySettings>) => onChange({ ...settings, discovery: { ...discoverySettings, ...next } });

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
            onCredentialChange();
        }
        catch {
            setKeyError(msg('The credential store refused the change.'));
        }
    }
    const configured = enabledSources(discoverySettings);
    /** Whether the address the person typed is an endpoint Diffusion could use at all. */
    const addressUsable = discoverySettings.backend !== 'custom' || usableCustomDiscoveryURL(discoverySettings.customUrl);
    /** "Available" may only be said about a search that could actually run: an engine that exists
     * here and a source that holds a key. Every state below names the one thing that is actually
     * missing, so the line beside the switch never disagrees with the controls in front of it — a
     * source that is visibly on was once reported as "no search source configured", and an address
     * that could never answer was reported as a missing engine. */
    const status = !discoverySettings.external
        ? { tone: 'unconfigured' as const, label: msg('Off'), detail: msg('Nothing outside this Field will be searched.') }
        // A source is the first thing to choose, whether or not this build has an engine: saying
        // "not available here" before anything is selected would answer a question nobody asked.
        : !configured.length
            ? { tone: 'limited' as const, label: msg('No search source configured'), detail: msg('You can still explore your Field with AI.') }
            : !addressUsable
                ? { tone: 'limited' as const, label: msg('The discovery address is not usable'), detail: msg('Enter an HTTPS address, or plain HTTP on loopback.') }
                : !discovery.engineReady
                    // The bundled engine is a property of the build, and pointing Diffusion at an
                    // endpoint of your own is the one way out of it — so the state names that way out
                    // instead of only reporting the absence.
                    ? { tone: 'limited' as const, label: msg('Not available in this build'), detail: msg('This build ships no search engine. Advanced discovery can point Diffusion at a search endpoint of your own; without one, AI still explores what is already here.') }
                    : discovery.ready.length
                        ? { tone: 'connected' as const, label: msg('Available'), detail: discovery.ready.length === 1 ? msg('1 discovery source enabled') : msg('{count} discovery sources enabled', { count: discovery.ready.length }) }
                        // Engine fine, source on, key missing: a search still cannot run, and the note
                        // beside the source names exactly that. "Available" here would be the same
                        // promise the audit removed.
                        : { tone: 'limited' as const, label: msg('A key is still needed'), detail: msg('You can still explore your Field with AI.') };
    return <>
        <h3>{msg('Search & Evidence')}</h3>
        <p className="settings-note">{msg('Exploration outside this Field is optional. Without it, AI still explores what is already here.')}</p>
        <SurfaceGroup>
            <SettingRow label={msg('External exploration')} setting="external-exploration">
                <Switch ariaLabel={msg('External exploration')} testId="external-exploration" checked={discoverySettings.external} onChange={checked => setDiscovery({ external: checked })} label={discoverySettings.external ? msg('On') : msg('Off')}/>
            </SettingRow>
            <div className="ui-group-status"><StatusLine {...status} testId="discovery-status"/></div>
        </SurfaceGroup>
        {discoverySettings.external && <>
            <SurfaceGroup title={msg('Search sources')}>
                {DISCOVERY_SOURCE_IDS.map(id => {
                    const descriptor = DISCOVERY_SOURCES[id];
                    const on = discoverySettings.sources[id];
                    const present = sourceKeys[id] === true;
                    return <div className="settings-source" data-source={id} key={id}>
                        <SettingRow label={msg(descriptor.label)}>
                            <Switch ariaLabel={msg(descriptor.label)} testId={`source-${id}`} checked={on} onChange={checked => setDiscovery({ sources: { ...discoverySettings.sources, [id]: checked } })} label={on ? msg('On') : msg('Off')}/>
                        </SettingRow>
                        {on && <div className="ui-setting-inset">
                            <label className="setting-field" htmlFor={`source-key-field-${id}`}>{msg('API key')}
                                <span className="settings-key-row">
                                    <input id={`source-key-field-${id}`} type="password" autoComplete="off" data-testid={`source-key-${id}`} value={keyDraft[id] ?? ''} placeholder={present ? msg('Stored securely') : msg('Not set')} onChange={event => setKeyDraft(current => ({ ...current, [id]: event.target.value }))}/>
                                    {present && !(keyDraft[id] ?? '').trim()
                                        ? <Button variant="outline" size="sm" data-testid={`source-key-remove-${id}`} onClick={() => void removeKey(id)}>{msg('Remove')}</Button>
                                        : <Button variant="solid" size="sm" data-testid={`source-key-save-${id}`} disabled={!(keyDraft[id] ?? '').trim()} onClick={() => void saveKey(id)}>{msg('Save')}</Button>}
                                </span>
                            </label>
                            <p className="settings-note">{present ? msg('A key is stored in this device\u2019s secure store. It is never written to Settings, an export, or a log.') : msg('Create a key at {site}.', { site: descriptor.keyHint })}</p>
                            {!secureStore && <p className="settings-note">{msg('This build keeps the key for this session only. It is never written to disk.')}</p>}
                        </div>}
                    </div>;
                })}
                {!configured.length && <p className="settings-note ui-setting-inset" data-testid="discovery-empty">{msg('Choose at least one source. Exploration still works without one — it just stays inside this Field.')}</p>}
                {discovery.missingKey.length > 0 && <p className="settings-note ui-setting-inset" data-testid="discovery-missing-key">{discovery.missingKey.length === 1 ? msg('1 enabled source still needs a key.') : msg('{count} enabled sources still need a key.', { count: discovery.missingKey.length })}</p>}
                {keyError && <p className="settings-error ui-setting-inset" data-testid="discovery-key-error">{keyError}</p>}
            </SurfaceGroup>
            <p className="settings-note">{msg('Reading a page happens automatically when a source is opened. Diffusion keeps only the passage it actually matched, with its location.')}</p>
            <SurfaceGroup>
                <div className="ui-disclosure-row">
                    <Button variant="ghost" size="sm" data-testid="discovery-advanced" onClick={() => setAdvanced(value => !value)} aria-expanded={advanced}>{advanced ? msg('Hide advanced discovery') : msg('Advanced discovery')}</Button>
                </div>
                {advanced && <div className="ui-disclosure-content">
                    <SettingRow label={msg('Discovery backend')} description={discoverySettings.backend === 'built-in' ? msg('Built-in uses the discovery engine that ships with Diffusion. It is normally the right choice.') : msg('Custom HTTP posts to your own normalized search and read service, for self-hosting or an alternative engine.')} setting="discovery-backend">
                        <Select testId="discovery-backend" ariaLabel={msg('Discovery backend')} value={discoverySettings.backend}
                            onChange={value => setDiscovery({ backend: value === 'custom' ? 'custom' : 'built-in' })}
                            options={[{ value: 'built-in', label: msg('Built-in') }, { value: 'custom', label: msg('Custom HTTP') }]}/>
                    </SettingRow>
                    {discoverySettings.backend === 'custom' && <div className="ui-setting-inset"><label className="setting-field">{msg('Discovery URL')}
                        <input data-testid="discovery-url" value={discoverySettings.customUrl} placeholder="https://example.org/normalized" onChange={event => setDiscovery({ customUrl: event.target.value })} onBlur={event => { try { setDiscovery({ customUrl: customDiscoveryURL(event.target.value) }); } catch { /* An unusable URL stays as typed; the ready state already refuses it. */ } }}/>
                    </label></div>}
                </div>}
            </SurfaceGroup>
        </>}
    </>;

}
