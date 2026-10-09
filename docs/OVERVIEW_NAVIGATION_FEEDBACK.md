# Overview navigation and connection feedback

Follow-up to [the PR #29 review](https://github.com/NekoMint-Labs/Diffusion/pull/29#issuecomment-6071956768), under #11. Based on #29 `4429ccc`; this does not update #29 or the stacked #30 source branch.

## Classification

- **Existing overview-list lifecycle defect:** opening the review reserves a larger bottom dock, changes viewport culling and can remove or replace the very candidates being reviewed. The notice can disappear, or the intended entry can disappear while the list remains. `RootReview` and its parent mount condition were unchanged between main `4191bb0` and #29. A controlled 900×640, 20% zoom fixture reproduced the missing target on original main in light mode. Its dark comparison hit a Chromium GPU launch failure and is not counted as product evidence. A descendant-edge fixture failed in both themes on #29 before repair. This explains a concrete no-result path; it does not establish that every reported native-desktop case has the same cause.
- **Existing line visibility with insufficient explanation/readability:** main already used a .24 resting opacity plus translucent ink for confirmed semantic traces, .6 under attention, and Local-only semantic visibility with visible endpoints. Hierarchy routes already use depth styles and arrows, omit hidden endpoints and obstructed routes, and remain separate from semantic relations. #29 did not change these definitions.
- **Confirmed decision:** ordinary wheel zoom changes magnification only; branch folds remain explicit. Field Management, Settings and general UI work remain separate.

## Repair

An open overview review retains its candidate IDs until close or navigation, reads live wording and removes deleted IDs. Opening resets the filter and focuses search; empty results have an explanation; Escape and locating restore keyboard ownership. Choosing an entry keeps zoom and canonical coordinates while selecting and revealing the target.

The compact connection key follows the Field heading, is reserved by existing safe-area/overlay calculations, and does not reduce the canvas through a permanent bottom lane. Parent arrows keep their depth styles. Confirmed semantic traces retain neutral ink, no arrow and the existing focus hierarchy, with a 1.4px screen-space stroke, .48 resting opacity and .85 under attention. Neighborhood/Atlas explicitly explain that semantic relations require zooming in. No relation, schema, provider, persistence or native contract changes.

## Verification boundaries

Local Windows checks use the existing dependency-backed Node 22.22.2 toolchain. Direct TypeScript/Vite/Vitest/Playwright CLIs are equivalents of the package scripts; the Windows Playwright launcher changes the preview port to 4179 and keeps one worker and zero retries. Offline tests retain `NODE_OPTIONS=--no-experimental-global-navigator`.

The initial 10 mounted cases passed. A subsequent full run diagnosed a permanent-dock layout regression and resource failures (Node heap/GPU/insufficient resources); it stopped at case 186 of 298 and is not a full-suite pass. The key was moved to the heading and the unchanged viewport-edge assertions are retained. Original logs remain under ignored `verification/`.

Final application/Core typechecks, syntax/imports, 943 locale keys, source-size gate, 347 unit tests and production build passed. The 266 offline contracts passed after replacing the obsolete exact-opacity check with the intended readable-rest/stronger-attention contract. The original unit run had one random adjacent-port failure; its unchanged seven-case file passed in isolation, followed by the complete 347-pass run.

The final heading-key build passed all 30 mounted cases in `overviewNavigation`, `fieldOverlays`, `fieldConvergence` and `fieldCreation`: one worker, zero retries. Unchanged edge-menu/creation, generation-overlay, subtree and Keep assertions passed. Final light/dark screenshots were inspected. This targeted pass does not replace the complete remote E2E gate.

Tracked `overviewNavigation.spec.ts` covers both themes, six edge candidates in a small window, sparse/dense search, empty results, keyboard restoration, navigation after Find closes, preserved zoom/coordinates, line roles and zoom visibility without relation-data loss. It captures fixed-size mounted screenshots in the normal Playwright diagnostic artifact. Browser fixtures and screenshots are not WebView2/operator acceptance.

## Integration recommendation

No #29-specific blocker has been established by these controlled checks. #29 can proceed to independent maintainer review with Option 2 recorded; this focused follow-up should be reviewed under #11. Both #29 and #30 current-head CI and complete E2E were rechecked successfully. After #29 merges, align #30 and this follow-up to latest main, inspect the resulting narrow diffs, and rerun CI. No merge or issue closure is performed here; the repaired native-desktop workflow still needs operator acceptance.
