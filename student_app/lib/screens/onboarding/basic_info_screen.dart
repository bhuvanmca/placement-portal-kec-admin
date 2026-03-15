import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../providers/onboarding_provider.dart';
import '../../utils/constants.dart';
import '../../widgets/app_button.dart';

class BasicInfoScreen extends ConsumerStatefulWidget {
  const BasicInfoScreen({super.key});

  @override
  ConsumerState<BasicInfoScreen> createState() => _BasicInfoScreenState();
}

class _BasicInfoScreenState extends ConsumerState<BasicInfoScreen> {
  final _formKey = GlobalKey<FormState>();
  final _firstNameController = TextEditingController();
  final _middleNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _fatherNameController = TextEditingController();
  final _motherNameController = TextEditingController();

  @override
  void initState() {
    super.initState();
    final state = ref.read(onboardingProvider);
    _firstNameController.text = state.firstName ?? '';
    _middleNameController.text = state.middleName ?? '';
    _lastNameController.text = state.lastName ?? '';
    _fatherNameController.text = state.fatherName ?? '';
    _motherNameController.text = state.motherName ?? '';
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _middleNameController.dispose();
    _lastNameController.dispose();
    _fatherNameController.dispose();
    _motherNameController.dispose();
    super.dispose();
  }

  void _next() {
    if (_formKey.currentState!.validate()) {
      FocusScope.of(context).unfocus();
      ref
          .read(onboardingProvider.notifier)
          .updateBasicInfo(
            firstName: _firstNameController.text.trim(),
            middleName: _middleNameController.text.trim().isEmpty
                ? null
                : _middleNameController.text.trim(),
            lastName: _lastNameController.text.trim(),
            fatherName: _fatherNameController.text.trim(),
            motherName: _motherNameController.text.trim(),
          );
      context.go('/onboarding/contact');
    }
  }

  InputDecoration _inputDecoration(
    String label,
    IconData icon, {
    String? hint,
  }) {
    return InputDecoration(
      labelText: label,
      hintText: hint,
      prefixIcon: Icon(icon),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppConstants.borderRadius),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppConstants.borderRadius),
        borderSide: BorderSide(color: Theme.of(context).dividerColor),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppConstants.borderRadius),
        borderSide: BorderSide(
          color: Theme.of(context).colorScheme.primary,
          width: 2,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.go('/onboarding/welcome'),
        ),
        title: const Text('Basic Information'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppConstants.spacingLarge),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                LinearProgressIndicator(
                  value: 0.15,
                  backgroundColor: Theme.of(context).dividerColor,
                  color: Theme.of(context).colorScheme.primary,
                  minHeight: 4,
                  borderRadius: BorderRadius.circular(2),
                ),
                const SizedBox(height: 32),
                Text(
                  'Tell us about yourself',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                    color:
                        (Theme.of(context).textTheme.bodyLarge?.color ??
                        Colors.black),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Enter your name and family details as per official records.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color:
                        (Theme.of(context).textTheme.bodyMedium?.color ??
                        Colors.grey),
                  ),
                ),
                const SizedBox(height: 24),

                // First Name
                TextFormField(
                  controller: _firstNameController,
                  textCapitalization: TextCapitalization.words,
                  decoration: _inputDecoration(
                    'First Name *',
                    Icons.person_outline,
                    hint: 'e.g. Rahul',
                  ),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'First name is required';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),

                // Middle Name
                TextFormField(
                  controller: _middleNameController,
                  textCapitalization: TextCapitalization.words,
                  decoration: _inputDecoration(
                    'Middle Name',
                    Icons.person_outline,
                    hint: 'Optional',
                  ),
                ),
                const SizedBox(height: 16),

                // Last Name
                TextFormField(
                  controller: _lastNameController,
                  textCapitalization: TextCapitalization.words,
                  decoration: _inputDecoration(
                    'Last Name *',
                    Icons.person_outline,
                    hint: 'e.g. Kumar',
                  ),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Last name is required';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 32),

                // Family Details Section
                Text(
                  'Family Details',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color:
                        (Theme.of(context).textTheme.bodyLarge?.color ??
                        Colors.black),
                  ),
                ),
                const SizedBox(height: 16),

                // Father's Name
                TextFormField(
                  controller: _fatherNameController,
                  textCapitalization: TextCapitalization.words,
                  decoration: _inputDecoration(
                    "Father's Name *",
                    Icons.family_restroom,
                    hint: 'As per official records',
                  ),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return "Father's name is required";
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),

                // Mother's Name
                TextFormField(
                  controller: _motherNameController,
                  textCapitalization: TextCapitalization.words,
                  decoration: _inputDecoration(
                    "Mother's Name *",
                    Icons.family_restroom,
                    hint: 'As per official records',
                  ),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return "Mother's name is required";
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 48),

                AppButton(label: 'Continue', onPressed: _next),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
