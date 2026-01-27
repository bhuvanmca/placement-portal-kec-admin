import 'dart:convert';
import 'dart:developer';
import 'package:flutter/material.dart'; // [NEW] Required for ValueNotifier
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../utils/constants.dart';

class NotificationService {
  static final FlutterLocalNotificationsPlugin _localNotifications = FlutterLocalNotificationsPlugin();
  
  // Notifier to trigger UI refresh
  static final ValueNotifier<bool> refreshTrigger = ValueNotifier(false);

  // Initialize Notification Service
  static Future<void> initialize() async {
    // 1. Request Permission
    NotificationSettings settings = await FirebaseMessaging.instance.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

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
    const InitializationSettings initializationSettings = InitializationSettings(
      android: initializationSettingsAndroid,
    );

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
      refreshTrigger.value = !refreshTrigger.value; // Toggle to trigger listener
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
      await _localNotifications.show(
        notification.hashCode,
        notification.title,
        notification.body,
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
        payload: jsonEncode(message.data),
      );
    }
  }

  // Get and Sync Token
  static Future<void> syncToken() async {
    String? token = await FirebaseMessaging.instance.getToken();
    if (token != null) {
      log('FCM Token: $token');
      await _sendTokenToBackend(token);
    }
  }

  // Send Token to Backend
  static Future<void> _sendTokenToBackend(String fcmToken) async {
    final prefs = await SharedPreferences.getInstance();
    final String? authToken = prefs.getString('token');

    if (authToken == null) return;

    try {
      final response = await http.post(
        Uri.parse('${AppConstants.apiBaseUrl}/user/fcm-token'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $authToken',
        },
        body: jsonEncode({'token': fcmToken}),
      );

      if (response.statusCode == 200) {
        log('FCM Token synced successfully');
      } else {
        log('Failed to sync FCM token: ${response.body}');
      }
    } catch (e) {
      log('Error syncing FCM token: $e');
    }
  }
}

// Top-level background handler
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  log("Handling background message: ${message.messageId}");
}
