import unittest
import os
import torch
import numpy as np
from PIL import Image
from services.imaging_service import ImagingAnalysisService
from services.test_analysis_service import TestAnalysisService

class TestImagingService(unittest.TestCase):
    def setUp(self):
        self.xray_service = ImagingAnalysisService("xray")
        self.mri_service = ImagingAnalysisService("mri")
        self.ct_service = ImagingAnalysisService("ct")
        
        # Create a dummy image for testing
        self.test_image = Image.fromarray(np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8))

    def test_xray_analysis(self):
        result = self.xray_service.analyze(self.test_image)
        self.assertIsInstance(result, dict)
        self.assertIn('result', result)
        self.assertIn('confidence', result)
        self.assertIn('timestamp', result)

    def test_mri_analysis(self):
        result = self.mri_service.analyze(self.test_image)
        self.assertIsInstance(result, dict)
        self.assertIn('result', result)
        self.assertIn('confidence', result)
        self.assertIn('timestamp', result)

    def test_ct_analysis(self):
        result = self.ct_service.analyze(self.test_image)
        self.assertIsInstance(result, dict)
        self.assertIn('result', result)
        self.assertIn('confidence', result)
        self.assertIn('timestamp', result)

class TestTestAnalysisService(unittest.TestCase):
    def setUp(self):
        self.test_service = TestAnalysisService()
        
        # Create comprehensive test data
        self.test_data = {
            'CBC': {
                'WBC': 12.5,  # High
                'RBC': 4.8,   # Normal
                'Hemoglobin': 11.5,  # Low
                'Hematocrit': 35.0,  # Low
                'Platelets': 450,    # High
                'MCV': 85,    # Normal
                'MCH': 25,    # Low
                'MCHC': 33,   # Normal
                'RDW': 15.0,  # High
                'Neutrophils': 8.5,  # High
                'Lymphocytes': 3.5,  # Normal
                'Monocytes': 0.5,    # Normal
                'Eosinophils': 0.3,  # Normal
                'Basophils': 0.1     # Normal
            },
            'LFT': {
                'ALT': 65,    # High
                'AST': 45,    # High
                'ALP': 160,   # High
                'GGT': 70,    # High
                'Total_Bilirubin': 1.5,  # High
                'Direct_Bilirubin': 0.4,  # High
                'Total_Protein': 7.0,    # Normal
                'Albumin': 4.0,          # Normal
                'Globulin': 3.0,         # Normal
                'A/G_Ratio': 1.3         # Normal
            },
            'KFT': {
                'Urea': 25,   # High
                'Creatinine': 1.5,  # High
                'eGFR': 85,   # Low
                'Uric_Acid': 8.0,  # High
                'Sodium': 140,     # Normal
                'Potassium': 4.5,  # Normal
                'Chloride': 105,   # Normal
                'Calcium': 9.0,    # Normal
                'Phosphorus': 4.0, # Normal
                'Magnesium': 2.0   # Normal
            },
            'Lipid': {
                'Total_Cholesterol': 220,  # High
                'HDL': 35,    # Low
                'LDL': 150,   # High
                'VLDL': 45,   # High
                'Triglycerides': 180,  # High
                'Chol/HDL_Ratio': 6.3  # High
            },
            'Thyroid': {
                'TSH': 5.5,   # High
                'T3': 150,    # Normal
                'T4': 10.0,   # Normal
                'Free_T3': 3.0,  # Normal
                'Free_T4': 1.2   # Normal
            },
            'Diabetes': {
                'FBS': 110,   # High
                'RBS': 160,   # High
                'HbA1c': 6.2, # High
                'Insulin': 30.0,  # High
                'C_Peptide': 3.5  # High
            },
            'Inflammatory': {
                'CRP': 8.0,   # High
                'ESR': 25,    # High
                'Ferritin': 450,  # High
                'D_Dimer': 0.6,   # High
                'Procalcitonin': 0.15  # High
            },
            'Urine': {
                'Color': 'Dark Yellow',
                'Appearance': 'Cloudy',
                'pH': 8.5,    # High
                'Specific_Gravity': 1.035,  # High
                'Protein': 25,  # High
                'Glucose': 20,  # High
                'Ketones': 6,   # High
                'Blood': 5,     # High
                'Leukocytes': 8,  # High
                'Nitrites': 'Positive',
                'Bacteria': 1500  # High
            },
            'Stool': {
                'Color': 'Black',
                'Consistency': 'Liquid',
                'pH': 8.0,    # High
                'Occult_Blood': 'Positive',
                'WBC': 5,     # High
                'RBC': 2,     # High
                'Fat': 3,     # High
                'Reducing_Substances': 'Positive'
            }
        }

    def test_blood_test_analysis(self):
        result = self.test_service.analyze(self.test_data)
        self.assertIsInstance(result, dict)
        self.assertIn('results', result)
        self.assertIn('interpretation', result)
        self.assertIn('confidence', result)
        self.assertIn('timestamp', result)
        self.assertIn('recommendations', result)
        
        # Check if recommendations are generated
        self.assertIsInstance(result['recommendations'], list)
        self.assertTrue(len(result['recommendations']) > 0)

    def test_abnormal_value_detection(self):
        # Test CBC abnormal values
        cbc_data = {'CBC': self.test_data['CBC']}
        result = self.test_service.analyze(cbc_data)
        self.assertIn('WBC', result['interpretation'])
        self.assertIn('Hemoglobin', result['interpretation'])
        self.assertIn('Platelets', result['interpretation'])

        # Test LFT abnormal values
        lft_data = {'LFT': self.test_data['LFT']}
        result = self.test_service.analyze(lft_data)
        self.assertIn('ALT', result['interpretation'])
        self.assertIn('AST', result['interpretation'])
        self.assertIn('Bilirubin', result['interpretation'])

    def test_categorical_value_handling(self):
        # Test urine categorical values
        urine_data = {'Urine': self.test_data['Urine']}
        result = self.test_service.analyze(urine_data)
        self.assertIn('Color', result['interpretation'])
        self.assertIn('Appearance', result['interpretation'])
        self.assertIn('Nitrites', result['interpretation'])

    def test_recommendations_generation(self):
        # Test recommendations for multiple abnormal results
        result = self.test_service.analyze(self.test_data)
        recommendations = result['recommendations']
        
        # Check for specific recommendations
        self.assertTrue(any('infection' in r.lower() for r in recommendations))
        self.assertTrue(any('liver' in r.lower() for r in recommendations))
        self.assertTrue(any('renal' in r.lower() for r in recommendations))
        self.assertTrue(any('diabetes' in r.lower() for r in recommendations))

    def test_invalid_data(self):
        with self.assertRaises(Exception):
            self.test_service.analyze({})

    def test_partial_data(self):
        # Test with only some test categories
        partial_data = {
            'CBC': self.test_data['CBC'],
            'LFT': self.test_data['LFT']
        }
        result = self.test_service.analyze(partial_data)
        self.assertIsInstance(result, dict)
        self.assertIn('interpretation', result)
        self.assertIn('recommendations', result)

if __name__ == '__main__':
    unittest.main() 