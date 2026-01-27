import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:file_picker/file_picker.dart';
import '../../providers/onboarding_provider.dart';
import '../../providers/auth_provider.dart'; // [NEW]
import '../../services/student_service.dart';
import '../../utils/constants.dart';
import '../../widgets/app_button.dart';

class DocumentsScreen extends ConsumerStatefulWidget {
  const DocumentsScreen({super.key});

  @override
  ConsumerState<DocumentsScreen> createState() => _DocumentsScreenState();
}

class _DocumentsScreenState extends ConsumerState<DocumentsScreen> {
  // Store file names for UI display
  String? _resumeName;
  String?
  _photoName; // Probably from prev screen, but if they want to change or view status
  String? _aadharName;
  String? _panName;

  bool _isLoading = false;
  final StudentService _studentService = StudentService();

  @override
  void initState() {
    super.initState();
    // Initialize UI state from provider if available
    // Note: filenames are not stored in provider currently, just URLs.
    // We could store names in separate provider fields if needed,
    // but for now we'll just show uploaded state if URL exists.
    final state = ref.read(onboardingProvider);
    if (state.resumeUrl != null && state.resumeUrl!.isNotEmpty) {
      _resumeName = "Uploaded";
    }
    if (state.aadharUrl != null && state.aadharUrl!.isNotEmpty) {
      _aadharName = "Uploaded";
    }
    if (state.panUrl != null && state.panUrl!.isNotEmpty) {
      _panName = "Uploaded";
    }
    if (state.profilePhotoUrl != null && state.profilePhotoUrl!.isNotEmpty) {
      _photoName = "Uploaded (from Profile Pic screen)";
    }
  }

  Future<void> _pickFile(String type) async {
    try {
      FilePickerResult? result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png'],
      );

      if (result != null) {
        setState(() => _isLoading = true);
        final file = result.files.single;

        // Upload immediately
        final url = await _studentService.uploadFile(
          file.path!,
          type == 'photo' ? 'profile_pic' : type,
        );

        // Update provider with URL
        if (type == 'resume') {
          ref.read(onboardingProvider.notifier).updateDocuments(resume: url);
          setState(() => _resumeName = file.name);
        } else if (type == 'aadhar') {
          ref.read(onboardingProvider.notifier).updateDocuments(aadhar: url);
          setState(() => _aadharName = file.name);
        } else if (type == 'pan') {
          ref.read(onboardingProvider.notifier).updateDocuments(pan: url);
          setState(() => _panName = file.name);
        } else if (type == 'photo') {
          ref.read(onboardingProvider.notifier).updateProfilePhoto(url);
          setState(() => _photoName = file.name);
        }

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${type.toUpperCase()} uploaded successfully'),
          ),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Upload failed: $e')));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _submit() async {
    setState(() => _isLoading = true);

    try {
      final state = ref.read(onboardingProvider);

      // Construct payload
      final Map<String, dynamic> payload = {
        'mobile_number': state.mobileNumber ?? '',
        'dob': state.dob ?? '',
        // Address
        'city': state.city ?? '',
        'state': state.state ?? '',
        // Academics
        'tenth_mark': state.tenthMark ?? 0.0,
        'twelfth_mark': state.twelfthMark ?? 0.0,
        'ug_cgpa': state.ugCgpa ?? 0.0,
        'pg_cgpa': state.pgCgpa ?? 0.0,
        'social_links': state.socialLinks ?? {},
        'placement_willingness': state.placementWillingness ?? 'Interested',
        // Documents
        'profile_photo_url': state.profilePhotoUrl ?? '',
        'resume_url': state.resumeUrl ?? '',
        'aadhar_card_url': state.aadharUrl ?? '',
        'pan_card_url': state.panUrl ?? '',
        // Default / Required empty fields to satisfy struct matching?
        // Go struct tags are optional usually, but let's provide safe defaults
      };

      await _studentService.updateProfile(payload);

      // Update auth state to reflect profile completion
      await ref.read(authControllerProvider.notifier).completeProfile();

      // Router should handle redirection, but we can be explicit just in case
      if (mounted) {
        context.go('/drives');
      }
    } catch (e) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Submission failed: $e')));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Widget _buildUploadCard(String title, String? fileName, VoidCallback onTap) {
    // If filename is "Uploaded" or has name, show check
    final bool isUploaded = fileName != null;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppConstants.borderRadius),
        border: Border.all(
          color: isUploaded
              ? AppConstants.successColor
              : AppConstants.borderColor,
        ),
      ),
      child: Row(
        children: [
          Icon(
            isUploaded ? Icons.check_circle : Icons.cloud_upload_outlined,
            color: isUploaded
                ? AppConstants.successColor
                : AppConstants.primaryColor,
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                if (fileName != null)
                  Text(
                    fileName,
                    style: const TextStyle(
                      color: AppConstants.textSecondary,
                      fontSize: 12,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
              ],
            ),
          ),
          TextButton(
            onPressed: _isLoading ? null : onTap,
            child: Text(isUploaded ? 'Change' : 'Upload'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.go('/onboarding/profile-pic'),
        ),
        title: const Text('Upload Documents'),
        centerTitle: true,
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppConstants.spacingLarge),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              LinearProgressIndicator(
                value: 1.0,
                backgroundColor: AppConstants.borderColor,
                color: AppConstants.primaryColor,
                minHeight: 4,
                borderRadius: BorderRadius.circular(2),
              ),
              const SizedBox(height: 32),
              Text(
                'Almost done!',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: AppConstants.textPrimary,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Please upload your essential documents to complete your profile.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppConstants.textSecondary,
                ),
              ),
              const SizedBox(height: 24),

              Expanded(
                child: SingleChildScrollView(
                  child: Column(
                    children: [
                      _buildUploadCard(
                        'Resume (PDF)',
                        _resumeName,
                        () => _pickFile('resume'),
                      ),
                      _buildUploadCard(
                        'Profile Photo',
                        _photoName,
                        () => _pickFile('photo'),
                      ), // Allow re-upload here
                      _buildUploadCard(
                        'Aadhar Card',
                        _aadharName,
                        () => _pickFile('aadhar'),
                      ),
                      _buildUploadCard(
                        'PAN Card',
                        _panName,
                        () => _pickFile('pan'),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 16),
              AppButton(
                label: _isLoading ? 'Submitting...' : 'Complete Profile',
                isLoading: _isLoading,
                onPressed: _isLoading ? null : _submit,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
