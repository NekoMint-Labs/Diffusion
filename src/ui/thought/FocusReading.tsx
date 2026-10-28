import { useIsPresent } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { t } from '../../shared/i18n.ts';
import { isCompactReading, type FocusReadingResult } from '../../ai/readingFocus.ts';
import { ThinkingError, failureText } from '../../ai/errors.ts';
import { validProposition, type Proposition } from '../../core/proposition.ts';
import { propositionTrialEnabled, rememberReadingFocus, useReadingFocus } from './readingFocusStore.ts';
import { Button } from '../primitives/Button.tsx';

export type FocusReading = (text: string, signal: AbortSignal) => Promise<FocusReadingResult>;
export function FocusReadingPanel({ id, text, generate, contextLabel, showOriginal = true, proposition, providerLabel = '', onExtracted, allowExtraction = true }: { allowExtraction?: boolean; proposition?: Proposition; providerLabel?: string; onExtracted?: (result: FocusReadingResult) => void; id: string; text: string; generate: FocusReading; contextLabel?: string; showOriginal?: boolean }) {
    const present = useIsPresent();
    const shown = useRef(present); shown.current = present;
    const cached = useReadingFocus(id, text);
    const compact = isCompactReading(text);
    const stored = useMemo(() => validProposition(proposition, text) ? { focus: { point: proposition.text, conditions: [], highlights: [] }, provider: providerLabel, mock: false } : undefined, [proposition, text, providerLabel]);
    const result = compact ? undefined : propositionTrialEnabled() ? stored : cached;
    const [pending, setPending] = useState(false);
    const [error, setError] = useState('');
    const active = useRef<AbortController | null>(null);
    useEffect(() => {
        setPending(false); setError('');
        return () => { active.current?.abort(); active.current = null; };
    }, [id, text, generate]);
    useEffect(() => { if (!present) { active.current?.abort(); active.current = null; setPending(false); } }, [present]);
    async function run() {
        if (active.current) return;
        const abort = new AbortController(); active.current = abort;
        const timer = setTimeout(() => abort.abort('timeout'), 45000);
        setPending(true); setError('');
        let detach = () => {};
        const interrupted = new Promise<never>((_, reject) => {
            const listener = () => reject(new DOMException('Aborted', 'AbortError'));
            abort.signal.addEventListener('abort', listener, { once: true });
            detach = () => abort.signal.removeEventListener('abort', listener);
        });
        try {
            const next = await Promise.race([generate(text, abort.signal), interrupted]);
            if (abort.signal.aborted || active.current !== abort || !shown.current) return;
            onExtracted?.(next);
            rememberReadingFocus(id, text, next);
        } catch (failure) {
            if (active.current !== abort) return;
            if (abort.signal.reason === 'timeout') setError(failureText('timeout'));
            else if (!abort.signal.aborted) setError(failureText(failure instanceof ThinkingError ? failure.failure : 'unknown'));
        } finally {
            clearTimeout(timer); detach();
            if (active.current === abort) { active.current = null; setPending(false); }
        }
    }
    return <div className="focus-reading" data-testid="focus-reading">
        {contextLabel && <details className="focus-reading-context"><summary>{t('Related questions')}</summary><p>{contextLabel}</p></details>}
        <details open={showOriginal} key={id + String(showOriginal)}>
            <summary>{t('Read original')}</summary>
            <p className="thought-reader-text" data-testid="reading-original">{text}</p>
        </details>
        {result && <details className="focus-reading-summary"><summary>{t('Card key point')}</summary>
            <p className="focus-reading-point" data-testid="reading-focus-point">{result.focus.point}</p>
        </details>}
        {allowExtraction && !compact && !result && <div className="focus-reading-controls">
            <Button size="sm" disabled={pending} onClick={() => void run()} data-testid="reading-focus-run">{t(result ? 'Summarize again' : 'Extract this key point')}</Button>
            {pending && <Button size="sm" variant="ghost" onClick={() => { active.current?.abort(); active.current = null; setPending(false); }}>{t('Stop')}</Button>}
            <span role="status">{pending ? t('Extracting key point...') : ''}</span>
        </div>}
        {error && <p role="alert">{error}</p>}
        {result && <p className="focus-reading-credit">{t('Model summary, not fact checking.')} {result.provider}</p>}
    </div>;
}
