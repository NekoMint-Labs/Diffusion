import { t as msg } from '../../shared/i18n.ts';
import { Surface } from './Surface.tsx';
/** Small stable search surface. Search reveals where content lives; it never leaves the Field. */
export function FindSurface({ query, count, index, onQuery, onNavigate, onClose }: {
    query: string;
    count: number;
    index: number;
    onQuery: (query: string) => void;
    onNavigate: (delta: number) => void;
    onClose: () => void;
}) {
    const trimmed = query.trim();
    return <Surface title={msg('Find in Field')} level="bar" className="find-bar" onClose={onClose}>
        <label className="sr-only" htmlFor="field-find">{msg('Find known content')}</label>
        <input id="field-find" data-autofocus="true" autoComplete="off" spellCheck={false} placeholder={msg('A phrase you remember...')} value={query} onChange={event => onQuery(event.target.value)} onKeyDown={event => {
            if (event.nativeEvent.isComposing || event.keyCode === 229)
                return;
            if (event.key === 'Enter') {
                event.preventDefault();
                onNavigate(event.shiftKey ? -1 : 1);
            }
        }}/>
        <p className="find-status" data-testid="find-status" role="status">{trimmed ? count ? msg('{index} / {count}', { index: index % count + 1, count }) : msg('Nothing in this Field matches.') : msg('Type to reveal where it lives.')}</p>
        <p className="find-hint">{msg('Enter next / Shift+Enter previous / Escape closes')}</p>
    </Surface>;
}
