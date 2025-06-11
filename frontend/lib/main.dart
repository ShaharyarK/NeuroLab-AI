import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'providers/auth_provider.dart';
import 'providers/analysis_provider.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'screens/image_analysis_screen.dart';
import 'screens/test_analysis_screen.dart';
import 'screens/results_screen.dart';
import 'utils/theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: '.env');
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => AnalysisProvider()),
      ],
      child: MaterialApp(
        title: 'NeuroLab AI',
        theme: lightTheme,
        darkTheme: darkTheme,
        themeMode: ThemeMode.system,
        initialRoute: '/',
        routes: {
          '/': (context) => const LoginScreen(),
          '/home': (context) => const HomeScreen(),
          '/image-analysis': (context) => const ImageAnalysisScreen(),
          '/test-analysis': (context) => const TestAnalysisScreen(),
          '/results': (context) => const ResultsScreen(),
        },
      ),
    );
  }
}
