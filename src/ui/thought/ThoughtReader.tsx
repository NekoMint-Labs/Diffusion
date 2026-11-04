import type { Proposition } from '../../core/proposition.ts';
import type { FocusReadingResult } from '../../ai/readingFocus.ts';
import { PropositionReader } from './PropositionReader.tsx';
import { FocusReadingPanel, type FocusReading } from './FocusReading.tsx';
import { t } from '../../shared/i18n.ts';
import { Button } from '../primitives/Button.tsx';

/** Read-only disclosure. Opening or closing it never edits or accepts the material. */
export function ThoughtReader({ text, responseLabel, onRespond, onClose, itemId, focusReading, contextLabel, showOriginal = true, proposition, projectId = '', providerLabel, onExtracted, allowExtraction = true, editedAIOrigin = false }: {
    allowExtraction?: boolean;
    editedAIOrigin?: boolean;
    proposition?: Proposition;
    projectId?: string;
    providerLabel?: string;
    onExtracted?: (result: FocusReadingResult) => void;
    text: string;
    itemId?: string;
    showOriginal?: boolean;
    focusReading?: FocusReading;
    contextLabel?: string;
    responseLabel: string;
    onRespond: () => void;
    onClose: () => void;
}) {
    return <PropositionReader title={allowExtraction ? t('Read original') : t('Full thought')} key={projectId + itemId} projectId={projectId} id={itemId ?? ''} text={text} onClose={onClose} actions={<Button variant="ghost" size="sm" onClick={onRespond}>{t(responseLabel)}</Button>}>
        {editedAIOrigin && <p className="muted" data-testid="edited-ai-origin">{t('AI origin · edited by you')}</p>}
        {itemId && focusReading ? <FocusReadingPanel id={itemId} text={text} generate={focusReading} contextLabel={contextLabel} showOriginal={showOriginal} proposition={proposition} providerLabel={providerLabel} onExtracted={onExtracted} allowExtraction={allowExtraction}/> : <p className="thought-reader-text">{text}</p>}
    </PropositionReader>;
}
