import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

class OnboardingState {
  // Contact
  final String? mobileNumber;
  final String? dob;
  final String? gender;
  final String? placementWillingness;

  // Academic
  final double? tenthMark;
  final double? twelfthMark;
  final double? ugCgpa;
  final double? pgCgpa;

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

  OnboardingState({
    this.mobileNumber,
    this.dob,
    this.gender,
    this.placementWillingness = 'Interested',
    this.tenthMark,
    this.twelfthMark,
    this.ugCgpa,
    this.pgCgpa,
    this.socialLinks,
    this.addressLine1,
    this.addressLine2,
    this.state,
    this.profilePhotoUrl,
    this.resumeUrl,
    this.aadharNumber,
    this.panNumber,
  });

  OnboardingState copyWith({
    String? mobileNumber,
    String? dob,
    String? gender,
    String? placementWillingness,
    double? tenthMark,
    double? twelfthMark,
    double? ugCgpa,
    double? pgCgpa,
    Map<String, String>? socialLinks,
    String? addressLine1,
    String? addressLine2,
    String? state,
    String? profilePhotoUrl,
    String? resumeUrl,
    String? aadharNumber,
    String? panNumber,
  }) {
    return OnboardingState(
      mobileNumber: mobileNumber ?? this.mobileNumber,
      dob: dob ?? this.dob,
      gender: gender ?? this.gender,
      placementWillingness: placementWillingness ?? this.placementWillingness,
      tenthMark: tenthMark ?? this.tenthMark,
      twelfthMark: twelfthMark ?? this.twelfthMark,
      ugCgpa: ugCgpa ?? this.ugCgpa,
      pgCgpa: pgCgpa ?? this.pgCgpa,
      socialLinks: socialLinks ?? this.socialLinks,
      addressLine1: addressLine1 ?? this.addressLine1,
      addressLine2: addressLine2 ?? this.addressLine2,
      state: state ?? this.state,
      profilePhotoUrl: profilePhotoUrl ?? this.profilePhotoUrl,
      resumeUrl: resumeUrl ?? this.resumeUrl,
      aadharNumber: aadharNumber ?? this.aadharNumber,
      panNumber: panNumber ?? this.panNumber,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'mobile_number': mobileNumber,
      'dob': dob,
      'gender': gender,
      'placement_willingness': placementWillingness ?? 'Interested',
      'tenth_mark': tenthMark,
      'twelfth_mark': twelfthMark,
      'ug_cgpa': ugCgpa,
      'pg_cgpa': pgCgpa ?? 0.0,
      'social_links': socialLinks ?? {},
      'address_line_1': addressLine1,
      'address_line_2': addressLine2,
      'state': state,
      'profile_photo_url': profilePhotoUrl,
      'resume_url': resumeUrl,
      'aadhar_number': aadharNumber,
      'pan_number': panNumber,
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
          mobileNumber: map['mobile_number'] as String?,
          dob: map['dob'] as String?,
          gender: map['gender'] as String?,
          placementWillingness:
              map['placement_willingness'] as String? ?? 'Interested',
          tenthMark: (map['tenth_mark'] as num?)?.toDouble(),
          twelfthMark: (map['twelfth_mark'] as num?)?.toDouble(),
          ugCgpa: (map['ug_cgpa'] as num?)?.toDouble(),
          pgCgpa: (map['pg_cgpa'] as num?)?.toDouble(),
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

  void updateContact(String mobile, {String? linkedin, String? github}) {
    final socials = {
      if (linkedin != null && linkedin.isNotEmpty) 'linkedin': linkedin,
      if (github != null && github.isNotEmpty) 'github': github,
    };
    state = state.copyWith(mobileNumber: mobile, socialLinks: socials);
    _saveToPrefs();
  }

  void updateAcademic(double tenth, double twelfth, double ug, double? pg) {
    state = state.copyWith(
      tenthMark: tenth,
      twelfthMark: twelfth,
      ugCgpa: ug,
      pgCgpa: pg,
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
  }) {
    state = state.copyWith(
      resumeUrl: resume ?? state.resumeUrl,
      aadharNumber: aadharNumber ?? state.aadharNumber,
      panNumber: panNumber ?? state.panNumber,
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
