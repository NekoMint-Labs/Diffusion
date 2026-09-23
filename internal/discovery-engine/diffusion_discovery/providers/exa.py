"""Exa as a search source.

One authenticated POST through the shared request client with a bounded tenacity
retry, a timeout path, and classified errors. The pure ``normalize_exa()``
normalizer is re-exported as ``to_discovery_candidates`` so a captured raw
``results`` list can be replayed offline, with no network I/O.
"""
import time
from typing import Any

import httpx
from tenacity import AsyncRetrying, retry_if_exception, stop_after_attempt, wait_random_exponential

from .base import BaseSearchProvider, ProviderResult, classify_provider_exception
from ..core.normalizers import normalize_exa as to_discovery_candidates
from ..config import config
from ..runtime_cache import (
    bounded_retry_delay,
    current_context,
    request_client,
    request_timeout_kwargs,
)


RETRYABLE_STATUS_CODES = {408, 429, 500, 502, 503, 504}


def _is_retryable_exception(exc) -> bool:
    if isinstance(exc, (httpx.TimeoutException, httpx.NetworkError, httpx.ConnectError)):
        return True
    if isinstance(exc, httpx.HTTPStatusError):
        return exc.response.status_code in RETRYABLE_STATUS_CODES
    return False


def _normalize_result(item: dict[str, Any], *, include_text: bool, include_highlights: bool) -> dict[str, Any]:
    out = {
        "id": item.get("id"),
        "title": item.get("title") or "",
        "url": item.get("url") or item.get("id") or "",
        "publishedDate": item.get("publishedDate"),
        "author": item.get("author") or "",
        "score": item.get("score"),
    }
    if include_text and "text" in item:
        out["text"] = item.get("text") or ""
    if include_highlights and "highlights" in item:
        out["highlights"] = item.get("highlights") or []
    if "image" in item:
        out["image"] = item.get("image")
    if "favicon" in item:
        out["favicon"] = item.get("favicon")
    return out


class ExaSearchProvider(BaseSearchProvider):
    provider_id = "exa"
    capability = "docs_search"
    normalizer = staticmethod(to_discovery_candidates)

    def __init__(self, api_url: str, api_key: str, timeout: float = 30.0):
        super().__init__(api_url, api_key)
        self.timeout = timeout

    def get_provider_name(self) -> str:
        return "Exa"

    async def search(
        self,
        query: str,
        num_results: int = 5,
        search_type: str = "neural",
        include_text: bool = False,
        include_highlights: bool = False,
        start_published_date: str | None = None,
        include_domains: list[str] | None = None,
        exclude_domains: list[str] | None = None,
        category: str | None = None,
        ctx=None,
    ) -> ProviderResult:
        ctx = ctx or current_context()
        endpoint = f"{self.api_url.rstrip('/')}/search"
        headers = {
            "accept": "application/json",
            "content-type": "application/json",
            "x-api-key": self.api_key,
        }
        payload: dict[str, Any] = {
            "query": query,
            "numResults": num_results,
            "type": search_type,
            "useAutoprompt": True,
        }
        if include_text or include_highlights:
            payload["contents"] = {
                "text": include_text,
                "highlights": include_highlights,
            }
        if start_published_date:
            payload["startPublishedDate"] = start_published_date
        if include_domains:
            payload["includeDomains"] = include_domains
        if exclude_domains:
            payload["excludeDomains"] = exclude_domains
        if category:
            payload["category"] = category

        start_time = time.time()
        try:
            data = await self._request_with_retry(endpoint, headers, payload, ctx)
            elapsed_ms = round((time.time() - start_time) * 1000, 2)

            results = [
                _normalize_result(item, include_text=include_text, include_highlights=include_highlights)
                for item in data.get("results", [])
            ]

            output = {
                "ok": True,
                "query": query,
                "search_type": search_type,
                "results": results,
                "total": len(results),
                "elapsed_ms": elapsed_ms,
            }
        except Exception as e:
            elapsed_ms = round((time.time() - start_time) * 1000, 2)
            error_type, error_message, retryable = classify_provider_exception(e)
            output = {
                "ok": False,
                "query": query,
                "error_type": error_type,
                "error": error_message,
                "retryable": retryable,
                "elapsed_ms": elapsed_ms,
            }

        return self.result(output)

    async def _request_with_retry(
        self, endpoint: str, headers: dict, payload: dict, ctx=None
    ) -> dict[str, Any]:
        timeout = httpx.Timeout(connect=6.0, read=self.timeout, write=10.0, pool=None)

        ctx = ctx or current_context()
        base_wait = wait_random_exponential(multiplier=config.retry_multiplier, max=config.retry_max_wait)
        async with request_client(ctx, timeout=timeout) as client:
            async for attempt in AsyncRetrying(
                stop=stop_after_attempt(config.retry_max_attempts + 1),
                wait=lambda retry_state: bounded_retry_delay(base_wait(retry_state), ctx),
                retry=retry_if_exception(_is_retryable_exception),
                reraise=True,
            ):
                with attempt:
                    response = await client.post(
                        endpoint,
                        headers=headers,
                        json=payload,
                        **request_timeout_kwargs(self.timeout, ctx),
                    )
                    response.raise_for_status()
                    return response.json()
