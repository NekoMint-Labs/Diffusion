import { id, type ProjectState, type SourceRecord } from './model.ts';
import { DomainError } from './errors.ts';
type Dict = Record<string, unknown>;
const unsafe = new Set(['__proto__', 'prototype', 'constructor']);
function fail(message: string): never { throw new DomainError('Invalid project: ' + message); }
function object(value: unknown, name: string): Dict { if (!value || typeof value !== 'object' || Array.isArray(value))
    fail(name + ' must be an object'); return value as Dict; }
function text(value: unknown, name: string, max = 20000, empty = true): asserts value is string { if (typeof value !== 'string' || value.length > max || (!empty && !value.trim()))
    fail(name + ' must be a bounded string'); }
function key(value: unknown, name = 'id'): asserts value is string { text(value, name, 200, false); if (unsafe.has(value))
    fail('unsafe identifier'); }
function number(value: unknown, name: string, min = -1e7, max = 1e7): asserts value is number { if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max)
    fail(name + ' is outside its finite budget'); }
function timestamp(value: unknown) { number(value, 'timestamp', 0, 8640000000000000); }
function list(value: unknown, name: string, max = 20000): unknown[] { if (!Array.isArray(value) || value.length > max)
    fail(name + ' must be a bounded array'); return value; }
function choices(value: unknown, values: string[], name: string) { if (typeof value !== 'string' || !values.includes(value))
    fail(name + ' has an unknown value'); }
function map(value: unknown, name: string, max: number): Dict { const m = object(value, name); if (Object.keys(m).length > max)
    fail(name + ' exceeds the object budget'); for (const k of Object.keys(m))
    key(k, name + ' key'); return m; }
function url(value: unknown) { text(value, 'URL', 4000, false); try {
    const u = new URL(value);
    if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password)
        fail('unsafe external URL');
}
catch {
    fail('invalid external URL');
} }
function provenance(value: unknown) { if (value === undefined)
    return; const p = object(value, 'provenance'); for (const k of ['projectId', 'thoughtId', 'sourceId', 'inputId'])
    if (p[k] !== undefined)
        key(p[k], k); if (p.url !== undefined)
    url(p.url); if (p.locator !== undefined)
    text(p.locator, 'locator', 1000); if (p.note !== undefined)
    text(p.note, 'provenance note', 10000); if (p.ranges !== undefined) for (const value of list(p.ranges, 'provenance ranges', 64)) { const range = object(value, 'provenance range'); key(range.inputId, 'range input id'); number(range.start, 'range start', 0, 65000); number(range.end, 'range end', 0, 65000); if ((range.end as number) <= (range.start as number)) fail('provenance range must have positive length'); } }
function walk(value: unknown, depth = 0, counter = { n: 0 }): void { if (++counter.n > 500000 || depth > 20)
    fail('nested data exceeds its structural budget'); if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
        if (unsafe.has(k))
            fail('unsafe object key');
        walk(v, depth + 1, counter);
    }
} }
/** Validate one incoming Source without scanning the whole Field. */
export function validateSourceRecord(value: unknown, expectedId?: string): SourceRecord {
    walk(value);
    const s = object(value, 'source');
    key(s.id, 'source id');
    if (expectedId !== undefined && s.id !== expectedId)
        fail('source identity mismatch');
    text(s.title, 'source title', 1000, false);
    text(s.mime, 'media type', 200);
    choices(s.status, ['processing', 'ready', 'limited', 'unavailable'], 'source status');
    text(s.excerpt, 'source excerpt', 6000);
    text(s.inspected, 'inspection scope', 2000);
    object(s.provenance, 'Source provenance');
    provenance(s.provenance);
    if (s.url !== undefined)
        url(s.url);
    if (s.size !== undefined)
        number(s.size, 'source size', 0, 1e15);
    if (s.originalPath !== undefined)
        text(s.originalPath, 'native path', 4000);
    if (s.originalKey !== undefined)
        text(s.originalKey, 'original key', 500);
    if (s.error !== undefined)
        text(s.error, 'source error', 10000);
    if (s.discoverySnippet !== undefined) text(s.discoverySnippet, 'discovery snippet', 6000);
    if (s.evidence !== undefined) {
        const evidence = object(s.evidence, 'read evidence');
        choices(evidence.stage, ['read', 'judged'], 'evidence stage');
        const passages = list(evidence.passages, 'read passages', 4);
        if (!passages.length) fail('read evidence has no passages');
        const passageIds = new Set<string>();
        for (const value of passages) {
            const passage = object(value, 'passage');
            key(passage.id); if (passageIds.has(passage.id)) fail('duplicate passage id');
            passageIds.add(passage.id);
            text(passage.text, 'passage text', 2500, false); url(passage.url);
            text(passage.locator, 'passage locator', 500, false);
            text(passage.inspected, 'passage scope', 1000);
            text(passage.provider, 'passage provider', 200, false); timestamp(passage.retrievedAt);
        }
        const actualExcerpt = passages.map(value => (value as Dict).text as string).join('\n\n').slice(0, 6000);
        if (s.excerpt !== actualExcerpt) fail('source excerpt differs from its read passages');
        if (evidence.stage === 'judged' && evidence.judgment === undefined) fail('judged evidence lacks reasoning');
        if (evidence.stage === 'read' && evidence.judgment !== undefined) fail('read evidence cannot hide a judgment');
        if (evidence.judgment !== undefined) {
            const judgment = object(evidence.judgment, 'evidence judgment');
            choices(judgment.outcome, ['support', 'challenge', 'partial', 'prior-art', 'inconclusive', 'conflicting'], 'evidence outcome');
            text(judgment.claim, 'assessed claim', 3000, false); text(judgment.rationale, 'evidence rationale', 4000, false);
            text(judgment.provider, 'reasoning provider', 200, false); timestamp(judgment.at);
            const refs = list(judgment.passageIds, 'judgment passages', 4);
            if (!refs.length) fail('judgment has no read references');
            for (const ref of refs) { key(ref); if (!passageIds.has(ref)) fail('judgment cites an unread passage'); }
        }
    }
    if (s.lastSubmitted !== undefined) {
        const a = object(s.lastSubmitted, 'submission');
        timestamp(a.at);
        text(a.provider, 'provider label', 200);
        number(a.characters, 'submitted characters', 0, 2500);
        key(a.requestId);
    }
    return value as SourceRecord;
}

/** Dependency-independent validation for persistence and recovery. Never trusts a type assertion alone. */
export function validateProject(value: unknown): ProjectState {
    walk(value);
    const raw = object(value, 'project');
    // `inputs` was introduced after the original schemaVersion 1 export. Missing means an older
    // project, not corruption; normalize it without rewriting the export format.
    const p: Dict = raw.inputs === undefined ? { ...raw, inputs: {} } : raw;
    if (p.schemaVersion !== 1)
        fail('unsupported schema version');
    key(p.id, 'project id');
    text(p.title, 'title', 200, false);
    timestamp(p.createdAt);
    timestamp(p.updatedAt);
    const thoughts = map(p.thoughts, 'thoughts', 20000), sources = map(p.sources, 'sources', 4000), inputs = map(p.inputs, 'inputs', 20000), relations = map(p.relations, 'relations', 40000), regions = map(p.regions, 'regions', 500), threads = map(p.threads, 'threads', 5000);
    for (const [k, value] of Object.entries(inputs)) {
        const input = object(value, 'input record');
        if (input.id !== k) fail('input identity mismatch');
        text(input.text, 'input text', 65000);
        timestamp(input.createdAt);
    }
    const verifyInputProvenance = (value: unknown) => {
        if (value === undefined) return;
        const origin = object(value, 'provenance');
        if (origin.inputId === undefined) return;
        key(origin.inputId, 'input id');
        const input = inputs[origin.inputId as string];
        if (!input) fail('dangling input provenance');
        const inputText = object(input, 'input record').text as string;
        if (origin.ranges === undefined) return;
        for (const rawRange of list(origin.ranges, 'provenance ranges', 64)) {
            const range = object(rawRange, 'provenance range');
            if (range.inputId !== origin.inputId) fail('mixed input provenance range');
            number(range.start, 'range start', 0, inputText.length);
            number(range.end, 'range end', 0, inputText.length);
            if ((range.end as number) <= (range.start as number)) fail('invalid input provenance range');
        }
    };
    for (const [k, v] of Object.entries(thoughts)) {
        const t = object(v, 'thought');
        if (t.id !== k)
            fail('thought identity mismatch');
        text(t.text, 'thought text');
        number(t.x, 'thought x');
        number(t.y, 'thought y');
        choices(t.kind, ['thought', 'crystal', 'source'], 'thought kind');
        choices(t.life, ['active', 'cooling', 'peripheral', 'memory'], 'lifecycle');
        if (typeof t.kept !== 'boolean')
            fail('Keep must be boolean');
        timestamp(t.createdAt);
        timestamp(t.updatedAt);
        timestamp(t.touchedAt);
        if (t.attentionDebt !== undefined) number(t.attentionDebt, 'attention debt', 0, 32);
        provenance(t.origin);
        verifyInputProvenance(t.origin);
        if (t.derivedFrom !== undefined) {
            const parents = list(t.derivedFrom, 'causal lineage', 32);
            const seen = new Set<string>();
            for (const parent of parents) {
                key(parent);
                if (parent === k || seen.has(parent) || !Object.hasOwn(thoughts, parent)) fail('invalid causal lineage');
                seen.add(parent);
            }
            if (!parents.length) fail('empty causal lineage');
            if (t.generationAction === undefined) fail('causal lineage lacks generation action');
        }
        if (t.generationAction !== undefined) {
            choices(t.generationAction, ['continue', 'angle', 'question'], 'generation action');
            if (t.derivedFrom === undefined) fail('generation action lacks causal lineage');
        }
        if (t.sourceId !== undefined) {
            key(t.sourceId);
            if (!Object.hasOwn(sources, t.sourceId))
                fail('dangling source reference');
        }
        if (t.kind === 'source' && t.sourceId === undefined)
            fail('Source thought lacks its source record');
    }
    for (const [k, v] of Object.entries(sources)) validateSourceRecord(v, k);
    for (const [k, v] of Object.entries(relations)) {
        const r = object(v, 'relation');
        if (r.id !== k)
            fail('relation identity mismatch');
        key(r.a);
        key(r.b);
        if (r.a === r.b || !Object.hasOwn(thoughts, r.a) || !Object.hasOwn(thoughts, r.b))
            fail('dangling or reflexive relation');
        choices(r.kind, ['resonance', 'tension', 'gap', 'support', 'bridge'], 'relation kind');
        if (r.status !== 'confirmed')
            fail('only confirmed relations persist');
        text(r.label, 'relation label', 500);
        timestamp(r.createdAt);
        provenance(r.provenance);
        verifyInputProvenance(r.provenance);
    }
    for (const [k, v] of Object.entries(regions)) {
        const r = object(v, 'region');
        if (r.id !== k)
            fail('region identity mismatch');
        text(r.name, 'region name', 100, false);
        number(r.x, 'region x');
        number(r.y, 'region y');
        number(r.activity, 'region activity', 0, 1e12);
        for (const member of list(r.members, 'region members')) {
            key(member);
            if (!Object.hasOwn(thoughts, member))
                fail('dangling Region member');
        }
    }
    for (const [k, v] of Object.entries(threads)) {
        const t = object(v, 'thread');
        if (t.id !== k)
            fail('thread identity mismatch');
        text(t.title, 'thread title', 200);
        timestamp(t.createdAt);
        for (const ref of list(t.scopeIds, 'thread scope'))
            key(ref);
        if (t.scopeSnapshot !== undefined) {
            const snapshots = object(t.scopeSnapshot, 'Thread scope snapshot');
            for (const [scopeKey, value] of Object.entries(snapshots)) {
                key(scopeKey);
                const entry = object(value, 'Thread scope entry');
                if (entry.id !== scopeKey || !(t.scopeIds as unknown[]).includes(scopeKey)) fail('Thread snapshot identity mismatch');
                text(entry.text, 'Thread snapshot text');
                choices(entry.kind, ['thought', 'crystal', 'source'], 'Thread snapshot kind');
                if (entry.sourceId !== undefined) key(entry.sourceId);
            }
        }
        for (const message of list(t.messages, 'raw transcript', 10000)) {
            const m = object(message, 'message');
            key(m.id);
            choices(m.role, ['user', 'assistant'], 'message role');
            text(m.text, 'message text', 65000);
            timestamp(m.at);
            if (m.provider !== undefined)
                text(m.provider, 'provider', 200);
        }
        if (t.capsule !== undefined) {
            const c = object(t.capsule, 'Thread capsule');
            text(c.goal, 'capsule goal', 12000);
            timestamp(c.rebuiltAt);
            for (const name of ['confirmed', 'tentative', 'openQuestions', 'sources'])
                for (const item of list(c[name], name, 1000))
                    text(item, 'capsule entry', 20000);
        }
    }
    for (const value of list(p.history, 'history', 100000)) {
        const h = object(value, 'history entry');
        key(h.id);
        text(h.kind, 'trajectory kind', 200);
        text(h.summary, 'trajectory summary', 3000);
        timestamp(h.at);
        for (const ref of list(h.thoughtIds, 'trajectory refs'))
            key(ref);
    }
    const camera = object(p.camera, 'camera');
    number(camera.x, 'camera x');
    number(camera.y, 'camera y');
    number(camera.zoom, 'zoom', .08, 2.5);
    if (p.fork !== undefined) {
        const f = object(p.fork, 'fork origin');
        key(f.parentId);
        if (f.parentId === p.id)
            fail('world cannot fork from itself');
        timestamp(f.createdAt);
        for (const v of Object.values(map(f.baseTexts, 'fork base', 20000)))
            text(v, 'base wording');
        if (f.baseKinds !== undefined)
            for (const v of Object.values(map(f.baseKinds, 'base kinds', 20000)))
                choices(v, ['thought', 'crystal', 'source'], 'base kind');
    }
    return p as unknown as ProjectState;
}
export function parseProjectExport(textValue: string): ProjectState {
    if (textValue.length > 10 * 1024 * 1024)
        fail('export exceeds the 10 MiB recovery budget');
    const parsed = object(JSON.parse(textValue), 'export');
    if (parsed.format !== 'diffusion-project' || parsed.version !== 1)
        fail('not a supported Diffusion project export');
    return validateProject(parsed.project);
}
export function recoveredProject(original: ProjectState, now = Date.now()): ProjectState {
    const p = structuredClone(validateProject(original));
    const originalId = p.id;
    p.id = id('recovered');
    p.title = (p.title + ' (restored)').slice(0, 200);
    p.createdAt = now;
    p.updatedAt = now;
    for (const s of Object.values(p.sources)) {
        delete s.originalPath;
        delete s.originalKey;
        delete s.lastSubmitted;
        if (s.status === 'processing') {
            s.status = 'limited';
            s.inspected = 'Recovered metadata; the earlier extraction did not complete.';
        }
    }
    for (const t of Object.values(p.threads))
        delete t.capsule;
    p.history = [...p.history, { id: id('h'), kind: 'world.restore', summary: `Restored from ${originalId} as a new project. Existing projects were not overwritten.`, thoughtIds: [], at: now }];
    return p;
}
/** A browser restart cannot resume a vanished worker. Keep already inspected data honest. */
export function reenterProject(value: ProjectState): ProjectState {
    const project = validateProject(value);
    let changed = false;
    const sources = { ...project.sources };
    for (const source of Object.values(sources))
        if (source.status === 'processing') {
            changed = true;
            sources[source.id] = { ...source, status: 'limited', inspected: source.excerpt ? 'Partial extraction retained; processing was interrupted before completion.' : 'Metadata only; processing was interrupted before completion.', error: 'Extraction did not survive the previous session. Drop the original again to retry.' };
        }
    return changed ? { ...project, sources } : project;
}
