import os
import sys
import platform
import subprocess
import shutil
from pathlib import Path
import PyInstaller.__main__


class InstallerBuilder:
    def __init__(self):
        self.os_type = platform.system().lower()
        self.project_root = Path(__file__).parent.parent
        self.build_dir = self.project_root / "build"
        self.dist_dir = self.project_root / "dist"
        self.installer_dir = self.project_root / "installer"

    def _get_default_install_path(self) -> str:
        """Get default installation path based on OS"""
        if self.os_type == "windows":
            return "$PROGRAMFILES\\NeuroLabAI"
        elif self.os_type == "darwin":
            return "/Applications/NeuroLabAI"
        else:  # Linux
            return "/usr/local/neurolabai"

    def _create_venv(self) -> None:
        """Create a virtual environment for building"""
        venv_path = self.build_dir / "venv"
        if not venv_path.exists():
            subprocess.run([sys.executable, "-m", "venv", str(venv_path)])

        # Get pip path
        if self.os_type == "windows":
            pip_path = venv_path / "Scripts" / "pip.exe"
        else:
            pip_path = venv_path / "bin" / "pip"

        # Install required packages
        subprocess.run([
            str(pip_path), "install",
            "-r", str(self.installer_dir / "requirements.txt"),
            "pyinstaller"
        ])

    def _build_launcher(self) -> None:
        """Build the launcher executable"""
        launcher_path = self.installer_dir / "launcher.py"

        PyInstaller.__main__.run([
            str(launcher_path),
            "--onefile",
            "--name", "NeuroLabAI_Installer",
            "--add-data", f"{self.installer_dir / 'config.json'}:.",
            "--add-data", f"{self.installer_dir / 'logger.py'}:.",
            "--hidden-import", "pyarmor",
            "--hidden-import", "cryptography",
            "--hidden-import", "winshell; platform_system == 'Windows'",
            "--hidden-import", "win32com.client; platform_system == 'Windows'",
        ])

    def _create_post_install_scripts(self) -> None:
        """Create post-install scripts for different OS"""
        scripts_dir = self.build_dir / "scripts"
        scripts_dir.mkdir(exist_ok=True)

        # Windows post-install script
        with open(scripts_dir / "postinstall.bat", "w") as f:
            f.write("""@echo off
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
call venv\\Scripts\\activate.bat

REM Install PyTorch first
echo Installing PyTorch...
python -m pip install --upgrade pip
python -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

REM Install other requirements
echo Installing other requirements...
python -m pip install -r requirements.txt

REM Run the installer
python launcher.py --install-dir "%~dp0"
""")

        # macOS post-install script
        with open(scripts_dir / "postinstall", "w") as f:
            f.write("""#!/bin/bash
# Ensure script is run with sudo
if [ "$EUID" -ne 0 ]; then
    echo "This script must be run with sudo"
    exit 1
fi

# Check for Python 3
if ! command -v python3 &> /dev/null; then
    echo "Python 3 is not installed. Please install Python 3.10 or later from https://www.python.org/downloads/"
    echo "You can also install it using Homebrew: brew install python@3.10"
    exit 1
fi

# Check Python version
PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
if (( $(echo "$PYTHON_VERSION < 3.10" | bc -l) )); then
    echo "Python 3.10 or later is required. Current version: $PYTHON_VERSION"
    echo "Please upgrade Python from https://www.python.org/downloads/"
    echo "Or using Homebrew: brew upgrade python@3.10"
    exit 1
fi

INSTALL_DIR="/Applications/NeuroLabAI"
cd "$INSTALL_DIR"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment and install requirements
echo "Installing requirements..."
source venv/bin/activate

# Install PyTorch first
echo "Installing PyTorch..."
python3 -m pip install --upgrade pip
python3 -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Install other requirements
echo "Installing other requirements..."
python3 -m pip install -r requirements.txt

# Set permissions
chmod -R 755 .
./install --install-dir "$INSTALL_DIR"
""")
        os.chmod(scripts_dir / "postinstall", 0o755)

        # Linux post-install script
        with open(scripts_dir / "postinstall.sh", "w") as f:
            f.write("""#!/bin/bash
INSTALL_DIR="$(dirname "$0")"
cd "$INSTALL_DIR"

# Check for Python 3
if ! command -v python3 &> /dev/null; then
    echo "Python 3 is not installed. Please install Python 3.10 or later:"
    echo "Ubuntu/Debian: sudo apt-get install python3.10"
    echo "Fedora: sudo dnf install python3.10"
    echo "Arch Linux: sudo pacman -S python3"
    exit 1
fi

# Check Python version
PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
if (( $(echo "$PYTHON_VERSION < 3.10" | bc -l) )); then
    echo "Python 3.10 or later is required. Current version: $PYTHON_VERSION"
    echo "Please upgrade Python using your package manager:"
    echo "Ubuntu/Debian: sudo apt-get install python3.10"
    echo "Fedora: sudo dnf install python3.10"
    echo "Arch Linux: sudo pacman -S python3"
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment and install requirements
echo "Installing requirements..."
source venv/bin/activate

# Install PyTorch first
echo "Installing PyTorch..."
python3 -m pip install --upgrade pip
python3 -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Install other requirements
echo "Installing other requirements..."
python3 -m pip install -r requirements.txt

# Set permissions
chmod -R 755 .
./install --install-dir "$INSTALL_DIR"
""")
        os.chmod(scripts_dir / "postinstall.sh", 0o755)

    def _package_application(self) -> None:
        """Package the application files"""
        # Create distribution directory
        dist_path = self.dist_dir / "NeuroLabAI"
        dist_path.mkdir(parents=True, exist_ok=True)

        # Copy application files
        shutil.copytree(
            self.project_root / "backend",
            dist_path / "backend",
            dirs_exist_ok=True
        )
        shutil.copytree(
            self.project_root / "neuro_lab_ai",
            dist_path / "frontend",
            dirs_exist_ok=True
        )

        # Copy installer and scripts
        if self.os_type == "windows":
            shutil.copy(
                self.dist_dir / "NeuroLabAI_Installer.exe",
                dist_path / "install.exe"
            )
            shutil.copy(
                self.build_dir / "scripts" / "postinstall.bat",
                dist_path / "postinstall.bat"
            )
        else:
            shutil.copy(
                self.dist_dir / "NeuroLabAI_Installer",
                dist_path / "install"
            )
            shutil.copy(
                self.build_dir / "scripts" / "postinstall",
                dist_path / "postinstall"
            )
            os.chmod(dist_path / "install", 0o755)
            os.chmod(dist_path / "postinstall", 0o755)

    def _create_installer_package(self) -> None:
        """Create the final installer package"""
        if self.os_type == "windows":
            self._create_windows_installer()
        elif self.os_type == "darwin":
            self._create_macos_installer()
        else:
            self._create_linux_installer()

    def _create_windows_installer(self) -> None:
        """Create Windows installer using NSIS"""
        nsis_script = self.installer_dir / "windows_installer.nsi"
        with open(nsis_script, "w") as f:
            f.write(f"""
!include "MUI2.nsh"
!include "LogicLib.nsh"

Name "NeuroLabAI"
OutFile "NeuroLabAI_Setup.exe"
InstallDir "{self._get_default_install_path()}"
InstallDirRegKey HKCU "Software\\NeuroLabAI" "Install_Dir"

!define MUI_ABORTWARNING

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "LICENSE.txt"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

Var LogViewer

Function .onInit
    StrCpy $LogViewer "notepad.exe"
FunctionEnd

Section "Install"
    SetOutPath "$INSTDIR"
    File /r "{self.dist_dir}\\NeuroLabAI\\*.*"
    
    # Save installation directory
    WriteRegStr HKCU "Software\\NeuroLabAI" "Install_Dir" "$INSTDIR"
    
    # Run post-install script
    ExecWait '"$INSTDIR\\postinstall.bat"'
    
    # Create log viewer shortcut
    CreateDirectory "$SMPROGRAMS\\NeuroLabAI"
    CreateShortCut "$SMPROGRAMS\\NeuroLabAI\\View Logs.lnk" "$LogViewer" "$INSTDIR\\logs\\install.log"
    CreateShortCut "$SMPROGRAMS\\NeuroLabAI\\NeuroLabAI.lnk" "$INSTDIR\\install.exe"
    CreateShortCut "$DESKTOP\\NeuroLabAI.lnk" "$INSTDIR\\install.exe"
    
    WriteUninstaller "$INSTDIR\\uninstall.exe"
SectionEnd

Section "Uninstall"
    # Remove registry keys
    DeleteRegKey HKCU "Software\\NeuroLabAI"
    
    # Remove files and shortcuts
    RMDir /r "$INSTDIR"
    Delete "$SMPROGRAMS\\NeuroLabAI\\*.*"
    RMDir "$SMPROGRAMS\\NeuroLabAI"
    Delete "$DESKTOP\\NeuroLabAI.lnk"
SectionEnd
""")

        # Run NSIS compiler
        subprocess.run(["makensis", str(nsis_script)])

    def _create_macos_installer(self) -> None:
        """Create macOS installer package"""
        # Create .pkg structure
        pkg_dir = self.build_dir / "pkg"
        pkg_dir.mkdir(exist_ok=True)

        # Create distribution.xml for custom installation
        with open(pkg_dir / "distribution.xml", "w") as f:
            f.write("""<?xml version="1.0" encoding="utf-8"?>
<installer-gui-script minSpecVersion="1">
    <title>NeuroLabAI</title>
    <organization>com.neurolabai</organization>
    <domains enable_localSystem="true"/>
    <options customize="allow" require-scripts="true"/>
    <volume-check>
        <allowed-os-versions>
            <os-version min="10.13"/>
        </allowed-os-versions>
    </volume-check>
    <choices-outline>
        <line choice="default">
            <line choice="com.neurolabai.app"/>
        </line>
    </choices-outline>
    <choice id="default"/>
    <choice id="com.neurolabai.app" title="NeuroLabAI">
        <pkg-ref id="com.neurolabai.app"/>
    </choice>
    <pkg-ref id="com.neurolabai.app" auth="Root">#NeuroLabAI.pkg</pkg-ref>
    <script>
        function installationStarted() {
            my.result.message = "Installation started...";
            my.result.type = "Note";
        }
        function installationCompleted() {
            my.result.message = "Installation completed successfully!";
            my.result.type = "Note";
            // Run post-install script with sudo
            system.run('/usr/bin/sudo', ['/Applications/NeuroLabAI/postinstall']);
        }
    </script>
</installer-gui-script>""")

        # Copy files
        shutil.copytree(
            self.dist_dir / "NeuroLabAI",
            pkg_dir / "NeuroLabAI",
            dirs_exist_ok=True
        )

        # Create package with post-install script
        subprocess.run([
            "pkgbuild",
            "--root", str(pkg_dir),
            "--install-location", "/Applications",
            "--identifier", "com.neurolabai.app",
            "--version", "1.0",
            "--scripts", str(self.build_dir / "scripts"),
            str(pkg_dir / "NeuroLabAI.pkg")
        ])

        # Create final installer
        subprocess.run([
            "productbuild",
            "--distribution", str(pkg_dir / "distribution.xml"),
            "--package-path", str(pkg_dir),
            str(self.dist_dir / "NeuroLabAI.pkg")
        ])

    def _create_linux_installer(self) -> None:
        """Create Linux installer package"""
        # Create .deb package
        deb_dir = self.build_dir / "deb"
        deb_dir.mkdir(exist_ok=True)

        # Create package structure
        os.makedirs(deb_dir / "usr" / "local" / "neurolabai", exist_ok=True)
        os.makedirs(deb_dir / "usr" / "share" / "applications", exist_ok=True)

        # Copy files
        shutil.copytree(
            self.dist_dir / "NeuroLabAI",
            deb_dir / "usr" / "local" / "neurolabai",
            dirs_exist_ok=True
        )

        # Create .desktop files
        with open(deb_dir / "usr" / "share" / "applications" / "neurolabai.desktop", "w") as f:
            f.write("""[Desktop Entry]
Name=NeuroLabAI
Comment=AI-powered laboratory analysis platform
Exec=/usr/local/neurolabai/install
Icon=/usr/local/neurolabai/icon.png
Terminal=false
Type=Application
Categories=Science;Medical;
""")

        with open(deb_dir / "usr" / "share" / "applications" / "neurolabai-logs.desktop", "w") as f:
            f.write("""[Desktop Entry]
Name=NeuroLabAI Logs
Comment=View NeuroLabAI installation logs
Exec=xdg-open /usr/local/neurolabai/logs
Icon=/usr/local/neurolabai/icon.png
Terminal=false
Type=Application
Categories=Science;Medical;
""")

        # Create control file
        control_dir = deb_dir / "DEBIAN"
        control_dir.mkdir(exist_ok=True)
        with open(control_dir / "control", "w") as f:
            f.write("""Package: neurolabai
Version: 1.0
Section: science
Priority: optional
Architecture: amd64
Depends: python3 (>= 3.10)
Maintainer: NeuroLabAI Team
Description: AI-powered laboratory analysis platform
""")

        # Create postinst script
        with open(control_dir / "postinst", "w") as f:
            f.write("""#!/bin/bash
INSTALL_DIR="/usr/local/neurolabai"
cd "$INSTALL_DIR"
chmod -R 755 .
./postinstall.sh --install-dir "$INSTALL_DIR"
""")
        os.chmod(control_dir / "postinst", 0o755)

        # Build .deb package
        subprocess.run([
            "dpkg-deb",
            "--build",
            str(deb_dir),
            str(self.dist_dir / "neurolabai.deb")
        ])

    def build(self) -> None:
        """Main build method"""
        print("Building NeuroLabAI installer...")

        # Create build environment
        self._create_venv()

        # Create post-install scripts
        self._create_post_install_scripts()

        # Build launcher
        self._build_launcher()

        # Package application
        self._package_application()

        # Create installer
        self._create_installer_package()

        print("Build complete!")
        print(f"Installer can be found in: {self.dist_dir}")


if __name__ == "__main__":
    builder = InstallerBuilder()
    builder.build()
