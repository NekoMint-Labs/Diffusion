/** Physical LOC is a review signal, not a reason to minify or fragment modules. */
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const extensions = new Set(['.ts', '.tsx', '.css', '.rs']);
const exceptions = new Map([
  ['src/locales/zh.ts', 'Static localization dictionary; no application logic.'],
]);
const retained = new Map([
  ['src/field/Field.tsx', 'Inherited spatial interaction engine. It keeps the gesture object, pointer capture, CameraController, rAF coalescing, the grid index, culling and the direct world transforms as one cohesive machine, because they share a single frame loop and coordinate system. Pointer/context-target classification now lives in src/field/spatial/pointerTarget.ts and relation presentation description in src/field/phenomena/describe.ts, so only the interaction engine remains here. A cosmetic split would fragment the hot path; any future split should follow a real responsibility boundary and be protected by dependency-backed application tests.'],
  ['src/ui/surfaces/surfaces.css', 'The single owner of every application surface: the shell, its anatomy, Settings, the command menu and palette, History, Thread, lists, notices and status lines. It is organized by family with comment headers. Splitting it per surface would scatter the shared shell contract (layer order, one header/body/actions rhythm, one close affordance, the focused-document measure) that every surface derives from, which is the property that keeps them looking like one product rather than several. The Field deliberately does not live here: `src/ui/field.css` owns it, and each is now well under the review threshold.'],
  ['src/ui/Workspace.tsx', 'The composition root. It owns which place is open, the surface table, the WorldController and AIRuntime wiring, action-preview and Diffuse/Organize setup, and the single `commands` array that every surface and the keyboard read. That array is why it is still one module: a command is projected into the Scope Hub, the menus, the palette and the keyboard from one place, so splitting the construction away from its projection would let those four drift apart. A future split should follow a real boundary rather than a line count — move the Diffuse/Organize setup into the thinking-intents hook that already owns the rest of that lifecycle and leave the composition here.'],
  ['src/ui/motion/signature.ts', 'The authored-sequence layer. GSAP is imported by this module and by nothing else, so the whole choreography vocabulary — the shared CustomEase roles and every sequence that is meant to be watched — stays in one readable place instead of being scattered as one-off tweens. Splitting it would separate the single-import invariant from the sequences it protects, which is exactly the drift the invariant exists to prevent.'],
  ['src/dev/MotionLab.tsx', 'Development-only design environment. It is guarded by `import.meta.env.DEV` in `src/main.tsx`, so it contributes zero bytes to a production bundle, but it must render every scenario and both toggles in one comparable surface, which is what the sidebar plus the scenario switch costs. It is not application code and is never shipped.'],
  ['src-tauri/src/ai_request.rs', 'Diffusion\u2019s native provider transport, and the only place a plaintext AI credential exists. The request path is a single ordered gate — provider host table, URL scheme and host, header allowlist, credential injection, bounded body, timeout, cancellation — checked in that order, so a split would separate the rules from the one place they are enforced, which is the property the boundary depends on. The remainder is that gate\u2019s own tests, which have to live beside it: the module carries no Tauri dependency precisely so it can be compiled and run on its own, and a private module of this crate cannot be reached from an integration test outside it.'],
]);
function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(file);
    return entry.isFile() && extensions.has(path.extname(file)) ? [file] : [];
  });
}
const files = ['src', 'server', 'src-tauri/src'].flatMap(name => walk(path.join(root, name)))
  .map(file => {
    const name = path.relative(root, file).split(path.sep).join('/');
    const text = readFileSync(file, 'utf8');
    return { path: name, lines: text ? text.split('\n').length - (text.endsWith('\n') ? 1 : 0) : 0,
      bytes: Buffer.byteLength(text), exception: exceptions.get(name) };
  });
const production = files.filter(file => !file.exception).sort((a, b) => b.lines - a.lines || a.path.localeCompare(b.path));
const oversized = production.filter(file => file.lines > 700);
const review = production.filter(file => file.lines > 350).map(file => ({ ...file, reason: retained.get(file.path) ?? 'Responsibility review required.' }));
console.log(JSON.stringify({
  scope: 'Handwritten production TS/TSX/CSS/Rust; physical LOC including comments/blanks. Tests, generated lockfiles and static localization are excluded. No source is minified to pass this check.',
  thresholds: { review: 350, normallySplit: 500, maximum: 700 },
  largest: production.slice(0, 12), review, exceptions: files.filter(file => file.exception),
  result: oversized.length ? 'FAIL' : 'PASS',
}, null, 2));
if (oversized.length) process.exitCode = 1;
