import 'dart:async';
import 'dart:convert';
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

  // Track if a refresh is already in progress
  bool _isRefreshing = false;
  final List<Completer<String?>> _refreshQueue = [];

  /// Attempt to refresh the access token using the stored refresh token
  Future<String?> _refreshAccessToken() async {
    final prefs = await SharedPreferences.getInstance();
    final refreshToken = prefs.getString('refresh_token');
    if (refreshToken == null || refreshToken.isEmpty) return null;

    try {
      final url = Uri.parse(
        '${AppConstants.baseUrl}${AppConstants.loginRoute}'.replaceFirst(
          '/login',
          '/refresh',
        ),
      );
      final response = await _client
          .post(
            url,
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'refresh_token': refreshToken}),
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final newToken = data['token'] as String?;
        if (newToken != null) {
          await prefs.setString('token', newToken);
          return newToken;
        }
      }
    } catch (_) {}
    return null;
  }

  /// Public method to refresh the token (used by upload methods that bypass ApiClient)
  Future<String?> refreshToken() => _refreshAccessToken();

  /// Ensures only one refresh happens at a time. Returns the new token or null.
  Future<String?> _ensureTokenRefreshed() async {
    if (_isRefreshing) {
      // Another request is already refreshing — wait for it
      final completer = Completer<String?>();
      _refreshQueue.add(completer);
      return completer.future;
    }

    _isRefreshing = true;
    final newToken = await _refreshAccessToken();
    _isRefreshing = false;

    // Notify all queued requests
    for (final completer in _refreshQueue) {
      completer.complete(newToken);
    }
    _refreshQueue.clear();

    return newToken;
  }

  /// Replaces the Authorization header with the new token
  Map<String, String> _withNewToken(Map<String, String>? headers, String token) {
    final updated = Map<String, String>.from(headers ?? {});
    updated['Authorization'] = 'Bearer $token';
    return updated;
  }

  Future<void> _handleError(dynamic error, [http.Response? response]) async {
    // Check if device is online first
    if (!await _isOnline()) {
      return; // Handled by ConnectivityOverlay
    }

    // 401 is handled separately in each HTTP method (retry logic)
    // This handles server errors only
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

  /// Handles 401 by refreshing the token and retrying once.
  /// Returns null if refresh failed (session expired).
  Future<http.Response?> _handle401AndRetry(
    Future<http.Response> Function(Map<String, String>? headers) retryFn,
    Map<String, String>? headers,
  ) async {
    final newToken = await _ensureTokenRefreshed();
    if (newToken != null) {
      final retryHeaders = _withNewToken(headers, newToken);
      return retryFn(retryHeaders);
    }
    // Refresh failed — clear session
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    await prefs.remove('refresh_token');
    await prefs.remove('role');
    await prefs.remove('is_profile_complete');
    throw Exception('Session expired. Please log in again.');
  }

  Future<http.Response> get(Uri url, {Map<String, String>? headers}) async {
    try {
      var response = await _client
          .get(url, headers: headers)
          .timeout(_timeout);
      if (response.statusCode == 401) {
        final retried = await _handle401AndRetry(
          (h) => _client.get(url, headers: h).timeout(_timeout),
          headers,
        );
        if (retried != null) response = retried;
      }
      if (response.statusCode >= 500) {
        await _handleError(null, response);
      } else {
        _onSuccess();
      }
      return response;
    } catch (e) {
      if (e is Exception && e.toString().contains('Session expired')) rethrow;
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
      var response = await _client
          .post(url, headers: headers, body: body)
          .timeout(_timeout);
      if (response.statusCode == 401) {
        final retried = await _handle401AndRetry(
          (h) => _client.post(url, headers: h, body: body).timeout(_timeout),
          headers,
        );
        if (retried != null) response = retried;
      }
      if (response.statusCode >= 500) {
        await _handleError(null, response);
      } else {
        _onSuccess();
      }
      return response;
    } catch (e) {
      if (e is Exception && e.toString().contains('Session expired')) rethrow;
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
      var response = await _client
          .put(url, headers: headers, body: body)
          .timeout(_timeout);
      if (response.statusCode == 401) {
        final retried = await _handle401AndRetry(
          (h) => _client.put(url, headers: h, body: body).timeout(_timeout),
          headers,
        );
        if (retried != null) response = retried;
      }
      if (response.statusCode >= 500) {
        await _handleError(null, response);
      } else {
        _onSuccess();
      }
      return response;
    } catch (e) {
      if (e is Exception && e.toString().contains('Session expired')) rethrow;
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
      var response = await _client
          .delete(url, headers: headers)
          .timeout(_timeout);
      if (response.statusCode == 401) {
        final retried = await _handle401AndRetry(
          (h) => _client.delete(url, headers: h).timeout(_timeout),
          headers,
        );
        if (retried != null) response = retried;
      }
      if (response.statusCode >= 500) {
        await _handleError(null, response);
      } else {
        _onSuccess();
      }
      return response;
    } catch (e) {
      if (e is Exception && e.toString().contains('Session expired')) rethrow;
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
      var response = await _client
          .patch(url, headers: headers, body: body)
          .timeout(_timeout);
      if (response.statusCode == 401) {
        final retried = await _handle401AndRetry(
          (h) => _client.patch(url, headers: h, body: body).timeout(_timeout),
          headers,
        );
        if (retried != null) response = retried;
      }
      if (response.statusCode >= 500) {
        await _handleError(null, response);
      } else {
        _onSuccess();
      }
      return response;
    } catch (e) {
      if (e is Exception && e.toString().contains('Session expired')) rethrow;
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
