import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:dio/dio.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

class AuthProvider with ChangeNotifier {
  final _storage = const FlutterSecureStorage();
  final _dio = Dio();
  bool _isAuthenticated = false;
  String? _token;
  String? _username;

  bool get isAuthenticated => _isAuthenticated;
  String? get token => _token;
  String? get username => _username;

  AuthProvider() {
    _init();
  }

  Future<void> _init() async {
    _token = await _storage.read(key: 'token');
    _username = await _storage.read(key: 'username');
    _isAuthenticated = _token != null;
    notifyListeners();
  }

  Future<bool> register({
    required String username,
    required String email,
    required String password,
  }) async {
    try {
      final response = await _dio.post(
        '${dotenv.env['API_BASE_URL']}/register',
        data: {
          'username': username,
          'email': email,
          'password': password,
        },
      );

      if (response.statusCode == 201) {
        return true;
      }
      return false;
    } catch (e) {
      debugPrint('Registration error: $e');
      return false;
    }
  }

  Future<bool> login(String username, String password) async {
    try {
      final response = await _dio.post(
        '${dotenv.env['API_BASE_URL']}/token',
        data: {
          'username': username,
          'password': password,
        },
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
