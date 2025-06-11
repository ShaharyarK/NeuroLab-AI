import os
import sys
import logging
from datetime import datetime
from pathlib import Path

class InstallLogger:
    def __init__(self, install_dir: str):
        self.install_dir = Path(install_dir)
        self.log_dir = self.install_dir / "logs"
        self.log_dir.mkdir(parents=True, exist_ok=True)
        
        # Create log file with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.log_file = self.log_dir / f"install_{timestamp}.log"
        
        # Configure logging
        self.logger = logging.getLogger("NeuroLabAI_Installer")
        self.logger.setLevel(logging.INFO)
        
        # File handler
        file_handler = logging.FileHandler(self.log_file)
        file_handler.setLevel(logging.INFO)
        file_formatter = logging.Formatter(
            '%(asctime)s - %(levelname)s - %(message)s'
        )
        file_handler.setFormatter(file_formatter)
        self.logger.addHandler(file_handler)
        
        # Console handler
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.INFO)
        console_formatter = logging.Formatter(
            '%(asctime)s - %(levelname)s - %(message)s'
        )
        console_handler.setFormatter(console_formatter)
        self.logger.addHandler(console_handler)

    def info(self, message: str):
        """Log info message"""
        self.logger.info(message)

    def error(self, message: str):
        """Log error message"""
        self.logger.error(message)

    def warning(self, message: str):
        """Log warning message"""
        self.logger.warning(message)

    def debug(self, message: str):
        """Log debug message"""
        self.logger.debug(message)

    def get_log_path(self) -> str:
        """Get the path to the log file"""
        return str(self.log_file) 