"""Transport behaviour: classification, bounded bodies, and the retry budget.

These are the failures a person actually experiences — a source that times out,
a source whose key is wrong, a source that is briefly down — so the mapping from
a real transport failure to a stable error token is pinned, together with the
retry budget and the hard cap on how much of a response body is ever buffered.

Skipped when httpx is unavailable: without it there is no real transport failure
to classify, and a fake would only be testing the fake.
"""

import unittest
from unittest import mock

try:
    import httpx
except ImportError:  # pragma: no cover - exercised only on a machine without httpx
    httpx = None

HAVE_HTTPX = httpx is not None
SKIP = "httpx is not installed, so there is no real transport failure to classify"


class _Response:
    def __init__(self, status=200, payload=None):
        self.status_code = status
        self._payload = payload if payload is not None else {}

    def raise_for_status(self):
        if self.status_code >= 400:
            request = httpx.Request("POST", "https://api.example/search")
            raise httpx.HTTPStatusError("upstream said something private", request=request,
                                       response=httpx.Response(self.status_code, request=request))

    def json(self):
        return self._payload

    async def aiter_bytes(self):
        yield b"{}"


class _Client:
    """A stand-in request client that replays a fixed list of answers."""

    def __init__(self, responses):
        self.responses = list(responses)
        self.calls = 0

    async def _answer(self):
        self.calls += 1
        item = self.responses[min(self.calls - 1, len(self.responses) - 1)]
        if isinstance(item, BaseException):
            raise item
        return item

    async def post(self, *args, **kwargs):
        return await self._answer()

    async def get(self, *args, **kwargs):
        return await self._answer()

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc_info):
        return False


@unittest.skipUnless(HAVE_HTTPX, SKIP)
class ClassificationTests(unittest.TestCase):
    def classify(self, exc):
        from diffusion_discovery.providers.base import classify_provider_exception
        return classify_provider_exception(exc)

    def test_an_http_status_becomes_a_stable_error_type_and_drops_the_upstream_text(self):
        cases = ((401, "auth_error"), (403, "auth_error"), (400, "parameter_error"), (422, "parameter_error"),
                 (408, "timeout"), (429, "rate_limited"), (500, "network_error"), (503, "network_error"),
                 (418, "protocol_error"))
        for status, expected in cases:
            with self.subTest(status=status):
                request = httpx.Request("GET", "https://api.example/x")
                error = httpx.HTTPStatusError("upstream said something private", request=request,
                                              response=httpx.Response(status, request=request))
                error_type, message, _retryable = self.classify(error)
                self.assertEqual(error_type, expected)
                self.assertEqual(message, f"HTTP {status}")
                self.assertNotIn("private", message)

    def test_transport_failures_become_stable_error_types_with_a_retryability_verdict(self):
        request = httpx.Request("GET", "https://api.example/x")
        cases = (
            (httpx.ConnectTimeout("timed out", request=request), "timeout", True),
            (httpx.ConnectError("no route", request=request), "network_error", True),
            (ValueError("not json"), "parse_error", False),
            (RuntimeError("weird"), "protocol_error", False),
        )
        for error, expected, retryable in cases:
            with self.subTest(error=type(error).__name__):
                error_type, _message, is_retryable = self.classify(error)
                self.assertEqual(error_type, expected)
                self.assertEqual(is_retryable, retryable)

    def test_a_declared_provider_error_keeps_its_own_classification(self):
        from diffusion_discovery.providers.base import ProviderError
        error_type, _message, retryable = self.classify(ProviderError("rate_limited", "slow down"))
        self.assertEqual(error_type, "rate_limited")
        self.assertTrue(retryable)

    def test_an_unknown_declared_error_type_is_normalized(self):
        from diffusion_discovery.providers.base import ProviderError
        self.assertEqual(ProviderError("invented", "x").error_type, "provider_error")


@unittest.skipUnless(HAVE_HTTPX, SKIP)
class BoundedBodyTests(unittest.IsolatedAsyncioTestCase):
    async def test_a_body_within_the_limit_is_returned_whole(self):
        from diffusion_discovery.providers.base import read_response_bounded

        class Response:
            async def aiter_bytes(self):
                yield b"x" * 10
                yield b"y" * 10

        self.assertEqual(await read_response_bounded(Response(), 100), b"x" * 10 + b"y" * 10)

    async def test_an_oversized_body_is_a_classified_too_large_failure(self):
        from diffusion_discovery.providers.base import ProviderError, read_response_bounded

        class Response:
            async def aiter_bytes(self):
                yield b"x" * 10
                yield b"y" * 10

        with self.assertRaises(ProviderError) as caught:
            await read_response_bounded(Response(), 15)
        self.assertEqual(caught.exception.error_type, "too_large")
        self.assertFalse(caught.exception.retryable)


@unittest.skipUnless(HAVE_HTTPX, SKIP)
class AdapterTransportTests(unittest.IsolatedAsyncioTestCase):
    def build(self, module_name, provider_class, responses):
        module = __import__(f"diffusion_discovery.providers.{module_name}", fromlist=["*"])
        client = _Client(responses)
        patches = (
            mock.patch.object(module, "request_client", lambda *args, **kwargs: client),
            mock.patch("diffusion_discovery.config.RETRY_MAX_ATTEMPTS", 1),
            mock.patch("diffusion_discovery.config.RETRY_MULTIPLIER", 0.0),
            mock.patch("diffusion_discovery.config.RETRY_MAX_WAIT", 0),
        )
        return module, client, patches

    async def test_a_retryable_failure_is_retried_once_and_then_succeeds(self):
        responses = [
            httpx.ConnectError("down", request=httpx.Request("POST", "https://api.exa.ai/search")),
            _Response(200, {"results": [{"url": "https://a.example/1", "title": "A", "text": "body"}]}),
        ]
        module, client, patches = self.build("exa", None, responses)
        with patches[0], patches[1], patches[2], patches[3]:
            provider = module.ExaSearchProvider("https://api.exa.ai", "EXA-KEY", 5.0)
            result = await provider.search("q", 5)
        self.assertTrue(result.ok)
        self.assertEqual(client.calls, 2)
        self.assertEqual([row["url"] for row in result.data["results"]], ["https://a.example/1"])

    async def test_an_authentication_failure_is_classified_and_not_retried(self):
        module, client, patches = self.build("exa", None, [_Response(401)])
        with patches[0], patches[1], patches[2], patches[3]:
            provider = module.ExaSearchProvider("https://api.exa.ai", "EXA-KEY", 5.0)
            result = await provider.search("q", 5)
        self.assertFalse(result.ok)
        self.assertEqual(result.error_type, "auth_error")
        self.assertEqual(client.calls, 1)
        self.assertNotIn("EXA-KEY", str(result))
        self.assertNotIn("private", str(result))

    async def test_a_timeout_is_classified_as_a_timeout(self):
        responses = [httpx.ConnectTimeout("slow", request=httpx.Request("POST", "https://api.exa.ai/search"))] * 4
        module, client, patches = self.build("exa", None, responses)
        with patches[0], patches[1], patches[2], patches[3]:
            provider = module.ExaSearchProvider("https://api.exa.ai", "EXA-KEY", 5.0)
            result = await provider.search("q", 5)
        self.assertFalse(result.ok)
        self.assertEqual(result.error_type, "timeout")
        self.assertEqual(client.calls, 2)

    async def test_a_tavily_auth_failure_is_classified_the_same_way(self):
        module, client, patches = self.build("tavily", None, [_Response(403)])
        with patches[0], patches[1], patches[2], patches[3]:
            provider = module.TavilySearchProvider("https://api.tavily.com", "TAVILY-KEY", 5.0)
            result = await provider.search("q", 5)
        self.assertFalse(result.ok)
        self.assertEqual(result.error_type, "auth_error")

    async def test_a_brave_auth_failure_is_classified_the_same_way(self):
        module, client, patches = self.build("brave", None, [_Response(401)])
        with patches[0], patches[1], patches[2], patches[3]:
            provider = module.BraveSearchProvider("https://api.search.brave.com/res/v1", "BRAVE-KEY", 5.0)
            result = await provider.search("q", 5)
        self.assertFalse(result.ok)
        self.assertEqual(result.error_type, "auth_error")

    async def test_a_malformed_reply_is_a_parse_failure_not_an_empty_result(self):
        module, client, patches = self.build("exa", None, [_Response(200, {"results": "not a list"})])
        with patches[0], patches[1], patches[2], patches[3]:
            provider = module.ExaSearchProvider("https://api.exa.ai", "EXA-KEY", 5.0)
            result = await provider.search("q", 5)
        self.assertFalse(result.ok)
        self.assertIn(result.error_type, {"parse_error", "protocol_error"})


if __name__ == "__main__":
    unittest.main()
