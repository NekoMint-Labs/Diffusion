import { describe, expect, it } from 'vitest';
import { dayKey, trajectoryCategory, trajectorySummary } from '../../src/ui/presentation.ts';
import { setLocale } from '../../src/shared/i18n.ts';

describe('recorded decisions stay readable', () => {
    it('assigns every recorded event a readable category', () => {
        expect(trajectoryCategory('thought.create')).toBe('placement');
        expect(trajectoryCategory('thought.edit')).toBe('wording');
        expect(trajectoryCategory('crystal.form')).toBe('commitment');
        expect(trajectoryCategory('thought.release')).toBe('release');
        expect(trajectoryCategory('source.add')).toBe('reference');
        expect(trajectoryCategory('thread.message')).toBe('reasoning');
        expect(trajectoryCategory('field.rename')).toBe('field');
        // An event this build has never seen is still placed, never left blank.
        expect(trajectoryCategory('future.event')).toBe('field');
    });

    it('buckets a timeline by local day, not by raw timestamp', () => {
        const now = new Date(2026, 2, 9, 23, 30).getTime();
        expect(dayKey(now, now)).toBe('today');
        expect(dayKey(new Date(2026, 2, 9, 0, 5).getTime(), now)).toBe('today');
        expect(dayKey(new Date(2026, 2, 8, 23, 55).getTime(), now)).toBe('yesterday');
        expect(dayKey(new Date(2026, 2, 7, 12, 0).getTime(), now)).toBe('2026-03-07');
        expect(dayKey(new Date(2025, 11, 31, 12, 0).getTime(), now)).toBe('2025-12-31');
    });

    it('translates system phrasing and never the user wording', () => {
        setLocale('en');
        expect(trajectorySummary('Reframed: a decision I made')).toBe('Reframed: a decision I made');
        setLocale('zh');
        const translated = trajectorySummary('Reframed: a decision I made');
        expect(translated).not.toBe('Reframed: a decision I made');
        expect(translated).toContain('a decision I made');
        setLocale('en');
    });
});
