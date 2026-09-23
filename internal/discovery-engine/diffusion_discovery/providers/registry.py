"""The sources this engine may search, and the readers it may read with.

The registry is deliberately small: providers are looked up by role and
deterministic id, then called directly. A source with no credential, or one that
is not enabled, is simply absent from the registry — a search never fails
because a source the person did not turn on is unconfigured.

Transports are imported inside the builders so this module, and the error paths
that use it, do not pull in HTTP dependencies or read configuration.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable, Protocol


class SearchProvider(Protocol):
    provider_id: str
    async def search(self, query: str, limit: int = 5) -> Any: ...


class ReaderProvider(Protocol):
    provider_id: str
    async def read(self, url: str) -> Any: ...


@dataclass(frozen=True)
class ProviderAttempt:
    provider: str
    role: str
    status: str
    error_type: str = ""
    error: str = ""
    result_count: int = 0
    elapsed_ms: float = 0.0

    def to_dict(self) -> dict[str, Any]:
        result = {
            "provider": self.provider, "role": self.role, "status": self.status,
            "result_count": self.result_count, "elapsed_ms": self.elapsed_ms,
        }
        if self.error_type:
            result["error_type"] = self.error_type
        if self.error:
            result["error"] = self.error
        return result


class Registry:
    """Ordered role registry. Re-registering an id replaces it in place."""

    def __init__(self, *, search: Any = (), readers: Any = ()) -> None:
        self._search: dict[str, Any] = {}
        self._readers: dict[str, Any] = {}
        for provider in search or ():
            self.register_search(provider)
        for provider in readers or ():
            self.register_reader(provider)

    @staticmethod
    def _id(provider: Any) -> str:
        value = getattr(provider, "provider_id", None) or getattr(provider, "id", None)
        if not value:
            raise ValueError("provider must define provider_id")
        return str(value).strip().lower()

    def register_search(self, provider: Any) -> Any:
        self._search[self._id(provider)] = provider
        return provider

    def register_reader(self, provider: Any) -> Any:
        self._readers[self._id(provider)] = provider
        return provider

    def search_providers(self, ids: Any = None) -> list[Any]:
        return self._ordered(self._search, ids)

    def reader_providers(self, ids: Any = None) -> list[Any]:
        return self._ordered(self._readers, ids)

    @staticmethod
    def _ordered(values: dict[str, Any], ids: Any) -> list[Any]:
        if ids is None:
            return list(values.values())
        return [values[str(item).strip().lower()] for item in ids if str(item).strip().lower() in values]

    @property
    def search_ids(self) -> tuple[str, ...]:
        return tuple(self._search)

    @property
    def reader_ids(self) -> tuple[str, ...]:
        return tuple(self._readers)


@dataclass(frozen=True)
class _Source:
    provider_id: str
    builder: Callable[[Any], Any | None]


def _build_brave(config: Any) -> Any | None:
    api_key = config.brave_api_key
    if not api_key or not config.brave_enabled:
        return None
    from .brave import BraveSearchProvider
    return BraveSearchProvider(config.brave_api_url, api_key, config.brave_timeout)


def _build_exa(config: Any) -> Any | None:
    api_key = config.exa_api_key
    if not api_key or not config.exa_enabled:
        return None
    from .exa import ExaSearchProvider
    return ExaSearchProvider(config.exa_base_url, api_key, config.exa_timeout)


def _build_tavily(config: Any) -> Any | None:
    api_key = config.tavily_api_key
    if not api_key or not config.tavily_enabled:
        return None
    from .tavily import TavilySearchProvider
    return TavilySearchProvider(config.tavily_api_url, api_key, config.tavily_timeout)


# The order is the product-visible order of sources, and it is the order
# candidates are fused from. Changing it changes ranking, so it is not incidental.
_SOURCES = (
    _Source("brave", _build_brave),
    _Source("exa", _build_exa),
    _Source("tavily", _build_tavily),
)


def default_registry() -> Registry:
    """Construct the configured sources and readers, without network I/O."""
    from ..config import config

    search: list[Any] = []
    for source in _SOURCES:
        provider = source.builder(config)
        if provider is not None:
            search.append(provider)

    readers: list[Any] = []
    # The anonymous reader is eligible even with no search source configured at
    # all: reading a page the person already has a URL for is not discovery.
    if config.jina_reader_api_url:
        from .jina import JinaReaderProvider
        readers.append(JinaReaderProvider(config.jina_reader_api_url, config.jina_api_key,
                                          config.jina_respond_with, config.jina_timeout))
    if config.exa_api_key and config.exa_enabled:
        from .exa_reader import ExaReaderProvider
        readers.append(ExaReaderProvider(config.exa_base_url, config.exa_api_key, config.exa_timeout))
    return Registry(search=search, readers=readers)


__all__ = ["ProviderAttempt", "ReaderProvider", "Registry", "SearchProvider", "default_registry"]
