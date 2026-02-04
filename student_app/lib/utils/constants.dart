import 'package:flutter/material.dart';

class AppConstants {
  // API Configuration
  // API Configuration
  // Use computer's local IP for mobile testing (host machine IP)
  // static const String baseUrl = 'http://localhost:8080/api'; // Works for iOS Simulator only
  static const String baseUrl =
      'http://172.20.10.6:8080/api'; // Works for physical devices & Android/iOS
  static const String apiBaseUrl = 'http://172.20.10.6:8080/api';

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
    // Replace localhost or minio with machine IP
    return url
        .replaceAll('localhost', '172.20.10.6')
        .replaceAll('minio', '172.20.10.6');
  }
}
