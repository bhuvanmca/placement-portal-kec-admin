import 'dart:async';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../services/auth_service.dart';

part 'auth_provider.g.dart';

@riverpod
AuthService authService(Ref ref) {
  return AuthService();
}

/// State class to hold login result
class AuthState {
  final bool isProfileComplete;
  final String? error;

  const AuthState({this.isProfileComplete = false, this.error});
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

    if (token != null && token.isNotEmpty) {
      return AuthState(isProfileComplete: isProfileComplete);
    }
    return null;
  }

  Future<void> login(String email, String password) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final response = await ref
          .read(authServiceProvider)
          .login(email, password);
      return AuthState(isProfileComplete: response.isProfileComplete);
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
    // Optimistic update or wait?
    // Let's rely on service + state update.
    await ref.read(authServiceProvider).setProfileComplete(true);
    state = const AsyncValue.data(AuthState(isProfileComplete: true));
  }
}
