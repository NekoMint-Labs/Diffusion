# Diffusion Explorer v0.2.1 - source hardening delivery

**Source implementation and independent checks are complete for this pass. Full application build/integration and native verification remain UNVERIFIED.** Read [the verification record](docs/history/v0.2/V0_2_1_VERIFICATION.md) for exact scope, transcripts and release gates.

## IMPLEMENTED

- One transient menu/surface owner, successor-guarded focus restoration, shared Floating UI focus/dismissal and keyboard ownership. Global dialogs own input; Thread remains non-modal. No z-index-only workaround or new UI dependency.
- Persisted Editorial Serif / Quiet Sans content typography in small bilingual Settings. Chrome remains Sans. Visual preference updates do not change canonical project/camera data, start inference or cancel thinking-service work. Gateway tokens stay memory-only.
- Speak remains compact with its existing visual treatment. Its draft survives modal/menu presentation, and its height resets after clear/submission. Settings headings stay chrome; content/draft prose uses the selected font.
- Worker disposal/transfer cleanup and bounded HTTP stream cleanup; malformed JSON diagnostics do not quote response text. Provider/Core/Evidence architecture is retained.
- Cohesive Speak/keyboard/focus/owner modules and a production source-size guard. No non-exempt handwritten production file above 700 LOC; unchanged Field.tsx (504) is the sole non-exempt >350 LOC exception. Workspace is 327 LOC, down from 367.
- App metadata is 0.2.1; locked dependency resolutions and native security permissions are unchanged. New hardening instructions are bundled without replacing the eleven inherited frozen specifications.

## VERIFIED - this run

- All **95 inherited independent tests still pass**; **115/115 total** after 20 added ownership/preference/extraction/HTTP tests. No failures or skips.
- Static syntax/local-import/JSON checks for 95 TS/TSX files, dependency-free Core typecheck, strict transient-model typecheck and locale check (**332 keys**, no reported gaps).
- **28 real Chromium CSS/camera fixture checks**: 17 inherited primitives + 11 typography/viewport cases. These use actual source/CSS with authored DOM, not the React application.
- Camera/culling scenarios and spatial/storage-model benchmarks at **100 / 500 / 2,000 / 5,000 Thoughts**. No per-frame canonical writes; bounded local/Atlas DOM; coalesced latest-pending writes. Not application FPS or IndexedDB disk performance.
- Source-size guard and rejection of a temporary 701-line probe. Original/hardened HTTP comparison confirms body-text diagnostic redaction.
- Byte preservation: eleven inherited specs, twenty inherited test files and all 37 Core/Field/storage/AI/server files are unchanged; no inherited files were removed. Historical STATUS/README are preserved under `docs/history/`.
- Pre-edit and UI checkpoints verified by CRC/extraction/every-file comparison. Final archive integrity and SHA-256 are reported externally alongside the ZIP, separately from runtime validation.

## UNVERIFIED / environment-blocked

- Full `npm run typecheck` and `npm run build`: missing project `node`/`vite/client` types; registry DNS unavailable and offline cache incomplete.
- `npm test`: project Vitest absent. Two new actual Dexie migration/edit/save/close/reopen/retry tests are authored, not run.
- `npm run test:e2e`: project Playwright test runner absent; the available CLI rejects `test`. Twenty new React browser cases are authored, not run. **Real modal/menu focus, focus return, keyboard handoff and preference persistence in the React app remain release gates.** Chromium itself is available and was used for the narrower fixture checks.
- Native Tauri build and picked-file/source close/reopen flow: Rust/cargo unavailable. No native success claim from static source inspection.
- Live Chat Completions/Responses/custom endpoints, deployed SmartSearch and real credentials were not exercised.

## DEFERRED / retained limitations

- No camera/pointer, Focus, semantic-zoom, Core, database-schema or product redesign. Kinopio/tldraw/AFFiNE mechanics references are not claimed as newly inspected; their gate applies before any later mechanics rewrite.
- PDF/image/Office/audio/video remain honestly Limited where extraction is not implemented. Multi-tab conflict resolution and complete-app large-Field performance are not established.
- Native local originals use retained-copy export where supported, not broad arbitrary-path permission.

## Read next

[Hardening audit](docs/history/v0.2/V0_2_1_HARDENING_AUDIT.md) | [Actual reference audit](docs/REFERENCE_AUDIT.md) | [Verification and reproduction](docs/history/v0.2/V0_2_1_VERIFICATION.md) | [Authority order](docs/specs/DIFFUSION_EXPLORER_V0_2_1_INHERITED_AUTHORITY.md)

Earlier results in [the inherited v0.2 status](docs/history/v0.2/STATUS_V0_2_INHERITED.md) are historical, not a substitute for the current checks above. A successful ZIP integrity check does not imply a successful production build.
