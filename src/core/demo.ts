import { createProject, makeThought, type ProjectState, type SessionState } from './model.ts';
/** The origin note of every authored example thought.
 *
 * It carries two jobs at once, which is why it is one exported constant rather than a literal in
 * two files: `ThoughtView` treats it as the marker that says "this text is the product's own copy,
 * so resolve it through the translator", and the History timeline *shows* it as the thought's
 * provenance. It used to say `system-demo`, which is a fixture id — readable to whoever wrote the
 * seed data and to nobody else.
 */
export const EXAMPLE_FIELD_ORIGIN = 'Part of the example Field';
/** Whether this item is the product's own authored example copy. Authored copy is stored as its
 * dictionary key, so every place that shows it must resolve it through the translator — the Field,
 * and the History timeline's "what is here now" section — and nowhere else may, because a person's
 * own words are never looked up in a dictionary. */
export const isAuthoredExample = (item: { origin?: { note?: string } }): boolean => item.origin?.note === EXAMPLE_FIELD_ORIGIN;
export function demoProject(): ProjectState {
    const now = Date.now();
    const s = createProject('demo', 'Quiet, not empty', now);
    const seeds = [
        ['attention', 'Attention should change clarity, not position.', 525, 160],
        ['unfinished', 'If the background fades, do we lose the context that made this matter?', 205, 265],
        ['structure', 'Perhaps selection itself defines a temporary scope.', 560, 340],
        ['crystal', 'Focus should retain the spatial context around it.', 290, 505],
        ['quiet', 'Structure should appear only when it is needed.', 690, 565],
        ['proof', 'An unfinished thought still needs somewhere to stay.', 390, 725],
    ] as const;
    for (const [key, text, x, y] of seeds)
        s.thoughts[key] = { ...makeThought(text, { x, y }, now, key), origin: { note: EXAMPLE_FIELD_ORIGIN } };
    s.thoughts.crystal = { ...s.thoughts.crystal, kind: 'crystal', kept: true };
    s.thoughts.earlier = { ...makeThought('What did this earlier question leave unresolved?', { x: -480, y: 430 }, now - 86400000, 'earlier'), life: 'memory', origin: { note: EXAMPLE_FIELD_ORIGIN } };
    s.relations.seed = { id: 'seed', a: 'attention', b: 'structure', kind: 'resonance', label: 'Attention reveals structure', status: 'confirmed', createdAt: now };
    s.history = [{ id: 'seed-history', kind: 'demo', summary: 'Selection makes a temporary scope', thoughtIds: ['attention', 'structure'], at: now }];
    return s;
}
export function performanceProject(count: number): ProjectState {
    const s = createProject(`perf-${count}`, `Performance fixture / ${count}`);
    const now = Date.now();
    for (let i = 0; i < count; i++) {
        const t = makeThought(i % 7 === 0 ? 'A longer unfinished thought about the difference between keeping something and being ready to act on it.' : 'A thought with space around it.', { x: (i % 40) * 330, y: Math.floor(i / 40) * 180 }, now, `p-${i}`);
        if (i % 29 === 0) {
            t.kind = 'crystal';
            t.kept = true;
        }
        s.thoughts[t.id] = t;
    }
    if (count >= 100) {
        s.thoughts['p-3'] = { ...s.thoughts['p-3'], kind: 'source', sourceId: 'fixture-source', text: 'An authored fixture reference' };
        s.sources['fixture-source'] = { id: 'fixture-source', title: 'Fixture reference', mime: 'text/plain', status: 'ready', excerpt: 'Authored content for a performance fixture, not retrieved evidence.', inspected: 'Authored test fixture text', provenance: { note: 'Performance fixture only' } };
        for (let i = 0; i < 8; i++)
            s.relations['fixture-' + i] = { id: 'fixture-' + i, a: 'p-' + i, b: 'p-' + (i + 1), kind: i % 2 ? 'gap' : 'resonance', label: 'Fixture relation', status: 'confirmed', createdAt: now };
        for (let i = 0; i < 2; i++) {
            const members = [i * 8, i * 8 + 1, i * 8 + 2].map(n => 'p-' + n);
            s.regions['fixture-region-' + i] = { id: 'fixture-region-' + i, name: 'Fixture neighborhood ' + (i + 1), x: i * 2640 + 400, y: 150, members, activity: 3 };
        }
    }
    return s;
}
export function performanceSession(project: ProjectState): SessionState {
    const ghosts: SessionState['ghosts'] = {};
    for (let i = 0; i < 8; i++) {
        const key = 'fixture-ghost-' + i;
        ghosts[key] = { id: key, text: 'An unsettled fixture possibility, not a model response.', x: 40 + i * 165, y: 800, createdAt: Date.now(), scopeIds: ['p-1'], origin: { note: 'Authored performance fixture' } };
    }
    return { ghosts, phenomena: {}, structures: {}, recalls: project.thoughts['p-40'] ? ['p-40'] : [] };
}
