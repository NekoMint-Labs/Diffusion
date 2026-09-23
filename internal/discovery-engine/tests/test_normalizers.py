"""Each source's raw result payload becomes the same kind of candidate.

This is the normalization contract: whatever shape a source answers with, the
rest of the engine sees one candidate record, and a malformed row is skipped
rather than allowed to poison the list.
"""

import unittest

from diffusion_discovery.core.normalizers import normalize_brave, normalize_exa, normalize_tavily


class NormalizeExaTests(unittest.TestCase):
    def test_maps_results_to_candidates_in_order(self):
        raw = {
            "results": [
                {"url": "https://a.example/x", "title": "A", "text": " Body ", "publishedDate": "2024-01-02",
                 "author": "Ada", "score": 0.5, "id": "a1"},
                {"id": "https://b.example/y", "title": "B", "highlights": ["one", "two"]},
            ]
        }
        candidates = normalize_exa(raw)
        self.assertEqual([item.url for item in candidates], ["https://a.example/x", "https://b.example/y"])
        first, second = candidates
        self.assertEqual(first.provider, "exa")
        self.assertEqual(first.snippet, "Body")
        self.assertEqual(first.published_at, "2024-01-02")
        self.assertEqual(first.provider_rank, 0)
        self.assertEqual(dict(first.metadata), {"exa_score": 0.5, "author": "Ada", "id": "a1"})
        self.assertEqual(second.url, "https://b.example/y")
        self.assertEqual(second.snippet, "one two")
        self.assertEqual(second.provider_rank, 1)

    def test_skips_rows_without_a_url_or_title(self):
        raw = [{"url": "https://a.example", "title": "A"}, {"url": "", "title": "no url"}, {"url": "https://c.example", "title": ""}, "not a row"]
        self.assertEqual([item.url for item in normalize_exa(raw)], ["https://a.example"])

    def test_empty_payload_is_no_candidates(self):
        self.assertEqual(normalize_exa({"results": []}), [])
        self.assertEqual(normalize_exa({}), [])


class NormalizeTavilyTests(unittest.TestCase):
    def test_maps_results_and_falls_back_from_content_to_description(self):
        raw = {"results": [
            {"url": "https://a.example/x", "title": "A", "content": "the content", "score": 0.9},
            {"url": "https://b.example/y", "title": "B", "description": "the description"},
            {"url": "https://c.example/z", "title": "C"},
        ]}
        candidates = normalize_tavily(raw)
        self.assertEqual([item.url for item in candidates], ["https://a.example/x", "https://b.example/y", "https://c.example/z"])
        self.assertEqual(candidates[0].provider, "tavily")
        self.assertEqual(candidates[0].snippet, "the content")
        self.assertEqual(dict(candidates[0].metadata), {"tavily_score": 0.9})
        self.assertEqual(candidates[1].snippet, "the description")
        self.assertEqual(candidates[2].snippet, "")

    def test_accepts_a_raw_results_list(self):
        self.assertEqual([item.url for item in normalize_tavily([{"url": "https://a.example", "title": "A"}])], ["https://a.example"])


class NormalizeBraveTests(unittest.TestCase):
    def test_maps_description_and_keeps_only_known_metadata(self):
        raw = {"results": [
            {"url": "https://a.example/x", "title": "A", "description": "the description",
             "age": "3 days ago", "language": "en", "family_friendly": True, "page_age": "2024-01-02", "extra": "dropped"},
        ]}
        candidates = normalize_brave(raw)
        self.assertEqual(len(candidates), 1)
        candidate = candidates[0]
        self.assertEqual(candidate.provider, "brave")
        self.assertEqual(candidate.snippet, "the description")
        self.assertEqual(dict(candidate.metadata),
                         {"age": "3 days ago", "language": "en", "family_friendly": True, "page_age": "2024-01-02"})

    def test_skips_rows_without_a_url_or_title(self):
        raw = [{"url": "https://a.example", "title": "A"}, {"url": "https://b.example", "title": ""}]
        self.assertEqual([item.url for item in normalize_brave(raw)], ["https://a.example"])


if __name__ == "__main__":
    unittest.main()
