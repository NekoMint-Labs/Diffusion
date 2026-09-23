import type { CommandContext, DiffusionCommand, SurfaceDeps } from './types.ts';
import { selectedIds, selectedThoughts } from './types.ts';

/** The directions vocabulary for a per-run thinking control: one, three, or five. */
export const THINKING_DIRECTION_COUNTS = [1, 3, 5] as const;
export type ThinkingDirectionCount = typeof THINKING_DIRECTION_COUNTS[number];

/** Fixed product defaults for a thinking run. These are not a persisted preference: a run is always
 * explicit (an action preview or the run-settings surface), and the controls for that run live on
 * the surface itself. Keeping them beside the directions vocabulary gives the surfaces and the
 * ordinary path one source. */
export const THINKING_DEFAULTS = { directions: 3 as ThinkingDirectionCount, fieldSources: false, web: false };
export interface ThinkingDeps extends SurfaceDeps {
    /** The one relation-specific action: it exists only for a scope of exactly two Thoughts. */
    findRelation(ids: string[]): void;
    ask(ids: string[]): void;
    openThread(ids: string[], deep?: boolean): void;
    previewCrystal(ids: string[]): void;
    continueCrystal(key: string): void;
    openHandoff(key: string): void;
    openSource(sourceId: string): void;
    openDiffuse(ids: string[]): void;
    /** The one-shot continuation preview. The Thread place keeps its own entry through `openThread`. */
    continueThinking(ids: string[]): void;
    /** The question-generating preview.
     * `ask` stays the composer: writing your own question is a different action from asking for one. */
    questions(ids: string[]): void;
    organize(ids: string[]): void;
    carry(ids: string[]): void;
    keep(ids: string[]): void;
    fade(ids: string[]): void;
}
/** THINK: possibilities and scope-bound reasoning. Every command needs a real selection. */
export function thinkingCommands(deps: ThinkingDeps): DiffusionCommand[] {
    const anySelected = (context: CommandContext) => selectedThoughts(context).length > 0;
    /** A relation needs exactly two things to be a relation between. */
    const exactlyTwo = (context: CommandContext) => selectedThoughts(context).length === 2;
    const sole = (context: CommandContext) => {
        const thoughts = selectedThoughts(context);
        return thoughts.length === 1 ? thoughts[0] : null;
    };
    return [
        { id: 'find-relation', group: 'think', label: 'Find a relation', keywords: ['probe', 'relation', 'explore', '探索', '关联'], available: exactlyTwo, run: context => deps.findRelation(selectedIds(context)) },
        { id: 'ask', group: 'think', label: 'Ask your own question', keywords: ['question', 'write', '追问', '提问'], available: anySelected, run: context => deps.ask(selectedIds(context)) },
        { id: 'continue-thinking', group: 'think', label: 'Continue thinking', keywords: ['continue', '继续想一想'], available: anySelected, run: context => deps.continueThinking(selectedIds(context)) },
        { id: 'thread', group: 'think', label: 'Open a Thought Thread', keywords: ['thread', 'conversation', '思路'], available: anySelected, run: context => deps.openThread(selectedIds(context)) },
        { id: 'questions', group: 'think', label: 'Generate a question', keywords: ['question', 'ask', 'generate', '提问', '生成'], available: anySelected, run: context => deps.questions(selectedIds(context)) },
        { id: 'deep-dive', group: 'think', label: 'Go deeper', keywords: ['deeper', 'manuscript', '深入'], available: anySelected, run: context => deps.openThread(selectedIds(context), true) },
        { id: 'verify', group: 'think', label: 'Look for evidence...', keywords: ['verify', 'source', '验证'], available: anySelected, run: () => deps.openSurface('evidence') },
        {
            id: 'crystallize', group: 'think', label: 'Crystallize', keywords: ['commit', 'organize', '结晶'],
            available: context => {
                const thoughts = selectedThoughts(context);
                return thoughts.length > 0 && thoughts.some(thought => thought.kind !== 'source') && !(thoughts.length === 1 && thoughts[0].kind === 'crystal');
            },
            run: context => deps.previewCrystal(selectedIds(context)),
        },
        // The outward-looking action for every scope except a pair; a pair is the relation action above.
        { id: 'diffuse', group: 'think', label: 'Another angle', keywords: ['possibilities', '扩散'], available: context => { const count = selectedThoughts(context).length; return count > 0 && count !== 2; }, run: context => deps.openDiffuse(selectedIds(context)) },
        { id: 'organize', group: 'think', label: 'Organize thoughts', keywords: ['structure', '理一理', '整理'], available: context => selectedThoughts(context).length >= 3, run: context => deps.organize(selectedIds(context)) },
        { id: 'keep', group: 'think', label: 'Keep unfinished', keywords: ['hold', '保留'], available: anySelected, run: context => deps.keep(selectedIds(context)) },
        {
            id: 'fade', group: 'think', label: 'Let fade', keywords: ['release', '淡去'],
            available: context => {
                const thoughts = selectedThoughts(context);
                return thoughts.length > 0 && thoughts.every(thought => thought.kind === 'thought');
            },
            run: context => deps.fade(selectedIds(context)),
        },
        {
            id: 'continue-crystal', group: 'think', label: 'Continue from this Crystal', keywords: ['grow', '从结晶继续'],
            available: context => sole(context)?.kind === 'crystal',
            run: context => { const thought = sole(context); if (thought)
                deps.continueCrystal(thought.id); },
        },
        {
            id: 'handoff', group: 'think', label: 'Handoff into action...', keywords: ['export', '移交'],
            available: context => sole(context)?.kind === 'crystal',
            run: context => { const thought = sole(context); if (thought)
                deps.openHandoff(thought.id); },
        },
        {
            id: 'open-reference', group: 'think', label: 'Open reference', keywords: ['source', '打开来源'],
            available: context => Boolean(sole(context)?.sourceId),
            run: context => { const sourceId = sole(context)?.sourceId; if (sourceId)
                deps.openSource(sourceId); },
        },
        { id: 'carry', group: 'think', label: 'Carry elsewhere', keywords: ['move', '携带'], available: anySelected, run: context => deps.carry(selectedIds(context)) },
    ];
}
