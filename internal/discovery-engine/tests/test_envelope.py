"""The envelope, the exit codes, and what must never appear in either.

This is the boundary Diffusion reads. It is narrow on purpose: one envelope per
operation, a classification instead of a transcript, and no credential anywhere
in the output even when an upstream message, a candidate title or a snippet
carries one verbatim.
"""

import asyncio
import contextlib
import io
import json
import os
import unittest
from unittest import mock

from diffusion_discovery import cli
from tests.fakes import FakeSearch, bad, candidate, ok, registry


def run_main(argv, env=None):
    """Run the engine in-process and return its exit code and parsed envelope."""
    out = io.StringIO()
    with mock.patch.dict(os.environ, env or {}, clear=True):
        with contextlib.redirect_stdout(out):
            code = cli.main(argv)
    return code, json.loads(out.getvalue())


class ArgumentContractTests(unittest.TestCase):
    """The two shapes the native launcher is allowed to send."""

    def test_the_search_and_read_argument_shapes_are_exactly_these(self):
        parser = cli.build_parser()
        search = parser.parse_args(["search", "--mode", "research", "--format", "json", "--", "--help ; echo SECRET"])
        self.assertEqual(search.operation, "search")
        self.assertEqual(search.query, "--help ; echo SECRET")
        self.assertEqual(search.mode, "research")
        read = parser.parse_args(["read", "--max-chars", "50000", "--format", "json", "--", "https://a.example/p"])
        self.assertEqual(read.operation, "read")
        self.assertEqual(read.url, "https://a.example/p")
        self.assertEqual(read.max_chars, 50_000)

    def test_a_query_that_looks_like_a_flag_stays_a_query(self):
        code, payload = run_main(["search", "--format", "json", "--", "--help ; echo SECRET"])
        self.assertEqual(payload["operation"], "search")
        self.assertEqual(payload["error"]["code"], "CONFIGURATION_ERROR")
        self.assertNotIn("SECRET", json.dumps(payload))


class EnvelopeFailureTests(unittest.TestCase):
    def test_a_missing_query_is_an_envelope_and_not_a_usage_dump(self):
        code, payload = run_main(["search"])
        self.assertEqual(code, 2)
        self.assertEqual(payload["operation"], "search")
        self.assertEqual(payload["status"], "failed")
        self.assertEqual(payload["error"]["code"], "INVALID_ARGUMENT")
        self.assertEqual(payload["error"]["message"], "a required argument is missing")
        self.assertEqual(payload["error"]["details"], {"operation": "search"})
        self.assertEqual(payload["attempts"], [])

    def test_an_unparseable_command_is_still_an_envelope(self):
        code, payload = run_main([])
        self.assertEqual(code, 2)
        self.assertEqual(payload["operation"], "unknown")
        self.assertEqual(payload["error"]["code"], "INVALID_ARGUMENT")

    def test_an_unknown_mode_is_reported_without_echoing_the_token(self):
        code, payload = run_main(["search", "--mode", "deep", "q"])
        self.assertEqual(code, 2)
        self.assertEqual(payload["error"]["message"], "invalid command or arguments")
        self.assertNotIn("deep", json.dumps(payload))

    def test_an_unexpected_failure_is_internal_and_hides_its_own_text(self):
        with mock.patch.object(cli, "core_search", side_effect=RuntimeError("PRIVATE /home/someone/path")):
            code, payload = run_main(["search", "--format", "json", "--", "q"])
        self.assertEqual(code, 5)
        self.assertEqual(payload["status"], "failed")
        self.assertEqual(payload["error"]["code"], "INTERNAL_ERROR")
        self.assertNotIn("PRIVATE", json.dumps(payload))
        self.assertNotIn("path", json.dumps(payload))


class EnvelopeShapeTests(unittest.IsolatedAsyncioTestCase):
    async def test_the_envelope_has_exactly_the_agreed_top_level_keys(self):
        payload = await cli.run_search("q", registry=registry(FakeSearch("exa", ok())))
        self.assertEqual(set(payload), {"version", "operation", "status", "data", "attempts", "warnings", "error"})
        self.assertEqual(payload["version"], 1)
        self.assertIn(payload["status"], {"complete", "degraded", "failed"})
        self.assertIsInstance(payload["attempts"], list)
        self.assertIsInstance(payload["warnings"], list)

    async def test_a_search_returns_candidates_and_never_source_content(self):
        exa = FakeSearch("exa", ok({"url": "https://a.example/1", "title": "T", "text": "just a snippet"},
                                   {"url": "https://a.example/2", "title": "U", "text": "second", "content": "a whole page"}))
        payload = await cli.run_search("q", registry=registry(exa))
        self.assertNotIn("evidence", payload["data"])
        item = payload["data"]["candidates"][0]
        self.assertEqual(set(item), {"url", "display_url", "title", "snippet", "providers", "provider_ranks", "rrf_score", "rank"})
        self.assertEqual(item["snippet"], "just a snippet")
        self.assertEqual(item["providers"], ["exa"])
        self.assertEqual(payload["data"]["providers"], ["exa"])

    async def test_an_attempt_carries_a_classification_and_not_a_transcript(self):
        payload = await cli.run_search("q", registry=registry(FakeSearch("exa", bad("rate_limited", "HTTP 429 body=SECRET"))))
        attempt = payload["attempts"][0]
        self.assertEqual(attempt["provider"], "exa")
        self.assertEqual(attempt["role"], "search")
        self.assertEqual(attempt["status"], "failed")
        self.assertEqual(attempt["error_type"], "rate_limited")
        self.assertEqual(attempt["error"], "provider rate limit reached")
        self.assertNotIn("SECRET", json.dumps(payload))

    async def test_a_provider_declaring_an_unknown_error_type_is_rejected_as_a_classified_failure(self):
        payload = await cli.run_search("q", registry=registry(FakeSearch("exa", bad("invented_by_a_provider"))))
        self.assertEqual(payload["status"], "failed")
        self.assertIn(payload["attempts"][0]["error_type"], {"parse_error", "protocol_error"})

    def test_an_attempt_carrying_an_unknown_error_type_is_rewritten_in_the_envelope(self):
        attempt = cli._safe_attempt({"provider": "exa", "role": "search", "status": "failed", "error_type": "invented"})
        self.assertEqual(attempt["error_type"], "protocol_error")
        self.assertEqual(attempt["error"], "provider response violated its protocol")

    def test_an_attempt_that_failed_without_a_classification_is_a_provider_error(self):
        attempt = cli._safe_attempt({"provider": "exa", "role": "search", "status": "failed"})
        self.assertEqual(attempt["error_type"], "provider_error")
        self.assertEqual(attempt["error"], "provider operation failed")


class ExitCodeTests(unittest.TestCase):
    def test_every_error_code_maps_to_its_documented_exit_code(self):
        for code, expected in (("INVALID_ARGUMENT", 2), ("CONFIGURATION_ERROR", 3), ("PROVIDER_ERROR", 4), ("INTERNAL_ERROR", 5), ("UNKNOWN", 4)):
            self.assertEqual(cli._exit_code({"status": "failed", "error": {"code": code}}), expected)
        self.assertEqual(cli._exit_code({"status": "complete", "error": None}), 0)
        self.assertEqual(cli._exit_code({"status": "degraded", "error": None}), 0)


class RedactionTests(unittest.IsolatedAsyncioTestCase):
    SECRET = "EXA-SUPER-SECRET-VALUE"

    async def test_a_provider_message_never_carries_a_credential_out(self):
        provider = FakeSearch("exa", bad("auth_error", f"HTTP 401 key={self.SECRET}"))
        with mock.patch.dict(os.environ, {"EXA_API_KEY": self.SECRET}, clear=True):
            payload = await cli.run_search("q", registry=registry(provider))
        self.assertNotIn(self.SECRET, json.dumps(payload))
        self.assertEqual(payload["attempts"][0]["error"], "provider authentication failed")

    async def test_a_candidate_that_echoes_a_credential_is_redacted(self):
        leak = {"url": "https://a.example/1", "title": f"title {self.SECRET}", "text": f"snippet {self.SECRET}"}
        with mock.patch.dict(os.environ, {"EXA_API_KEY": self.SECRET}, clear=True):
            payload = await cli.run_search("q", registry=registry(FakeSearch("exa", ok(leak))))
        self.assertNotIn(self.SECRET, json.dumps(payload))
        self.assertIn("[REDACTED]", json.dumps(payload))

    async def test_the_engine_knows_the_credentials_it_was_handed(self):
        with mock.patch.dict(os.environ, {"TAVILY_API_KEY": "t", "BRAVE_API_KEY": "b", "JINA_API_KEY": "j"}, clear=True):
            self.assertEqual(set(cli._known_secrets()), {"t", "b", "j"})


if __name__ == "__main__":
    unittest.main()
