import { Fragment, useRef } from 'react';
import { trajectoryCategory, trajectorySummary, dayKey, type TrajectoryCategory } from '../presentation.ts';
import { t as msg, getLocale } from '../../shared/i18n.ts';
import { isAuthoredExample } from '../../core/demo.ts';
import type { ProjectState, TrajectoryEntry } from '../../core/model.ts';
import { Surface } from './Surface.tsx';
import { historyRevealSequence, useSignature } from '../motion/signature.ts';
const categoryLabel: Record<TrajectoryCategory, string> = {
    commitment: 'Commitment', wording: 'Wording', placement: 'Placement', release: 'Let go',
    reference: 'Reference', reasoning: 'Reasoning', field: 'Field',
};
const locale = () => getLocale() === 'zh' ? 'zh-CN' : 'en-GB';
function dayLabel(key: string): string {
    if (key === 'today')
        return msg('Today');
    if (key === 'yesterday')
        return msg('Yesterday');
    return new Date(`${key}T00:00:00`).toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' });
}
/** How did this form? A readable decision timeline. Grouped by day, labelled by the kind of
 * decision, and never a dump of internal event ids.
 *
 * The hierarchy is deliberate: the human sentence is the primary line, the time and the category
 * are quiet support, and the internal event kind survives only as a `data-kind` attribute for
 * diagnosis. The timeline is what the user came to read, so it arrives as a timeline — one
 * authored reveal that lands the day markers first and lets the entries follow in order. */
export function HistorySurface({ project, scope, onClose }: {
    project: ProjectState;
    scope: string[];
    onClose: () => void;
}) {
    const root = useRef<HTMLDivElement>(null);
    const entries = project.history.filter(entry => !scope.length || entry.thoughtIds.some(key => scope.includes(key))).slice(-200).reverse();
    const days: {
        key: string;
        entries: TrajectoryEntry[];
    }[] = [];
    for (const entry of entries) {
        const key = dayKey(entry.at);
        const last = days.at(-1);
        if (last && last.key === key)
            last.entries.push(entry);
        else
            days.push({ key, entries: [entry] });
    }
    const categories = [...new Set(entries.map(entry => trajectoryCategory(entry.kind)))];
    useSignature(root, historyRevealSequence, [entries.length, scope.length]);
    return <Surface title={msg("How did this form?")} subtitle={msg(scope.length ? 'The deliberate changes you made to these thoughts, newest first' : 'The deliberate changes you made in this Field, newest first')} level="focus" onClose={onClose}>
  <div className="history" ref={root}>
  <p className="settings-note">{msg("Commitments, claims, questions, and revisions are recorded. Pan, zoom, clicks, and pixel movements are not.")}</p>
  {entries.length > 0 && <ul className="history-overview">
    <li>{msg('Recorded in this scope')}</li>
    {categories.map(category => <li key={category} className="history-chip">{msg(categoryLabel[category])}</li>)}
  </ul>}
  {scope.length > 0 && <section className="settings-section">
    <h3>{msg('What is here now')}</h3>
    <div className="history-scope">{scope.map(key => {
        const thought = project.thoughts[key];
        if (!thought)
            return null;
        return <article className="history-scope-item" key={key} data-kind={thought.kind}>
            <small>{msg(thought.kind === 'crystal' ? 'Stable commitment' : 'Current thought')}</small>
            {/* The example Field's own copy is a dictionary key, so the timeline translates what the
                Field translates: a Chinese reader was seeing Chinese around English sentences. */}
            <p>{isAuthoredExample(thought) ? msg(thought.text) : thought.text}</p>
            {thought.origin && <p className="history-origin" data-origin={`${thought.origin.projectId}/${thought.origin.thoughtId}`}>{msg(thought.origin.note || 'Brought in from another Field')}</p>}
        </article>;
    })}</div>
  </section>}
  {!days.length && <p className="history-empty">{msg('Nothing has been committed, reframed or let go in this scope yet. Every deliberate change you make here appears in this timeline.')}</p>}
  {days.map(day => <Fragment key={day.key}>
    <div className="history-day-row">
      <h3 className="history-day">{dayLabel(day.key)}</h3>
      <span className="history-day-count">{day.entries.length === 1 ? msg('1 decision') : msg('{count} decisions', { count: day.entries.length })}</span>
    </div>
    <ol className="history-events">{day.entries.map(entry => <li className="history-event" key={entry.id} data-kind={entry.kind}>
      <time className="history-time" dateTime={new Date(entry.at).toISOString()}>{new Date(entry.at).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' })}</time>
      <span className="history-marker" aria-hidden="true"/>
      <div className="history-body">
        <p className="history-text">{trajectorySummary(entry.summary)}</p>
        <span className="history-chip history-chip-kind">{msg(categoryLabel[trajectoryCategory(entry.kind)])}</span>
      </div>
    </li>)}</ol>
  </Fragment>)}
  </div>
  </Surface>;
}
