"""Entry point of the frozen discovery executable.

PyInstaller targets this file. It lives in the repository rather than being
generated into a scratch build directory so that the shipped artifact is
produced from Diffusion-owned source that can be reviewed and hashed like any
other source file.
"""
from diffusion_discovery.cli import main

if __name__ == "__main__":
    raise SystemExit(main())
