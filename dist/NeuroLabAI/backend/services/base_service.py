from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import torch
import os

class BaseAnalysisService(ABC):
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = None
        self.model_path = None

    @abstractmethod
    def load_model(self, model_path: str) -> None:
        """Load the AI model from the specified path."""
        pass

    @abstractmethod
    def analyze(self, data: Any) -> Dict[str, Any]:
        """Analyze the input data and return results."""
        pass

    def get_model_path(self, model_name: str) -> Optional[str]:
        """Get the path to a model file."""
        models_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
        model_path = os.path.join(models_dir, model_name)
        return model_path if os.path.exists(model_path) else None

    def save_analysis_result(self, result: Dict[str, Any], filename: str) -> str:
        """Save analysis results to a file."""
        reports_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "reports")
        os.makedirs(reports_dir, exist_ok=True)
        file_path = os.path.join(reports_dir, filename)
        
        # TODO: Implement result saving logic
        return file_path 