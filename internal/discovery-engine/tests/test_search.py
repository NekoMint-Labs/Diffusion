"""One source, several sources, one broken source, no source.

Section by section: a single configured source is enough; several aggregate into
one ranked list with duplicates collapsed; a source that fails degrades the
result instead of destroying it; and a source that is misconfigured is reported
as a configuration fact rather than as a mystery failure.
"""

import asyncio
import json
import unittest

from diffusion_discovery.cli import resolve_preset, run_search
from diffusion_discovery.core.models import RetrievalPolicy
from diffusion_discovery.core.retrieval import search as core_search
from tests.fakes import FakeSearch, bad, candidate, ok, registry

# The stable classification vocabulary the envelope is allowed to contain.
STABLE_ERROR_TYPES = {
    "config_error", "auth_error", "parameter_error", "timeout", "network_error",
    "rate_limited", "protocol_error", "parse_error", "quality_error", "empty",
    "provider_error", "budget_exhausted", "too_large",
}


class OneSourceTests(unittest.IsolatedAsyncioTestCase):
    async def test_one_configured_source_is_enough(self):
        exa = FakeSearch("exa", ok(candidate("https://a.example/1", "A"), candidate("https://a.example/2", "B")))
        outcome = await core_search("a query", RetrievalPolicy(), registry=registry(exa))
        self.assertEqual([item.candidate.url for item in outcome.ranked],
                         ["https://a.example/1", "https://a.example/2"])
        self.assertEqual(outcome.providers, ("exa",))
        self.assertFalse(outcome.failed)
        self.assertFalse(outcome.degraded)
        self.assertEqual(exa.calls, [("a query", 5)])

    async def test_empty_results_from_a_working_source_is_a_complete_search(self):
        payload = await run_search("q", registry=registry(FakeSearch("exa", ok())))
        self.assertEqual(payload["status"], "complete")
        self.assertIsNone(payload["error"])
        self.assertEqual(payload["data"]["candidates"], [])
        self.assertEqual([attempt["status"] for attempt in payload["attempts"]], ["complete"])


class AggregationTests(unittest.IsolatedAsyncioTestCase):
    async def test_sources_aggregate_and_a_url_named_by_two_sources_is_one_candidate(self):
        exa = FakeSearch("exa", ok(candidate("https://shared.example/p?utm_source=exa", "Shared"),
                                   candidate("https://exa.example/only", "Exa only")))
        tavily = FakeSearch("tavily", ok(candidate("https://shared.example/p", "Shared again"),
                                         candidate("https://tavily.example/only", "Tavily only")))
        outcome = await core_search("q", RetrievalPolicy(), registry=registry(exa, tavily))
        self.assertEqual(len(outcome.ranked), 3)
        self.assertEqual(outcome.ranked[0].candidate.url, "https://shared.example/p")
        self.assertEqual(dict(outcome.ranked[0].candidate.provider_ranks), {"exa": 0, "tavily": 0})
        self.assertEqual(outcome.providers, ("exa", "tavily"))
        self.assertFalse(outcome.degraded)

    async def test_the_result_limit_bounds_what_is_returned(self):
        exa = FakeSearch("exa", ok(*[candidate("https://a.example/%d" % index) for index in range(10)]))
        payload = await run_search("q", registry=registry(exa), mode="research")
        self.assertEqual(exa.calls, [("q", 10)])
        self.assertEqual(len(payload["data"]["candidates"]), 10)
        limited = await run_search("q", registry=registry(exa), mode="fast")
        self.assertEqual(len(limited["data"]["candidates"]), 3)


class DegradationTests(unittest.IsolatedAsyncioTestCase):
    async def test_one_failing_source_keeps_the_working_one_useful_and_says_so(self):
        exa = FakeSearch("exa", ok(candidate("https://a.example/1", "A")))
        tavily = FakeSearch("tavily", bad("timeout", "upstream said PRIVATE"))
        payload = await run_search("q", registry=registry(exa, tavily))
        self.assertEqual(payload["status"], "degraded")
        self.assertIsNone(payload["error"])
        self.assertEqual([item["url"] for item in payload["data"]["candidates"]], ["https://a.example/1"])
        self.assertEqual([attempt["provider"] for attempt in payload["attempts"]], ["exa", "tavily"])
        self.assertEqual(payload["attempts"][1]["error_type"], "timeout")
        self.assertEqual(payload["attempts"][1]["error"], "provider request timed out")
        self.assertNotIn("PRIVATE", json.dumps(payload))

    async def test_every_source_failing_is_a_failed_search(self):
        payload = await run_search("q", registry=registry(FakeSearch("exa", bad("auth_error")),
                                                          FakeSearch("tavily", bad("network_error"))))
        self.assertEqual(payload["status"], "failed")
        self.assertEqual(payload["error"]["code"], "PROVIDER_ERROR")
        self.assertEqual(payload["data"]["candidates"], [])

    async def test_a_source_that_raises_is_a_classified_attempt_not_a_crash(self):
        payload = await run_search("q", registry=registry(FakeSearch("exa", error=RuntimeError("boom PRIVATE"))))
        self.assertEqual(payload["status"], "failed")
        self.assertEqual(payload["attempts"][0]["status"], "failed")
        self.assertIn(payload["attempts"][0]["error_type"], STABLE_ERROR_TYPES)
        self.assertNotIn("PRIVATE", json.dumps(payload))

    async def test_a_source_whose_malformed_reply_is_rejected_does_not_lose_the_other(self):
        exa = FakeSearch("exa", {"ok": True, "results": "not a list"})
        tavily = FakeSearch("tavily", ok(candidate("https://tavily.example/only", "T")))
        payload = await run_search("q", registry=registry(exa, tavily))
        self.assertEqual(payload["status"], "degraded")
        self.assertIn(payload["attempts"][0]["error_type"], STABLE_ERROR_TYPES)
        self.assertNotEqual(payload["attempts"][0]["status"], "complete")
        self.assertEqual([item["url"] for item in payload["data"]["candidates"]], ["https://tavily.example/only"])


class NoSourceTests(unittest.IsolatedAsyncioTestCase):
    async def test_no_configured_source_is_an_honest_configuration_failure(self):
        payload = await run_search("q", registry=registry())
        self.assertEqual(payload["status"], "failed")
        self.assertEqual(payload["error"]["code"], "CONFIGURATION_ERROR")
        self.assertEqual(payload["error"]["message"], "no discovery source is configured")
        self.assertEqual(payload["data"], {"candidates": [], "providers": []})
        self.assertEqual(payload["attempts"], [])
        self.assertNotIn("evidence", payload["data"])

    async def test_every_source_rejecting_its_configuration_is_a_configuration_error(self):
        payload = await run_search("q", registry=registry(FakeSearch("exa", bad("config_error"))))
        self.assertEqual(payload["status"], "failed")
        self.assertEqual(payload["error"]["code"], "CONFIGURATION_ERROR")

    async def test_an_empty_query_never_reaches_a_source(self):
        exa = FakeSearch("exa", ok(candidate("https://a.example/1")))
        payload = await run_search("   ", registry=registry(exa))
        self.assertEqual(payload["error"]["code"], "INVALID_ARGUMENT")
        self.assertEqual(exa.calls, [])


class PresetTests(unittest.IsolatedAsyncioTestCase):
    def test_modes_map_to_fixed_result_counts(self):
        self.assertEqual(resolve_preset("fast"), ("fast", 3))
        self.assertEqual(resolve_preset("balanced"), ("balanced", 5))
        self.assertEqual(resolve_preset("research"), ("research", 10))
        self.assertEqual(resolve_preset(" FAST "), ("fast", 3))
        with self.assertRaises(ValueError):
            resolve_preset("deep")

    async def test_the_mode_decides_how_many_results_the_source_is_asked_for(self):
        exa = FakeSearch("exa", ok(*[candidate("https://a.example/%d" % index) for index in range(6)]))
        payload = await run_search("q", mode="fast", registry=registry(exa))
        self.assertEqual(exa.calls, [("q", 3)])
        self.assertEqual(len(payload["data"]["candidates"]), 3)

    def test_an_invalid_mode_is_rejected_before_any_source_runs(self):
        payload = asyncio.run(run_search("q", mode="deep", registry=registry()))
        self.assertEqual(payload["error"]["code"], "INVALID_ARGUMENT")


if __name__ == "__main__":
    unittest.main()
