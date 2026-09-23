import { useMemo } from 'react';
import { t } from '../../shared/i18n.ts';
import { makeThought, type Point } from '../../core/model.ts';
import type { ProjectController } from '../../core/controller.ts';
import type { SourceImporter } from '../../evidence/importer.ts';
import type { FieldHandle } from '../../field/Field.tsx';
import { RegionObserver } from '../../field/spatial/regions.ts';
import { placePossibility, type ResultPlacementMode } from '../../field/spatial/placement.ts';
import { useUI, type Surface as SurfaceName } from '../store.ts';
import { deviceFailureNotice, notice } from './notice.ts';
import { useFirstThoughtEmergence } from '../motion/signature.ts';
import { dismissGhostWithDissolve } from '../motion/spatialGrammar.ts';

/** What the person does to the Field itself.
 *
 * Creating, moving by duplication, copying, observing a new Region and opening a reference are
 * Field-scoped operations on canonical content: each one either dispatches one user command or
 * reads canonical state, and none of them owns presentation. `freePoint` is the one spatial
 * answer they share — a new object lands where the user is looking, never under the identity
 * block or a neighbour.
 */
export function useFieldActions({ controller, field, surfaces, importer }: {
    controller: ProjectController;
    field: { current: FieldHandle | null };
    surfaces: { openSurface: (surface: SurfaceName, origin?: Point) => void };
    importer: SourceImporter;
}) {
    const regions = useMemo(() => new RegionObserver(), []);
    const emergeFirstThought = useFirstThoughtEmergence();
    const anchor = () => field.current?.centerPoint() ?? { x: 300, y: 250 };
    const freePoint = (scopeIds: string[] = [], text = '', mode: ResultPlacementMode = 'default') => {
        const snapshot = controller.getSnapshot();
        return placePossibility(snapshot.project, snapshot.session, anchor(), 0, scopeIds, field.current?.viewBounds(), text, mode);
    };
    /** Regions are remembered structure, not history: an observation only dispatches when the
     * grouping actually changed. */
    function observe(ids: string[]) {
        const project = controller.getSnapshot().project;
        const next = regions.observe(project, ids);
        if (JSON.stringify(next) !== JSON.stringify(Object.values(project.regions)))
            controller.dispatch({ type: 'region.observe', regions: next }, 'system');
    }
    function createThoughtAt(point: Point) {
        const wasEmpty = !Object.keys(controller.getSnapshot().project.thoughts).length;
        const thought = makeThought('', { x: point.x - 16, y: point.y - 20 });
        controller.dispatch({ type: 'thought.create', thought });
        observe([thought.id]);
        useUI.getState().patch({ selection: [thought.id], editing: thought.id });
        // The first Thought of an empty Field establishes itself where the gesture happened, so a
        // Thought placed by a blank-Field double-click is not a dead path beside the one written in
        // the composer: same depth change, same typography resolution, a short local settle instead
        // of a flight from a writing surface the words never came from. Measured from the gesture's
        // own screen point, and only for a Thought that is actually establishing a new Field.
        if (wasEmpty)
            emergeFirstThought(thought.id, field.current?.screenPoint(point) ?? null, 'placement');
    }
    function duplicateThoughts(ids: string[]) {
        const now = Date.now();
        const created: string[] = [];
        // One deliberate action: one history step, however many Thoughts it copies.
        controller.batch(() => {
            for (const key of ids) {
                const thought = controller.getSnapshot().project.thoughts[key];
                if (!thought || thought.kind !== 'thought')
                    continue;
                const copy = { ...makeThought(thought.text, { x: thought.x + 26, y: thought.y + 26 }, now), kept: thought.kept };
                controller.dispatch({ type: 'thought.create', thought: copy });
                created.push(copy.id);
            }
        });
        if (created.length)
            useUI.getState().patch({ selection: created });
    }
    async function copyText(ids: string[]) {
        const texts = ids.map(key => controller.getSnapshot().project.thoughts[key]?.text).filter((text): text is string => Boolean(text));
        if (!texts.length)
            return;
        if (!navigator.clipboard) {
            notice(t('This window cannot reach the clipboard.'));
            return;
        }
        try {
            await navigator.clipboard.writeText(texts.join('\n\n'));
            notice(t('Copied to the clipboard.'));
        }
        catch {
            notice(t('This window cannot reach the clipboard.'));
        }
    }
    /** Keep protects an unfinished Thought from fading; letting fade reverses it without
     * deleting anything. Neither is a Crystal. */
    function keep(ids: string[]) { controller.dispatch({ type: 'thought.keep', ids }); }
    function fade(ids: string[]) { controller.dispatch({ type: 'thought.release', ids }); useUI.getState().patch({ selection: [] }); }
    function deleteThoughts(ids: string[]) {
        const snapshot = controller.getSnapshot();
        const canonical = ids.filter(key => !!snapshot.project.thoughts[key]);
        const ghosts = ids.filter(key => !!snapshot.session.ghosts[key]);
        if (canonical.length) controller.dispatch({ type: 'thought.delete', ids: canonical });
        for (const key of ghosts) dismissGhostWithDissolve(controller, key);
        useUI.getState().patch({ selection: [] });
    }
    function carry(ids: string[]) { useUI.getState().patch({ carry: ids }); }
    /** Dropped text is either a URL reference or a Thought; a dropped file is imported. */
    function dropText(text: string, point: Point) {
        try {
            const value = text.trim();
            if (!value)
                return;
            if (/^https?:\/\//i.test(value))
                importer.link(value.split('\n')[0], point);
            else {
                const wasEmpty = !Object.keys(controller.getSnapshot().project.thoughts).length;
                const thought = makeThought(value.slice(0, 20000), point);
                controller.dispatch({ type: 'thought.create', thought });
                useUI.getState().patch({ selection: [thought.id] });
                observe([thought.id]);
                if (wasEmpty)
                    emergeFirstThought(thought.id, field.current?.screenPoint(point) ?? null, 'placement');
            }
        }
        catch (error) {
            deviceFailureNotice('import', error);
        }
    }
    /** A reference surface opens beside the Thought that carries it, so provenance stays spatial. */
    function openSource(sourceId: string) {
        const thought = Object.values(controller.getSnapshot().project.thoughts).find(item => item.sourceId === sourceId);
        surfaces.openSurface('source');
        useUI.getState().patch({ sourceId, anchor: thought ? field.current?.screenPoint({ x: thought.x + 270, y: thought.y }) ?? null : null });
    }
    /** Opening a Region presents its members as the current scope. */
    function openRegion(regionId: string, point: Point) {
        const region = controller.getSnapshot().project.regions[regionId];
        if (!region)
            return;
        useUI.getState().patch({ selection: region.members });
        surfaces.openSurface('region');
        useUI.getState().patch({ regionId, anchor: field.current?.screenPoint(point) ?? null });
    }
    return { regions, anchor, freePoint, observe, createThoughtAt, duplicateThoughts, copyText, keep, fade, deleteThoughts, carry, dropText, openSource, openRegion };
}
