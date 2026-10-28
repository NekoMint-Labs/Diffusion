import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { t } from '../../shared/i18n.ts';
import { Button } from '../primitives/Button.tsx';
import { SurfaceClose } from '../surfaces/Surface.tsx';

// One bounded reading session; text edits and Field changes invalidate the scroll position.
const positions = new Map<string, { original: string; top: number }>();
let activeProject = '';
export function clearReaderPositions() { positions.clear(); activeProject = ''; }
export function PropositionReader({ projectId, id, text, actions, children, onClose }: {
    projectId: string; id: string; text: string; actions: ReactNode; children: ReactNode; onClose: () => void;
}) {
    const body = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        if (activeProject !== projectId) { positions.clear(); activeProject = projectId; }
        const element = body.current!;
        const previous = positions.get(id);
        element.scrollTop = previous?.original === text ? previous.top : 0;
        element.focus({ preventScroll: true });
        return () => {
            positions.delete(id); positions.set(id, { original: text, top: element.scrollTop });
            while (positions.size > 24) positions.delete(positions.keys().next().value!);
        };
    }, [projectId, id, text]);
    return <aside className="surface thought-reader proposition-reader" data-testid="proposition-reader" data-surface="true" role="dialog" aria-label={t('Read original')} onKeyDown={event => {
        if (event.nativeEvent.isComposing || event.keyCode === 229) return;
        if (event.key === 'Tab' && window.matchMedia('(max-width: 760px)').matches) {
            const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),summary,[tabindex="0"]')).filter(el => !el.closest('details:not([open]) > :not(summary)'));
            const index = tabs.indexOf(document.activeElement as HTMLElement);
            if (event.shiftKey && index <= 0 || !event.shiftKey && index === tabs.length - 1) {
                event.preventDefault(); tabs[event.shiftKey ? tabs.length - 1 : 0]?.focus();
            }
        }
    }}>
        <header className="surface-header"><h2>{t('Read original')}</h2><SurfaceClose onClose={onClose}/></header>
        <div className="surface-actions"><Button className="reader-return" variant="ghost" size="sm" onClick={onClose}>{t('Return to Field')}</Button>{actions}</div>
        <div ref={body} className="surface-body" tabIndex={0} role="region" aria-label={t('Read original')}>{children}</div>
    </aside>;
}
