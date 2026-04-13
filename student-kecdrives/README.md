# KEC Drives — Student App

Cross-platform mobile application for KEC Placement Portal students, built with **Flutter** and **Dart**.

## Features

- **Drive Discovery** — Browse active placement drives with eligibility checks
- **One-Tap Apply** — Apply to eligible drives instantly
- **Profile Management** — Edit personal, academic, and document details
- **Document Upload** — Upload resumes, certificates with image compression
- **Push Notifications** — Real-time alerts for new drives and updates via FCM
- **Onboarding Flow** — Guided setup for first-time users
- **Drive Requests** — Request new placement drives
- **Password Management** — Change and reset password
- **Offline Support** — Cached data with connectivity detection
- **Server Status** — Auto-detect and display server availability

## Tech Stack

- **Framework:** Flutter 3.10+
- **Language:** Dart 3.10+
- **State Management:** Riverpod 3 (with code generation)
- **Routing:** Go Router 17
- **HTTP Client:** http 1.6
- **Push Notifications:** Firebase Cloud Messaging + Flutter Local Notifications
- **Analytics:** Firebase Analytics
- **Storage:** Shared Preferences + Flutter Secure Storage
- **Image Handling:** Flutter Image Compress, Cached Network Image

## Project Structure

```
lib/
├── main.dart                    # App entry point
├── firebase_options.dart        # Firebase config (auto-generated)
├── providers/
│   ├── auth_provider.dart       # Auth state
│   ├── drive_provider.dart      # Drive data
│   ├── profile_provider.dart    # Profile state
│   ├── onboarding_provider.dart # Onboarding flow
│   ├── server_status_provider.dart
│   └── theme_provider.dart
├── screens/
│   ├── login_screen.dart
│   ├── shell_screen.dart        # Main scaffold with bottom nav
│   ├── drive_detail_screen.dart
│   ├── notifications_screen.dart
│   ├── requests_screen.dart
│   ├── onboarding/              # Onboarding flow screens
│   ├── tabs/                    # Home, profile, etc.
│   └── admin/                   # Admin-only views
├── services/
│   ├── api_client.dart          # HTTP wrapper
│   ├── auth_service.dart        # Auth API
│   ├── drive_service.dart       # Drive API
│   ├── student_service.dart     # Student API
│   ├── connectivity_service.dart
│   └── notification_service.dart
├── widgets/
│   ├── drive_card.dart          # Drive list card
│   ├── server_error_overlay.dart
│   ├── app_button.dart
│   └── haptic_refresh_indicator.dart
├── utils/                       # Helper functions
└── router/                      # Go Router config
```

## Setup

### Prerequisites

- Flutter SDK 3.10+
- Dart SDK 3.10+
- Android Studio / Xcode (for mobile builds)
- Firebase project configured

### Environment Variables

Create a `.env` file in the project root:

```env
API_BASE_URL=https://app.api-kecdrives.com/api
```

### Development

```bash
# Get dependencies
flutter pub get

# Run code generation (Riverpod)
dart run build_runner build --delete-conflicting-outputs

# Generate splash screen
dart run flutter_native_splash:create

# Generate app icons
dart run flutter_launcher_icons

# Run on device/emulator
flutter run

# Analyze code
flutter analyze
```

### Building

```bash
# Android APK
flutter build apk --release

# Android App Bundle
flutter build appbundle --release

# iOS
flutter build ios --release
```

## Firebase

- **Project:** `kecdrives-fcm`
- **Services:** Analytics, Cloud Messaging (push notifications)
- **Platforms:** Android, iOS, Web, macOS, Windows

Firebase config is auto-generated in `firebase_options.dart`. Platform-specific config files:
- Android: `android/app/google-services.json`
- iOS: `ios/Runner/GoogleService-Info.plist`

## Platforms

| Platform | Status |
|----------|--------|
| Android | Production |
| iOS | Supported |
| Web | Configured |
| macOS | Configured |
| Windows | Configured |
| Linux | Configured |

## License

Private — KEC Internal Use Only.
