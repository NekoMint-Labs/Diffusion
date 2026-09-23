"""Ownership: what this engine reads, writes, and depends on.

Four properties are asserted here because they are the point of the extraction:

* it reads only the environment variables the native launcher allowlists, so no
  other variable can influence a search;
* it mentions the upstream project nowhere in its code, only in provenance;
* it has no configuration file and creates nothing on disk, so a credential
  cannot be persisted by the engine and a preference cannot be picked up from a
  file the person did not choose in Diffusion;
* the source set and its order are exactly what the product exposes.
"""

import contextlib
import io
import os
import pathlib
import re
import tempfile
import unittest
from unittest import mock

from diffusion_discovery import cli
from diffusion_discovery.providers.registry import default_registry

ENGINE_ROOT = pathlib.Path(__file__).resolve().parents[1]
PACKAGE = ENGINE_ROOT / "diffusion_discovery"
ALLOWED_ENV_PREFIXES = ("EXA_", "TAVILY_", "BRAVE_", "JINA_")


def package_sources():
    return sorted(path for path in PACKAGE.rglob("*.py") if "__pycache__" not in path.parts)


class EnvironmentBoundaryTests(unittest.TestCase):
    def test_the_engine_reads_only_the_variables_the_launcher_allowlists(self):
        names = set()
        for path in package_sources():
            names.update(re.findall(r'(?:_text|os\.getenv)\(\s*"([A-Z0-9_]+)"', path.read_text(encoding="utf-8")))
        self.assertTrue(names, "expected the engine to read its credentials from the environment")
        for name in sorted(names):
            self.assertTrue(name.startswith(ALLOWED_ENV_PREFIXES), f"{name} is outside the launcher's allowlist")

    def test_the_engine_code_names_the_upstream_project_nowhere(self):
        for path in package_sources():
            text = path.read_text(encoding="utf-8")
            self.assertNotIn("smart_search", text, str(path))
            self.assertNotIn("smart-search", text, str(path))
            self.assertNotIn("SMART_SEARCH_", text, str(path))

    def test_provenance_records_the_exact_source_it_came_from(self):
        text = (ENGINE_ROOT / "PROVENANCE.md").read_text(encoding="utf-8")
        self.assertIn("a6e310d8c51d1fb9eb454d27afbbc3f81cc2e61a", text)
        self.assertIn("v1.0.3", text)
        self.assertIn("independently maintained", text)


class NoPersistenceTests(unittest.TestCase):
    def test_the_settings_object_has_no_configuration_file(self):
        from diffusion_discovery.config import config
        for name in ("config_file", "config_dir", "set_config_value", "set_config_values", "unset_config_value", "refresh", "snapshot"):
            self.assertFalse(hasattr(config, name), name)

    def test_a_search_creates_nothing_on_disk(self):
        with tempfile.TemporaryDirectory() as home:
            env = {"HOME": home, "XDG_CONFIG_HOME": home, "APPDATA": home, "LOCALAPPDATA": home}
            out = io.StringIO()
            with mock.patch.dict(os.environ, env, clear=True):
                with contextlib.redirect_stdout(out):
                    code = cli.main(["search", "--format", "json", "--", "a query"])
            self.assertEqual(code, 3)
            self.assertEqual(list(pathlib.Path(home).rglob("*")), [])


class SourceSetTests(unittest.TestCase):
    def test_the_source_set_and_its_order_are_what_the_product_exposes(self):
        keys = {"BRAVE_API_KEY": "b", "EXA_API_KEY": "e", "TAVILY_API_KEY": "t"}
        with mock.patch.dict(os.environ, keys, clear=True):
            self.assertEqual(default_registry().search_ids, ("brave", "exa", "tavily"))
            self.assertEqual(default_registry().reader_ids, ("jina", "exa"))

    def test_a_source_without_a_credential_is_absent_rather_than_broken(self):
        with mock.patch.dict(os.environ, {}, clear=True):
            self.assertEqual(default_registry().search_ids, ())
            self.assertEqual(default_registry().reader_ids, ("jina",))

    def test_a_disabled_source_is_absent_even_when_it_has_a_credential(self):
        env = {"EXA_API_KEY": "e", "EXA_ENABLED": "false", "TAVILY_API_KEY": "t", "TAVILY_ENABLED": "true"}
        with mock.patch.dict(os.environ, env, clear=True):
            self.assertEqual(default_registry().search_ids, ("tavily",))

    def test_an_unreadable_enable_flag_turns_a_source_off_instead_of_raising(self):
        with mock.patch.dict(os.environ, {"EXA_API_KEY": "e", "EXA_ENABLED": "maybe"}, clear=True):
            self.assertEqual(default_registry().search_ids, ())

    def test_the_anonymous_reader_is_the_default_way_to_read_a_page(self):
        with mock.patch.dict(os.environ, {}, clear=True):
            self.assertEqual(default_registry().reader_ids, ("jina",))


if __name__ == "__main__":
    unittest.main()
