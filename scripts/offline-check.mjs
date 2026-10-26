import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

// Local evidence and generated resources are not source inputs. Keep this usable in a source
// archive without .git, and include newly authored source files before they have been staged.
const generatedDirectories = new Set([
    'node_modules', '.git', 'dist', 'target', '.discovery-build', '__pycache__',
    'verification', 'playwright-report', 'test-results', 'coverage', '.tmp', '.vite',
    '.npm', '.pnpm-store', '.yarn',
]);
const generatedPaths = new Set([
    'src-tauri/gen', 'src-tauri/resources/discovery', 'src-tauri/resources/licenses',
]);

export function sourceFiles(root, directory = root) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const file = path.join(directory, entry.name);
        const relative = path.relative(root, file).split(path.sep).join('/');
        if (generatedDirectories.has(entry.name) || generatedPaths.has(relative)) return [];
        if (entry.isDirectory()) return sourceFiles(root, file);
        return entry.isFile() ? [file] : [];
    });
}

export function coreDependsOnRenderer(relativeFile, text) {
    return relativeFile.replaceAll('\\', '/').startsWith('src/core/')
        && /from\s*['"](?:react(?:-dom)?|zustand|dexie|motion)(?:\/|['"])/.test(text);
}

function main() {
    const require = createRequire(import.meta.url);
    let ts;
    try { ts = require('typescript'); }
    catch {
        const globalRoot = execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm',
            ['root', '-g'], { encoding: 'utf8', shell: process.platform === 'win32' }).trim();
        ts = require(path.join(globalRoot, 'typescript'));
    }
    const root = fileURLToPath(new URL('..', import.meta.url));
    const errors = [];
    let count = 0;
    for (const file of sourceFiles(root)) {
        if (file.endsWith('.json')) {
            try { JSON.parse(fs.readFileSync(file, 'utf8')); }
            catch (error) { errors.push(file + ': ' + error.message); }
        }
        if (!/\.tsx?$/.test(file) || file.endsWith('.d.ts')) continue;
        const text = fs.readFileSync(file, 'utf8');
        count++;
        const result = ts.transpileModule(text, {
            fileName: file, reportDiagnostics: true,
            compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
                jsx: ts.JsxEmit.ReactJSX, isolatedModules: true },
        });
        for (const diagnostic of result.diagnostics ?? []) {
            if (diagnostic.category === ts.DiagnosticCategory.Error)
                errors.push(file + ': ' + ts.flattenDiagnosticMessageText(diagnostic.messageText, ' '));
        }
        for (const match of text.matchAll(/(?:from\s*|import\s*\()(['"])(\.[^'"]+)\1/g)) {
            const base = path.resolve(path.dirname(file), match[2]);
            if (!['', '.ts', '.tsx', '.css', '/index.ts', '/index.tsx'].some(ext => fs.existsSync(base + ext)))
                errors.push('Unresolved local import: ' + file + ' -> ' + match[2]);
        }
        if (coreDependsOnRenderer(path.relative(root, file), text))
            errors.push('Core depends on renderer: ' + file);
    }
    if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
    else console.log('PASS: ' + count + ' TS/TSX files syntax-transpiled, JSON valid, local imports resolve. This is NOT dependency-backed application typechecking.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
