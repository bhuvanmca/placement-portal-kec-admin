import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../utils/constants.dart';
import 'api_client.dart';
import '../models/company.dart';

class CompanyService {
  final ApiClient _apiClient;
  final String baseUrl = AppConstants.apiBaseUrl;

  CompanyService(this._apiClient);

  Future<String?> _getAdminToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('admin_token');
  }

  Future<List<Company>> getAllCompanies() async {
    final token = await _getAdminToken();
    final response = await _apiClient.get(
      Uri.parse('$baseUrl/v1/admin/companies'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.map((json) => Company.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load companies');
    }
  }

  Future<void> createCompany(Map<String, dynamic> data) async {
    final token = await _getAdminToken();
    final response = await _apiClient.post(
      Uri.parse('$baseUrl/v1/admin/companies'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode(data),
    );

    if (response.statusCode != 201) {
      final error = jsonDecode(response.body);
      throw Exception(error['error'] ?? 'Failed to create company');
    }
  }

  Future<void> updateCompany(int id, Map<String, dynamic> data) async {
    final token = await _getAdminToken();
    final response = await http.put(
      Uri.parse('$baseUrl/v1/admin/companies/$id'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode(data),
    );

    if (response.statusCode != 200) {
      final error = jsonDecode(response.body);
      throw Exception(error['error'] ?? 'Failed to update company');
    }
  }

  Future<void> updateChecklist(int id, CompanyChecklist checklist) async {
    final token = await _getAdminToken();
    final response = await http.put(
      Uri.parse('$baseUrl/v1/admin/companies/$id/checklist'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({'checklist': checklist.toJson()}),
    );

    if (response.statusCode != 200) {
      final error = jsonDecode(response.body);
      throw Exception(error['error'] ?? 'Failed to update checklist');
    }
  }

  Future<void> deleteCompany(int id) async {
    final token = await _getAdminToken();
    final response = await http.delete(
      Uri.parse('$baseUrl/v1/admin/companies/$id'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode != 200) {
      final error = jsonDecode(response.body);
      throw Exception(error['error'] ?? 'Failed to delete company');
    }
  }
}
