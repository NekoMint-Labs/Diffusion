import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
const stable = JSON.parse(read('src-tauri/tauri.conf.json'));
const preview = JSON.parse(read('src-tauri/tauri.preview.conf.json'));

test('the Windows preview has its own install identity and opens the packaged Next route', () => {
    assert.equal(stable.identifier, 'app.diffusion.explorer');
    assert.notEqual(preview.identifier, stable.identifier);
    assert.notEqual(preview.productName, stable.productName);
    assert.equal(preview.mainBinaryName, 'diffusion-preview');
    assert.equal(preview.app.windows[0].url, 'next/explore?locale=zh');
    assert.equal(preview.app.windows[0].label, 'main');
    assert.equal(preview.bundle.windows.nsis.installMode, 'currentUser');
    assert.ok(stable.bundle.resources['resources/discovery/']);
    assert.equal(preview.bundle.resources, undefined, 'preview must inherit the bundled engine and license resources');
});

test('every native credential operation uses the app identifier, including model and search reads', () => {
    const store = read('src-tauri/src/credentials.rs');
    assert.match(store, /Entry::new\(&app\.config\(\)\.identifier, id\)/);
    assert.doesNotMatch(store, /const SERVICE/);
    assert.match(store, /entry\(app, id\)\.ok\(\)\?\.get_password/);
    assert.equal((store.match(/entry\(&app, &id\)/g) ?? []).length, 4);
    for (const file of ['src-tauri/src/native_ai.rs', 'src-tauri/src/discovery.rs'])
        assert.match(read(file), /\|id\| read_secret\(&app, id\)/);
});
