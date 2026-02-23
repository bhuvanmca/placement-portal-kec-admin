import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../utils/constants.dart';

class StudentService {
  final String baseUrl = AppConstants.apiBaseUrl;

  // Helper to get token
  Future<String?> _getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('token');
  }

  // Fetch Student Profile
  Future<Map<String, dynamic>> getProfile() async {
    final token = await _getToken();
    final response = await http.get(
      Uri.parse('$baseUrl/v1/student/profile'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to load profile');
    }
  }

  // Upload Document
  Future<String> uploadFile(String filePath, String docType) async {
    final token = await _getToken();
    var request = http.MultipartRequest(
      'POST',
      Uri.parse('$baseUrl/v1/student/upload?type=$docType'),
    );

    request.headers['Authorization'] = 'Bearer $token';

    // Add file
    request.files.add(
      await http.MultipartFile.fromPath(
        'file',
        filePath,
        // contentType: MediaType('application', 'pdf'), // Optional: Detect type if needed, usually inferred
      ),
    );

    var streamedResponse = await request.send();
    var response = await http.Response.fromStream(streamedResponse);

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['url'];
    } else {
      final errorMsg = _parseError(response.body);
      throw Exception('Failed to upload file: $errorMsg');
    }
  }

  // Helper to parse error safely
  String _parseError(String body) {
    try {
      final decoded = jsonDecode(body);
      return decoded['error'] ?? body;
    } catch (_) {
      return body;
    }
  }

  // Update Profile
  Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> data) async {
    final token = await _getToken();
    final response = await http.put(
      Uri.parse('$baseUrl/v1/student/profile'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode(data),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      final errorMsg = _parseError(response.body);
      throw Exception(errorMsg);
    }
  }

  // Get presigned URL for document
  Future<String> getDocumentURL(String documentType) async {
    final token = await _getToken();
    final response = await http.get(
      Uri.parse('$baseUrl/v1/student/documents/$documentType'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['url'];
    } else {
      final errorMsg = _parseError(response.body);
      throw Exception(errorMsg);
    }
  }

  // Forgot Password - Send OTP
  Future<void> forgotPassword(String email) async {
    final response = await http.post(
      Uri.parse('$baseUrl/v1/auth/forgot-password'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email}),
    );

    if (response.statusCode != 200) {
      final error = jsonDecode(response.body);
      throw Exception(error['error'] ?? 'Failed to send OTP');
    }
  }

  // Reset Password with OTP
  Future<void> resetPassword(
    String email,
    String otp,
    String newPassword,
  ) async {
    final response = await http.post(
      Uri.parse('$baseUrl/v1/auth/reset-password'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': email,
        'otp': otp,
        'new_password': newPassword,
      }),
    );

    if (response.statusCode != 200) {
      final error = jsonDecode(response.body);
      throw Exception(error['error'] ?? 'Failed to reset password');
    }
  }

  // Change Password
  Future<void> changePassword(
    String oldPassword,
    String newPassword,
    String confirmPassword,
  ) async {
    final token = await _getToken();
    final response = await http.put(
      Uri.parse('$baseUrl/v1/student/password'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
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

  // Get My Requests
  Future<List<dynamic>> getRequests() async {
    final token = await _getToken();
    final response = await http.get(
      Uri.parse('$baseUrl/v1/student/requests'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode == 200) {
      final decoded = jsonDecode(response.body);
      if (decoded is List) {
        return decoded;
      }
      return [];
    } else {
      throw Exception('Failed to load requests');
    }
  }

  // Get My Drive Requests (request-to-attend)
  Future<List<dynamic>> getDriveRequests() async {
    final token = await _getToken();
    final response = await http.get(
      Uri.parse('$baseUrl/v1/student/drive-requests'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode == 200) {
      final decoded = jsonDecode(response.body);
      if (decoded is List) {
        return decoded;
      }
      return [];
    } else {
      throw Exception('Failed to load drive requests');
    }
  }

  // Delete/Clear a mark/personal update request
  Future<void> deleteChangeRequest(int requestId) async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('auth_token');

    final response = await http.delete(
      Uri.parse('$baseUrl/v1/student/requests/$requestId'),
      headers: {'Authorization': 'Bearer $token'},
    );

    if (response.statusCode != 200) {
      final error = jsonDecode(response.body);
      throw Exception(error['error'] ?? 'Failed to delete request');
    }
  }

  // Delete/Clear a drive request
  Future<void> deleteDriveRequest(int driveId) async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('auth_token');

    final response = await http.delete(
      Uri.parse('$baseUrl/v1/student/drive-requests/$driveId'),
      headers: {'Authorization': 'Bearer $token'},
    );

    if (response.statusCode != 200) {
      final error = jsonDecode(response.body);
      throw Exception(error['error'] ?? 'Failed to delete drive request');
    }
  }
}
