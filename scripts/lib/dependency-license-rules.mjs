/**
 * Shared rules for the generated runtime dependency license inventory.
 *
 * The inventory reports facts derived from installed package metadata and from license text shipped
 * inside the packages themselves. It makes no legal compatibility judgement: an identifier or
 * declaration it does not recognise stops packaging until a human records it.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

/** Conventional names an installed package uses for distribution-facing license material. */
const LICENSE_FILE_PATTERN = /^(licen[cs]e|copying|copyright|notice)/i;

/** License/notice files shipped inside one installed package directory, sorted for determinism. */
export function findLicenseFiles(directory) {
    return fs
        .readdirSync(directory)
        .filter((name) => LICENSE_FILE_PATTERN.test(name) && fs.statSync(path.join(directory, name)).isFile())
        .sort();
}

/**
 * SPDX identifiers already present in this repository's dependency graph and understood as ordinary
 * open-source declarations. A dependency declaring anything else is reported as unresolved rather
 * than accepted, so an unfamiliar term cannot reach a distribution unnoticed.
 */
const SPDX_IDENTIFIERS = new Set([
    '0BSD',
    'Apache-2.0',
    'BSD-2-Clause',
    'BSD-3-Clause',
    'CC0-1.0',
    'CDLA-Permissive-2.0',
    'ISC',
    'LGPL-2.1-or-later',
    'MIT',
    'MIT-0',
    'MPL-2.0',
    'Unicode-3.0',
    'Unlicense',
    'Zlib',
]);
const SPDX_EXCEPTIONS = new Set(['LLVM-exception']);
const OPERATORS = new Set(['AND', 'OR', 'WITH']);

/**
 * Non-SPDX declarations a human has reviewed. Keyed by ecosystem and package name, and pinned to the
 * exact declared string: if a package changes what it declares, the mismatch is unresolved again.
 */
export const REVIEWED_NON_SPDX = {
    'javascript:gsap': {
        declared: "Standard 'no charge' license: https://gsap.com/standard-license.",
        note: "GSAP's own standard 'no charge' license, declared by the published package — 'no charge' is the license's own title, not a condition in the retained text. Not an SPDX identifier, and the npm packages publish no license text, so the complete terms are bundled as a reviewed fallback from the official licensing page both packages name. Commercial use is permitted under those terms; the substantive restriction is the defined 'Prohibited Uses' covering no-code tools that compete with Webflow's visual animation-building capabilities. The retained text sets no requirement about what an end product may charge its users, and GSAP is not MIT, Apache-2.0 or open source.",
    },
    'javascript:@gsap/react': {
        declared: 'SEE LICENSE AT https://gsap.com/standard-license',
        note: 'Same upstream GSAP standard license as `gsap`, declared by URL only; reviewed together with `gsap`, which bundles the terms.',
    },
};

/** npm's "SEE LICENSE IN <file>" form: the license text is the named file inside the package. */
const SEE_LICENSE_IN_FILE = /^SEE LICEN[CS]E IN\s+(.+)$/i;

/**
 * Classify one declared license value.
 *
 * Returns `status`:
 * - `spdx` — every identifier is recognised; `normalized` may differ from `declared` for Cargo's
 *   legacy slash form, which is read as `OR`.
 * - `license-file` — the declaration points at a license file inside the package.
 * - `non-spdx-reviewed` — a reviewed entry from `REVIEWED_NON_SPDX`.
 * - `unresolved` — needs human review; `problems` explains why.
 */
export function evaluateDeclaredLicense({ ecosystem, name, version, declared }) {
    const where = `${ecosystem} ${name}@${version}`;
    const value = typeof declared === 'string' ? declared.trim() : '';

    if (!value) {
        return {
            status: 'unresolved',
            declared: '',
            problems: [`${where}: the installed package declares no license metadata at all.`],
        };
    }

    const licenseFile = SEE_LICENSE_IN_FILE.exec(value);
    if (licenseFile) {
        return { status: 'license-file', declared: value, reference: licenseFile[1].trim(), problems: [] };
    }

    const reviewed = REVIEWED_NON_SPDX[`${ecosystem}:${name}`];
    if (reviewed) {
        if (reviewed.declared !== value) {
            return {
                status: 'unresolved',
                declared: value,
                problems: [
                    `${where}: declares "${value}", but the reviewed declaration was "${reviewed.declared}".\n  Re-review the terms, then update REVIEWED_NON_SPDX in scripts/lib/dependency-license-rules.mjs.`,
                ],
            };
        }
        return { status: 'non-spdx-reviewed', declared: value, note: reviewed.note, problems: [] };
    }

    // Cargo accepted "MIT/Apache-2.0" (and spaced variants) before SPDX expressions; it means OR.
    const legacy = !/\b(?:AND|OR|WITH)\b/.test(value) && value.includes('/');
    const normalized = legacy
        ? value
              .split('/')
              .map((part) => part.trim())
              .filter(Boolean)
              .join(' OR ')
        : value;

    const unknown = [...new Set(normalized.split(/[\s()]+/).filter(Boolean))]
        .filter((token) => !OPERATORS.has(token) && !SPDX_IDENTIFIERS.has(token) && !SPDX_EXCEPTIONS.has(token));

    if (unknown.length > 0) {
        return {
            status: 'unresolved',
            declared: value,
            problems: [
                `${where}: unrecognised license identifier(s) ${unknown.map((token) => `"${token}"`).join(', ')} in "${value}".\n  Confirm the terms, then either add the SPDX identifier or record the declaration in REVIEWED_NON_SPDX.`,
            ],
        };
    }

    return { status: 'spdx', declared: value, normalized, legacy, problems: [] };
}

/** Filesystem-safe, collision-free directory name for one package or crate identity. */
export function entryDirectoryName(name, version) {
    const directory = `${name.replace(/\//g, '+')}-${version}`;
    if (!/^[A-Za-z0-9@._+-]+$/.test(directory)) {
        throw new Error(`Unsupported characters in dependency identity: ${name}@${version}`);
    }
    return directory;
}

/** Content signature of the license material inside one installed package directory. */
export function licenseMaterialSignature(directory) {
    return findLicenseFiles(directory)
        .map((name) => `${name}:${crypto.createHash('sha256').update(fs.readFileSync(path.join(directory, name))).digest('hex')}`)
        .join('\n');
}

/** Deterministic, locale-independent ordering for generated entries. */
export function compareEntries(left, right) {
    const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
    return compare(left.ecosystem, right.ecosystem) || compare(left.name, right.name) || compare(left.version, right.version);
}
