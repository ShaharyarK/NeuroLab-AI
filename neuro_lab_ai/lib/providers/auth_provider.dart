import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:dio/dio.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'dart:io';

class AuthProvider with ChangeNotifier {
  final _storage = const FlutterSecureStorage();
  final _dio = Dio();
  bool _isAuthenticated = false;
  String? _token;
  String? _username;
  int? _timezoneOffset; // in hours

  bool get isAuthenticated => _isAuthenticated;
  String? get token => _token;
  String? get username => _username;
  int? get timezoneOffset => _timezoneOffset;

  AuthProvider() {
    _init();
    // Configure Dio
    _dio.options.baseUrl = 'http://localhost:511';
    _dio.options.connectTimeout = const Duration(seconds: 5);
    _dio.options.receiveTimeout = const Duration(seconds: 3);
  }

  Future<void> _init() async {
    _token = await _storage.read(key: 'token');
    _username = await _storage.read(key: 'username');
    _isAuthenticated = _token != null;

    // Get stored timezone offset or detect current one
    final storedOffset = await _storage.read(key: 'timezone_offset');
    if (storedOffset != null) {
      _timezoneOffset = int.parse(storedOffset);
    } else {
      _timezoneOffset = _getCurrentTimezoneOffset();
      await _storage.write(
          key: 'timezone_offset', value: _timezoneOffset.toString());
    }

    notifyListeners();
  }

  int _getCurrentTimezoneOffset() {
    final now = DateTime.now();
    final offsetInMinutes = now.timeZoneOffset.inMinutes;
    return offsetInMinutes ~/ 60; // Convert to hours
  }

  Future<void> updateTimezoneOffset() async {
    _timezoneOffset = _getCurrentTimezoneOffset();
    await _storage.write(
        key: 'timezone_offset', value: _timezoneOffset.toString());
    notifyListeners();
  }

  Map<String, String> getTimezoneHeaders() {
    return {
      'x-timezone-offset': _timezoneOffset?.toString() ?? '0',
    };
  }

  Future<String?> register({
    required String username,
    required String email,
    required String password,
  }) async {
    try {
      final headers = getTimezoneHeaders();

      final response = await _dio.post(
        '/register',
        data: {
          'username': username,
          'email': email,
          'password': password,
        },
        options: Options(
          headers: headers,
        ),
      );

      if (response.statusCode == 201 || response.statusCode == 200) {
        return null; // Success
      } else if (response.data != null &&
          response.data is Map &&
          response.data['detail'] != null) {
        return response.data['detail'].toString();
      } else {
        return 'Registration failed. Please try again.';
      }
    } on DioError catch (e) {
      if (e.response != null && e.response?.data != null) {
        final data = e.response?.data;
        if (data is Map && data['detail'] != null) {
          return data['detail'].toString();
        } else if (data is String) {
          return data;
        }
      }
      return 'Registration error: ${e.message}';
    } catch (e) {
      return 'Registration error: $e';
    }
  }

  Future<bool> login(String username, String password) async {
    try {
      final headers = getTimezoneHeaders();
      headers['Content-Type'] = 'application/x-www-form-urlencoded';

      final response = await _dio.post(
        '/token',
        data: FormData.fromMap({
          'username': username,
          'password': password,
        }),
        options: Options(
          headers: headers,
        ),
      );

      if (response.statusCode == 200) {
        _token = response.data['access_token'];
        _username = username;
        _isAuthenticated = true;

        await _storage.write(key: 'token', value: _token);
        await _storage.write(key: 'username', value: _username);

        notifyListeners();
        return true;
      }
      return false;
    } catch (e) {
      debugPrint('Login error: $e');
      return false;
    }
  }

  Future<void> logout() async {
    _token = null;
    _username = null;
    _isAuthenticated = false;

    await _storage.delete(key: 'token');
    await _storage.delete(key: 'username');

    notifyListeners();
  }

  String? getAuthHeader() {
    return _token != null ? 'Bearer $_token' : null;
  }
}
