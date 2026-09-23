"""Diffusion's internal discovery engine.

Diffusion owns discovery: source enablement, discovery credentials, provider
selection, search execution, fetch/read, normalization, deduplication, reranking
where used, retry and degradation behaviour, and the discovery result contract.

Three properties are deliberate and load-bearing:

* **The engine is an implementation detail.** It is never named in the product
  UI. A person chooses sources (Exa, Tavily, Brave); they are never asked to
  choose an engine.
* **Credentials live only in this process's environment**, for the duration of
  one operation. They never appear in an argument list, and nothing here writes
  a credential, a preference or any other file to disk.
* **A search result is a candidate, not evidence.** Only a bounded read of the
  source produces citable content, and the read is bounded by construction.

Provenance: this package originated from selected components of
``onedotmint/smartsearch`` v1.0.3 (commit
``a6e310d8c51d1fb9eb454d27afbbc3f81cc2e61a``) and is now independently
maintained here. See ``../PROVENANCE.md``. SmartSearch compatibility is not a
product contract, and nothing in Diffusion follows SmartSearch releases.
"""

__version__ = "0.1.0"

__all__ = ["__version__"]
