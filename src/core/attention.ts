import type { Thought } from './model.ts';
export interface AttentionPressure {
    activeSession: boolean;
    interactions: number;
    participants: string[];
    eligibleIds: string[];
}
/** Session-only activity. Closed time is deliberately not represented. */
export class AttentionTracker {
    private actions = 0;
    private participants = new Set<string>();
    note(ids: readonly string[]) {
        if (!ids.length) return;
        this.actions = Math.min(12, this.actions + 1);
        for (const key of ids) this.participants.add(key);
    }
    clear() { this.actions = 0; this.participants.clear(); }
    take(activeSession: boolean, eligibleIds: string[], protectedIds: string[]): AttentionPressure {
        const pressure = { activeSession, interactions: activeSession ? this.actions : 0, participants: [...new Set([...this.participants, ...protectedIds])], eligibleIds: [...new Set(eligibleIds)] };
        this.clear(); return pressure;
    }
}
export function attentionDebt(thought: Thought): number { return thought.attentionDebt ?? ({ active: 0, cooling: 4, peripheral: 12, memory: 32 }[thought.life]); }
export function attentionLife(thought: Thought, debt = attentionDebt(thought)): Thought['life'] {
    if (thought.kind !== 'thought') return 'active';
    const bounded = thought.kept ? Math.min(debt, 24) : debt;
    return bounded >= 32 ? 'memory' : bounded >= 12 ? 'peripheral' : bounded >= 4 ? 'cooling' : 'active';
}
