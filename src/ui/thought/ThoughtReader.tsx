import { FocusReadingPanel, type FocusReading } from './FocusReading.tsx';
import { readingTrialEnabled } from './readingFocusStore.ts';
import { t } from '../../shared/i18n.ts';
import type { Point } from '../../core/model.ts';
import { Surface } from '../surfaces/Surface.tsx';
import { Button } from '../primitives/Button.tsx';

/** Read-only disclosure. Opening or closing it never edits or accepts the material. */
export function ThoughtReader({ text, anchor, responseLabel, onRespond, onClose, itemId, focusReading, contextLabel, showOriginal = true }: {
    text: string;
    itemId?: string;
    showOriginal?: boolean;
    focusReading?: FocusReading;
    contextLabel?: string;
    anchor?: Point;
    responseLabel: string;
    onRespond: () => void;
    onClose: () => void;
}) {
    return <Surface title={t(readingTrialEnabled() ? 'Read original' : 'Full thought')} level="anchored" anchor={anchor} className={readingTrialEnabled() ? 'thought-reader reading-trial' : 'thought-reader'} focusBody onClose={onClose} actions={<Button variant="ghost" size="sm" onClick={onRespond}>{t(responseLabel)}</Button>}>
        {readingTrialEnabled() && itemId && focusReading ? <FocusReadingPanel key={itemId} id={itemId} text={text} generate={focusReading} contextLabel={contextLabel} showOriginal={showOriginal}/> : <p className="thought-reader-text">{text}</p>}
    </Surface>;
}
