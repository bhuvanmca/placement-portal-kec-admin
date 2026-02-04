import 'dart:convert';
import 'dart:developer';
import 'package:flutter/material.dart'; // [NEW] Required for ValueNotifier
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../utils/constants.dart';
import 'notification_storage_service.dart'; // [NEW]

// CRITICAL: Top-level function for background message handling
// This runs when app is completely terminated
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // Must initialize Firebase again in background isolate
  // await Firebase.initializeApp(); // Uncomment if needed

  log('Handling background message: ${message.messageId}');
  log('Title: ${message.notification?.title}');
  log('Body: ${message.notification?.body}');

  // Notification will be shown automatically by FCM on Android
  // No need to manually show it here
}

class NotificationService {
  static final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  // Notifier to trigger UI refresh
  static final ValueNotifier<bool> refreshTrigger = ValueNotifier(false);

  // Initialize Notification Service
  static Future<void> initialize() async {
    // 1. Request Permission
    NotificationSettings settings = await FirebaseMessaging.instance
        .requestPermission(alert: true, badge: true, sound: true);

    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      log('User granted permission');
    } else {
      log('User declined or has not accepted permission');
      return;
    }

    // 2. Initialize Local Notifications (for foreground display)
    const AndroidInitializationSettings initializationSettingsAndroid =
        AndroidInitializationSettings('@mipmap/ic_launcher');

    // Note: iOS setup requires more config in AppDelegate, skipping for minimal implementation
    const InitializationSettings initializationSettings =
        InitializationSettings(android: initializationSettingsAndroid);

    await _localNotifications.initialize(
      initializationSettings,
      onDidReceiveNotificationResponse: (details) {
        // Handle notification tap
        log('Notification clicked: ${details.payload}');
        // You can use a router/navigator key to navigate here
      },
    );

    // 3. Handle Foreground Messages
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      log('Received foreground message: ${message.notification?.title}');

      // Save to local storage
      NotificationStorageService.saveNotification(message);

      refreshTrigger.value =
          !refreshTrigger.value; // Toggle to trigger listener
      _showLocalNotification(message);
    });

    // 5. Listen for token refreshes
    FirebaseMessaging.instance.onTokenRefresh.listen((newToken) {
      _sendTokenToBackend(newToken);
    });
  }

  // Show Local Notification
  static Future<void> _showLocalNotification(RemoteMessage message) async {
    RemoteNotification? notification = message.notification;
    AndroidNotification? android = message.notification?.android;

    if (notification != null && android != null) {
      await showNotification(notification.title ?? '', notification.body ?? '');
    }
  }

  // Public method to show notification
  static Future<void> showNotification(String title, String body) async {
    await _localNotifications.show(
      DateTime.now().millisecond, // Unique ID
      title,
      body,
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'placement_channel',
          'Placement Updates',
          channelDescription: 'Notifications for new placement drives',
          importance: Importance.max,
          priority: Priority.high,
          icon: '@mipmap/ic_launcher',
        ),
      ),
    );
  }

  // Get and Sync Token
  static Future<void> syncToken() async {
    try {
      String? token = await FirebaseMessaging.instance.getToken();
      if (token != null) {
        log('FCM Token retrieved from Firebase: $token');
        await _sendTokenToBackend(token);
      } else {
        log('FCM Token is NULL from Firebase');
      }
    } catch (e) {
      log('Error getting FCM token: $e');
      rethrow; // Rethrow to allow UI to handle it
    }
  }

  // Send Token to Backend
  static Future<void> _sendTokenToBackend(String fcmToken) async {
    final prefs = await SharedPreferences.getInstance();
    final String? authToken = prefs.getString('token');

    if (authToken == null) return;

    try {
      log(
        'Sending FCM token to backend: ${AppConstants.apiBaseUrl}/v1/user/fcm-token',
      );
      final response = await http.post(
        Uri.parse('${AppConstants.apiBaseUrl}/v1/user/fcm-token'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $authToken',
        },
        body: jsonEncode({'token': fcmToken}),
      );

      log('Backend response code: ${response.statusCode}');
      log('Backend response body: ${response.body}');

      if (response.statusCode == 200) {
        log('FCM Token synced successfully');
      } else {
        log('Failed to sync FCM token: ${response.body}');
        throw Exception(
          'Backend Error: ${response.statusCode} ${response.body}',
        );
      }
    } catch (e) {
      log('Error syncing FCM token: $e');
      rethrow; // Rethrow network errors
    }
  }
}
