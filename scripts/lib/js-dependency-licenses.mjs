/**
 * JavaScript runtime dependency inventory for the desktop distribution.
 *
 * The closure comes from pnpm's own resolved production tree (`pnpm list --prod --json --depth
 * Infinity`), so versions and installed locations follow pnpm-lock.yaml rather than a hand-kept list.
 * License files are read from the installed package directories, never from the lockfile text.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
    entryDirectoryName,
    evaluateDeclaredLicense,
    findLicenseFiles,
    licenseMaterialSignature,
} from './dependency-license-rules.mjs';

/**
 * Packages the distribution already handles as explicit special cases. Their retained repository
 * license files are authoritative, so no dependency copy is generated for them: the index references
 * the special-case material instead of duplicating it.
 */
const SPECIAL_CASE_PACKAGES = new Map([
    [
        '@paper-design/shaders',
        'retained above: `PAPER_SHADERS-APACHE-2.0.txt`, `PAPER_SHADERS-NOTICE.txt`',
    ],
    [
        '@paper-design/shaders-react',
        'retained above: `PAPER_SHADERS-APACHE-2.0.txt`, `PAPER_SHADERS-NOTICE.txt`',
    ],
]);

function readProductionTree(root) {
    // A fixed argument list; on Windows the shell is only what lets Node launch pnpm's .cmd shim.
    const result = spawnSync('pnpm', ['list', '--prod', '--json', '--depth', 'Infinity'], {
        cwd: root,
        encoding: 'utf8',
        maxBuffer: 256 * 1024 * 1024,
        shell: process.platform === 'win32',
    });
    if (result.error) throw new Error(`Could not run pnpm: ${result.error.message}`);
    if (result.status !== 0) {
        throw new Error(`pnpm list --prod failed (exit ${result.status}). Install dependencies first.\n${result.stderr ?? ''}`);
    }
    const [tree] = JSON.parse(result.stdout);
    if (!tree) throw new Error('pnpm list --prod returned no project.');
    return tree;
}

function walkProductionTree(node, visit, visited) {
    for (const [name, dependency] of Object.entries(node.dependencies ?? {})) {
        const identity = `${name}@${dependency.version}`;
        visit(name, dependency);
        if (visited.has(identity)) continue;
        visited.add(identity);
        walkProductionTree(dependency, visit, visited);
    }
}

export function collectJsRuntimeDependencies(root) {
    const problems = [];
    const tree = readProductionTree(root);

    // pnpm gives the same name@version one directory per peer-resolution layout; identities are
    // deduplicated, but disagreeing copies are reported rather than quietly collapsed.
    const groups = new Map();
    walkProductionTree(
        tree,
        (name, dependency) => {
            const identity = `${name}@${dependency.version}`;
            if (typeof dependency.path !== 'string' || dependency.path.length === 0) {
                problems.push(`javascript ${identity}: pnpm reported no installed directory.`);
                return;
            }
            if (!groups.has(identity)) groups.set(identity, { name, version: dependency.version, directories: new Set() });
            groups.get(identity).directories.add(dependency.path);
        },
        new Set(),
    );

    const entries = [];
    let typeOnlyExcluded = 0;

    for (const { name, version, directories } of groups.values()) {
        const identity = `${name}@${version}`;
        if (name.startsWith('@types/')) {
            // Type declarations are never part of a runtime artifact.
            typeOnlyExcluded++;
            continue;
        }

        const installed = [...directories].sort();
        const missing = installed.filter((directory) => !fs.existsSync(path.join(directory, 'package.json')));
        if (missing.length > 0) {
            problems.push(`javascript ${identity}: installed directory not readable (${missing.join(', ')}).`);
            continue;
        }

        const materials = new Set(
            installed.map((directory) => {
                const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8'));
                return `${manifest.license ?? ''}\n${licenseMaterialSignature(directory)}`;
            }),
        );
        if (materials.size > 1) {
            problems.push(
                `javascript ${identity}: ${installed.length} installed copies disagree about license material.\n  ${installed.join('\n  ')}`,
            );
        }

        const sourceDir = installed[0];
        const manifest = JSON.parse(fs.readFileSync(path.join(sourceDir, 'package.json'), 'utf8'));
        const evaluation = evaluateDeclaredLicense({
            ecosystem: 'javascript',
            name,
            version,
            declared: manifest.license,
        });
        problems.push(...evaluation.problems);

        const files = findLicenseFiles(sourceDir);
        if (evaluation.status === 'license-file') {
            const referenced = path.join(sourceDir, evaluation.reference);
            if (fs.existsSync(referenced) && fs.statSync(referenced).isFile()) {
                if (!files.includes(evaluation.reference)) files.push(evaluation.reference);
            } else {
                problems.push(`javascript ${identity}: declares "SEE LICENSE IN ${evaluation.reference}" but that file is not installed.`);
            }
        }
        files.sort();

        entries.push({
            ecosystem: 'javascript',
            name,
            version,
            directory: entryDirectoryName(name, version),
            sourceDir,
            declared: evaluation.declared,
            status: evaluation.status,
            normalized: evaluation.normalized,
            legacy: evaluation.legacy === true,
            note: evaluation.note,
            reference: SPECIAL_CASE_PACKAGES.get(name),
            files: SPECIAL_CASE_PACKAGES.has(name) ? [] : files,
        });
    }

    return { entries, typeOnlyExcluded, problems };
}
