import 'dart:async';
import 'dart:convert';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../services/auth_service.dart';
import '../services/api_client.dart';
import '../utils/constants.dart';

part 'auth_provider.g.dart';

@riverpod
AuthService authService(Ref ref) {
  return AuthService(ref.read(apiClientProvider));
}

/// State class to hold login result
class AuthState {
  final bool isProfileComplete;
  final String role;
  final String? error;

  const AuthState({
    this.isProfileComplete = false,
    this.role = 'student',
    this.error,
  });

  bool get isAdmin =>
      role == 'admin' || role == 'coordinator' || role == 'super_admin';
}

@riverpod
class AuthController extends _$AuthController {
  @override
  FutureOr<AuthState?> build() async {
    // Check for existing token on startup
    final token = await ref.read(authServiceProvider).getToken();
    if (token == null || token.isEmpty) return null;

    // Validate token against the server
    try {
      final apiClient = ref.read(apiClientProvider);
      final url = Uri.parse(
        '${AppConstants.baseUrl}${AppConstants.profileRoute}',
      );
      final response = await apiClient.get(
        url,
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        // Token valid — sync profile completion from server
        final body = json.decode(response.body);
        final data = body['data'] ?? body;
        // GET /profile doesn't return is_profile_complete, so fall back
        // to locally stored value when the field is absent.
        final serverProfileComplete =
            data['is_profile_complete'] as bool? ??
            await ref.read(authServiceProvider).isProfileComplete();
        final role = await ref.read(authServiceProvider).getRole();
        return AuthState(isProfileComplete: serverProfileComplete, role: role);
      }
      // Non-200 (but not 401, which ApiClient already handles)
      return null;
    } on Exception catch (_) {
      // 401 → ApiClient already cleared token → return null → login page
      // Network error → check if token was cleared by ApiClient
      final stillHasToken = await ref.read(authServiceProvider).getToken();
      if (stillHasToken == null || stillHasToken.isEmpty) {
        return null; // Token was cleared (401) → go to login
      }
      // Network error but token still exists → use local state gracefully
      final isProfileComplete = await ref
          .read(authServiceProvider)
          .isProfileComplete();
      final role = await ref.read(authServiceProvider).getRole();
      return AuthState(isProfileComplete: isProfileComplete, role: role);
    }
  }

  Future<void> login(String email, String password) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final response = await ref
          .read(authServiceProvider)
          .login(email, password);

      return AuthState(
        isProfileComplete: response.isProfileComplete,
        role: response.role,
      );
    });
  }

  Future<void> logout() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      await ref.read(authServiceProvider).logout();
      return null;
    });
  }

  Future<void> completeProfile() async {
    final currentRole = state.value?.role ?? 'student';
    await ref.read(authServiceProvider).setProfileComplete(true);
    state = AsyncValue.data(
      AuthState(isProfileComplete: true, role: currentRole),
    );
  }
}
