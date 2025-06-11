@echo off
cd /d "%~dp0"

REM Check for Python
python --version >nul 2>&1
if errorlevel 1 (
    echo Python is not installed. Please install Python 3.10 or later from https://www.python.org/downloads/
    echo After installing Python, please run this installer again.
    pause
    exit /b 1
)

REM Check Python version
for /f "tokens=2" %%I in ('python --version 2^>^&1') do set PYTHON_VERSION=%%I
for /f "tokens=1,2 delims=." %%a in ("%%PYTHON_VERSION%%") do (
    if %%a LSS 3 (
        echo Python 3.10 or later is required. Current version: %%PYTHON_VERSION%%
        echo Please upgrade Python from https://www.python.org/downloads/
        pause
        exit /b 1
    )
    if %%a EQU 3 if %%b LSS 10 (
        echo Python 3.10 or later is required. Current version: %%PYTHON_VERSION%%
        echo Please upgrade Python from https://www.python.org/downloads/
        pause
        exit /b 1
    )
)

REM Create virtual environment if it doesn't exist
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment and install requirements
echo Installing requirements...
call venv\Scripts\activate.bat
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

REM Run the installer
python launcher.py --install-dir "%~dp0"
