import 'dart:convert';
import 'package:flutter/foundation.dart';
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

  Future<Map<String, dynamic>> getDrives({
    int page = 1,
    int limit = 100,
    String? search,
  }) async {
    final token = await _getToken();
    String url = '$baseUrl/v1/drives?page=$page&limit=$limit';
    if (search != null && search.isNotEmpty) {
      url += '&search=${Uri.encodeComponent(search)}';
    }

    debugPrint('[DriveService] GET $url (token=${token != null ? "present" : "MISSING"})');

    final response = await _apiClient.get(
      Uri.parse(url),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );

    debugPrint('[DriveService] Response: ${response.statusCode} body=${response.body.length > 200 ? response.body.substring(0, 200) : response.body}');

    if (response.statusCode == 200) {
      final dynamic decoded = jsonDecode(response.body);
      final data = decoded as Map<String, dynamic>;
      debugPrint('[DriveService] Drives count: ${(data['drives'] as List?)?.length ?? 0}, total: ${data['total']}');
      return data;
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
      Uri.parse('$baseUrl/v1/drives/$driveId/opt-out'),
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

  /// Get student's drive applications
  Future<List<dynamic>> getApplications() async {
    final token = await _getToken();
    final response = await _apiClient.get(
      Uri.parse('$baseUrl/v1/drives/applications'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode == 200) {
      final decoded = jsonDecode(response.body);
      if (decoded is List) return decoded;
      if (decoded is Map && decoded['data'] is List) return decoded['data'];
      return [];
    } else {
      throw Exception('Failed to load applications');
    }
  }
}
