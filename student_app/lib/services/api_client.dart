import 'dart:async';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../providers/server_status_provider.dart';

final apiClientProvider = Provider<ApiClient>((ref) => ApiClient(ref));

class ApiClient {
  final Ref _ref;
  final http.Client _client = http.Client();

  ApiClient(this._ref);

  /// Helper to check if we are online before assuming server is down
  Future<bool> _isOnline() async {
    final connectivityResults = await Connectivity().checkConnectivity();
    return !connectivityResults.contains(ConnectivityResult.none);
  }

  Future<void> _handleError(dynamic error, [http.Response? response]) async {
    // Check if device is online first
    if (!await _isOnline()) {
      return; // Handled by ConnectivityOverlay
    }

    bool isServerIssue = false;

    if (error is SocketException) {
      // Connection refused / Network unreachable
      isServerIssue = true;
    } else if (response != null) {
      if (response.statusCode >= 502 && response.statusCode <= 504) {
        // Bad Gateway, Service Unavailable, Gateway Timeout
        isServerIssue = true;
      }
    }

    if (isServerIssue) {
      _ref.read(serverStatusProvider.notifier).setStatus(false);
    }
  }

  Future<http.Response> get(Uri url, {Map<String, String>? headers}) async {
    try {
      final response = await _client.get(url, headers: headers);
      if (response.statusCode >= 500) await _handleError(null, response);
      return response;
    } catch (e) {
      await _handleError(e);
      if (e is SocketException || e is http.ClientException) {
        throw Exception(
          'Server unavailable. Please check your internet connection.',
        );
      }
      rethrow;
    }
  }

  Future<http.Response> post(
    Uri url, {
    Map<String, String>? headers,
    Object? body,
  }) async {
    try {
      final response = await _client.post(url, headers: headers, body: body);
      if (response.statusCode >= 500) await _handleError(null, response);
      return response;
    } catch (e) {
      await _handleError(e);
      if (e is SocketException || e is http.ClientException) {
        throw Exception(
          'Server unavailable. Please check your internet connection.',
        );
      }
      rethrow;
    }
  }

  // Add other methods (put, delete) as needed...

  /// Check server health
  Future<bool> checkHealth(String baseUrl) async {
    try {
      // Trying to reach root or a known endpoint
      final response = await _client
          .get(Uri.parse('$baseUrl/health'))
          .timeout(const Duration(seconds: 5));

      if (response.statusCode == 200 || response.statusCode == 404) {
        // 404 means server is reachable but route is wrong, which is fine for "Server UP"
        _ref.read(serverStatusProvider.notifier).setStatus(true);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }
}
