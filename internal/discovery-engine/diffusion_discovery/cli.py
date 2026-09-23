"""The engine's machine interface: one operation, one JSON envelope.

This is the whole contract between Diffusion and its discovery engine. Two
operations exist — ``search`` and ``read`` — and each emits exactly one
version-1 JSON envelope on stdout:

``{version, operation, status, data, attempts, warnings, error}``

Three properties of that envelope are load-bearing for the product above it:

* **``status`` distinguishes three real answers.** ``complete`` means every
  configured source answered; ``degraded`` means useful results came back while
  some source did not answer; ``failed`` means nothing usable came back. A
  partial result is never reported as a complete one.
* **``attempts`` is a classification, not a transcript.** Only a fixed set of
  error tokens and a fixed sentence per token ever leaves here, so a provider's
  own message, a URL, or a credential cannot cross this boundary.
* **``data.candidates`` is not evidence.** A search returns candidates with a
  snippet and nothing else; only ``read`` returns bounded source content, and the
  person above decides what to do with it.

Everything the engine writes is redacted against the secrets it was handed
before it is printed.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from typing import Any
from collections.abc import Mapping

from .core.models import Evidence, RetrievalPolicy, thaw
from .core.retrieval import RetrievalOutcome, search as core_search
from .evidence.fetch import FetchOutcome, read as core_read
from .security import safe_provider_message, sanitize_data

EXIT_OK = 0
EXIT_INVALID_ARGUMENT = 2
EXIT_CONFIGURATION = 3
EXIT_PROVIDER = 4
EXIT_INTERNAL = 5


# A mode is a fixed retrieval policy, not a knob: the caller names an intent and
# the engine owns what that intent means.
RETRIEVAL_PRESETS: dict[str, int] = {
    "fast": 3,
    "balanced": 5,
    "research": 10,
}


def resolve_preset(mode: str) -> tuple[str, int]:
    """Return the normalized public search mode and its fixed result count."""
    normalized = str(mode or "").strip().lower()
    try:
        max_results = RETRIEVAL_PRESETS[normalized]
    except KeyError as exc:
        raise ValueError("mode must be one of: fast, balanced, research") from exc
    return normalized, max_results


class _Parser(argparse.ArgumentParser):
    def error(self, message: str) -> None:
        # argparse would print usage to stderr and exit; a machine caller must get
        # an envelope instead, so every parser failure becomes a ValueError.
        raise ValueError(message)


_KNOWN_ATTEMPT_ERROR_TYPES = frozenset({
    "config_error", "auth_error", "parameter_error", "timeout", "network_error",
    "rate_limited", "protocol_error", "parse_error", "quality_error", "empty",
    "provider_error", "budget_exhausted", "too_large",
})
_STABLE_ATTEMPT_FIELDS = ("provider", "role", "status", "result_count", "elapsed_ms")


def _safe_attempt(item: Any) -> dict[str, Any]:
    """Serialize only stable attempt fields and classifications."""
    value = item.to_dict() if hasattr(item, "to_dict") else item
    value = thaw(value)
    if not isinstance(value, Mapping):
        return {
            "provider": "provider", "role": "unknown", "status": "failed",
            "result_count": 0, "elapsed_ms": 0.0,
            "error_type": "protocol_error",
            "error": safe_provider_message("protocol_error"),
        }
    result = {key: value[key] for key in _STABLE_ATTEMPT_FIELDS if key in value}
    raw_type = value.get("error_type", "")
    status = result.get("status", "")
    if raw_type:
        error_type = raw_type if isinstance(raw_type, str) and raw_type in _KNOWN_ATTEMPT_ERROR_TYPES else "protocol_error"
    elif status in {"failed", "error"}:
        error_type = "provider_error"
    else:
        error_type = ""
    if error_type:
        result["error_type"] = error_type
        result["error"] = safe_provider_message(error_type)
    return result


def _envelope(
    operation: str,
    status: str,
    data: Any = None,
    *,
    attempts=(),
    warnings=(),
    error=None,
    secrets=(),
) -> dict[str, Any]:
    return {
        "version": 1,
        "operation": operation,
        "status": status,
        "data": sanitize_data(data if data is not None else {}, secrets),
        "attempts": sanitize_data([_safe_attempt(item) for item in attempts], secrets),
        "warnings": sanitize_data([str(item) for item in warnings], secrets),
        "error": sanitize_data(error, secrets),
    }


def _candidate(item: Any) -> dict[str, Any]:
    candidate = item.candidate
    return {
        "url": candidate.url,
        "display_url": candidate.display_url,
        "title": candidate.title,
        "snippet": candidate.snippet,
        "providers": list(candidate.providers),
        "provider_ranks": dict(candidate.provider_ranks),
        "rrf_score": item.rrf_score,
        "rank": item.rank,
    }


def _evidence(item: Evidence) -> dict[str, Any]:
    return {
        "id": item.id,
        "url": item.url,
        "title": item.title,
        "provider": item.provider,
        "content": item.content,
        "truncated": item.truncated,
        "original_length": item.original_length,
        "returned_length": item.returned_length,
    }


def _search_data(outcome: RetrievalOutcome) -> dict[str, Any]:
    return {
        "candidates": [_candidate(item) for item in outcome.ranked],
        "providers": list(outcome.providers),
    }


def _read_data(outcome: FetchOutcome) -> dict[str, Any]:
    return {"evidence": _evidence(outcome.evidence) if outcome.evidence else None}


def _known_secrets() -> tuple[str, ...]:
    """The credentials this process was handed, for redacting everything it prints."""
    try:
        from .config import config
        return config.secret_values()
    except Exception:
        return ()


def _safe_envelope(operation: str, status: str, data: Any = None, **kwargs: Any) -> dict[str, Any]:
    return _envelope(operation, status, data, secrets=_known_secrets(), **kwargs)


def _error(code: str, message: str, *, details: dict[str, Any] | None = None) -> dict[str, Any]:
    result = {"code": code, "message": message}
    if details:
        result["details"] = details
    return result


def _error_code(attempts: Any, default: str = "PROVIDER_ERROR") -> str:
    types = set()
    for item in attempts:
        value = item.get("error_type") if isinstance(item, Mapping) else getattr(item, "error_type", "")
        if value:
            types.add(str(value))
    if "config_error" in types and types <= {"config_error", "empty"}:
        return "CONFIGURATION_ERROR"
    return default


def _status_for_search(outcome: RetrievalOutcome) -> str:
    return "degraded" if outcome.degraded else "complete"


def _status_for_read(outcome: FetchOutcome) -> str:
    if not outcome.evidence:
        return "failed"
    return "degraded" if outcome.degraded else "complete"


async def run_search(query: str, *, mode: str | None = None, registry=None) -> dict[str, Any]:
    if not str(query or "").strip():
        return _safe_envelope("search", "failed", error=_error("INVALID_ARGUMENT", "query is required"))
    from .config import DEFAULT_MODE

    try:
        _selected_mode, policy_max = resolve_preset(DEFAULT_MODE if mode is None else mode)
    except ValueError:
        return _safe_envelope("search", "failed", error=_error("INVALID_ARGUMENT", "invalid search mode"))
    outcome = await core_search(query, RetrievalPolicy(max_results=policy_max), registry=registry)
    status = _status_for_search(outcome)
    error = None
    if outcome.failed:
        # No configured source at all is a configuration fact, not a provider
        # failure: the caller must be able to say "discovery is not set up"
        # rather than "a source broke".
        error = (
            _error("CONFIGURATION_ERROR", "no discovery source is configured")
            if not outcome.providers
            else _error(_error_code(outcome.attempts), "no search source returned usable results")
        )
        status = "failed"
    return _safe_envelope("search", status, _search_data(outcome), attempts=outcome.attempts, error=error)


async def run_read(url: str, *, max_chars: int = 8_000, registry=None) -> dict[str, Any]:
    try:
        outcome = await core_read(url, registry=registry, max_chars=max_chars)
    except ValueError as exc:
        return _safe_envelope("read", "failed", error=_error("INVALID_ARGUMENT", str(exc)))
    error = None
    if not outcome.evidence:
        error = _error(_error_code(outcome.attempts), "no reader returned usable evidence")
    return _safe_envelope("read", _status_for_read(outcome), _read_data(outcome), attempts=outcome.attempts, warnings=outcome.warnings, error=error)


def build_parser() -> argparse.ArgumentParser:
    parser = _Parser(prog="diffusion-discovery", description="Diffusion's discovery engine")
    sub = parser.add_subparsers(dest="operation", required=True, parser_class=_Parser)

    search_parser = sub.add_parser("search", help="search the configured sources for candidates")
    search_parser.add_argument("query")
    search_parser.add_argument("--mode", choices=tuple(RETRIEVAL_PRESETS))
    search_parser.add_argument("--format", choices=("json",), default="json", help=argparse.SUPPRESS)

    read_parser = sub.add_parser("read", help="read one URL into bounded source content")
    read_parser.add_argument("url")
    read_parser.add_argument("--max-chars", type=int, default=8_000)
    read_parser.add_argument("--format", choices=("json",), default="json", help=argparse.SUPPRESS)
    return parser


def _requested_operation(argv: list[str]) -> str:
    for token in argv:
        if token == "--":
            break
        if token in {"search", "read"}:
            return token
    return "unknown"


def _parse(argv: list[str]) -> argparse.Namespace:
    try:
        return build_parser().parse_args(argv)
    except SystemExit:
        raise
    except (argparse.ArgumentError, ValueError) as exc:
        raise ValueError(str(exc)) from None


def _exit_code(payload: dict[str, Any]) -> int:
    if payload["status"] != "failed":
        return EXIT_OK
    code = (payload.get("error") or {}).get("code")
    return {
        "INVALID_ARGUMENT": EXIT_INVALID_ARGUMENT,
        "CONFIGURATION_ERROR": EXIT_CONFIGURATION,
        "PROVIDER_ERROR": EXIT_PROVIDER,
        "INTERNAL_ERROR": EXIT_INTERNAL,
    }.get(code, EXIT_PROVIDER)


def main(argv: list[str] | None = None) -> int:
    raw = list(sys.argv[1:] if argv is None else argv)
    try:
        args = _parse(raw)
    except SystemExit as exc:
        return int(exc.code or 0)
    except ValueError as exc:
        operation = _requested_operation(raw)
        message = str(exc)
        # Parser diagnostics must not echo arbitrary tokens (which may be
        # credentials); retain only stable, useful classifications.
        safe_message = "a required argument is missing" if "required" in message.lower() else "invalid command or arguments"
        payload = _envelope(operation, "failed", error=_error("INVALID_ARGUMENT", safe_message, details={"operation": operation}))
        sys.stdout.write(json.dumps(payload, ensure_ascii=False) + "\n")
        return EXIT_INVALID_ARGUMENT

    try:
        if args.operation == "search":
            payload = asyncio.run(run_search(args.query, mode=args.mode))
        else:
            payload = asyncio.run(run_read(args.url, max_chars=args.max_chars))
    except Exception:
        # One envelope, always, and never the exception's own text.
        payload = _envelope(args.operation, "failed", error=_error("INTERNAL_ERROR", "operation failed"))
    sys.stdout.write(json.dumps(payload, ensure_ascii=False) + "\n")
    return _exit_code(payload)


if __name__ == "__main__":
    raise SystemExit(main())


__all__ = ["EXIT_OK", "RETRIEVAL_PRESETS", "build_parser", "main", "resolve_preset", "run_read", "run_search"]
