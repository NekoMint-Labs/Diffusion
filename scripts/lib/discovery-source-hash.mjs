/**
 * The source hash of Diffusion's bundled discovery engine.
 *
 * The frozen executable is a build product, so the only honest way to know whether the checked-in
 * artifact still matches the checked-in source is to hash that source and compare. Both the build
 * script (which writes the hash into the artifact directory) and the cheap pre-`tauri dev` check
 * call this one implementation, so the two can never disagree about what "the source" is.
 *
 * What is hashed: the import package and the two files that define how it is built and invoked.
 * What is deliberately not hashed: `tests/`, `PROVENANCE.md`, `README.md`, `LICENSE.*`. Changing
 * any of those must not force a re-freeze — they document the engine, they are not the engine.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

/** The import package, relative to the repository root, hashed recursively. */
const PACKAGE_DIR = 'internal/discovery-engine/diffusion_discovery';
/** The build/entry files that sit alongside the package. */
const EXTRA_FILES = ['internal/discovery-engine/entrypoint.py', 'internal/discovery-engine/pyproject.toml'];

/** Collect every relevant file as a posix path relative to the repository root. */
function collect(base, relative, out) {
    for (const entry of fs.readdirSync(path.join(base, relative), { withFileTypes: true })) {
        if (entry.isDirectory()) {
            if (entry.name === '__pycache__') continue;
            collect(base, path.posix.join(relative, entry.name), out);
        } else if (entry.isFile() && !entry.name.endsWith('.pyc')) {
            out.push(path.posix.join(relative, entry.name));
        }
    }
}

/**
 * The engine source hash: a sha256 over `<relative path>\n<file sha256>\n` for every relevant file,
 * in lexicographic path order, lowercase hex. Content and relative path both matter, so a rename is
 * as visible as an edit.
 */
export function computeSourceHash(root) {
    const files = [];
    collect(root, PACKAGE_DIR, files);
    files.push(...EXTRA_FILES);
    files.sort();
    const digest = crypto.createHash('sha256');
    for (const relative of files) {
        const fileHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, relative))).digest('hex');
        digest.update(`${relative}\n${fileHash}\n`);
    }
    return digest.digest('hex');
}
