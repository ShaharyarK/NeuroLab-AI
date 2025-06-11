import 'dart:io';
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:provider/provider.dart';
import 'auth_provider.dart';

class AnalysisProvider with ChangeNotifier {
  final _dio = Dio();
  bool _isLoading = false;
  String? _error;
  Map<String, dynamic>? _lastAnalysisResult;

  bool get isLoading => _isLoading;
  String? get error => _error;
  Map<String, dynamic>? get lastAnalysisResult => _lastAnalysisResult;

  Future<bool> analyzeImage(
      File image, String modality, BuildContext context) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      final token = authProvider.getAuthHeader();

      if (token == null) {
        throw Exception('Not authenticated');
      }

      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(
          image.path,
          filename: image.path.split('/').last,
        ),
      });

      final response = await _dio.post(
        '${dotenv.env['API_URL']}/analyze/$modality',
        data: formData,
        options: Options(
          headers: {'Authorization': token},
        ),
      );

      if (response.statusCode == 200) {
        _lastAnalysisResult = response.data;
        _isLoading = false;
        notifyListeners();
        return true;
      }
      return false;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> analyzeTestResults(
      Map<String, dynamic> testData, BuildContext context) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      final token = authProvider.getAuthHeader();

      if (token == null) {
        throw Exception('Not authenticated');
      }

      final response = await _dio.post(
        '${dotenv.env['API_URL']}/analyze/test-results',
        data: testData,
        options: Options(
          headers: {'Authorization': token},
        ),
      );

      if (response.statusCode == 200) {
        _lastAnalysisResult = response.data;
        _isLoading = false;
        notifyListeners();
        return true;
      }
      return false;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  void clearResults() {
    _lastAnalysisResult = null;
    _error = null;
    notifyListeners();
  }
}
