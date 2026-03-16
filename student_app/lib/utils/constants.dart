import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

class AppConstants {
  // API Configuration
  // Production: uses Cloudflare Tunnel domain (works from any network)
  // Development: override via .env file with local IP
  static String baseUrl =
      dotenv.env['API_BASE_URL'] ?? 'https://app.api-kecdrives.com/api';
  static String apiBaseUrl =
      dotenv.env['API_BASE_URL'] ?? 'https://app.api-kecdrives.com/api';

  // WebSocket URL for chat (wss:// for production, ws:// for local dev)
  static String wsBaseUrl =
      dotenv.env['WS_BASE_URL'] ?? 'wss://app.api-kecdrives.com/ws';

  // Storage URL for file downloads (Garage via Cloudflare)
  static String storageBaseUrl =
      dotenv.env['STORAGE_BASE_URL'] ?? 'https://app.api-kecdrives.com/storage';

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

  // Helper to rewrite internal Docker/local URLs to public Cloudflare domain
  static String sanitizeUrl(String url) {
    if (url.isEmpty) return url;

    String newUrl = url;

    // Rewrite internal service hostnames to public Cloudflare tunnel domain
    // These URLs come from the backend which uses Docker-internal names
    final internalHosts = ['localhost', '127.0.0.1', '172.20.10.6', '10.0.2.2'];

    final publicHost = Uri.parse(apiBaseUrl).host; // e.g. app.api-kecdrives.com

    for (final host in internalHosts) {
      if (newUrl.contains(host)) {
        // Replace http://host:port or http://host (with optional port) -> https://publicHost
        newUrl = newUrl.replaceAll(
          RegExp('http://$host(:\\d+)?'),
          'https://$publicHost',
        );
        newUrl = newUrl.replaceAll(host, publicHost);
      }
    }

    // Rewrite Docker-internal service names (garage, minio) to public storage URL
    if (newUrl.contains('://garage:')) {
      newUrl = newUrl.replaceAll(RegExp(r'http://garage:\d+'), storageBaseUrl);
    }
    if (newUrl.contains('://minio:')) {
      newUrl = newUrl.replaceAll(RegExp(r'http://minio:\d+'), storageBaseUrl);
    }

    // Remove 'v' query parameter securely using URI parsing
    try {
      final uri = Uri.parse(newUrl);
      final queryParams = Map<String, dynamic>.from(uri.queryParameters);

      if (queryParams.containsKey('v')) {
        queryParams.remove('v');
        newUrl = uri.replace(queryParameters: queryParams).toString();
      }
    } catch (e) {
      debugPrint("Error sanitizing URL params: $e");
    }

    return newUrl;
  }
}
