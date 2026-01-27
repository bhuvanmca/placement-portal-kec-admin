import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../providers/onboarding_provider.dart';
import '../../utils/constants.dart';
import '../../widgets/app_button.dart';

class AcademicDetailsScreen extends ConsumerStatefulWidget {
  const AcademicDetailsScreen({super.key});

  @override
  ConsumerState<AcademicDetailsScreen> createState() =>
      _AcademicDetailsScreenState();
}

class _AcademicDetailsScreenState extends ConsumerState<AcademicDetailsScreen> {
  final _formKey = GlobalKey<FormState>();
  final _tenthMarkController = TextEditingController();
  final _twelfthMarkController = TextEditingController();
  final _ugController = TextEditingController();
  final _pgController = TextEditingController();
  bool _isPGStudent = false;

  @override
  void dispose() {
    _tenthMarkController.dispose();
    _twelfthMarkController.dispose();
    _ugController.dispose();
    _pgController.dispose();
    super.dispose();
  }

  void _next() {
    if (_formKey.currentState!.validate()) {
      final tenth = double.tryParse(_tenthMarkController.text) ?? 0.0;
      final twelfth = double.tryParse(_twelfthMarkController.text) ?? 0.0;
      final ug = double.tryParse(_ugController.text) ?? 0.0;
      final pg = _isPGStudent ? double.tryParse(_pgController.text) : null;

      ref
          .read(onboardingProvider.notifier)
          .updateAcademic(tenth, twelfth, ug, pg);
      context.go('/onboarding/address');
    }
  }

  InputDecoration _inputDecoration(String label, String hint, IconData icon) {
    return InputDecoration(
      labelText: label,
      hintText: hint,
      prefixIcon: Icon(icon),
      suffixText: '%',
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppConstants.borderRadius),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppConstants.borderRadius),
        borderSide: const BorderSide(color: AppConstants.borderColor),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppConstants.borderRadius),
        borderSide: const BorderSide(
          color: AppConstants.primaryColor,
          width: 2,
        ),
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
          onPressed: () => context.go('/onboarding/contact'),
        ),
        title: const Text('Academic Details'),
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
                  value: 0.5,
                  backgroundColor: AppConstants.borderColor,
                  color: AppConstants.primaryColor,
                  minHeight: 4,
                  borderRadius: BorderRadius.circular(2),
                ),
                const SizedBox(height: 32),
                Text(
                  'Your Academic Scores',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AppConstants.textPrimary,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Enter your percentage marks for eligibility verification.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppConstants.textSecondary,
                  ),
                ),
                const SizedBox(height: 24),
                // 10th
                TextFormField(
                  controller: _tenthMarkController,
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(
                      RegExp(r'^\d*\.?\d{0,2}'),
                    ),
                  ],
                  decoration: _inputDecoration(
                    '10th Percentage',
                    '85.50',
                    Icons.school_outlined,
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) return 'Required';
                    final num = double.tryParse(value);
                    if (num == null || num < 0 || num > 100) {
                      return 'Enter valid percentage';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                // 12th
                TextFormField(
                  controller: _twelfthMarkController,
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(
                      RegExp(r'^\d*\.?\d{0,2}'),
                    ),
                  ],
                  decoration: _inputDecoration(
                    '12th Percentage',
                    '90.00',
                    Icons.school_outlined,
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) return 'Required';
                    final num = double.tryParse(value);
                    if (num == null || num < 0 || num > 100) {
                      return 'Enter valid percentage';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),

                // Switch
                SwitchListTile(
                  value: _isPGStudent,
                  onChanged: (val) => setState(() => _isPGStudent = val),
                  title: const Text('Are you a PG student?'),
                  subtitle: const Text(
                    'If yes, enter your UG percentage below',
                  ),
                  activeThumbColor: AppConstants.primaryColor,
                  contentPadding: EdgeInsets.zero,
                ),
                const SizedBox(height: 16),

                // UG Field
                TextFormField(
                  controller: _ugController,
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(
                      RegExp(r'^\d*\.?\d{0,2}'),
                    ),
                  ],
                  // If PG, we ask for UG %. If UG, we ask for Current CGPA.
                  // Wait, design choice:
                  // "If yes (PG), enter your UG percentage below" -> subtitle
                  // So if PG is true, this field is UG Percentage.
                  // If PG is false, this field is 'Current CGPA'.
                  decoration: _inputDecoration(
                    _isPGStudent ? 'UG CGPA / Percentage' : 'Current CGPA',
                    '8.5',
                    Icons.workspace_premium_outlined,
                  ).copyWith(suffixText: ''),
                  validator: (value) {
                    if (value == null || value.isEmpty) return 'Required';
                    final num = double.tryParse(value);
                    if (num == null || num < 0 || num > 100) {
                      return 'Enter valid value'; // Allow % up to 100
                    }
                    return null;
                  },
                ),

                // PG Field (Hidden unless PG)
                if (_isPGStudent) ...[
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _pgController,
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                    inputFormatters: [
                      FilteringTextInputFormatter.allow(
                        RegExp(r'^\d*\.?\d{0,2}'),
                      ),
                    ],
                    decoration: _inputDecoration(
                      'Current PG CGPA',
                      '8.5',
                      Icons.school,
                    ).copyWith(suffixText: ''),
                    validator: (value) {
                      if (!_isPGStudent) return null;
                      if (value == null || value.isEmpty) return 'Required';
                      final num = double.tryParse(value);
                      if (num == null || num < 0 || num > 10) {
                        return 'Enter valid CGPA (0-10)';
                      }
                      return null;
                    },
                  ),
                ],

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
