import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:file_picker/file_picker.dart';
import '../../providers/onboarding_provider.dart';
import '../../providers/auth_provider.dart';
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
  String? _photoName;

  final _aadharController = TextEditingController();
  final _panController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  bool _isLoading = false;
  final StudentService _studentService = StudentService();

  @override
  void initState() {
    super.initState();
    final state = ref.read(onboardingProvider);

    // Resume/Photo State
    if (state.resumeUrl != null && state.resumeUrl!.isNotEmpty) {
      _resumeName = "Uploaded";
    }
    if (state.profilePhotoUrl != null && state.profilePhotoUrl!.isNotEmpty) {
      _photoName = "Uploaded (from Profile Pic screen)";
    }

    // Identity Numbers State
    _aadharController.text = state.aadharNumber ?? '';
    _panController.text = state.panNumber ?? '';
  }

  @override
  void dispose() {
    _aadharController.dispose();
    _panController.dispose();
    super.dispose();
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
        } else if (type == 'photo') {
          ref.read(onboardingProvider.notifier).updateProfilePhoto(url);
          setState(() => _photoName = file.name);
        }

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${type.toUpperCase()} uploaded successfully'),
            backgroundColor: AppConstants.successColor,
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
    if (!_formKey.currentState!.validate()) return;

    // Save Identity Numbers to state before submitting
    ref
        .read(onboardingProvider.notifier)
        .updateDocuments(
          aadharNumber: _aadharController.text,
          panNumber: _panController.text,
        );

    setState(() => _isLoading = true);

    try {
      final state = ref.read(onboardingProvider);

      // Construct payload
      final Map<String, dynamic> payload = {
        'mobile_number': state.mobileNumber ?? '',
        'dob': state.dob ?? '',
        // Address
        'address_line_1': state.addressLine1 ?? '',
        'address_line_2': state.addressLine2 ?? '',
        'state': state.state ?? '',
        // Academics
        'tenth_mark': state.tenthMark ?? 0.0,
        'twelfth_mark': state.twelfthMark ?? 0.0,
        'ug_cgpa': state.ugCgpa ?? 0.0,
        'pg_cgpa': state.pgCgpa ?? 0.0,
        'social_links': state.socialLinks ?? {},
        'placement_willingness': state.placementWillingness ?? 'Interested',
        // Documents & Identity
        'profile_photo_url': state.profilePhotoUrl ?? '',
        'resume_url': state.resumeUrl ?? '',
        'aadhar_number': state.aadharNumber ?? '',
        'pan_number': state.panNumber ?? '',
      };

      await _studentService.updateProfile(payload);

      // Update auth state to reflect profile completion
      await ref.read(authControllerProvider.notifier).completeProfile();

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
        title: const Text('Identity & Documents'),
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
                'Please provide your identity numbers and upload essential documents.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppConstants.textSecondary,
                ),
              ),
              const SizedBox(height: 24),

              Expanded(
                child: SingleChildScrollView(
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          "Identity Details",
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                            color: AppConstants.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Aadhar Number
                        TextFormField(
                          controller: _aadharController,
                          keyboardType: TextInputType.number,
                          decoration: InputDecoration(
                            labelText: 'Aadhar Number',
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(
                                AppConstants.borderRadius,
                              ),
                            ),
                            prefixIcon: const Icon(Icons.badge_outlined),
                          ),
                          validator: (value) {
                            if (value == null || value.isEmpty) {
                              return 'Required';
                            }
                            if (value.length < 12) {
                              return 'Invalid Aadhar Number';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 16),

                        // PAN Number
                        TextFormField(
                          controller: _panController,
                          textCapitalization: TextCapitalization.characters,
                          decoration: InputDecoration(
                            labelText: 'PAN Number',
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(
                                AppConstants.borderRadius,
                              ),
                            ),
                            prefixIcon: const Icon(Icons.credit_card),
                          ),
                          validator: (value) {
                            if (value == null || value.isEmpty) {
                              return 'Required';
                            }
                            if (value.length != 10) {
                              return 'Invalid PAN Number (10 chars)';
                            }
                            return null;
                          },
                        ),

                        const SizedBox(height: 32),
                        const Text(
                          "Documents",
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                            color: AppConstants.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 16),

                        _buildUploadCard(
                          'Resume (PDF)',
                          _resumeName,
                          () => _pickFile('resume'),
                        ),
                        _buildUploadCard(
                          'Profile Photo',
                          _photoName,
                          () => _pickFile('photo'),
                        ),
                      ],
                    ),
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
