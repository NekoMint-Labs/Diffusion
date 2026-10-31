import { budgetSchedule, promptFingerprint, TOTAL_OUTPUT_CAP } from './budget-policy.mjs';

/** Resume only after a zero-request tool failure, preserving every spent call. */
export function validateBudgetResume(previous, currentPlan) {
    const { plan, summary, records } = previous;
    for (const key of ['productSource', 'flags', 'origin', 'provider', 'model', 'injected', 'maxRequests', 'aggregateOutputCap', 'automaticRetries', 'schedule']) {
        if (JSON.stringify(plan[key]) !== JSON.stringify(currentPlan[key])) throw new Error('Resume plan mismatch: ' + key);
    }
    if (summary.blocked || summary.routeFailure || summary.inheritedFrom) throw new Error('Resume requires one clean prior ledger');
    const schedule = budgetSchedule();
    const completed = [], fingerprints = {};
    let consumedCap = 0;
    if (records.length !== summary.results.length || !records.length) throw new Error('Incomplete resume ledger');
    for (let i = 0; i < records.length; i++) {
        const record = records[i], scheduled = schedule[i], row = summary.results[i];
        if (!scheduled || record.scenario !== scheduled.scenario || JSON.stringify(record.arm) !== JSON.stringify(scheduled.arm) || record.productSource !== currentPlan.productSource || record.injected !== currentPlan.injected) throw new Error('Resume record identity mismatch');
        if (row.scenario !== record.scenario || row.arm !== record.arm.id || row.status !== record.status || row.requests !== record.requests.length || row.outputs !== record.results.length) throw new Error('Resume summary mismatch');
        if (record.requests.length === 0) {
            if (i !== records.length - 1 || record.status !== 'execution-failed') throw new Error('Only the final zero-request tool failure may resume');
            continue;
        }
        if (record.requests.length !== 1 || !record.requests[0].done || !record.singleRequest || !['observed-output', 'empty-or-failed'].includes(record.status)) throw new Error('An uncertain or unfinished request cannot resume');
        const fingerprint = promptFingerprint(record.sentRequestBody);
        if (fingerprint !== record.promptFingerprint || summary.promptFingerprints[record.scenario] !== fingerprint || record.sentRequestBody.max_tokens !== record.arm.maxTokens) throw new Error('Resume prompt or budget mismatch');
        fingerprints[record.scenario] = fingerprint;
        completed.push(row);
        consumedCap += record.arm.maxTokens;
    }
    if (records.at(-1).requests.length !== 0 || summary.totalSent !== completed.length || consumedCap >= TOTAL_OUTPUT_CAP) throw new Error('Resume count mismatch or exhausted budget');
    return { completed, fingerprints, totalSent: completed.length, consumedCap, remaining: schedule.slice(completed.length) };
}
