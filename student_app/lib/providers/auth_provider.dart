import 'dart:async';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../services/auth_service.dart';
import '../services/api_client.dart';

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
    final isProfileComplete = await ref
        .read(authServiceProvider)
        .isProfileComplete();
    final role = await ref.read(authServiceProvider).getRole();

    if (token != null && token.isNotEmpty) {
      return AuthState(isProfileComplete: isProfileComplete, role: role);
    }
    return null;
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
