# NeuroLab AI

A comprehensive AI-powered laboratory management system that provides local AI solutions for medical imaging analysis and test result interpretation.

## Features

- Medical Image Analysis (X-rays, MRI, CT scans)
- Laboratory Test Result Analysis
- Local AI Processing
- Secure Data Management
- Web-based Interface
- Cross-platform Compatibility

## System Requirements

### Backend
- Python 3.8+
- CUDA-capable GPU (recommended)
- 16GB RAM minimum
- 100GB+ storage for AI models

### Frontend
- Modern web browser
- Internet connection for initial setup

## Project Structure

```
prototype_app/
├── backend/           # FastAPI backend with AI models & Hugging Face LLM service
├── frontend/          # React 18 + Vite clinical cybernetic web application
├── docs/              # Documentation
├── start.sh           # Unified starter script (Backend :511 + Frontend :3000)
└── stop.sh            # One-touch termination script
```

## Quick Start

Launch both the FastAPI backend and React frontend with a single command:

```bash
# Start both Backend (FastAPI on :511) and Frontend (React on :3000)
./start.sh

# Start only backend or only frontend
./start.sh -b      # Backend only
./start.sh -f      # Frontend only

# Stop all running NeuroLab AI processes
./stop.sh
```

## AI Models & LLMs Supported

- **Clinical Insights LLMs (Free Tested Hugging Face Inference & Local Ollama)**:
  - `Qwen/Qwen2.5-7B-Instruct` (Recommended top free open-weight model)
  - `meta-llama/Llama-3.1-8B-Instruct`
  - `BioMistral/BioMistral-7B` (Biomedical specialized model)
  - `epfl-llm/meditron-7b` (Clinical medical model)
  - Local Ollama / llama.cpp (`http://localhost:11434`)
  - Built-in Local Medical Rule Engine (100% offline fallback)
- **Medical Imaging AI**:
  - MONAI DenseNet121 & ResNet with Grad-CAM activation heatmaps
  - Multi-slice Brain MRI glioblastoma detection & segmentation
  - Chest X-Ray / CT solitary pulmonary nodule detection
- **Pathology & Lab Tests**:
  - Reference range engine with abnormal flagging (`[H]`, `[L]`, `[CRITICAL]`) for CBC, Biomarkers (CRP, Ferritin, LDH), LFT, KFT, and Urinalysis.

## Manual Setup Instructions

1. Backend Setup:
   ```bash
   cd backend
   pip install -r requirements.txt
   python main.py
   ```

2. Frontend Setup:
   ```bash
   cd neuro_lab_ai  # or cd frontend
   flutter pub get
   flutter run -d chrome
   ```

## AI Models Used

- Medical Image Analysis: MONAI (Medical Open Network for AI)
- Test Result Analysis: Custom models based on medical datasets
- Image Classification: Pre-trained models from Hugging Face

## Security

- All data processing is done locally
- No data is sent to external servers
- HIPAA-compliant data handling
- Local authentication system

## License

Proprietary - All rights reserved 