import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
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
  Map<String, dynamic>? _lastResult;

  bool get isLoading => _isLoading;
  String? get error => _error;
  Map<String, dynamic>? get lastResult => _lastResult;

  Future<bool> analyzeImage(
      String imagePath, String modality, BuildContext context) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final authHeader = context.read<AuthProvider>().getAuthHeader();
      if (authHeader == null) {
        throw Exception('Not authenticated');
      }

      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(imagePath),
        'modality': modality,
      });

      final response = await _dio.post(
        '${dotenv.env['API_BASE_URL']}/analyze/image',
        data: formData,
        options: Options(
          headers: {'Authorization': authHeader},
        ),
      );

      if (response.statusCode == 200) {
        _lastResult = response.data;
        _isLoading = false;
        notifyListeners();
        return true;
      }
      throw Exception('Failed to analyze image');
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
      final authHeader = context.read<AuthProvider>().getAuthHeader();
      if (authHeader == null) {
        throw Exception('Not authenticated');
      }

      final response = await _dio.post(
        '${dotenv.env['API_BASE_URL']}/analyze/test',
        data: testData,
        options: Options(
          headers: {'Authorization': authHeader},
        ),
      );

      if (response.statusCode == 200) {
        _lastResult = response.data;
        _isLoading = false;
        notifyListeners();
        return true;
      }
      throw Exception('Failed to analyze test results');
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  void clearResults() {
    _lastResult = null;
    _error = null;
    notifyListeners();
  }
}
