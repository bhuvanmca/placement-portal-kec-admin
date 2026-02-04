import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

class NotificationStorageService {
  static const String _storageKey = 'notification_history';

  // Save a new notification
  static Future<void> saveNotification(RemoteMessage message) async {
    final prefs = await SharedPreferences.getInstance();
    final List<String> history = prefs.getStringList(_storageKey) ?? [];

    final notificationData = {
      'id': message.messageId ?? DateTime.now().toIso8601String(),
      'title': message.notification?.title ?? 'No Title',
      'body': message.notification?.body ?? 'No Body',
      'sentTime':
          message.sentTime?.toIso8601String() ??
          DateTime.now().toIso8601String(),
      'data': message.data,
      'isRead': false,
    };

    // Add to beginning of list
    history.insert(0, jsonEncode(notificationData));

    // Limit history size (e.g., last 50 notifications)
    if (history.length > 50) {
      history.removeRange(50, history.length);
    }

    await prefs.setStringList(_storageKey, history);
  }

  // Get all notifications
  static Future<List<Map<String, dynamic>>> getNotifications() async {
    final prefs = await SharedPreferences.getInstance();
    final List<String> history = prefs.getStringList(_storageKey) ?? [];

    return history.map((e) => jsonDecode(e) as Map<String, dynamic>).toList();
  }

  // Clear all notifications
  static Future<void> clearNotifications() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_storageKey);
  }

  // Mark all as read (Optional enhancement for future)
  static Future<void> markAllAsRead() async {
    final prefs = await SharedPreferences.getInstance();
    final List<String> history = prefs.getStringList(_storageKey) ?? [];

    final updatedHistory = history.map((e) {
      final map = jsonDecode(e) as Map<String, dynamic>;
      map['isRead'] = true;
      return jsonEncode(map);
    }).toList();

    await prefs.setStringList(_storageKey, updatedHistory);
  }
}
