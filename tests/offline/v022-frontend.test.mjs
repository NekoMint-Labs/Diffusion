import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { MOTION_DURATION, placementOffset, placementOrigin, surfaceTransition } from '../../src/ui/motion.ts';

const read = path => fs.readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('v0.2.2 motion roles stay small, directional, and reducible to zero', () => {
    assert.equal(placementOrigin('bottom-end'), 'right top');
    assert.equal(placementOrigin('left-start'), 'right top');
    assert.deepEqual(placementOffset('right-start', 4), { x: -4, y: 0 });
    assert.deepEqual(placementOffset('top', 3), { x: 0, y: 3 });
    assert.equal(surfaceTransition(false).duration, MOTION_DURATION.surface);
    assert.equal(surfaceTransition(true).duration, 0);
});

test('More -> Settings preserves exclusive ownership while moving to its global-control home', () => {
    const workspace = read('src/ui/Workspace.tsx');
    const app = read('src/ui/commands/app.ts');
    const compose = read('src/ui/commands/compose.ts');
    const settings = read('src/ui/surfaces/SettingsSurface.tsx');
    // The surface shell moved out of field.css into surfaces.css; the geometry contract is unchanged.
    const css = read('src/ui/surfaces/surfaces.css');
    assert.match(workspace, /const globalMore = useRef<HTMLButtonElement>\(null\)/);
    // v0.3: the activated command row centre is the origin, for every presentation.
    assert.match(app, /id: 'settings'[\s\S]*openSurface\('settings', origin\)/);
    assert.match(compose, /run: origin => command\.run\(context, origin\)/);
    assert.doesNotMatch(workspace, /<SettingsSurface[^>]*anchor=/);
    assert.doesNotMatch(settings, /anchor=/);
    // v0.3.1: Settings stopped being a top-right panel and became a dedicated centred place.
    // Ownership is unchanged; only the surface class and its geometry moved.
    assert.match(settings, /level="window"/);
    assert.match(css, /\.surface\.window \{[^}]*top: 50%[^}]*left: 50%/);
    assert.match(css, /\.surface\.anchored \{ top: 85px; right: 30px; width: min\(420px/);
});

test('floating positioning and visual motion are separated for command menus', () => {
    const menu = read('src/ui/focus/CommandMenu.tsx');
    // v0.4: Base UI owns placement, collision avoidance and popup lifecycle; Diffusion keeps the
    // one animated popup, one positioner class, and the one transient owner that closes it.
    assert.match(menu, /className="command-menu-positioner"/);
    assert.match(menu, /anchor=\{anchorProp\}/);
    assert.match(menu, /positionMethod="fixed"/);
    assert.match(menu, /collisionAvoidance=\{\{ side: 'flip', align: 'shift', fallbackAxisSide: 'none' \}\}/);
    // A menu is a bounded projection, not a dialog: it must not render a modal layer that absorbs
    // the outside press, and it must not become a second focus-restoration authority.
    assert.match(menu, /<Menu\.Root open=\{present\} modal=\{false\}/);
    assert.match(menu, /<Menu\.Popup finalFocus=\{false\} render=/);
    assert.match(menu, /exit=\{\{ \.\.\.EXIT_UNOWNED/);
    // A pointer menu is the same family: a virtual anchor, never a second overlay implementation.
    assert.match(menu, /getBoundingClientRect: \(\) => new DOMRect\(point\.x, point\.y, 1, 1\)/);
});

test('frontend refinement keeps Thought geometry plain and removes prohibited visual shortcuts', () => {
    const css = read('src/ui/field.css');
    const thoughtRules = css.match(/\.thought[^{]*\{[^}]*\}/g)?.join('\n') ?? '';
    assert.doesNotMatch(thoughtRules, /gradient\(/i);
    assert.doesNotMatch(css, /transition\s*:\s*all/i);
    assert.match(css, /\.thought \{[^}]*opacity: 1/s);
    assert.match(css, /\.thought\[data-selected="true"\] \{[^}]*--thought-ink-presence: 1/s);
    assert.doesNotMatch(css, /\.thought\[data-selected="true"\][^{]*\{[^}]*background/s);
    const view = read('src/ui/thought/ThoughtView.tsx');
    assert.doesNotMatch(css, /@keyframes\s+(ink-arrive|recall-arrive)/);
    assert.match(view, /TransientTextPresence/);
});

test('Settings stays small and locale-complete after calmer labels', () => {
    const settings = read('src/ui/surfaces/SettingsSurface.tsx');
    const ai = read('src/ui/surfaces/AISettings.tsx');
    const zh = read('src/locales/zh.ts');
    for (const label of ['Language', 'Appearance', 'Thought typography']) assert.ok(settings.includes(`msg('${label}')`));
    assert.ok(ai.includes("msg('AI')"), 'the AI section keeps its own label');
    assert.match(zh, /"Appearance":/);
    assert.match(zh, /"About":/);
});
