# Coherent slice B

Preserves the v0.1 core. Adds frozen Thread wording and separate Deep Dive, active-session lifecycle debt, coalesced persistence, versioned Dexie upgrade source, staged evidence retrieval/reasoning, explicit Chat/Responses wire adapters and safe request diagnostics.

Verification before snapshot: syntax/local imports and strict dependency-independent core typecheck PASS; 77/77 offline tests PASS. Actual Hono/Zod/Dexie migration tests are authored but cannot execute without npm dependencies. This is not a full-app runtime claim.
