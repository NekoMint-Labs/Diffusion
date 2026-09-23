import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('gallery route stays development-only while five reviewed renderers are production choices', () => {
    const main = read('src/main.tsx');
    const appearance = read('src/ui/appearance.ts');
    const pkg = JSON.parse(read('package.json'));
    assert.match(main, /import\.meta\.env\.DEV \? lazy\(\(\) => import\('\.\/dev\/material-gallery\/MaterialGallery\.tsx'\)\) : null/);
    assert.match(main, /location\.pathname === '\/dev\/material-gallery'/);
    assert.match(appearance, /FIELD_STYLE_IDS = \['paper-texture', 'topography', 'threads', 'waves', 'silk'\] as const/);
    for (const dependency of ['@paper-design/shaders-react', 'ogl', 'three', '@react-three/fiber'])
        assert.ok(pkg.dependencies[dependency]);
    assert.ok(pkg.devDependencies['@types/three']);
});

test('gallery still exposes all six candidates through the shared reviewed renderers', () => {
    const gallery = read('src/dev/material-gallery/MaterialGallery.tsx');
    const types = read('src/dev/material-gallery/types.ts');
    const background = read('src/dev/material-gallery/MaterialBackground.tsx');
    assert.match(types, /\['paper', 'topography', 'threads', 'waves', 'perlin', 'silk'\]/);
    for (const name of ['PaperTextureBackground', 'TopographyBackground', 'ThreadsBackground', 'WavesBackground', 'PerlinBackground', 'SilkBackground'])
        assert.match(background, new RegExp(name));
    assert.match(background, /ui\/fieldBackgrounds/);
    assert.doesNotMatch(gallery, /ProjectState|CameraController|Dexie|localStorage|ProjectController/);
    assert.doesNotMatch(gallery + background, /MATERIAL_TILE_OFFSETS|300%/);
});

test('copied renderers carry provenance and implement static motion paths', () => {
    const paths = [
        'src/ui/fieldBackgrounds/vendor/Topography.tsx',
        'src/ui/fieldBackgrounds/vendor/Threads.tsx',
        'src/ui/fieldBackgrounds/vendor/Waves.tsx',
        'src/ui/fieldBackgrounds/vendor/Silk.tsx',
    ];
    const files = paths.map(read);
    for (const source of files) {
        assert.match(source, /9481af758aae6cfb34c3652ec40a1c099360331f/);
        assert.match(source, /REACT_BITS_MATERIALS_LICENSE/);
    }
    assert.match(files[0], /uSpeed\.value as number\) > 0 \? requestAnimationFrame/);
    assert.match(files[1], /if \(speed > 0\) animationFrameId\.current = requestAnimationFrame/);
    assert.match(files[2], /configRef\.current\.motion > 0 \? requestAnimationFrame/);
    assert.match(files[3], /frameloop=\{speed > 0 && visible \? 'always' : 'demand'\}/);
});
