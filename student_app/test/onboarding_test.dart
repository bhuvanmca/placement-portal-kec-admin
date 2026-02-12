// Address Screen and Onboarding Widget Tests
//
// These tests focus on the address screen and onboarding flow
// including state dropdown, form validation, and navigation.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:student_app/utils/indian_states.dart';

void main() {
  // ============================================================
  // Group: Address Form Tests
  // ============================================================
  group('Address Form', () {
    testWidgets('should validate required address line 1', (
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
                    return 'Please enter address line 1';
                  }
                  return null;
                },
              ),
            ),
          ),
        ),
      );

      formKey.currentState!.validate();
      await tester.pump();

      expect(find.text('Please enter address line 1'), findsOneWidget);
    });

    testWidgets('address line 2 should be optional', (
      WidgetTester tester,
    ) async {
      final formKey = GlobalKey<FormState>();

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Form(
              key: formKey,
              child: TextFormField(
                // No validator - optional field
                decoration: const InputDecoration(
                  labelText: 'Address Line 2 (Optional)',
                ),
              ),
            ),
          ),
        ),
      );

      final isValid = formKey.currentState!.validate();
      expect(isValid, isTrue);
    });
  });

  // ============================================================
  // Group: State Dropdown Tests
  // ============================================================
  group('State Dropdown', () {
    testWidgets('should render dropdown with hint text', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DropdownButtonFormField<String>(
              value: null,
              decoration: const InputDecoration(labelText: 'State'),
              items: IndianStates.states
                  .map(
                    (state) =>
                        DropdownMenuItem(value: state, child: Text(state)),
                  )
                  .toList(),
              onChanged: (value) {},
            ),
          ),
        ),
      );

      expect(find.byType(DropdownButtonFormField<String>), findsOneWidget);
      expect(find.text('State'), findsOneWidget);
    });

    testWidgets('should validate when no state is selected', (
      WidgetTester tester,
    ) async {
      final formKey = GlobalKey<FormState>();
      String? selectedState;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Form(
              key: formKey,
              child: DropdownButtonFormField<String>(
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
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please select a state';
                  }
                  return null;
                },
              ),
            ),
          ),
        ),
      );

      formKey.currentState!.validate();
      await tester.pump();

      expect(find.text('Please select a state'), findsOneWidget);
    });

    testWidgets('should accept valid state selection', (
      WidgetTester tester,
    ) async {
      final formKey = GlobalKey<FormState>();

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Form(
              key: formKey,
              child: DropdownButtonFormField<String>(
                value: 'Tamil Nadu', // Pre-selected value
                items: IndianStates.states
                    .map(
                      (state) =>
                          DropdownMenuItem(value: state, child: Text(state)),
                    )
                    .toList(),
                onChanged: (value) {},
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please select a state';
                  }
                  return null;
                },
              ),
            ),
          ),
        ),
      );

      final isValid = formKey.currentState!.validate();
      await tester.pump();

      expect(isValid, isTrue);
      expect(find.text('Tamil Nadu'), findsOneWidget);
    });

    testWidgets('should have all Indian states as dropdown items', (
      WidgetTester tester,
    ) async {
      // Simply verify the dropdown is created with correct number of items
      final items = IndianStates.states
          .map((state) => DropdownMenuItem(value: state, child: Text(state)))
          .toList();

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DropdownButtonFormField<String>(
              value: null,
              hint: const Text('Select State'),
              items: items,
              onChanged: (value) {},
            ),
          ),
        ),
      );

      // Verify dropdown renders
      expect(find.byType(DropdownButtonFormField<String>), findsOneWidget);

      // Verify items count matches states count
      expect(items.length, equals(IndianStates.states.length));
      expect(items.length, equals(36));
    });
  });

  // ============================================================
  // Group: Onboarding Progress Tests
  // ============================================================
  group('Onboarding Progress', () {
    testWidgets('should display progress indicator', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Column(
              children: [
                LinearProgressIndicator(
                  value: 0.75, // 75% complete
                  backgroundColor: Colors.grey[200],
                  color: Colors.blue,
                ),
              ],
            ),
          ),
        ),
      );

      expect(find.byType(LinearProgressIndicator), findsOneWidget);
    });

    testWidgets('continue button should be present', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ElevatedButton(
              onPressed: () {},
              child: const Text('Continue'),
            ),
          ),
        ),
      );

      expect(find.text('Continue'), findsOneWidget);
      expect(find.byType(ElevatedButton), findsOneWidget);
    });

    testWidgets('back button should be present', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            appBar: AppBar(
              leading: IconButton(
                icon: const Icon(Icons.arrow_back_rounded),
                onPressed: () {},
              ),
            ),
          ),
        ),
      );

      expect(find.byIcon(Icons.arrow_back_rounded), findsOneWidget);
    });
  });

  // ============================================================
  // Group: Identity Documents Tests
  // ============================================================
  group('Identity Documents', () {
    testWidgets('Aadhar field should accept 12 digits', (
      WidgetTester tester,
    ) async {
      final formKey = GlobalKey<FormState>();
      final controller = TextEditingController(text: '123456789012');

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Form(
              key: formKey,
              child: TextFormField(
                controller: controller,
                keyboardType: TextInputType.number,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Required';
                  }
                  if (value.length != 12 ||
                      !RegExp(r'^\d{12}$').hasMatch(value)) {
                    return 'Invalid Aadhar Number (12 digits)';
                  }
                  return null;
                },
              ),
            ),
          ),
        ),
      );

      final isValid = formKey.currentState!.validate();
      expect(isValid, isTrue);
    });

    testWidgets('Aadhar field should reject invalid input', (
      WidgetTester tester,
    ) async {
      final formKey = GlobalKey<FormState>();
      final controller = TextEditingController(text: '12345'); // Too short

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Form(
              key: formKey,
              child: TextFormField(
                controller: controller,
                keyboardType: TextInputType.number,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Required';
                  }
                  if (value.length != 12 ||
                      !RegExp(r'^\d{12}$').hasMatch(value)) {
                    return 'Invalid Aadhar Number (12 digits)';
                  }
                  return null;
                },
              ),
            ),
          ),
        ),
      );

      formKey.currentState!.validate();
      await tester.pump();

      expect(find.text('Invalid Aadhar Number (12 digits)'), findsOneWidget);
    });

    testWidgets('PAN field should accept valid format', (
      WidgetTester tester,
    ) async {
      final formKey = GlobalKey<FormState>();
      final controller = TextEditingController(text: 'ABCDE1234F');

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Form(
              key: formKey,
              child: TextFormField(
                controller: controller,
                textCapitalization: TextCapitalization.characters,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Required';
                  }
                  final panRegex = RegExp(r'^[A-Z]{5}[0-9]{4}[A-Z]{1}$');
                  if (!panRegex.hasMatch(value.toUpperCase())) {
                    return 'Invalid PAN format (e.g., ABCDE1234F)';
                  }
                  return null;
                },
              ),
            ),
          ),
        ),
      );

      final isValid = formKey.currentState!.validate();
      expect(isValid, isTrue);
    });

    testWidgets('PAN field should reject invalid format', (
      WidgetTester tester,
    ) async {
      final formKey = GlobalKey<FormState>();
      final controller = TextEditingController(
        text: '12345ABCDE',
      ); // Wrong format

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Form(
              key: formKey,
              child: TextFormField(
                controller: controller,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Required';
                  }
                  final panRegex = RegExp(r'^[A-Z]{5}[0-9]{4}[A-Z]{1}$');
                  if (!panRegex.hasMatch(value.toUpperCase())) {
                    return 'Invalid PAN format (e.g., ABCDE1234F)';
                  }
                  return null;
                },
              ),
            ),
          ),
        ),
      );

      formKey.currentState!.validate();
      await tester.pump();

      expect(
        find.text('Invalid PAN format (e.g., ABCDE1234F)'),
        findsOneWidget,
      );
    });
  });

  // ============================================================
  // Group: Document Upload UI Tests
  // ============================================================
  group('Document Upload UI', () {
    testWidgets('upload card should show upload button', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Container(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  const Icon(Icons.cloud_upload_outlined),
                  const SizedBox(width: 16),
                  const Expanded(child: Text('Resume (PDF)')),
                  TextButton(onPressed: () {}, child: const Text('Upload')),
                ],
              ),
            ),
          ),
        ),
      );

      expect(find.text('Resume (PDF)'), findsOneWidget);
      expect(find.text('Upload'), findsOneWidget);
      expect(find.byIcon(Icons.cloud_upload_outlined), findsOneWidget);
    });

    testWidgets('uploaded document should show check icon', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Container(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Icon(Icons.check_circle, color: Colors.green[600]),
                  const SizedBox(width: 16),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [Text('Resume (PDF)'), Text('Uploaded')],
                    ),
                  ),
                  TextButton(onPressed: () {}, child: const Text('Change')),
                ],
              ),
            ),
          ),
        ),
      );

      expect(find.text('Uploaded'), findsOneWidget);
      expect(find.text('Change'), findsOneWidget);
      expect(find.byIcon(Icons.check_circle), findsOneWidget);
    });
  });
}
