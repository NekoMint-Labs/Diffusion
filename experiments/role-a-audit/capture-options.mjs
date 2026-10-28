import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';

const scenarios = ['ask', 'continue', 'angle', 'diffuse', 'correction', 'uncertainty'];
const allowedFlags = ['readingTrial=1', 'propositionTrial=1'];

export const captureUsage = `Required: --source <full Git SHA> --role baseline|candidate
  --flags none|readingTrial=1|readingTrial=1,propositionTrial=1 --out <new directory>
Optional: --execute (default is dry-run), --help
Native only: --port <CDP port> (default 9224), --scenarios ask,continue,correction,uncertainty
Angle/Diffuse execution is blocked until their single-step capture paths are adapted.
The output parent must exist; an existing run directory is never reused.`;

export function parseCaptureOptions(args, mode) {
    if (!['native', 'ssr'].includes(mode)) throw new Error('Unknown capture mode');
    const { values } = parseArgs({ args, strict: true, allowPositionals: false, options: {
        source: { type: 'string' }, role: { type: 'string' }, flags: { type: 'string' },
        out: { type: 'string' }, execute: { type: 'boolean', default: false },
        help: { type: 'boolean', default: false },
        ...(mode === 'native' ? { port: { type: 'string' }, scenarios: { type: 'string' } } : {}),
    } });
    if (values.help) return { help: true };
    for (const key of ['source', 'role', 'flags', 'out']) {
        if (!values[key]?.trim()) throw new Error(`--${key} is required`);
    }
    if (!/^[a-f0-9]{40}$/i.test(values.source)) throw new Error('--source must be a full 40-character Git SHA');
    if (!['baseline', 'candidate'].includes(values.role)) throw new Error('--role must be baseline or candidate');
    const flags = values.flags === 'none' ? [] : values.flags.split(/[,&]/);
    if (flags.some(flag => !allowedFlags.includes(flag)) || new Set(flags).size !== flags.length) {
        throw new Error('--flags contains an unsupported or repeated flag');
    }
    if (flags.includes('propositionTrial=1') && !flags.includes('readingTrial=1')) {
        throw new Error('propositionTrial requires readingTrial');
    }
    const selected = mode === 'native' ? (values.scenarios?.split(',') ?? scenarios) : [];
    if (selected.some(name => !scenarios.includes(name)) || new Set(selected).size !== selected.length) {
        throw new Error('--scenarios contains an unsupported or repeated scenario');
    }
    const port = mode === 'native' ? Number(values.port ?? 9224) : null;
    if (port !== null && (!/^\d+$/.test(values.port ?? '9224') || !Number.isInteger(port) || port < 1 || port > 65535)) {
        throw new Error('--port must be an integer from 1 to 65535');
    }
    return { mode, execute: values.execute, declaredSource: values.source.toLowerCase(),
        role: values.role, flags: flags.join('&'), output: path.resolve(values.out),
        scenarios: selected, port };
}

export function capturePlan(options) {
    return { ...options, sourceVerification: options.mode === 'native'
        ? 'operator-declared; running native build and isolated profile are NOT verified'
        : 'checkout HEAD and cleanliness checked before SSR execution',
        url: `http://tauri.localhost/${options.flags ? `?${options.flags}` : ''}`,
        unadaptedScenarios: options.scenarios.filter(name => ['angle', 'diffuse'].includes(name)),
        singleStepVerified: false };
}

export function assertNativeExecutionAllowed(options) {
    const blocked = capturePlan(options).unadaptedScenarios;
    if (blocked.length) throw new Error(`Execution blocked: ${blocked.join(', ')} still use legacy capture paths without verified single-step control. Select other --scenarios.`);
}

export function createRunDirectory(output, plan) {
    // No recursive/reuse mode: mkdir is the atomic guard against overwriting an earlier run.
    fs.mkdirSync(output);
    fs.writeFileSync(path.join(output, 'preflight.json'), `${JSON.stringify(plan, null, 2)}\n`, { flag: 'wx' });
}

export function verifyCheckoutSource(expected, cwd) {
    const actual = execFileSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8' }).trim();
    if (actual !== expected) throw new Error(`Declared source ${expected} does not match checkout HEAD ${actual}`);
    const dirty = execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd, encoding: 'utf8' }).trim();
    if (dirty) throw new Error('SSR execution requires a clean checkout so HEAD identifies the imported source');
    return actual;
}
