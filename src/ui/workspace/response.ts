import { makeThought, type Point, type Thought } from '../../core/model.ts';
import type { ProjectController } from '../../core/controller.ts';

/** A person's response is authored material, saved locally before any further AI action.
 * It continues the selected thinking, using the existing durable continuation lineage. */
export function saveResponse(controller: ProjectController, words: string, scopeIds: string[], point: Point): Thought | null {
    const text = words.trim();
    const scope = [...new Set(scopeIds)];
    const project = controller.getSnapshot().project;
    if (!text || !scope.length || scope.length > 32 || text.length > 20000 || scope.some(key => !project.thoughts[key])) return null;
    const thought = makeThought(text, point);
    const input = controller.recordInput(words);
    thought.origin = { projectId: project.id, thoughtId: scope[0], inputId: input.id, ranges: [{ inputId: input.id, start: 0, end: words.length }] };
    thought.derivedFrom = scope;
    thought.generationAction = 'continue';
    controller.dispatch({ type: 'thought.create', thought });
    return thought;
}

export function isQuestion(thought: Pick<Thought, 'text' | 'generationAction'>): boolean {
    return thought.generationAction === 'question' || /[?？]\s*$/.test(thought.text);
}

export function referenceExcerpt(text: string, limit = 84): string {
    const normalized = text.trim().replace(/\s+/g, ' ');
    return normalized.length <= limit ? normalized : `${normalized.slice(0, limit)}…`;
}
