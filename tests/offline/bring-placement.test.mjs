import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createProject, makeThought } from '../../src/core/model.ts';
import { bringToMain, forkProject } from '../../src/core/world.ts';
import { estimateItemSize, overlapArea } from '../../src/field/spatial/collision.ts';
import { placeBroughtThought } from '../../src/field/spatial/bringPlacement.ts';

const longText = '这是公开合成的长文，用于检查分支带回时是否遮住原有卡片，不能把预览或摘要当作完整原文。'.repeat(6);
const manualText = '验收用手写长文。我的原话必须保持完整，分支功能只负责复制和比较，不应该因为内容较长就把它自动当成模型写作。我会在分支里补充一个想法，再把选中的内容带回主线。整个过程中，所有改动都应该可理解，也可以通过撤销恢复。我希望检查的不是华丽效果，而是普通使用者能否始终知道自己在哪里、哪些内容已经留下、哪些内容只是临时建议，以及下一步按钮究竟会做什么。这里的每一句话都是公开合成测试数据，不来自私人课程记录，也不来自用户已有项目。';
const demoText = '也许真正稀缺的不是这个选择，而是一段“选错了也还来得及”的时间。';
const box = thought => ({ x: thought.x, y: thought.y, ...estimateItemSize(thought) });
const card = (id, text, x, y, extra = {}) => ({ ...makeThought(text, { x, y }, 1, id), ...extra });

function assertClear(thought, occupied) {
    assert.ok(Number.isFinite(thought.x) && Number.isFinite(thought.y), 'placement stays finite');
    for (const other of occupied) {
        assert.equal(overlapArea(box(thought), box(other)), 0, `${thought.id} must not cover ${other.id}`);
    }
}

function assertMainPreserved(before, input, result) {
    assert.deepEqual(input, before, 'Bring must not mutate the supplied Main');
    for (const [id, thought] of Object.entries(before.thoughts)) {
        assert.deepEqual(result.thoughts[id], thought, `existing Main card ${id} stays unchanged`);
    }
    for (const key of ['camera', 'relations', 'regions', 'inputs', 'threads']) {
        assert.deepEqual(result[key], before[key], `Main ${key} stays unchanged`);
    }
}

test('Bring clears the native N01 partial overlap instead of accepting a non-severe overlap', () => {
    const main = createProject('native-main', 'Public native reproduction', 1);
    main.camera = { x: 122.66666412353516, y: 74.82696266069661, zoom: 1 };
    main.thoughts.manual = card('manual', manualText, 740, 120, { kept: true });
    main.thoughts.demo = card('demo', demoText, 740, 337, { generatedBy: 'ai' });
    const fork = forkProject(main, 'Public fork', 2);
    fork.thoughts.manual.text += ' 分支补充：先做一个小例子再决定。';
    const anchor = { x: 472.33333587646484, y: 335.6469963084196 };
    const desired = { ...fork.thoughts.manual, ...anchor };
    const horizontalOverlap = desired.x + box(desired).width - main.thoughts.demo.x;
    assert.ok(horizontalOverlap > 60 && horizontalOverlap < 61, 'fixture retains the observed ~60px overlap');
    assert.ok(overlapArea(box(desired), box(main.thoughts.demo)) > 0);
    const before = structuredClone(main);
    const brought = bringToMain(main, fork, ['manual'], anchor, 3, placeBroughtThought);
    assert.equal(brought.count, 1);
    const added = brought.project.thoughts[brought.ids[0]];
    assertClear(added, Object.values(main.thoughts));
    assert.equal(added.text, fork.thoughts.manual.text);
    assert.equal(added.generatedBy, undefined);
    assertMainPreserved(before, main, brought.project);
});

test('a clear preferred Bring position stays exactly where requested without mutating inputs', () => {
    const main = createProject('clear', 'Public clear slot', 1);
    main.thoughts.existing = card('existing', longText, -1500, -1500);
    const incoming = card('incoming', longText, 125.25, 351.75);
    const beforeMain = structuredClone(main);
    const beforeIncoming = structuredClone(incoming);
    assert.deepEqual(placeBroughtThought(main, incoming), { x: incoming.x, y: incoming.y });
    assert.deepEqual(main, beforeMain);
    assert.deepEqual(incoming, beforeIncoming);
});

test('batch Bring reserves wide cards and mixed semantic kinds while preserving Main and origin contracts', () => {
    const main = createProject('batch-main', 'Public mixed batch', 1);
    main.camera = { x: 127, y: -81, zoom: 1 };
    main.inputs.input = { id: 'input', text: 'Public authored input.', createdAt: 1 };
    main.thoughts.wideA = card('wideA', longText, 0, 0);
    main.thoughts.wideB = card('wideB', longText, 350, 0, { generatedBy: 'ai' });
    main.thoughts.crystal = card('crystal', longText, 700, 0, { kind: 'crystal', kept: true });
    main.sources.source = { id: 'source', title: 'Public source', status: 'ready', mime: 'text/plain', excerpt: 'Public source excerpt.', inspected: 'Test excerpt only.', provenance: {} };
    main.thoughts.source = card('source', longText, 1050, 0, { kind: 'source', sourceId: 'source' });
    main.relations.relation = { id: 'relation', a: 'wideA', b: 'wideB', kind: 'tension', label: 'Public relation', status: 'confirmed', createdAt: 1 };
    const fork = forkProject(main, 'Public mixed fork', 2);
    const selected = Object.keys(fork.thoughts);
    for (const id of selected) fork.thoughts[id].text += ` ${id} 的分支补充。`;
    fork.thoughts.wideB.proposition = { version: 1, text: '合成观点，不能替换原文。', original: fork.thoughts.wideB.text };
    const before = structuredClone(main);
    const beforeFork = structuredClone(fork);
    const occupancyCounts = [];
    const brought = bringToMain(main, fork, selected, { x: 100, y: 180 }, 3, (current, incoming) => {
        occupancyCounts.push(Object.keys(current.thoughts).length);
        return placeBroughtThought(current, incoming);
    });
    assert.equal(brought.count, selected.length);
    assert.deepEqual(occupancyCounts, selected.map((_, index) => selected.length + index), 'later arrivals see earlier Bring cards');
    const occupied = Object.values(main.thoughts);
    for (let index = 0; index < brought.ids.length; index++) {
        const added = brought.project.thoughts[brought.ids[index]];
        const original = fork.thoughts[selected[index]];
        assertClear(added, occupied);
        occupied.push(added);
        assert.equal(added.text, original.text);
        assert.equal(added.kind, original.kind);
        assert.equal(added.generatedBy, original.generatedBy);
        assert.deepEqual(added.proposition, original.proposition);
        assert.equal(added.sourceId, original.sourceId);
        assert.equal(added.origin.projectId, fork.id);
        assert.equal(added.origin.thoughtId, original.id);
    }
    assertMainPreserved(before, main, brought.project);
    assert.deepEqual(brought.project.sources, before.sources);
    assert.deepEqual(fork, beforeFork, 'placement never rewrites the fork');
});

test('Bring checks an obstacle added only to latest Main after the fork snapshot', () => {
    const main = createProject('latest-main', 'Public latest Main', 1);
    main.thoughts.manual = card('manual', longText, -1000, -1000);
    const fork = forkProject(main, 'Earlier fork', 2);
    fork.thoughts.manual.text += ' A later fork edit.';
    main.thoughts.mainOnly = card('mainOnly', longText, 300, 200);
    assert.equal(fork.thoughts.mainOnly, undefined);
    const brought = bringToMain(main, fork, ['manual'], { x: 300, y: 200 }, 3, placeBroughtThought);
    assertClear(brought.project.thoughts[brought.ids[0]], Object.values(main.thoughts));
    assert.deepEqual(brought.project.thoughts.mainOnly, main.thoughts.mainOnly);
});

test('duplicate or unchanged selections never invoke the resolver or reposition existing content', () => {
    const main = createProject('dedupe', 'Public dedupe', 1);
    main.thoughts.manual = card('manual', longText, 0, 0);
    main.thoughts.shared = card('shared', 'Still shared.', 350, 0);
    const fork = forkProject(main, 'Public fork', 2);
    fork.thoughts.manual.text += ' Explicit changed wording.';
    let calls = 0;
    const first = bringToMain(main, fork, ['manual', 'manual', 'missing', 'shared'], { x: 0, y: 0 }, 3, (current, incoming) => {
        calls++;
        return placeBroughtThought(current, incoming);
    });
    assert.equal(first.count, 1);
    assert.equal(calls, 1);
    const before = structuredClone(first.project);
    const again = bringToMain(first.project, fork, ['manual', 'shared'], { x: 50000, y: 50000 }, 4, () => {
        assert.fail('duplicate/unchanged Bring must not request a new position');
    });
    assert.equal(again.count, 0);
    assert.deepEqual(again.project, before);
});

test('dense local occupancy falls back to a finite clear slot beyond existing content', () => {
    const main = createProject('dense', 'Public dense fallback', 1);
    for (let x = -6000; x <= 6000; x += 300) {
        for (let y = -6000; y <= 6000; y += 260) {
            const id = `occupied_${x}_${y}`;
            main.thoughts[id] = card(id, longText, x, y);
        }
    }
    const incoming = card('incoming', longText, 0, 0);
    const before = JSON.stringify(main);
    const point = placeBroughtThought(main, incoming);
    assertClear({ ...incoming, ...point }, Object.values(main.thoughts));
    const rightEdge = Math.max(...Object.values(main.thoughts).map(thought => thought.x + box(thought).width));
    assert.ok(point.x >= rightEdge, 'exhausted local space uses the clear right-side fallback');
    assert.equal(JSON.stringify(main), before);
});

test('the original fifth now argument and no-resolver Bring API remain compatible', () => {
    const main = createProject('legacy-api', 'Public compatibility', 1);
    main.thoughts.manual = card('manual', longText, 0, 0);
    const fork = forkProject(main, 'Public fork', 2);
    fork.thoughts.manual.text += ' Updated.';
    const brought = bringToMain(main, fork, ['manual'], { x: 123, y: 456 }, 987654);
    const added = brought.project.thoughts[brought.ids[0]];
    assert.deepEqual({ x: added.x, y: added.y }, { x: 123, y: 456 });
    assert.equal(added.createdAt, 987654);
    assert.equal(added.updatedAt, 987654);
});

test('zoomed-out Bring clears the counter-scaled reading footprint instead of only the raw world width', () => {
    for (const [zoom, screenWidth, fontSize, padding] of [[0.08, 258, 13, 8], [0.4, 292, 14, 10]]) {
        const main = createProject(`zoom-${zoom}`, 'Public semantic zoom', 1);
        main.camera.zoom = zoom;
        main.thoughts.existing = card('existing', longText, 0, 0);
        const incoming = card('incoming', longText, 400, 0);
        // These independent dimensions come from the Atlas/neighborhood CSS reading rules.
        // A raw 328-world-unit estimate would wrongly accept x=400 at both zoom levels.
        const rendered = { width: screenWidth / zoom, height: (fontSize * 1.45 * 4 + padding) / zoom };
        assert.ok(overlapArea({ x: 0, y: 0, ...rendered }, { x: incoming.x, y: incoming.y, ...rendered }) > 0);
        const before = structuredClone(main);
        const point = placeBroughtThought(main, incoming);
        assert.notDeepEqual(point, { x: incoming.x, y: incoming.y });
        assert.equal(overlapArea({ x: 0, y: 0, ...rendered }, { ...point, ...rendered }), 0, `zoom ${zoom} must leave the rendered cards separate`);
        assert.deepEqual(main, before);
    }
});

test('24px short original text reserves every explicit line instead of a four-line or default-font estimate', () => {
    const main = createProject('large-short-reading', 'Public multiline reading', 1);
    const original = '字\n'.repeat(59) + '字';
    assert.equal(Array.from(original).length, 119, 'short-original reading rule shows all 60 lines');
    main.thoughts.multiline = card('multiline', original, 0, 0);
    const incoming = card('incoming', '新卡', 0, 2000);
    const preferred = { x: incoming.x, y: incoming.y };
    // At the ordinary 18px font this location really is below the conservative footprint.
    assert.deepEqual(placeBroughtThought(main, incoming), preferred);
    const point = placeBroughtThought(main, incoming, 24);
    assert.notDeepEqual(point, preferred, 'the actual larger font must change the placement');
    const displayedOriginal = { x: 0, y: 0, width: estimateItemSize(main.thoughts.multiline).width, height: 60 * 24 * 1.45 + 16 };
    const displayedIncoming = { ...point, width: estimateItemSize(incoming).width, height: 24 * 1.45 + 16 };
    assert.ok(overlapArea(displayedOriginal, { ...displayedIncoming, ...preferred }) > 0, 'the requested point overlaps the actual 24px text');
    assert.equal(overlapArea(displayedOriginal, displayedIncoming), 0);
});

test('the Fork surface wires the spatial resolver into its actual Bring call', () => {
    const source = readFileSync(new URL('../../src/ui/surfaces/ForkSurface.tsx', import.meta.url), 'utf8');
    assert.match(source, /import\s*\{[^}]*\bplaceBroughtThought\b[^}]*\}\s*from\s*['"][^'"]*bringPlacement\.ts['"]/, 'native UI imports the dedicated placement resolver');
    const call = source.match(/\bbringToMain\s*\([^;]+;/)?.[0];
    assert.ok(call, 'the surface retains an actual Bring call');
    assert.match(call, /\bplaceBroughtThought\b/, 'the surface must pass the resolver into Bring, not only import it');
    assert.match(call, /placeBroughtThought\s*\([^)]*,\s*thoughtSize\s*\)/, 'the resolver closure forwards the actual text size');
    const workspace = readFileSync(new URL('../../src/ui/Workspace.tsx', import.meta.url), 'utf8');
    const usage = workspace.match(/<ForkSurface\b[\s\S]*?\/>/)?.[0];
    assert.ok(usage, 'Workspace renders the Fork surface');
    assert.match(usage, /thoughtSize=\{settings\.thoughtSize\}/, 'Workspace supplies the actual text-size preference');
});
