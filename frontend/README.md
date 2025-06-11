# NeuroLab AI Frontend

This is the frontend application for NeuroLab AI, an AI-powered laboratory analysis platform. The application is built using Flutter and provides a modern, responsive user interface for analyzing medical images and test results.

## Features

- User authentication
- Medical image analysis (X-ray, MRI, CT scans)
- Laboratory test results analysis
- Detailed analysis reports
- Modern and responsive UI
- Dark mode support

## Prerequisites

- Flutter SDK (>=3.0.0)
- Dart SDK (>=3.0.0)
- Android Studio / VS Code with Flutter extensions
- Git

## Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd frontend
   ```

2. Install dependencies:
   ```bash
   flutter pub get
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   API_BASE_URL=http://localhost:511
   API_TIMEOUT=30000
   STORAGE_KEY=neuro_lab_ai_token
   ```

4. Run the application:
   ```bash
   flutter run -d chrome
   ```

## Project Structure

```
lib/
  ├── main.dart              # Application entry point
  ├── providers/            # State management
  │   ├── auth_provider.dart
  │   └── analysis_provider.dart
  ├── screens/             # UI screens
  │   ├── login_screen.dart
  │   ├── home_screen.dart
  │   ├── image_analysis_screen.dart
  │   ├── test_analysis_screen.dart
  │   └── results_screen.dart
  ├── utils/              # Utility functions and constants
  │   └── theme.dart
  ├── models/            # Data models
  └── widgets/          # Reusable widgets
```

## Development

- The application uses Provider for state management
- Material Design 3 for UI components
- Responsive layout that works on all screen sizes
- Secure storage for authentication tokens
- Environment variables for configuration

## Building for Production

1. Create a production build:
   ```bash
   flutter build web
   ```

2. The build output will be in the `build/web` directory

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 