import type { ProjectState } from '../core/model.ts';
import { captureThreadScope } from '../core/thread.ts';
import { attentionDebt } from '../core/attention.ts';
import { validateProject } from '../core/validation.ts';
/** DB v1 -> v2. Export format remains backward-compatible schemaVersion 1. */
export function migrateProjectV2(input: ProjectState): ProjectState {
    const project = validateProject(input);
    // v0.1 web Sources stored discovery snippets in excerpt. Preserve those words,
    // but do not carry them forward as read material or an evidence judgment.
    const sources = Object.fromEntries(Object.entries(project.sources).map(([key, source]) => [key, source.mime === 'text/uri-list' && !source.evidence && source.excerpt.trim() ? { ...source, discoverySnippet: source.discoverySnippet ?? source.excerpt, excerpt: '', status: source.status === 'unavailable' ? 'unavailable' as const : 'limited' as const, inspected: 'Legacy discovery snippet preserved; page content has not been read.', provenance: { ...source.provenance, note: ((source.provenance.note ? source.provenance.note + ' ' : '') + 'Legacy discovery, not read evidence.').slice(0, 10000) } } : source]));
    const thoughts = Object.fromEntries(Object.entries(project.thoughts).map(([key, thought]) => [key, thought.attentionDebt === undefined ? { ...thought, attentionDebt: attentionDebt(thought) } : thought]));
    // Historical wording cannot be reconstructed. Legacy Threads capture the available wording
    // at upgrade, then remain frozen. Existing v0.2 snapshots are never replaced.
    const threads = Object.fromEntries(Object.entries(project.threads).map(([key, thread]) => [key, thread.scopeSnapshot ? thread : { ...thread, scopeSnapshot: captureThreadScope(project, thread.scopeIds) }]));
    return validateProject({ ...project, thoughts, threads, sources });
}

/** DB v2 -> v3. Raw user input becomes durable project data while export schemaVersion remains 1. */
export function migrateProjectV3(input: ProjectState): ProjectState {
    const project = validateProject(input);
    return validateProject({ ...project, inputs: project.inputs ?? {} });
}
