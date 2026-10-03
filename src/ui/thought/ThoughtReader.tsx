import { t } from '../../shared/i18n.ts';
import type { Point } from '../../core/model.ts';
import { Surface } from '../surfaces/Surface.tsx';
import { Button } from '../primitives/Button.tsx';

/** Read-only disclosure. Opening or closing it never edits or accepts the material. */
export function ThoughtReader({ text, anchor, responseLabel, onRespond, onClose }: {
    text: string;
    anchor?: Point;
    responseLabel: string;
    onRespond: () => void;
    onClose: () => void;
}) {
    return <Surface title={t('Full thought')} level="anchored" anchor={anchor} className="thought-reader" onClose={onClose} actions={<Button variant="ghost" size="sm" onClick={onRespond}>{t(responseLabel)}</Button>}>
        <p className="thought-reader-text">{text}</p>
    </Surface>;
}
