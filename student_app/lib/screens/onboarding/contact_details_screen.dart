import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../providers/onboarding_provider.dart';
import '../../utils/constants.dart';
import '../../widgets/app_button.dart';

class ContactDetailsScreen extends ConsumerStatefulWidget {
  const ContactDetailsScreen({super.key});

  @override
  ConsumerState<ContactDetailsScreen> createState() =>
      _ContactDetailsScreenState();
}

class _ContactDetailsScreenState extends ConsumerState<ContactDetailsScreen> {
  final _formKey = GlobalKey<FormState>();
  final _mobileController = TextEditingController();
  final _linkedinController = TextEditingController();
  final _githubController = TextEditingController();

  @override
  void initState() {
    super.initState();
    // Initialize controllers with existing provider data
    final state = ref.read(onboardingProvider);
    _mobileController.text = state.mobileNumber ?? '';
    _linkedinController.text = state.socialLinks?['linkedin'] ?? '';
    _githubController.text = state.socialLinks?['github'] ?? '';
  }

  @override
  void dispose() {
    _mobileController.dispose();
    _linkedinController.dispose();
    _githubController.dispose();
    super.dispose();
  }

  void _next() {
    if (_formKey.currentState!.validate()) {
      // Dismiss keyboard to prevent overflow flash during navigation
      FocusScope.of(context).unfocus();

      ref
          .read(onboardingProvider.notifier)
          .updateContact(
            _mobileController.text,
            linkedin: _linkedinController.text,
            github: _githubController.text,
          );
      context.go('/onboarding/academic');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.go('/onboarding/basic-info'),
        ),
        title: const Text('Contact Details'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppConstants.spacingLarge),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Progress Indicator
                LinearProgressIndicator(
                  value: 0.30,
                  backgroundColor: Theme.of(context).dividerColor,
                  color: Theme.of(context).colorScheme.primary,
                  minHeight: 4,
                  borderRadius: BorderRadius.circular(2),
                ),
                const SizedBox(height: 32),
                Text(
                  'What\'s your mobile number?',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                    color:
                        (Theme.of(context).textTheme.bodyLarge?.color ??
                        Colors.black),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'We\'ll use this to contact you about placement updates.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color:
                        (Theme.of(context).textTheme.bodyMedium?.color ??
                        Colors.grey),
                  ),
                ),
                const SizedBox(height: 24),
                TextFormField(
                  controller: _mobileController,
                  keyboardType: TextInputType.phone,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(10),
                  ],
                  decoration: InputDecoration(
                    labelText: 'Mobile Number',
                    hintText: '9876543210',
                    prefixIcon: const Icon(Icons.phone_android_rounded),
                    prefixText: '+91 ',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(
                        AppConstants.borderRadius,
                      ),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(
                        AppConstants.borderRadius,
                      ),
                      borderSide: BorderSide(
                        color: Theme.of(context).dividerColor,
                      ),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(
                        AppConstants.borderRadius,
                      ),
                      borderSide: BorderSide(
                        color: Theme.of(context).colorScheme.primary,
                        width: 2,
                      ),
                    ),
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Please enter your mobile number';
                    }
                    if (value.length != 10) {
                      return 'Please enter a valid 10-digit number';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 24),
                Text(
                  'Social Profiles (Optional)',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color:
                        (Theme.of(context).textTheme.bodyLarge?.color ??
                        Colors.black),
                  ),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _linkedinController,
                  decoration: InputDecoration(
                    labelText: 'LinkedIn URL',
                    hintText: 'https://linkedin.com/in/...',
                    prefixIcon: const Icon(Icons.link),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(
                        AppConstants.borderRadius,
                      ),
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 12,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _githubController,
                  decoration: InputDecoration(
                    labelText: 'GitHub URL',
                    hintText: 'https://github.com/...',
                    prefixIcon: const Icon(Icons.code),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(
                        AppConstants.borderRadius,
                      ),
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 12,
                    ),
                  ),
                ),
                const SizedBox(height: 32),
                AppButton(label: 'Continue', onPressed: _next),
                const SizedBox(height: 16),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
