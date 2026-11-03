import { answerPreview } from '../../shared/answerPreview.ts';
import { t } from '../../shared/i18n.ts';
import { Manuscript } from '../thread/Manuscript.tsx';

/** Disclosure is local reading state. Keep and further thinking still receive the complete text. */
export function AnswerText({ text }: { text: string }) {
    const preview = answerPreview(text);
    if (preview === text) return <Manuscript text={text} />;
    return <div className="answer-disclosure">
        <small>{t('Answer preview')}</small>
        <p className="answer-preview" data-testid="answer-preview">{preview}</p>
        <details key={text}>
            <summary>{t('Read full text')}</summary>
            <div data-testid="answer-full-text"><Manuscript text={text} /></div>
        </details>
    </div>;
}
