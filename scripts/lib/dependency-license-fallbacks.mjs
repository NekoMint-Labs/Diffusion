/**
 * Reviewed license-text sources for dependencies whose installed package or crate publishes no usable
 * license text of its own.
 *
 * The distribution prefers text found in the installed artifact. Only when nothing usable is there
 * does this module resolve a *reviewed fallback*: a committed upstream text, or a deterministic
 * extraction from the installed artifact, each pinned to the exact package version, the exact
 * declared license and the exact bytes.
 *
 * The registry is keyed by ecosystem + name + exact version, so a dependency upgrade cannot silently
 * inherit an old review. Details of the one-time upstream research live beside the texts in
 * `docs/third_party/runtime-license-fallbacks/`.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const FALLBACK_DIRECTORY = path.join('docs', 'third_party', 'runtime-license-fallbacks');

export function sha256(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
}

export function loadFallbackRegistry(root, directory = FALLBACK_DIRECTORY) {
    const directoryPath = path.join(root, directory);
    const registryPath = path.join(directoryPath, 'registry.json');
    if (!fs.existsSync(registryPath)) {
        throw new Error(`Missing reviewed fallback registry: ${path.join(directory, 'registry.json')}`);
    }
    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    return {
        directory: directoryPath,
        groups: registry.groups ?? {},
        entries: registry.entries ?? [],
        sourceCodeForm: registry.sourceCodeForm ?? [],
    };
}

export function findFallbackEntry(registry, { ecosystem, name, version }) {
    return registry.entries.find(
        (entry) => entry.ecosystem === ecosystem && entry.name === name && entry.version === version,
    );
}

const MPL_IDENTIFIER = /(?:^|[\s(])MPL-[0-9A-Za-z.+-]+/;

/**
 * A dependency covered by the Mozilla Public License and distributed in executable form has to tell
 * its recipients where the corresponding Source Code Form can be obtained (MPL-2.0 section 3.2).
 *
 * The recorded location is exact-version pinned, like every other review here: a version bump finds
 * no record and fails, and a record whose dependency no longer declares MPL is stale and fails too.
 */
export function resolveSourceCodeForm(entry, registry) {
    const identity = `${entry.ecosystem} ${entry.name}@${entry.version}`;
    const record = registry.sourceCodeForm.find(
        (candidate) =>
            candidate.ecosystem === entry.ecosystem &&
            candidate.name === entry.name &&
            candidate.version === entry.version,
    );
    const covered = MPL_IDENTIFIER.test(entry.declared ?? '');

    if (!record) {
        if (!covered) return { record: null, problems: [] };
        return {
            record: null,
            problems: [
                `${identity}: covered by ${entry.declared} and distributed in executable form, but no MPL Source Code Form location is recorded.`,
                '  Add an exact-version record to the sourceCodeForm list in docs/third_party/runtime-license-fallbacks/registry.json.',
            ],
        };
    }

    const problems = [];
    if (!MPL_IDENTIFIER.test(record.license ?? '')) {
        problems.push(`${identity}: a Source Code Form location is recorded under license "${record.license}", which is not an MPL identifier.`);
    }
    if (!covered) {
        problems.push(
            `${identity}: declares "${entry.declared}", but a Source Code Form location is recorded for MPL. Re-review whether this dependency is still MPL-covered.`,
        );
    }
    if (!Array.isArray(record.locations) || record.locations.length === 0 || record.locations.some((location) => !/^https:\/\//.test(location))) {
        problems.push(`${identity}: the recorded Source Code Form locations must be at least one absolute https URL.`);
    }
    return { record, problems };
}

/** Extract marker-delimited sections from one installed text file without altering its wording. */
export function extractSections(text, sections, label) {
    const lines = text.split(/\r?\n/);
    const extractions = [];
    for (const section of sections) {
        const matches = lines.map((line, index) => (line === section.startMarker ? index : -1)).filter((index) => index >= 0);
        if (matches.length !== 1) {
            throw new Error(`${label}: expected exactly one "${section.startMarker}" marker, found ${matches.length}.`);
        }
        const start = matches[0] + 1;
        let end = lines.length;
        if (section.endMarker) {
            const ends = lines.map((line, index) => (line === section.endMarker ? index : -1)).filter((index) => index > start);
            if (ends.length !== 1) {
                throw new Error(`${label}: expected exactly one "${section.endMarker}" marker after "${section.startMarker}", found ${ends.length}.`);
            }
            end = ends[0];
        }
        // Blank lines that merely separate the section from its heading are dropped; the wording
        // itself is untouched and every other byte is pinned by the recorded hash.
        const body = lines.slice(start, end);
        while (body.length > 0 && body[0].trim() === '') body.shift();
        while (body.length > 0 && body[body.length - 1].trim() === '') body.pop();
        extractions.push({ bundled: section.bundled, content: `${body.join('\n')}\n`, sha256: section.sha256 });
    }
    return extractions;
}

/**
 * Resolve the license material that should travel with one dependency.
 *
 * States: `special-case` (retained repository material is authoritative), `local` (copied from the
 * installed package), `extracted` (deterministically taken out of an installed file) and
 * `fallback` (a reviewed, exact-version upstream text). Anything else is `unresolved`.
 */
export function resolveLicenseMaterial(entry, registry) {
    const identity = `${entry.ecosystem} ${entry.name}@${entry.version}`;
    const problems = [];
    const unresolved = (...messages) => ({ state: 'unresolved', materials: [], problems: messages });

    if (entry.reference) return { state: 'special-case', materials: [], problems };

    if (entry.files.length > 0) {
        return {
            state: 'local',
            materials: entry.files.map((file) => ({ bundled: file, from: path.join(entry.sourceDir, file) })),
            problems,
        };
    }

    const reviewed = findFallbackEntry(registry, entry);
    if (!reviewed) {
        return unresolved(
            `${identity}: the installed package publishes no license text and no reviewed fallback exists.`,
            '  Locate the authoritative terms, commit them under docs/third_party/runtime-license-fallbacks/, then add an',
            `  exact-version entry for ${entry.name}@${entry.version} to that directory's registry.json.`,
        );
    }

    if (reviewed.declaredLicense !== entry.declared) {
        return unresolved(
            `${identity}: declares "${entry.declared}", but the reviewed fallback was recorded for "${reviewed.declaredLicense}".`,
            '  Re-review the terms and the bundled text before updating this entry.',
        );
    }

    if (reviewed.extract) {
        const file = path.join(entry.sourceDir, reviewed.extract.file);
        if (!fs.existsSync(file)) {
            return unresolved(`${identity}: expected an installed "${reviewed.extract.file}" to extract reviewed text from.`);
        }
        let extractions;
        try {
            extractions = extractSections(fs.readFileSync(file, 'utf8'), reviewed.extract.sections, identity);
        } catch (error) {
            return unresolved(`${identity}: extraction from the installed ${reviewed.extract.file} failed — ${error.message}`);
        }
        for (const extraction of extractions) {
            if (sha256(extraction.content) !== extraction.sha256) {
                problems.push(
                    `${identity}: extracted "${extraction.bundled}" no longer matches the reviewed text (reviewed ${extraction.sha256.slice(0, 12)}, found ${sha256(extraction.content).slice(0, 12)}).`,
                    `  Review the changed text in the installed ${reviewed.extract.file} and update registry.json.`,
                );
            }
        }
        if (problems.length > 0) return { state: 'unresolved', materials: [], problems };
        return {
            state: 'extracted',
            materials: extractions.map(({ bundled, content }) => ({ bundled, content })),
            problems,
        };
    }

    const group = registry.groups[reviewed.group];
    if (!group) return unresolved(`${identity}: reviewed fallback names unknown group "${reviewed.group}".`);

    const materials = [];
    for (const name of reviewed.files ?? Object.keys(group.files)) {
        const recorded = group.files[name];
        if (!recorded) return unresolved(`${identity}: group "${reviewed.group}" does not record a "${name}" file.`);
        const from = path.join(registry.directory, reviewed.group, name);
        if (!fs.existsSync(from)) {
            return unresolved(`${identity}: reviewed fallback file is missing: ${path.join(FALLBACK_DIRECTORY, reviewed.group, name)}`);
        }
        const committed = sha256(fs.readFileSync(from));
        if (committed !== recorded.sha256) {
            return unresolved(
                `${identity}: committed fallback "${reviewed.group}/${name}" no longer matches its recorded text ` +
                    `(recorded ${recorded.sha256.slice(0, 12)}, found ${committed.slice(0, 12)}).`,
            );
        }
        materials.push({ bundled: name, from });
    }
    return { state: 'fallback', materials, problems };
}
