import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/student_service.dart';

class ProfileNotifier extends AsyncNotifier<Map<String, dynamic>> {
  StudentService get _studentService => ref.read(studentServiceProvider);

  @override
  Future<Map<String, dynamic>> build() async {
    return await _studentService.getProfile();
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => _studentService.getProfile());
  }

  Future<void> refreshQuietly() async {
    final data = await _studentService.getProfile();
    state = AsyncValue.data(data);
  }
}

final profileProvider =
    AsyncNotifierProvider<ProfileNotifier, Map<String, dynamic>>(() {
      return ProfileNotifier();
    });
