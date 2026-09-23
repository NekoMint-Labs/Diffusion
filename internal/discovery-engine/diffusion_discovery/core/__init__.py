"""The dependency-light domain core: models, normalizers, dedup, ranking, fusion."""
from .models import Candidate, Evidence, FusedCandidate, RankedCandidate, RetrievalPolicy
from .ranking import DEFAULT_RRF_K, canonicalize_url, deduplicate_candidates, reciprocal_rank_fusion

__all__ = [
    "Candidate", "Evidence", "FusedCandidate", "RankedCandidate", "RetrievalPolicy",
    "DEFAULT_RRF_K", "canonicalize_url", "deduplicate_candidates", "reciprocal_rank_fusion",
]
