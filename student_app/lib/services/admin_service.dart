import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_client.dart';
import '../utils/constants.dart';

final adminServiceProvider = Provider<AdminService>(
  (ref) => AdminService(ref.read(apiClientProvider)),
);

class AdminService {
  final ApiClient _apiClient;
  final String baseUrl = AppConstants.apiBaseUrl;

  AdminService(this._apiClient);

  Future<String?> _getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('token');
  }

  Map<String, String> _authHeaders(String? token) => {
    'Authorization': 'Bearer $token',
    'Content-Type': 'application/json',
  };

  // ── Student Management ──

  Future<Map<String, dynamic>> getStudents({
    int page = 1,
    int limit = 20,
    String? department,
    int? batchYear,
    String? search,
    String sortBy = 'register_number',
    String sortOrder = 'asc',
  }) async {
    final token = await _getToken();
    final params = <String, String>{
      'page': '$page',
      'limit': '$limit',
      'sortBy': sortBy,
      'sortOrder': sortOrder,
    };
    if (department != null && department.isNotEmpty) {
      params['dept'] = department;
    }
    if (batchYear != null) params['batch'] = '$batchYear';
    if (search != null && search.isNotEmpty) params['search'] = search;

    final uri = Uri.parse(
      '$baseUrl/v1/admin/students',
    ).replace(queryParameters: params);

    final response = await _apiClient.get(uri, headers: _authHeaders(token));

    if (response.statusCode == 200) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    }
    throw Exception('Failed to load students');
  }

  Future<void> toggleBlockStudent(int userId, bool block) async {
    final token = await _getToken();
    final response = await _apiClient.put(
      Uri.parse('$baseUrl/v1/admin/users/$userId/block'),
      headers: _authHeaders(token),
      body: jsonEncode({'block': block}),
    );
    if (response.statusCode != 200) {
      final error = jsonDecode(response.body);
      throw Exception(error['error'] ?? 'Failed to update block status');
    }
  }

  // ── Drive Management ──

  Future<Map<String, dynamic>> getDrives({
    int page = 1,
    int limit = 20,
    String? search,
  }) async {
    final token = await _getToken();
    String url = '$baseUrl/v1/admin/drives?page=$page&limit=$limit';
    if (search != null && search.isNotEmpty) {
      url += '&search=${Uri.encodeComponent(search)}';
    }

    final response = await _apiClient.get(
      Uri.parse(url),
      headers: _authHeaders(token),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    }
    throw Exception('Failed to load drives');
  }

  Future<void> patchDrive(int driveId, Map<String, dynamic> updates) async {
    final token = await _getToken();
    final response = await _apiClient.patch(
      Uri.parse('$baseUrl/v1/admin/drives/$driveId'),
      headers: _authHeaders(token),
      body: jsonEncode(updates),
    );
    if (response.statusCode != 200) {
      final error = jsonDecode(response.body);
      throw Exception(error['error'] ?? 'Failed to update drive');
    }
  }

  // ── Request Approval ──

  Future<List<dynamic>> getPendingRequests() async {
    final token = await _getToken();
    final response = await _apiClient.get(
      Uri.parse('$baseUrl/v1/admin/requests'),
      headers: _authHeaders(token),
    );

    if (response.statusCode == 200) {
      final decoded = jsonDecode(response.body);
      if (decoded is List) return decoded;
      if (decoded is Map && decoded['data'] is List) return decoded['data'];
      return [];
    }
    throw Exception('Failed to load requests');
  }

  Future<void> reviewRequest(
    int requestId,
    String action, {
    String? reason,
  }) async {
    final token = await _getToken();
    final body = <String, dynamic>{'action': action};
    if (reason != null && reason.isNotEmpty) body['reason'] = reason;

    final response = await _apiClient.put(
      Uri.parse('$baseUrl/v1/admin/requests/$requestId'),
      headers: _authHeaders(token),
      body: jsonEncode(body),
    );

    if (response.statusCode != 200) {
      final error = jsonDecode(response.body);
      throw Exception(error['error'] ?? 'Failed to review request');
    }
  }

  // ── Dashboard Stats ──

  Future<Map<String, dynamic>> getDashboardStats() async {
    final token = await _getToken();
    final response = await _apiClient.get(
      Uri.parse('$baseUrl/v1/admin/dashboard/stats'),
      headers: _authHeaders(token),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    }
    throw Exception('Failed to load dashboard stats');
  }

  // ── Change Password (for admin/coordinator users) ──

  Future<void> changePassword(
    String oldPassword,
    String newPassword,
    String confirmPassword,
  ) async {
    final token = await _getToken();
    final response = await _apiClient.put(
      Uri.parse('$baseUrl/v1/user/password'),
      headers: _authHeaders(token),
      body: jsonEncode({
        'old_password': oldPassword,
        'new_password': newPassword,
        'confirm_password': confirmPassword,
      }),
    );
    if (response.statusCode != 200) {
      final error = jsonDecode(response.body);
      throw Exception(error['error'] ?? 'Failed to change password');
    }
  }
}
