"""Exercise snapshot inclusion and proof creation in disposable Git repositories."""
from __future__ import annotations

import hashlib
import importlib.util
import json
import subprocess
import tempfile
import unittest
import zipfile
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "snapshot.py"
SPEC = importlib.util.spec_from_file_location("snapshot", SCRIPT)
snapshot = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(snapshot)


class SnapshotTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name) / "checkout"
        self.root.mkdir()
        self.git("init", "--quiet")
        for name in snapshot.REQUIRED_SOURCE:
            self.write(name, f"Fixture for {name}\n")
        self.write("package.json", json.dumps({"version": "9.8.7-review"}))
        self.write(".gitignore", "verification/\nnode_modules/\n.env\n")
        self.write("src/tracked.txt", "staged bytes\n")
        self.write("src/deleted.txt", "remove from working tree\n")
        self.git("add", "--all")

    def git(self, *arguments: str) -> None:
        subprocess.run(["git", "-C", str(self.root), *arguments], check=True, capture_output=True)

    def write(self, name: str, text: str) -> None:
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(text.encode("utf-8"))

    def test_index_bounds_working_tree_bytes_and_versioned_archive(self) -> None:
        self.write("src/tracked.txt", "unstaged current bytes\n")
        self.write("src/staged-new.txt", "new staged source\n")
        self.git("add", "src/staged-new.txt")
        self.write("src/untracked.txt", "not yet reviewed\n")
        self.write("verification/local.txt", "ignored evidence\n")
        self.write("node_modules/local.txt", "ignored dependency\n")
        self.write(".env", "local secret\n")
        (self.root / "src/deleted.txt").unlink()

        proof = snapshot.create_snapshot(self.root)
        archive = Path(proof["SOURCE_SNAPSHOT"])
        self.assertEqual(archive.name, "diffusion-explorer-v9.8.7-review-source.zip")
        with zipfile.ZipFile(archive) as handle:
            names = set(handle.namelist())
            self.assertEqual(handle.read("diffusion-explorer/src/tracked.txt"), b"unstaged current bytes\n")
            self.assertIn("diffusion-explorer/src/staged-new.txt", names)
            self.assertIn("diffusion-explorer/.env.example", names)
            for excluded in ["src/deleted.txt", "src/untracked.txt", "verification/local.txt",
                             "node_modules/local.txt", ".env", ".git/config"]:
                self.assertNotIn(f"diffusion-explorer/{excluded}", names)
            extracted = Path(self.temporary.name) / "extracted"
            handle.extractall(extracted)

        digest = hashlib.sha256(archive.read_bytes()).hexdigest()
        self.assertEqual(proof["SOURCE_SNAPSHOT_SHA256"], digest)
        self.assertEqual(proof["SOURCE_SNAPSHOT_VERIFIED"], "PASS")
        self.assertEqual(archive.with_suffix(".sha256").read_text(encoding="utf-8"), f"{digest}  {archive.name}\n")
        external_proof = json.loads(archive.with_suffix(".proof.json").read_text(encoding="utf-8"))
        checkpoint = self.root / "docs/history/checkpoints" / archive.with_suffix(".proof.json").name
        self.assertEqual(json.loads(checkpoint.read_text(encoding="utf-8")), external_proof)
        with self.assertRaisesRegex(SystemExit, "Git checkout"):
            snapshot.create_snapshot(extracted / "diffusion-explorer")

    def test_same_name_proof_and_defensive_exclusions_stay_out(self) -> None:
        name = "review-source"
        self.write(f"docs/history/checkpoints/{name}.proof.json", "old same-name proof\n")
        self.write("docs/history/checkpoints/earlier.proof.json", "earlier tracked proof\n")
        self.write(".env.production", "must not archive\n")
        self.write("dist/tracked.txt", "must not archive\n")
        self.git("add", "--all")
        proof = snapshot.create_snapshot(self.root, name)
        with zipfile.ZipFile(proof["SOURCE_SNAPSHOT"]) as handle:
            names = set(handle.namelist())
        self.assertIn("diffusion-explorer/docs/history/checkpoints/earlier.proof.json", names)
        for excluded in [f"docs/history/checkpoints/{name}.proof.json", ".env.production", "dist/tracked.txt"]:
            self.assertNotIn(f"diffusion-explorer/{excluded}", names)

    def test_missing_required_source_fails_before_creating_delivery(self) -> None:
        (self.root / "src/main.tsx").unlink()
        with self.assertRaisesRegex(SystemExit, "Missing required source content: src/main.tsx"):
            snapshot.create_snapshot(self.root)
        self.assertFalse((self.root.parent / "delivery").exists())

    def test_archive_name_cannot_escape_delivery(self) -> None:
        with self.assertRaisesRegex(SystemExit, "Invalid snapshot name"):
            snapshot.create_snapshot(self.root, "../outside")
        self.assertFalse((self.root.parent / "delivery").exists())


if __name__ == "__main__":
    unittest.main()
