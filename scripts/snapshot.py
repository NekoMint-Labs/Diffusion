#!/usr/bin/env python3
"""Archive real source, independently verify it, then record an external proof.

A snapshot hash cannot be embedded in its own archive. The current same-name
proof is omitted; proofs of earlier archives remain in the source history.
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
import tempfile
import zipfile
from datetime import datetime, timezone
from pathlib import Path


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    name = sys.argv[1] if len(sys.argv) > 1 else "diffusion-explorer-v0.2.6-source"
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,120}", name):
        raise SystemExit("Invalid snapshot name; use a plain filename without directories")

    output = root.parent / "delivery"
    output.mkdir(exist_ok=True)
    archive = output / f"{name}.zip"
    proof_name = f"{name}.proof.json"
    excluded_dirs = {
        "node_modules", ".git", "dist", "target", "test-results",
        "playwright-report", "__pycache__", ".tmp", "coverage", ".cache", ".vite",
    }
    files: list[Path] = []
    for path in sorted(root.rglob("*")):
        if not path.is_file() or path.is_symlink():
            continue
        relative = path.relative_to(root)
        if any(part in excluded_dirs for part in relative.parts):
            continue
        if path.suffix in {".zip", ".log", ".pyc", ".tsbuildinfo"}:
            continue
        if path.name in {".DS_Store", proof_name}:
            continue
        if path.name.startswith(".env") and path.name != ".env.example":
            continue
        files.append(path)

    required = [
        "package.json", "README.md", "STATUS.md", ".env.example",
        "tsconfig.json", "src/main.tsx", "src/core/reducer.ts",
        "src-tauri/tauri.conf.json", "server/app.ts",
        "docs/history/v0.2/V0_2_AUDIT.md", "docs/REFERENCE_AUDIT.md",
        "src/shared/i18n.ts", "src/locales/zh.ts", "src/storage/migrations.ts",
        "src/ui/thread/ThreadSurface.tsx", "src/evidence/pipeline.ts",
        "tests/offline/v02.test.mjs", "tests/e2e/redesign.spec.ts",
        "internal/discovery-engine/PROVENANCE.md", "internal/discovery-engine/diffusion_discovery/cli.py",
        "internal/discovery-engine/diffusion_discovery/core/retrieval.py", "tests/offline/discovery-contract.test.mjs",
        "docs/history/v0.2/V0_2_1_HARDENING_AUDIT.md",
        "docs/history/v0.2/V0_2_1_VERIFICATION.md", "src/ui/transient.ts",
        "src/ui/workspace/Speak.tsx", "src/ui/workspace/useTransientFocus.ts",
        "src/ui/workspace/useWorkspaceKeyboard.ts", "tests/e2e/hardening.spec.ts",
        "tests/offline/v021-ui.test.mjs", "tests/offline/v021-boundaries.test.mjs",
        "scripts/check-source-size.mjs",
        "docs/history/v0.2/V0_2_2_FRONTEND_AUDIT.md", "docs/history/v0.2/V0_2_2_MOTION_CONTRACT.md",
        "docs/history/v0.2/V0_2_2_VERIFICATION.md", "tests/offline/v022-frontend.test.mjs",
        "tests/primitives/typography.py",
        "docs/history/prompts/POWERFUL_AI_DIFFUSION_V0_2_2_FRONTEND_REFINEMENT_PROMPT_EN.md",
        "docs/history/prompts/POWERFUL_AI_DIFFUSION_V0_2_1_HARDENING_PROMPT_EN.md",
        "docs/history/v0.2/DIFFUSION_EXPLORER_V0_2_1_INHERITED_AUTHORITY.md",
        "docs/history/v0.2/V0_2_3_IDENTITY_AUDIT.md", "docs/history/v0.2/V0_2_3_VERIFICATION.md",
        "docs/history/prompts/POWERFUL_AI_DIFFUSION_V0_2_3_IDENTITY_PASS_EN.md",
        "tests/offline/v023-identity.test.mjs", "tests/primitives/run.py",
        "docs/history/v0.2/V0_2_4_SIGNATURE_INTERACTION_AUDIT.md", "docs/history/v0.2/V0_2_4_VERIFICATION.md",
        "docs/history/prompts/POWERFUL_AI_DIFFUSION_V0_2_4_SIGNATURE_INTERACTION_PASS_EN.md",
        "tests/offline/v024-signature.test.mjs",
        "docs/history/v0.2/V0_2_5_MOTION_REUSE_AUDIT.md", "docs/history/v0.2/V0_2_5_VERIFICATION.md",
        "docs/history/prompts/POWERFUL_AI_DIFFUSION_V0_2_5_REUSE_FIRST_MOTION_REPAIR_EN.md",
        "tests/offline/v025-motion-reuse.test.mjs",
        "src/ui/motion/TransientTextPresence.tsx",
        "docs/history/v0.2/V0_2_6_INTERACTION_VISIBILITY_AUDIT.md", "src/ui/scope/ScopeHub.tsx",
        "src/ui/scope/scopePlacement.ts", "tests/unit/scopePlacement.test.ts",
    ]
    relative_names = {path.relative_to(root).as_posix() for path in files}
    for relative in required:
        if relative not in relative_names:
            raise SystemExit(f"Missing required source content: {relative}")
    if not any(name.startswith("tests/") for name in relative_names):
        raise SystemExit("Tests are missing from the source tree")

    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as handle:
        for path in files:
            handle.write(path, Path("diffusion-explorer") / path.relative_to(root))
    with zipfile.ZipFile(archive) as handle:
        if handle.testzip() is not None:
            raise RuntimeError("ZIP CRC verification failed")
        names = handle.namelist()
        if len(names) != len(files) or len(set(names)) != len(names):
            raise RuntimeError("Archive contains missing or duplicate entries")
        if any(not name.startswith("diffusion-explorer/") for name in names):
            raise RuntimeError("Unexpected archive root")
        if any("/node_modules/" in name or "/.git/" in name or name.endswith("/.env") for name in names):
            raise RuntimeError("Excluded content found in archive")
        with tempfile.TemporaryDirectory() as temporary:
            handle.extractall(temporary)
            for path in files:
                recovered = Path(temporary) / "diffusion-explorer" / path.relative_to(root)
                if recovered.read_bytes() != path.read_bytes():
                    raise RuntimeError(f"Extracted bytes differ: {path.relative_to(root)}")

    sha256 = hashlib.sha256(archive.read_bytes()).hexdigest()
    proof = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "SOURCE_SNAPSHOT": str(archive),
        "SOURCE_SNAPSHOT_SHA256": sha256,
        "SOURCE_SNAPSHOT_VERIFIED": "PASS",
        "SOURCE_ROOT": str(root),
        "files": len(files),
        "bytes": archive.stat().st_size,
        "CONTENTS_CHECK": required + ["src/", "tests/", "docs/history/checkpoints/"],
        "VERIFICATION": "ZIP list, CRC, single root, exclusions, extraction and every-file byte comparison",
        "NOTE": "Archive verification only. Runtime/build verification is separate in STATUS.md.",
    }
    text = json.dumps(proof, indent=2) + "\n"
    (output / f"{name}.sha256").write_text(f"{sha256}  {archive.name}\n", encoding="utf-8")
    (output / proof_name).write_text(text, encoding="utf-8")
    (root / "docs" / "history" / "checkpoints").mkdir(parents=True, exist_ok=True)
    (root / "docs" / "history" / "checkpoints" / proof_name).write_text(text, encoding="utf-8")
    print(text)


if __name__ == "__main__":
    main()
