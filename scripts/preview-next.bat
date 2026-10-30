@echo off
setlocal
cd /d "%~dp0.."
where py >nul 2>nul
if not errorlevel 1 (
    py -3 "%~dp0preview-next.py"
    goto done
)
where python >nul 2>nul
if not errorlevel 1 (
    python "%~dp0preview-next.py"
    goto done
)
echo Python 3 is required. Install Python 3, then run this launcher again.
:done
pause
