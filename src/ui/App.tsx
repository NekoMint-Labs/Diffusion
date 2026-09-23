import { createProject } from '../core/model.ts';
import { t, setLocale } from '../shared/i18n.ts';
import { loadSettings } from './settings.ts';
import { useLocale } from './useLocale.ts';
import { reenterProject } from '../core/validation.ts';
import { useEffect, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { demoProject, performanceProject, performanceSession } from '../core/demo.ts';
import { ProjectController } from '../core/controller.ts';
import { DexieRepository } from '../storage/dexie.ts';
import { createPlatform } from '../platform/index.ts';
import { BrowserPlatformAdapter } from '../platform/browser.ts';
import type { PlatformAdapter } from '../platform/contracts.ts';
import { Workspace } from './Workspace.tsx';
import { deviceFailureText } from './workspace/notice.ts';
import { useUI } from './store.ts';
setLocale(loadSettings().locale);
const repository = new DexieRepository();
const currentWorld = () => { try {
    return localStorage.getItem('diffusion-active-project') || 'main';
}
catch {
    return 'main';
} };
export default function App() {
    useLocale();
    const [platform, setPlatform] = useState<PlatformAdapter | null>(null);
    const [controller, setController] = useState<ProjectController | null>(null);
    const [startupError, setStartupError] = useState('');
    /** Entering a Field the user just created or opened is a state change worth showing. */
    const [arrivedId, setArrivedId] = useState<string | null>(null);
    useEffect(() => {
        let active = true;
        const params = new URLSearchParams(location.search);
        const count = Number(params.get('count') ?? 100);
        const perf = location.pathname === '/perf';
        const demo = location.pathname === '/demo';
        if (params.get('locale') === 'zh' || params.get('locale') === 'en') setLocale(params.get('locale') as 'en' | 'zh');
        void (async () => { try {
            const adapter = await createPlatform();
            if (active)
                setPlatform(adapter);
            const p = perf ? performanceProject([100, 500, 2000, 5000].includes(count) ? count : 100) : demo ? (await repository.loadProject('demo')) ?? demoProject() : (await repository.loadProject(currentWorld())) ?? (await repository.loadProject('main')) ?? createProject('main', t('Untitled'));
            const c = new ProjectController(reenterProject(p), perf ? async () => { } : state => repository.saveProject(state));
            if (perf) {
                c.setSession(performanceSession(p));
                if (active)
                    setStartupError(t('Performance fixture / changes are not saved. Export anything worth keeping.'));
            }
            if (active)
                setController(c);
            if (!perf)
                c.retrySave();
        }
        catch (error) {
            if (active) {
                console.error('[diffusion]', 'storage', error);
                setPlatform(new BrowserPlatformAdapter());
                setStartupError(deviceFailureText('storage'));
                setController(new ProjectController(createProject('main', t('Untitled')), async () => { throw new Error(t('Storage unavailable. Export before leaving.')); }));
            }
        } })();
        return () => { active = false; };
    }, []);
    const switchProject = async (projectId: string) => { if (!controller)
        return; await controller.flush(); if (controller.getSnapshot().persistenceError)
        throw new Error(t('Save failed. Export this Field before switching worlds.')); const project = await repository.loadProject(projectId); if (!project)
        throw new Error(t('The requested world could not be loaded.')); useUI.getState().patch({ selection: [], editing: null, surface: 'none', threadId: null, sourceId: null, regionId: null, relationId: null, returnPoint: null, carry: [], busy: false, operation: null, notice: '' }); setController(new ProjectController(reenterProject(project), state => repository.saveProject(state))); setArrivedId(projectId); try {
        localStorage.setItem('diffusion-active-project', projectId);
    }
    catch { /* Re-entry falls back to Main. */ } };
    if (!controller || !platform)
        return <main className="app"><p style={{ padding: 40 }}>{t('Opening the Field...')}</p></main>;
    return <MotionConfig reducedMotion="user"><Workspace key={controller.getSnapshot().project.id} controller={controller} repository={repository} platform={platform} startupError={startupError} arrived={arrivedId === controller.getSnapshot().project.id} onSwitchProject={switchProject}/></MotionConfig>;
}
