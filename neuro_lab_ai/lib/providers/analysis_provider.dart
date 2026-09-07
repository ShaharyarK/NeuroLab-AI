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

      final headers = context.read<AuthProvider>().getTimezoneHeaders();
      headers['Authorization'] = authHeader;

      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(imagePath),
      });

      final response = await _dio.post(
        '${dotenv.env['API_BASE_URL']}/analyze/$modality',
        data: formData,
        options: Options(
          headers: headers,
        ),
      );

      if (response.statusCode == 200) {
        _lastResult = response.data;
        _isLoading = false;
        notifyListeners();
        return true;
      }
      throw Exception('Failed to analyze image');
    } on DioError catch (e) {
      if (e.response != null && e.response?.data != null) {
        final data = e.response?.data;
        if (data is Map && data['detail'] != null) {
          _error = data['detail'].toString();
        } else if (data is String) {
          _error = data;
        } else {
          _error = 'Analysis failed. Please try again.';
        }
      } else {
        _error = 'Network error: ${e.message}';
      }
      _isLoading = false;
      notifyListeners();
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
      final authHeader = context.read<AuthProvider>().getAuthHeader();
      if (authHeader == null) {
        throw Exception('Not authenticated');
      }

      final headers = context.read<AuthProvider>().getTimezoneHeaders();
      headers['Authorization'] = authHeader;

      final response = await _dio.post(
        '${dotenv.env['API_BASE_URL']}/analyze/test',
        data: testData,
        options: Options(
          headers: headers,
        ),
      );

      if (response.statusCode == 200) {
        _lastResult = response.data;
        _isLoading = false;
        notifyListeners();
        return true;
      }
      throw Exception('Failed to analyze test results');
    } on DioError catch (e) {
      if (e.response != null && e.response?.data != null) {
        final data = e.response?.data;
        if (data is Map && data['detail'] != null) {
          _error = data['detail'].toString();
        } else if (data is String) {
          _error = data;
        } else {
          _error = 'Test analysis failed. Please try again.';
        }
      } else {
        _error = 'Network error: ${e.message}';
      }
      _isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> analyzeWebImage(
      Uint8List imageBytes, String modality, BuildContext context) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final authHeader = context.read<AuthProvider>().getAuthHeader();
      if (authHeader == null) {
        throw Exception('Not authenticated');
      }

      final headers = context.read<AuthProvider>().getTimezoneHeaders();
      headers['Authorization'] = authHeader;

      final formData = FormData.fromMap({
        'file': MultipartFile.fromBytes(imageBytes, filename: 'image.png'),
      });

      final response = await _dio.post(
        '${dotenv.env['API_BASE_URL']}/analyze/$modality',
        data: formData,
        options: Options(
          headers: headers,
        ),
      );

      if (response.statusCode == 200) {
        _lastResult = response.data;
        _isLoading = false;
        notifyListeners();
        return true;
      }
      throw Exception('Failed to analyze image');
    } on DioError catch (e) {
      if (e.response != null && e.response?.data != null) {
        final data = e.response?.data;
        if (data is Map && data['detail'] != null) {
          _error = data['detail'].toString();
        } else if (data is String) {
          _error = data;
        } else {
          _error = 'Analysis failed. Please try again.';
        }
      } else {
        _error = 'Network error: ${e.message}';
      }
      _isLoading = false;
      notifyListeners();
      return false;
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
