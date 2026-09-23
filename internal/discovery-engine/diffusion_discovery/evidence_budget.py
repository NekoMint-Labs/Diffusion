"""Shared evidence-output budget constants."""

from __future__ import annotations

# Transport-level hard cap on bytes read from one provider response body on the
# read path. The body is streamed, so an oversized or decompressed response is
# never fully buffered before bounding. Exceeding it is a classified
# ``too_large`` provider failure, never a silent truncation.
DEFAULT_FETCH_TRANSPORT_LIMIT = 5 * 1024 * 1024

__all__ = ["DEFAULT_FETCH_TRANSPORT_LIMIT"]
