#!/usr/bin/env node
/**
 * Builds the license and notice material that travels with a desktop build.
 *
 * Two kinds of material land in `src-tauri/resources/licenses/`, which Tauri bundles as an
 * application resource:
 *
 * 1. Explicit special cases — the retained texts for Diffusion's own source, the discovery engine's
 *    retained upstream MIT notice, the copied React Bits renderers and Paper Shaders. These are
 *    copied byte-for-byte from their canonical repository files.
 * 2. The runtime dependency closure — every production JavaScript dependency (from pnpm's resolved
 *    production tree) and every normal Rust dependency of the Tauri package (from `cargo metadata`),
 *    with the license text each installed package or crate actually ships.
 *
 * The generated material is never committed (only the directory's .gitkeep is), so packaged
 * notices cannot drift from their sources. It is prepared before native CI tests and again by
 * `tauri build`'s beforeBuildCommand.
 * Nothing here changes installer UX: the files are passive resources, not an installer license page.
 *
 * Node standard library plus the installed pnpm and Cargo metadata. No network, deterministic output.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectJsRuntimeDependencies } from './lib/js-dependency-licenses.mjs';
import { collectRustRuntimeDependencies } from './lib/rust-dependency-licenses.mjs';
import { compareEntries } from './lib/dependency-license-rules.mjs';
import {
    loadFallbackRegistry,
    resolveLicenseMaterial,
    resolveSourceCodeForm,
} from './lib/dependency-license-fallbacks.mjs';
import { renderIndex } from './lib/distribution-notices.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'src-tauri', 'resources', 'licenses');
const indexName = 'THIRD_PARTY_NOTICES.md';

/** Canonical repository file -> name inside the distribution resource directory. */
const specialCases = [
    ['LICENSE', 'DIFFUSION-APACHE-2.0.txt'],
    ['internal/discovery-engine/LICENSE.smartsearch', 'SMARTSEARCH-MIT.txt'],
    ['docs/third_party/REACT_BITS_MATERIALS_LICENSE.md', 'REACT_BITS_MATERIALS_LICENSE.md'],
    ['docs/third_party/PAPER_SHADERS_LICENSE.txt', 'PAPER_SHADERS-APACHE-2.0.txt'],
    ['docs/third_party/PAPER_SHADERS_NOTICE.md', 'PAPER_SHADERS-NOTICE.txt'],
];

// --- special cases ---------------------------------------------------------

const missing = specialCases.map(([from]) => from).filter((from) => !fs.existsSync(path.join(root, from)));
if (missing.length > 0) {
    console.error('Cannot prepare distribution licenses. Missing canonical source file(s):');
    for (const from of missing) console.error(`  ${from}`);
    process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

for (const [from, to] of specialCases) {
    const source = path.join(root, from);
    const target = path.join(outDir, to);
    fs.copyFileSync(source, target);
    if (!fs.readFileSync(source).equals(fs.readFileSync(target))) {
        console.error(`Distribution copy does not match its source: ${from} -> ${to}`);
        process.exit(1);
    }
}

// --- runtime dependency inventory ------------------------------------------

const javascript = collectJsRuntimeDependencies(root);
const rust = collectRustRuntimeDependencies(root);
javascript.entries.sort(compareEntries);
rust.entries.sort(compareEntries);
const problems = [...javascript.problems, ...rust.problems];
const dependencies = [...javascript.entries, ...rust.entries].sort(compareEntries);

// Every dependency ends in exactly one state: text from the installed artifact, text extracted from
// an installed file, a reviewed exact-version fallback, retained special-case material, or unresolved.
const registry = loadFallbackRegistry(root);
const resolutions = new Map(dependencies.map((entry) => [entry, resolveLicenseMaterial(entry, registry)]));
for (const resolution of resolutions.values()) problems.push(...resolution.problems);

// MPL-covered dependencies shipped in executable form also need a recorded Source Code Form location.
const sourceCodeForm = new Map();
for (const entry of dependencies) {
    const record = resolveSourceCodeForm(entry, registry);
    problems.push(...record.problems);
    if (record.record) sourceCodeForm.set(entry, record.record);
}

const stateOf = (name) => dependencies.filter((entry) => resolutions.get(entry).state === name).length;
const expected = new Set(['.gitkeep', ...specialCases.map(([, to]) => to)]);
let copied = 0;

for (const entry of dependencies) {
    const { materials } = resolutions.get(entry);
    if (materials.length === 0) continue;
    const targetDir = path.join(outDir, 'dependencies', entry.ecosystem, entry.directory);
    fs.mkdirSync(targetDir, { recursive: true });
    for (const material of materials) {
        const target = path.join(targetDir, material.bundled);
        if (material.content !== undefined) {
            fs.writeFileSync(target, material.content);
        } else {
            if (!fs.existsSync(material.from)) {
                problems.push(`dependencies ${entry.ecosystem} ${entry.name}@${entry.version}: listed license file is missing (${material.bundled}).`);
                continue;
            }
            fs.copyFileSync(material.from, target);
        }
        expected.add(`dependencies/${entry.ecosystem}/${entry.directory}/${material.bundled}`);
        copied++;
    }
}

fs.writeFileSync(
    path.join(outDir, indexName),
    renderIndex({ javascript, rust, dependencies, resolutions, registry, sourceCodeForm }),
);
expected.add(indexName);

// The directory is generated, so anything else in it is stale.
const prune = (directory) => {
    for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
        const full = path.join(directory, item.name);
        if (item.isDirectory()) {
            prune(full);
            if (fs.readdirSync(full).length === 0) fs.rmdirSync(full);
            continue;
        }
        const relative = path.relative(outDir, full).split(path.sep).join('/');
        if (!expected.has(relative)) fs.rmSync(full, { force: true });
    }
};
prune(outDir);

// --- report ---------------------------------------------------------------

console.log(`Prepared distribution licenses in ${path.relative(root, outDir)}.`);
console.log('');
console.log(`Special-case entries: ${specialCases.length} (retained license files)`);
console.log(
    `JavaScript runtime dependencies: ${javascript.entries.length} ` +
        `(${stateOf('special-case')} referenced to special cases, ` +
        `${javascript.typeOnlyExcluded} type-only omitted)`,
);
console.log(`Rust runtime dependencies: ${rust.entries.length}`);
console.log('');
console.log(`Local license texts: ${stateOf('local')}`);
console.log(`Extracted local texts: ${stateOf('extracted')}`);
console.log(`Reviewed fallbacks: ${stateOf('fallback')}`);
console.log(`Special cases: ${stateOf('special-case')}`);
console.log(`Unresolved: ${problems.length}`);
console.log('');
console.log(`License files written: ${copied}`);
console.log(`MPL-2.0 Source Code Form records: ${sourceCodeForm.size}`);

// A fallback entry for a version that is no longer in the graph is not a shipping risk, but it is a
// review that should not be silently forgotten.
const installedIdentities = new Set(dependencies.map((entry) => `${entry.ecosystem}:${entry.name}@${entry.version}`));
const unusedFallbacks = registry.entries.filter((entry) => !installedIdentities.has(`${entry.ecosystem}:${entry.name}@${entry.version}`));
if (unusedFallbacks.length > 0) {
    console.warn('');
    console.warn(`Reviewed fallback entries not used by the current dependency graph (${unusedFallbacks.length}):`);
    for (const entry of unusedFallbacks) console.warn(`  ${entry.ecosystem} ${entry.name}@${entry.version}`);
    console.warn('  Review and remove them from docs/third_party/runtime-license-fallbacks/registry.json if the dependency is gone.');
}

const unusedSourceRecords = registry.sourceCodeForm.filter((record) => !installedIdentities.has(`${record.ecosystem}:${record.name}@${record.version}`));
if (unusedSourceRecords.length > 0) {
    console.warn('');
    console.warn(`MPL Source Code Form records not used by the current dependency graph (${unusedSourceRecords.length}):`);
    for (const record of unusedSourceRecords) console.warn(`  ${record.ecosystem} ${record.name}@${record.version}`);
    console.warn('  Review and remove them from docs/third_party/runtime-license-fallbacks/registry.json if the dependency is gone.');
}

if (problems.length > 0) {
    console.error('');
    console.error('Unresolved license information must be reviewed before this can ship:');
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
}
