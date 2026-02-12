// Component Integration Tests for Student App
//
// These tests verify that different components work together correctly
// without needing to run the full app on a device.
//
// Run with: flutter test test/integration_test.dart

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:student_app/utils/indian_states.dart';
import 'package:student_app/utils/formatters.dart';
import 'package:student_app/utils/constants.dart';
import 'package:student_app/widgets/app_button.dart';

void main() {
  // ================================================================
  // Integration Test Group 1: Form + Validation Integration
  // ================================================================
  group('Integration: Form + Validation', () {
    testWidgets('Complete login form integration', (WidgetTester tester) async {
      final formKey = GlobalKey<FormState>();
      final emailController = TextEditingController();
      final passwordController = TextEditingController();
      bool isLoading = false;
      bool wasSubmitted = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: StatefulBuilder(
              builder: (context, setState) {
                return Padding(
                  padding: const EdgeInsets.all(16),
                  child: Form(
                    key: formKey,
                    child: Column(
                      children: [
                        TextFormField(
                          controller: emailController,
                          decoration: const InputDecoration(
                            labelText: 'Email',
                            prefixIcon: Icon(Icons.email),
                          ),
                          keyboardType: TextInputType.emailAddress,
                          validator: (value) {
                            if (value == null || value.isEmpty) {
                              return 'Please enter your email';
                            }
                            final emailRegex = RegExp(
                              r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$',
                            );
                            if (!emailRegex.hasMatch(value)) {
                              return 'Please enter a valid email';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: passwordController,
                          decoration: const InputDecoration(
                            labelText: 'Password',
                            prefixIcon: Icon(Icons.lock),
                          ),
                          obscureText: true,
                          validator: (value) {
                            if (value == null || value.isEmpty) {
                              return 'Please enter your password';
                            }
                            if (value.length < 6) {
                              return 'Password must be at least 6 characters';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 24),
                        AppButton(
                          label: 'Login',
                          isLoading: isLoading,
                          onPressed: () {
                            if (formKey.currentState!.validate()) {
                              setState(() => isLoading = true);
                              wasSubmitted = true;
                            }
                          },
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ),
      );

      // Test 1: Verify all elements present
      expect(find.text('Email'), findsOneWidget);
      expect(find.text('Password'), findsOneWidget);
      expect(find.text('Login'), findsOneWidget);
      expect(find.byIcon(Icons.email), findsOneWidget);
      expect(find.byIcon(Icons.lock), findsOneWidget);

      // Test 2: Submit with empty fields
      await tester.tap(find.text('Login'));
      await tester.pump();

      expect(find.text('Please enter your email'), findsOneWidget);
      expect(find.text('Please enter your password'), findsOneWidget);
      expect(wasSubmitted, isFalse);

      // Test 3: Submit with invalid email
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Email'),
        'invalid-email',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Password'),
        'pass123',
      );
      await tester.tap(find.text('Login'));
      await tester.pump();

      expect(find.text('Please enter a valid email'), findsOneWidget);

      // Test 4: Submit with valid credentials
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Email'),
        'student@kongu.edu',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Password'),
        'password123',
      );
      await tester.tap(find.text('Login'));
      await tester.pump();

      expect(wasSubmitted, isTrue);
    });

    testWidgets('Complete registration form integration', (
      WidgetTester tester,
    ) async {
      final formKey = GlobalKey<FormState>();
      String? selectedState;
      final panController = TextEditingController();
      final aadharController = TextEditingController();

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Form(
                key: formKey,
                child: Column(
                  children: [
                    // State Dropdown
                    DropdownButtonFormField<String>(
                      value: selectedState,
                      decoration: const InputDecoration(labelText: 'State'),
                      items: IndianStates.states
                          .map(
                            (s) => DropdownMenuItem(value: s, child: Text(s)),
                          )
                          .toList(),
                      onChanged: (v) => selectedState = v,
                      validator: (v) =>
                          v == null ? 'Please select a state' : null,
                    ),
                    const SizedBox(height: 16),
                    // PAN Field
                    TextFormField(
                      controller: panController,
                      decoration: const InputDecoration(
                        labelText: 'PAN Number',
                      ),
                      textCapitalization: TextCapitalization.characters,
                      validator: (value) {
                        if (value == null || value.isEmpty) return 'Required';
                        final panRegex = RegExp(r'^[A-Z]{5}[0-9]{4}[A-Z]{1}$');
                        if (!panRegex.hasMatch(value.toUpperCase())) {
                          return 'Invalid PAN format (e.g., ABCDE1234F)';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    // Aadhar Field
                    TextFormField(
                      controller: aadharController,
                      decoration: const InputDecoration(
                        labelText: 'Aadhar Number',
                      ),
                      keyboardType: TextInputType.number,
                      validator: (value) {
                        if (value == null || value.isEmpty) return 'Required';
                        if (!RegExp(r'^\d{12}$').hasMatch(value)) {
                          return 'Invalid Aadhar (12 digits)';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: () => formKey.currentState!.validate(),
                      child: const Text('Submit'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );

      // Submit with empty fields
      await tester.tap(find.text('Submit'));
      await tester.pump();

      expect(find.text('Please select a state'), findsOneWidget);
      expect(find.text('Required'), findsWidgets);

      // Fill with invalid data
      await tester.enterText(
        find.widgetWithText(TextFormField, 'PAN Number'),
        'INVALID',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Aadhar Number'),
        '12345',
      );
      await tester.tap(find.text('Submit'));
      await tester.pump();

      expect(
        find.text('Invalid PAN format (e.g., ABCDE1234F)'),
        findsOneWidget,
      );
      expect(find.text('Invalid Aadhar (12 digits)'), findsOneWidget);

      // Fill with valid data
      await tester.enterText(
        find.widgetWithText(TextFormField, 'PAN Number'),
        'ABCDE1234F',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Aadhar Number'),
        '123456789012',
      );
      await tester.tap(find.text('Submit'));
      await tester.pump();

      // Only state dropdown error should remain
      expect(find.text('Invalid PAN format (e.g., ABCDE1234F)'), findsNothing);
      expect(find.text('Invalid Aadhar (12 digits)'), findsNothing);
    });
  });

  // ================================================================
  // Integration Test Group 2: UI Components Integration
  // ================================================================
  group('Integration: UI Components', () {
    testWidgets('AppButton + Loading state integration', (
      WidgetTester tester,
    ) async {
      bool isLoading = false;
      int tapCount = 0;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: StatefulBuilder(
              builder: (context, setState) {
                return Center(
                  child: AppButton(
                    label: 'Submit',
                    isLoading: isLoading,
                    onPressed: () {
                      tapCount++;
                      setState(() => isLoading = true);
                    },
                  ),
                );
              },
            ),
          ),
        ),
      );

      // Initial state
      expect(find.text('Submit'), findsOneWidget);
      expect(find.byType(CircularProgressIndicator), findsNothing);

      // Tap button
      await tester.tap(find.text('Submit'));
      await tester.pump();

      // Should show loading
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.text('Submit'), findsNothing);
      expect(tapCount, 1);

      // Try tapping again (should be disabled)
      await tester.tap(find.byType(ElevatedButton));
      await tester.pump();

      expect(tapCount, 1); // Still 1, button was disabled
    });

    testWidgets('Navigation drawer integration', (WidgetTester tester) async {
      int selectedIndex = 0;
      final destinations = ['Home', 'Drives', 'Profile'];

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: StatefulBuilder(
              builder: (context, setState) {
                return NavigationRail(
                  selectedIndex: selectedIndex,
                  labelType: NavigationRailLabelType.all, // Show labels
                  onDestinationSelected: (index) {
                    setState(() => selectedIndex = index);
                  },
                  destinations: [
                    NavigationRailDestination(
                      icon: const Icon(Icons.home),
                      label: Text(destinations[0]),
                    ),
                    NavigationRailDestination(
                      icon: const Icon(Icons.work),
                      label: Text(destinations[1]),
                    ),
                    NavigationRailDestination(
                      icon: const Icon(Icons.person),
                      label: Text(destinations[2]),
                    ),
                  ],
                );
              },
            ),
          ),
        ),
      );

      expect(selectedIndex, 0);

      // Navigate to second destination (tap icon)
      await tester.tap(find.byIcon(Icons.work));
      await tester.pump();

      expect(selectedIndex, 1);

      // Navigate to third destination
      await tester.tap(find.byIcon(Icons.person));
      await tester.pump();

      expect(selectedIndex, 2);
    });

    testWidgets('Snackbar integration with form', (WidgetTester tester) async {
      final formKey = GlobalKey<FormState>();

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) {
                return Form(
                  key: formKey,
                  child: Column(
                    children: [
                      TextFormField(
                        validator: (v) =>
                            v == null || v.isEmpty ? 'Required' : null,
                      ),
                      ElevatedButton(
                        onPressed: () {
                          // Clear any existing snackbars
                          ScaffoldMessenger.of(context).clearSnackBars();

                          if (formKey.currentState!.validate()) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Form submitted!')),
                            );
                          } else {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Please fix errors'),
                                backgroundColor: Colors.red,
                              ),
                            );
                          }
                        },
                        child: const Text('Submit'),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ),
      );

      // Submit with errors
      await tester.tap(find.text('Submit'));
      await tester.pumpAndSettle();

      expect(find.text('Please fix errors'), findsOneWidget);

      // Fill and submit
      await tester.enterText(find.byType(TextFormField), 'test');
      await tester.tap(find.text('Submit'));
      await tester.pumpAndSettle();

      expect(find.text('Form submitted!'), findsOneWidget);
    });
  });

  // ================================================================
  // Integration Test Group 3: Data Flow Integration
  // ================================================================
  group('Integration: Data Flow', () {
    testWidgets('Formatters + Display integration', (
      WidgetTester tester,
    ) async {
      final testDates = [
        '2024-01-15',
        '2024-02-22',
        '2024-03-03',
        '2024-12-25',
      ];

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ListView.builder(
              itemCount: testDates.length,
              itemBuilder: (context, index) {
                return ListTile(
                  title: Text(Formatters.formatDate(testDates[index])),
                  subtitle: Text(testDates[index]),
                );
              },
            ),
          ),
        ),
      );

      expect(find.text('15th Jan 2024'), findsOneWidget);
      expect(find.text('22nd Feb 2024'), findsOneWidget);
      expect(find.text('3rd Mar 2024'), findsOneWidget);
      expect(find.text('25th Dec 2024'), findsOneWidget);
    });

    testWidgets('Constants + Styling integration', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: ThemeData(
            primaryColor: AppConstants.primaryColor,
            scaffoldBackgroundColor: AppConstants.backgroundColor,
          ),
          home: Scaffold(
            body: Container(
              decoration: BoxDecoration(
                color: AppConstants.surfaceColor,
                borderRadius: BorderRadius.circular(AppConstants.borderRadius),
              ),
              padding: EdgeInsets.all(AppConstants.spacing),
              child: Text(
                'Styled Container',
                style: TextStyle(color: AppConstants.textPrimary),
              ),
            ),
          ),
        ),
      );

      expect(find.text('Styled Container'), findsOneWidget);
    });

    testWidgets('IndianStates + Dropdown + Form integration', (
      WidgetTester tester,
    ) async {
      final formKey = GlobalKey<FormState>();
      String? selectedState;
      bool formValid = false;

      // Use only first 5 states for testing
      final testStates = IndianStates.states.take(5).toList();

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: StatefulBuilder(
              builder: (context, setState) {
                return Form(
                  key: formKey,
                  child: Column(
                    children: [
                      DropdownButtonFormField<String>(
                        value: selectedState,
                        hint: const Text('Select State'),
                        isExpanded: true,
                        items: testStates
                            .map(
                              (s) => DropdownMenuItem(value: s, child: Text(s)),
                            )
                            .toList(),
                        onChanged: (v) {
                          setState(() => selectedState = v);
                        },
                        validator: (v) =>
                            v == null ? 'State is required' : null,
                      ),
                      const SizedBox(height: 16),
                      Text('Selected: ${selectedState ?? "None"}'),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: () {
                          setState(() {
                            formValid = formKey.currentState!.validate();
                          });
                        },
                        child: const Text('Validate'),
                      ),
                      if (formValid)
                        const Text(
                          'Form is valid!',
                          style: TextStyle(color: Colors.green),
                        ),
                    ],
                  ),
                );
              },
            ),
          ),
        ),
      );

      // Initial state
      expect(find.text('Select State'), findsOneWidget);
      expect(find.text('Selected: None'), findsOneWidget);

      // Validate without selection
      await tester.tap(find.text('Validate'));
      await tester.pump();

      expect(find.text('State is required'), findsOneWidget);
      expect(find.text('Form is valid!'), findsNothing);

      // Open dropdown and select first item
      await tester.tap(find.byType(DropdownButtonFormField<String>));
      await tester.pumpAndSettle();

      // Select the first state in the test list
      await tester.tap(find.text(testStates.first).last);
      await tester.pumpAndSettle();

      expect(find.text('Selected: ${testStates.first}'), findsOneWidget);

      // Validate again
      await tester.tap(find.text('Validate'));
      await tester.pump();

      expect(find.text('Form is valid!'), findsOneWidget);
    });
  });

  // ================================================================
  // Integration Test Group 4: State Management Integration
  // ================================================================
  group('Integration: State Management', () {
    testWidgets('ProviderScope + Consumer integration', (
      WidgetTester tester,
    ) async {
      // Use StatefulWidget instead of StateProvider for compatibility
      int counter = 0;

      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: StatefulBuilder(
                builder: (context, setState) {
                  return Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text('Count: $counter'),
                      ElevatedButton(
                        onPressed: () {
                          setState(() => counter++);
                        },
                        child: const Text('Increment'),
                      ),
                    ],
                  );
                },
              ),
            ),
          ),
        ),
      );

      expect(find.text('Count: 0'), findsOneWidget);

      await tester.tap(find.text('Increment'));
      await tester.pump();

      expect(find.text('Count: 1'), findsOneWidget);

      await tester.tap(find.text('Increment'));
      await tester.tap(find.text('Increment'));
      await tester.pump();

      expect(find.text('Count: 3'), findsOneWidget);
    });

    testWidgets('Multiple state values integration', (
      WidgetTester tester,
    ) async {
      String name = '';
      String email = '';

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: StatefulBuilder(
              builder: (context, setState) {
                return Column(
                  children: [
                    TextField(
                      decoration: const InputDecoration(labelText: 'Name'),
                      onChanged: (v) {
                        setState(() => name = v);
                      },
                    ),
                    TextField(
                      decoration: const InputDecoration(labelText: 'Email'),
                      onChanged: (v) {
                        setState(() => email = v);
                      },
                    ),
                    const SizedBox(height: 16),
                    Text('Name: $name'),
                    Text('Email: $email'),
                  ],
                );
              },
            ),
          ),
        ),
      );

      // Enter name
      await tester.enterText(
        find.widgetWithText(TextField, 'Name'),
        'John Doe',
      );
      await tester.pump();

      expect(find.text('Name: John Doe'), findsOneWidget);

      // Enter email
      await tester.enterText(
        find.widgetWithText(TextField, 'Email'),
        'john@example.com',
      );
      await tester.pump();

      expect(find.text('Email: john@example.com'), findsOneWidget);
    });
  });

  // ================================================================
  // Integration Test Group 5: Error Handling Integration
  // ================================================================
  group('Integration: Error Handling', () {
    testWidgets('Form error display integration', (WidgetTester tester) async {
      final formKey = GlobalKey<FormState>();
      final errors = <String>[];

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Form(
              key: formKey,
              child: Column(
                children: [
                  TextFormField(
                    decoration: const InputDecoration(labelText: 'Field 1'),
                    validator: (v) {
                      if (v == null || v.isEmpty) {
                        errors.add('Field 1 required');
                        return 'Field 1 required';
                      }
                      return null;
                    },
                  ),
                  TextFormField(
                    decoration: const InputDecoration(labelText: 'Field 2'),
                    validator: (v) {
                      if (v == null || v.isEmpty) {
                        errors.add('Field 2 required');
                        return 'Field 2 required';
                      }
                      return null;
                    },
                  ),
                  ElevatedButton(
                    onPressed: () {
                      errors.clear();
                      formKey.currentState!.validate();
                    },
                    child: const Text('Submit'),
                  ),
                ],
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Submit'));
      await tester.pump();

      expect(find.text('Field 1 required'), findsOneWidget);
      expect(find.text('Field 2 required'), findsOneWidget);
      expect(errors.length, 2);
    });

    testWidgets('URL sanitization integration', (WidgetTester tester) async {
      final urls = [
        'http://localhost:9000/image.png',
        'http://minio:9000/file.pdf',
        'https://example.com/file.txt',
      ];

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ListView.builder(
              itemCount: urls.length,
              itemBuilder: (context, index) {
                return ListTile(
                  title: Text(AppConstants.sanitizeUrl(urls[index])),
                  subtitle: Text('Original: ${urls[index]}'),
                );
              },
            ),
          ),
        ),
      );

      expect(find.text('http://172.25.32.1:9000/image.png'), findsOneWidget);
      expect(find.text('http://172.25.32.1:9000/file.pdf'), findsOneWidget);
      expect(find.text('https://example.com/file.txt'), findsOneWidget);
    });
  });
}
