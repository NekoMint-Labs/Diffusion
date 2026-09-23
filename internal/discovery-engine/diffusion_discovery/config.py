"""Environment-only settings for the discovery engine.

Diffusion Settings is the authority for configuration. This module reads the
engine's own child-process environment and nothing else, because the two
properties that matter here are both negative ones:

* there is no config file, no config directory and no user-level persistence, so
  the engine can neither write a credential to disk nor pick up a configuration
  file the person never chose in Diffusion;
* nothing in this module creates a file or a directory, so a search or a read has
  no filesystem side effect at all.

The native launcher supplies credentials and enable flags for one operation and
clears every other variable. Base URLs and timeouts exist so an operator can
point a source at a compatible endpoint; they default to the vendor endpoints.
"""

from __future__ import annotations

import os

# One search is bounded by the native caller's own deadline, so the retry budget
# per provider request stays small. These are deliberately not user settings:
# they trade a little latency for surviving a transient upstream failure.
RETRY_MAX_ATTEMPTS = 3
RETRY_MULTIPLIER = 1.0
RETRY_MAX_WAIT = 10

DEFAULT_MODE = "balanced"
ALLOWED_MODES = ("fast", "balanced", "research")

# Every variable the engine reads. Used for redaction: whatever the environment
# holds under these names is a secret that must never reach machine output.
_SECRET_KEYS = ("EXA_API_KEY", "TAVILY_API_KEY", "BRAVE_API_KEY", "JINA_API_KEY")


def _text(name: str, default: str | None = None) -> str | None:
    value = os.getenv(name)
    return default if value is None else value


def _flag(name: str, default: bool = True) -> bool:
    """Read an enable flag leniently.

    An unreadable flag turns a source *off* rather than raising while the
    registry is being built, where the failure would surface as an opaque
    internal error instead of "this source is not enabled".
    """
    value = (_text(name, "true" if default else "false") or "").strip().lower()
    return value in {"true", "1", "yes"}


def _seconds(name: str, default: float = 30.0) -> float:
    try:
        return float(_text(name, str(default)) or default)
    except ValueError:
        return default


class Config:
    """Read-only view of the environment for one engine process."""

    def secret_values(self) -> tuple[str, ...]:
        """Configured secret values, for redacting anything that leaves the engine."""
        return tuple(value for value in (_text(key) for key in _SECRET_KEYS) if value)

    @property
    def retry_max_attempts(self) -> int:
        return RETRY_MAX_ATTEMPTS

    @property
    def retry_multiplier(self) -> float:
        return RETRY_MULTIPLIER

    @property
    def retry_max_wait(self) -> int:
        return RETRY_MAX_WAIT

    @property
    def exa_api_key(self) -> str | None:
        return _text("EXA_API_KEY")

    @property
    def exa_enabled(self) -> bool:
        return _flag("EXA_ENABLED")

    @property
    def exa_base_url(self) -> str:
        return _text("EXA_BASE_URL", "https://api.exa.ai") or "https://api.exa.ai"

    @property
    def exa_timeout(self) -> float:
        return _seconds("EXA_TIMEOUT_SECONDS")

    @property
    def tavily_api_key(self) -> str | None:
        return _text("TAVILY_API_KEY")

    @property
    def tavily_enabled(self) -> bool:
        return _flag("TAVILY_ENABLED")

    @property
    def tavily_api_url(self) -> str:
        return _text("TAVILY_API_URL", "https://api.tavily.com") or "https://api.tavily.com"

    @property
    def tavily_timeout(self) -> float:
        return _seconds("TAVILY_TIMEOUT_SECONDS")

    @property
    def brave_api_key(self) -> str | None:
        return _text("BRAVE_API_KEY")

    @property
    def brave_enabled(self) -> bool:
        return _flag("BRAVE_ENABLED")

    @property
    def brave_api_url(self) -> str:
        return _text("BRAVE_API_URL", "https://api.search.brave.com/res/v1") or "https://api.search.brave.com/res/v1"

    @property
    def brave_timeout(self) -> float:
        return _seconds("BRAVE_TIMEOUT_SECONDS")

    @property
    def jina_api_key(self) -> str | None:
        return _text("JINA_API_KEY")

    @property
    def jina_reader_api_url(self) -> str:
        return _text("JINA_READER_API_URL", "https://r.jina.ai") or "https://r.jina.ai"

    @property
    def jina_respond_with(self) -> str:
        return _text("JINA_RESPOND_WITH", "") or ""

    @property
    def jina_timeout(self) -> float:
        return _seconds("JINA_TIMEOUT_SECONDS")


config = Config()

__all__ = ["ALLOWED_MODES", "Config", "DEFAULT_MODE", "RETRY_MAX_ATTEMPTS", "RETRY_MAX_WAIT", "RETRY_MULTIPLIER", "config"]
