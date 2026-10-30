import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
export const scenarios = ['ask', 'continue', 'angle', 'diffuse', 'correction', 'uncertainty'];
export function parseOptions(args) {
    const { values } = parseArgs({ args, strict: true, allowPositionals: false, options: {
        source: { type: 'string' }, role: { type: 'string' }, flags: { type: 'string' }, url: { type: 'string' },
        out: { type: 'string' }, session: { type: 'string' }, execute: { type: 'boolean', default: false },
        port: { type: 'string', default: '9239' }, scenarios: { type: 'string', default: scenarios.join(',') },
    } });
    if (!/^[a-f0-9]{40}$/.test(values.source ?? '')) throw new Error('A full source SHA is required');
    if (!['baseline','candidate'].includes(values.role)) throw new Error('Role must be baseline or candidate');
    if (!['readingTrial=1','readingTrial=1&propositionTrial=1'].includes(values.flags)) throw new Error('Explicit comparison flags required');
    const url = new URL(values.url);
    if (url.hostname !== '127.0.0.1' || url.protocol !== 'http:' || !url.port || url.pathname !== '/' || url.username || url.password || url.search || url.hash) throw new Error('Use a dedicated http://127.0.0.1:port/ origin');
    if (!values.out?.trim()) throw new Error('A new output directory is required');
    const names = values.scenarios.split(',');
    if (!names.length || names.some(n => !scenarios.includes(n)) || new Set(names).size !== names.length) throw new Error('Invalid scenarios');
    const port = Number(values.port);
    if (!/^\d+$/.test(values.port) || port < 1 || port > 65535) throw new Error('Invalid CDP port');
    if (values.execute && !values.session) throw new Error('Execution requires a launcher session receipt');
    return { session: values.session ? path.resolve(values.session) : null, source: values.source, role: values.role, flags: values.flags, origin: url.origin, output: path.resolve(values.out), execute: values.execute, port, scenarios: names };
}
export function createRun(output, plan) {
    fs.mkdirSync(output);
    fs.writeFileSync(path.join(output,'plan.json'), JSON.stringify(plan,null,2)+'\n', { flag: 'wx' });
}
export function summarizeRequests(requests) {
    return { actualRequests: requests.length, completed: requests.filter(r=>r.done).length,
        singleRequest: requests.length === 1 && requests.every(r=>r.done),
        providerSuccess: requests.length === 1 && requests[0].status === 200 };
}
