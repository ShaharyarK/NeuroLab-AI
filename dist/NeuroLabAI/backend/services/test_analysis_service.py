import pandas as pd
import numpy as np
from typing import Dict, Any, List, Union
from sklearn.preprocessing import StandardScaler
import torch
import torch.nn as nn
from .base_service import BaseAnalysisService

class TestAnalysisService(BaseAnalysisService):
    def __init__(self):
        super().__init__()
        self.scaler = StandardScaler()
        
        # Comprehensive test categories
        self.test_categories = {
            'blood': {
                'CBC': {
                    'WBC': {'min': 4.5, 'max': 11.0, 'unit': '10^9/L'},
                    'RBC': {'min': 4.5, 'max': 5.5, 'unit': '10^12/L'},
                    'Hemoglobin': {'min': 13.5, 'max': 17.5, 'unit': 'g/dL'},
                    'Hematocrit': {'min': 41.0, 'max': 50.0, 'unit': '%'},
                    'Platelets': {'min': 150, 'max': 450, 'unit': '10^9/L'},
                    'MCV': {'min': 80, 'max': 100, 'unit': 'fL'},
                    'MCH': {'min': 27, 'max': 33, 'unit': 'pg'},
                    'MCHC': {'min': 32, 'max': 36, 'unit': 'g/dL'},
                    'RDW': {'min': 11.5, 'max': 14.5, 'unit': '%'},
                    'Neutrophils': {'min': 2.0, 'max': 7.0, 'unit': '10^9/L'},
                    'Lymphocytes': {'min': 1.0, 'max': 4.0, 'unit': '10^9/L'},
                    'Monocytes': {'min': 0.2, 'max': 0.8, 'unit': '10^9/L'},
                    'Eosinophils': {'min': 0.0, 'max': 0.5, 'unit': '10^9/L'},
                    'Basophils': {'min': 0.0, 'max': 0.2, 'unit': '10^9/L'}
                },
                'LFT': {
                    'ALT': {'min': 7, 'max': 56, 'unit': 'U/L'},
                    'AST': {'min': 10, 'max': 40, 'unit': 'U/L'},
                    'ALP': {'min': 44, 'max': 147, 'unit': 'U/L'},
                    'GGT': {'min': 8, 'max': 61, 'unit': 'U/L'},
                    'Total_Bilirubin': {'min': 0.1, 'max': 1.2, 'unit': 'mg/dL'},
                    'Direct_Bilirubin': {'min': 0.0, 'max': 0.3, 'unit': 'mg/dL'},
                    'Total_Protein': {'min': 6.0, 'max': 8.3, 'unit': 'g/dL'},
                    'Albumin': {'min': 3.5, 'max': 5.0, 'unit': 'g/dL'},
                    'Globulin': {'min': 2.3, 'max': 3.5, 'unit': 'g/dL'},
                    'A/G_Ratio': {'min': 1.1, 'max': 2.2, 'unit': ''}
                },
                'KFT': {
                    'Urea': {'min': 7, 'max': 20, 'unit': 'mg/dL'},
                    'Creatinine': {'min': 0.6, 'max': 1.2, 'unit': 'mg/dL'},
                    'eGFR': {'min': 90, 'max': 120, 'unit': 'mL/min/1.73m²'},
                    'Uric_Acid': {'min': 3.5, 'max': 7.2, 'unit': 'mg/dL'},
                    'Sodium': {'min': 135, 'max': 145, 'unit': 'mmol/L'},
                    'Potassium': {'min': 3.5, 'max': 5.0, 'unit': 'mmol/L'},
                    'Chloride': {'min': 98, 'max': 107, 'unit': 'mmol/L'},
                    'Calcium': {'min': 8.5, 'max': 10.5, 'unit': 'mg/dL'},
                    'Phosphorus': {'min': 2.5, 'max': 4.5, 'unit': 'mg/dL'},
                    'Magnesium': {'min': 1.7, 'max': 2.2, 'unit': 'mg/dL'}
                },
                'Lipid': {
                    'Total_Cholesterol': {'min': 125, 'max': 200, 'unit': 'mg/dL'},
                    'HDL': {'min': 40, 'max': 60, 'unit': 'mg/dL'},
                    'LDL': {'min': 0, 'max': 100, 'unit': 'mg/dL'},
                    'VLDL': {'min': 5, 'max': 40, 'unit': 'mg/dL'},
                    'Triglycerides': {'min': 0, 'max': 150, 'unit': 'mg/dL'},
                    'Chol/HDL_Ratio': {'min': 0, 'max': 5, 'unit': ''}
                },
                'Thyroid': {
                    'TSH': {'min': 0.4, 'max': 4.0, 'unit': 'mIU/L'},
                    'T3': {'min': 80, 'max': 200, 'unit': 'ng/dL'},
                    'T4': {'min': 4.5, 'max': 12.0, 'unit': 'µg/dL'},
                    'Free_T3': {'min': 2.3, 'max': 4.2, 'unit': 'pg/mL'},
                    'Free_T4': {'min': 0.8, 'max': 1.8, 'unit': 'ng/dL'}
                },
                'Diabetes': {
                    'FBS': {'min': 70, 'max': 100, 'unit': 'mg/dL'},
                    'RBS': {'min': 70, 'max': 140, 'unit': 'mg/dL'},
                    'HbA1c': {'min': 4.0, 'max': 5.6, 'unit': '%'},
                    'Insulin': {'min': 2.6, 'max': 24.9, 'unit': 'µIU/mL'},
                    'C_Peptide': {'min': 0.8, 'max': 3.1, 'unit': 'ng/mL'}
                },
                'Inflammatory': {
                    'CRP': {'min': 0, 'max': 5, 'unit': 'mg/L'},
                    'ESR': {'min': 0, 'max': 20, 'unit': 'mm/hr'},
                    'Ferritin': {'min': 30, 'max': 400, 'unit': 'ng/mL'},
                    'D_Dimer': {'min': 0, 'max': 0.5, 'unit': 'µg/mL'},
                    'Procalcitonin': {'min': 0, 'max': 0.1, 'unit': 'ng/mL'}
                }
            },
            'urine': {
                'Routine': {
                    'Color': {'normal': ['Yellow', 'Straw', 'Clear']},
                    'Appearance': {'normal': ['Clear', 'Slightly Hazy']},
                    'pH': {'min': 4.5, 'max': 8.0, 'unit': ''},
                    'Specific_Gravity': {'min': 1.005, 'max': 1.030, 'unit': ''},
                    'Protein': {'min': 0, 'max': 20, 'unit': 'mg/dL'},
                    'Glucose': {'min': 0, 'max': 15, 'unit': 'mg/dL'},
                    'Ketones': {'min': 0, 'max': 5, 'unit': 'mg/dL'},
                    'Blood': {'min': 0, 'max': 3, 'unit': 'RBC/HPF'},
                    'Leukocytes': {'min': 0, 'max': 5, 'unit': 'WBC/HPF'},
                    'Nitrites': {'normal': ['Negative']},
                    'Bacteria': {'min': 0, 'max': 1000, 'unit': 'bacteria/mL'}
                },
                'Culture': {
                    'Bacterial_Count': {'min': 0, 'max': 1000, 'unit': 'CFU/mL'},
                    'Sensitivity': {'normal': ['Sensitive', 'Resistant']}
                }
            },
            'stool': {
                'Routine': {
                    'Color': {'normal': ['Brown', 'Dark Brown']},
                    'Consistency': {'normal': ['Formed', 'Soft']},
                    'pH': {'min': 5.5, 'max': 7.5, 'unit': ''},
                    'Occult_Blood': {'normal': ['Negative']},
                    'WBC': {'min': 0, 'max': 2, 'unit': 'WBC/HPF'},
                    'RBC': {'min': 0, 'max': 0, 'unit': 'RBC/HPF'},
                    'Fat': {'min': 0, 'max': 2, 'unit': 'g/24h'},
                    'Reducing_Substances': {'normal': ['Negative']}
                },
                'Culture': {
                    'Bacterial_Count': {'min': 0, 'max': 1000, 'unit': 'CFU/g'},
                    'Parasites': {'normal': ['Negative']},
                    'Ova': {'normal': ['Negative']}
                }
            }
        }
        self._load_default_model()

    def _load_default_model(self):
        """Load the default model for test analysis."""
        model_name = "test_analysis_model.pt"
        model_path = self.get_model_path(model_name)
        if model_path:
            self.load_model(model_path)
        else:
            # Create a more sophisticated neural network for test analysis
            self.model = nn.Sequential(
                nn.Linear(50, 128),
                nn.ReLU(),
                nn.BatchNorm1d(128),
                nn.Dropout(0.3),
                nn.Linear(128, 64),
                nn.ReLU(),
                nn.BatchNorm1d(64),
                nn.Dropout(0.2),
                nn.Linear(64, 32),
                nn.ReLU(),
                nn.BatchNorm1d(32),
                nn.Dropout(0.1),
                nn.Linear(32, 2)
            ).to(self.device)

    def load_model(self, model_path: str) -> None:
        """Load a custom model from the specified path."""
        try:
            self.model = torch.load(model_path, map_location=self.device)
            self.model.eval()
            self.model_path = model_path
        except Exception as e:
            raise Exception(f"Failed to load model: {str(e)}")

    def analyze(self, test_data: Union[Dict[str, Any], pd.DataFrame]) -> Dict[str, Any]:
        """Analyze the test results and return interpretation."""
        try:
            # Convert input to DataFrame if it's a dictionary
            if isinstance(test_data, dict):
                df = pd.DataFrame([test_data])
            else:
                df = test_data

            # Preprocess the data
            processed_data = self._preprocess_data(df)
            
            # Perform analysis
            results = self._analyze_test_results(processed_data)
            
            # Generate interpretation
            interpretation = self._generate_interpretation(results, df)

            return {
                "results": results,
                "interpretation": interpretation,
                "confidence": self._calculate_confidence(results),
                "timestamp": str(np.datetime64('now')),
                "recommendations": self._generate_recommendations(interpretation)
            }

        except Exception as e:
            raise Exception(f"Analysis failed: {str(e)}")

    def _preprocess_data(self, df: pd.DataFrame) -> torch.Tensor:
        """Preprocess the test data for analysis."""
        # Select numerical columns
        numerical_cols = df.select_dtypes(include=[np.number]).columns
        data = df[numerical_cols].values

        # Scale the data
        scaled_data = self.scaler.fit_transform(data)
        
        # Convert to tensor
        return torch.FloatTensor(scaled_data).to(self.device)

    def _analyze_test_results(self, data: torch.Tensor) -> Dict[str, Any]:
        """Analyze the test results using the model."""
        with torch.no_grad():
            output = self.model(data)
            probabilities = torch.softmax(output, dim=1)
            return {
                "probabilities": probabilities.cpu().numpy(),
                "predictions": torch.argmax(probabilities, dim=1).cpu().numpy()
            }

    def _generate_interpretation(self, results: Dict[str, Any], original_data: pd.DataFrame) -> str:
        """Generate a human-readable interpretation of the results."""
        interpretations = []
        abnormal_tests = []
        
        # Check each test category
        for category, tests in self.test_categories.items():
            for test_type, parameters in tests.items():
                for param, ranges in parameters.items():
                    if param in original_data.columns:
                        value = original_data[param].iloc[0]
                        if self._is_abnormal(value, param, ranges):
                            abnormal_tests.append({
                                'test': test_type,
                                'parameter': param,
                                'value': value,
                                'range': ranges
                            })
                            interpretations.append(
                                f"{test_type} - {param}: {value} {ranges.get('unit', '')} "
                                f"(Reference: {ranges.get('min', '')} - {ranges.get('max', '')})"
                            )

        if not interpretations:
            return "All test results are within normal ranges."
        
        return " | ".join(interpretations)

    def _is_abnormal(self, value: float, param: str, ranges: Dict[str, Any]) -> bool:
        """Check if a test value is abnormal based on reference ranges."""
        if 'normal' in ranges:
            return value not in ranges['normal']
        elif 'min' in ranges and 'max' in ranges:
            return value < ranges['min'] or value > ranges['max']
        return False

    def _calculate_confidence(self, results: Dict[str, Any]) -> float:
        """Calculate the confidence score for the analysis."""
        probabilities = results['probabilities']
        return float(np.max(probabilities, axis=1).mean())

    def _generate_recommendations(self, interpretation: str) -> List[str]:
        """Generate recommendations based on the interpretation."""
        recommendations = []
        
        # Add general recommendations
        if "CBC" in interpretation:
            if "WBC" in interpretation and "high" in interpretation.lower():
                recommendations.append("Consider follow-up for possible infection or inflammation")
            if "Hemoglobin" in interpretation and "low" in interpretation.lower():
                recommendations.append("Consider iron studies and dietary assessment")

        if "LFT" in interpretation:
            if any(x in interpretation.lower() for x in ["alt", "ast", "high"]):
                recommendations.append("Consider viral hepatitis screening and alcohol assessment")
            if "Bilirubin" in interpretation and "high" in interpretation.lower():
                recommendations.append("Consider ultrasound of liver and biliary system")

        if "KFT" in interpretation:
            if "Creatinine" in interpretation and "high" in interpretation.lower():
                recommendations.append("Consider renal ultrasound and proteinuria assessment")
            if "eGFR" in interpretation and "low" in interpretation.lower():
                recommendations.append("Consider nephrology consultation")

        if "Lipid" in interpretation:
            if "LDL" in interpretation and "high" in interpretation.lower():
                recommendations.append("Consider lifestyle modifications and cardiovascular risk assessment")
            if "HDL" in interpretation and "low" in interpretation.lower():
                recommendations.append("Consider exercise and dietary modifications")

        if "Thyroid" in interpretation:
            if "TSH" in interpretation and "high" in interpretation.lower():
                recommendations.append("Consider thyroid ultrasound and anti-TPO antibodies")
            if "TSH" in interpretation and "low" in interpretation.lower():
                recommendations.append("Consider thyroid scan and TRAb assessment")

        if "Diabetes" in interpretation:
            if "HbA1c" in interpretation and "high" in interpretation.lower():
                recommendations.append("Consider OGTT and diabetes education")
            if "Insulin" in interpretation and "high" in interpretation.lower():
                recommendations.append("Consider insulin resistance assessment")

        if "Inflammatory" in interpretation:
            if "CRP" in interpretation and "high" in interpretation.lower():
                recommendations.append("Consider autoimmune screening and inflammatory markers")
            if "ESR" in interpretation and "high" in interpretation.lower():
                recommendations.append("Consider temporal arteritis and polymyalgia rheumatica assessment")

        if "Urine" in interpretation:
            if "Protein" in interpretation and "high" in interpretation.lower():
                recommendations.append("Consider 24-hour urine protein and renal function assessment")
            if "Blood" in interpretation and "positive" in interpretation.lower():
                recommendations.append("Consider urological evaluation and imaging")

        if "Stool" in interpretation:
            if "Occult_Blood" in interpretation and "positive" in interpretation.lower():
                recommendations.append("Consider colonoscopy and upper GI endoscopy")
            if "Parasites" in interpretation and "positive" in interpretation.lower():
                recommendations.append("Consider antiparasitic treatment and follow-up testing")

        return recommendations if recommendations else ["No specific recommendations at this time"] 