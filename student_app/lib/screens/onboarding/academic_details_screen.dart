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
  final _diplomaMarkController = TextEditingController();
  final _ugController = TextEditingController();
  final _pgController = TextEditingController();
  final _tenthYearController = TextEditingController();
  final _twelfthYearController = TextEditingController();
  final _diplomaYearController = TextEditingController();
  final _ugYearController = TextEditingController();
  final _pgYearController = TextEditingController();

  bool _isLoading = true;
  String _departmentType = 'UG';
  bool _isDiplomaStudent = false;

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
    if (state.diplomaMark != null && state.diplomaMark! > 0) {
      _diplomaMarkController.text = state.diplomaMark.toString();
    }
    _isDiplomaStudent = state.isDiplomaStudent;
    if (state.ugCgpa != null) {
      _ugController.text = state.ugCgpa.toString();
    }
    if (state.pgCgpa != null && state.pgCgpa! > 0) {
      _pgController.text = state.pgCgpa.toString();
    }
    if (state.tenthYearPass != null && state.tenthYearPass! > 0) {
      _tenthYearController.text = state.tenthYearPass.toString();
    }
    if (state.twelfthYearPass != null && state.twelfthYearPass! > 0) {
      _twelfthYearController.text = state.twelfthYearPass.toString();
    }
    if (state.diplomaYearPass != null && state.diplomaYearPass! > 0) {
      _diplomaYearController.text = state.diplomaYearPass.toString();
    }
    if (state.ugYearPass != null && state.ugYearPass! > 0) {
      _ugYearController.text = state.ugYearPass.toString();
    }
    if (state.pgYearPass != null && state.pgYearPass! > 0) {
      _pgYearController.text = state.pgYearPass.toString();
    }

    _loadProfile();
  }

  Future<void> _loadProfile() async {
    try {
      final profile = await ref.read(studentServiceProvider).getProfile();
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
    _diplomaMarkController.dispose();
    _ugController.dispose();
    _pgController.dispose();
    _tenthYearController.dispose();
    _twelfthYearController.dispose();
    _diplomaYearController.dispose();
    _ugYearController.dispose();
    _pgYearController.dispose();
    super.dispose();
  }

  void _next() {
    if (_formKey.currentState!.validate()) {
      // Dismiss keyboard to prevent overflow flash during navigation
      FocusScope.of(context).unfocus();

      final tenth = double.tryParse(_tenthMarkController.text) ?? 0.0;
      final twelfth = _isDiplomaStudent
          ? 0.0
          : (double.tryParse(_twelfthMarkController.text) ?? 0.0);
      final diploma = _isDiplomaStudent
          ? (double.tryParse(_diplomaMarkController.text) ?? 0.0)
          : 0.0;
      final ug = double.tryParse(_ugController.text) ?? 0.0;
      final pg = _departmentType == 'PG'
          ? double.tryParse(_pgController.text)
          : null;

      final tenthYear = int.tryParse(_tenthYearController.text);
      final twelfthYear = _isDiplomaStudent
          ? null
          : int.tryParse(_twelfthYearController.text);
      final diplomaYear = _isDiplomaStudent
          ? int.tryParse(_diplomaYearController.text)
          : null;
      final ugYear = int.tryParse(_ugYearController.text);
      final pgYear = _departmentType == 'PG'
          ? int.tryParse(_pgYearController.text)
          : null;

      ref
          .read(onboardingProvider.notifier)
          .updateAcademic(
            tenth,
            twelfth,
            ug,
            pg,
            diploma: diploma,
            isDiploma: _isDiplomaStudent,
            tenthYearPass: tenthYear,
            twelfthYearPass: twelfthYear,
            diplomaYearPass: diplomaYear,
            ugYearPass: ugYear,
            pgYearPass: pgYear,
          );
      context.go('/onboarding/address');
    }
  }

  InputDecoration _inputDecoration(
    String label,
    String hint,
    IconData icon, {
    String? suffixText,
  }) {
    return InputDecoration(
      labelText: label,
      hintText: hint,
      prefixIcon: Icon(icon),
      suffixText: suffixText ?? '%',
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

  Widget _yearField(TextEditingController controller, String label) {
    return TextFormField(
      controller: controller,
      keyboardType: TextInputType.number,
      inputFormatters: [
        FilteringTextInputFormatter.digitsOnly,
        LengthLimitingTextInputFormatter(4),
      ],
      decoration: _inputDecoration(
        label,
        '2024',
        Icons.calendar_today_outlined,
        suffixText: '',
      ),
      validator: (value) {
        if (value == null || value.isEmpty) return null; // optional
        final year = int.tryParse(value);
        if (year == null || year < 1990 || year > 2040) {
          return 'Enter valid year';
        }
        return null;
      },
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
                        value: 0.45,
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
                      const SizedBox(height: 12),
                      _yearField(_tenthYearController, '10th Year of Passing'),
                      const SizedBox(height: 16),
                      // 12th / Diploma Toggle
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              'I have a Diploma (instead of 12th)',
                              style: Theme.of(context).textTheme.bodyMedium
                                  ?.copyWith(fontWeight: FontWeight.w500),
                            ),
                          ),
                          Switch(
                            value: _isDiplomaStudent,
                            onChanged: (val) {
                              setState(() {
                                _isDiplomaStudent = val;
                              });
                            },
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      if (!_isDiplomaStudent) ...[
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
                            if (_isDiplomaStudent) return null;
                            if (value == null || value.isEmpty) {
                              return 'Required';
                            }
                            final num = double.tryParse(value);
                            if (num == null || num < 0 || num > 100) {
                              return 'Enter valid percentage';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 12),
                        _yearField(
                          _twelfthYearController,
                          '12th Year of Passing',
                        ),
                      ] else ...[
                        // Diploma
                        TextFormField(
                          controller: _diplomaMarkController,
                          keyboardType: const TextInputType.numberWithOptions(
                            decimal: true,
                          ),
                          inputFormatters: [
                            FilteringTextInputFormatter.allow(
                              RegExp(r'^\d*\.?\d{0,2}'),
                            ),
                          ],
                          decoration: _inputDecoration(
                            'Diploma Percentage',
                            '85.00',
                            Icons.engineering_outlined,
                          ),
                          validator: (value) {
                            if (!_isDiplomaStudent) return null;
                            if (value == null || value.isEmpty) {
                              return 'Required';
                            }
                            final num = double.tryParse(value);
                            if (num == null || num < 0 || num > 100) {
                              return 'Enter valid percentage';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 12),
                        _yearField(
                          _diplomaYearController,
                          'Diploma Year of Passing',
                        ),
                      ],
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
                      const SizedBox(height: 12),
                      _yearField(_ugYearController, 'UG Year of Passing'),
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
                        const SizedBox(height: 12),
                        _yearField(_pgYearController, 'PG Year of Passing'),
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
