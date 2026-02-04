import 'dart:async';
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../utils/constants.dart';
import 'api_client.dart';
import 'notification_service.dart';

/// Login response containing token and profile status
class LoginResponse {
  final String token;
  final String email;
  final String role;
  final bool isProfileComplete;

  LoginResponse({
    required this.token,
    required this.email,
    required this.role,
    required this.isProfileComplete,
  });

  factory LoginResponse.fromJson(Map<String, dynamic> json) {
    return LoginResponse(
      token: json['token'] ?? '',
      email: json['email'] ?? '',
      role: json['role'] ?? 'student',
      isProfileComplete: json['is_profile_complete'] ?? false,
    );
  }
}

class AuthService {
  final ApiClient _apiClient;

  AuthService(this._apiClient);

  /// Login with email and password
  /// Returns LoginResponse with profile completion status
  Future<LoginResponse> login(String email, String password) async {
    final url = Uri.parse('${AppConstants.baseUrl}${AppConstants.loginRoute}');
    try {
      final response = await _apiClient
          .post(
            url,
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'email': email, 'password': password}),
          )
          .timeout(
            const Duration(seconds: 10),
            onTimeout: () {
              throw Exception(
                'Request timed out. Please check your connection.',
              );
            },
          );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['token'] != null) {
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString('token', data['token']);
          await prefs.setBool(
            'is_profile_complete',
            data['is_profile_complete'] ?? false,
          );

          // [NEW] Sync FCM Token immediately after login
          NotificationService.syncToken();

          return LoginResponse.fromJson(data);
        } else {
          throw Exception('Token not found in response');
        }
      } else {
        final error = jsonDecode(response.body);
        throw Exception(error['error'] ?? 'Login failed');
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('token');
  }

  Future<bool> isProfileComplete() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool('is_profile_complete') ?? false;
  }

  Future<void> setProfileComplete(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('is_profile_complete', value);
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    await prefs.remove('is_profile_complete');
  }
}
