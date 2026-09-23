import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ACCENT_IDS, FIELD_STYLE_IDS, STYLE_PROFILE_IDS, DEFAULT_APPEARANCE,
  getAppearancePreset, imageAtmospherePresentation, normalizeAppearanceSettings,
} from '../../src/ui/appearance.ts';
import { deriveAccent } from '../../src/ui/accent.ts';
import { loadSettings, normalizeSettings, saveSettings } from '../../src/ui/settings.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const source = 'data:image/png;base64,AAAA';

test('appearance exposes four independent curated axes', () => {
  assert.deepEqual([...STYLE_PROFILE_IDS], ['editorial-warm', 'studio-slate', 'quiet-forest', 'graphite-night']);
  assert.deepEqual([...FIELD_STYLE_IDS], ['paper-texture', 'topography', 'threads', 'waves', 'silk']);
  assert.deepEqual([...ACCENT_IDS], ['oxide', 'amber', 'moss', 'slate', 'plum', 'custom']);
  assert.equal(DEFAULT_APPEARANCE.profile, 'editorial-warm');
  assert.equal(DEFAULT_APPEARANCE.fieldStyle, 'paper-texture');
  assert.equal(DEFAULT_APPEARANCE.image.source, '');
});

test('appearance normalization is bounded and migrates the old background shape', () => {
  const normalized = normalizeAppearanceSettings({
    profile: 'rainbow', background: 'image', fieldPresence: 999, accent: 'laser', customAccent: 'red',
    image: { source: 'javascript:alert(1)', intensity: 90, softness: -2, desaturation: 4, overlay: 99 },
  });
  assert.equal(normalized.profile, 'editorial-warm');
  assert.equal(normalized.fieldStyle, 'paper-texture');
  assert.equal(normalized.fieldPresence, 100);
  assert.equal(normalized.accent, 'oxide');
  assert.equal(normalized.image.source, '');
  assert.equal(normalized.image.presence, 100);
  assert.equal(normalized.image.softness, 0);
  assert.equal(normalized.image.saturation, 96);
  assert.equal(normalized.image.brightness, 100);
  assert.equal(normalized.background, undefined);
  assert.equal(normalized.image.intensity, undefined);
});

test('appearance settings round-trip through the existing device store and keep the image device-local', () => {
  const store = new Map();
  const previous = globalThis.localStorage;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: key => store.get(key) ?? null,
    setItem: (key, value) => void store.set(key, String(value)),
    removeItem: key => void store.delete(key),
  }});
  try {
    const settings = normalizeSettings({ appearance: {
      profile: 'quiet-forest', fieldStyle: 'waves', fieldPresence: 75, accent: 'moss',
      image: { source, presence: 67, saturation: 61, brightness: 90, softness: 44, themeBlend: 50, dirty: true },
    }});
    assert.equal(saveSettings(settings), true);
    const restored = loadSettings().appearance;
    assert.equal(restored.profile, 'quiet-forest');
    assert.equal(restored.fieldStyle, 'waves');
    assert.equal(restored.fieldPresence, 75);
    assert.equal(restored.accent, 'moss');
    assert.equal(restored.image.source, source);
    assert.equal(restored.image.presence, 67);
    assert.equal(restored.image.dirty, true);
  } finally {
    if (previous === undefined) delete globalThis.localStorage;
    else Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: previous });
  }
});

test('every Theme × Field Style preset and custom Accent stays bounded', () => {
  for (const profile of STYLE_PROFILE_IDS) for (const fieldStyle of FIELD_STYLE_IDS) {
    const preset = getAppearancePreset(profile, fieldStyle);
    for (const value of [preset.fieldPresence, ...Object.values(preset.image)]) assert.ok(value >= 0 && value <= 100);
  }
  const neon = deriveAccent('graphite-night', 'custom', '#00ff00');
  assert.match(neon.attention, /^oklch\(/);
  assert.doesNotMatch(neon.attention, /#00ff00/i);
});

test('image controls map directly while Theme Blend remains bounded', () => {
  const presentation = imageAtmospherePresentation({ source, presence: 100, saturation: 80, brightness: 90, softness: 60, themeBlend: 100, dirty: false, stats: null });
  assert.equal(presentation.opacity, 1);
  assert.match(presentation.filter, /^saturate\(0\.8\) brightness\(0\.9\) blur\(5\.00px\)$/);
  assert.ok(presentation.scale > 1 && presentation.scale < 1.1);
  assert.ok(presentation.toneOpacity > .5 && presentation.toneOpacity < 1);
});

test('Field Style and Image Atmosphere are independent presentation axes', () => {
  const hook = read('src/ui/workspace/useWorkspaceSettings.ts');
  const atmosphere = read('src/ui/atmosphere.tsx');
  const materials = read('src/ui/materials.css');
  assert.match(hook, /dataset\.fieldStyle = appearance\.fieldStyle/);
  assert.match(hook, /dataset\.imageAtmosphere = appearance\.image\.source/);
  assert.match(atmosphere, /const activeImage = image\?\.source/);
  assert.match(materials, /data-image-atmosphere="true"[\s\S]*--thought-image-material/);
});

test('Settings owns appearance persistence and the project model does not', () => {
  const settings = read('src/ui/settings.ts');
  const model = read('src/core/model.ts');
  assert.match(settings, /appearance:\s*AppearanceSettings/);
  assert.match(settings, /normalizeAppearanceSettings\(raw\.appearance\)/);
  assert.doesNotMatch(model, /StyleProfile|FieldStyle|ImageAtmosphere|fieldPresence|customAccent/);
});

test('appearance UI stays curated rather than exposing implementation controls', () => {
  const ui = read('src/ui/surfaces/AppearanceSettings.tsx');
        for (const label of ['Theme', 'Field Style', 'Field Presence', 'Ambient Motion', 'Accent', 'Image Atmosphere', 'Presence', 'Saturation', 'Brightness', 'Softness', 'Theme Blend']) assert.match(ui, new RegExp(`msg\\('${label}'\\)`));
  assert.doesNotMatch(ui, /blur px|filter frequency|filament count|gradient editor/i);
});
