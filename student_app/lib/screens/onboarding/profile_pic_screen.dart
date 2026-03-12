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
  StudentService get _studentService => ref.read(studentServiceProvider);

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
      imageProvider = NetworkImage(
        AppConstants.sanitizeUrl(providerState.profilePhotoUrl!),
      );
    }

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
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
                backgroundColor: Theme.of(context).dividerColor,
                color: AppConstants.successColor,
                minHeight: 4,
                borderRadius: BorderRadius.circular(2),
              ),
              const SizedBox(height: 32),
              Text(
                'Almost Done!',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                  color:
                      (Theme.of(context).textTheme.bodyLarge?.color ??
                      Colors.black),
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                'Add a profile picture to personalize your account.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color:
                      (Theme.of(context).textTheme.bodyMedium?.color ??
                      Colors.grey),
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
                      color: Theme.of(context).dividerColor,
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: Theme.of(
                          context,
                        ).colorScheme.primary.withValues(alpha: 0.3),
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
                        ? Icon(
                            Icons.person_rounded,
                            size: 80,
                            color:
                                (Theme.of(
                                  context,
                                ).textTheme.bodyMedium?.color ??
                                Colors.grey),
                          )
                        : null,
                  ),
                  Positioned(
                    bottom: 0,
                    right: 0,
                    child: Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.primary,
                        shape: BoxShape.circle,
                      ),
                      child: IconButton(
                        icon: Icon(
                          Icons.camera_alt_rounded,
                          color: Theme.of(context).cardColor,
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
                  style: TextStyle(
                    color:
                        (Theme.of(context).textTheme.bodyMedium?.color ??
                        Colors.grey),
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
