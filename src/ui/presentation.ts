import { t } from '../shared/i18n.ts';
/** Translate system-authored phrasing, never the user's wording or source quotations. */
export function trajectorySummary(summary: string): string {
    if (summary.startsWith('Reframed: ')) return t('Reframed: {text}', { text: summary.slice(10) });
    if (summary.startsWith('Committed to a Crystal: ')) return t('Committed to a Crystal: {text}', { text: summary.slice('Committed to a Crystal: '.length) });
    const relation = /^Confirmed (\w+): (.*)$/s.exec(summary);
    if (relation) return t('Confirmed {kind}: {text}', { kind: t(relation[1]), text: relation[2] });
    return t(summary);
}
/** A recorded decision belongs to one readable category. The internal event id stays internal:
 * it is data, not the thing the user is meant to read. */
export type TrajectoryCategory = 'commitment' | 'wording' | 'placement' | 'release' | 'reference' | 'reasoning' | 'field';
const CATEGORY: Record<string, TrajectoryCategory> = {
    'thought.create': 'placement', 'ghost.claim': 'commitment', 'fork.bring': 'commitment',
    'thought.edit': 'wording', 'thought.move': 'placement', 'thought.keep': 'commitment',
    'thought.delete': 'release', 'thought.release': 'release', 'thought.wake': 'commitment',
    'crystal.create': 'commitment', 'crystal.form': 'commitment', 'crystal.continue': 'commitment',
    'relation.confirm': 'reasoning', 'relation.remove': 'reasoning',
    'source.add': 'reference', 'source.update': 'reference',
    'thread.create': 'reasoning', 'thread.message': 'reasoning', 'thread.scope': 'reasoning', 'thread.capsule': 'reasoning',
    'field.rename': 'field', 'region.rename': 'placement', 'region.observe': 'placement',
    'world.fork': 'field', 'world.restore': 'field', 'undo': 'field', 'demo': 'field',
};
export function trajectoryCategory(kind: string): TrajectoryCategory {
    return CATEGORY[kind] ?? 'field';
}
/** Local-calendar bucket. A timeline is read by day, never by raw timestamp. */
export function dayKey(at: number, now = Date.now()): string {
    const day = new Date(at);
    const today = new Date(now);
    const start = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
    const elapsed = Math.round((start(today) - start(day)) / 86400000);
    if (elapsed === 0) return 'today';
    if (elapsed === 1) return 'yesterday';
    const month = String(day.getMonth() + 1).padStart(2, '0');
    return `${day.getFullYear()}-${month}-${String(day.getDate()).padStart(2, '0')}`;
}
export function inspectionMessage(value: string): string {
    const prefix = /^UTF-8 prefix: (\d+) of (\d+) bytes examined; first (\d+) characters retained\./.exec(value);
    if (prefix) return t('Read the first {read} of {total} bytes; kept {characters} characters. The remainder was not read.', { read: prefix[1], total: prefix[2], characters: prefix[3] });
    const entire = /^Entire UTF-8 text decoded \((\d+) bytes; (\d+) characters\)/.exec(value);
    if (entire) return t('Decoded the complete UTF-8 text ({bytes} bytes; {characters} characters). Markup and code are not executed.', { bytes: entire[1], characters: entire[2] });
    const passages = /^(\d+) extracted passage\(s\) matched to fetched text/.exec(value);
    if (passages) return t('Read {count} matched passages, not the complete document.', { count: passages[1] });
    return t(value);
}
