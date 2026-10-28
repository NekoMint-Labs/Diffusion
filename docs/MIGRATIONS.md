# Local storage and migrations

## Optional AI generation origin (PR #83 review fix)

`Thought.generatedBy?: 'ai'` records the explicit Keep of a non-ingestion AI candidate.
It is separate from `origin.projectId/note`: Fork and Bring write those fields for hand-written
content too. Keep creates the marker; Fork, Bring, undo/redo, JSON and Dexie carry it without
inferring new authorship. It is display eligibility, not a factual endorsement or permission.
The optional value is validated as `ai`; malformed values fail normal Thought/project validation.
No database/table/index or portable schema version changes, data rewrite, or model backfill occurs.
Unmarked legacy generated records remain readable in full, but cannot reliably regain generation
eligibility from provenance prose, even when a saved proposition is present. Both records remain
stored; no text or proposition is discarded. Causal actions alone do not establish AI origin:
hand-written continuations from Crystals also carry them.
Older clients may drop this optional marker on rewriting a project; preservation by old clients is
not guaranteed. See [Fork review acceptance](experiments/FIELD_FORK_READING_REVIEW_20261028.md).

`src/storage/dexie.ts` retains the database name `diffusion-explorer-v1`. Changing it for branding would strand prior projects. The current **Dexie database version is 4**; the existing `projects` and `originals` tables remain. Portable project `schemaVersion: 1` remains compatible; it is not the IndexedDB version.

Version 4 adds an initially empty `deletedProjects` table containing only deleted Field IDs. It does
not rewrite existing projects. An explicitly confirmed deletion atomically removes the project,
records its deleted ID, and removes its original blobs only when no surviving Field references them.
The marker prevents late saves from an old controller or another window from resurrecting the Field.
Restoring a portable export still creates a new ID. Deletion has no Undo; the confirmation offers
export-before-delete guidance. App startup falls back to a surviving Field when its saved active ID
has been deleted. Older builds have not been qualified against the version-4 database.

The v1-to-v2 `Version.upgrade` transaction still calls the pure, idempotent `migrateProjectV2` function. Phase 3A adds a v2-to-v3 normalization through `migrateProjectV3`: projects that predate structured ingestion receive an empty `inputs` record, while new projects can durably store exact authored `InputRecord` text before AI decomposition. Loading/importing also normalizes missing `inputs`, so old portable archives remain readable after the database has upgraded. Invalid records must cause an explicit error/rollback, not database deletion or silent replacement. No reset, clean, migration-to-empty or database rename is used.

Migration preserves project/Thought/Source IDs, user wording, geometry, camera, Crystals, relations, history and original references. Original file blobs stay in their table. Existing attention phases seed bounded attention debt rather than being recomputed from elapsed time. Reopening after days therefore does not cause ordinary Thoughts to disappear into Memory.

Legacy Threads have no historical wording snapshot to recover. Their available current scope wording becomes a best-effort frozen snapshot during upgrade; the migration cannot reconstruct wording that was never stored. New Threads freeze wording at creation and only add new selected scope explicitly.

Legacy URL Source excerpts without a real read record are preserved as `discoverySnippet`, removed from AI evidence excerpts, and marked honestly Limited. This intentionally downgrades an unsupported old claim of reading; it does not delete the discovered text. Actual new read records retain their passages, locators, timestamps and provider provenance.

`ProjectController` schedules one in-flight save plus the most recent pending snapshot. Later edits are not lost behind an old snapshot; explicit flush/retry and failure state remain visible. This is not a cross-tab concurrency protocol or a crash-proof OS flush guarantee.

## Optional organization (Issue #11 acceptance follow-up)

`Thought.organizingParentId` is optional: absence follows the first surviving entry in the recorded
`derivedFrom` order, `null` explicitly makes a root, and a string selects a user-organized parent.
Reparenting never changes `derivedFrom`, `generationAction`, wording, positions or child branches.
The Core user event `thought.reparent` owns validation, authority, history and undo/redo. Deleting an
explicit parent makes its organized children independent; the existing source-reference deletion
policy is unchanged. Missing imported targets project as roots; a legacy cycle loses one stable
display edge without rewriting the archive. New self/descendant/missing-parent changes are rejected.

No database version, database name or portable envelope changes. Existing validation, migration,
JSON export/recovery, snapshot history and Dexie preserve the field. Old projects need no new field.
Nine new hierarchy tests cover chains, branches, source order, invalid cycles, authority, undo/redo,
actual fake-IndexedDB close/reopen, portable import/recovery and a 10,000-node chain. Browser testing
also exercises the shared menu, explicit apply, original-source display and reload. Old application
versions have not been qualified to interpret or preserve the new organization preference.

## Verification boundary

Pure migration, idempotence, legacy snippet downgrade, raw-input normalization, geometry preservation, long-downtime and queue tests are covered by the offline suite. Three tests in `tests/unit/migrations.test.ts` exercise Dexie over fake IndexedDB: v1-to-v4 upgrade and reopen, rollback of an invalid upgrade, and v3-to-v4 preservation of projects and original blobs with an initially empty deletion-marker table. Repository tests also cover shared originals, atomic deletion rollback and rejection of a late save from a second connection after reopen. Browser tests exercise deletion and startup recovery against native IndexedDB in a disposable profile. Native WebView upgrade from a real installed database and disk timings have not been measured.

Before a real upgrade rollout, preserve a portable backup and original files, execute the installed migration tests, then reopen an actual v0.1 database in the target browser/WebView. Do not clear storage to make a failing upgrade appear successful.

## Optional proposition prototype metadata

The opt-in `propositionTrial=1` prototype adds no table or index. Optional Thought display
metadata retains a bounded point and its exact original text. Old records need no backfill.
Import/recovery discards invalid/mismatched optional metadata while retaining all normal
project validation and the original wording; there is no automatic model request. Editing
invalidates the point, and existing snapshot Undo/Redo restores matching records together.
Full text remains export authority. The schemaVersion stays 1 for this optional field; this is
not a guarantee older clients preserve it. Duplicating the bound original increases export size
and does not increase the existing 10 MiB recovery budget. See the
[prototype report](experiments/FIELD_PROPOSITION_READER_TRIAL_20261027.md).
