#!/usr/bin/env python3
import os
import sys
import platform
import subprocess
import shutil
from pathlib import Path
import json
import venv
import webbrowser
from typing import Dict, List
from code_protection import CodeProtection

class NeuroLabLauncher:
    def __init__(self):
        self.os_type = platform.system().lower()
        self.install_dir = self._get_install_dir()
        self.config = self._load_config()
        
    def _get_install_dir(self) -> Path:
        """Get the installation directory based on OS"""
        if self.os_type == "windows":
            return Path(os.environ["PROGRAMFILES"]) / "NeuroLabAI"
        elif self.os_type == "darwin":  # macOS
            return Path("/Applications/NeuroLabAI")
        else:  # Linux
            return Path.home() / ".neurolabai"

    def _load_config(self) -> Dict:
        """Load configuration from config.json"""
        config_path = Path(__file__).parent / "config.json"
        if config_path.exists():
            with open(config_path) as f:
                return json.load(f)
        return {}

    def _create_venv(self) -> None:
        """Create Python virtual environment"""
        venv_path = self.install_dir / "venv"
        if not venv_path.exists():
            print("Creating virtual environment...")
            venv.create(venv_path, with_pip=True)

    def _install_dependencies(self) -> None:
        """Install Python dependencies"""
        print("Installing dependencies...")
        pip_path = self.install_dir / "venv" / "bin" / "pip"
        if self.os_type == "windows":
            pip_path = self.install_dir / "venv" / "Scripts" / "pip.exe"
        
        requirements_path = Path(__file__).parent.parent / "requirements.txt"
        subprocess.run([str(pip_path), "install", "-r", str(requirements_path)])

    def _setup_backend(self) -> None:
        """Setup backend service"""
        print("Setting up backend...")
        backend_dir = self.install_dir / "backend"
        if not backend_dir.exists():
            shutil.copytree(
                Path(__file__).parent.parent / "backend",
                backend_dir
            )

    def _setup_frontend(self) -> None:
        """Setup frontend application"""
        print("Setting up frontend...")
        frontend_dir = self.install_dir / "frontend"
        if not frontend_dir.exists():
            shutil.copytree(
                Path(__file__).parent.parent / "neuro_lab_ai",
                frontend_dir
            )

    def _create_shortcuts(self) -> None:
        """Create desktop shortcuts"""
        print("Creating shortcuts...")
        if self.os_type == "windows":
            self._create_windows_shortcut()
        elif self.os_type == "darwin":
            self._create_macos_shortcut()
        else:
            self._create_linux_shortcut()

    def _create_windows_shortcut(self) -> None:
        """Create Windows shortcut"""
        import winshell
        from win32com.client import Dispatch
        
        desktop = winshell.desktop()
        path = os.path.join(desktop, "NeuroLabAI.lnk")
        
        shell = Dispatch('WScript.Shell')
        shortcut = shell.CreateShortCut(path)
        shortcut.Targetpath = str(self.install_dir / "launcher.bat")
        shortcut.WorkingDirectory = str(self.install_dir)
        shortcut.save()

    def _create_macos_shortcut(self) -> None:
        """Create macOS shortcut"""
        app_path = self.install_dir / "NeuroLabAI.app"
        if not app_path.exists():
            # Create .app bundle
            os.makedirs(app_path / "Contents" / "MacOS", exist_ok=True)
            os.makedirs(app_path / "Contents" / "Resources", exist_ok=True)
            
            # Create Info.plist
            with open(app_path / "Contents" / "Info.plist", "w") as f:
                f.write(f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>launcher</string>
    <key>CFBundleIdentifier</key>
    <string>com.neurolabai.app</string>
    <key>CFBundleName</key>
    <string>NeuroLabAI</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
</dict>
</plist>""")
            
            # Create launcher script
            launcher_path = app_path / "Contents" / "MacOS" / "launcher"
            with open(launcher_path, "w") as f:
                f.write(f"""#!/bin/bash
cd "{self.install_dir}"
source venv/bin/activate
python launcher.py
""")
            os.chmod(launcher_path, 0o755)

    def _create_linux_shortcut(self) -> None:
        """Create Linux shortcut"""
        desktop_file = Path.home() / ".local" / "share" / "applications" / "neurolabai.desktop"
        os.makedirs(desktop_file.parent, exist_ok=True)
        
        with open(desktop_file, "w") as f:
            f.write(f"""[Desktop Entry]
Name=NeuroLabAI
Comment=AI-powered laboratory analysis platform
Exec={self.install_dir}/launcher.sh
Icon={self.install_dir}/icon.png
Terminal=false
Type=Application
Categories=Science;Medical;
""")

    def _create_launcher_scripts(self) -> None:
        """Create OS-specific launcher scripts"""
        if self.os_type == "windows":
            self._create_windows_launcher()
        elif self.os_type == "darwin":
            self._create_macos_launcher()
        else:
            self._create_linux_launcher()

    def _create_windows_launcher(self) -> None:
        """Create Windows launcher script"""
        launcher_path = self.install_dir / "launcher.bat"
        with open(launcher_path, "w") as f:
            f.write(f"""@echo off
cd /d "{self.install_dir}"
call venv\\Scripts\\activate
start /B python backend\\main.py
timeout /t 5
start http://localhost:511
""")

    def _create_macos_launcher(self) -> None:
        """Create macOS launcher script"""
        launcher_path = self.install_dir / "launcher.sh"
        with open(launcher_path, "w") as f:
            f.write(f"""#!/bin/bash
cd "{self.install_dir}"
source venv/bin/activate
python backend/main.py &
sleep 5
open http://localhost:511
""")
        os.chmod(launcher_path, 0o755)

    def _create_linux_launcher(self) -> None:
        """Create Linux launcher script"""
        launcher_path = self.install_dir / "launcher.sh"
        with open(launcher_path, "w") as f:
            f.write(f"""#!/bin/bash
cd "{self.install_dir}"
source venv/bin/activate
python backend/main.py &
sleep 5
xdg-open http://localhost:511
""")
        os.chmod(launcher_path, 0o755)

    def install(self) -> None:
        """Main installation method"""
        print(f"Installing NeuroLabAI for {self.os_type}...")
        
        # Create installation directory
        os.makedirs(self.install_dir, exist_ok=True)
        
        # Setup steps
        self._create_venv()
        self._install_dependencies()
        self._setup_backend()
        self._setup_frontend()
        self._create_launcher_scripts()
        self._create_shortcuts()
        
        # Protect source code
        print("Protecting source code...")
        code_protection = CodeProtection(self.install_dir)
        code_protection.protect()
        
        print("Installation complete!")
        print(f"NeuroLabAI has been installed to: {self.install_dir}")
        print("You can now launch the application from your desktop or start menu.")

    def uninstall(self) -> None:
        """Uninstall the application"""
        print("Uninstalling NeuroLabAI...")
        
        # Remove installation directory
        if self.install_dir.exists():
            shutil.rmtree(self.install_dir)
        
        # Remove shortcuts
        if self.os_type == "windows":
            shortcut_path = os.path.join(winshell.desktop(), "NeuroLabAI.lnk")
            if os.path.exists(shortcut_path):
                os.remove(shortcut_path)
        elif self.os_type == "darwin":
            app_path = Path("/Applications/NeuroLabAI.app")
            if app_path.exists():
                shutil.rmtree(app_path)
        else:
            desktop_file = Path.home() / ".local" / "share" / "applications" / "neurolabai.desktop"
            if desktop_file.exists():
                os.remove(desktop_file)
        
        print("Uninstallation complete!")

if __name__ == "__main__":
    launcher = NeuroLabLauncher()
    
    if len(sys.argv) > 1 and sys.argv[1] == "--uninstall":
        launcher.uninstall()
    else:
        launcher.install() 