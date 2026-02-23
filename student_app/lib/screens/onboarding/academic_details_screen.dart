import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../providers/onboarding_provider.dart';
import '../../services/student_service.dart';
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

  bool _isLoading = true;
  String _departmentType = 'UG';

  @override
  void initState() {
    super.initState();
    // Initialize controllers with existing provider data
    final state = ref.read(onboardingProvider);
    if (state.tenthMark != null) {
      _tenthMarkController.text = state.tenthMark.toString();
    }
    if (state.twelfthMark != null) {
      _twelfthMarkController.text = state.twelfthMark.toString();
    }
    if (state.ugCgpa != null) {
      _ugController.text = state.ugCgpa.toString();
    }
    if (state.pgCgpa != null && state.pgCgpa! > 0) {
      _pgController.text = state.pgCgpa.toString();
    }

    _loadProfile();
  }

  Future<void> _loadProfile() async {
    try {
      final profile = await StudentService().getProfile();
      if (mounted) {
        setState(() {
          _departmentType = profile['department_type'] ?? 'UG';
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

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
      // Dismiss keyboard to prevent overflow flash during navigation
      FocusScope.of(context).unfocus();

      final tenth = double.tryParse(_tenthMarkController.text) ?? 0.0;
      final twelfth = double.tryParse(_twelfthMarkController.text) ?? 0.0;
      final ug = double.tryParse(_ugController.text) ?? 0.0;
      final pg = _departmentType == 'PG'
          ? double.tryParse(_pgController.text)
          : null;

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
          onPressed: () => context.go('/onboarding/contact'),
        ),
        title: const Text('Academic Details'),
      ),
      body: SafeArea(
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : SingleChildScrollView(
                padding: const EdgeInsets.all(AppConstants.spacingLarge),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      LinearProgressIndicator(
                        value: 0.5,
                        backgroundColor: Theme.of(context).dividerColor,
                        color: Theme.of(context).colorScheme.primary,
                        minHeight: 4,
                        borderRadius: BorderRadius.circular(2),
                      ),
                      const SizedBox(height: 32),
                      Text(
                        'Your Academic Scores',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                          color:
                              (Theme.of(context).textTheme.bodyLarge?.color ??
                              Colors.black),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Enter your percentage marks for eligibility verification.',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color:
                              (Theme.of(context).textTheme.bodyMedium?.color ??
                              Colors.grey),
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
                      const SizedBox(height: 24),
                      Text(
                        'UG Degree CGPA',
                        style: Theme.of(context).textTheme.titleMedium
                            ?.copyWith(
                              fontWeight: FontWeight.bold,
                              color:
                                  (Theme.of(
                                    context,
                                  ).textTheme.bodyMedium?.color ??
                                  Colors.black),
                            ),
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _ugController,
                        validator: (v) {
                          if (v == null || v.isEmpty) {
                            return 'Please enter UG CGPA';
                          }
                          final val = double.tryParse(v);
                          if (val == null || val > 10.0 || val < 0) {
                            return 'Invalid CGPA (max 10.0)';
                          }
                          return null;
                        },
                        keyboardType: const TextInputType.numberWithOptions(
                          decimal: true,
                        ),
                        inputFormatters: [
                          FilteringTextInputFormatter.allow(
                            RegExp(r'^\d*\.?\d{0,2}'),
                          ),
                        ],
                        decoration: _inputDecoration(
                          'UG Degree CGPA',
                          '8.50',
                          Icons.school_outlined,
                        ).copyWith(suffixText: 'CGPA'),
                      ),
                      const SizedBox(height: 24),

                      if (_departmentType == 'PG') ...[
                        Text(
                          'PG Degree CGPA',
                          style: Theme.of(context).textTheme.titleMedium
                              ?.copyWith(
                                fontWeight: FontWeight.bold,
                                color:
                                    (Theme.of(
                                      context,
                                    ).textTheme.bodyMedium?.color ??
                                    Colors.black),
                              ),
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _pgController,
                          validator: (v) {
                            if (v == null || v.isEmpty) {
                              return 'Please enter PG CGPA';
                            }
                            final val = double.tryParse(v);
                            if (val == null || val > 10.0 || val < 0) {
                              return 'Invalid CGPA (max 10.0)';
                            }
                            return null;
                          },
                          keyboardType: const TextInputType.numberWithOptions(
                            decimal: true,
                          ),
                          inputFormatters: [
                            FilteringTextInputFormatter.allow(
                              RegExp(r'^\d*\.?\d{0,2}'),
                            ),
                          ],
                          decoration: _inputDecoration(
                            'PG Degree CGPA',
                            '8.50',
                            Icons.school,
                          ).copyWith(suffixText: 'CGPA'),
                        ),
                        const SizedBox(height: 24),
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
