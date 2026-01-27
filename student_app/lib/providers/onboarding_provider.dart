import 'package:flutter_riverpod/flutter_riverpod.dart';

class OnboardingState {
  // Contact
  final String? mobileNumber;
  final String? dob;
  final String? placementWillingness;

  // Academic
  final double? tenthMark;
  final double? twelfthMark;
  final double? ugCgpa;
  final double? pgCgpa;

  // Address
  final String? city;
  final String? state;
  final String? fullAddress;

  // Socials
  final Map<String, String>? socialLinks;

  // Documents
  final String? profilePhotoUrl;
  final String? resumeUrl;
  final String? aadharUrl;
  final String? panUrl;

  OnboardingState({
    this.mobileNumber,
    this.dob,
    this.placementWillingness = 'Interested', // Default value
    this.tenthMark,
    this.twelfthMark,
    this.ugCgpa,
    this.pgCgpa,
    this.socialLinks,
    this.city,
    this.state,
    this.fullAddress,
    this.profilePhotoUrl,
    this.resumeUrl,
    this.aadharUrl,
    this.panUrl,
  });

  OnboardingState copyWith({
    String? mobileNumber,
    String? dob,
    String? placementWillingness,
    double? tenthMark,
    double? twelfthMark,
    double? ugCgpa,
    double? pgCgpa,
    Map<String, String>? socialLinks,
    String? city,
    String? state,
    String? fullAddress,
    String? profilePhotoUrl,
    String? resumeUrl,
    String? aadharUrl,
    String? panUrl,
  }) {
    return OnboardingState(
      mobileNumber: mobileNumber ?? this.mobileNumber,
      dob: dob ?? this.dob,
      placementWillingness: placementWillingness ?? this.placementWillingness,
      tenthMark: tenthMark ?? this.tenthMark,
      twelfthMark: twelfthMark ?? this.twelfthMark,
      ugCgpa: ugCgpa ?? this.ugCgpa,
      pgCgpa: pgCgpa ?? this.pgCgpa,
      socialLinks: socialLinks ?? this.socialLinks,
      city: city ?? this.city,
      state: state ?? this.state,
      fullAddress: fullAddress ?? this.fullAddress,
      profilePhotoUrl: profilePhotoUrl ?? this.profilePhotoUrl,
      resumeUrl: resumeUrl ?? this.resumeUrl,
      aadharUrl: aadharUrl ?? this.aadharUrl,
      panUrl: panUrl ?? this.panUrl,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'mobile_number': mobileNumber,
      'dob': dob,
      'placement_willingness': placementWillingness ?? 'Interested',
      'tenth_mark': tenthMark,
      'twelfth_mark': twelfthMark,
      'ug_cgpa': ugCgpa,
      'pg_cgpa': pgCgpa ?? 0.0,
      'social_links': socialLinks ?? {},
      'city': city,
      'state': state,
      'address': fullAddress,
      'profile_photo_url': profilePhotoUrl,
      'resume_url': resumeUrl,
      'aadhar_card_url': aadharUrl,
      'pan_card_url': panUrl,
    };
  }
}

class OnboardingNotifier extends Notifier<OnboardingState> {
  @override
  OnboardingState build() {
    return OnboardingState();
  }

  void updateContact(
    String mobile,
    String dob, {
    String? linkedin,
    String? github,
  }) {
    final socials = {
      if (linkedin != null && linkedin.isNotEmpty) 'linkedin': linkedin,
      if (github != null && github.isNotEmpty) 'github': github,
    };
    state = state.copyWith(
      mobileNumber: mobile,
      dob: dob,
      socialLinks: socials,
    );
  }

  void updateAcademic(double tenth, double twelfth, double ug, double? pg) {
    state = state.copyWith(
      tenthMark: tenth,
      twelfthMark: twelfth,
      ugCgpa: ug,
      pgCgpa: pg,
    );
  }

  void updateAddress(String city, String stateVal, String address) {
    state = state.copyWith(city: city, state: stateVal, fullAddress: address);
  }

  void updateProfilePhoto(String url) {
    state = state.copyWith(profilePhotoUrl: url);
  }

  void updateDocuments({String? resume, String? aadhar, String? pan}) {
    state = state.copyWith(
      resumeUrl: resume ?? state.resumeUrl,
      aadharUrl: aadhar ?? state.aadharUrl,
      panUrl: pan ?? state.panUrl,
    );
  }
}

final onboardingProvider =
    NotifierProvider<OnboardingNotifier, OnboardingState>(() {
      return OnboardingNotifier();
    });
