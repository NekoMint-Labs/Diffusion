import { t } from '../shared/i18n.ts';
import { useLocale } from './useLocale.ts';
import { CommandMenu } from './focus/CommandMenu.tsx';
import { CommandPalette } from './commands/CommandPalette.tsx';
import { APP_MENU, BLANK_MENU, FIELD_MENU, FIELD_MORE_MENU, buildCommands, contextualRows, menuRows } from './commands/compose.ts';
import type { CommandContext } from './commands/types.ts';
import { contextualActionModel } from './commands/contextualActionModel.ts';
import { detectPlatform } from './commands/shortcuts.ts';
import { useFindInField } from './find/useFindInField.ts';
import { useFieldRename } from './commands/useFieldRename.ts';
import { OpenFieldSurface } from './surfaces/OpenFieldSurface.tsx';
import { ShortcutsSurface } from './surfaces/ShortcutsSurface.tsx';
import { Surface } from './surfaces/Surface.tsx';
import { RestoreSurface } from './surfaces/RestoreSurface.tsx';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, LayoutGroup } from 'motion/react';
import { fieldSwitchSequence, settingsEnterSequence, settingsRecedeSequence, useSignature } from './motion/signature.ts';
import { asPickedFile, type PlatformAdapter } from '../platform/contracts.ts';
import type { Ghost, Point } from '../core/model.ts';
import type { ProjectController } from '../core/controller.ts';
import type { ProjectRepository } from '../storage/repository.ts';
import { Field, type FieldHandle } from '../field/Field.tsx';
import { useProject } from './hooks.ts';
import { useUI } from './store.ts';
import { ThreadSurface } from './thread/ThreadSurface.tsx';
import { CrystalPreview } from './surfaces/CrystalPreview.tsx';
import { SettingsSurface } from './surfaces/SettingsSurface.tsx';
import { Button } from './primitives/Button.tsx';
import { RelationSurface } from './focus/RelationSurface.tsx';
import { SourceSurface } from './reference/SourceSurface.tsx';
import { EvidenceSurface } from './reference/EvidenceSurface.tsx';
import { FindSurface } from './surfaces/FindSurface.tsx';
import { HistorySurface } from './surfaces/HistorySurface.tsx';
import { RegionSurface } from './surfaces/RegionSurface.tsx';
import { HandoffSurface } from './surfaces/HandoffSurface.tsx';
import { ForkSurface } from './surfaces/ForkSurface.tsx';
import { DiffuseSurface, DiffuseIndicator } from './surfaces/DiffuseSurface.tsx';
import { ActionPreviewSurface, type PreviewAction } from './surfaces/ActionPreviewSurface.tsx';
import { OrganizeSurface } from './surfaces/OrganizeSurface.tsx';
import { thinkingServiceChanged, type Settings } from './settings.ts';
import { isGlobalModal } from './transient.ts';
import { atmosphereRole, Atmosphere } from './atmosphere.tsx';
import { Speak } from './workspace/Speak.tsx';
import { FeedbackLine } from './workspace/Feedback.tsx';
import { THINKING_DEFAULTS } from './commands/thinking.ts';
import { useWorkspaceKeyboard } from './workspace/useWorkspaceKeyboard.ts';
import { useWorkspaceSettings } from './workspace/useWorkspaceSettings.ts';
import { useThinkingService } from './workspace/useThinkingService.ts';
import { useWorkspaceSurfaces } from './workspace/useWorkspaceSurfaces.ts';
import { useWorkspaceLifecycle } from './workspace/useWorkspaceLifecycle.ts';
import { useThinkingCapabilities } from './workspace/useThinkingCapabilities.ts';
import { useWorkspaceCapabilities } from './workspace/useWorkspaceCapabilities.ts';
import { useFieldActions } from './workspace/useFieldActions.ts';
import { useThinkingIntents } from './workspace/useThinkingIntents.ts';
import { useProjectActions } from './workspace/useProjectActions.ts';
import { notice, failureNotice, deviceFailureNotice, deviceFailureText } from './workspace/notice.ts';
import { presentMaterialSettle } from './motion/spatialGrammar.ts';
import type { NoticeActionKind } from './workspace/feedback.ts';
import type { SettingsSection } from './surfaces/SettingsSurface.tsx';
import { FirstFieldTutorialCoach, ProgressiveTutorialCoach, useFirstFieldTutorial } from './tutorial/FirstFieldTutorial.tsx';
interface Props {
    controller: ProjectController;
    repository: ProjectRepository;
    platform: PlatformAdapter;
    startupError: string;
    onSwitchProject: (id: string) => Promise<void>;
    /** This Field was opened by the user moments ago, so its arrival is worth showing. */
    arrived: boolean;
}
const ARRIVAL_HOLD = 4200;
/** The composition root.
 *
 * It constructs the systems the Field needs, connects them to each other, and renders the top
 * level. Ownership lives one level down: preferences and appearance in `useWorkspaceSettings`,
 * the thinking service in `useThinkingService`, which transient place owns input and where the
 * Field returns in `useWorkspaceSurfaces`, Field-scoped operations in `useFieldActions`, the ways
 * intent becomes thinking in `useThinkingIntents`, the Field as a file in `useProjectActions`,
 * and time/window concerns in `useWorkspaceLifecycle`.
 *
 * What remains here is deliberately only what cannot live in one system: the DOM refs the
 * command registry and the keyboard router share, the one notice line, the pending blank-Field
 * point that a right-click and the New thought command both need, and the command registry's
 * own projection into menus.
 */
export function Workspace({ controller, repository, platform, startupError, onSwitchProject, arrived }: Props) {
    useLocale();
    const { project, session, persistenceError } = useProject(controller);
    const ui = useUI();
    const root = useRef<HTMLElement>(null);
    const field = useRef<FieldHandle>(null);
    const speak = useRef<HTMLTextAreaElement>(null);
    const globalMore = useRef<HTMLButtonElement>(null);
    /** Arrival is a property of entering a Field, not of staying in one. */
    const [arrival, setArrival] = useState(arrived);
    useEffect(() => { if (!arrived)
        return; setArrival(true); const timer = setTimeout(() => setArrival(false), ARRIVAL_HOLD); return () => clearTimeout(timer); }, [arrived]);
    /**
     * Switching Fields is the one moment where the whole window changes identity, so it is an
     * authored sequence rather than a mount: the veil lifts, the identity settles, the Thoughts
     * that are already visible come up through the surface. GSAP owns it exclusively and the
     * first load stays quiet, because arriving somewhere new is the event worth showing.
     */
    useSignature(root, (element, tl) => { if (arrived)
        fieldSwitchSequence(element, tl); }, [arrived, project.id]);
    /**
     * Settings is a place arriving over the Field, so the Field acknowledges it: it pulls back a
     * touch while the place settles in two beats (navigation, then the section it points at).
     * Both sequences resolve to identity, and the surface owns input from the moment it exists —
     * this is only how the arrival looks. Reduced motion builds neither.
     */
    useSignature(root, (element, tl) => {
        if (ui.surface !== 'settings')
            return;
        settingsRecedeSequence(element, tl);
        settingsEnterSequence(element, tl);
    }, [ui.surface]);
    /** Where a blank right-click happened, so "New thought" can honour it. */
    const contextPoint = useRef<Point | null>(null);
    const [findEpoch, setFindEpoch] = useState(0);
    const [actionPreview, setActionPreview] = useState<{ action: PreviewAction; ids: string[] } | null>(null);
    const [organizeScope, setOrganizeScope] = useState<string[]>([]);
    const platformKind = useMemo(detectPlatform, []);

    const { settings, settingsRef, apply } = useWorkspaceSettings();
    /** What this build can do, asked once. Desktop may talk to a provider directly and ships its
     * discovery engine; a web deployment leads with the gateway. Nothing else in the product asks
     * the build type again. */
    const buildCapabilities = useMemo(() => platform.platformCapabilities(), [platform]);
    const capabilities = useWorkspaceCapabilities({ settings, settingsRef, platform: buildCapabilities });    const thinking = useThinkingCapabilities({
        selection: { provider: settings.provider, model: settings.model, thinkingDepth: settings.thinkingDepth, gateway: settings.gateway, token: settings.token, baseUrl: settings.baseUrl, protocol: settings.protocol },
        credentials: capabilities.credentials,
        keyPresent: capabilities.storedAIKeys[settings.provider] === true,
    });
    const { runtime, diffuse, evidence, importer, hooks, stopDiffuseForIntent } = useThinkingService({
        controller, repository, settings, settingsRef,
        credentials: capabilities.credentials,
        runTimes: { builtIn: capabilities.builtIn },
        discovery: capabilities.status,
    });
    const find = useFindInField({ project, reveal: ids => field.current?.reveal(ids) });
    const surfaces = useWorkspaceSurfaces({ controller, field, diffuse, runtime, find });
    const actions = useFieldActions({ controller, field, surfaces, importer });
    const closeMenu = () => { contextPoint.current = null; const menu = useUI.getState().menu; if (menu) surfaces.transient.closeMenu(menu); };
    const intents = useThinkingIntents({ controller, field, speak, surfaces, freePoint: actions.freePoint, observe: actions.observe, runtime, importer, settingsRef, stopDiffuseForIntent, closeMenu });
    const tutorial = useFirstFieldTutorial({ project, session, controller, field });
    const startDiffuse = (ids: string[]) => {
        const scopeIds = [...new Set(ids)].filter(key => !!controller.getSnapshot().project.thoughts[key]).slice(0, 24);
        if (!scopeIds.length) return;
        diffuse.clear();
        surfaces.setDiffuseScope(scopeIds);
        try {
            diffuse.start({
                scopeIds,
                prompt: t('Explore a few different ways to understand this, without settling it for me.'),
                steps: THINKING_DEFAULTS.directions,
                seconds: 60,
                projectSources: THINKING_DEFAULTS.fieldSources,
                web: THINKING_DEFAULTS.web && !!evidence,
            });
        }
        catch (error) { notice(t(error instanceof Error ? error.message : String(error))); }
    };
    const selectionAnchor = (ids: string[]) => {
        const thoughts = ids.map(key => controller.getSnapshot().project.thoughts[key]).filter((thought): thought is NonNullable<typeof thought> => Boolean(thought));
        if (!thoughts.length) return actions.anchor();
        const point = { x: thoughts.reduce((sum, thought) => sum + thought.x, 0) / thoughts.length, y: thoughts.reduce((sum, thought) => sum + thought.y, 0) / thoughts.length };
        return field.current?.screenPoint(point) ?? actions.anchor();
    };
    const openActionPreview = (action: PreviewAction, ids: string[]) => {
        const scopeIds = [...new Set(ids)].filter(key => !!controller.getSnapshot().project.thoughts[key]).slice(0, 24);
        if (!scopeIds.length) return;
        setActionPreview({ action, ids: scopeIds });
        surfaces.openSurface('action-preview', selectionAnchor(scopeIds));
    };
    const openOrganize = (ids: string[]) => {
        const scopeIds = [...new Set(ids)].filter(key => !!controller.getSnapshot().project.thoughts[key]).slice(0, 24);
        if (scopeIds.length < 3) return;
        setOrganizeScope(scopeIds);
        surfaces.openSurface('organize', selectionAnchor(scopeIds));
    };
    const runPreviewAction = async (preview: NonNullable<typeof actionPreview>, options: { count: 1 | 3 | 5; fieldSources: boolean; web: boolean }) => {
        surfaces.closeSurface(false);
        setActionPreview(null);
        if (preview.action === 'angle') {
            diffuse.clear();
            surfaces.setDiffuseScope(preview.ids);
            try {
                diffuse.start({ scopeIds: preview.ids, prompt: t('Explore a few genuinely different ways to understand this. Do not merely continue or restate the selected thought.'), steps: options.count, seconds: 60, projectSources: options.fieldSources, web: options.web && !!evidence, mode: 'angle' });
            } catch (error) { notice(t(error instanceof Error ? error.message : String(error))); }
            return;
        }
        stopDiffuseForIntent();
        const action = preview.action === 'continue' ? 'continue' : 'question';
        const prompt = preview.action === 'continue'
            ? `Continue this line of thought. Return ${options.count} distinct continuation proposal${options.count === 1 ? '' : 's'}.`
            : `Ask ${options.count} distinct question${options.count === 1 ? '' : 's'} that could move this thinking.`;
        await runtime.run(action, prompt, preview.ids, { maxCandidates: options.count, projectSources: options.fieldSources, activity: preview.action === 'continue' ? 'unfold' : 'radiate' });
    };
    const handleAIProposalAction = (ids: string[], action: 'keep' | 'continue' | 'angle' | 'answer' | 'ignore') => {
        if (tutorial.interceptProposalAction(ids, action)) return;
        const unique = [...new Set(ids)];
        if (action === 'ignore') {
            for (const key of unique) controller.dismissGhost(key);
            useUI.getState().patch({ selection: useUI.getState().selection.filter(key => !unique.includes(key)) });
            return;
        }
        presentMaterialSettle(unique);
        const claimed = controller.claimAll(unique);
        const claimedIds = claimed.map(thought => thought.id);
        if (!claimedIds.length) return;
        useUI.getState().patch({ selection: claimedIds });
        actions.observe(claimedIds);
        if (action === 'continue') openActionPreview('continue', claimedIds);
        else if (action === 'angle') openActionPreview('angle', claimedIds);
        else if (action === 'answer') intents.ask(claimedIds);
    };
    const fields = useProjectActions({ controller, repository, platform, diffuse, runtime, onSwitchProject, closeSurface: surfaces.closeSurface, closeMenu });
    useWorkspaceLifecycle({ controller, field });

    /** Changing the thinking service is a new intent: work for the previous one stops first. */
    function updateSettings(next: Settings) {
        if (thinkingServiceChanged(settingsRef.current, next)) { stopDiffuseForIntent(); runtime.cancel(); }
        apply(next);
    }
    function openContextMenu(menu: { scope: 'thought' | 'blank'; point: Point; world: Point }) {
        contextPoint.current = menu.scope === 'blank' ? menu.world : null;
        surfaces.transient.openMenu(null, menu.scope === 'blank' ? 'blank' : 'thought', { point: menu.point });
    }

    const rename = useFieldRename({ project, controller, focusField: () => field.current?.focus(), announce: notice });
    const commandContext: CommandContext = { project, selection: ui.selection, editing: ui.editing, surface: ui.surface, canUndo: controller.canUndo, canRedo: controller.canRedo };
    const commands = buildCommands({
        // Re-invoking Find must return focus to its query field even while it is already open.
        openSurface: (surface, origin) => { if (surface === 'find')
            setFindEpoch(value => value + 1); surfaces.openSurface(surface, origin); },
        controller,
        findRelation: intents.findRelation,
        ask: intents.ask,
        continueThinking: ids => openActionPreview('continue', ids),
        questions: ids => openActionPreview('ask', ids),
        openThread: (ids, deep) => { stopDiffuseForIntent(); intents.openThread(ids, deep); },
        previewCrystal: intents.previewCrystal,
        continueCrystal: intents.continueCrystal,
        openHandoff: key => { surfaces.openSurface('handoff'); ui.patch({ handoffId: key }); },
        openSource: actions.openSource,
        openDiffuse: ids => openActionPreview('angle', ids),
        organize: openOrganize,
        carry: actions.carry,
        keep: actions.keep,
        fade: actions.fade,
        beginRename: rename.begin,
        createField: () => void fields.createField(false),
        duplicateField: () => void fields.duplicateField(),
        exportArchive: () => void fields.exportCanonical(),
        exportMarkdown: () => void fields.exportMarkdown(),
        newThought: () => { const point = contextPoint.current ?? actions.freePoint(); contextPoint.current = null; actions.createThoughtAt(point); },
        duplicateThoughts: actions.duplicateThoughts,
        copyText: ids => void actions.copyText(ids),
        deleteThoughts: actions.deleteThoughts,
        zoomOut: () => field.current?.zoomOut(),
    });
    const scope = ui.menu?.scope;
    /** Where Settings should open when a failure's own control sent the user there: a message that
     * says "check the API key" must land on the field that holds it, not on General. */
    const [settingsSection, setSettingsSection] = useState<SettingsSection | null>(null);
    function runNoticeAction(kind: NoticeActionKind) {
        if (kind === 'retry') {
            // The composed intent is still in the composer, so this is a true retry of the same words.
            void intents.submit();
            return;
        }
        setSettingsSection(kind === 'search-settings' ? 'search' : 'ai');
        surfaces.openSurface('settings');
    }
    const actionModel = contextualActionModel(commands, commandContext);
    const selectedGhosts = ui.selection.map(key => session.ghosts[key]).filter((ghost): ghost is Ghost => !!ghost);
    const ghostMenu = selectedGhosts.length > 0 && selectedGhosts.length === ui.selection.length && !selectedGhosts.some(ghost => ghost.proposal);
    const ghostQuestion = ghostMenu && selectedGhosts.every(ghost => ghost.proposalKind === 'question');
    const ghostRows = ghostMenu ? [
        ...(ghostQuestion ? [{ id: 'answer', label: t('Answer'), run: () => handleAIProposalAction(ui.selection, 'answer') }] : []),
        { id: 'keep', label: t('Keep this'), run: () => handleAIProposalAction(ui.selection, 'keep') },
        { id: 'ignore', label: t('Ignore'), run: () => handleAIProposalAction(ui.selection, 'ignore') },
    ] : [];
    const menuItems = ui.menu
        ? scope === 'thought' && ghostMenu ? ghostRows : scope === 'thought'
            ? contextualRows(commands, commandContext, ui.menu.mode === 'secondary' ? actionModel.secondary : actionModel.primary, platformKind)
            : menuRows(commands, commandContext, scope === 'global' ? APP_MENU : scope === 'field' ? FIELD_MENU : BLANK_MENU, platformKind)
        : [];
    const menuMoreItems = ghostMenu ? [] : ui.menu?.scope === 'thought' && ui.menu.mode !== 'secondary'
        ? contextualRows(commands, commandContext, actionModel.secondary, platformKind)
        : ui.menu?.scope === 'field'
            ? menuRows(commands, commandContext, FIELD_MORE_MENU, platformKind)
            : [];
    const runScopeAction = (id: string) => { if (!tutorial.interceptScopeAction(id)) commands.find(command => command.id === id)?.run(commandContext); };
    const findOpen = ui.surface === 'find';
    useWorkspaceKeyboard({ commands, context: commandContext, speak, closeSurface: () => surfaces.closeSurface(), closeMenu, onExitSpeak: intents.exitSpeak });
    /** A possibility reaches the Field through this one route, whatever produced it. */
    hooks.current = {
        pending: busy => ui.patch({ busy }),
        operation: operation => ui.patch({ operation, busy: operation.phase === 'pending' }),
        notice,
        // A provider failure arrives as a classified fact with the control that resolves it. [Retry]
        // re-sends the composer, so it is offered only when the composer holds the very words the
        // failed request came from — never for a failure raised by a Thread's own input or by an
        // exploration.
        failure: (failure, subject) => failureNotice(failure, subject, intents.retryable.current),
        anchor: actions.anchor,
        bounds: () => field.current?.viewBounds() ?? { x: 0, y: 0, width: 1440, height: 900 },
        route: (kind, text, ids, provider) => { if (kind === 'crystal')
            intents.previewCrystal(ids, text);
        else
            intents.openThread(ids, kind === 'deep', text, provider); },
    };
    return <main className="app" data-active-surface={ui.surface} ref={root}>
  {/* Atmosphere is presentation state, never semantic state: the Field's material is lit by
      what is transiently happening, not by what the Field means. A selection is a scope, and a
      scope is a fact about attention *right now*, so the place shifts its local illumination
      while one exists — the same transient vocabulary, one source. */}
  <Atmosphere role={atmosphereRole({ busy: ui.busy, diffuse: ui.surface === 'diffuse', scoped: ui.selection.length > 0 })} appearance={settings.appearance}/>
  <header className="identity">
  <span className="identity-eyebrow">{t('Field')}</span>
  <div className="identity-row">{rename.draft === null
        ? <h1><button type="button" key={project.id} className="identity-title" data-testid="field-title" aria-haspopup="menu" aria-expanded={scope === 'field'} aria-controls={scope === 'field' ? 'field-command-menu' : undefined} onClick={event => surfaces.transient.openMenu(event.currentTarget, 'field')}>{project.id === 'demo' ? t(project.title) : project.title}</button></h1>
        : <div className="identity-rename-shell" data-testid="field-rename-shell"><h1><input className="identity-rename" data-testid="field-rename" autoFocus aria-label={t('Rename Field')} value={rename.draft} maxLength={120} onFocus={event => event.currentTarget.select()} onChange={event => rename.change(event.target.value)} onBlur={rename.commit} onKeyDown={event => { if (event.key === 'Enter') {
            event.preventDefault();
            rename.commit();
        } if (event.key === 'Escape') {
            event.preventDefault();
            rename.cancel();
        } }}/></h1><p className="identity-rename-hint">{t('Enter to save / Escape to cancel')}</p></div>}
  {project.fork && <span className="identity-detail">{t('Fork')}</span>}</div>
  {arrival && <span className="identity-arrival" data-testid="field-arrival-hint" data-decoration="arrival">{t('A new Field. Nothing has grown here yet.')}</span>}
  </header>
  {arrival && <div className="field-arrival" data-testid="field-arrival" aria-hidden="true"/>}
  <nav className="global-actions"><Button variant="ghost" size="sm" ref={globalMore} data-testid="global-more" aria-label={t('Field menu')} aria-haspopup="menu" aria-expanded={ui.menu?.scope === 'global'} aria-controls={ui.menu?.scope === 'global' ? 'global-command-menu' : undefined} onClick={event => surfaces.transient.openMenu(event.currentTarget, 'global')}><span aria-hidden="true">{'···'}</span></Button></nav>
  <Field ref={field} fieldStyle={settings.appearance.fieldStyle} controller={controller} onProbeRelation={intents.findRelation} scopeActions={actionModel.primary} onScopeAction={runScopeAction} onKeepAllProposals={intents.keepAllProposals} onKeepOriginalProposal={intents.keepOriginalProposal} onAIProposalAction={handleAIProposalAction} onMore={trigger => surfaces.transient.openMenu(trigger, 'thought', { mode: 'secondary' })} onSource={actions.openSource} onRegion={actions.openRegion} onRelation={(relationId, point) => { surfaces.openSurface('relation'); ui.patch({ relationId, anchor: field.current?.screenPoint(point) ?? null }); }} onDropFiles={(files, point) => void importer.files(files.map(asPickedFile), point).catch(error => deviceFailureNotice('import', error))} onDropText={actions.dropText} onObserve={actions.observe} onCreateThought={actions.createThoughtAt} onContextMenu={openContextMenu} onRevealMatch={find.focusMatch} find={findOpen ? { matches: find.matchSet, current: find.current } : null}/>
  <LayoutGroup id="global-transient-surfaces">
  <AnimatePresence initial={false}>
  {ui.menu && <CommandMenu key="menu" anchor={ui.menu.anchor} point={ui.menu.point} rows={menuItems} moreRows={menuMoreItems} scope={ui.menu.scope} note={ui.menu.scope === 'field' ? t('Saved on this device as you work.') : undefined} placement={ui.menu.mode === 'secondary' ? 'right-start' : ui.menu.point ? 'bottom-start' : 'bottom-end'} onClose={() => surfaces.transient.closeMenu(ui.menu!)}/>}
  {ui.surface === 'palette' && <CommandPalette key="palette" commands={commands} context={commandContext} platform={platformKind} onClose={() => surfaces.closeSurface()}/>}
  {ui.surface === 'settings' && <SettingsSurface key="settings" initialSection={settingsSection} settings={settings} capabilities={thinking.capabilities} check={thinking.check} modelList={thinking.models} modelFailure={thinking.modelFailure} verifying={thinking.busy} configurationChanged={thinking.dirty} storedKeys={capabilities.storedAIKeys} sourceKeys={capabilities.storedSourceKeys} secureStore={buildCapabilities.secureCredentials} discovery={capabilities.status} onChange={updateSettings} onVerify={thinking.verify} onRefreshModels={thinking.refreshModels} onCredentialChange={capabilities.refreshPresence} onClose={() => surfaces.closeSurface()}/>}
  </AnimatePresence>
  </LayoutGroup>
  {/* Owned places recede; a projection anchored to a Thought or a pointer closes at once. */}
  <AnimatePresence initial={false}>
  {ui.surface === 'import' && <Surface key="import" title={t('Import / Restore')} level="anchored" onClose={() => surfaces.closeSurface()}><p className="muted">{t('Drop anything, best effort. Unsupported files stay honestly limited.')}</p><div className="stack-actions"><Button variant="solid" onClick={() => { surfaces.closeSurface(false); void platform.pickFiles().then(files => importer.files(files, actions.freePoint())).catch(error => deviceFailureNotice('import', error)); }}>{t('Choose files')}</Button><Button variant="outline" onClick={() => surfaces.openSurface('restore')}>{t('Restore a project export...')}</Button></div></Surface>}
  {ui.surface === 'help' && <Surface key="help" title={t('Help')} level="window" className="help-surface" onClose={() => surfaces.closeSurface()}><p>{t('Double-click blank space to write. Drag blank space to move around. Drag a Thought to move it.')}</p><p>{t('Shift-drag blank space to select several Thoughts. Wheel or pinch to zoom. F focuses the current selection. 0 fits the Field.')}</p><p className="muted">{t('Selection defines scope; it never calls AI. Shift-click adds or removes one Thought.')}</p><div className="stack-actions"><Button variant="solid" onClick={() => { surfaces.closeSurface(false); tutorial.start(); }}>{t('Restart First Field Tutorial')}</Button><Button variant="outline" onClick={() => void fields.createField(true)}>{t('Explore an example Field')}</Button><Button variant="outline" onClick={() => void fields.createField(false)}>{t('Create an empty Field')}</Button><Button variant="ghost" onClick={() => { surfaces.closeSurface(false); field.current?.zoomOut(); }}>{t('Zoom toward Atlas')}</Button><Button variant="ghost" onClick={() => surfaces.openSurface('shortcuts')}>{t('Keyboard Shortcuts')}</Button></div><h4>{t('About')}</h4><dl className="settings-kv"><div><dt>{t('Storage')}</dt><dd>{t('Saved in this browser, on this device.')}</dd></div><div><dt>{t('Export format')}</dt><dd>{t('A complete Diffusion file (.json) or a readable Markdown document.')}</dd></div><div><dt>{t('Thinking service')}</dt><dd>{settings.provider === 'gateway' ? t('Diffusion Gateway') : settings.provider === 'demo' ? t('Demo / deterministic, not a model') : settings.provider === 'off' ? t('Off / manual Field only') : t('Direct provider')}</dd></div><div><dt>{t('Discovery engine')}</dt><dd>{capabilities.status.engine === 'custom' ? t('Custom HTTP') : capabilities.status.engine === 'built-in' ? t('Built-in') : t('Not available in this build')}</dd></div></dl></Surface>}
  </AnimatePresence>
  {(ui.surface === 'thread' || ui.surface === 'thread-focus') && ui.threadId && <ThreadSurface controller={controller} runtime={runtime} threadId={ui.threadId} onClose={() => surfaces.closeSurface()} onFocus={() => surfaces.openSurface('thread-focus')} onReturn={() => ui.patch({ surface: 'thread' })} anchor={actions.anchor} beforeSend={stopDiffuseForIntent}/>}
  {ui.surface === 'crystal' && surfaces.draft && <CrystalPreview key={surfaces.draft.targetId ?? surfaces.draft.scopeIds.join(',')} controller={controller} draft={surfaces.draft} point={actions.freePoint(surfaces.draft.scopeIds, surfaces.draft.text, 'landmark')} onClose={() => surfaces.closeSurface()}/>}
  {ui.surface === 'action-preview' && actionPreview && <ActionPreviewSurface action={actionPreview.action} anchor={ui.anchor ?? undefined} allowSources={true} allowWeb={actionPreview.action === 'angle' && !!evidence} onRun={options => void runPreviewAction(actionPreview, options)} onClose={() => { setActionPreview(null); surfaces.closeSurface(false); }}/>}
  {ui.surface === 'organize' && organizeScope.length >= 3 && <OrganizeSurface controller={controller} runtime={runtime} scopeIds={organizeScope} anchor={ui.anchor ?? undefined} onClose={() => { setOrganizeScope([]); surfaces.closeSurface(false); }}/>}

  {ui.surface === 'relation' && ui.relationId && <RelationSurface controller={controller} relationId={ui.relationId} anchor={ui.anchor ?? undefined} onClose={() => surfaces.closeSurface()}/>}
  {ui.surface === 'source' && ui.sourceId && project.sources[ui.sourceId] && <SourceSurface source={project.sources[ui.sourceId]} repository={repository} platform={platform} anchor={ui.anchor ?? undefined} onRead={evidence ? signal => importer.read(ui.sourceId!, evidence, '', signal) : undefined} onClose={() => surfaces.closeSurface()}/>}
  {ui.surface === 'evidence' && <EvidenceSurface onOpen={url => void platform.openExternal(url).catch(error => deviceFailureNotice('link', error))} provider={evidence} initial={ui.selection.map(k => project.thoughts[k]?.text ?? '').join(' ').slice(0, 1000)} scopeIds={[...ui.selection]} onBring={intents.bringEvidence} onConfigure={() => runNoticeAction('search-settings')} onClose={() => surfaces.closeSurface()}/>}
  {ui.surface === 'find' && <FindSurface key={findEpoch} query={find.query} count={find.matches.length} index={find.index} onQuery={find.search} onNavigate={find.step} onClose={() => surfaces.closeSurface()}/>}
  <AnimatePresence initial={false}>
  {ui.surface === 'history' && <HistorySurface key="history" project={project} scope={surfaces.historyScope} onClose={() => surfaces.closeSurface()}/>}
  {ui.surface === 'shortcuts' && <ShortcutsSurface key="shortcuts" commands={commands} platform={platformKind} onClose={() => surfaces.closeSurface()}/>}
  {ui.surface === 'fields' && <OpenFieldSurface key="fields" repository={repository} currentId={project.id} onSwitch={fields.switchField} onCreate={() => void fields.createField(false)} onClose={() => surfaces.closeSurface()}/>}
  </AnimatePresence>
  {ui.surface === 'region' && ui.regionId && project.regions[ui.regionId] && <RegionSurface region={project.regions[ui.regionId]} anchor={ui.anchor ?? undefined} onRename={name => controller.dispatch({ type: 'region.rename', id: ui.regionId!, name })} onAsk={() => intents.openThread(project.regions[ui.regionId!].members)} onCrystal={() => intents.previewCrystal(project.regions[ui.regionId!].members)} onDiffuse={() => startDiffuse(project.regions[ui.regionId!].members)} onClose={() => surfaces.closeSurface()}/>}
  {ui.surface === 'handoff' && ui.handoffId && <HandoffSurface project={project} crystalId={ui.handoffId} platform={platform} onClose={() => surfaces.closeSurface()}/>}
  {ui.surface === 'fork' && <ForkSurface project={project} repository={repository} flush={fields.ensureSaved} onSwitch={async key => { diffuse.stop('Switching worlds.'); runtime.cancel(); await onSwitchProject(key); }} point={actions.anchor()} onClose={() => surfaces.closeSurface()}/>}
  {ui.surface === 'diffuse' && <DiffuseSurface session={diffuse} project={project} scopeIds={surfaces.diffuseScope} canWeb={!!evidence} onBring={intents.bringEvidence} onClose={() => surfaces.closeSurface(false)}/>}
  <AnimatePresence initial={false}>{ui.surface === 'restore' && <RestoreSurface key="restore" platform={platform} repository={repository} onSwitch={onSwitchProject} onClose={() => surfaces.closeSurface()}/>}</AnimatePresence>
  <DiffuseIndicator session={diffuse} onReview={() => surfaces.openSurface('diffuse')}/>
    <AnimatePresence initial={false}>{(intents.speakScope !== null || !ui.selection.length) && !isGlobalModal(ui.surface) && !ui.menu && <Speak key="speak" textareaRef={speak} words={intents.words} onWords={intents.setWords} onSubmit={() => intents.submit({ localOnly: tutorial.active })} onStop={() => { stopDiffuseForIntent(); runtime.cancel(); }} onCompose={intents.compose} onExit={intents.exitSpeak} composing={intents.speakScope !== null} empty={!Object.keys(project.thoughts).length && !Object.keys(session.ghosts).length && !(ui.operation?.kind === 'ingest' && ui.operation.phase === 'pending')} typography={settings.thoughtTypography} scopeIds={intents.speakScope ?? []}/>}</AnimatePresence>
   {(startupError || persistenceError || ui.notice) && <FeedbackLine text={persistenceError ? deviceFailureText('save') : t(startupError || ui.notice)} tone={persistenceError || startupError ? 'error' : ui.noticeTone} secondary={ui.notice === t('Demo possibilities / no live model was used.') ? 'demo' : undefined} action={persistenceError ? <Button variant="ghost" size="sm" onClick={() => void fields.exportCanonical()}>{t('Export')}</Button> : ui.noticeAction ? <Button variant="ghost" size="sm" data-testid="notice-action" onClick={() => runNoticeAction(ui.noticeAction!.kind)}>{t(ui.noticeAction.label)}</Button> : undefined}/>}
   <FirstFieldTutorialCoach active={tutorial.active} phase={tutorial.phase} settled={tutorial.settled} onSkip={tutorial.skip} onFinish={tutorial.finish}/>
   <ProgressiveTutorialCoach enabled={!tutorial.active}/>
 </main>;
}
