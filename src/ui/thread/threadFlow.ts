import { id, type Point, type SessionState } from '../../core/model.ts';
import type { ProjectController } from '../../core/controller.ts';
import type { AIRuntime } from '../../ai/runtime.ts';
import { placePossibility } from '../../field/spatial/placement.ts';

/** The one way a message becomes part of a Thread and reaches the model.
 *
 * A Thread is one record with two presentations: the ordinary split place runs `thread`, and the
 * focused place runs `deep`. The wording is the same either way, so the flow lives here once and
 * the surfaces only choose their presentation. Every entry point — both presentations and the
 * scoped composer — routes through this, so a Thread can never have three subtly different send
 * flows.
 */
export function sendThreadMessage({ controller, runtime, threadId, text, deep }: {
    controller: ProjectController;
    runtime: AIRuntime;
    threadId: string;
    text: string;
    deep: boolean;
}): Promise<unknown> {
    const thread = controller.getSnapshot().project.threads[threadId];
    const scopeIds = thread?.scopeIds ?? [];
    controller.dispatch({ type: 'thread.message', id: threadId, message: { id: id('message'), role: 'user', text, at: Date.now() } });
    return runtime.run(deep ? 'deep' : 'thread', text, scopeIds, { threadId });
}

/** The one way a Thread passage comes back to the Field: as a possibility the person may claim,
 * never as committed state. Both presentations bring text back through this. */
export function bringThreadTextToField({ controller, session, anchor, threadId, text }: {
    controller: ProjectController;
    session: SessionState;
    anchor: Point;
    threadId: string;
    text: string;
}): void {
    const project = controller.getSnapshot().project;
    const thread = project.threads[threadId];
    controller.addGhost({
        id: id('ghost'),
        text: text.slice(0, 20000),
        ...placePossibility(project, session, anchor, 0, [], undefined, text),
        createdAt: Date.now(),
        scopeIds: [...(thread?.scopeIds ?? [])],
        origin: { projectId: project.id, note: 'Brought back from a Thread' },
    });
}
