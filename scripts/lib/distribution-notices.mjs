/**
 * Renders the distribution-facing THIRD_PARTY_NOTICES.md.
 *
 * Pure: it takes the collected inventory, the resolved license material, the reviewed fallback
 * registry and the recorded MPL Source Code Form locations, and returns the notice text. Keeping it
 * out of the CLI is what lets the offline tests assert what a recipient of the binary will read.
 */
import { FALLBACK_DIRECTORY, findFallbackEntry } from './dependency-license-fallbacks.mjs';

const registryPath = `${FALLBACK_DIRECTORY.split(/[\\/]/).join('/')}/registry.json`;

const tableCell = (value) => String(value).replace(/\|/g, '\\|');

/** Greedy word wrap, so generated prose stays readable at a fixed width and byte-stable. */
function wrap(text, width = 100) {
    const words = text.split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    for (const word of words) {
        if (line.length > 0 && line.length + word.length + 1 > width) {
            lines.push(line);
            line = '';
        }
        line = line.length > 0 ? `${line} ${word}` : word;
    }
    if (line.length > 0) lines.push(line);
    return lines.join('\n');
}

const SOURCE_LABELS = {
    local: 'installed package',
    extracted: 'extracted from an installed file',
    fallback: 'reviewed fallback',
    'special-case': 'retained above',
};

function dependencyTable(entries, firstColumn, resolutions) {
    const lines = [
        `| ${firstColumn} | Version | License (declared) | License text source | License files |`,
        '|---|---|---|---|---|',
    ];
    for (const entry of entries) {
        const resolution = resolutions.get(entry);
        const license = entry.legacy ? `${entry.declared} (Cargo legacy "/" form, read as OR)` : entry.declared;
        const files = entry.reference
            ? entry.reference
            : resolution.materials.length > 0
              ? resolution.materials
                    .map((material) => `\`dependencies/${entry.ecosystem}/${entry.directory}/${material.bundled}\``)
                    .join('<br>')
              : 'none published in the package';
        lines.push(
            `| ${tableCell(entry.name)} | ${tableCell(entry.version)} | ${tableCell(license)} | ${SOURCE_LABELS[resolution.state]} | ${tableCell(files)} |`,
        );
    }
    return lines.join('\n');
}

/** Where the bundles that carry no license text of their own got their text, one row per source. */
function fallbackProvenanceSection(dependencies, resolutions, registry) {
    const short = (revision) => revision.slice(0, 12);
    const groups = new Map();
    const extractions = [];

    for (const entry of dependencies) {
        const resolution = resolutions.get(entry);
        if (resolution.state !== 'fallback' && resolution.state !== 'extracted') continue;
        const reviewed = findFallbackEntry(registry, entry);
        const files = resolution.materials.map((material) => material.bundled).join('<br>');
        if (resolution.state === 'extracted') {
            extractions.push({ reviewed, files, entry });
            continue;
        }
        if (!groups.has(reviewed.group)) {
            const group = registry.groups[reviewed.group];
            const revisions = [
                ...new Set(Object.values(group.files).flatMap((file) => file.verifiedRevisions ?? file.revisions ?? [])),
            ]
                .map(short)
                .join(', ');
            groups.set(reviewed.group, {
                name: reviewed.group,
                files: new Set(),
                dependencies: [],
                source: group.sourceLabel ?? `${group.repository}${revisions ? ` @ ${revisions}` : ''}`,
            });
        }
        const record = groups.get(reviewed.group);
        for (const material of resolution.materials) record.files.add(material.bundled);
        record.dependencies.push(`${entry.name}@${entry.version}`);
    }

    if (groups.size === 0 && extractions.length === 0) return '';

    const rows = [
        ...[...groups.values()].map(
            (group) =>
                `| ${group.name} | ${[...group.files].join('<br>')} | ${group.dependencies.join(', ')} | ${group.source} |`,
        ),
        ...extractions.map(
            (item) =>
                `| extraction from the installed \`${item.reviewed.extract.file}\` | ${item.files} | ${item.entry.name}@${item.entry.version} | the installed package or crate itself, hash-pinned |`,
        ),
    ];

    return `## Reviewed fallbacks and extractions

${rows.length} reviewed source${rows.length === 1 ? '' : 's'} supply text for the dependencies whose own
package or crate publishes none. Each dependency is pinned by exact version and by its declared
license, and each bundled text is verified against a recorded content hash, so an upgrade or a
changed declaration fails packaging instead of silently reusing an old review. Full provenance —
source URL, fetch date, revision and content hash — is recorded in the Diffusion source repository
at \`${registryPath}\`.

| Reviewed source | Bundled text | Dependencies | Upstream |
|---|---|---|---|
${rows.join('\n')}`;
}

/**
 * Mozilla Public License dependencies are distributed here in executable form, so their recipients
 * are told where the corresponding Source Code Form can be obtained. Rows come from the recorded
 * exact-version locations; the generator refuses to run when an MPL-covered dependency has none.
 */
function sourceCodeFormSection(dependencies, sourceCodeForm) {
    const covered = dependencies.filter((entry) => sourceCodeForm.has(entry));
    if (covered.length === 0) return '';

    const rows = covered.map((entry) => {
        const record = sourceCodeForm.get(entry);
        const locations = record.locations.map((location) => `<${location}>`).join('<br>');
        return `| ${tableCell(entry.name)}@${tableCell(entry.version)} | ${tableCell(record.license)} | ${locations} |`;
    });

    return `## Source Code Form availability (${covered.length === 1 ? 'one MPL-covered dependency' : `${covered.length} MPL-covered dependencies`})

${wrap(
    `${covered.length === 1 ? 'One dependency' : `${covered.length} dependencies`} in the tables above ${covered.length === 1 ? 'is' : 'are'} covered by the Mozilla Public License 2.0 and ${covered.length === 1 ? 'is' : 'are'} distributed here in executable form. Recipients of this distribution may obtain the corresponding Source Code Form under MPL-2.0 at the locations below: the immutable published package for that exact version, and the upstream revision the published package records as its build source. MPL-2.0 covers ${covered.length === 1 ? 'that dependency' : 'those dependencies'} only; it does not apply to Diffusion's own source, which remains under the Apache License 2.0, and no other dependency listed here is affected by it.`,
)}

| Dependency | License | MPL-2.0 Source Code Form available at |
|---|---|---|
${rows.join('\n')}`;
}

export function renderIndex({ javascript, rust, dependencies, resolutions, registry, sourceCodeForm }) {
    const state = (entries, name) => entries.filter((entry) => resolutions.get(entry).state === name).length;
    const referenced = (entries) => state(entries, 'special-case');
    const fallbacks = (entries) => state(entries, 'fallback');
    const extracted = (entries) => state(entries, 'extracted');
    const reviewed = [...javascript.entries, ...rust.entries].filter((entry) => entry.status === 'non-spdx-reviewed');

    const sections = [
        `# Third-party notices

Diffusion Explorer ships this generated copy of the license and notice material that must travel with
the application. The canonical text lives in the Diffusion source repository; the special-case files
below are copied byte for byte from it, and the dependency material is copied byte for byte from the
installed packages and crates recorded under \`dependencies/\`. Do not edit this file: regenerate it
with \`pnpm run prepare:licenses\`.

## Diffusion-owned source

Apache License 2.0. See \`DIFFUSION-APACHE-2.0.txt\`.

## Discovery engine (upstream MIT license)

${wrap(
    `The bundled discovery engine is adapted from \`onedotmint/smartsearch\` v1.0.3 per \`internal/discovery-engine/PROVENANCE.md\`: MIT, Copyright (c) 2025 GuDaStudio. The retained upstream notice \`internal/discovery-engine/LICENSE.smartsearch\` is copied in full as \`SMARTSEARCH-MIT.txt\`. The upstream source is not Apache-2.0.`,
)}

## React Bits background materials

Four Field background renderers (Topography, Threads, Waves, Silk) are copied from React Bits,
Copyright (c) 2026 David Haz, and adapted. Their MIT + Commons Clause License Condition v1.0 terms
are retained in full; see \`REACT_BITS_MATERIALS_LICENSE.md\`.

## Paper Shaders

\`@paper-design/shaders-react\` and \`@paper-design/shaders\` are Apache-2.0 dependencies,
Copyright 2026 Paper, used through their published package API with no source copied. See
\`PAPER_SHADERS-APACHE-2.0.txt\` and \`PAPER_SHADERS-NOTICE.txt\`. Those two packages appear in the
JavaScript inventory below for completeness, but this retained material is authoritative for them
and no duplicate copy is generated.`,
        `## JavaScript runtime dependencies

${wrap(
    `The declared production dependency closure of \`package.json\`, resolved through pnpm and read from the installed packages: ${javascript.entries.length} package-versions. ${javascript.typeOnlyExcluded} type-declaration-only packages (\`@types/*\`) are not runtime artifacts and are omitted. ${referenced(javascript.entries)} entries reference the special-case material above. Of the rest, ${state(javascript.entries, 'local')} carry their license text inside the installed package, ${extracted(javascript.entries)} provide it as a reviewed extraction from an installed file, and ${fallbacks(javascript.entries)} use a reviewed fallback pinned to the exact version.`,
)}

${dependencyTable(javascript.entries, 'Package', resolutions)}`,
        `## Rust runtime dependencies

${wrap(
    `The normal dependencies of \`src-tauri/Cargo.toml\`, resolved from \`cargo metadata\`: ${rust.entries.length} crate-versions. Dev-dependencies and build-dependencies are excluded because they are not linked into the shipped binary. The closure is the union across Diffusion's supported targets, so it does not depend on the machine that generated this list. ${state(rust.entries, 'local')} crates carry their license text inside the published crate; ${extracted(rust.entries)} provide it as a reviewed extraction from an installed crate file; ${fallbacks(rust.entries)} use a reviewed fallback pinned to the exact crate version.`,
)}

${dependencyTable(rust.entries, 'Crate', resolutions)}`,
        sourceCodeFormSection(dependencies, sourceCodeForm),
        fallbackProvenanceSection(dependencies, resolutions, registry),
    ].filter(Boolean);

    if (reviewed.length > 0) {
        sections.push(`## Non-SPDX license declarations

These dependencies declare terms without an SPDX identifier. Each declaration below is recorded
verbatim from the installed package and was reviewed by a human; a changed declaration fails the
generator until it is reviewed again.

| Package | Version | Declared | Review note |
|---|---|---|---|
${reviewed
    .map((entry) => `| ${tableCell(entry.name)} | ${tableCell(entry.version)} | ${tableCell(entry.declared)} | ${tableCell(entry.note ?? '')} |`)
    .join('\n')}`);
    }

    sections.push(`Other runtime dependencies remain under their respective upstream licenses.

Diffusion's own Apache-2.0 license does not replace or alter any third-party terms above.`);

    return `${sections.join('\n\n')}\n`;
}
