import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { coreDependsOnRenderer, sourceFiles } from '../../scripts/offline-check.mjs';

test('Core renderer-import guard works with Windows and POSIX paths', () => {
    for (const file of ['src/core/model.ts', 'src\\core\\model.ts']) {
        for (const dependency of ['react', 'react/jsx-runtime', 'react-dom/client', 'zustand', 'dexie', 'motion/react'])
            assert.equal(coreDependsOnRenderer(file, `import { value } from '${dependency}';`), true);
        assert.equal(coreDependsOnRenderer(file, "import { value } from '../shared/value.ts';"), false);
        assert.equal(coreDependsOnRenderer(file, "import { value } from 'reaction';"), false);
    }
    assert.equal(coreDependsOnRenderer('src/ui/Workspace.tsx', "import { useState } from 'react';"), false);
});

test('source enumeration includes new files without Git and excludes local generated evidence', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'diffusion-source-check-'));
    try {
        const source = ['package.json', 'src/core/new.ts', 'tests/unit/new.test.ts', 'docs/language/regression.zh.json'];
        const generated = ['verification/bad.json', 'test-results/trace/bad.json', 'playwright-report/data/bad.json',
            'node_modules/pkg/index.ts', 'src-tauri/.discovery-build/venv/bad.json',
            'src-tauri/gen/schemas/bad.json', 'src-tauri/resources/discovery/bad.json',
            'src-tauri/resources/licenses/bad.json', 'dist/bad.json', 'src-tauri/target/bad.json'];
        for (const name of [...source, ...generated]) {
            const file = path.join(root, name);
            mkdirSync(path.dirname(file), { recursive: true });
            writeFileSync(file, 'fixture');
        }
        assert.deepEqual(sourceFiles(root).map(file => path.relative(root, file).split(path.sep).join('/')).sort(), source.sort());
    } finally { rmSync(root, { recursive: true, force: true }); }
});
