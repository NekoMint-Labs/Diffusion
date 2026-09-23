import { useState } from 'react';
import { Tabs } from '@base-ui/react/tabs';
import { t as msg } from '../../shared/i18n.ts';
import { INTERFACE_SIZES, THOUGHT_SIZE, type Settings } from '../settings.ts';
import type { ConnectionCheck, ThinkingCapabilities } from '../../ai/contracts.ts';
import type { ThinkingFailure } from '../../ai/errors.ts';
import type { DiscoverySourceId, DiscoveryStatus } from '../../discovery/contracts.ts';
import { Surface } from './Surface.tsx';
import { Select } from '../primitives/Select.tsx';
import { SettingRow } from '../primitives/SettingRow.tsx';
import { SurfaceGroup } from '../primitives/SurfaceGroup.tsx';
import { AISettings } from './AISettings.tsx';
import { SearchSettings } from './SearchSettings.tsx';
import { GLOBAL_TRANSIENT_SHELL_LAYOUT_ID } from '../motion.ts';
import { AppearanceSettings } from './AppearanceSettings.tsx';

/** Four sections answer four questions: how do I read and use this (General), what does the place
 * look like (Appearance), who helps it think (AI), and where may it look (Search & Evidence). Help
 * carries facts about the app; Settings carries only preferences. */
const SECTIONS = ['general', 'appearance', 'ai', 'search'] as const;
export type SettingsSection = typeof SECTIONS[number];
const sectionLabel: Record<SettingsSection, string> = {
    general: 'General', appearance: 'Appearance', ai: 'AI', search: 'Search & Evidence',
};

/** Settings is a dedicated place in the same window. Its anatomy is intentionally conventional:
 * Base UI owns the tab/select behavior, while repeated SettingRow/SurfaceGroup structures keep
 * every preference legible without turning the page into a repeated panel grid. */
export function SettingsSurface({ initialSection, settings, capabilities, check, modelList, modelFailure, verifying, configurationChanged, storedKeys, sourceKeys, secureStore, discovery, onChange, onVerify, onRefreshModels, onCredentialChange, onClose }: {
    initialSection?: SettingsSection | null;
    settings: Settings;
    capabilities: ThinkingCapabilities | null;
    check: ConnectionCheck | null;
    modelList: string[] | null;
    modelFailure: ThinkingFailure | null;
    verifying: 'models' | 'connection' | null;
    configurationChanged: boolean;
    storedKeys: Record<string, boolean>;
    sourceKeys: Partial<Record<DiscoverySourceId, boolean>>;
    secureStore: boolean;
    discovery: DiscoveryStatus;
    onChange: (settings: Settings) => void;
    onVerify: () => void;
    onRefreshModels: () => void;
    onCredentialChange: () => void;
    onClose: () => void;
}) {
    const [section, setSection] = useState<SettingsSection>(initialSection ?? 'general');
    const set = <K extends keyof Settings>(key: K, value: Settings[K]) => onChange({ ...settings, [key]: value });
    return <Surface title={msg('Field settings')} subtitle={msg('Preferences for this device. The Field itself is never changed here.')} level="window" className="settings-surface" sharedLayoutId={GLOBAL_TRANSIENT_SHELL_LAYOUT_ID} onClose={onClose}>
        <Tabs.Root className="settings-layout" orientation="vertical" value={section} onValueChange={next => setSection(next as SettingsSection)}>
            <Tabs.List className="settings-nav" aria-label={msg('Settings sections')} activateOnFocus>
                {SECTIONS.map(name => <Tabs.Tab key={name} value={name} data-section={name} className="settings-nav-tab">{msg(sectionLabel[name])}</Tabs.Tab>)}
            </Tabs.List>
            <div className="settings-form">
                <Tabs.Panel value="general" id="setting-general" className="settings-section">
                    <h3>{msg('General')}</h3>
                    <SurfaceGroup>
                        <SettingRow label={msg('Language')} setting="language">
                            <Select testId="locale-select" ariaLabel={msg('Language')} value={settings.locale}
                                onChange={value => set('locale', value as Settings['locale'])}
                                options={[{ value: 'system', label: msg('Follow system') }, { value: 'en', label: msg('English') }, { value: 'zh', label: msg('Chinese') }]}/>
                        </SettingRow>
                    </SurfaceGroup>
                    <SurfaceGroup title={msg('Type & interface')} description={msg('These scale the interface and your writing without changing the Field itself.')}>
                        <SettingRow label={msg('Thought typography')} description={msg('Typography applies to what you wrote, never to the interface around it.')} setting="typography">
                            <Select testId="typography-select" ariaLabel={msg('Thought typography')} value={settings.thoughtTypography}
                                onChange={value => set('thoughtTypography', value as Settings['thoughtTypography'])}
                                options={[{ value: 'serif', label: msg('Editorial Serif') }, { value: 'sans', label: msg('Quiet Sans') }]}/>
                        </SettingRow>
                        <SettingRow label={msg('Interface size')} description={msg('Applies to menus, Settings and every control, never to what you wrote.')} setting="interface-size">
                            <Select testId="interface-size-select" ariaLabel={msg('Interface size')} value={String(settings.interfaceSize)}
                                onChange={value => set('interfaceSize', Number(value))}
                                options={INTERFACE_SIZES.map(size => ({ value: String(size), label: `${size}%` }))}/>
                        </SettingRow>
                        <SettingRow label={msg('Thought size')} description={msg('Applies to what you wrote, in rest and while editing.')} setting="thought-size">
                            <Select testId="thought-size-select" ariaLabel={msg('Thought size')} value={String(settings.thoughtSize)}
                                onChange={value => set('thoughtSize', Number(value))}
                                options={Array.from({ length: THOUGHT_SIZE.max - THOUGHT_SIZE.min + 1 }, (_, index) => THOUGHT_SIZE.min + index).map(size => ({ value: String(size), label: `${size} px` }))}/>
                        </SettingRow>
                    </SurfaceGroup>
                </Tabs.Panel>
                <Tabs.Panel value="appearance" id="setting-appearance" className="settings-section">
                    <h3>{msg('Appearance')}</h3>
                    <AppearanceSettings settings={settings} onChange={onChange}/>
                </Tabs.Panel>
                <Tabs.Panel value="ai" id="setting-ai" className="settings-section">
                    <AISettings settings={settings} capabilities={capabilities} check={check} modelList={modelList} modelFailure={modelFailure} verifying={verifying} configurationChanged={configurationChanged} storedKeys={storedKeys} secureStore={secureStore} onChange={onChange} onVerify={onVerify} onRefreshModels={onRefreshModels} onCredentialChange={onCredentialChange}/>
                </Tabs.Panel>
                <Tabs.Panel value="search" id="setting-search" className="settings-section">
                    <SearchSettings settings={settings} discovery={discovery} sourceKeys={sourceKeys} secureStore={secureStore} onChange={onChange} onCredentialChange={onCredentialChange}/>
                </Tabs.Panel>
            </div>
        </Tabs.Root>
    </Surface>;
}
