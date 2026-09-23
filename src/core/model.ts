export type Point = {
    x: number;
    y: number;
};
export type Camera = Point & {
    zoom: number;
};
export type Life = 'active' | 'cooling' | 'peripheral' | 'memory';
export type ThoughtKind = 'thought' | 'crystal' | 'source';
export type RelationKind = 'resonance' | 'tension' | 'gap' | 'support' | 'bridge';
export interface InputRange {
    inputId: string;
    start: number;
    end: number;
}
export interface InputRecord {
    id: string;
    text: string;
    createdAt: number;
}
export type Provenance = {
    projectId?: string;
    thoughtId?: string;
    sourceId?: string;
    inputId?: string;
    ranges?: InputRange[];
    url?: string;
    locator?: string;
    note?: string;
};
export interface Thought extends Point {
    id: string;
    text: string;
    kind: ThoughtKind;
    life: Life;
    kept: boolean;
    createdAt: number;
    updatedAt: number;
    touchedAt: number;
    attentionDebt?: number;
    sourceId?: string;
    origin?: Provenance;
    /** Durable causal lineage. Semantic ancestry only; never stores connector geometry. */
    derivedFrom?: string[];
    /** The thinking action that produced this Thought from its causal parent scope. */
    generationAction?: AIProposalAction;
}
export interface Relation {
    id: string;
    a: string;
    b: string;
    kind: RelationKind;
    /** Short Field-facing wording. Keep this compact enough to sit on the relation itself. */
    label: string;
    /** Optional plain-language reason shown only when the relation is opened. */
    explanation?: string;
    status: 'confirmed';
    createdAt: number;
    provenance?: Provenance;
}
export interface Region extends Point {
    id: string;
    name: string;
    members: string[];
    activity: number;
}
export type SourceStatus = 'processing' | 'ready' | 'limited' | 'unavailable';
export interface SourceRecord {
    id: string;
    title: string;
    status: SourceStatus;
    mime: string;
    size?: number;
    excerpt: string;
    inspected: string;
    provenance: Provenance;
    error?: string;
    originalKey?: string;
    originalPath?: string;
    url?: string;
    discoverySnippet?: string;
    evidence?: { stage: 'read' | 'judged'; passages: EvidencePassage[]; judgment?: EvidenceJudgment };
    lastSubmitted?: {
        at: number;
        provider: string;
        characters: number;
        requestId: string;
    };
}
export interface ThreadMessage {
    id: string;
    role: 'user' | 'assistant';
    text: string;
    at: number;
    provider?: string;
}
export interface Capsule {
    goal: string;
    confirmed: string[];
    tentative: string[];
    openQuestions: string[];
    sources: string[];
    rebuiltAt: number;
}
export type ThreadScopeEntry = Pick<Thought, 'id' | 'text' | 'kind' | 'sourceId'>;
export interface Thread {
    id: string;
    title: string;
    scopeIds: string[];
    scopeSnapshot?: Record<string, ThreadScopeEntry>;
    messages: ThreadMessage[];
    createdAt: number;
    capsule?: Capsule;
}
export interface TrajectoryEntry {
    id: string;
    kind: string;
    summary: string;
    thoughtIds: string[];
    at: number;
}
export interface ForkOrigin {
    parentId: string;
    baseTexts: Record<string, string>;
    baseKinds?: Record<string, ThoughtKind>;
    createdAt: number;
}
export interface ProjectState {
    schemaVersion: 1;
    id: string;
    title: string;
    thoughts: Record<string, Thought>;
    relations: Record<string, Relation>;
    regions: Record<string, Region>;
    sources: Record<string, SourceRecord>;
    /** Exact user-authored submissions. Derived thoughts point back here through provenance. */
    inputs: Record<string, InputRecord>;
    threads: Record<string, Thread>;
    history: TrajectoryEntry[];
    camera: Camera;
    createdAt: number;
    updatedAt: number;
    fork?: ForkOrigin;
}
export type AIProposalKind = 'thought' | 'question';
export type AIProposalAction = 'continue' | 'angle' | 'question';
export interface Ghost extends Point {
    id: string;
    text: string;
    createdAt: number;
    scopeIds: string[];
    origin?: Provenance;
    /** Marks a transient proposal produced from authored input. */
    proposal?: true;
    /** Semantic identity for action results. Absent for legacy/general possibilities. */
    proposalKind?: AIProposalKind;
    /** The explicit action that produced this transient proposal. */
    proposalAction?: AIProposalAction;
    /** Presentation-only: once a person manually repositions a Ghost it stops following its generating scope. */
    spatialDetached?: true;
    runId?: string;
}
export interface StructureGroup { label: string; thoughtIds: string[]; }
export interface StructureProposal {
    id: string;
    scopeIds: string[];
    groups: StructureGroup[];
    note?: string;
    relationIds: string[];
    createdAt: number;
    runId?: string;
}
export interface Phenomenon {
    id: string;
    a: string;
    b: string;
    kind: RelationKind;
    /** Short Field-facing wording. Tentative phenomena must be understandable without hover. */
    label: string;
    /** Optional plain-language reason kept separate from the short spatial label. */
    explanation?: string;
    provenance?: Provenance;
    runId?: string;
    structureId?: string;
}
export type ThinkingOperationKind = 'ingest' | 'probe' | 'ask' | 'bring' | 'verify' | 'diffuse' | 'continue' | 'angle' | 'question' | 'organize';
export type ThinkingActivityKind = 'unfold' | 'radiate' | 'bridge' | 'anchor' | 'arrive';
export type ThinkingOperationPhase = 'pending' | 'completed' | 'failed' | 'cancelled';
export interface ThinkingOperation {
    id: string;
    kind: ThinkingOperationKind;
    phase: ThinkingOperationPhase;
    scopeIds: string[];
    /** Presentation meaning only. It never grants semantic authority to the operation. */
    activity?: ThinkingActivityKind;
    /** Short-lived completion receipt metadata. Never persisted as project semantics. */
    resultCount?: number;
}
export interface SessionState {
    ghosts: Record<string, Ghost>;
    phenomena: Record<string, Phenomenon>;
    structures: Record<string, StructureProposal>;
    recalls: string[];
}
export type EvidenceOutcome = 'support' | 'challenge' | 'partial' | 'prior-art' | 'inconclusive' | 'conflicting';
export interface EvidencePassage {
    id: string; text: string; url: string; locator: string; inspected: string; retrievedAt: number; provider: string;
}
export interface EvidenceReasoning { outcome: EvidenceOutcome; rationale: string; passageIds: string[]; }
export interface EvidenceJudgment extends EvidenceReasoning { claim: string; provider: string; at: number; }
export interface EvidenceCandidate {
    id: string;
    title: string;
    url: string;
    excerpt: string;
    /** Legacy provider field; discoveryCandidate always strips it. Never a judgment. */
    outcome?: EvidenceOutcome;
    stage?: 'candidate' | 'read' | 'judged';
    passages?: EvidencePassage[];
    judgment?: EvidenceJudgment;
    inspected: string;
    locator?: string;
}
export const emptySession = (): SessionState => ({ ghosts: {}, phenomena: {}, structures: {}, recalls: [] });
export const id = (prefix = 't'): string => `${prefix}_${globalThis.crypto.randomUUID()}`;
export const createProject = (projectId = id('project'), title = 'Untitled', now = Date.now()): ProjectState => ({
    schemaVersion: 1, id: projectId, title, thoughts: {}, relations: {}, regions: {}, sources: {}, inputs: {}, threads: {}, history: [],
    camera: { x: 0, y: 0, zoom: 1 }, createdAt: now, updatedAt: now,
});
export function makeThought(text: string, point: Point, now = Date.now(), thoughtId = id()): Thought {
    return { id: thoughtId, text, ...point, kind: 'thought', life: 'active', kept: false, createdAt: now, updatedAt: now, touchedAt: now };
}
