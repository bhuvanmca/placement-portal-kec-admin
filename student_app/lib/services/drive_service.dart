import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../utils/constants.dart';

class DriveService {
  final String baseUrl = AppConstants.apiBaseUrl;
  
  // Helper to get token
  Future<String?> _getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('token');
  }

  Future<List<dynamic>> getDrives() async {
    final token = await _getToken();
    final response = await http.get(
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
      throw Exception('Failed to load drives: ${response.statusCode} - ${response.body}');
    }
  }

  Future<void> applyForDrive(int driveId) async {
    final token = await _getToken();
    final response = await http.post(
      Uri.parse('$baseUrl/v1/drives/$driveId/apply'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode != 200 && response.statusCode != 201) {
       final body = jsonDecode(response.body);
       throw Exception(body['message'] ?? 'Failed to apply');
    }
  }

  Future<void> withdrawFromDrive(int driveId) async {
    final token = await _getToken();
    final response = await http.post(
      Uri.parse('$baseUrl/v1/drives/$driveId/withdraw'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode != 200) {
       final body = jsonDecode(response.body);
       throw Exception(body['message'] ?? 'Failed to withdraw');
    }
  }
}
