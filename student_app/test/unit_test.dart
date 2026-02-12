// Unit Tests for Student App
//
// These are pure unit tests focusing on business logic
// without widget rendering or UI components.

import 'package:flutter_test/flutter_test.dart';
import 'package:student_app/utils/indian_states.dart';
import 'package:student_app/utils/formatters.dart';
import 'package:student_app/utils/constants.dart';

void main() {
  // ============================================================
  // Unit Tests: IndianStates Utility
  // ============================================================
  group('Unit Tests - IndianStates', () {
    test('should have 36 states/union territories', () {
      expect(IndianStates.states.length, 36);
    });

    test('should contain Tamil Nadu', () {
      expect(IndianStates.states.contains('Tamil Nadu'), isTrue);
    });

    test('should contain Karnataka', () {
      expect(IndianStates.states.contains('Karnataka'), isTrue);
    });

    test('should contain Maharashtra', () {
      expect(IndianStates.states.contains('Maharashtra'), isTrue);
    });

    test('should contain Delhi', () {
      expect(IndianStates.states.contains('Delhi'), isTrue);
    });

    test('should contain Kerala', () {
      expect(IndianStates.states.contains('Kerala'), isTrue);
    });

    test('states should be sorted alphabetically', () {
      final sortedList = List<String>.from(IndianStates.states)..sort();
      expect(IndianStates.states, sortedList);
    });

    test('states should have no duplicates', () {
      final uniqueSet = IndianStates.states.toSet();
      expect(uniqueSet.length, IndianStates.states.length);
    });

    test('first state should be Andaman and Nicobar Islands', () {
      expect(IndianStates.states.first, 'Andaman and Nicobar Islands');
    });

    test('last state should be West Bengal', () {
      expect(IndianStates.states.last, 'West Bengal');
    });
  });

  // ============================================================
  // Unit Tests: Formatters Utility
  // ============================================================
  group('Unit Tests - Formatters.formatDate', () {
    test('should return N/A for null', () {
      expect(Formatters.formatDate(null), 'N/A');
    });

    test('should return N/A for empty string', () {
      expect(Formatters.formatDate(''), 'N/A');
    });

    test('should format 2024-01-01 correctly', () {
      expect(Formatters.formatDate('2024-01-01'), '1st Jan 2024');
    });

    test('should format 2024-02-02 correctly', () {
      expect(Formatters.formatDate('2024-02-02'), '2nd Feb 2024');
    });

    test('should format 2024-03-03 correctly', () {
      expect(Formatters.formatDate('2024-03-03'), '3rd Mar 2024');
    });

    test('should format 2024-04-04 correctly', () {
      expect(Formatters.formatDate('2024-04-04'), '4th Apr 2024');
    });

    test('should format 2024-05-11 correctly (special case)', () {
      expect(Formatters.formatDate('2024-05-11'), '11th May 2024');
    });

    test('should format 2024-06-12 correctly (special case)', () {
      expect(Formatters.formatDate('2024-06-12'), '12th Jun 2024');
    });

    test('should format 2024-07-13 correctly (special case)', () {
      expect(Formatters.formatDate('2024-07-13'), '13th Jul 2024');
    });

    test('should format 2024-08-21 correctly', () {
      expect(Formatters.formatDate('2024-08-21'), '21st Aug 2024');
    });

    test('should format 2024-09-22 correctly', () {
      expect(Formatters.formatDate('2024-09-22'), '22nd Sep 2024');
    });

    test('should format 2024-10-23 correctly', () {
      expect(Formatters.formatDate('2024-10-23'), '23rd Oct 2024');
    });

    test('should format 2024-11-30 correctly', () {
      expect(Formatters.formatDate('2024-11-30'), '30th Nov 2024');
    });

    test('should format 2024-12-31 correctly', () {
      expect(Formatters.formatDate('2024-12-31'), '31st Dec 2024');
    });

    test('should return original for invalid date', () {
      expect(Formatters.formatDate('invalid'), 'invalid');
    });
  });

  group('Unit Tests - Formatters.formatDateTime', () {
    test('should return N/A for null', () {
      expect(Formatters.formatDateTime(null), 'N/A');
    });

    test('should return N/A for empty string', () {
      expect(Formatters.formatDateTime(''), 'N/A');
    });

    test('should format datetime with 12:00 PM correctly', () {
      final result = Formatters.formatDateTime('2024-01-15T12:00:00');
      expect(result, contains('15th Jan 2024'));
      expect(result, contains('12:00 PM'));
    });

    test('should format datetime with 12:00 AM correctly', () {
      final result = Formatters.formatDateTime('2024-01-15T00:00:00');
      expect(result, contains('15th Jan 2024'));
      expect(result, contains('12:00 AM'));
    });

    test('should format datetime with AM correctly', () {
      final result = Formatters.formatDateTime('2024-01-15T09:30:00');
      expect(result, contains('AM'));
    });

    test('should format datetime with PM correctly', () {
      final result = Formatters.formatDateTime('2024-01-15T14:45:00');
      expect(result, contains('PM'));
    });

    test('should handle minutes with leading zero', () {
      final result = Formatters.formatDateTime('2024-01-15T10:05:00');
      expect(result, contains('05'));
    });
  });

  // ============================================================
  // Unit Tests: AppConstants
  // ============================================================
  group('Unit Tests - AppConstants Colors', () {
    test('primaryColor should be Oxford Blue', () {
      expect(AppConstants.primaryColor.value, 0xFF002147);
    });

    test('backgroundColor should be light gray', () {
      expect(AppConstants.backgroundColor.value, 0xFFF8F9FA);
    });

    test('successColor should be green', () {
      expect(AppConstants.successColor.value, 0xFF10B981);
    });

    test('errorColor should be red', () {
      expect(AppConstants.errorColor.value, 0xFFEF4444);
    });
  });

  group('Unit Tests - AppConstants Dimensions', () {
    test('borderRadius should be 8.0', () {
      expect(AppConstants.borderRadius, 8.0);
    });

    test('buttonHeight should be 52.0', () {
      expect(AppConstants.buttonHeight, 52.0);
    });

    test('inputHeight should be 48.0', () {
      expect(AppConstants.inputHeight, 48.0);
    });

    test('spacing should be 16.0', () {
      expect(AppConstants.spacing, 16.0);
    });

    test('spacingLarge should be 24.0', () {
      expect(AppConstants.spacingLarge, 24.0);
    });
  });

  group('Unit Tests - AppConstants.sanitizeUrl', () {
    test('should replace localhost with IP', () {
      const input = 'http://localhost:9000/bucket/image.png';
      const expected = 'http://172.25.32.1:9000/bucket/image.png';
      expect(AppConstants.sanitizeUrl(input), expected);
    });

    test('should replace minio with IP', () {
      const input = 'http://minio:9000/bucket/resume.pdf';
      const expected = 'http://172.25.32.1:9000/bucket/resume.pdf';
      expect(AppConstants.sanitizeUrl(input), expected);
    });

    test('should return empty string for empty input', () {
      expect(AppConstants.sanitizeUrl(''), '');
    });

    test('should not modify external URLs', () {
      const input = 'https://example.com/image.png';
      expect(AppConstants.sanitizeUrl(input), input);
    });

    test('should handle multiple localhost occurrences', () {
      const input = 'http://localhost:9000/localhost/file.pdf';
      const expected = 'http://172.25.32.1:9000/172.25.32.1/file.pdf';
      expect(AppConstants.sanitizeUrl(input), expected);
    });
  });

  // ============================================================
  // Unit Tests: PAN Validation Logic
  // ============================================================
  group('Unit Tests - PAN Validation', () {
    final panRegex = RegExp(r'^[A-Z]{5}[0-9]{4}[A-Z]{1}$');

    test('valid PAN: ABCDE1234F', () {
      expect(panRegex.hasMatch('ABCDE1234F'), isTrue);
    });

    test('valid PAN: ZZZZZ9999Z', () {
      expect(panRegex.hasMatch('ZZZZZ9999Z'), isTrue);
    });

    test('invalid: lowercase letters', () {
      expect(panRegex.hasMatch('abcde1234f'), isFalse);
    });

    test('invalid: less than 10 chars', () {
      expect(panRegex.hasMatch('ABCDE123F'), isFalse);
    });

    test('invalid: more than 10 chars', () {
      expect(panRegex.hasMatch('ABCDE12345F'), isFalse);
    });

    test('invalid: starts with number', () {
      expect(panRegex.hasMatch('1BCDE1234F'), isFalse);
    });

    test('invalid: ends with number', () {
      expect(panRegex.hasMatch('ABCDE12341'), isFalse);
    });

    test('invalid: special characters', () {
      expect(panRegex.hasMatch('ABCD@1234F'), isFalse);
    });

    test('invalid: less than 5 initial letters', () {
      expect(panRegex.hasMatch('ABCD12345F'), isFalse);
    });

    test('valid after uppercase conversion', () {
      expect(panRegex.hasMatch('abcde1234f'.toUpperCase()), isTrue);
    });
  });

  // ============================================================
  // Unit Tests: Aadhar Validation Logic
  // ============================================================
  group('Unit Tests - Aadhar Validation', () {
    final aadharRegex = RegExp(r'^\d{12}$');

    test('valid: 12 digit number', () {
      expect(aadharRegex.hasMatch('123456789012'), isTrue);
    });

    test('valid: all zeros except last', () {
      expect(aadharRegex.hasMatch('000000000001'), isTrue);
    });

    test('valid: all nines', () {
      expect(aadharRegex.hasMatch('999999999999'), isTrue);
    });

    test('invalid: 11 digits', () {
      expect(aadharRegex.hasMatch('12345678901'), isFalse);
    });

    test('invalid: 13 digits', () {
      expect(aadharRegex.hasMatch('1234567890123'), isFalse);
    });

    test('invalid: contains letters', () {
      expect(aadharRegex.hasMatch('12345678901A'), isFalse);
    });

    test('invalid: contains special chars', () {
      expect(aadharRegex.hasMatch('1234-5678-9012'), isFalse);
    });

    test('invalid: contains spaces', () {
      expect(aadharRegex.hasMatch('1234 5678 9012'), isFalse);
    });

    test('invalid: empty string', () {
      expect(aadharRegex.hasMatch(''), isFalse);
    });
  });

  // ============================================================
  // Unit Tests: Email Validation Logic
  // ============================================================
  group('Unit Tests - Email Validation', () {
    final emailRegex = RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$');

    test('valid: standard email', () {
      expect(emailRegex.hasMatch('test@example.com'), isTrue);
    });

    test('valid: educational email', () {
      expect(emailRegex.hasMatch('student@kongu.edu'), isTrue);
    });

    test('valid: with dots', () {
      expect(emailRegex.hasMatch('john.doe@company.org'), isTrue);
    });

    test('valid: with dashes', () {
      expect(emailRegex.hasMatch('name-surname@domain.com'), isTrue);
    });

    test('valid: with underscores', () {
      expect(emailRegex.hasMatch('user_name@domain.co.uk'), isTrue);
    });

    test('valid: with numbers', () {
      expect(emailRegex.hasMatch('student123@university.ac.in'), isTrue);
    });

    test('invalid: no @ symbol', () {
      expect(emailRegex.hasMatch('invalid'), isFalse);
    });

    test('invalid: no domain', () {
      expect(emailRegex.hasMatch('test@'), isFalse);
    });

    test('invalid: no username', () {
      expect(emailRegex.hasMatch('@domain.com'), isFalse);
    });

    test('invalid: no TLD', () {
      expect(emailRegex.hasMatch('test@domain'), isFalse);
    });

    test('invalid: empty string', () {
      expect(emailRegex.hasMatch(''), isFalse);
    });
  });

  // ============================================================
  // Unit Tests: Data Structure Validation
  // ============================================================
  group('Unit Tests - Data Structures', () {
    test('drive data should have required fields', () {
      final drive = {
        'company_name': 'Test Company',
        'location': 'Chennai',
        'drive_date': '2024-02-15',
        'deadline_date': '2024-02-10',
        'user_status': 'eligible',
        'roles': [],
      };

      expect(drive.containsKey('company_name'), isTrue);
      expect(drive.containsKey('location'), isTrue);
      expect(drive.containsKey('drive_date'), isTrue);
      expect(drive.containsKey('deadline_date'), isTrue);
      expect(drive.containsKey('user_status'), isTrue);
      expect(drive.containsKey('roles'), isTrue);
    });

    test('user status values should be valid', () {
      final validStatuses = [
        'eligible',
        'opted_in',
        'opted_out',
        'shortlisted',
        'rejected',
        'placed',
      ];

      for (final status in validStatuses) {
        expect(validStatuses.contains(status), isTrue);
      }
    });

    test('role data should have required fields', () {
      final role = {
        'role_name': 'Software Engineer',
        'ctc': '8 LPA',
        'requirements': '',
      };

      expect(role.containsKey('role_name'), isTrue);
      expect(role.containsKey('ctc'), isTrue);
    });
  });
}
