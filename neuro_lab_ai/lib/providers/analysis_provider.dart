import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:io';

class AnalysisProvider with ChangeNotifier {
  String? _lastAnalysisResult;
  double? _lastConfidence;
  bool _isAnalyzing = false;

  String? get lastAnalysisResult => _lastAnalysisResult;
  double? get lastConfidence => _lastConfidence;
  bool get isAnalyzing => _isAnalyzing;

  Future<Map<String, dynamic>> analyzeImage(File image, String type) async {
    _isAnalyzing = true;
    notifyListeners();

    try {
      final request = http.MultipartRequest(
        'POST',
        Uri.parse('http://localhost:8000/analyze/$type'),
      );

      request.files.add(
        await http.MultipartFile.fromPath(
          'file',
          image.path,
        ),
      );

      final response = await request.send();
      final responseData = await response.stream.bytesToString();
      final data = json.decode(responseData);

      _lastAnalysisResult = data['result'];
      _lastConfidence = data['confidence'];
      _isAnalyzing = false;
      notifyListeners();

      return data;
    } catch (e) {
      _isAnalyzing = false;
      notifyListeners();
      throw Exception('Analysis failed: $e');
    }
  }

  Future<Map<String, dynamic>> analyzeTestResults(
      Map<String, dynamic> testData) async {
    _isAnalyzing = true;
    notifyListeners();

    try {
      final response = await http.post(
        Uri.parse('http://localhost:8000/analyze/test-results'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode(testData),
      );

      final data = json.decode(response.body);
      _lastAnalysisResult = data['result'];
      _lastConfidence = data['confidence'];
      _isAnalyzing = false;
      notifyListeners();

      return data;
    } catch (e) {
      _isAnalyzing = false;
      notifyListeners();
      throw Exception('Analysis failed: $e');
    }
  }
}
