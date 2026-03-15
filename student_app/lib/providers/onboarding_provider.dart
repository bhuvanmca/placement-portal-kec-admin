import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

class OnboardingState {
  // Basic Information
  final String? firstName;
  final String? middleName;
  final String? lastName;
  final String? fatherName;
  final String? motherName;

  // Contact
  final String? mobileNumber;
  final String? dob;
  final String? gender;
  final String? placementWillingness;

  // Academic
  final double? tenthMark;
  final double? twelfthMark;
  final double? diplomaMark;
  final double? ugCgpa;
  final double? pgCgpa;
  final int? tenthYearPass;
  final int? twelfthYearPass;
  final int? diplomaYearPass;
  final int? ugYearPass;
  final int? pgYearPass;

  // Address
  final String? addressLine1;
  final String? addressLine2;
  final String? state;

  // Socials
  final Map<String, String>? socialLinks;

  // Documents & Identity
  final String? profilePhotoUrl;
  final String? resumeUrl;
  final String? aadharNumber;
  final String? panNumber;
  final String? aadharDocUrl;
  final String? panDocUrl;

  OnboardingState({
    this.firstName,
    this.middleName,
    this.lastName,
    this.fatherName,
    this.motherName,
    this.mobileNumber,
    this.dob,
    this.gender,
    this.placementWillingness = 'Interested',
    this.tenthMark,
    this.twelfthMark,
    this.diplomaMark,
    this.ugCgpa,
    this.pgCgpa,
    this.tenthYearPass,
    this.twelfthYearPass,
    this.diplomaYearPass,
    this.ugYearPass,
    this.pgYearPass,
    this.socialLinks,
    this.addressLine1,
    this.addressLine2,
    this.state,
    this.profilePhotoUrl,
    this.resumeUrl,
    this.aadharNumber,
    this.panNumber,
    this.aadharDocUrl,
    this.panDocUrl,
  });

  OnboardingState copyWith({
    String? firstName,
    String? middleName,
    String? lastName,
    String? fatherName,
    String? motherName,
    String? mobileNumber,
    String? dob,
    String? gender,
    String? placementWillingness,
    double? tenthMark,
    double? twelfthMark,
    double? diplomaMark,
    double? ugCgpa,
    double? pgCgpa,
    int? tenthYearPass,
    int? twelfthYearPass,
    int? diplomaYearPass,
    int? ugYearPass,
    int? pgYearPass,
    Map<String, String>? socialLinks,
    String? addressLine1,
    String? addressLine2,
    String? state,
    String? profilePhotoUrl,
    String? resumeUrl,
    String? aadharNumber,
    String? panNumber,
    String? aadharDocUrl,
    String? panDocUrl,
  }) {
    return OnboardingState(
      firstName: firstName ?? this.firstName,
      middleName: middleName ?? this.middleName,
      lastName: lastName ?? this.lastName,
      fatherName: fatherName ?? this.fatherName,
      motherName: motherName ?? this.motherName,
      mobileNumber: mobileNumber ?? this.mobileNumber,
      dob: dob ?? this.dob,
      gender: gender ?? this.gender,
      placementWillingness: placementWillingness ?? this.placementWillingness,
      tenthMark: tenthMark ?? this.tenthMark,
      twelfthMark: twelfthMark ?? this.twelfthMark,
      diplomaMark: diplomaMark ?? this.diplomaMark,
      ugCgpa: ugCgpa ?? this.ugCgpa,
      pgCgpa: pgCgpa ?? this.pgCgpa,
      tenthYearPass: tenthYearPass ?? this.tenthYearPass,
      twelfthYearPass: twelfthYearPass ?? this.twelfthYearPass,
      diplomaYearPass: diplomaYearPass ?? this.diplomaYearPass,
      ugYearPass: ugYearPass ?? this.ugYearPass,
      pgYearPass: pgYearPass ?? this.pgYearPass,
      socialLinks: socialLinks ?? this.socialLinks,
      addressLine1: addressLine1 ?? this.addressLine1,
      addressLine2: addressLine2 ?? this.addressLine2,
      state: state ?? this.state,
      profilePhotoUrl: profilePhotoUrl ?? this.profilePhotoUrl,
      resumeUrl: resumeUrl ?? this.resumeUrl,
      aadharNumber: aadharNumber ?? this.aadharNumber,
      panNumber: panNumber ?? this.panNumber,
      aadharDocUrl: aadharDocUrl ?? this.aadharDocUrl,
      panDocUrl: panDocUrl ?? this.panDocUrl,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'first_name': firstName,
      'middle_name': middleName,
      'last_name': lastName,
      'father_name': fatherName,
      'mother_name': motherName,
      'mobile_number': mobileNumber,
      'dob': dob,
      'gender': gender,
      'placement_willingness': placementWillingness ?? 'Interested',
      'tenth_mark': tenthMark,
      'twelfth_mark': twelfthMark,
      'diploma_mark': diplomaMark ?? 0.0,
      'ug_cgpa': ugCgpa,
      'pg_cgpa': pgCgpa ?? 0.0,
      'tenth_year_pass': tenthYearPass ?? 0,
      'twelfth_year_pass': twelfthYearPass ?? 0,
      'diploma_year_pass': diplomaYearPass ?? 0,
      'ug_year_pass': ugYearPass ?? 0,
      'pg_year_pass': pgYearPass ?? 0,
      'social_links': socialLinks ?? {},
      'address_line_1': addressLine1,
      'address_line_2': addressLine2,
      'state': state,
      'profile_photo_url': profilePhotoUrl,
      'resume_url': resumeUrl,
      'aadhar_number': aadharNumber,
      'pan_number': panNumber,
      'aadhar_doc_url': aadharDocUrl,
      'pan_doc_url': panDocUrl,
    };
  }
}

class OnboardingNotifier extends Notifier<OnboardingState> {
  static const _prefsKey = 'onboarding_draft';

  @override
  OnboardingState build() {
    _loadFromPrefs();
    return OnboardingState();
  }

  Future<void> _loadFromPrefs() async {
    final prefs = await SharedPreferences.getInstance();
    final json = prefs.getString(_prefsKey);
    if (json != null) {
      try {
        final map = jsonDecode(json) as Map<String, dynamic>;
        state = OnboardingState(
          firstName: map['first_name'] as String?,
          middleName: map['middle_name'] as String?,
          lastName: map['last_name'] as String?,
          fatherName: map['father_name'] as String?,
          motherName: map['mother_name'] as String?,
          mobileNumber: map['mobile_number'] as String?,
          dob: map['dob'] as String?,
          gender: map['gender'] as String?,
          placementWillingness:
              map['placement_willingness'] as String? ?? 'Interested',
          tenthMark: (map['tenth_mark'] as num?)?.toDouble(),
          twelfthMark: (map['twelfth_mark'] as num?)?.toDouble(),
          diplomaMark: (map['diploma_mark'] as num?)?.toDouble(),
          ugCgpa: (map['ug_cgpa'] as num?)?.toDouble(),
          pgCgpa: (map['pg_cgpa'] as num?)?.toDouble(),
          tenthYearPass: (map['tenth_year_pass'] as num?)?.toInt(),
          twelfthYearPass: (map['twelfth_year_pass'] as num?)?.toInt(),
          diplomaYearPass: (map['diploma_year_pass'] as num?)?.toInt(),
          ugYearPass: (map['ug_year_pass'] as num?)?.toInt(),
          pgYearPass: (map['pg_year_pass'] as num?)?.toInt(),
          socialLinks: map['social_links'] != null
              ? Map<String, String>.from(map['social_links'] as Map)
              : null,
          addressLine1: map['address_line_1'] as String?,
          addressLine2: map['address_line_2'] as String?,
          state: map['state'] as String?,
          profilePhotoUrl: map['profile_photo_url'] as String?,
          resumeUrl: map['resume_url'] as String?,
          aadharNumber: map['aadhar_number'] as String?,
          panNumber: map['pan_number'] as String?,
          aadharDocUrl: map['aadhar_doc_url'] as String?,
          panDocUrl: map['pan_doc_url'] as String?,
        );
      } catch (_) {
        // Corrupted data, ignore
      }
    }
  }

  Future<void> _saveToPrefs() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefsKey, jsonEncode(state.toJson()));
  }

  void updateBasicInfo({
    required String firstName,
    String? middleName,
    required String lastName,
    required String fatherName,
    required String motherName,
  }) {
    state = state.copyWith(
      firstName: firstName,
      middleName: middleName,
      lastName: lastName,
      fatherName: fatherName,
      motherName: motherName,
    );
    _saveToPrefs();
  }

  void updateContact(String mobile, {String? linkedin, String? github}) {
    final socials = {
      if (linkedin != null && linkedin.isNotEmpty) 'linkedin': linkedin,
      if (github != null && github.isNotEmpty) 'github': github,
    };
    state = state.copyWith(mobileNumber: mobile, socialLinks: socials);
    _saveToPrefs();
  }

  void updateAcademic(
    double tenth,
    double twelfth,
    double ug,
    double? pg, {
    double? diploma,
    int? tenthYearPass,
    int? twelfthYearPass,
    int? diplomaYearPass,
    int? ugYearPass,
    int? pgYearPass,
  }) {
    state = state.copyWith(
      tenthMark: tenth,
      twelfthMark: twelfth,
      diplomaMark: diploma,
      ugCgpa: ug,
      pgCgpa: pg,
      tenthYearPass: tenthYearPass,
      twelfthYearPass: twelfthYearPass,
      diplomaYearPass: diplomaYearPass,
      ugYearPass: ugYearPass,
      pgYearPass: pgYearPass,
    );
    _saveToPrefs();
  }

  void updatePersonal(
    String addr1,
    String addr2,
    String stateVal,
    String dob,
    String gender,
  ) {
    state = state.copyWith(
      addressLine1: addr1,
      addressLine2: addr2,
      state: stateVal,
      dob: dob,
      gender: gender,
    );
    _saveToPrefs();
  }

  void updateProfilePhoto(String url) {
    state = state.copyWith(profilePhotoUrl: url);
    _saveToPrefs();
  }

  void updateDocuments({
    String? resume,
    String? aadharNumber,
    String? panNumber,
    String? aadharDocUrl,
    String? panDocUrl,
  }) {
    state = state.copyWith(
      resumeUrl: resume ?? state.resumeUrl,
      aadharNumber: aadharNumber ?? state.aadharNumber,
      panNumber: panNumber ?? state.panNumber,
      aadharDocUrl: aadharDocUrl ?? state.aadharDocUrl,
      panDocUrl: panDocUrl ?? state.panDocUrl,
    );
    _saveToPrefs();
  }

  Future<void> clearDraft() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_prefsKey);
    state = OnboardingState();
  }
}

final onboardingProvider =
    NotifierProvider<OnboardingNotifier, OnboardingState>(() {
      return OnboardingNotifier();
    });
