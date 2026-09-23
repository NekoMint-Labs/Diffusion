# Local storage and migrations

`src/storage/dexie.ts` retains the database name `diffusion-explorer-v1`. Changing it for branding would strand prior projects. The current **Dexie database version is 3**; the existing `projects` and `originals` tables remain. Portable project `schemaVersion: 1` remains compatible; it is not the IndexedDB version.

The v1-to-v2 `Version.upgrade` transaction still calls the pure, idempotent `migrateProjectV2` function. Phase 3A adds a v2-to-v3 normalization through `migrateProjectV3`: projects that predate structured ingestion receive an empty `inputs` record, while new projects can durably store exact authored `InputRecord` text before AI decomposition. Loading/importing also normalizes missing `inputs`, so old portable archives remain readable after the database has upgraded. Invalid records must cause an explicit error/rollback, not database deletion or silent replacement. No reset, clean, migration-to-empty or database rename is used.

Migration preserves project/Thought/Source IDs, user wording, geometry, camera, Crystals, relations, history and original references. Original file blobs stay in their table. Existing attention phases seed bounded attention debt rather than being recomputed from elapsed time. Reopening after days therefore does not cause ordinary Thoughts to disappear into Memory.

Legacy Threads have no historical wording snapshot to recover. Their available current scope wording becomes a best-effort frozen snapshot during upgrade; the migration cannot reconstruct wording that was never stored. New Threads freeze wording at creation and only add new selected scope explicitly.

Legacy URL Source excerpts without a real read record are preserved as `discoverySnippet`, removed from AI evidence excerpts, and marked honestly Limited. This intentionally downgrades an unsupported old claim of reading; it does not delete the discovered text. Actual new read records retain their passages, locators, timestamps and provider provenance.

`ProjectController` schedules one in-flight save plus the most recent pending snapshot. Later edits are not lost behind an old snapshot; explicit flush/retry and failure state remain visible. This is not a cross-tab concurrency protocol or a crash-proof OS flush guarantee.

## Verification boundary

Pure migration, idempotence, legacy snippet downgrade, raw-input normalization, geometry preservation, long-downtime and queue tests passed in the offline suite. Two tests in `tests/unit/migrations.test.ts` exercise a real Dexie/fake-IndexedDB v1-to-v3 upgrade and rollback of an invalid upgrade, including raw-input normalization, original blobs and reopen. These two tests are authored but **not run** here because dependencies are unavailable. Native IndexedDB disk timings are likewise not measured.

Before a real upgrade rollout, preserve a portable backup and original files, execute the installed migration tests, then reopen an actual v0.1 database in the target browser/WebView. Do not clear storage to make a failing upgrade appear successful.
