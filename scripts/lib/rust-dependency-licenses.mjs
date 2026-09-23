/**
 * Rust runtime dependency inventory for the desktop distribution.
 *
 * The closure comes from Cargo's own resolved graph (`cargo metadata`), not from a hand-kept list:
 * the inventory follows normal dependency edges from the Tauri package and skips dev-dependencies
 * (never linked into the shipped binary) and build-dependencies (only run while compiling).
 *
 * No platform filter is applied, so the inventory is the union across the targets Diffusion supports
 * and does not change with the machine that generated it.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { entryDirectoryName, evaluateDeclaredLicense, findLicenseFiles } from './dependency-license-rules.mjs';

function readCargoMetadata(root) {
    const manifest = path.join(root, 'src-tauri', 'Cargo.toml');
    const result = spawnSync(
        'cargo',
        ['metadata', '--format-version', '1', '--locked', '--offline', '--manifest-path', manifest],
        { cwd: root, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 },
    );
    if (result.error) throw new Error(`Could not run cargo: ${result.error.message}`);
    if (result.status !== 0) {
        throw new Error(
            'cargo metadata failed. It runs offline against the locked dependency graph; if the local ' +
                `registry cache is empty, fetch it first with:\n  cargo fetch --manifest-path ${manifest}\n` +
                `${result.stderr ?? ''}`,
        );
    }
    return JSON.parse(result.stdout);
}

export function collectRustRuntimeDependencies(root) {
    const metadata = readCargoMetadata(root);
    const packages = new Map(metadata.packages.map((pkg) => [pkg.id, pkg]));
    const nodes = new Map(metadata.resolve.nodes.map((node) => [node.id, node]));
    const workspace = new Set(metadata.workspace_members);

    const reached = new Set();
    const queue = [...metadata.workspace_members];
    while (queue.length > 0) {
        const id = queue.pop();
        if (reached.has(id)) continue;
        reached.add(id);
        for (const dependency of nodes.get(id)?.deps ?? []) {
            const kinds = (dependency.dep_kinds ?? []).map((kind) => kind.kind ?? 'normal');
            if (!kinds.includes('normal')) continue;
            if (!reached.has(dependency.pkg)) queue.push(dependency.pkg);
        }
    }

    const entries = [];
    const problems = [];
    const seen = new Map();

    for (const id of reached) {
        const pkg = packages.get(id);
        // Diffusion's own workspace crates are not third-party dependencies.
        if (!pkg || pkg.source === null || workspace.has(id)) continue;

        const identity = `${pkg.name}@${pkg.version}`;
        const sourceDir = path.dirname(pkg.manifest_path);

        if (seen.has(identity) && seen.get(identity) !== sourceDir) {
            problems.push(`rust ${identity}: resolved from more than one source (${seen.get(identity)}, ${sourceDir}).`);
            continue;
        }
        seen.set(identity, sourceDir);

        if (!fs.existsSync(sourceDir)) {
            problems.push(`rust ${identity}: crate source is not extracted at ${sourceDir}. Run cargo fetch.`);
            continue;
        }

        // A crate honouring `license-file` names its own text; conventional files are kept too.
        let declaredFile = null;
        if (pkg.license_file) {
            if (path.dirname(pkg.license_file) !== '.') {
                problems.push(
                    `rust ${identity}: license_file "${pkg.license_file}" is not in the crate root. ` +
                        'Extend the generator to copy nested license files before shipping this version.',
                );
                continue;
            }
            declaredFile = path.join(sourceDir, path.basename(pkg.license_file));
            if (!fs.existsSync(declaredFile)) {
                problems.push(`rust ${identity}: declares license_file "${pkg.license_file}" but the crate does not contain it.`);
            }
        }

        const evaluation = evaluateDeclaredLicense({
            ecosystem: 'rust',
            name: pkg.name,
            version: pkg.version,
            declared: pkg.license ?? (declaredFile ? `SEE LICENSE IN ${path.basename(declaredFile)}` : ''),
        });
        problems.push(...evaluation.problems);

        const files = findLicenseFiles(sourceDir);
        if (declaredFile) {
            const name = path.basename(declaredFile);
            if (!files.includes(name)) files.push(name);
        }
        files.sort();

        entries.push({
            ecosystem: 'rust',
            name: pkg.name,
            version: pkg.version,
            directory: entryDirectoryName(pkg.name, pkg.version),
            sourceDir,
            declared: evaluation.declared,
            status: evaluation.status,
            normalized: evaluation.normalized,
            legacy: evaluation.legacy === true,
            note: evaluation.note,
            reference: undefined,
            files,
        });
    }

    return { entries, problems };
}
