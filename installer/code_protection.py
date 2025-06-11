import os
import shutil
import base64
from pathlib import Path
import pyarmor
import subprocess
from cryptography.fernet import Fernet
import json
from typing import List, Dict
import logging

class CodeProtection:
    def __init__(self, install_dir: Path):
        self.install_dir = install_dir
        self.key = Fernet.generate_key()
        self.cipher_suite = Fernet(self.key)


    def _encrypt_file(self, file_path: Path) -> None:
        """Encrypt a single file"""
        try:
            with open(file_path, 'rb') as file:
                file_data = file.read()
            encrypted_data = self.cipher_suite.encrypt(file_data)
            with open(file_path, 'wb') as file:
                file.write(encrypted_data)
            self.logger.info(f"Encrypted: {file_path}")
        except Exception as e:
            self.logger.error(f"Error encrypting {file_path}: {str(e)}")

    def _obfuscate_python(self, file_path: Path) -> None:
        """Obfuscate Python code using PyArmor"""
        try:
            pyarmor.main(['obfuscate', '--recursive', str(file_path)])
            self.logger.info(f"Obfuscated: {file_path}")
        except Exception as e:
            self.logger.error(f"Error obfuscating {file_path}: {str(e)}")

    def _compile_flutter(self, flutter_dir: Path) -> None:
        """Compile Flutter code to native binary"""
        try:
            # Build Flutter app in release mode
            subprocess.run([
                'flutter', 'build', 'windows', '--release'
            ], cwd=flutter_dir, check=True)
            self.logger.info(f"Compiled Flutter app in {flutter_dir}")
        except Exception as e:
            self.logger.error(f"Error compiling Flutter app: {str(e)}")

    def _protect_backend(self) -> None:
        """Protect backend Python code"""
        backend_dir = self.install_dir / 'backend'
        
        # Files to protect
        python_files = [
            'main.py',
            'services/*.py',
            'models/*.py',
            'utils/*.py'
        ]

        # Obfuscate Python files
        for pattern in python_files:
            for file_path in backend_dir.glob(pattern):
                if file_path.is_file():
                    self._obfuscate_python(file_path)

        # Encrypt sensitive files
        sensitive_files = [
            'config/*.json',
            'models/*.pt',
            'data/*.db'
        ]

        for pattern in sensitive_files:
            for file_path in backend_dir.glob(pattern):
                if file_path.is_file():
                    self._encrypt_file(file_path)

    def _protect_frontend(self) -> None:
        """Protect frontend Flutter code"""
        frontend_dir = self.install_dir / 'frontend'
        
        # Compile Flutter to native binary
        self._compile_flutter(frontend_dir)

        # Remove source code after compilation
        source_dirs = ['lib', 'test']
        for dir_name in source_dirs:
            source_dir = frontend_dir / dir_name
            if source_dir.exists():
                shutil.rmtree(source_dir)

    def _save_key(self) -> None:
        """Save encryption key securely"""
        key_dir = self.install_dir / 'config' / 'security'
        key_dir.mkdir(parents=True, exist_ok=True)
        
        # Save key in a secure location
        key_path = key_dir / 'key.bin'
        with open(key_path, 'wb') as f:
            f.write(self.key)
        
        # Set restrictive permissions
        os.chmod(key_path, 0o600)
        self.logger.info("Encryption key saved securely")

    def protect(self) -> None:
        """Main protection method"""
        self.logger.info("Starting code protection process")
        
        try:
            # Create necessary directories
            (self.install_dir / 'logs').mkdir(exist_ok=True)
            
            # Protect backend
            self.logger.info("Protecting backend code...")
            self._protect_backend()
            
            # Protect frontend
            self.logger.info("Protecting frontend code...")
            self._protect_frontend()
            
            # Save encryption key
            self._save_key()
            
            self.logger.info("Code protection completed successfully")
        except Exception as e:
            self.logger.error(f"Error during code protection: {str(e)}")
            raise 