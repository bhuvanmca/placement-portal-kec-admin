import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'router/router.dart';
import 'utils/constants.dart';

import 'package:firebase_core/firebase_core.dart'; // [NEW]
import 'services/notification_service.dart';
import 'widgets/server_error_overlay.dart'; // [NEW]
import 'services/connectivity_service.dart'; // [NEW]
import 'services/notification_storage_service.dart'; // [NEW]

import 'package:flutter_dotenv/flutter_dotenv.dart';

// Top-level function to handle background messages when app is terminated
// This MUST be a top-level function (not inside a class)
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // Initialize Firebase if not already initialized
  await Firebase.initializeApp();

  // Persist notification
  await NotificationStorageService.saveNotification(message);

  debugPrint('Background message received: ${message.messageId}');
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: ".env");

  try {
    await Firebase.initializeApp();

    // CRITICAL: Register background message handler BEFORE any app logic
    // This allows notifications when app is completely terminated
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

    // Initialize services in parallel to allow app startup
    // Don't await them to prevent blocking the first frame
    NotificationService.initialize()
        .then((_) {
          NotificationService.syncToken();
        })
        .catchError((e) {
          debugPrint("NotificationService init failed: $e");
        });
  } catch (e) {
    debugPrint("Firebase init failed: $e");
  }

  runApp(const ProviderScope(child: StudentApp()));
}

class StudentApp extends ConsumerWidget {
  const StudentApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      debugShowCheckedModeBanner: false,
      title: 'KEC Student Portal',
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppConstants.primaryColor,
          primary: AppConstants.primaryColor,
        ),
        textTheme: GoogleFonts.geistTextTheme(),
        scaffoldBackgroundColor: AppConstants.backgroundColor,
        appBarTheme: const AppBarTheme(
          centerTitle: false,
          backgroundColor: Colors.white,
          surfaceTintColor: Colors.white,
        ),
      ),
      routerConfig: router,
      builder: (context, child) {
        return Stack(
          children: [
            ?child,
            const ConnectivityOverlay(),
            const ServerErrorOverlay(), // [NEW]
          ],
        );
      },
    );
  }
}

class ConnectivityOverlay extends ConsumerWidget {
  const ConnectivityOverlay({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isConnected = ref.watch(isConnectedProvider);

    if (isConnected) return const SizedBox.shrink();

    return Material(
      color: Colors.black.withValues(alpha: 0.6),
      child: Center(
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 32),
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.2),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.wifi_off_rounded, size: 48, color: Colors.red),
              const SizedBox(height: 16),
              const Text(
                'No Internet Connection',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.black87,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              const Text(
                'Please check your network settings and try again.',
                style: TextStyle(fontSize: 14, color: Colors.black54),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
