import 'dart:convert';
import 'dart:developer';
import 'dart:math' hide log;
import 'package:flutter/material.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../utils/constants.dart';
import 'notification_storage_service.dart';

class NotificationService {
  static final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  // Notifier to trigger UI refresh
  static final ValueNotifier<bool> refreshTrigger = ValueNotifier(false);

  // Random for unique notification IDs
  static final Random _random = Random();

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

    // 2. Create Android notification channel
    const AndroidNotificationChannel channel = AndroidNotificationChannel(
      'placement_channel',
      'Placement Updates',
      description: 'Notifications for new placement drives',
      importance: Importance.max,
    );

    await _localNotifications
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >()
        ?.createNotificationChannel(channel);

    // 3. Initialize Local Notifications (for foreground display)
    const AndroidInitializationSettings initializationSettingsAndroid =
        AndroidInitializationSettings('@mipmap/ic_launcher');

    const DarwinInitializationSettings initializationSettingsIOS =
        DarwinInitializationSettings();

    const InitializationSettings initializationSettings =
        InitializationSettings(
          android: initializationSettingsAndroid,
          iOS: initializationSettingsIOS,
        );

    await _localNotifications.initialize(
      initializationSettings,
      onDidReceiveNotificationResponse: (details) {
        log('Notification clicked: ${details.payload}');
        _handleNotificationTap(details.payload);
      },
    );

    // 4. Handle Foreground Messages
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      log('Received foreground message: ${message.notification?.title}');

      // Save to local storage
      NotificationStorageService.saveNotification(message);

      refreshTrigger.value =
          !refreshTrigger.value; // Toggle to trigger listener
      _showLocalNotification(message);
    });

    // 5. Handle notification tap when app is in background (not terminated)
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      log(
        'Notification opened app from background: ${message.notification?.title}',
      );

      // Save to storage in case it wasn't saved by background handler
      NotificationStorageService.saveNotification(message);

      refreshTrigger.value = !refreshTrigger.value;
    });

    // 6. Check if app was opened from a terminated state via notification
    RemoteMessage? initialMessage = await FirebaseMessaging.instance
        .getInitialMessage();
    if (initialMessage != null) {
      log(
        'App opened from terminated state via notification: ${initialMessage.notification?.title}',
      );

      // Save to storage
      NotificationStorageService.saveNotification(initialMessage);

      refreshTrigger.value = !refreshTrigger.value;
    }

    // 7. Listen for token refreshes
    FirebaseMessaging.instance.onTokenRefresh.listen((newToken) {
      _sendTokenToBackend(newToken);
    });
  }

  // Handle notification tap navigation
  static void _handleNotificationTap(String? payload) {
    if (payload == null) return;
    try {
      final data = jsonDecode(payload) as Map<String, dynamic>;
      final type = data['type'];
      if (type == 'new_drive') {
        // Trigger a refresh so drives screen updates
        refreshTrigger.value = !refreshTrigger.value;
      }
    } catch (e) {
      log('Error parsing notification payload: $e');
    }
  }

  // Show Local Notification
  static Future<void> _showLocalNotification(RemoteMessage message) async {
    RemoteNotification? notification = message.notification;

    if (notification != null) {
      // Pass data as payload for tap handling
      String? payload;
      if (message.data.isNotEmpty) {
        payload = jsonEncode(message.data);
      }

      await _localNotifications.show(
        _random.nextInt(100000), // Unique ID to avoid collisions
        notification.title ?? '',
        notification.body ?? '',
        const NotificationDetails(
          android: AndroidNotificationDetails(
            'placement_channel',
            'Placement Updates',
            channelDescription: 'Notifications for new placement drives',
            importance: Importance.max,
            priority: Priority.high,
            icon: '@mipmap/ic_launcher',
          ),
          iOS: DarwinNotificationDetails(),
        ),
        payload: payload,
      );
    }
  }

  // Public method to show notification
  static Future<void> showNotification(String title, String body) async {
    await _localNotifications.show(
      _random.nextInt(100000),
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
        iOS: DarwinNotificationDetails(),
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
