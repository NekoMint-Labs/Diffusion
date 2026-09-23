"""Test doubles for the two roles the engine calls: search sources and readers.

They return the same plain payload shape the real adapters build through
:class:`ProviderResult`, so the retrieval and read pipelines are exercised
without a network, a transport, or an HTTP dependency.
"""

from __future__ import annotations

from typing import Any

from diffusion_discovery.providers.registry import Registry


def ok(*results: dict[str, Any]) -> dict[str, Any]:
    """A successful provider payload with an ordered results list."""
    return {"ok": True, "results": list(results)}


def bad(error_type: str, error: str = "provider said something private") -> dict[str, Any]:
    """A classified provider failure, carrying an upstream message on purpose."""
    return {"ok": False, "error_type": error_type, "error": error}


def candidate(url: str, title: str = "", **extra: Any) -> dict[str, Any]:
    return {"url": url, "title": title or url.rsplit("/", 1)[-1], **extra}


class FakeSearch:
    """A search source that answers with a canned payload, or raises."""

    def __init__(self, provider_id: str, payload: Any = None, error: BaseException | None = None):
        self.provider_id = provider_id
        self.payload = ok() if payload is None else payload
        self.error = error
        self.calls: list[tuple[str, int]] = []

    async def search(self, query: str, limit: int = 5) -> Any:
        self.calls.append((query, limit))
        if self.error is not None:
            raise self.error
        return self.payload


class FakeReader:
    """A reader that answers with canned content, or raises."""

    def __init__(self, provider_id: str, content: str | None = None, error: BaseException | None = None, payload: Any = None):
        self.provider_id = provider_id
        self.payload = payload if payload is not None else {"ok": True, "content": content or "", "title": ""}
        self.error = error
        self.calls: list[str] = []

    async def read(self, url: str) -> Any:
        self.calls.append(url)
        if self.error is not None:
            raise self.error
        return self.payload


def registry(*searches: Any, readers: Any = ()) -> Registry:
    return Registry(search=list(searches), readers=list(readers))
