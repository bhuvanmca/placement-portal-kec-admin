import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:flutter_image_compress/flutter_image_compress.dart'; // [FIX] Added import
import 'package:path_provider/path_provider.dart'; // [FIX] Added for temp dir
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
        // Auto upload after picking
        await _uploadImage(File(pickedFile.path));
      }
    } catch (e) {
      debugPrint('Error picking image: $e');
      _showError('Failed to pick image');
    }
  }

  // [FIX] Compress Image function
  Future<File?> _compressImage(File file) async {
    try {
      final tempDir = await getTemporaryDirectory();
      final targetPath =
          '${tempDir.path}/${DateTime.now().millisecondsSinceEpoch}.jpg';

      final result = await FlutterImageCompress.compressAndGetFile(
        file.absolute.path,
        targetPath,
        quality: 70, // 70% quality
        minWidth: 1024, // Resize to max 1024px width
        minHeight: 1024,
      );

      if (result == null) return null;
      return File(result.path);
    } catch (e) {
      debugPrint('Compression error: $e');
      return file; // Fallback to original
    }
  }

  Future<void> _uploadImage(File rawFile) async {
    setState(() => _isLoading = true);
    try {
      // 1. Compress
      File fileToUpload = rawFile;
      final compressed = await _compressImage(rawFile);
      if (compressed != null) {
        fileToUpload = compressed;
        debugPrint(
          "Original size: ${await rawFile.length()} | Compressed: ${await fileToUpload.length()}",
        );
      }

      // 2. Upload
      final url = await _studentService.uploadFile(
        fileToUpload.path,
        'profile_pic',
      );

      // 3. Update State
      ref.read(onboardingProvider.notifier).updateProfilePhoto(url);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Profile picture updated successfully!'),
            backgroundColor: AppConstants.successColor,
          ),
        );
      }
    } catch (e) {
      errorLog(e); // Helper to log but not show
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // [FIX] Sanitized Error Handling
  void errorLog(dynamic e) {
    debugPrint('Upload Error: $e');
    String userMessage = 'Failed to upload profile picture.';

    // Check for common network errors
    final errStr = e.toString().toLowerCase();
    if (errStr.contains('socketexception') ||
        errStr.contains('broken pipe') ||
        errStr.contains('clientexception')) {
      userMessage =
          'Network error. Please check your connection and try again.';
    } else if (errStr.contains('payload too large')) {
      userMessage = 'Image is too large. Please choose a smaller one.';
    }

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(userMessage), backgroundColor: Colors.redAccent),
      );
    }
  }

  void _showError(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: Colors.redAccent),
    );
  }

  void _next() {
    context.go('/onboarding/documents');
  }

  @override
  Widget build(BuildContext context) {
    // Check if we have a URL in provider to show (if coming back)
    final providerState = ref.watch(onboardingProvider);
    final hasImage =
        _imageFile != null || providerState.profilePhotoUrl != null;

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
        child: SingleChildScrollView(
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
                        color: AppConstants.primaryColor.withValues(alpha: 0.3),
                        width: 3,
                      ),
                      image: imageProvider != null
                          ? DecorationImage(
                              image: imageProvider,
                              fit: BoxFit.cover,
                            )
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
                        icon: const Icon(
                          Icons.camera_alt_rounded,
                          color: Colors.white,
                        ),
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
              const SizedBox(height: 48),
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
                  style: TextStyle(color: AppConstants.textSecondary),
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
