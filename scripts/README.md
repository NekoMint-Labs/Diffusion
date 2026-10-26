# Maintained capture and snapshot tools

These commands produce local evidence or source archives. They do not replace the verification
gates in [Testing](../docs/TESTING.md).

## Appearance screenshots

Build the application and start its production preview, then run:

```sh
pnpm run build
pnpm run preview
# In another terminal:
node scripts/capture-appearance.mjs
```

Install Chromium first with `pnpm exec playwright install chromium` if needed. The capture script
uses the declared `@playwright/test` dependency. Its settings are environment variables:

- `CAPTURE_BASE_URL`: preview URL; defaults to `http://127.0.0.1:4173`.
- `CAPTURE_FILTER`: optional substring of the capture name, such as `paper-texture`.
- `CAPTURE_IMAGE`: optional PNG, JPEG or WebP, at most 1,500,000 bytes; relative paths are resolved
  from the repository root. Providing it enables the two Image Atmosphere captures. Without it,
  only captures without an image run. A filter that selects no enabled capture reports an error.

The image is read only when a selected capture needs it. A fresh clone can therefore run ordinary
captures without any earlier files under `verification/`. Output goes to the ignored
`verification/appearance/` directory. Capture files are local evidence; inspect them before making
a visual claim or sharing them.

The older `capture-visual.mjs` is preserved under [historical tools](../docs/history/tools/README.md).

## Source snapshots

With Python 3 and Git available, run:

```sh
python scripts/snapshot.py
# Optional explicit archive name, without an extension:
python scripts/snapshot.py diffusion-review-source
```

The default name is `diffusion-explorer-v<package.json version>-source`. The script exports files
listed in Git's index using their current working-tree bytes, so unstaged edits to tracked files
are included. Deleted files are omitted. New files must be staged with `git add` before they are
included; untracked and ignored local screenshots, logs and other artifacts are not swept into the
archive. Existing exclusions for dependency/build directories, secrets and archive files remain.
The required-source check still rejects an incomplete snapshot.

Archives, SHA-256 files and external verification proofs go to `../delivery/`. A proof copy is also
written under `docs/history/checkpoints/`; it must be staged to become part of a later snapshot.
The archive omits its own same-name proof. Verification checks the ZIP entries, CRC, one root,
exclusions and every extracted file against the working tree. This proves archive integrity, not
application correctness or a successful build.

Snapshots omit `.git`. An extracted source archive therefore cannot generate a new source
snapshot with this tool: use a Git checkout so the tracked-file boundary is available.

The snapshot tests use small temporary Git repositories and write no archive or proof in the
real project:

```sh
python -m unittest discover -s tests/tooling -p 'test_*.py'
```
