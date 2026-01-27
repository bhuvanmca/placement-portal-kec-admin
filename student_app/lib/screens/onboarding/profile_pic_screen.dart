import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../providers/onboarding_provider.dart';
import '../../services/student_service.dart';
import '../../utils/constants.dart';
import '../../widgets/app_button.dart';

class ProfilePicScreen extends ConsumerStatefulWidget {
  const ProfilePicScreen({super.key});

  @override
  ConsumerState<ProfilePicScreen> createState() => _ProfilePicScreenState();
}

class _ProfilePicScreenState extends ConsumerState<ProfilePicScreen> {
  bool _isLoading = false;
  File? _imageFile;
  final ImagePicker _picker = ImagePicker();
  final StudentService _studentService = StudentService();

  Future<void> _pickImage(ImageSource source) async {
    try {
      final XFile? pickedFile = await _picker.pickImage(source: source);
      if (pickedFile != null) {
        setState(() {
          _imageFile = File(pickedFile.path);
        });
        await _uploadImage(pickedFile.path);
      }
    } catch (e) {
      debugPrint('Error picking image: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to pick image: $e')),
      );
    }
  }

  Future<void> _uploadImage(String filePath) async {
    setState(() => _isLoading = true);
    try {
      final url = await _studentService.uploadFile(filePath, 'profile_pic');
      ref.read(onboardingProvider.notifier).updateProfilePhoto(url);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Profile picture uploaded successfully!')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Upload failed: $e')),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _next() {
    context.go('/onboarding/documents');
  }

  @override
  Widget build(BuildContext context) {
    // Check if we have a URL in provider to show (if coming back)
    final providerState = ref.watch(onboardingProvider);
    final hasImage = _imageFile != null || providerState.profilePhotoUrl != null;

    ImageProvider? imageProvider;
    if (_imageFile != null) {
      imageProvider = FileImage(_imageFile!);
    } else if (providerState.profilePhotoUrl != null) {
      imageProvider = NetworkImage(providerState.profilePhotoUrl!);
    }

    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.go('/onboarding/address'),
        ),
        title: const Text('Profile Picture'),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppConstants.spacingLarge),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              LinearProgressIndicator(
                value: 0.9,
                backgroundColor: AppConstants.borderColor,
                color: AppConstants.successColor,
                minHeight: 4,
                borderRadius: BorderRadius.circular(2),
              ),
              const SizedBox(height: 32),
              Text(
                'Almost Done!',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: AppConstants.textPrimary,
                    ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                'Add a profile picture to personalize your account.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppConstants.textSecondary,
                    ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 48),
              Stack(
                children: [
                  Container(
                    width: 150,
                    height: 150,
                    decoration: BoxDecoration(
                      color: AppConstants.borderColor,
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: AppConstants.primaryColor.withOpacity(0.3),
                        width: 3,
                      ),
                      image: imageProvider != null
                          ? DecorationImage(image: imageProvider, fit: BoxFit.cover)
                          : null,
                    ),
                    child: !hasImage
                        ? const Icon(
                            Icons.person_rounded,
                            size: 80,
                            color: AppConstants.textSecondary,
                          )
                        : null,
                  ),
                  Positioned(
                    bottom: 0,
                    right: 0,
                    child: Container(
                      width: 48,
                      height: 48,
                      decoration: const BoxDecoration(
                        color: AppConstants.primaryColor,
                        shape: BoxShape.circle,
                      ),
                      child: IconButton(
                        icon: const Icon(Icons.camera_alt_rounded, color: Colors.white),
                        onPressed: () => _pickImage(ImageSource.camera),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              TextButton(
                onPressed: () => _pickImage(ImageSource.gallery),
                child: const Text('Choose from Gallery'),
              ),
              const Spacer(),
              AppButton(
                label: 'Continue',
                isLoading: _isLoading,
                onPressed: _next,
              ),
              const SizedBox(height: 12),
              TextButton(
                onPressed: _isLoading ? null : _next,
                child: Text(
                  'Skip for now',
                  style: TextStyle(
                    color: AppConstants.textSecondary,
                  ),
                ),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}
