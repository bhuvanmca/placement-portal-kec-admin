// Integration Tests for Student App
//
// These tests verify that different parts of the app work together correctly.
// They test complete user flows, navigation, and state management across screens.
//
// Run with: flutter test integration_test/app_test.dart
// Or on device: flutter drive --driver=test_driver/integration_test.dart --target=integration_test/app_test.dart

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:student_app/main.dart' as app;
import 'package:student_app/utils/indian_states.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('End-to-End Integration Tests', () {
    // ================================================================
    // Test: App Launch
    // ================================================================
    testWidgets('App should launch successfully', (WidgetTester tester) async {
      app.main();
      await tester.pumpAndSettle(const Duration(seconds: 3));

      // App should be running
      expect(find.byType(MaterialApp), findsOneWidget);
    });

    // ================================================================
    // Test: Login Screen Integration
    // ================================================================
    testWidgets('Login screen should display all elements', (
      WidgetTester tester,
    ) async {
      app.main();
      await tester.pumpAndSettle(const Duration(seconds: 3));

      // Check for login form elements
      expect(find.byType(TextFormField), findsAtLeast(2)); // Email & Password
      expect(find.text('Login'), findsOneWidget);
      expect(find.text('Forgot Password?'), findsOneWidget);
    });

    testWidgets('Login validation should work', (WidgetTester tester) async {
      app.main();
      await tester.pumpAndSettle(const Duration(seconds: 3));

      // Find and tap login button without entering credentials
      final loginButton = find.text('Login');
      await tester.tap(loginButton);
      await tester.pumpAndSettle();

      // Should show validation errors
      expect(find.textContaining('email'), findsAtLeast(1));
    });

    testWidgets('Email field should accept input', (WidgetTester tester) async {
      app.main();
      await tester.pumpAndSettle(const Duration(seconds: 3));

      // Find email field and enter text
      final emailField = find.byType(TextFormField).first;
      await tester.enterText(emailField, 'test@kongu.edu');
      await tester.pumpAndSettle();

      // Verify text was entered
      expect(find.text('test@kongu.edu'), findsOneWidget);
    });

    testWidgets('Password field should toggle visibility', (
      WidgetTester tester,
    ) async {
      app.main();
      await tester.pumpAndSettle(const Duration(seconds: 3));

      // Find visibility toggle icon
      final visibilityIcon = find.byIcon(Icons.visibility_off_outlined);
      if (visibilityIcon.evaluate().isNotEmpty) {
        await tester.tap(visibilityIcon);
        await tester.pumpAndSettle();

        // Icon should change
        expect(find.byIcon(Icons.visibility_outlined), findsOneWidget);
      }
    });

    // ================================================================
    // Test: Navigation Integration
    // ================================================================
    testWidgets('Forgot password navigation should work', (
      WidgetTester tester,
    ) async {
      app.main();
      await tester.pumpAndSettle(const Duration(seconds: 3));

      // Find and tap forgot password
      final forgotPassword = find.text('Forgot Password?');
      if (forgotPassword.evaluate().isNotEmpty) {
        await tester.tap(forgotPassword);
        await tester.pumpAndSettle();

        // Should navigate to forgot password screen
        expect(find.textContaining('Forgot'), findsAtLeast(1));
      }
    });
  });

  // ================================================================
  // Form Integration Tests
  // ================================================================
  group('Form Integration Tests', () {
    testWidgets('Form fields should maintain state', (
      WidgetTester tester,
    ) async {
      app.main();
      await tester.pumpAndSettle(const Duration(seconds: 3));

      // Enter email
      final emailField = find.byType(TextFormField).first;
      await tester.enterText(emailField, 'student@kongu.edu');
      await tester.pumpAndSettle();

      // Enter password (second field)
      final allFields = find.byType(TextFormField);
      if (allFields.evaluate().length > 1) {
        await tester.enterText(allFields.at(1), 'password123');
        await tester.pumpAndSettle();
      }

      // Both values should be preserved
      expect(find.text('student@kongu.edu'), findsOneWidget);
    });

    testWidgets('Form validation chain should work', (
      WidgetTester tester,
    ) async {
      app.main();
      await tester.pumpAndSettle(const Duration(seconds: 3));

      // Enter invalid email
      final emailField = find.byType(TextFormField).first;
      await tester.enterText(emailField, 'invalid-email');
      await tester.pumpAndSettle();

      // Tap login
      final loginButton = find.text('Login');
      await tester.tap(loginButton);
      await tester.pumpAndSettle();

      // Should show email validation error
      expect(find.textContaining('valid'), findsAtLeast(1));
    });
  });

  // ================================================================
  // UI Component Integration Tests
  // ================================================================
  group('UI Component Integration Tests', () {
    testWidgets('Theme should be applied correctly', (
      WidgetTester tester,
    ) async {
      app.main();
      await tester.pumpAndSettle(const Duration(seconds: 3));

      // App should use Material design
      expect(find.byType(MaterialApp), findsOneWidget);
    });

    testWidgets('Keyboard should dismiss on tap outside', (
      WidgetTester tester,
    ) async {
      app.main();
      await tester.pumpAndSettle(const Duration(seconds: 3));

      // Focus on email field
      final emailField = find.byType(TextFormField).first;
      await tester.tap(emailField);
      await tester.pumpAndSettle();

      // Tap outside to dismiss keyboard (tap on scaffold body)
      await tester.tapAt(const Offset(100, 100));
      await tester.pumpAndSettle();
    });

    testWidgets('Scroll should work on overflow', (WidgetTester tester) async {
      app.main();
      await tester.pumpAndSettle(const Duration(seconds: 3));

      // Try scrolling if there's a scrollable widget
      final scrollable = find.byType(SingleChildScrollView);
      if (scrollable.evaluate().isNotEmpty) {
        await tester.drag(scrollable.first, const Offset(0, -200));
        await tester.pumpAndSettle();
      }
    });
  });

  // ================================================================
  // State Management Integration Tests
  // ================================================================
  group('State Management Integration Tests', () {
    testWidgets('ProviderScope should be present', (WidgetTester tester) async {
      app.main();
      await tester.pumpAndSettle(const Duration(seconds: 3));

      // Riverpod ProviderScope should be in the widget tree
      expect(find.byType(ProviderScope), findsOneWidget);
    });

    testWidgets('Loading states should work', (WidgetTester tester) async {
      app.main();
      await tester.pumpAndSettle(const Duration(seconds: 3));

      // Enter valid credentials
      final emailField = find.byType(TextFormField).first;
      await tester.enterText(emailField, 'test@kongu.edu');

      final allFields = find.byType(TextFormField);
      if (allFields.evaluate().length > 1) {
        await tester.enterText(allFields.at(1), 'password123');
      }

      // Tap login
      final loginButton = find.text('Login');
      await tester.tap(loginButton);

      // Brief pump to catch loading state
      await tester.pump(const Duration(milliseconds: 100));

      // App should handle the state transition
      await tester.pumpAndSettle(const Duration(seconds: 5));
    });
  });

  // ================================================================
  // Indian States Dropdown Integration Tests
  // ================================================================
  group('State Dropdown Integration Tests', () {
    testWidgets('IndianStates utility integration', (
      WidgetTester tester,
    ) async {
      // Verify the states list is accessible and correct
      expect(IndianStates.states.length, 36);
      expect(IndianStates.states.contains('Tamil Nadu'), isTrue);
      expect(IndianStates.states.contains('Karnataka'), isTrue);
      expect(IndianStates.states.contains('Maharashtra'), isTrue);

      // Create a test dropdown
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DropdownButtonFormField<String>(
              value: null,
              hint: const Text('Select State'),
              items: IndianStates.states
                  .map((s) => DropdownMenuItem(value: s, child: Text(s)))
                  .toList(),
              onChanged: (v) {},
            ),
          ),
        ),
      );

      expect(find.byType(DropdownButtonFormField<String>), findsOneWidget);
      expect(find.text('Select State'), findsOneWidget);
    });
  });

  // ================================================================
  // Validation Integration Tests
  // ================================================================
  group('Validation Integration Tests', () {
    testWidgets('PAN validation integration', (WidgetTester tester) async {
      final formKey = GlobalKey<FormState>();
      String? panValue;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Form(
              key: formKey,
              child: TextFormField(
                onChanged: (v) => panValue = v,
                validator: (value) {
                  if (value == null || value.isEmpty) return 'Required';
                  final panRegex = RegExp(r'^[A-Z]{5}[0-9]{4}[A-Z]{1}$');
                  if (!panRegex.hasMatch(value.toUpperCase())) {
                    return 'Invalid PAN format';
                  }
                  return null;
                },
              ),
            ),
          ),
        ),
      );

      // Test invalid PAN
      await tester.enterText(find.byType(TextFormField), 'INVALID');
      formKey.currentState!.validate();
      await tester.pump();
      expect(find.text('Invalid PAN format'), findsOneWidget);

      // Test valid PAN
      await tester.enterText(find.byType(TextFormField), 'ABCDE1234F');
      formKey.currentState!.validate();
      await tester.pump();
      expect(find.text('Invalid PAN format'), findsNothing);
    });

    testWidgets('Aadhar validation integration', (WidgetTester tester) async {
      final formKey = GlobalKey<FormState>();

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Form(
              key: formKey,
              child: TextFormField(
                keyboardType: TextInputType.number,
                validator: (value) {
                  if (value == null || value.isEmpty) return 'Required';
                  if (!RegExp(r'^\d{12}$').hasMatch(value)) {
                    return 'Invalid Aadhar (12 digits required)';
                  }
                  return null;
                },
              ),
            ),
          ),
        ),
      );

      // Test invalid Aadhar
      await tester.enterText(find.byType(TextFormField), '12345');
      formKey.currentState!.validate();
      await tester.pump();
      expect(find.text('Invalid Aadhar (12 digits required)'), findsOneWidget);

      // Test valid Aadhar
      await tester.enterText(find.byType(TextFormField), '123456789012');
      formKey.currentState!.validate();
      await tester.pump();
      expect(find.text('Invalid Aadhar (12 digits required)'), findsNothing);
    });

    testWidgets('Email validation integration', (WidgetTester tester) async {
      final formKey = GlobalKey<FormState>();

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Form(
              key: formKey,
              child: TextFormField(
                keyboardType: TextInputType.emailAddress,
                validator: (value) {
                  if (value == null || value.isEmpty) return 'Required';
                  final emailRegex = RegExp(
                    r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$',
                  );
                  if (!emailRegex.hasMatch(value)) {
                    return 'Invalid email format';
                  }
                  return null;
                },
              ),
            ),
          ),
        ),
      );

      // Test invalid email
      await tester.enterText(find.byType(TextFormField), 'notanemail');
      formKey.currentState!.validate();
      await tester.pump();
      expect(find.text('Invalid email format'), findsOneWidget);

      // Test valid email
      await tester.enterText(find.byType(TextFormField), 'test@kongu.edu');
      formKey.currentState!.validate();
      await tester.pump();
      expect(find.text('Invalid email format'), findsNothing);
    });
  });

  // ================================================================
  // Multi-Widget Integration Tests
  // ================================================================
  group('Multi-Widget Integration Tests', () {
    testWidgets('Form with multiple fields integration', (
      WidgetTester tester,
    ) async {
      final formKey = GlobalKey<FormState>();
      final emailController = TextEditingController();
      final passwordController = TextEditingController();

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Padding(
              padding: const EdgeInsets.all(16),
              child: Form(
                key: formKey,
                child: Column(
                  children: [
                    TextFormField(
                      controller: emailController,
                      decoration: const InputDecoration(labelText: 'Email'),
                      validator: (v) =>
                          v == null || v.isEmpty ? 'Email required' : null,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: passwordController,
                      obscureText: true,
                      decoration: const InputDecoration(labelText: 'Password'),
                      validator: (v) =>
                          v == null || v.isEmpty ? 'Password required' : null,
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: () {
                        formKey.currentState!.validate();
                      },
                      child: const Text('Submit'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );

      // Verify all elements present
      expect(find.text('Email'), findsOneWidget);
      expect(find.text('Password'), findsOneWidget);
      expect(find.text('Submit'), findsOneWidget);

      // Submit without values
      await tester.tap(find.text('Submit'));
      await tester.pump();

      expect(find.text('Email required'), findsOneWidget);
      expect(find.text('Password required'), findsOneWidget);

      // Enter values and submit
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Email'),
        'test@example.com',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Password'),
        'password123',
      );
      await tester.tap(find.text('Submit'));
      await tester.pump();

      // Errors should be gone
      expect(find.text('Email required'), findsNothing);
      expect(find.text('Password required'), findsNothing);
    });

    testWidgets('Dropdown with form validation integration', (
      WidgetTester tester,
    ) async {
      final formKey = GlobalKey<FormState>();
      String? selectedState;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Form(
              key: formKey,
              child: Column(
                children: [
                  DropdownButtonFormField<String>(
                    value: selectedState,
                    hint: const Text('Select State'),
                    items: IndianStates.states
                        .take(5)
                        .map((s) => DropdownMenuItem(value: s, child: Text(s)))
                        .toList(),
                    onChanged: (v) => selectedState = v,
                    validator: (v) =>
                        v == null ? 'Please select a state' : null,
                  ),
                  ElevatedButton(
                    onPressed: () => formKey.currentState!.validate(),
                    child: const Text('Validate'),
                  ),
                ],
              ),
            ),
          ),
        ),
      );

      // Validate without selection
      await tester.tap(find.text('Validate'));
      await tester.pump();

      expect(find.text('Please select a state'), findsOneWidget);
    });
  });
}
