import torch
import monai
from monai.transforms import (
    Compose,
    LoadImage,
    ScaleIntensity,
    Resize,
    ToTensor,
)
from PIL import Image
import numpy as np
from typing import Dict, Any, Union
import os
from .base_service import BaseAnalysisService

class ImagingAnalysisService(BaseAnalysisService):
    def __init__(self, modality: str):
        super().__init__()
        self.modality = modality.lower()
        self.transforms = self._get_transforms()
        self._load_default_model()

    def _get_transforms(self):
        """Get the appropriate transforms for the imaging modality."""
        return Compose([
            LoadImage(image_only=True),
            ScaleIntensity(),
            Resize((224, 224)),
            ToTensor(),
        ])

    def _load_default_model(self):
        """Load the default model for the specified modality."""
        model_name = f"{self.modality}_model.pt"
        model_path = self.get_model_path(model_name)
        if model_path:
            self.load_model(model_path)
        else:
            # Load a pre-trained model from MONAI
            if self.modality == "xray":
                self.model = monai.networks.nets.DenseNet121(
                    spatial_dims=2,
                    in_channels=1,
                    out_channels=2
                )
            elif self.modality in ["mri", "ct"]:
                self.model = monai.networks.nets.UNet(
                    spatial_dims=3,
                    in_channels=1,
                    out_channels=2,
                    channels=(16, 32, 64, 128, 256),
                    strides=(2, 2, 2, 2),
                )
            self.model = self.model.to(self.device)

    def load_model(self, model_path: str) -> None:
        """Load a custom model from the specified path."""
        try:
            self.model = torch.load(model_path, map_location=self.device)
            self.model.eval()
            self.model_path = model_path
        except Exception as e:
            raise Exception(f"Failed to load model: {str(e)}")

    def analyze(self, image_path: Union[str, Image.Image]) -> Dict[str, Any]:
        """Analyze the medical image and return results."""
        try:
            # Prepare the image
            if isinstance(image_path, str):
                image = self.transforms(image_path)
            else:
                image = self.transforms(np.array(image_path))
            
            # Add batch dimension and move to device
            image = image.unsqueeze(0).to(self.device)

            # Perform inference
            with torch.no_grad():
                output = self.model(image)
                probabilities = torch.softmax(output, dim=1)
                confidence, prediction = torch.max(probabilities, dim=1)

            # Get the result based on modality
            result = self._get_result(prediction.item(), confidence.item())

            return {
                "result": result,
                "confidence": confidence.item(),
                "modality": self.modality,
                "timestamp": str(np.datetime64('now')),
            }

        except Exception as e:
            raise Exception(f"Analysis failed: {str(e)}")

    def _get_result(self, prediction: int, confidence: float) -> str:
        """Get the analysis result based on the prediction."""
        if self.modality == "xray":
            results = ["Normal", "Abnormal"]
        elif self.modality == "mri":
            results = ["No significant findings", "Abnormal findings detected"]
        elif self.modality == "ct":
            results = ["Normal scan", "Abnormalities detected"]
        else:
            results = ["Normal", "Abnormal"]

        return results[prediction] 