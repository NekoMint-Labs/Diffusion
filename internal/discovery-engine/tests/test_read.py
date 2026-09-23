"""Reading a source: ordered fallback, bounding, and refusing a bad page.

A read is the only operation that produces citable content, so three things are
pinned here: readers are tried in a defined order and a failure is visible
rather than silent; the returned content is bounded and says what was kept; and
a challenge page, an empty body or a non-text body is refused instead of being
handed upward as if it were the source.
"""

import unittest

from diffusion_discovery.cli import run_read
from diffusion_discovery.evidence.fetch import DEFAULT_CONTENT_LIMIT, read as core_read
from tests.fakes import FakeReader, bad, registry

URL = "https://a.example/page"


class FallbackTests(unittest.IsolatedAsyncioTestCase):
    async def test_readers_are_tried_in_order_and_a_failure_stays_visible(self):
        jina = FakeReader("jina", payload=bad("timeout"))
        exa = FakeReader("exa", content="the fetched body")
        outcome = await core_read(URL, registry=registry(readers=(jina, exa)))
        self.assertEqual(jina.calls, [URL])
        self.assertEqual(exa.calls, [URL])
        self.assertEqual([attempt.provider for attempt in outcome.attempts], ["jina", "exa"])
        self.assertEqual([attempt.status for attempt in outcome.attempts], ["failed", "complete"])
        self.assertEqual(outcome.evidence.content, "the fetched body")
        self.assertTrue(outcome.degraded)

    async def test_a_read_that_used_a_fallback_is_reported_as_degraded(self):
        payload = await run_read(URL, registry=registry(readers=(FakeReader("jina", payload=bad("timeout")),
                                                                FakeReader("exa", content="body"))))
        self.assertEqual(payload["status"], "degraded")
        self.assertEqual(payload["data"]["evidence"]["provider"], "exa")
        self.assertIsNone(payload["error"])

    async def test_no_reader_returning_content_is_a_failed_read(self):
        jina = FakeReader("jina", payload=bad("network_error"))
        exa = FakeReader("exa", payload={"ok": True, "content": "   "})
        payload = await run_read(URL, registry=registry(readers=(jina, exa)))
        self.assertEqual(payload["status"], "failed")
        self.assertEqual(payload["error"]["code"], "PROVIDER_ERROR")
        self.assertIsNone(payload["data"]["evidence"])
        self.assertEqual([attempt["status"] for attempt in payload["attempts"]], ["failed", "empty"])

    async def test_no_eligible_reader_is_reported_rather_than_guessed(self):
        outcome = await core_read(URL, registry=registry())
        self.assertIsNone(outcome.evidence)
        self.assertEqual(outcome.warnings, ("no eligible reader providers",))

    async def test_a_reader_that_raises_is_classified_and_the_next_one_still_runs(self):
        payload = await run_read(URL, registry=registry(readers=(FakeReader("jina", error=RuntimeError("boom PRIVATE")),
                                                                FakeReader("exa", content="body"))))
        self.assertEqual(payload["data"]["evidence"]["content"], "body")
        self.assertEqual(payload["attempts"][0]["status"], "failed")
        self.assertNotIn("PRIVATE", str(payload))


class BoundingTests(unittest.IsolatedAsyncioTestCase):
    async def test_content_is_bounded_and_reports_what_was_kept(self):
        body = "x" * 500
        outcome = await core_read(URL, registry=registry(readers=(FakeReader("jina", content=body),)), max_chars=100)
        evidence = outcome.evidence
        self.assertEqual(len(evidence.content), 100)
        self.assertTrue(evidence.truncated)
        self.assertEqual(evidence.original_length, 500)
        self.assertEqual(evidence.returned_length, 100)

    async def test_a_body_within_the_bound_is_not_marked_truncated(self):
        outcome = await core_read(URL, registry=registry(readers=(FakeReader("jina", content="short body"),)))
        self.assertEqual(outcome.evidence.content, "short body")
        self.assertFalse(outcome.evidence.truncated)
        self.assertEqual(outcome.evidence.returned_length, len("short body"))

    async def test_the_default_bound_is_what_the_product_expects(self):
        self.assertEqual(DEFAULT_CONTENT_LIMIT, 8_000)

    async def test_the_read_envelope_carries_the_evidence_shape_the_product_maps(self):
        payload = await run_read(URL, registry=registry(readers=(FakeReader("jina", content="body"),)))
        evidence = payload["data"]["evidence"]
        self.assertEqual(set(evidence), {"id", "url", "title", "provider", "content", "truncated", "original_length", "returned_length"})
        self.assertEqual(evidence["url"], URL)
        self.assertEqual(evidence["content"], "body")
        self.assertNotIn("candidates", payload["data"])


class RefusalTests(unittest.IsolatedAsyncioTestCase):
    async def test_a_challenge_page_is_refused_rather_than_read(self):
        reader = FakeReader("jina", content="Attention Required! | Cloudflare " + "y" * 50)
        outcome = await core_read(URL, registry=registry(readers=(reader,)))
        self.assertIsNone(outcome.evidence)
        self.assertEqual(outcome.attempts[0].error_type, "quality_error")
        self.assertEqual(outcome.attempts[0].status, "failed")

    async def test_a_non_text_body_is_refused_rather_than_stringified(self):
        outcome = await core_read(URL, registry=registry(readers=(FakeReader("jina", payload={"ok": True, "content": 123}),)))
        self.assertIsNone(outcome.evidence)
        self.assertEqual(outcome.attempts[0].error_type, "protocol_error")

    async def test_an_untagged_provider_failure_is_kept_inside_the_stable_vocabulary(self):
        payload = await run_read(URL, registry=registry(readers=(FakeReader("jina", payload={"ok": False, "error_type": "made_up", "error": "upstream text"}),)))
        self.assertEqual(payload["attempts"][0]["error_type"], "protocol_error")
        self.assertNotIn("upstream text", str(payload))

    async def test_a_non_positive_bound_is_rejected(self):
        with self.assertRaises(ValueError):
            await core_read(URL, registry=registry(readers=(FakeReader("jina", content="body"),)), max_chars=0)

    async def test_only_absolute_http_urls_without_credentials_are_read(self):
        for target in ("javascript:alert(1)", "file:///etc/passwd", "https://user:pass@a.example/", "https://a.example/a b", "not a url"):
            with self.subTest(target=target):
                payload = await run_read(target, registry=registry(readers=(FakeReader("jina", content="body"),)))
                self.assertEqual(payload["status"], "failed")
                self.assertEqual(payload["error"]["code"], "INVALID_ARGUMENT")


if __name__ == "__main__":
    unittest.main()
