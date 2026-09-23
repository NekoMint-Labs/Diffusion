import type { AttentionPressure } from './attention.ts';
import type { Camera, Point, SourceRecord, Thought, Relation, Thread, ThreadMessage, Capsule, Region, Provenance, InputRecord } from './model.ts';
type Payload = {
    type: 'input.record';
    input: InputRecord;
} | {
    type: 'thought.create';
    thought: Thought;
} | {
    type: 'thought.edit';
    id: string;
    text: string;
} | {
    type: 'thought.move';
    positions: Record<string, Point>;
} | {
    type: 'thought.delete';
    ids: string[];
} | {
    type: 'thought.keep';
    ids: string[];
} | {
    type: 'thought.release';
    ids: string[];
} | {
    type: 'thought.touch';
    ids: string[];
} | {
    type: 'thought.wake';
    ids: string[];
} | {
    type: 'ghost.claim';
    thought: Thought;
} | {
    type: 'crystal.create';
    thought: Thought;
    basedOn: string[];
} | {
    type: 'crystal.form';
    id: string;
    text: string;
} | {
    type: 'crystal.continue';
    from: string;
    thought: Thought;
} | {
    type: 'relation.confirm';
    relation: Relation;
} | {
    type: 'relation.remove';
    id: string;
} | {
    type: 'source.add';
    source: SourceRecord;
    thought: Thought;
} | {
    type: 'source.update';
    source: SourceRecord;
} | {
    type: 'thread.create';
    thread: Thread;
} | {
    type: 'thread.message';
    id: string;
    message: ThreadMessage;
} | {
    type: 'thread.scope';
    id: string;
    ids: string[];
} | {
    type: 'thread.capsule';
    id: string;
    capsule: Capsule;
} | {
    type: 'field.rename';
    title: string;
} | {
    type: 'region.rename';
    id: string;
    name: string;
} | {
    type: 'region.observe';
    regions: Region[];
} | {
    type: 'camera.commit';
    camera: Camera;
} | {
    type: 'lifecycle.tick';
    pressure?: AttentionPressure;
} | {
    type: 'fork.bring';
    thought: Thought;
    origin: Provenance;
    sources?: SourceRecord[];
};
export type DomainEvent = Payload & {
    actor: 'user' | 'system' | 'ai';
    at: number;
};
export type Command = Payload;
export function userEvent(command: Command, at = Date.now()): DomainEvent { return { ...command, actor: 'user', at }; }
