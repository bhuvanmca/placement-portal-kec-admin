import 'dart:convert';
import 'api_client.dart';
import '../utils/constants.dart';
import 'package:shared_preferences/shared_preferences.dart';

class DriveService {
  final ApiClient _apiClient;
  final String baseUrl = AppConstants.apiBaseUrl;

  DriveService(this._apiClient);

  // Helper to get token
  Future<String?> _getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('token');
  }

  Future<List<dynamic>> getDrives() async {
    final token = await _getToken();
    final response = await _apiClient.get(
      Uri.parse('$baseUrl/v1/drives'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode == 200) {
      final dynamic decoded = jsonDecode(response.body);
      if (decoded == null) return [];
      return decoded as List<dynamic>;
    } else {
      throw Exception(
        'Failed to load drives: ${response.statusCode} - ${response.body}',
      );
    }
  }

  Future<void> applyForDrive(int driveId, {List<int>? roleIds}) async {
    final token = await _getToken();
    final response = await _apiClient.post(
      Uri.parse('$baseUrl/v1/drives/$driveId/apply'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: roleIds != null ? jsonEncode({'role_ids': roleIds}) : null,
    );

    if (response.statusCode != 200 && response.statusCode != 201) {
      final body = jsonDecode(response.body);
      throw Exception(body['message'] ?? 'Failed to apply');
    }
  }

  Future<void> withdrawFromDrive(int driveId, {String? reason}) async {
    final token = await _getToken();
    final response = await _apiClient.post(
      Uri.parse('$baseUrl/v1/drives/$driveId/withdraw'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: reason != null ? jsonEncode({'reason': reason}) : null,
    );

    if (response.statusCode != 200) {
      final body = jsonDecode(response.body);
      throw Exception(body['message'] ?? 'Failed to withdraw');
    }
  }

  Future<void> requestToAttend(int driveId, {List<int>? roleIds}) async {
    final token = await _getToken();
    final response = await _apiClient.post(
      Uri.parse('$baseUrl/v1/drives/$driveId/request-attend'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: roleIds != null ? jsonEncode({'role_ids': roleIds}) : null,
    );

    if (response.statusCode != 200) {
      final body = jsonDecode(response.body);
      throw Exception(body['message'] ?? 'Failed to submit request');
    }
  }
}
