import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
    entryDirectoryName,
    evaluateDeclaredLicense,
    findLicenseFiles,
} from '../../scripts/lib/dependency-license-rules.mjs';
import {
    loadFallbackRegistry,
    resolveLicenseMaterial,
    resolveSourceCodeForm,
    sha256,
} from '../../scripts/lib/dependency-license-fallbacks.mjs';
import { renderIndex } from '../../scripts/lib/distribution-notices.mjs';
import { REVIEWED_NON_SPDX } from '../../scripts/lib/dependency-license-rules.mjs';

/**
 * The rules behind the generated distribution dependency inventory.
 *
 * The inventory ships real license text with a desktop build, so the part worth pinning down offline
 * is the classification: what is accepted without comment, and what is refused until a human records
 * it. A wrong answer here either ships an unnoticed term or silently blocks packaging.
 */

const evaluate = (declared, name = 'example') => evaluateDeclaredLicense({ ecosystem: 'javascript', name, version: '1.0.0', declared });

test('ordinary open-source SPDX declarations are accepted as written', () => {
    for (const declared of [
        'MIT',
        'Apache-2.0',
        'BSD-3-Clause',
        'ISC',
        'MPL-2.0',
        'MIT OR Apache-2.0',
        'Apache-2.0 OR MIT',
        'Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT',
        '(MIT OR Apache-2.0) AND Unicode-3.0',
    ]) {
        const result = evaluate(declared);
        assert.equal(result.status, 'spdx', declared);
        assert.deepEqual(result.problems, []);
        assert.equal(result.declared, declared);
    }
});

test('Cargo\u2019s legacy slash form is read as OR and flagged, not rewritten', () => {
    const result = evaluate('MIT/Apache-2.0');
    assert.equal(result.status, 'spdx');
    assert.equal(result.normalized, 'MIT OR Apache-2.0');
    assert.equal(result.legacy, true);
    assert.equal(result.declared, 'MIT/Apache-2.0');
});

test('an unrecognised identifier blocks packaging and names the package', () => {
    const result = evaluate('Proprietary-1.0', 'secret-sauce');
    assert.equal(result.status, 'unresolved');
    assert.match(result.problems.join('\n'), /javascript secret-sauce@1\.0\.0/);
    assert.match(result.problems.join('\n'), /Proprietary-1\.0/);
});

test('missing license metadata blocks packaging', () => {
    const result = evaluate(undefined, 'unlabelled');
    assert.equal(result.status, 'unresolved');
    assert.match(result.problems[0], /declares no license metadata/);
});

test('a reviewed non-SPDX declaration is accepted only while it is unchanged', () => {
    const reviewed = evaluate("Standard 'no charge' license: https://gsap.com/standard-license.", 'gsap');
    assert.equal(reviewed.status, 'non-spdx-reviewed');
    assert.match(reviewed.note, /not an SPDX identifier/i);

    const changed = evaluate('Some other license', 'gsap');
    assert.equal(changed.status, 'unresolved');
    assert.match(changed.problems.join('\n'), /the reviewed declaration was/);
});

test('an unknown non-SPDX declaration is refused rather than guessed at', () => {
    const result = evaluate('SEE LICENSE AT https://example.test/terms', 'mystery-package');
    assert.equal(result.status, 'unresolved');
    assert.match(result.problems.join('\n'), /unrecognised license identifier/);
});

test('"SEE LICENSE IN <file>" is followed only when the package really contains it', () => {
    const declared = evaluate('SEE LICENSE IN LICENSE.custom', 'custom-terms');
    assert.equal(declared.status, 'license-file');
    assert.equal(declared.reference, 'LICENSE.custom');

    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'diffusion-license-fixture-'));
    try {
        fs.writeFileSync(path.join(temporary, 'LICENSE.custom'), 'terms\n');
        assert.equal(fs.existsSync(path.join(temporary, declared.reference)), true);
        assert.deepEqual(findLicenseFiles(temporary), ['LICENSE.custom']);

        // The fixture the shipped generator refuses: metadata points at a file that is not there.
        fs.rmSync(path.join(temporary, 'LICENSE.custom'));
        assert.equal(fs.existsSync(path.join(temporary, declared.reference)), false);
    } finally {
        fs.rmSync(temporary, { recursive: true, force: true });
    }
});

test('only conventional license material is treated as distributable text', () => {
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'diffusion-license-files-'));
    try {
        for (const file of ['LICENSE', 'LICENSE-MIT', 'COPYING', 'NOTICE.md', 'CopyrightNotice.txt', 'README.md', 'index.js']) {
            fs.writeFileSync(path.join(temporary, file), 'x\n');
        }
        assert.deepEqual(findLicenseFiles(temporary), ['COPYING', 'CopyrightNotice.txt', 'LICENSE', 'LICENSE-MIT', 'NOTICE.md']);
    } finally {
        fs.rmSync(temporary, { recursive: true, force: true });
    }
});

test('generated directory names stay filesystem-safe for scoped packages', () => {
    assert.equal(entryDirectoryName('react', '19.3.0'), 'react-19.3.0');
    assert.equal(entryDirectoryName('@tauri-apps/api', '2.11.1'), '@tauri-apps+api-2.11.1');
    assert.equal(entryDirectoryName('../escape', '1.0.0'), '..+escape-1.0.0');
    assert.throws(() => entryDirectoryName('pkg:name', '1.0.0'), /Unsupported characters/);
});

// --- reviewed license-text fallbacks -------------------------------------------------------------

/**
 * The fallback layer exists because a handful of runtime dependencies publish no license text at all.
 * These tests pin the guarantees that make that layer safe: exact version, exact declaration, exact
 * bytes, and a loud failure for every way a stale or tampered fallback could reach a distribution.
 */
const fallbackDirectory = path.join('docs', 'third_party', 'runtime-license-fallbacks');

function fallbackFixture({ registry, files = {}, sourceFiles = {} }) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'diffusion-fallback-'));
    const directory = path.join(root, fallbackDirectory);
    fs.mkdirSync(directory, { recursive: true });
    for (const [relative, content] of Object.entries(files)) {
        const target = path.join(directory, relative);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, content);
    }
    fs.writeFileSync(path.join(directory, 'registry.json'), JSON.stringify(registry));
    const sourceDir = path.join(root, 'installed');
    fs.mkdirSync(sourceDir, { recursive: true });
    for (const [relative, content] of Object.entries(sourceFiles)) {
        fs.writeFileSync(path.join(sourceDir, relative), content);
    }
    return { root, sourceDir };
}

const dependency = (overrides = {}) => ({
    ecosystem: 'rust',
    name: 'example-crate',
    version: '1.2.3',
    declared: 'MIT',
    files: [],
    sourceDir: '',
    reference: undefined,
    ...overrides,
});

function fallbackRegistry({ fileContent = 'MIT text\n', entryOverrides = {}, groupOverrides = {} } = {}) {
    return {
        groups: {
            'example-group': {
                repository: 'example/example',
                reason: 'The published crate ships no license file.',
                files: { 'LICENSE-MIT': { url: 'https://example.test/LICENSE-MIT', revisions: ['a'.repeat(40)], verifiedRevisions: ['a'.repeat(40)], fetched: '2026-09-22', sha256: sha256(fileContent) } },
                ...groupOverrides,
            },
        },
        entries: [
            { ecosystem: 'rust', name: 'example-crate', version: '1.2.3', declaredLicense: 'MIT', group: 'example-group', files: ['LICENSE-MIT'], ...entryOverrides },
        ],
    };
}

test('a reviewed fallback resolves only for its exact version and declaration', () => {
    const fixture = fallbackFixture({ registry: fallbackRegistry(), files: { 'example-group/LICENSE-MIT': 'MIT text\n' } });
    const registry = loadFallbackRegistry(fixture.root, fallbackDirectory);

    const resolved = resolveLicenseMaterial(dependency({ sourceDir: fixture.sourceDir }), registry);
    assert.equal(resolved.state, 'fallback');
    assert.deepEqual(resolved.problems, []);
    assert.deepEqual(resolved.materials.map((material) => material.bundled), ['LICENSE-MIT']);
    assert.equal(fs.readFileSync(resolved.materials[0].from, 'utf8'), 'MIT text\n');
});

test('a dependency upgrade does not reuse the reviewed fallback', () => {
    const fixture = fallbackFixture({ registry: fallbackRegistry(), files: { 'example-group/LICENSE-MIT': 'MIT text\n' } });
    const registry = loadFallbackRegistry(fixture.root, fallbackDirectory);
    const upgraded = dependency({ version: '1.2.4', sourceDir: fixture.sourceDir });

    const resolved = resolveLicenseMaterial(upgraded, registry);
    assert.equal(resolved.state, 'unresolved');
    assert.match(resolved.problems.join('\n'), /rust example-crate@1\.2\.4/);
    assert.match(resolved.problems.join('\n'), /no reviewed fallback exists/);
});

test('a changed license declaration fails instead of inheriting the review', () => {
    const fixture = fallbackFixture({ registry: fallbackRegistry(), files: { 'example-group/LICENSE-MIT': 'MIT text\n' } });
    const registry = loadFallbackRegistry(fixture.root, fallbackDirectory);
    const relicensed = dependency({ declared: 'Apache-2.0', sourceDir: fixture.sourceDir });

    const resolved = resolveLicenseMaterial(relicensed, registry);
    assert.equal(resolved.state, 'unresolved');
    assert.match(resolved.problems.join('\n'), /declares "Apache-2\.0", but the reviewed fallback was recorded for "MIT"/);
});

test('a missing or edited fallback file is a hard failure', () => {
    const missing = fallbackFixture({ registry: fallbackRegistry() });
    const missingRegistry = loadFallbackRegistry(missing.root, fallbackDirectory);
    const unresolved = resolveLicenseMaterial(dependency({ sourceDir: missing.sourceDir }), missingRegistry);
    assert.equal(unresolved.state, 'unresolved');
    assert.match(unresolved.problems.join('\n'), /reviewed fallback file is missing/);

    const edited = fallbackFixture({
        registry: fallbackRegistry(),
        files: { 'example-group/LICENSE-MIT': 'MIT text, but edited afterwards\n' },
    });
    const editedRegistry = loadFallbackRegistry(edited.root, fallbackDirectory);
    const tampered = resolveLicenseMaterial(dependency({ sourceDir: edited.sourceDir }), editedRegistry);
    assert.equal(tampered.state, 'unresolved');
    assert.match(tampered.problems.join('\n'), /no longer matches its recorded text/);
});

test('an extraction resolves the reviewed section byte for byte', () => {
    const readme = ['# Package', '', '## Unlicense', '', 'This is free and unencumbered software.', '', 'Second line.', ''].join('\n');
    const section = 'This is free and unencumbered software.\n\nSecond line.\n';
    const registry = {
        groups: {},
        entries: [
            {
                ecosystem: 'javascript',
                name: 'example-package',
                version: '1.2.3',
                declaredLicense: 'Unlicense',
                extract: { file: 'README.md', sections: [{ bundled: 'UNLICENSE.txt', startMarker: '## Unlicense', endMarker: null, sha256: sha256(section) }] },
            },
        ],
    };
    const fixture = fallbackFixture({ registry, sourceFiles: { 'README.md': readme } });
    const loaded = loadFallbackRegistry(fixture.root, fallbackDirectory);

    const resolved = resolveLicenseMaterial(dependency({ ecosystem: 'javascript', name: 'example-package', declared: 'Unlicense', sourceDir: fixture.sourceDir }), loaded);
    assert.equal(resolved.state, 'extracted');
    assert.equal(resolved.materials[0].bundled, 'UNLICENSE.txt');
    assert.equal(resolved.materials[0].content, section);
});

test('a changed extraction marker or a changed section fails loudly', () => {
    const section = 'This is free and unencumbered software.\n';
    const entry = (sha) => ({
        groups: {},
        entries: [
            {
                ecosystem: 'javascript',
                name: 'example-package',
                version: '1.2.3',
                declaredLicense: 'Unlicense',
                extract: { file: 'README.md', sections: [{ bundled: 'UNLICENSE.txt', startMarker: '## Unlicense', endMarker: null, sha256: sha }] },
            },
        ],
    });
    const target = (fixture) => dependency({ ecosystem: 'javascript', name: 'example-package', declared: 'Unlicense', sourceDir: fixture.sourceDir });

    const renamed = fallbackFixture({ registry: entry(sha256(section)), sourceFiles: { 'README.md': '# Package\n\n## License\n\nThis is free and unencumbered software.\n' } });
    const renamedResult = resolveLicenseMaterial(target(renamed), loadFallbackRegistry(renamed.root, fallbackDirectory));
    assert.equal(renamedResult.state, 'unresolved');
    assert.match(renamedResult.problems.join('\n'), /expected exactly one "## Unlicense" marker, found 0/);

    const ambiguous = fallbackFixture({ registry: entry(sha256(section)), sourceFiles: { 'README.md': '## Unlicense\n\n## Unlicense\n\nThis is free and unencumbered software.\n' } });
    assert.match(
        resolveLicenseMaterial(target(ambiguous), loadFallbackRegistry(ambiguous.root, fallbackDirectory)).problems.join('\n'),
        /expected exactly one "## Unlicense" marker, found 2/,
    );

    const rewritten = fallbackFixture({ registry: entry(sha256(section)), sourceFiles: { 'README.md': '## Unlicense\n\nThis is different free software.\n' } });
    const rewrittenResult = resolveLicenseMaterial(target(rewritten), loadFallbackRegistry(rewritten.root, fallbackDirectory));
    assert.equal(rewrittenResult.state, 'unresolved');
    assert.match(rewrittenResult.problems.join('\n'), /no longer matches the reviewed text/);

    const removed = fallbackFixture({ registry: entry(sha256(section)) });
    assert.match(
        resolveLicenseMaterial(target(removed), loadFallbackRegistry(removed.root, fallbackDirectory)).problems.join('\n'),
        /expected an installed "README\.md"/,
    );
});

test('text installed in the package always wins over a reviewed fallback', () => {
    const fixture = fallbackFixture({ registry: fallbackRegistry(), files: { 'example-group/LICENSE-MIT': 'MIT text\n' } });
    const registry = loadFallbackRegistry(fixture.root, fallbackDirectory);

    const resolved = resolveLicenseMaterial(dependency({ files: ['LICENSE'], sourceDir: fixture.sourceDir }), registry);
    assert.equal(resolved.state, 'local');
    assert.equal(resolved.materials[0].from, path.join(fixture.sourceDir, 'LICENSE'));
});

test('byte-pinned legal inputs are declared LF-stable for Windows checkouts', () => {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
    const registry = loadFallbackRegistry(root);
    const files = [
        'LICENSE',
        'internal/discovery-engine/LICENSE.smartsearch',
        'docs/third_party/REACT_BITS_MATERIALS_LICENSE.md',
        'docs/third_party/PAPER_SHADERS_LICENSE.txt',
        'docs/third_party/PAPER_SHADERS_NOTICE.md',
        ...Object.entries(registry.groups).flatMap(([group, { files }]) =>
            Object.keys(files).map((name) => `docs/third_party/runtime-license-fallbacks/${group}/${name}`)),
    ];
    const attributes = execFileSync('git', ['check-attr', '-z', '--stdin', 'text', 'eol'], {
        cwd: root,
        input: `${files.join('\0')}\0`,
    }).toString().split('\0');
    assert.equal(attributes.length - 1, files.length * 6);
    for (let i = 0; i < attributes.length - 1; i += 3) {
        assert.equal(attributes[i + 2], attributes[i + 1] === 'text' ? 'set' : 'lf',
            `${attributes[i]} must have ${attributes[i + 1]} set for byte-stable checkout`);
    }
});

test('the committed registry, its files and its extraction pins are internally consistent', () => {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
    const registry = loadFallbackRegistry(root);

    assert.ok(registry.entries.length > 0, 'registry has no entries');
    const identities = new Set();
    for (const entry of registry.entries) {
        const identity = `${entry.ecosystem}:${entry.name}@${entry.version}`;
        assert.equal(identities.has(identity), false, `duplicate fallback entry for ${identity}`);
        identities.add(identity);
        assert.ok(entry.declaredLicense, `${identity} records no declared license`);
        if (entry.extract) {
            assert.ok(entry.extract.file, `${identity} records no extraction file`);
            for (const section of entry.extract.sections) assert.match(section.sha256, /^[a-f0-9]{64}$/);
            continue;
        }
        const group = registry.groups[entry.group];
        assert.ok(group, `${identity} names unknown group ${entry.group}`);
        assert.ok((entry.files ?? []).length > 0, `${identity} lists no files`);
        for (const name of entry.files) {
            const from = path.join(root, fallbackDirectory, entry.group, name);
            assert.ok(fs.existsSync(from), `${identity} references a missing file: ${entry.group}/${name}`);
            assert.equal(sha256(fs.readFileSync(from)), group.files[name].sha256, `${entry.group}/${name} does not match its recorded hash`);
        }
    }
});

// --- retained GSAP terms and MPL Source Code Form availability ------------------------------------

/**
 * Two legal-distribution facts that must stay true of what a recipient reads:
 * the retained GSAP terms are described as they are written, and every MPL-covered dependency in the
 * executable distribution says where its Source Code Form can be obtained.
 */
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const retainedGsapTerms = fs.readFileSync(
    path.join(repositoryRoot, 'docs/third_party/runtime-license-fallbacks/gsap/GSAP-STANDARD-LICENSE.txt'),
    'utf8',
);

test('the retained GSAP terms are described factually and no end-user fee condition is invented', () => {
    // The retained text is titled "no charge", so the name may be quoted — but it must not be turned
    // into a requirement about what a product may charge, which the text does not contain.
    assert.match(retainedGsapTerms, /Standard "No Charge" GSAP License/);
    assert.match(retainedGsapTerms, /II\. GRANT OF LICENSE/);
    assert.match(retainedGsapTerms, /III\. RESTRICTIONS/);
    assert.doesNotMatch(retainedGsapTerms, /must be free|no charge to end users|end users are not charged|free of charge to end users|may not charge/i);

    const note = REVIEWED_NON_SPDX['javascript:gsap'].note;
    assert.match(note, /Commercial use is permitted/);
    assert.match(note, /Prohibited Uses/);
    assert.match(note, /not MIT, Apache-2\.0 or open source/);
    // A factual statement that the text sets no such requirement is fine; asserting one is not.
    assert.doesNotMatch(note, /must (?:be|remain) free|requires? that (?:the )?(?:product|end users?)/i);
    assert.doesNotMatch(note, /must not charge|no charge to end users/i);
    assert.doesNotMatch(REVIEWED_NON_SPDX['javascript:gsap'].declared, /MIT|Apache-2\.0/);

    const fallbackNotes = fs
        .readFileSync(path.join(repositoryRoot, fallbackDirectory, 'README.md'), 'utf8')
        .concat(fs.readFileSync(path.join(repositoryRoot, fallbackDirectory, 'registry.json'), 'utf8'));
    assert.doesNotMatch(fallbackNotes, /no charge to end users|end users are not charged|must be free/i);
});

test('every MPL-covered dependency has an exact-version Source Code Form location', () => {
    const registry = loadFallbackRegistry(repositoryRoot);
    assert.ok(registry.sourceCodeForm.length > 0, 'no MPL Source Code Form record exists');

    for (const record of registry.sourceCodeForm) {
        const identity = `${record.ecosystem} ${record.name}@${record.version}`;
        assert.match(record.license, /^MPL-/, `${identity} is not recorded as MPL`);
        assert.match(record.revision ?? '', /^[a-f0-9]{40}$/, `${identity} records no exact upstream revision`);
        assert.ok(record.locations.length >= 1, `${identity} records no source location`);
        for (const location of record.locations) {
            assert.match(location, /^https:\/\//, `${identity} has a non-https location: ${location}`);
        }
        // Exact version or exact revision, never a bare default branch.
        assert.match(
            record.locations.join(' '),
            new RegExp(`${record.version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|${record.revision}`),
            `${identity} has no version- or revision-pinned location`,
        );
        assert.doesNotMatch(record.locations.join(' '), /\/tree\/(?:main|master|HEAD)(?:\/|$)/, `${identity} points at a moving branch`);
    }
    assert.ok(
        registry.sourceCodeForm.some((record) => record.name === 'selectors' && record.version === '0.36.1'),
        'selectors@0.36.1 has no recorded Source Code Form location',
    );
});

test('the MPL record is exact-version keyed and never grants a non-MPL dependency a source requirement', () => {
    const record = { ecosystem: 'rust', name: 'selectors', version: '0.36.1', license: 'MPL-2.0', revision: 'a'.repeat(40), locations: ['https://example.test/selectors/0.36.1'] };
    const registry = { directory: '', groups: {}, entries: [], sourceCodeForm: [record] };
    const mpl = (overrides = {}) => dependency({ name: 'selectors', version: '0.36.1', declared: 'MPL-2.0', ...overrides });

    const resolved = resolveSourceCodeForm(mpl(), registry);
    assert.equal(resolved.record, record);
    assert.deepEqual(resolved.problems, []);

    // A version bump finds no record: the review does not carry over.
    const upgraded = resolveSourceCodeForm(mpl({ version: '0.37.0' }), registry);
    assert.equal(upgraded.record, null);
    assert.match(upgraded.problems.join('\n'), /rust selectors@0\.37\.0/);
    assert.match(upgraded.problems.join('\n'), /no MPL Source Code Form location is recorded/);

    // An unrelated dependency gets nothing, even while the record exists.
    const unrelated = resolveSourceCodeForm(dependency({ name: 'react', ecosystem: 'javascript', declared: 'MIT' }), registry);
    assert.equal(unrelated.record, null);
    assert.deepEqual(unrelated.problems, []);

    // A record attached to something that is not MPL-covered is stale, not silently applied.
    const relicensed = resolveSourceCodeForm(mpl({ declared: 'MIT' }), registry);
    assert.match(relicensed.problems.join('\n'), /declares "MIT", but a Source Code Form location is recorded for MPL/);

    // A record with the wrong license, or without an absolute https location, is refused.
    assert.match(
        resolveSourceCodeForm(mpl(), { ...registry, sourceCodeForm: [{ ...record, license: 'MIT' }] }).problems.join('\n'),
        /not an MPL identifier/,
    );
    assert.match(
        resolveSourceCodeForm(mpl(), { ...registry, sourceCodeForm: [{ ...record, locations: ['/local/path'] }] }).problems.join('\n'),
        /absolute https URL/,
    );
});

test('the notices state the MPL Source Code Form location, and only for MPL-covered dependencies', () => {
    const mplRecord = { ecosystem: 'rust', name: 'selectors', version: '0.36.1', license: 'MPL-2.0', revision: 'a'.repeat(40), locations: ['https://crates.io/api/v1/crates/selectors/0.36.1/download'] };
    const mitRecord = { ecosystem: 'javascript', name: 'react', version: '19.3.0', license: 'MPL-2.0', revision: 'b'.repeat(40), locations: ['https://crates.io/api/v1/crates/react/19.3.0/download'] };
    const mplEntry = dependency({ ecosystem: 'rust', name: 'selectors', version: '0.36.1', declared: 'MPL-2.0', directory: 'selectors-0.36.1', files: ['MPL-2.0.txt'] });
    const mitEntry = dependency({ ecosystem: 'javascript', name: 'react', version: '19.3.0', declared: 'MIT', directory: 'react-19.3.0', files: ['LICENSE'] });
    const resolutions = new Map([
        [mplEntry, { state: 'local', materials: [{ bundled: 'MPL-2.0.txt', from: 'unused' }], problems: [] }],
        [mitEntry, { state: 'local', materials: [{ bundled: 'LICENSE', from: 'unused' }], problems: [] }],
    ]);

    const withRecord = renderIndex({
        javascript: { entries: [mitEntry], typeOnlyExcluded: 0 },
        rust: { entries: [mplEntry] },
        dependencies: [mitEntry, mplEntry],
        resolutions,
        registry: { directory: '', groups: {}, entries: [], sourceCodeForm: [] },
        sourceCodeForm: new Map([[mplEntry, mplRecord]]),
    });
    // Generated prose is wrapped, so compare on unwrapped text.
    const flat = withRecord.replace(/\s+/g, ' ');
    assert.match(flat, /## Source Code Form availability \(one MPL-covered dependency\)/);
    assert.match(flat, /\| selectors@0\.36\.1 \| MPL-2\.0 \| <https:\/\/crates\.io\/api\/v1\/crates\/selectors\/0\.36\.1\/download> \|/);
    assert.match(flat, /may obtain the corresponding Source Code Form under MPL-2\.0 at the locations below/);
    assert.match(flat, /does not apply to Diffusion's own source, which remains under the Apache License 2\.0/);
    assert.doesNotMatch(flat, /MPL-2\.0 Source Code Form available at[\s\S]*\| react@19\.3\.0 \|/);

    // Without a record nothing is claimed, so a non-MPL dependency can never inherit a MPL duty.
    const withoutRecord = renderIndex({
        javascript: { entries: [mitEntry], typeOnlyExcluded: 0 },
        rust: { entries: [mplEntry] },
        dependencies: [mitEntry, mplEntry],
        resolutions,
        registry: { directory: '', groups: {}, entries: [], sourceCodeForm: [] },
        sourceCodeForm: new Map(),
    });
    assert.doesNotMatch(withoutRecord, /Source Code Form availability/);
    void mitRecord;
});
