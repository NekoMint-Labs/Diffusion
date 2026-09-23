"""Small immutable domain records for one discovery operation."""
from __future__ import annotations

from dataclasses import dataclass, field, fields, is_dataclass
from types import MappingProxyType
from typing import Any, Mapping


def _freeze(value: Any) -> Any:
    if isinstance(value, Mapping):
        return MappingProxyType({str(k): _freeze(v) for k, v in value.items()})
    if isinstance(value, (list, tuple)):
        return tuple(_freeze(v) for v in value)
    return value


def thaw(value: Any) -> Any:
    if isinstance(value, Mapping):
        return {str(k): thaw(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [thaw(v) for v in value]
    if is_dataclass(value):
        return {item.name: thaw(getattr(value, item.name)) for item in fields(value)}
    return value


@dataclass(frozen=True)
class Candidate:
    url: str
    title: str
    provider: str
    snippet: str = ""
    published_at: str = ""
    provider_rank: int = 0
    metadata: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        object.__setattr__(self, "url", str(self.url or "").strip())
        object.__setattr__(self, "title", str(self.title or "").strip())
        object.__setattr__(self, "provider", str(self.provider or "").strip())
        object.__setattr__(self, "snippet", str(self.snippet or "").strip())
        object.__setattr__(self, "published_at", str(self.published_at or "").strip())
        object.__setattr__(self, "provider_rank", max(0, int(self.provider_rank or 0)))
        object.__setattr__(self, "metadata", _freeze(self.metadata))

    @property
    def id(self) -> str:
        return self.url


@dataclass(frozen=True)
class FusedCandidate:
    url: str
    display_url: str
    title: str
    snippet: str
    providers: tuple[str, ...]
    provider_ranks: Mapping[str, int]
    metadata: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        object.__setattr__(self, "url", str(self.url or ""))
        object.__setattr__(self, "display_url", str(self.display_url or ""))
        object.__setattr__(self, "title", str(self.title or ""))
        object.__setattr__(self, "snippet", str(self.snippet or ""))
        object.__setattr__(self, "providers", tuple(str(p) for p in self.providers))
        object.__setattr__(self, "provider_ranks", _freeze(self.provider_ranks))
        object.__setattr__(self, "metadata", _freeze(self.metadata))

    @property
    def id(self) -> str:
        return self.url


@dataclass(frozen=True)
class RankedCandidate:
    candidate: FusedCandidate
    rrf_score: float
    rank: int = 0


@dataclass(frozen=True)
class RetrievalPolicy:
    """Which sources one search may use, and how many results it may return.

    The mode a caller asked for is not persisted here: the CLI resolves the mode
    into this policy and nothing downstream needs to remember the mode name.
    """

    providers: tuple[str, ...] = ("brave", "exa", "tavily")
    max_results: int = 5

    def __post_init__(self) -> None:
        providers = tuple(dict.fromkeys(str(p).strip().lower() for p in self.providers if str(p).strip()))
        object.__setattr__(self, "providers", providers)
        object.__setattr__(self, "max_results", max(1, int(self.max_results or 1)))


@dataclass(frozen=True)
class Evidence:
    url: str
    content: str
    provider: str
    title: str = ""
    truncated: bool = False
    original_length: int = 0
    returned_length: int = 0
    metadata: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not isinstance(self.content, str):
            raise TypeError("evidence content must be text")
        content = self.content
        object.__setattr__(self, "url", str(self.url or "").strip())
        object.__setattr__(self, "content", content)
        object.__setattr__(self, "provider", str(self.provider or "").strip())
        object.__setattr__(self, "title", str(self.title or "").strip())
        original = int(self.original_length or len(content))
        returned = int(self.returned_length or len(content))
        object.__setattr__(self, "original_length", max(0, original))
        object.__setattr__(self, "returned_length", max(0, returned))
        object.__setattr__(self, "truncated", bool(self.truncated))
        object.__setattr__(self, "metadata", _freeze(self.metadata))

    @property
    def body(self) -> str:
        return self.content

    @property
    def id(self) -> str:
        return self.url


__all__ = [
    "Candidate", "Evidence", "FusedCandidate", "RankedCandidate", "RetrievalPolicy", "thaw",
]
