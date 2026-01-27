import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/student_service.dart';
import '../utils/constants.dart';

class EditProfileScreen extends ConsumerStatefulWidget {
  final Map<String, dynamic> profileData;

  const EditProfileScreen({super.key, required this.profileData});

  @override
  ConsumerState<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends ConsumerState<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final StudentService _studentService = StudentService();

  late TextEditingController _mobileController;
  late TextEditingController _cityController;
  late TextEditingController _stateController;
  late TextEditingController _aboutMeController;
  late TextEditingController _linkedinController;
  late TextEditingController _githubController;

  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    final socialLinks =
        widget.profileData['social_links'] as Map<String, dynamic>? ?? {};

    _mobileController = TextEditingController(
      text: widget.profileData['mobile_number'] ?? '',
    );
    _cityController = TextEditingController(
      text: widget.profileData['city'] ?? '',
    );
    _stateController = TextEditingController(
      text: widget.profileData['state'] ?? '',
    );
    _aboutMeController = TextEditingController(
      text: widget.profileData['about_me'] ?? '',
    );
    _linkedinController = TextEditingController(
      text: socialLinks['linkedin'] ?? '',
    );
    _githubController = TextEditingController(
      text: socialLinks['github'] ?? '',
    );
  }

  @override
  void dispose() {
    _mobileController.dispose();
    _cityController.dispose();
    _stateController.dispose();
    _aboutMeController.dispose();
    _linkedinController.dispose();
    _githubController.dispose();
    super.dispose();
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final updateData = {
        'mobile_number': _mobileController.text,
        'city': _cityController.text,
        'state': _stateController.text,
        'about_me': _aboutMeController.text,
        'social_links': {
          if (_linkedinController.text.isNotEmpty)
            'linkedin': _linkedinController.text,
          if (_githubController.text.isNotEmpty)
            'github': _githubController.text,
        },
      };

      await _studentService.updateProfile(updateData);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Profile updated successfully!')),
        );
        Navigator.of(context).pop(true); // Return true to indicate success
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed to update profile: $e')));
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      appBar: AppBar(
        title: const Text(
          'Edit Profile',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: AppConstants.backgroundColor,
        elevation: 0,
        scrolledUnderElevation: 0,
        actions: [
          if (_isLoading)
            const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(horizontal: 16),
                child: SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              ),
            )
          else
            TextButton(
              onPressed: _saveProfile,
              child: const Text(
                'Save',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            // Contact Section
            _buildSectionHeader('Contact Information'),
            const SizedBox(height: 16),
            TextFormField(
              controller: _mobileController,
              decoration: const InputDecoration(
                labelText: 'Mobile Number',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.phone),
              ),
              keyboardType: TextInputType.phone,
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Mobile number is required';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _cityController,
              decoration: const InputDecoration(
                labelText: 'City',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.location_city),
              ),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _stateController,
              decoration: const InputDecoration(
                labelText: 'State',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.map),
              ),
            ),

            const SizedBox(height: 32),

            // About Section
            _buildSectionHeader('About Me'),
            const SizedBox(height: 16),
            TextFormField(
              controller: _aboutMeController,
              decoration: const InputDecoration(
                labelText: 'About Me',
                border: OutlineInputBorder(),
                hintText: 'Tell us about yourself...',
              ),
              maxLines: 4,
              maxLength: 500,
            ),

            const SizedBox(height: 32),

            // Social Links Section
            _buildSectionHeader('Social Links'),
            const SizedBox(height: 16),
            TextFormField(
              controller: _linkedinController,
              decoration: const InputDecoration(
                labelText: 'LinkedIn URL',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.business_center),
                hintText: 'https://linkedin.com/in/yourprofile',
              ),
              keyboardType: TextInputType.url,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _githubController,
              decoration: const InputDecoration(
                labelText: 'GitHub URL',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.code),
                hintText: 'https://github.com/yourusername',
              ),
              keyboardType: TextInputType.url,
            ),

            const SizedBox(height: 32),

            // Note
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.blue.shade200),
              ),
              child: Row(
                children: [
                  Icon(Icons.info_outline, color: Colors.blue.shade700),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Academic details and documents can only be updated during onboarding or by contacting admin.',
                      style: TextStyle(
                        color: Colors.blue.shade900,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 18,
        fontWeight: FontWeight.bold,
        color: AppConstants.textPrimary,
      ),
    );
  }
}
