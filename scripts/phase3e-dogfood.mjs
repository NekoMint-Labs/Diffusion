import fs from 'node:fs';
import { createProject, makeThought } from '../src/core/model.ts';
import { ProjectController } from '../src/core/controller.ts';
import { MockAIProvider } from '../src/ai/mock.ts';
import { AIRuntime } from '../src/ai/runtime.ts';

const corpus = JSON.parse(fs.readFileSync(new URL('../docs/language/regression.zh.json', import.meta.url), 'utf8'));
const selectedCases = new Set(['grad-school-uncertain', 'grad-school-time', 'hci-employment', 'not-coding-heavy', 'project-complexity', 'explore-vs-stable']);
const reviewNotes = {
  continue: '检查是否沿原思路向前，而不是改写、总结或突然换题。',
  angle: '检查是否真的换了 framing；多个结果不能只是同义改写。',
  question: '检查问题是否贴着原话里的不确定处，而不是通用反思题。',
  relation: '检查标签是否短、具体，而且仍只是候选关系。',
  organize: '检查是否只显出已有结构；允许留下一条不分组，且 canonical state 在 Apply 前不变。',
};

function setup(texts) {
  const project = createProject('phase-3e-dogfood');
  texts.forEach((text, index) => {
    const id = `t${index + 1}`;
    project.thoughts[id] = makeThought(text, { x: 160 + (index % 3) * 360, y: 140 + Math.floor(index / 3) * 280 }, index + 1, id);
  });
  const controller = new ProjectController(project, async () => {});
  const runtime = new AIRuntime(controller, () => new MockAIProvider(), {
    pending: () => {}, notice: () => {}, route: () => {}, failure: () => {},
    anchor: () => ({ x: 640, y: 420 }), bounds: () => ({ x: -1000, y: -1000, width: 4000, height: 3000 }),
  });
  return { controller, runtime };
}
function clearGhosts(controller) { for (const ghost of Object.values(controller.getSnapshot().session.ghosts)) controller.dismissGhost(ghost.id); }
function ghostTexts(controller, action) { return Object.values(controller.getSnapshot().session.ghosts).filter(g => g.proposalAction === action).sort((a,b) => a.createdAt-b.createdAt).map(g => g.text); }

const oneThought = [];
for (const item of corpus.cases.filter(item => selectedCases.has(item.id))) {
  const { controller, runtime } = setup([item.input]);
  const canonical = JSON.stringify(controller.getSnapshot().project);
  await runtime.run('continue', 'Continue this exact line of thought by one meaningful step.', ['t1'], { maxCandidates: 3 });
  const continued = ghostTexts(controller, 'continue');
  clearGhosts(controller);
  for (let step = 1; step <= 3; step++) await runtime.run('angle', `Another angle.\n\nStep ${step}: use a genuinely different framing.`, ['t1'], { maxCandidates: 1 });
  const angles = ghostTexts(controller, 'angle');
  clearGhosts(controller);
  await runtime.run('question', 'Ask questions that could genuinely move this thought.', ['t1'], { maxCandidates: 3 });
  const questions = ghostTexts(controller, 'question');
  oneThought.push({ id: item.id, input: item.input, watch: item.watch, continue: continued, angle: angles, question: questions, canonicalUnchanged: JSON.stringify(controller.getSnapshot().project) === canonical });
}

const relationInput = ['HCI 我挺喜欢。', '我又担心以后不好找工作。'];
const relationEnv = setup(relationInput);
const relationBefore = JSON.stringify(relationEnv.controller.getSnapshot().project.relations);
await relationEnv.runtime.run('probe', 'Find one concise meaningful relation.', ['t1','t2'], { maxCandidates: 1, activity: 'bridge' });
const relation = Object.values(relationEnv.controller.getSnapshot().session.phenomena).map(p => ({ label: p.label, a: relationEnv.controller.getSnapshot().project.thoughts[p.a]?.text, b: relationEnv.controller.getSnapshot().project.thoughts[p.b]?.text }));
const relationCanonicalUnchanged = JSON.stringify(relationEnv.controller.getSnapshot().project.relations) === relationBefore;

const structureInput = ['HCI 我挺喜欢。', '我不太喜欢一直写代码。', '我担心 HCI 以后不好就业。', '读研可能让我多一点时间探索。', '三年时间又挺长的。'];
const structureEnv = setup(structureInput);
const structureBefore = JSON.stringify(structureEnv.controller.getSnapshot().project);
await structureEnv.runtime.run('organize', 'Reveal only structure already present.', ['t1','t2','t3','t4','t5'], { maxCandidates: 1, activity: 'bridge' });
const structure = Object.values(structureEnv.controller.getSnapshot().session.structures)[0];
const structureResult = structure ? {
  groups: structure.groups.map(group => ({ label: group.label, thoughts: group.thoughtIds.map(id => structureEnv.controller.getSnapshot().project.thoughts[id]?.text) })),
  note: structure.note ?? '',
  relations: structure.relationIds.map(id => structureEnv.controller.getSnapshot().session.phenomena[id]).filter(Boolean).map(p => p.label),
  ungrouped: structure.scopeIds.filter(id => !structure.groups.some(group => group.thoughtIds.includes(id))).map(id => structureEnv.controller.getSnapshot().project.thoughts[id]?.text),
} : null;
const structureCanonicalUnchanged = JSON.stringify(structureEnv.controller.getSnapshot().project) === structureBefore;

const lines = [];
lines.push('# Phase 3E — Language / Behavior Dogfood Run', '');
lines.push('> Runtime: real `AIRuntime` + deterministic `MockAIProvider` through the same semantic permission, emission, proposal metadata, placement, and transient-session path used by the product. This is **not** a live-model quality benchmark; live provider verification is a separate gate.', '');
lines.push('## One Thought — Continue / Another Angle / Ask', '');
for (const row of oneThought) {
  lines.push(`### ${row.id}`, '', `**Input**`, '', `> ${row.input}`, '', `**Continue — actual output**`);
  row.continue.forEach(x => lines.push(`- ${x}`));
  lines.push('', `Review: ${reviewNotes.continue}`, '', `**Another Angle — actual output**`);
  row.angle.forEach(x => lines.push(`- ${x}`));
  lines.push('', `Review: ${reviewNotes.angle}`, '', `**Ask — actual output**`);
  row.question.forEach(x => lines.push(`- ${x}`));
  lines.push('', `Review: ${reviewNotes.question}`, '', `Canonical Field unchanged while proposals are transient: **${row.canonicalUnchanged ? 'YES' : 'NO'}**`, '', `Corpus watch: ${row.watch.join('；')}`, '');
}
lines.push('## Two Thoughts — Relation', '', ...relationInput.map(x => `- ${x}`), '');
for (const item of relation) lines.push(`**Actual relation:** ${item.label}`, '', `Between: ${item.a} ↔ ${item.b}`, '');
lines.push(`Review: ${reviewNotes.relation}`, '', `Canonical relation state unchanged before confirmation: **${relationCanonicalUnchanged ? 'YES' : 'NO'}**`, '');
lines.push('## Five Thoughts — 理一理', '', ...structureInput.map(x => `- ${x}`), '');
if (structureResult) {
  for (const group of structureResult.groups) {
    lines.push(`**${group.label}**`);
    group.thoughts.forEach(x => lines.push(`- ${x}`));
    lines.push('');
  }
  if (structureResult.ungrouped.length) { lines.push('**Intentionally left ungrouped**'); structureResult.ungrouped.forEach(x => lines.push(`- ${x}`)); lines.push(''); }
  if (structureResult.relations.length) lines.push(`Relation overlay: ${structureResult.relations.join('；')}`, '');
  if (structureResult.note) lines.push(`Note: ${structureResult.note}`, '');
}
lines.push(`Review: ${reviewNotes.organize}`, '', `Canonical Field unchanged before Apply: **${structureCanonicalUnchanged ? 'YES' : 'NO'}**`, '');
const hci = oneThought.find(row => row.id === 'hci-employment');
lines.push('## Before / After representative comparison', '', '**Before — reproduced from the untouched uploaded source with its deterministic Demo provider**', '', '> Input: HCI 我挺喜欢的，就是不知道以后工作怎么样', '', '- Continue → `Which part of "HCI 我挺喜欢的，就是不知道以后工作怎么样" is still an open question?`', '- Generated Ask → `Which part of "HCI 我挺喜欢的，就是不知道以后工作怎么样" is still an open question?`', '', 'Both UI actions entered the same generic `diffuse` runtime mode, so the actual output could be identical.', '', '**After — current runtime, same input**', '', `- Continue → ${hci?.continue[0] ?? ''}`, `- Another Angle → ${hci?.angle[0] ?? ''}`, `- Ask → ${hci?.question[0] ?? ''}`, '', '**Architecture behind the difference**', '', '- Continue emits `thought / continue` proposals and uses continuation placement.', '- Another Angle emits `thought / angle` proposals and uses branch placement with distinct reframing axes.', '- Ask emits `question / question` proposals, with question-specific rendering and next actions.', '- Relation remains a transient relation candidate.', '- 理一理 emits a transient `StructureProposal` with optional groups, relation overlays, note, and explicit Apply / Try another / Cancel lifecycle.', '');

const out = new URL('../docs/language/runs/phase-3e.md', import.meta.url);
fs.mkdirSync(new URL('../docs/language/runs/', import.meta.url), { recursive: true });
fs.writeFileSync(out, lines.join('\n') + '\n');
console.log(JSON.stringify({ oneThoughtCases: oneThought.length, relationCount: relation.length, structureGroups: structureResult?.groups.length ?? 0, structureUngrouped: structureResult?.ungrouped.length ?? 0, canonicalChecks: [...oneThought.map(x => x.canonicalUnchanged), relationCanonicalUnchanged, structureCanonicalUnchanged].every(Boolean), output: out.pathname }, null, 2));
