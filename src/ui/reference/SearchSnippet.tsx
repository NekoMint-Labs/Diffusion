import { t } from '../../shared/i18n.ts';
import { searchSnippetPreview } from './searchSnippetPreview.ts';
import { tableTextPreview } from './tableTextPreview.ts';

export function ReadPassage({ text }: { text: string }) {
    const preview = tableTextPreview(text);
    return <>
        {preview !== null && <p className="tiny muted">{t('Table preview; expand to inspect the original passage.')}</p>}
        <blockquote className="source-excerpt">{preview ?? text}</blockquote>
        {preview !== null && <details className="search-snippet-original"><summary>{t('Show original read passage')}</summary><p>{text}</p></details>}
    </>;
}

export function SearchSnippet({ text, query = '' }: { text: string; query?: string }) {
    const preview = searchSnippetPreview(text, query);
    return <>
        <p data-testid="search-snippet-preview">{preview}</p>
        {preview !== text && <details className="search-snippet-original"><summary>{t('Show original search snippet')}</summary><p>{text}</p></details>}
    </>;
}
