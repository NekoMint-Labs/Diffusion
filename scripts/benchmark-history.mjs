/** Actual ProjectController history cost at stress scale: representation, memory and Undo/Redo latency.
 * Node measurements of the canonical controller. NOT UI latency, not Dexie/IndexedDB disk latency.
 * Run with `--expose-gc` (see `pnpm run bench:history`) so heap attribution is meaningful.
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { performanceProject } from '../src/core/demo.ts';
import { reduceProject } from '../src/core/reducer.ts';
import { userEvent } from '../src/core/events.ts';
import { ProjectController } from '../src/core/controller.ts';

const gc = () => { if (global.gc) { global.gc(); global.gc(); } };
const heapMB = () => +(process.memoryUsage().heapUsed / 1048576).toFixed(2);
const round = (value) => +value.toFixed(3);
function measure(fn, count = 60) {
    const samples = [];
    for (let i = 0; i < count + 10; i++) {
        const started = performance.now();
        fn(i);
        if (i >= 10) samples.push(performance.now() - started);
    }
    samples.sort((a, b) => a - b);
    return { meanMs: round(samples.reduce((a, b) => a + b, 0) / samples.length), p95Ms: round(samples[Math.floor(samples.length * .95)]), samples: count };
}

// 1. Representation: is a history entry a copy of the whole project, or copy-on-write?
const base = performanceProject(5000);
const moved = reduceProject(base, userEvent({ type: 'thought.move', positions: { 'p-1': { x: 10, y: 20 } } }, 1));
const edited = reduceProject(moved, userEvent({ type: 'thought.edit', id: 'p-2', text: 'Edited once' }, 2));
const representation = {
    thoughtsMapReplaced: moved.thoughts !== base.thoughts,
    untouchedThoughtSharedByIdentity: moved.thoughts['p-4999'] === base.thoughts['p-4999'],
    changedThoughtReplaced: moved.thoughts['p-1'] !== base.thoughts['p-1'],
    relationsShared: moved.relations === base.relations,
    regionsShared: moved.regions === base.regions,
    sourcesShared: moved.sources === base.sources,
    threadsShared: moved.threads === base.threads,
    historyArraySharedWhenNoTrajectoryEntry: moved.history === base.history,
    historyArrayCopiedWhenEntryAdded: edited.history !== moved.history,
    snapshotIsProjectReference: 'the controller pushes the previous ProjectState object itself, without cloning',
};
assert.equal(representation.thoughtsMapReplaced, true);
assert.equal(representation.untouchedThoughtSharedByIdentity, true);
assert.equal(representation.changedThoughtReplaced, true);
assert.equal(representation.relationsShared, true);
assert.equal(representation.historyArraySharedWhenNoTrajectoryEntry, true);
assert.equal(representation.historyArrayCopiedWhenEntryAdded, true);

// 2. What one deep copy of this Field would cost, for comparison.
gc();
const beforeClones = heapMB();
const clones = Array.from({ length: 5 }, () => structuredClone(base));
gc();
const deepCopyMB = round((heapMB() - beforeClones) / clones.length);
clones.length = 0;
gc();

// 3. Fill 60 realistic history entries, measuring each mutation and the heap it retains.
const controller = new ProjectController(base, async () => { });
gc();
const heapWithProjectMB = heapMB();
const steps = [];
let heap = heapWithProjectMB;
for (let i = 0; i < 60; i++) {
    const started = performance.now();
    // Realistic mix: a small drag of one Thought, and a committed wording edit.
    if (i % 2 === 0)
        controller.dispatch({ type: 'thought.edit', id: `p-${i}`, text: `History fixture edit ${i}` });
    else
        controller.dispatch({ type: 'thought.move', positions: { [`p-${i}`]: { x: 100 + i, y: 200 + i } } });
    const mutationMs = round(performance.now() - started);
    gc();
    const now = heapMB();
    steps.push({ step: i + 1, kind: i % 2 === 0 ? 'edit' : 'move', mutationMs, heapMB: now, retainedMB: round(now - heap) });
    heap = now;
}
const retainedByHistoryMB = round(heap - heapWithProjectMB);
const perEntryMB = round(retainedByHistoryMB / 60);
const deepCopiesAvoidedMB = round(deepCopyMB * 60);

// 4. History bound: 60 entries, not more.
const bounded = new ProjectController(performanceProject(200), async () => { });
for (let i = 0; i < 100; i++)
    bounded.dispatch({ type: 'thought.edit', id: 'p-1', text: `Bounded ${i}` });
let undoable = 0;
while (bounded.canUndo) { bounded.undo(); undoable += 1; }
assert.equal(undoable, 60);

// 5. Undo / Redo latency at 5000 Thoughts (measuring the real controller path, including restore()).
const undoMs = [];
while (controller.canUndo) {
    const started = performance.now();
    controller.undo();
    undoMs.push(performance.now() - started);
}
gc();
const heapAfterUndoMB = heapMB();
const redoMs = [];
while (controller.canRedo) {
    const started = performance.now();
    controller.redo();
    redoMs.push(performance.now() - started);
}
gc();
const heapAfterRedoMB = heapMB();
const latency = (samples) => {
    const sorted = [...samples].sort((a, b) => a - b);
    return { meanMs: round(sorted.reduce((a, b) => a + b, 0) / sorted.length), p95Ms: round(sorted[Math.floor(sorted.length * .95)]), maxMs: round(sorted.at(-1)), samples: sorted.length };
};
assert.equal(undoMs.length, 60);
assert.equal(redoMs.length, 60);

// 6. restore() change detection: current JSON comparison vs identity comparison (evidence only).
const movedAgain = reduceProject(base, userEvent({ type: 'thought.move', positions: { 'p-1': { x: 11, y: 21 } } }, 3));
gc();
const jsonDetection = measure(() => {
    let changed = 0;
    for (const key of Object.keys(base.thoughts))
        if (JSON.stringify(movedAgain.thoughts[key]) !== JSON.stringify(base.thoughts[key]))
            changed += 1;
    return changed;
}, 20);
gc();
const identityDetection = measure(() => {
    let changed = 0;
    for (const key of Object.keys(base.thoughts))
        if (movedAgain.thoughts[key] !== base.thoughts[key])
            changed += 1;
    return changed;
}, 200);
assert.equal(identityDetection.meanMs < jsonDetection.meanMs, true);

const report = {
    scope: 'ProjectController history representation, bounded memory and Undo/Redo latency for a 5000-Thought Field, measured in Node. Memory figures use --expose-gc and are approximate; no UI or IndexedDB cost is included.',
    node: process.version,
    field: { thoughts: Object.keys(base.thoughts).length, historyEntries: base.history.length, serializedBytes: Buffer.byteLength(JSON.stringify(base)) },
    representation,
    memory: {
        deepCopyOfFieldMB: deepCopyMB,
        heapWithProjectMB,
        retainedBySixtyEntriesMB: retainedByHistoryMB,
        retainedPerEntryMB: perEntryMB,
        deepCopiesAvoidedMB,
        heapAfterUndoAllMB: heapAfterUndoMB,
        heapAfterRedoAllMB: heapAfterRedoMB,
        note: 'Each entry retains one new 5000-key thoughts map whose values are the shared previous Thought objects, plus the thoughts the mutation replaced. It never deep-copies the Field.',
    },
    latency: {
        mutation: latency(steps.map(step => step.mutationMs)),
        undo: latency(undoMs),
        redo: latency(redoMs),
        stepRetention: steps.slice(0, 5).concat(steps.slice(-2)),
    },
    bound: { filledSteps: 100, undoableEntries: undoable, expected: 60 },
    changeDetectionEvidence: { currentJsonComparison: jsonDetection, identityComparison: identityDetection },
    result: 'PASS',
};
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
