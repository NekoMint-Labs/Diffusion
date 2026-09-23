"""``python -m diffusion_discovery`` — the same entry point the frozen executable uses."""
from .cli import main

if __name__ == "__main__":
    raise SystemExit(main())
