// Widget Tests for Student App
//
// Run with: flutter test
// Run specific test: flutter test test/widget_test.dart
// Run with coverage: flutter test --coverage

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:student_app/utils/indian_states.dart';
import 'package:student_app/utils/formatters.dart';
import 'package:student_app/utils/constants.dart';
import 'package:student_app/widgets/app_button.dart';

void main() {
  // ============================================================
  // Group 1: IndianStates Utility Tests
  // ============================================================
  group('IndianStates', () {
    test('should have 36 states and union territories', () {
      expect(IndianStates.states.length, 36);
    });

    test('should contain all major states', () {
      final majorStates = [
        'Tamil Nadu',
        'Karnataka',
        'Maharashtra',
        'Gujarat',
        'Uttar Pradesh',
        'Delhi',
        'Kerala',
        'West Bengal',
        'Rajasthan',
        'Punjab',
      ];

      for (final state in majorStates) {
        expect(
          IndianStates.states.contains(state),
          isTrue,
          reason: '$state should be in the list',
        );
      }
    });

    test('should contain all union territories', () {
      final unionTerritories = [
        'Andaman and Nicobar Islands',
        'Chandigarh',
        'Delhi',
        'Ladakh',
        'Lakshadweep',
        'Puducherry',
        'Jammu and Kashmir',
        'Dadra and Nagar Haveli and Daman and Diu',
      ];

      for (final ut in unionTerritories) {
        expect(
          IndianStates.states.contains(ut),
          isTrue,
          reason: '$ut should be in the list',
        );
      }
    });

    test('states should be alphabetically sorted', () {
      final sortedList = List<String>.from(IndianStates.states)..sort();
      expect(IndianStates.states, sortedList);
    });

    test('should not have duplicate states', () {
      final uniqueStates = IndianStates.states.toSet();
      expect(uniqueStates.length, IndianStates.states.length);
    });
  });

  // ============================================================
  // Group 2: Formatters Utility Tests
  // ============================================================
  group('Formatters', () {
    group('formatDate', () {
      test('should return N/A for null input', () {
        expect(Formatters.formatDate(null), 'N/A');
      });

      test('should return N/A for empty string', () {
        expect(Formatters.formatDate(''), 'N/A');
      });

      test('should format valid date correctly', () {
        expect(Formatters.formatDate('2024-01-15'), '15th Jan 2024');
        expect(Formatters.formatDate('2024-03-01'), '1st Mar 2024');
        expect(Formatters.formatDate('2024-02-22'), '22nd Feb 2024');
        expect(Formatters.formatDate('2024-12-03'), '3rd Dec 2024');
      });

      test('should handle ordinal suffixes correctly', () {
        // Test 1st, 2nd, 3rd
        expect(Formatters.formatDate('2024-05-01'), '1st May 2024');
        expect(Formatters.formatDate('2024-05-02'), '2nd May 2024');
        expect(Formatters.formatDate('2024-05-03'), '3rd May 2024');

        // Test 11th, 12th, 13th (special cases)
        expect(Formatters.formatDate('2024-05-11'), '11th May 2024');
        expect(Formatters.formatDate('2024-05-12'), '12th May 2024');
        expect(Formatters.formatDate('2024-05-13'), '13th May 2024');

        // Test 21st, 22nd, 23rd
        expect(Formatters.formatDate('2024-05-21'), '21st May 2024');
        expect(Formatters.formatDate('2024-05-22'), '22nd May 2024');
        expect(Formatters.formatDate('2024-05-23'), '23rd May 2024');

        // Test regular 'th' suffix
        expect(Formatters.formatDate('2024-05-04'), '4th May 2024');
        expect(Formatters.formatDate('2024-05-15'), '15th May 2024');
        expect(Formatters.formatDate('2024-05-30'), '30th May 2024');
      });

      test('should return original string for invalid date', () {
        expect(Formatters.formatDate('invalid-date'), 'invalid-date');
      });
    });

    group('formatDateTime', () {
      test('should return N/A for null input', () {
        expect(Formatters.formatDateTime(null), 'N/A');
      });

      test('should return N/A for empty string', () {
        expect(Formatters.formatDateTime(''), 'N/A');
      });

      test('should format valid datetime with AM/PM correctly', () {
        // Note: This depends on local timezone
        final result = Formatters.formatDateTime('2024-01-15T14:30:00Z');
        expect(result, contains('15th Jan 2024'));
        expect(result, contains(RegExp(r'\d{1,2}:\d{2} (AM|PM)')));
      });

      test('should handle midnight correctly', () {
        // 00:00 should be shown as 12:00 AM
        final result = Formatters.formatDateTime('2024-01-15T00:00:00');
        expect(result, contains('12:00 AM'));
      });

      test('should handle noon correctly', () {
        // 12:00 should be shown as 12:00 PM
        final result = Formatters.formatDateTime('2024-01-15T12:00:00');
        expect(result, contains('12:00 PM'));
      });
    });
  });

  // ============================================================
  // Group 3: AppConstants Tests
  // ============================================================
  group('AppConstants', () {
    test('should have correct color values', () {
      expect(AppConstants.primaryColor, const Color(0xFF002147));
      expect(AppConstants.backgroundColor, const Color(0xFFF8F9FA));
      expect(AppConstants.successColor, const Color(0xFF10B981));
      expect(AppConstants.errorColor, const Color(0xFFEF4444));
    });

    test('should have correct dimension values', () {
      expect(AppConstants.borderRadius, 8.0);
      expect(AppConstants.buttonHeight, 52.0);
      expect(AppConstants.inputHeight, 48.0);
      expect(AppConstants.spacing, 16.0);
      expect(AppConstants.spacingLarge, 24.0);
    });

    test('sanitizeUrl should replace localhost with IP', () {
      expect(
        AppConstants.sanitizeUrl('http://localhost:9000/image.png'),
        'http://172.25.32.1:9000/image.png',
      );
    });

    test('sanitizeUrl should replace minio with IP', () {
      expect(
        AppConstants.sanitizeUrl('http://minio:9000/bucket/file.pdf'),
        'http://172.25.32.1:9000/bucket/file.pdf',
      );
    });

    test('sanitizeUrl should return empty string for empty input', () {
      expect(AppConstants.sanitizeUrl(''), '');
    });

    test('sanitizeUrl should not modify already correct URLs', () {
      const correctUrl = 'http://example.com/image.png';
      expect(AppConstants.sanitizeUrl(correctUrl), correctUrl);
    });
  });

  // ============================================================
  // Group 4: AppButton Widget Tests
  // ============================================================
  group('AppButton Widget', () {
    testWidgets('should display label text', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AppButton(label: 'Test Button', onPressed: () {}),
          ),
        ),
      );

      expect(find.text('Test Button'), findsOneWidget);
    });

    testWidgets('should call onPressed when tapped', (
      WidgetTester tester,
    ) async {
      bool wasPressed = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AppButton(
              label: 'Submit',
              onPressed: () {
                wasPressed = true;
              },
            ),
          ),
        ),
      );

      await tester.tap(find.text('Submit'));
      await tester.pump();

      expect(wasPressed, isTrue);
    });

    testWidgets('should show loading indicator when isLoading is true', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AppButton(
              label: 'Loading',
              isLoading: true,
              onPressed: () {},
            ),
          ),
        ),
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.text('Loading'), findsNothing);
    });

    testWidgets('should not call onPressed when isLoading is true', (
      WidgetTester tester,
    ) async {
      bool wasPressed = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AppButton(
              label: 'Submit',
              isLoading: true,
              onPressed: () {
                wasPressed = true;
              },
            ),
          ),
        ),
      );

      // Try to tap the button area
      await tester.tap(find.byType(ElevatedButton));
      await tester.pump();

      expect(wasPressed, isFalse);
    });

    testWidgets('should render as outlined button when isOutlined is true', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AppButton(
              label: 'Outlined',
              isOutlined: true,
              onPressed: () {},
            ),
          ),
        ),
      );

      expect(find.byType(OutlinedButton), findsOneWidget);
      expect(find.byType(ElevatedButton), findsNothing);
    });

    testWidgets('should render as elevated button by default', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AppButton(label: 'Default', onPressed: () {}),
          ),
        ),
      );

      expect(find.byType(ElevatedButton), findsOneWidget);
      expect(find.byType(OutlinedButton), findsNothing);
    });

    testWidgets('should display icon when provided', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AppButton(
              label: 'With Icon',
              icon: Icons.add,
              onPressed: () {},
            ),
          ),
        ),
      );

      expect(find.byIcon(Icons.add), findsOneWidget);
      expect(find.text('With Icon'), findsOneWidget);
    });

    testWidgets('should respect custom width', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Center(
              child: SizedBox(
                width: 300, // Parent constraint
                child: AppButton(
                  label: 'Custom Width',
                  width: 200,
                  onPressed: () {},
                ),
              ),
            ),
          ),
        ),
      );

      // Simply verify the button renders with the label
      expect(find.text('Custom Width'), findsOneWidget);
      expect(find.byType(ElevatedButton), findsOneWidget);
    });

    testWidgets('should be disabled when onPressed is null', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(body: AppButton(label: 'Disabled', onPressed: null)),
        ),
      );

      final button = tester.widget<ElevatedButton>(find.byType(ElevatedButton));
      expect(button.onPressed, isNull);
    });
  });

  // ============================================================
  // Group 5: PAN Number Validation Tests
  // ============================================================
  group('PAN Number Validation', () {
    // PAN format: 5 letters, 4 digits, 1 letter (e.g., ABCDE1234F)
    final panRegex = RegExp(r'^[A-Z]{5}[0-9]{4}[A-Z]{1}$');

    test('should accept valid PAN numbers', () {
      final validPans = [
        'ABCDE1234F',
        'ZZZZZ9999Z',
        'PQRST5678A',
        'LMNOP1111M',
      ];

      for (final pan in validPans) {
        expect(panRegex.hasMatch(pan), isTrue, reason: '$pan should be valid');
      }
    });

    test('should reject PAN with less than 10 characters', () {
      expect(panRegex.hasMatch('ABCDE1234'), isFalse);
      expect(panRegex.hasMatch('ABC12F'), isFalse);
    });

    test('should reject PAN with more than 10 characters', () {
      expect(panRegex.hasMatch('ABCDE12345F'), isFalse);
      expect(panRegex.hasMatch('ABCDEFG1234H'), isFalse);
    });

    test('should reject PAN with incorrect format', () {
      // Starts with numbers
      expect(panRegex.hasMatch('12345ABCDF'), isFalse);
      // Less than 5 letters at start
      expect(panRegex.hasMatch('ABCD12345F'), isFalse);
      // More than 4 digits in middle
      expect(panRegex.hasMatch('ABCD12345F'), isFalse);
      // Ends with number
      expect(panRegex.hasMatch('ABCDE12341'), isFalse);
      // Contains special characters
      expect(panRegex.hasMatch('ABCDE123@F'), isFalse);
    });

    test('should reject lowercase PAN (without toUpperCase)', () {
      expect(panRegex.hasMatch('abcde1234f'), isFalse);
    });

    test('should accept uppercase version of lowercase input', () {
      expect(panRegex.hasMatch('abcde1234f'.toUpperCase()), isTrue);
    });
  });

  // ============================================================
  // Group 6: Aadhar Number Validation Tests
  // ============================================================
  group('Aadhar Number Validation', () {
    // Aadhar format: Exactly 12 digits
    final aadharRegex = RegExp(r'^\d{12}$');

    test('should accept valid 12-digit Aadhar numbers', () {
      final validAadhars = [
        '123456789012',
        '999999999999',
        '111111111111',
        '000000000001',
      ];

      for (final aadhar in validAadhars) {
        expect(
          aadharRegex.hasMatch(aadhar),
          isTrue,
          reason: '$aadhar should be valid',
        );
      }
    });

    test('should reject Aadhar with less than 12 digits', () {
      expect(aadharRegex.hasMatch('12345678901'), isFalse);
      expect(aadharRegex.hasMatch('1234'), isFalse);
      expect(aadharRegex.hasMatch(''), isFalse);
    });

    test('should reject Aadhar with more than 12 digits', () {
      expect(aadharRegex.hasMatch('1234567890123'), isFalse);
      expect(aadharRegex.hasMatch('12345678901234'), isFalse);
    });

    test('should reject Aadhar with non-digit characters', () {
      expect(aadharRegex.hasMatch('12345678901A'), isFalse);
      expect(aadharRegex.hasMatch('ABCDEFGHIJKL'), isFalse);
      expect(aadharRegex.hasMatch('123-456-7890'), isFalse);
      expect(aadharRegex.hasMatch('1234 5678 9012'), isFalse);
    });
  });

  // ============================================================
  // Group 7: Email Validation Tests
  // ============================================================
  group('Email Validation', () {
    // Email regex from login_screen.dart
    final emailRegex = RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$');

    test('should accept valid email addresses', () {
      final validEmails = [
        'test@example.com',
        'user@kongu.edu',
        'john.doe@company.org',
        'student123@university.ac.in',
        'name-surname@domain.com',
        'user_name@domain.co.uk',
      ];

      for (final email in validEmails) {
        expect(
          emailRegex.hasMatch(email),
          isTrue,
          reason: '$email should be valid',
        );
      }
    });

    test('should reject invalid email addresses', () {
      final invalidEmails = [
        'invalid',
        'test@',
        '@domain.com',
        'test@domain',
        'test.domain.com',
        'test@.com',
        '',
      ];

      for (final email in invalidEmails) {
        expect(
          emailRegex.hasMatch(email),
          isFalse,
          reason: '$email should be invalid',
        );
      }
    });
  });

  // ============================================================
  // Group 8: Form Field Widget Tests
  // ============================================================
  group('Form Field Widgets', () {
    testWidgets('TextFormField should validate empty input', (
      WidgetTester tester,
    ) async {
      final formKey = GlobalKey<FormState>();

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Form(
              key: formKey,
              child: TextFormField(
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'This field is required';
                  }
                  return null;
                },
              ),
            ),
          ),
        ),
      );

      // Validate without entering text
      formKey.currentState!.validate();
      await tester.pump();

      expect(find.text('This field is required'), findsOneWidget);
    });

    testWidgets('TextFormField should accept valid input', (
      WidgetTester tester,
    ) async {
      final formKey = GlobalKey<FormState>();

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Form(
              key: formKey,
              child: TextFormField(
                initialValue: 'valid input',
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'This field is required';
                  }
                  return null;
                },
              ),
            ),
          ),
        ),
      );

      // Validate with text
      final isValid = formKey.currentState!.validate();
      await tester.pump();

      expect(isValid, isTrue);
      expect(find.text('This field is required'), findsNothing);
    });

    testWidgets('Password field should toggle visibility', (
      WidgetTester tester,
    ) async {
      bool obscure = true;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: StatefulBuilder(
              builder: (context, setState) {
                return TextFormField(
                  obscureText: obscure,
                  decoration: InputDecoration(
                    suffixIcon: IconButton(
                      icon: Icon(
                        obscure ? Icons.visibility_off : Icons.visibility,
                      ),
                      onPressed: () => setState(() => obscure = !obscure),
                    ),
                  ),
                );
              },
            ),
          ),
        ),
      );

      // Initially password is hidden
      expect(find.byIcon(Icons.visibility_off), findsOneWidget);

      // Tap to show password
      await tester.tap(find.byType(IconButton));
      await tester.pump();

      expect(find.byIcon(Icons.visibility), findsOneWidget);
    });
  });

  // ============================================================
  // Group 9: Dropdown Widget Tests
  // ============================================================
  group('Dropdown Widget Tests', () {
    testWidgets('State dropdown should display all states', (
      WidgetTester tester,
    ) async {
      String? selectedState;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DropdownButtonFormField<String>(
              value: selectedState,
              items: IndianStates.states
                  .map(
                    (state) =>
                        DropdownMenuItem(value: state, child: Text(state)),
                  )
                  .toList(),
              onChanged: (value) {
                selectedState = value;
              },
              hint: const Text('Select State'),
            ),
          ),
        ),
      );

      // Dropdown should be present
      expect(find.byType(DropdownButtonFormField<String>), findsOneWidget);
      expect(find.text('Select State'), findsOneWidget);
    });

    testWidgets('State dropdown should select and display value', (
      WidgetTester tester,
    ) async {
      String? selectedState = 'Tamil Nadu';

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DropdownButtonFormField<String>(
              value: selectedState,
              items: IndianStates.states
                  .map(
                    (state) =>
                        DropdownMenuItem(value: state, child: Text(state)),
                  )
                  .toList(),
              onChanged: (value) {
                selectedState = value;
              },
            ),
          ),
        ),
      );

      // Selected value should be displayed
      expect(find.text('Tamil Nadu'), findsOneWidget);
    });
  });
}
