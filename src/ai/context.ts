import { hasReadPassages, readableSource } from '../evidence/pipeline.ts';
import { threadScope } from '../core/thread.ts';
import { CORE_CONTRACT, type ContextPacket, type ScopeThought } from '../core/semantics.ts';
import type { Capsule, ProjectState, Thread, EvidenceCandidate } from '../core/model.ts';
export interface CompileOptions {
    threadId?: string;
    allowScopedSources?: boolean;
    projectSources?: boolean;
    web?: boolean;
    query?: string;
    maxCandidates?: number;
    evidence?: EvidenceCandidate[];
}
const brief = (t: {
    id: string;
    text: string;
    kind: ScopeThought['kind'];
}): ScopeThought => ({ id: t.id, text: t.text.slice(0, 1600), kind: t.kind });
export function rebuildCapsule(thread: Thread, project: ProjectState, now = Date.now()): Capsule {
    const relevant = threadScope(thread, project);
    return { goal: thread.messages.find(m => m.role === 'user')?.text.slice(0, 800) ?? thread.title,
        confirmed: relevant.filter(t => t.kind === 'crystal').map(t => t.text.slice(0, 500)).slice(0, 8),
        tentative: relevant.filter(t => t.kind === 'thought').map(t => t.text.slice(0, 500)).slice(0, 8),
        openQuestions: thread.messages.filter(m => m.role === 'user' && /[?\uff1f]/.test(m.text)).slice(-4).map(m => m.text.slice(0, 500)),
        sources: relevant.filter(t => t.sourceId).map(t => t.sourceId!).slice(0, 24), rebuiltAt: now };
}
export function compileContext(project: ProjectState, selection: string[], options: CompileOptions = {}): ContextPacket {
    const thread = options.threadId ? project.threads[options.threadId] : undefined;
    const supplied = thread ? thread.scopeIds : selection;
    const explicit = !!thread || selection.length > 0;
    const all = Object.values(project.thoughts);
    const scopeItems = thread ? threadScope(thread, project) : explicit ? supplied.map(k => project.thoughts[k]).filter(Boolean) : all.filter(t => t.life !== 'memory').sort((a, b) => Number(b.kind === 'crystal') - Number(a.kind === 'crystal') || b.touchedAt - a.touchedAt).slice(0, 24);
    if (explicit && !scopeItems.length)
        throw new Error('Claim a possibility before using it as an AI scope.');
    const scope = scopeItems.slice(0, 24).map(brief);
    const scopeSet = new Set(scope.map(t => t.id));
    const relations = Object.values(project.relations).filter(r => scopeSet.has(r.a) || scopeSet.has(r.b)).slice(0, 16).map(({ a, b, kind, label }) => ({ a, b, kind, label: label.slice(0, 300) }));
    const related = new Set(relations.flatMap(r => [r.a, r.b]));
    const local = all.filter(t => !scopeSet.has(t.id) && related.has(t.id)).slice(0, 12).map(brief);
    // Recall retrieval is literal query matching, not a learned preference or hidden recommendation.
    const query = options.query?.toLocaleLowerCase().trim() ?? '';
    const retrievedThoughts = query.length >= 2 ? all.filter(t => !scopeSet.has(t.id) && t.text.toLocaleLowerCase().includes(query)).slice(0, 4).map(brief) : [];
    const sourceIds = new Set((options.allowScopedSources === false ? [] : scopeItems).filter(t => t.kind === 'source').map(t => t.sourceId).filter((s): s is string => !!s));
    if (options.projectSources)
        for (const t of [...scopeItems, ...all.filter(t => related.has(t.id))]) {
            if (t.sourceId)
                sourceIds.add(t.sourceId);
            const original = project.thoughts[t.id];
            if (original?.origin?.sourceId)
                sourceIds.add(original.origin.sourceId);
        }
    if (options.evidence?.length && !options.web)
        throw new Error('Web evidence requires explicit web permission.');
    const sources = [...sourceIds].map(k => project.sources[k]).filter(s => s && readableSource(s)).slice(0, 4).map(s => ({ id: s.id, title: s.title.slice(0, 1000), excerpt: (s.evidence ? s.evidence.passages.map(passage => passage.text).join('\n\n') : s.excerpt).slice(0, 2500), inspected: (s.inspected + (s.evidence ? ' / ' + s.evidence.passages.map(passage => passage.locator + ' @ ' + passage.retrievedAt + ' via ' + passage.provider).join('; ') : '')).slice(0, 1000), url: s.url }));
    if (options.web && options.evidence) {
        const external = options.evidence.filter(hasReadPassages).slice(0, 2).map(s => ({ id: s.id, title: s.title.slice(0, 1000), excerpt: s.passages!.map(passage => passage.text).join('\n\n').slice(0, 2500), inspected: (s.inspected + ' / ' + s.passages!.map(passage => passage.locator + ' @ ' + passage.retrievedAt + ' via ' + passage.provider).join('; ')).slice(0, 1000), url: s.url }));
        sources.splice(Math.max(0, 4 - external.length));
        sources.push(...external);
    }
    return { contract: CORE_CONTRACT, projectId: project.id, scopeMode: explicit ? 'selection' : 'field', scope, local, relations,
        ...(thread ? { thread: { id: thread.id, capsule: rebuildCapsule(thread, project), recent: thread.messages.slice(-6).map(m => ({ role: m.role, text: m.text.slice(0, 1600) })) } } : {}),
        retrieved: { thoughts: retrievedThoughts, sources }, permissions: { web: !!options.web, projectSources: !!options.projectSources }, tools: ['surface_possibility', 'surface_question', 'surface_relation', 'surface_structure', 'request_thread', 'request_deep_dive', 'request_crystal_preview'], maxCandidates: Math.max(1, Math.min(5, options.maxCandidates ?? 3)) };
}
