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
    const noticeTone = useUI(state => state.noticeTone);
    const noticeAction = useUI(state => state.noticeAction);
    useEffect(() => {
        if (!notice)
            return;
        // Failures stay even when there is no actionable button (for example, a Continue timeout
        // has no composer to retry). Changing only the tone or action must also cancel an old timer.
        if (noticeTone === 'error' || noticeAction)
            return;
        const timer = setTimeout(() => {
            const current = useUI.getState();
            if (current.notice === notice && current.noticeTone !== 'error' && !current.noticeAction)
                current.patch({ notice: '' });
        }, 6500);
        return () => clearTimeout(timer);
    }, [notice, noticeTone, noticeAction]);
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
