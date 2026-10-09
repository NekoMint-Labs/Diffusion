# Nearby continuation direction follow-up

Base: PR #18 at `f3ee39962b363a1d93f10079923a58bffd41540e`.

When another card blocks the narrow incoming-trajectory lane, the nearby placement search can choose a perpendicular slot even though a safe forward diagonal is available. The existing Phase 2 offline direction assertion fails, and new rightward, leftward and downward unit fixtures each reproduce the regression.

The fix tries two bounded forward detours per existing gap after the original trajectory candidates and before perpendicular semantic fallbacks. The lateral offset uses the source and proposal extents projected onto the trajectory normal, both collision clearances and one extra unit for inclusive touching-edge checks. Original valid nearby trajectory candidates retain priority; viewport containment, Continue reading-control space, collision rules and the crowded-field fallback are unchanged. No canonical content, coordinates, camera or persistence change.

Verification:

- Before repair: three new directional unit fixtures failed; the existing offline Continue direction assertion also failed.
- After repair: all 37 scope-placement tests, 447 complete unit tests and 266 offline contracts passed.
- Application/core types, syntax/imports, locales and source-size gates passed.
- The existing offline assertion and nearby-placement tests retain their original strength. No skips or retries were added.
- Remote CI and Windows/operator acceptance are separate checks; local tests do not assert completion of either.

## Integration into PR #18

The forward-detour candidates are combined with the nearby forward-half-plane search from 3a41daf. Original narrow trajectory slots retain first priority, then bounded detours, then other nearby forward candidates. Side/back placement remains available when no safe nearby forward slot exists. The eight additional regression cases exercise four incoming directions with and without viewport information. Combined-branch validation is recorded separately from the standalone numbers above.

Combined-branch local verification before the main synchronization: 55 files / 455 unit tests, 266 offline contracts and the complete production Playwright suite (304 passed, 12 existing dev-only skipped, zero failures, one worker, zero retries). Types, locale coverage, source-size policy and production build passed. These numbers do not cover the subsequent main synchronization or remote CI.
