import { useEffect } from 'react';
import type { ProjectController } from '../../core/controller.ts';
import type { FieldHandle } from '../../field/Field.tsx';
import { useUI } from '../store.ts';

/** Time and the application window, which belong to nothing the user is looking at.
 *
 * The notice line dismisses itself, attention cools on a slow tick rather than a frame loop,
 * and leaving the window or the application releases transient attention and guards unsaved
 * work. None of it touches pointer state or canonical content directly.
 */
export function useWorkspaceLifecycle({ controller, field }: {
    controller: ProjectController;
    field: { current: FieldHandle | null };
}) {
    const notice = useUI(state => state.notice);
    useEffect(() => {
        if (!notice)
            return;
        // A failure that offers the control which resolves it stays until it is answered or
        // replaced. A message that fades while it is still being read is a message never delivered,
        // and the control it carries is the whole reason it exists. Ordinary notices still settle.
        if (useUI.getState().noticeAction)
            return;
        const timer = setTimeout(() => useUI.getState().patch({ notice: '' }), 6500);
        return () => clearTimeout(timer);
    }, [notice]);
    useEffect(() => {
        const tick = setInterval(() => {
            if (useUI.getState().dragging || useUI.getState().editing)
                return;
            controller.coolUnderPressure(
                document.visibilityState === 'visible' && useUI.getState().surface !== 'thread-focus',
                field.current?.visibleIds() ?? [],
                [...useUI.getState().selection, ...controller.getSnapshot().session.recalls],
            );
            controller.expireSession(Date.now(), useUI.getState().selection);
        }, 60000);
        const unload = (event: BeforeUnloadEvent) => {
            if (controller.getSnapshot().dirty) {
                event.preventDefault();
                event.returnValue = '';
            }
        };
        const visibility = () => { if (document.visibilityState !== 'visible')
            controller.clearAttention(); };
        window.addEventListener('beforeunload', unload);
        document.addEventListener('visibilitychange', visibility);
        return () => {
            clearInterval(tick);
            document.removeEventListener('visibilitychange', visibility);
            window.removeEventListener('beforeunload', unload);
        };
    }, [controller, field]);
}
