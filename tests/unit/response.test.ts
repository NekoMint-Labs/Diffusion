import { describe, expect, it } from 'vitest';
import { ProjectController } from '../../src/core/controller.ts';
import { createProject, makeThought } from '../../src/core/model.ts';
import { validateProject } from '../../src/core/validation.ts';
import { causalEdges } from '../../src/field/phenomena/causalTrace.ts';
import { saveResponse } from '../../src/ui/workspace/response.ts';

function harness() {
    const project = createProject('response-test', 'Responses', 1);
    project.thoughts.question = { ...makeThought('Which assumption is still unclear?', { x: 0, y: 0 }, 1, 'question'), generationAction: undefined };
    project.thoughts.other = makeThought('A separate idea', { x: 300, y: 0 }, 1, 'other');
    return new ProjectController(project, async () => {});
}

describe('authored responses', () => {
    it('saves the exact authored input with durable lineage without rewriting the parent', () => {
        const controller = harness();
        const before = structuredClone(controller.getSnapshot().project.thoughts.question);
        const words = '  I need to check the feedback first.\nThen compare the errors.  ';
        const response = saveResponse(controller, words, ['question', 'question'], { x: 400, y: 120 })!;
        const project = controller.getSnapshot().project;
        expect(response.text).toBe(words.trim());
        expect(response.derivedFrom).toEqual(['question']);
        expect(project.inputs[response.origin!.inputId!].text).toBe(words);
        expect(project.thoughts.question).toEqual(before);
        expect(Object.keys(project.relations)).toHaveLength(0);
        expect(Object.keys(controller.getSnapshot().session.ghosts)).toHaveLength(0);
        const reopened = validateProject(JSON.parse(JSON.stringify(project)));
        expect(reopened.thoughts[response.id].derivedFrom).toEqual(['question']);
        expect(causalEdges(reopened).find(edge => edge.childId === response.id)?.parentId).toBe('question');
    });

    it('refuses a stale scope as a whole rather than silently responding to different content', () => {
        const controller = harness();
        const before = controller.getSnapshot().project;
        expect(saveResponse(controller, 'Keep this draft', ['question', 'deleted'], { x: 300, y: 0 })).toBeNull();
        expect(controller.getSnapshot().project).toBe(before);
        expect(saveResponse(controller, '   ', ['question'], { x: 300, y: 0 })).toBeNull();
    });

    it('does not implicitly accept an AI proposal', () => {
        const controller = harness();
        controller.addGhost({ id: 'proposal', text: 'A possible question?', x: 500, y: 0, createdAt: Date.now(), scopeIds: ['question'], proposalKind: 'question', proposalAction: 'question' });
        expect(saveResponse(controller, 'My answer', ['proposal'], { x: 600, y: 0 })).toBeNull();
        expect(controller.getSnapshot().session.ghosts.proposal).toBeDefined();
        expect(controller.getSnapshot().project.thoughts.proposal).toBeUndefined();
    });

    it('undoes and redoes the response independently of its parent', () => {
        const controller = harness();
        const response = saveResponse(controller, 'My own judgment', ['question'], { x: 400, y: 0 })!;
        controller.undo();
        expect(controller.getSnapshot().project.thoughts[response.id]).toBeUndefined();
        expect(controller.getSnapshot().project.thoughts.question.text).toBe('Which assumption is still unclear?');
        controller.redo();
        expect(controller.getSnapshot().project.thoughts[response.id].derivedFrom).toEqual(['question']);
    });
});
