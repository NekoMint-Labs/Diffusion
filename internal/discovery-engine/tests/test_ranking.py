"""URL canonicalization, duplicate collapse and fusion order.

These three functions decide what a person sees and in what order, so the
contracts are pinned here: two URLs that differ only by tracking parameters are
one candidate; a URL claimed by two sources names both; and the ranking is a
total, reproducible order rather than whatever the network returned first.
"""

import unittest

from diffusion_discovery.core.models import Candidate
from diffusion_discovery.core.ranking import (
    DEFAULT_RRF_K,
    canonicalize_url,
    deduplicate_candidates,
    reciprocal_rank_fusion,
)


def candidate(url, provider, rank, title="T", snippet="S"):
    return Candidate(url, title, provider, snippet, "", rank)


class CanonicalizeTests(unittest.TestCase):
    def test_drops_tracking_parameters_and_default_ports(self):
        self.assertEqual(canonicalize_url("https://Example.COM:443/a?utm_source=x&b=2&a=1&fbclid=z"),
                         "https://example.com/a?a=1&b=2")
        self.assertEqual(canonicalize_url("http://example.com:80/"), "http://example.com/")

    def test_keeps_meaningful_query_parameters_and_order_is_stable(self):
        self.assertEqual(canonicalize_url("https://example.com/s?q=b&q=a"), "https://example.com/s?q=a&q=b")

    def test_a_non_url_is_returned_unchanged(self):
        self.assertEqual(canonicalize_url("not a url"), "not a url")
        self.assertEqual(canonicalize_url(""), "")


class DeduplicateTests(unittest.TestCase):
    def test_merges_canonical_urls_and_keeps_the_first_display_form(self):
        fused = deduplicate_candidates([
            candidate("https://example.com/page?utm_source=exa", "exa", 0, title="Exa title"),
            candidate("https://example.com/page", "tavily", 2, title="Tavily title"),
            candidate("https://other.example/", "brave", 1),
        ])
        self.assertEqual([item.url for item in fused], ["https://example.com/page", "https://other.example/"])
        merged = fused[0]
        self.assertEqual(merged.display_url, "https://example.com/page?utm_source=exa")
        self.assertEqual(merged.title, "Exa title")
        self.assertEqual(merged.providers, ("exa", "tavily"))
        self.assertEqual(dict(merged.provider_ranks), {"exa": 0, "tavily": 2})

    def test_fusion_score_rewards_being_ranked_by_more_sources(self):
        fused = deduplicate_candidates([
            candidate("https://a.example/", "exa", 0),
            candidate("https://a.example/", "tavily", 0),
            candidate("https://b.example/", "exa", 1),
        ])
        ranked = reciprocal_rank_fusion(fused)
        self.assertEqual(ranked[0].candidate.url, "https://a.example/")
        expected = 2 * (1.0 / (DEFAULT_RRF_K + 0 + 1))
        self.assertAlmostEqual(ranked[0].rrf_score, expected)
        self.assertEqual([item.rank for item in ranked], [0, 1])

    def test_order_is_total_and_reproducible(self):
        fused = deduplicate_candidates([
            candidate("https://a.example/", "exa", 0),
            candidate("https://b.example/", "exa", 0),
        ])
        first = [item.candidate.url for item in reciprocal_rank_fusion(fused)]
        second = [item.candidate.url for item in reciprocal_rank_fusion(list(reversed(fused)))]
        self.assertEqual(first, ["https://a.example/", "https://b.example/"])
        self.assertEqual(second, first)


if __name__ == "__main__":
    unittest.main()
