import { useState } from 'react';
import { threadScope } from '../../core/thread.ts';
import { t as msg } from '../../shared/i18n.ts';
import type { Point } from '../../core/model.ts';
import type { ProjectController } from '../../core/controller.ts';
import type { AIRuntime } from '../../ai/runtime.ts';
import { useProject } from '../hooks.ts';
import { useUI } from '../store.ts';
import { Surface } from '../surfaces/Surface.tsx';
import { Button } from '../primitives/Button.tsx';
import { Manuscript } from './Manuscript.tsx';
import { sendThreadMessage, bringThreadTextToField } from './threadFlow.ts';

/** One Thread place, two presentations of the same record.
 *
 * The ordinary presentation is a split panel beside the Field; the focused presentation is a modal
 * manuscript with the frozen context beside it. Both read the same Thread, render its history
 * through the one `Manuscript` renderer, and share one send flow, one bring-to-Field flow, one
 * input row and one empty state. Going deeper changes the presentation, never the Thread.
 */
export function ThreadSurface({ controller, runtime, threadId, onClose, onFocus, onReturn, anchor, beforeSend }: {
    controller: ProjectController;
    runtime: AIRuntime;
    threadId: string;
    onClose: () => void;
    onFocus: () => void;
    onReturn: () => void;
    anchor: () => Point;
    beforeSend: () => void;
}) {
    const { project, session } = useProject(controller);
    const ui = useUI();
    const [input, setInput] = useState('');
    const focused = ui.surface === 'thread-focus';
    const thread = project.threads[threadId];
    if (!thread)
        return null;
    const scope = threadScope(thread, project);
    const sourceIds = [...new Set(scope.flatMap(item => item.sourceId ? [item.sourceId] : []))];
    const send = () => {
        const text = input.trim();
        if (!text || ui.busy)
            return;
        beforeSend();
        setInput('');
        void sendThreadMessage({ controller, runtime, threadId, text, deep: focused });
    };
    const bring = (text: string) => {
        bringThreadTextToField({ controller, session, anchor: anchor(), threadId, text });
        ui.patch({ notice: msg('Returned as a possibility. Click it in the Field to make it yours.') });
    };
    const history = thread.messages.map(message => <section key={message.id} className={message.role === 'user' ? 'thread-question' : 'thread-passage'}>
        <Manuscript text={message.text}/>
        {message.role === 'assistant' && <div className="passage-footer"><span>{message.provider}</span><Button variant="ghost" size="sm" onClick={() => bring(message.text)}>{msg('Bring to Field')}</Button></div>}
    </section>);
    const empty = !thread.messages.length && <p className="muted">{msg('Nothing has been asked here yet. This Thread keeps the scope you opened it with — write your first question below.')}</p>;
    const inputRow = <form className="thread-input" onSubmit={event => { event.preventDefault(); send(); }}>
        <label className="eyebrow" htmlFor="thread-words">{msg(thread.messages.length ? 'Continue this line of thought' : 'Start this line of thought')}</label>
        <textarea id="thread-words" value={input} onChange={event => setInput(event.target.value)} maxLength={12000} rows={3} placeholder={msg('What remains unclear?')}/>
        <div>{ui.busy ? <Button variant="ghost" type="button" onClick={() => runtime.cancel()}>{msg('Stop')}</Button> : <Button variant="solid" tone="attention" type="submit" disabled={!input.trim()}>{msg('Think with this')}</Button>}</div>
    </form>;
    if (focused)
        return <Surface key="thread-focus" title={msg('Deep Dive')} subtitle={thread.title} level="focus" onClose={onClose} actions={<Button variant="outline" size="sm" onClick={onReturn}>{msg('Return to Thread')}</Button>}>
            <div className="thread-focus-layout" data-testid="thread-focus">
                <aside className="thread-focus-context" aria-label={msg('Current context')}><h3>{msg('Current context')}</h3>{scope.map(item => <p key={item.id}>{item.text}</p>)}<h3>{msg('Sources in scope')}</h3>{sourceIds.length ? sourceIds.map(key => { const source = project.sources[key]; return source && <section key={key}><p>{source.title}</p><small>{source.inspected}</small>{source.provenance.locator && <small>{source.provenance.locator}</small>}</section>; }) : <p className="tiny muted">{msg('No source has been added to this scope.')}</p>}</aside>
                <article className="thread-focus-reasoning" aria-label={msg('Reasoning')}>
                    <p className="thread-focus-status">{msg('Response history, not settled Field state.')}</p>
                    {empty}
                    {history}
                    {inputRow}
                </article>
            </div>
        </Surface>;
    return <Surface key="thread" title={msg('Thinking with')} subtitle={thread.title} level="split" onClose={onClose} actions={<><Button variant="ghost" size="sm" onClick={() => controller.dispatch({ type: 'thread.scope', id: threadId, ids: ui.selection })}>{msg('Add current selection')}</Button><Button variant="outline" size="sm" onClick={onFocus}>{msg('Go deeper')}</Button></>}>
        <div className="thread-scope">{scope.map(item => <span key={item.id}>{item.text.slice(0, 100)}</span>)}</div>
        {empty}
        <div className="manuscript">{history}</div>
        {inputRow}
    </Surface>;
}
