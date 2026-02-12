import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../utils/constants.dart';
import 'api_client.dart';

class AdminService {
  final ApiClient _apiClient;
  final String baseUrl = AppConstants.apiBaseUrl;

  AdminService(this._apiClient);

  // Helper to get admin token
  Future<String?> _getAdminToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('admin_token');
  }

  /// Admin Login
  /// Backend: POST /api/v1/admin/auth/login (public route)
  Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await _apiClient
        .post(
          Uri.parse('$baseUrl/v1/admin/auth/login'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({'email': email, 'password': password}),
        )
        .timeout(
          const Duration(seconds: 10),
          onTimeout: () {
            throw Exception('Request timed out. Please check your connection.');
          },
        );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      if (data['token'] != null) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('admin_token', data['token']);
        return data;
      } else {
        throw Exception('Token not found in response');
      }
    } else {
      final error = jsonDecode(response.body);
      throw Exception(error['error'] ?? 'Admin login failed');
    }
  }

  /// Admin Logout
  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('admin_token');
  }

  /// Check if admin is logged in
  Future<bool> isLoggedIn() async {
    final token = await _getAdminToken();
    return token != null && token.isNotEmpty;
  }

  // ─── DRIVES ──────────────────────────────────────────────

  /// Fetch all drives (admin view)
  /// Backend: GET /api/v1/admin/drives (protected + admin only)
  /// Returns a plain JSON array
  Future<List<dynamic>> getAllDrives() async {
    final token = await _getAdminToken();
    final response = await _apiClient.get(
      Uri.parse('$baseUrl/v1/admin/drives'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode == 200) {
      final dynamic decoded = jsonDecode(response.body);
      if (decoded == null) return [];
      if (decoded is List) return decoded;
      return [];
    } else {
      throw Exception('Failed to load drives: ${response.statusCode}');
    }
  }

  /// Update drive deadline
  /// Backend: PUT /api/v1/admin/drives/:id (protected + admin only)
  /// Sends the deadline_date field in the JSON body
  Future<void> updateDriveDeadline(int driveId, String newDeadline) async {
    final token = await _getAdminToken();
    final response = await http.put(
      Uri.parse('$baseUrl/v1/admin/drives/$driveId'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({'deadline_date': newDeadline}),
    );

    if (response.statusCode != 200) {
      final body = jsonDecode(response.body);
      throw Exception(body['error'] ?? 'Failed to update deadline');
    }
  }

  // ─── STUDENTS ──────────────────────────────────────────────

  /// Fetch all students
  /// Backend: GET /api/v1/admin/students (protected + admin only)
  /// Returns paginated response: {"data": [...], "meta": {...}}
  /// We request a large limit to get all students at once
  Future<List<dynamic>> getAllStudents() async {
    final token = await _getAdminToken();
    final response = await _apiClient.get(
      Uri.parse('$baseUrl/v1/admin/students?limit=1000&page=1'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode == 200) {
      final dynamic decoded = jsonDecode(response.body);
      if (decoded == null) return [];
      // Backend returns {"data": [...], "meta": {...}}
      if (decoded is Map<String, dynamic>) {
        final data = decoded['data'];
        if (data is List) return data;
        return [];
      }
      // Fallback: if it's already a list
      if (decoded is List) return decoded;
      return [];
    } else {
      throw Exception('Failed to load students: ${response.statusCode}');
    }
  }

  /// Get individual student details
  /// Backend: GET /api/v1/admin/students/:id (protected + admin only)
  /// Note: Backend uses register_number (string) to look up students
  Future<Map<String, dynamic>> getStudentDetails(String registerNumber) async {
    final token = await _getAdminToken();
    final response = await _apiClient.get(
      Uri.parse('$baseUrl/v1/admin/students/$registerNumber'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to load student details: ${response.statusCode}');
    }
  }

  /// Block a student
  /// Backend: PUT /api/v1/admin/users/:id/block (protected + admin only)
  /// Body: {"block": true}
  Future<void> blockStudent(int studentId, {String? reason}) async {
    final token = await _getAdminToken();
    final response = await http.put(
      Uri.parse('$baseUrl/v1/admin/users/$studentId/block'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({'block': true}),
    );

    if (response.statusCode != 200) {
      final body = jsonDecode(response.body);
      throw Exception(body['error'] ?? 'Failed to block student');
    }
  }

  /// Unblock a student
  /// Backend: PUT /api/v1/admin/users/:id/block (protected + admin only)
  /// Body: {"block": false}
  Future<void> unblockStudent(int studentId) async {
    final token = await _getAdminToken();
    final response = await http.put(
      Uri.parse('$baseUrl/v1/admin/users/$studentId/block'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({'block': false}),
    );

    if (response.statusCode != 200) {
      final body = jsonDecode(response.body);
      throw Exception(body['error'] ?? 'Failed to unblock student');
    }
  }
}
