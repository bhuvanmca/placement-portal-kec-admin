import 'dart:async';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../providers/server_status_provider.dart';
import '../utils/constants.dart';

final apiClientProvider = Provider<ApiClient>((ref) => ApiClient(ref));

class ApiClient {
  final Ref _ref;
  final http.Client _client = http.Client();
  static const _timeout = Duration(seconds: 15);

  // Server availability tracking — requires consecutive failures to avoid false positives
  static const _serverDownThreshold = 3;
  static const _failureWindowMs = 30000; // 30s window for counting failures
  static const _cooldownMs =
      120000; // 2 min cooldown between server-down events
  int _consecutiveFailures = 0;
  int _lastFailureTime = 0;
  int _lastServerDownEventTime = 0;

  ApiClient(this._ref);

  /// Helper to check if we are online before assuming server is down
  Future<bool> _isOnline() async {
    final connectivityResults = await Connectivity().checkConnectivity();
    return !connectivityResults.contains(ConnectivityResult.none);
  }

  /// Reset failure tracking on successful response
  void _onSuccess() {
    _consecutiveFailures = 0;
  }

  Future<void> _handleError(dynamic error, [http.Response? response]) async {
    // Check if device is online first
    if (!await _isOnline()) {
      return; // Handled by ConnectivityOverlay
    }

    // Handle expired/invalid JWT
    if (response != null && response.statusCode == 401) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('token');
      await prefs.remove('role');
      await prefs.remove('is_profile_complete');
      throw Exception('Session expired. Please log in again.');
    }

    bool isServerIssue = false;

    if (error is SocketException || error is TimeoutException) {
      isServerIssue = true;
    } else if (response != null) {
      if (response.statusCode >= 502 && response.statusCode <= 504) {
        isServerIssue = true;
      }
    }

    if (isServerIssue) {
      final now = DateTime.now().millisecondsSinceEpoch;

      // Reset counter if failures are too spread apart
      if (now - _lastFailureTime > _failureWindowMs) {
        _consecutiveFailures = 0;
      }
      _consecutiveFailures++;
      _lastFailureTime = now;

      // Only trigger server-down after threshold AND respecting cooldown
      if (_consecutiveFailures >= _serverDownThreshold &&
          now - _lastServerDownEventTime > _cooldownMs) {
        final isActuallyDown = !await _quickHealthCheck();
        if (isActuallyDown) {
          _lastServerDownEventTime = now;
          _ref.read(serverStatusProvider.notifier).setStatus(false);
        } else {
          _consecutiveFailures = 0;
        }
      }
    }
  }

  Future<http.Response> get(Uri url, {Map<String, String>? headers}) async {
    try {
      final response = await _client
          .get(url, headers: headers)
          .timeout(_timeout);
      if (response.statusCode == 401) await _handleError(null, response);
      if (response.statusCode >= 500) {
        await _handleError(null, response);
      } else {
        _onSuccess();
      }
      return response;
    } catch (e) {
      await _handleError(e);
      if (e is SocketException ||
          e is http.ClientException ||
          e is TimeoutException) {
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
      final response = await _client
          .post(url, headers: headers, body: body)
          .timeout(_timeout);
      if (response.statusCode == 401) await _handleError(null, response);
      if (response.statusCode >= 500) {
        await _handleError(null, response);
      } else {
        _onSuccess();
      }
      return response;
    } catch (e) {
      await _handleError(e);
      if (e is SocketException ||
          e is http.ClientException ||
          e is TimeoutException) {
        throw Exception(
          'Server unavailable. Please check your internet connection.',
        );
      }
      rethrow;
    }
  }

  Future<http.Response> put(
    Uri url, {
    Map<String, String>? headers,
    Object? body,
  }) async {
    try {
      final response = await _client
          .put(url, headers: headers, body: body)
          .timeout(_timeout);
      if (response.statusCode == 401) await _handleError(null, response);
      if (response.statusCode >= 500) {
        await _handleError(null, response);
      } else {
        _onSuccess();
      }
      return response;
    } catch (e) {
      await _handleError(e);
      if (e is SocketException ||
          e is http.ClientException ||
          e is TimeoutException) {
        throw Exception(
          'Server unavailable. Please check your internet connection.',
        );
      }
      rethrow;
    }
  }

  Future<http.Response> delete(Uri url, {Map<String, String>? headers}) async {
    try {
      final response = await _client
          .delete(url, headers: headers)
          .timeout(_timeout);
      if (response.statusCode == 401) await _handleError(null, response);
      if (response.statusCode >= 500) {
        await _handleError(null, response);
      } else {
        _onSuccess();
      }
      return response;
    } catch (e) {
      await _handleError(e);
      if (e is SocketException ||
          e is http.ClientException ||
          e is TimeoutException) {
        throw Exception(
          'Server unavailable. Please check your internet connection.',
        );
      }
      rethrow;
    }
  }

  Future<http.Response> patch(
    Uri url, {
    Map<String, String>? headers,
    Object? body,
  }) async {
    try {
      final response = await _client
          .patch(url, headers: headers, body: body)
          .timeout(_timeout);
      if (response.statusCode == 401) await _handleError(null, response);
      if (response.statusCode >= 500) {
        await _handleError(null, response);
      } else {
        _onSuccess();
      }
      return response;
    } catch (e) {
      await _handleError(e);
      if (e is SocketException ||
          e is http.ClientException ||
          e is TimeoutException) {
        throw Exception(
          'Server unavailable. Please check your internet connection.',
        );
      }
      rethrow;
    }
  }

  /// Quick health check without updating provider — used internally
  Future<bool> _quickHealthCheck() async {
    try {
      final response = await _client
          .get(Uri.parse('${AppConstants.apiBaseUrl}/health'))
          .timeout(const Duration(seconds: 5));
      return response.statusCode == 200 || response.statusCode == 404;
    } catch (_) {
      return false;
    }
  }

  /// Check server health (public, updates provider)
  Future<bool> checkHealth(String baseUrl) async {
    try {
      final response = await _client
          .get(Uri.parse('$baseUrl/health'))
          .timeout(const Duration(seconds: 5));

      if (response.statusCode == 200 || response.statusCode == 404) {
        _ref.read(serverStatusProvider.notifier).setStatus(true);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }
}
