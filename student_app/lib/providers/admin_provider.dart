import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/admin_service.dart';
import '../services/api_client.dart';

// ─── Service Provider ──────────────────────────────────────────────
final adminServiceProvider = Provider<AdminService>(
  (ref) => AdminService(ref.read(apiClientProvider)),
);

// ─── Auth State ────────────────────────────────────────────────────
class AdminAuthState {
  final bool isAuthenticated;
  final String? email;
  final String? error;

  const AdminAuthState({this.isAuthenticated = false, this.email, this.error});
}

class AdminAuthNotifier extends AsyncNotifier<AdminAuthState?> {
  @override
  FutureOr<AdminAuthState?> build() async {
    final isLoggedIn = await ref.read(adminServiceProvider).isLoggedIn();
    if (isLoggedIn) {
      return const AdminAuthState(isAuthenticated: true);
    }
    return null;
  }

  Future<void> login(String email, String password) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      await ref.read(adminServiceProvider).login(email, password);
      return AdminAuthState(isAuthenticated: true, email: email);
    });
  }

  Future<void> logout() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      await ref.read(adminServiceProvider).logout();
      return null;
    });
  }
}

final adminAuthProvider =
    AsyncNotifierProvider<AdminAuthNotifier, AdminAuthState?>(() {
      return AdminAuthNotifier();
    });

// ─── Drives Provider ────────────────────────────────────────────────
final adminDriveListProvider = FutureProvider.autoDispose<List<dynamic>>((
  ref,
) async {
  ref.keepAlive();
  final adminService = ref.watch(adminServiceProvider);
  return adminService.getAllDrives();
});

// ─── Drive Search Query ────────────────────────────────────────────
class AdminDriveSearchNotifier extends Notifier<String> {
  @override
  String build() => '';
  void set(String value) => state = value;
}

final adminDriveSearchProvider =
    NotifierProvider<AdminDriveSearchNotifier, String>(
      () => AdminDriveSearchNotifier(),
    );

// ─── Filtered Drives ───────────────────────────────────────────────
final adminFilteredDrivesProvider =
    Provider.autoDispose<AsyncValue<List<dynamic>>>((ref) {
      final drivesAsync = ref.watch(adminDriveListProvider);
      final search = ref.watch(adminDriveSearchProvider).toLowerCase();

      return drivesAsync.whenData((drives) {
        if (search.isEmpty) return drives;
        return drives.where((drive) {
          final name = (drive['company_name'] ?? '').toString().toLowerCase();
          final id = (drive['id'] ?? '').toString();
          return name.contains(search) || id.contains(search);
        }).toList();
      });
    });

// ─── Students Provider ──────────────────────────────────────────────
final adminStudentListProvider = FutureProvider.autoDispose<List<dynamic>>((
  ref,
) async {
  ref.keepAlive();
  final adminService = ref.watch(adminServiceProvider);
  return adminService.getAllStudents();
});

// ─── Student Search Query ──────────────────────────────────────────
class AdminStudentSearchNotifier extends Notifier<String> {
  @override
  String build() => '';
  void set(String value) => state = value;
}

final adminStudentSearchProvider =
    NotifierProvider<AdminStudentSearchNotifier, String>(
      () => AdminStudentSearchNotifier(),
    );

// ─── Filtered Students ─────────────────────────────────────────────
final adminFilteredStudentsProvider =
    Provider.autoDispose<AsyncValue<List<dynamic>>>((ref) {
      final studentsAsync = ref.watch(adminStudentListProvider);
      final search = ref.watch(adminStudentSearchProvider).toLowerCase();

      return studentsAsync.whenData((students) {
        if (search.isEmpty) return students;
        return students.where((student) {
          final name = (student['full_name'] ?? '').toString().toLowerCase();
          final email = (student['email'] ?? '').toString().toLowerCase();
          final regNo = (student['register_number'] ?? '')
              .toString()
              .toLowerCase();
          return name.contains(search) ||
              email.contains(search) ||
              regNo.contains(search);
        }).toList();
      });
    });

// ─── Student Details Provider ───────────────────────────────────────
final adminStudentDetailProvider = FutureProvider.autoDispose
    .family<Map<String, dynamic>, String>((ref, registerNumber) async {
      final adminService = ref.watch(adminServiceProvider);
      return adminService.getStudentDetails(registerNumber);
    });
