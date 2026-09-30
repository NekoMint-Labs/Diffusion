import { useEffect, useRef, useState } from 'react';
import type { ThinkingOperation } from '../../core/model.ts';
import { t } from '../../shared/i18n.ts';

export function pendingCopy(kind: ThinkingOperation['kind']): string {
    switch (kind) {
        case 'continue': return 'Continuing this line...';
        case 'angle': case 'diffuse': return 'Looking from another direction...';
        case 'question': return 'Looking for a useful question...';
        case 'probe': return 'Looking for a relation...';
        case 'verify': return 'Looking for supporting or challenging evidence...';
        case 'organize': return 'Looking for structure already here...';
        case 'bring': return 'Bringing this reference...';
        case 'ingest': return 'Finding structure in your words...';
        default: return 'Thinking with this scope...';
    }
}
function operationLabel(kind: ThinkingOperation['kind']): string {
    switch (kind) {
        case 'continue': return t('Continue');
        case 'angle': case 'diffuse': return t('Another Angle');
        case 'question': return t('Ask');
        case 'probe': return t('Explore');
        case 'verify': return t('Verify');
        case 'organize': return t('Organize');
        case 'bring': return t('Reference');
        case 'ingest': return t('Structure');
        default: return t('Think');
    }
}
export function terminalCopy(operation: ThinkingOperation): string {
    if (operation.phase === 'failed') return t('This action did not finish.');
    if (operation.phase === 'cancelled') return t('Stopped.');
    if (operation.resultCount !== undefined)
        return t(operation.resultCount === 1 ? '{count} result · {action}' : '{count} results · {action}', { count: operation.resultCount, action: operationLabel(operation.kind) });
    return t('Settled.');
}

export function useOperationPresentation(operation: ThinkingOperation | null) {
    const [displayOperation, setDisplayOperation] = useState<ThinkingOperation | null>(operation);
    const [showCopy, setShowCopy] = useState(false);
    const beganAt = useRef<{ id: string; at: number } | null>(null);
    useEffect(() => {
        if (!operation) { setDisplayOperation(null); setShowCopy(false); return; }
        setDisplayOperation(operation);
        if (operation.phase === 'pending') {
            beganAt.current = beganAt.current?.id === operation.id ? beganAt.current : { id: operation.id, at: performance.now() };
            setShowCopy(false);
            const timer = setTimeout(() => setShowCopy(true), 190);
            return () => clearTimeout(timer);
        }
        const elapsed = beganAt.current?.id === operation.id ? performance.now() - beganAt.current.at : 1000;
        const wasLongEnough = elapsed >= 180;
        setShowCopy(wasLongEnough);
        const timer = setTimeout(() => { setDisplayOperation(null); setShowCopy(false); }, wasLongEnough ? (operation.phase === 'completed' ? 520 : 1000) : 180);
        return () => clearTimeout(timer);
    }, [operation?.id, operation?.phase]);

    return { displayOperation, showCopy };
}
