import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../providers/onboarding_provider.dart';
import '../../utils/constants.dart';
import '../../widgets/app_button.dart';

class AddressScreen extends ConsumerStatefulWidget {
  const AddressScreen({super.key});

  @override
  ConsumerState<AddressScreen> createState() => _AddressScreenState();
}

class _AddressScreenState extends ConsumerState<AddressScreen> {
  final _formKey = GlobalKey<FormState>();
  final _addressLine1Controller = TextEditingController();
  final _addressLine2Controller = TextEditingController();
  final _stateController = TextEditingController();
  final _dobController = TextEditingController();
  String? _selectedGender;

  @override
  void initState() {
    super.initState();
    // Initialize controllers with existing provider data
    final state = ref.read(onboardingProvider);
    _addressLine1Controller.text = state.addressLine1 ?? '';
    _addressLine2Controller.text = state.addressLine2 ?? '';
    _stateController.text = state.state ?? '';
    _dobController.text = state.dob ?? '';
    _selectedGender = state.gender;
  }

  @override
  void dispose() {
    _addressLine1Controller.dispose();
    _addressLine2Controller.dispose();
    _stateController.dispose();
    _dobController.dispose();
    super.dispose();
  }

  void _next() {
    if (_formKey.currentState!.validate()) {
      // Dismiss keyboard to prevent overflow flash during navigation
      FocusScope.of(context).unfocus();

      ref
          .read(onboardingProvider.notifier)
          .updatePersonal(
            _addressLine1Controller.text,
            _addressLine2Controller.text,
            _stateController.text,
            _dobController.text,
            _selectedGender!,
          );
      context.go('/onboarding/profile-pic');
    }
  }

  InputDecoration _inputDecoration(String label, IconData icon) {
    return InputDecoration(
      labelText: label,
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
          onPressed: () => context.go('/onboarding/academic'),
        ),
        title: const Text('Personal Details'),
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
                  value: 0.60,
                  backgroundColor: Theme.of(context).dividerColor,
                  color: Theme.of(context).colorScheme.primary,
                  minHeight: 4,
                  borderRadius: BorderRadius.circular(2),
                ),
                const SizedBox(height: 32),
                Text(
                  'About You',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                    color:
                        (Theme.of(context).textTheme.bodyLarge?.color ??
                        Colors.black),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Please provide your address and personal details.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color:
                        (Theme.of(context).textTheme.bodyMedium?.color ??
                        Colors.grey),
                  ),
                ),
                const SizedBox(height: 24),

                // DOB
                TextFormField(
                  controller: _dobController,
                  readOnly: true,
                  decoration: _inputDecoration(
                    'Date of Birth',
                    Icons.calendar_today_rounded,
                  ).copyWith(hintText: 'YYYY-MM-DD'),
                  onTap: () async {
                    final DateTime? picked = await showDatePicker(
                      context: context,
                      initialDate: DateTime.now().subtract(
                        const Duration(days: 365 * 18),
                      ),
                      firstDate: DateTime(1990),
                      lastDate: DateTime.now(),
                    );
                    if (picked != null) {
                      setState(() {
                        _dobController.text =
                            "${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}";
                      });
                    }
                  },
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Please select DOB';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),

                // Gender
                DropdownButtonFormField<String>(
                  initialValue: _selectedGender,
                  decoration: _inputDecoration('Gender', Icons.person_outline),
                  items: ['Male', 'Female', 'Other']
                      .map(
                        (label) =>
                            DropdownMenuItem(value: label, child: Text(label)),
                      )
                      .toList(),
                  onChanged: (value) => setState(() => _selectedGender = value),
                  validator: (value) => value == null ? 'Required' : null,
                ),
                const SizedBox(height: 16),

                // Address
                TextFormField(
                  controller: _addressLine1Controller,
                  maxLines: 2,
                  decoration: InputDecoration(
                    labelText: 'Address Line 1',
                    hintText: 'Door No, Street Name',
                    alignLabelWithHint: true,
                    prefixIcon: const Padding(
                      padding: EdgeInsets.only(bottom: 24),
                      child: Icon(Icons.home_outlined),
                    ),
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
                      return 'Please enter address line 1';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _addressLine2Controller,
                  maxLines: 2,
                  decoration: InputDecoration(
                    labelText: 'Address Line 2',
                    hintText: 'Area, Landmark (Optional)',
                    alignLabelWithHint: true,
                    prefixIcon: const Padding(
                      padding: EdgeInsets.only(bottom: 24),
                      child: Icon(Icons.location_on_outlined),
                    ),
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
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _stateController,
                  decoration: _inputDecoration('State', Icons.map_outlined),
                  validator: (value) {
                    if (value == null || value.isEmpty) return 'Required';
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
