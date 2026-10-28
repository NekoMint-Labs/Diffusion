import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ThoughtView } from '../../src/ui/thought/ThoughtView.tsx';
import { ProjectController } from '../../src/core/controller.ts';
import { createProject, makeThought } from '../../src/core/model.ts';
import { bindProposition } from '../../src/core/proposition.ts';
import { GeometryCache } from '../../src/field/spatial/index.ts';

Object.defineProperty(globalThis, 'location', { value: { search: '?readingTrial=1&propositionTrial=1' }, configurable: true });
const original = '先观察学生是否愿意再次尝试使用公开例题的考前复习。'.repeat(10) + '目前尚不能确认存在普遍需求。';
const point = '在每周两小时和不接触私人资料的条件下，先观察学生是否愿意再试用；不能据此证明普遍需求。';
const project = createProject('audit', 'Public synthetic comparison');
project.thoughts.question = makeThought('仅使用公开例题观察考前复习，每周两小时，不接触私人资料。', { x: 0, y: 0 }, 1, 'question');
const controller = new ProjectController(project, async () => {});
// Diffuse emits a generated Ghost without proposalAction; this matches runtime.emit.
controller.addGhost({ id: 'diffuse-result', text: original, x: 300, y: 0, scopeIds: ['question'], createdAt: 2,
    runId: 'diffuse-run', proposalKind: 'thought', origin: { projectId: project.id, note: 'Injected audit fixture; not a live model' },
    proposition: bindProposition(point, original) });
function render(item: Parameters<typeof ThoughtView>[0]['item'], ghost: boolean) {
    return renderToStaticMarkup(<ThoughtView item={item} ghost={ghost} recalled={false} selected={false}
        emphasis="normal" settling={false} editing={false} level="local" geometry={new GeometryCache()}
        onEdit={() => {}} onCancel={() => {}} onRead={() => {}} onRespond={() => {}} />);
}
const before = render(controller.getSnapshot().session.ghosts['diffuse-result'], true);
const kept = controller.claim('diffuse-result')!;
const after = render(kept, false);
console.log(JSON.stringify({ source: '86b072bba153526350d0c4f1d481d21ef727b65a',
    evidence: 'Controller Keep plus actual ThoughtView server rendering; not mounted browser or real model evidence',
    beforeKeepShowsPoint: before.includes('data-reading-focus="true"'),
    afterKeepShowsPoint: after.includes('data-reading-focus="true"'),
    originalPreserved: kept.text === original, propositionPreserved: kept.proposition?.text === point,
    keptGenerationAction: kept.generationAction ?? null }, null, 2));
