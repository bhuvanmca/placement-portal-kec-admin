import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

class AppConstants {
  // API Configuration
  // API Configuration
  // Use computer's local IP for mobile testing (host machine IP)
  // static const String baseUrl = 'http://localhost:8080/api'; // Works for iOS Simulator only
  static String baseUrl =
      dotenv.env['API_BASE_URL'] ?? 'http://172.20.10.6/api';
  static String apiBaseUrl =
      dotenv.env['API_BASE_URL'] ?? 'http://172.20.10.6/api';

  // Colors (Oxford Blue theme)
  static const Color primaryColor = Color(0xFF002147);
  static const Color backgroundColor = Color(0xFFF8F9FA);
  static const Color surfaceColor = Colors.white;
  static const Color textPrimary = Color(0xFF1A1A1A);
  static const Color textSecondary = Color(0xFF6B7280);
  static const Color borderColor = Color(0xFFE5E7EB);
  static const Color successColor = Color(0xFF10B981);
  static const Color errorColor = Color(0xFFEF4444);

  // Dimensions (matching shadcn)
  static const double borderRadius = 8.0;
  static const double buttonHeight = 52.0;
  static const double inputHeight = 48.0;
  static const double spacing = 16.0;
  static const double spacingLarge = 24.0;

  // API Routes
  static const String loginRoute = '/v1/auth/login';
  static const String profileRoute = '/v1/student/profile';

  // Helper to fix locahost/minio URLs for mobile
  static String sanitizeUrl(String url) {
    if (url.isEmpty) return url;
    // Replace localhost, minio, garage, 127.0.0.1 with machine IP
    String newUrl = url;
    if (newUrl.contains('localhost')) {
      newUrl = newUrl.replaceAll('localhost', '172.20.10.6');
    }
    if (newUrl.contains('127.0.0.1')) {
      newUrl = newUrl.replaceAll('127.0.0.1', '172.20.10.6');
    }
    if (newUrl.contains('garage')) {
      newUrl = newUrl.replaceAll('garage', '172.20.10.6');
    }
    if (newUrl.contains('minio')) {
      newUrl = newUrl.replaceAll('minio', '172.20.10.6');
    }
    if (newUrl.contains('10.0.2.2')) {
      newUrl = newUrl.replaceAll('10.0.2.2', '172.20.10.6');
    }

    // Remove 'v' query parameter securely using URI parsing
    try {
      final uri = Uri.parse(newUrl);
      final queryParams = Map<String, dynamic>.from(uri.queryParameters);

      if (queryParams.containsKey('v')) {
        queryParams.remove('v');
        // Reconstruct URL without 'v'
        // If no params left, queryParameters should be empty/null logic handles it
        newUrl = uri.replace(queryParameters: queryParams).toString();
      }
    } catch (e) {
      // Fallback or ignore
      debugPrint("Error sanitizing URL params: $e");
    }

    return newUrl;
  }
}
