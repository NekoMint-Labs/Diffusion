import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCaptureOptions, capturePlan, captureUsage, createRunDirectory, verifyCheckoutSource } from './capture-options.mjs';

const options = parseCaptureOptions(process.argv.slice(2), 'ssr');
if (options.help) { console.log(captureUsage); process.exit(0); }
const plan = capturePlan(options);
console.log(JSON.stringify(plan, null, 2));
if (!options.execute) process.exit(0);
const source = verifyCheckoutSource(options.declaredSource, fileURLToPath(new URL('../..', import.meta.url)));
createRunDirectory(options.output, { ...plan, verifiedCheckoutSource: source });
Object.defineProperty(globalThis, 'location', { value: { search: options.flags ? `?${options.flags}` : '' }, configurable: true });
const { default: React } = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');
const { ThoughtView } = await import('../../src/ui/thought/ThoughtView.tsx');
const { ProjectController } = await import('../../src/core/controller.ts');
const { createProject, makeThought } = await import('../../src/core/model.ts');
const { bindProposition } = await import('../../src/core/proposition.ts');
const { GeometryCache } = await import('../../src/field/spatial/index.ts');
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
    return renderToStaticMarkup(React.createElement(ThoughtView, { item, ghost, recalled: false, selected: false,
        emphasis: 'normal', settling: false, editing: false, level: 'local', geometry: new GeometryCache(),
        onEdit: () => {}, onCancel: () => {}, onRead: () => {}, onRespond: () => {} }));
}
const before = render(controller.getSnapshot().session.ghosts['diffuse-result'], true);
const kept = controller.claim('diffuse-result')!;
const after = render(kept, false);
const result = { source, role: options.role, flags: options.flags || 'none',
    evidence: 'Controller Keep plus actual ThoughtView server rendering; not mounted browser or real model evidence',
    beforeKeepShowsPoint: before.includes('data-reading-focus="true"'),
    afterKeepShowsPoint: after.includes('data-reading-focus="true"'),
    originalPreserved: kept.text === original, propositionPreserved: kept.proposition?.text === point,
    keptGenerationAction: kept.generationAction ?? null };
fs.writeFileSync(path.join(options.output, 'diffuse-keep-repro.json'), `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify(result, null, 2));
