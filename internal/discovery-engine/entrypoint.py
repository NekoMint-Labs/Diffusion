"""Entry point of the frozen discovery executable.

PyInstaller targets this file. It lives in the repository rather than being
generated into a scratch build directory so that the shipped artifact is
produced from Diffusion-owned source that can be reviewed and hashed like any
other source file.
"""
import sys

from diffusion_discovery.cli import main

if __name__ == "__main__":
    # The native host reads UTF-8 JSON. A redirected Windows pipe otherwise uses
    # the system code page, which cannot represent every public search result.
    sys.stdout.reconfigure(encoding="utf-8")
    raise SystemExit(main())
