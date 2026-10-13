import { navigationDisclosureTarget } from '../../field/spatial/navigationDisclosureTarget.ts';
import { useRef, useState } from 'react';
import type { ProjectController } from '../../core/controller.ts';
import { thoughtHierarchy } from '../../core/hierarchy.ts';
import type { FieldHandle } from '../../field/contracts.ts';
import { useUI, type ReturnPoint } from '../store.ts';

/** An explicit navigation excursion, independent of transient surface dismissal. */
export function useNavigationReturn(controller: ProjectController, field: { current: FieldHandle | null }) {
    const point = useRef<{ controller: ProjectController; value: ReturnPoint } | null>(null);
    const [, redraw] = useState(0);
    if (point.current?.controller !== controller) point.current = null;
    return {
        available: point.current !== null,
        reveal(ids: string[], focus = false) {
            const snapshot = controller.getSnapshot();
            const items = { ...snapshot.project.thoughts, ...snapshot.session.ghosts };
            if (!ids[0] || !items[ids[0]] || !field.current) return;
            const target = navigationDisclosureTarget(ids[0], thoughtHierarchy(items).parent, snapshot.session.branchDisclosure);
            if (!target) return;
            if (!point.current) point.current = { controller, value: {
                camera: { ...field.current.camera() }, selection: [...useUI.getState().selection],
            } };
            useUI.getState().patch({ selection: [target] });
            field.current.reveal([target]);
            if (focus) field.current.focus();
            redraw(value => value + 1);
        },
        restore() {
            const saved = point.current;
            if (!saved || saved.controller !== controller || !field.current) return;
            const snapshot = controller.getSnapshot();
            field.current.restore(saved.value.camera);
            useUI.getState().patch({ transientEpoch: useUI.getState().transientEpoch + 1, selection: saved.value.selection.filter(id =>
                !!snapshot.project.thoughts[id] || !!snapshot.session.ghosts[id]) });
            point.current = null;
            redraw(value => value + 1);
            field.current.focus();
        },
    };
}
