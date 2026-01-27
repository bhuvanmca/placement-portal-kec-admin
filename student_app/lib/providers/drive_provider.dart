import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/drive_service.dart';

final driveServiceProvider = Provider<DriveService>((ref) => DriveService());

final driveListProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  // Keep the state alive even if not being listened to (caching)
  // Use keepAlive for 5 minutes or until manually invalidated
  final link = ref.keepAlive();
  
  // Auto-dispose if not used for 5 minutes? 
  // For now, let's just keep it alive while the app is running or until refresh.
  // Actually, standard keepAlive is fine for tab switching.
  
  final driveService = ref.watch(driveServiceProvider);
  return driveService.getDrives();
});
