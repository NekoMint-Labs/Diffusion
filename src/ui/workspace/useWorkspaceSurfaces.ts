import { useState } from 'react';
import type { Point } from '../../core/model.ts';
import type { ProjectController } from '../../core/controller.ts';
import type { DiffuseSession } from '../../ai/diffuse.ts';
import type { AIRuntime } from '../../ai/runtime.ts';
import type { FieldHandle } from '../../field/Field.tsx';
import { useUI, type Surface as SurfaceName } from '../store.ts';
import type { CrystalDraft } from '../surfaces/CrystalPreview.tsx';
import { useTransientFocus } from './useTransientFocus.ts';

/** Which transient place owns input, and where the Field returns when it closes.
 *
 * One owner of the surface field: the return point (camera + selection) is captured when a
 * place opens and restored exactly when it closes, per-surface scope is remembered here rather
 * than in the Field, and a Crystal preview draft is presentation state that dies with its
 * surface. Nothing here mutates canonical Field content.
 */
export function useWorkspaceSurfaces({ controller, field, diffuse, runtime, find }: {
    controller: ProjectController;
    field: { current: FieldHandle | null };
    diffuse: DiffuseSession;
    runtime: AIRuntime;
    find: { reset(): void };
}) {
    const [draft, setDraft] = useState<CrystalDraft | null>(null);
    const [historyScope, setHistoryScope] = useState<string[]>([]);
    const [diffuseScope, setDiffuseScope] = useState<string[]>([]);
    const transient = useTransientFocus(() => field.current?.focus());

    function openSurface(surface: SurfaceName, origin?: Point) {
        transient.capture();
        const state = useUI.getState();
        if (surface === 'history')
            setHistoryScope([...state.selection]);
        if (surface === 'diffuse')
            setDiffuseScope(diffuse.getSnapshot().config?.scopeIds ?? [...state.selection]);
        useUI.getState().patch({
            surface, relationId: null, anchor: origin ?? null,
            returnPoint: surface === 'thread-focus' && state.returnPoint
                ? { ...state.returnPoint, camera: field.current?.camera() ?? controller.getSnapshot().project.camera }
                : state.returnPoint ?? { camera: field.current?.camera() ?? controller.getSnapshot().project.camera, selection: [...state.selection] },
        });
    }
    /** Closing is an ownership change, not an exit animation: the place stops owning input
     * immediately and the Field comes back to exactly the camera and selection it left. */
    function closeSurface(cancelRequest = true) {
        const state = useUI.getState();
        if (state.surface === 'find')
            find.reset();
        if (cancelRequest && !['running', 'paused'].includes(diffuse.getSnapshot().phase))
            runtime.cancel();
        if (state.returnPoint) {
            field.current?.restore(state.returnPoint.camera);
            const snapshot = controller.getSnapshot();
            useUI.getState().patch({ selection: state.returnPoint.selection.filter(key => !!snapshot.project.thoughts[key] || !!snapshot.session.ghosts[key]) });
        }
        useUI.getState().patch({ surface: 'none', returnPoint: null, relationId: null });
        setDraft(null);
        transient.restore(true);
    }
    return { transient, draft, setDraft, openSurface, closeSurface, historyScope, diffuseScope, setDiffuseScope };
}
