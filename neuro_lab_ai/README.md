# NeuroLab AI

An AI-powered laboratory analysis platform for medical professionals.

## Features

- Medical image analysis (X-ray, MRI, CT)
- Laboratory test results analysis
- Secure authentication
- Modern and intuitive user interface
- Local deployment for data privacy

## Setup

### Prerequisites

- Flutter SDK (>=3.0.0)
- Dart SDK (>=3.0.0)
- Python 3.8+
- pip

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a .env file:
   ```bash
   cp .env.example .env
   ```

5. Start the backend server:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 511
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd neuro_lab_ai
   ```

2. Create a .env file:
   ```bash
   cp .env.example .env
   ```

3. Install dependencies:
   ```bash
   flutter pub get
   ```

4. Run the app:
   ```bash
   flutter run -d chrome
   ```

## Development

### Backend

The backend is built with FastAPI and provides the following endpoints:

- `/token` - Authentication endpoint
- `/analyze/image` - Image analysis endpoint
- `/analyze/test` - Test results analysis endpoint

### Frontend

The frontend is built with Flutter and includes the following features:

- Login screen with secure authentication
- Home screen with analysis options
- Image analysis screen for medical images
- Test results analysis screen for laboratory tests
- Results screen with detailed analysis and recommendations

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 