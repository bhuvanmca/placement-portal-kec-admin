import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import '../services/student_service.dart';
import '../utils/constants.dart';

class EditProfileScreen extends StatefulWidget {
  final Map<String, dynamic> profileData;

  const EditProfileScreen({super.key, required this.profileData});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final StudentService _studentService = StudentService();
  bool _isLoading = false;

  // Tabs
  int _selectedTabIndex = 0;
  final List<String> _tabs = ['Personal', 'Academic', 'Identity & Docs'];

  // --- Controllers ---
  // Personal
  final _mobileController = TextEditingController();
  final _dobController = TextEditingController(); // YYYY-MM-DD
  final _addressLine1Controller = TextEditingController();
  final _addressLine2Controller = TextEditingController();
  final _stateController = TextEditingController();
  // About Me Removed
  final _linkedinController = TextEditingController();
  final _githubController = TextEditingController();
  final _leetcodeController = TextEditingController();
  List<String> _languageSkills = [];
  final _languageInputController = TextEditingController(); // [NEW]

  // Identity
  final _panNumberController = TextEditingController();
  final _aadharNumberController = TextEditingController();

  // Academic - 10th
  final _tenthMarkController = TextEditingController();
  final _tenthBoardController = TextEditingController();
  final _tenthInstitutionController = TextEditingController();

  // Academic - 12th
  final _twelfthMarkController = TextEditingController();
  final _twelfthBoardController = TextEditingController();
  final _twelfthInstitutionController = TextEditingController();

  // Academic - Diploma
  final _diplomaMarkController = TextEditingController();
  final _diplomaInstitutionController = TextEditingController();

  // Academic - UG
  final _ugCgpaController = TextEditingController();
  final List<TextEditingController> _ugSemControllers = List.generate(
    10,
    (_) => TextEditingController(),
  );

  // Academic - PG
  final _pgCgpaController = TextEditingController();
  final List<TextEditingController> _pgSemControllers = List.generate(
    8,
    (_) => TextEditingController(),
  );

  // Backlogs
  final _currentBacklogsController = TextEditingController();
  final _historyBacklogsController = TextEditingController();
  final _gapYearsController = TextEditingController();
  final _gapReasonController = TextEditingController();

  // Documents (URLs stored for display)
  String? _resumeUrl;
  DateTime? _resumeUpdatedAt;

  String? _selectedGender;

  @override
  void initState() {
    super.initState();
    _initializeFields();
  }

  void _initializeFields() {
    final data = widget.profileData;

    // Personal
    _mobileController.text = (data['mobile_number'] ?? '').toString();
    _dobController.text = (data['dob'] ?? '').toString();
    _addressLine1Controller.text = (data['address_line_1'] ?? '').toString();
    _addressLine2Controller.text = (data['address_line_2'] ?? '').toString();
    _stateController.text = (data['state'] ?? '').toString();
    // About Me Removed
    _selectedGender = data['gender'];
    if (data['language_skills'] != null) {
      _languageSkills = List<String>.from(data['language_skills']);
    }

    final social = data['social_links'] as Map<String, dynamic>? ?? {};
    _linkedinController.text = (social['linkedin'] ?? '').toString();
    _githubController.text = (social['github'] ?? '').toString();
    _leetcodeController.text = (social['leetcode'] ?? '').toString();

    // Identity
    _panNumberController.text = (data['pan_number'] ?? '').toString();
    _aadharNumberController.text = (data['aadhar_number'] ?? '').toString();

    // 10th
    _tenthMarkController.text = (data['tenth_mark'] ?? '').toString();
    _tenthBoardController.text = (data['tenth_board'] ?? '').toString();
    _tenthInstitutionController.text = (data['tenth_institution'] ?? '')
        .toString();

    // 12th
    _twelfthMarkController.text = (data['twelfth_mark'] ?? '').toString();
    _twelfthBoardController.text = (data['twelfth_board'] ?? '').toString();
    _twelfthInstitutionController.text = (data['twelfth_institution'] ?? '')
        .toString();

    // Diploma
    _diplomaMarkController.text = (data['diploma_mark'] ?? '').toString();
    _diplomaInstitutionController.text = (data['diploma_institution'] ?? '')
        .toString();

    // UG
    _ugCgpaController.text = (data['ug_cgpa'] ?? '').toString();
    _ugSemControllers[0].text = (data['ug_gpa_s1'] ?? '').toString();
    _ugSemControllers[1].text = (data['ug_gpa_s2'] ?? '').toString();
    _ugSemControllers[2].text = (data['ug_gpa_s3'] ?? '').toString();
    _ugSemControllers[3].text = (data['ug_gpa_s4'] ?? '').toString();
    _ugSemControllers[4].text = (data['ug_gpa_s5'] ?? '').toString();
    _ugSemControllers[5].text = (data['ug_gpa_s6'] ?? '').toString();
    _ugSemControllers[6].text = (data['ug_gpa_s7'] ?? '').toString();
    _ugSemControllers[7].text = (data['ug_gpa_s8'] ?? '').toString();
    _ugSemControllers[8].text = (data['ug_gpa_s9'] ?? '').toString();
    _ugSemControllers[9].text = (data['ug_gpa_s10'] ?? '').toString();

    // PG
    _pgCgpaController.text = (data['pg_cgpa'] ?? '').toString();
    _pgCgpaController.text = (data['pg_cgpa'] ?? '').toString();
    _pgSemControllers[0].text = (data['pg_gpa_s1'] ?? '').toString();
    _pgSemControllers[1].text = (data['pg_gpa_s2'] ?? '').toString();
    _pgSemControllers[2].text = (data['pg_gpa_s3'] ?? '').toString();
    _pgSemControllers[3].text = (data['pg_gpa_s4'] ?? '').toString();
    _pgSemControllers[4].text = (data['pg_gpa_s5'] ?? '').toString();
    _pgSemControllers[5].text = (data['pg_gpa_s6'] ?? '').toString();
    _pgSemControllers[6].text = (data['pg_gpa_s7'] ?? '').toString();
    _pgSemControllers[7].text = (data['pg_gpa_s8'] ?? '').toString();

    // Backlogs
    _currentBacklogsController.text = (data['current_backlogs'] ?? '')
        .toString();
    _historyBacklogsController.text = (data['history_of_backlogs'] ?? '')
        .toString();
    _gapYearsController.text = (data['gap_years'] ?? '').toString();
    _gapReasonController.text = (data['gap_reason'] ?? '').toString();

    // Documents
    _resumeUrl = data['resume_url'];
    _resumeUpdatedAt = data['resume_updated_at'] != null
        ? DateTime.parse(data['resume_updated_at'])
        : null;
  }

  @override
  void dispose() {
    _mobileController.dispose();
    _dobController.dispose();
    _addressLine1Controller.dispose();
    _addressLine2Controller.dispose();
    _stateController.dispose();
    // About Me disposed removed
    _languageInputController.dispose(); // [NEW]
    _panNumberController.dispose();
    _aadharNumberController.dispose();
    _linkedinController.dispose();
    _githubController.dispose();
    _leetcodeController.dispose();
    _tenthMarkController.dispose();
    _tenthBoardController.dispose();
    _tenthInstitutionController.dispose();
    _twelfthMarkController.dispose();
    _twelfthBoardController.dispose();
    _twelfthInstitutionController.dispose();
    _diplomaMarkController.dispose();
    _diplomaInstitutionController.dispose();
    _ugCgpaController.dispose();
    for (var c in _ugSemControllers) {
      c.dispose();
    }
    _pgCgpaController.dispose();
    for (var c in _pgSemControllers) {
      c.dispose();
    }
    _currentBacklogsController.dispose();
    _historyBacklogsController.dispose();
    _gapYearsController.dispose();
    _gapReasonController.dispose();
    super.dispose();
  }

  // --- Actions ---

  Future<void> _pickAndUpload(String docType) async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png'],
      );

      if (result != null && result.files.single.path != null) {
        setState(() => _isLoading = true);
        final url = await _studentService.uploadFile(
          result.files.single.path!,
          docType,
        );

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Document uploaded successfully')),
          );
          // Update local state to reflect change immediately
          setState(() {
            _isLoading = false;
            final now = DateTime.now();
            if (docType == 'resume') {
              _resumeUrl = url;
              _resumeUpdatedAt = now;
            }
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Upload failed: $e')));
      }
    }
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please check for errors in the form')),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      // Build update payload
      final Map<String, dynamic> updateData = {
        'mobile_number': _mobileController.text,
        'dob': _dobController.text,
        'gender': _selectedGender,
        'address_line_1': _addressLine1Controller.text,
        'address_line_2': _addressLine2Controller.text,
        'state': _stateController.text,
        // 'about_me': _aboutMeController.text, // REMOVED
        'language_skills': _languageSkills,
        'social_links': {
          'linkedin': _linkedinController.text,
          'github': _githubController.text,
          'leetcode': _leetcodeController.text,
        },
        'pan_number': _panNumberController.text,
        'aadhar_number': _aadharNumberController.text,
        'tenth_mark': double.tryParse(_tenthMarkController.text) ?? 0.0,
        'tenth_board': _tenthBoardController.text,
        'tenth_institution': _tenthInstitutionController.text,
        'twelfth_mark': double.tryParse(_twelfthMarkController.text) ?? 0.0,
        'twelfth_board': _twelfthBoardController.text,
        'twelfth_institution': _twelfthInstitutionController.text,
        'diploma_mark': double.tryParse(_diplomaMarkController.text) ?? 0.0,
        'diploma_institution': _diplomaInstitutionController.text,
        'ug_cgpa': double.tryParse(_ugCgpaController.text) ?? 0.0,
        'ug_gpa_s1': double.tryParse(_ugSemControllers[0].text) ?? 0.0,
        'ug_gpa_s2': double.tryParse(_ugSemControllers[1].text) ?? 0.0,
        'ug_gpa_s3': double.tryParse(_ugSemControllers[2].text) ?? 0.0,
        'ug_gpa_s4': double.tryParse(_ugSemControllers[3].text) ?? 0.0,
        'ug_gpa_s5': double.tryParse(_ugSemControllers[4].text) ?? 0.0,
        'ug_gpa_s6': double.tryParse(_ugSemControllers[5].text) ?? 0.0,
        'ug_gpa_s7': double.tryParse(_ugSemControllers[6].text) ?? 0.0,
        'ug_gpa_s8': double.tryParse(_ugSemControllers[7].text) ?? 0.0,
        'ug_gpa_s9': double.tryParse(_ugSemControllers[8].text) ?? 0.0,
        'ug_gpa_s10': double.tryParse(_ugSemControllers[9].text) ?? 0.0,
        'pg_cgpa': double.tryParse(_pgCgpaController.text) ?? 0.0,
        'pg_gpa_s1': double.tryParse(_pgSemControllers[0].text) ?? 0.0,
        'pg_gpa_s2': double.tryParse(_pgSemControllers[1].text) ?? 0.0,
        'pg_gpa_s3': double.tryParse(_pgSemControllers[2].text) ?? 0.0,
        'pg_gpa_s4': double.tryParse(_pgSemControllers[3].text) ?? 0.0,
        'pg_gpa_s5': double.tryParse(_pgSemControllers[4].text) ?? 0.0,
        'pg_gpa_s6': double.tryParse(_pgSemControllers[5].text) ?? 0.0,
        'pg_gpa_s7': double.tryParse(_pgSemControllers[6].text) ?? 0.0,
        'pg_gpa_s8': double.tryParse(_pgSemControllers[7].text) ?? 0.0,
        'current_backlogs': int.tryParse(_currentBacklogsController.text) ?? 0,
        'history_of_backlogs':
            int.tryParse(_historyBacklogsController.text) ?? 0,
        'gap_years': int.tryParse(_gapYearsController.text) ?? 0,
        'gap_reason': _gapReasonController.text,
      };

      final response = await _studentService.updateProfile(updateData);

      if (mounted) {
        final message = response['message'] ?? 'Profile updated successfully';
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(message)));
        Navigator.of(context).pop(true); // Return and refresh
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Update failed: $e')));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // --- UI Helpers ---

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    TextInputType type = TextInputType.text,
    bool required = false,
    int maxLines = 1,
    Widget? prefixIcon,
    VoidCallback? onSubmitted, // [NEW] optional callback for enter key
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: TextFormField(
        controller: controller,
        keyboardType: type,
        maxLines: maxLines,
        textInputAction: onSubmitted != null ? TextInputAction.done : null,
        onFieldSubmitted: onSubmitted != null ? (_) => onSubmitted() : null,
        validator: required
            ? (val) => val == null || val.isEmpty ? '$label is required' : null
            : null,
        decoration: InputDecoration(
          labelText: label,
          prefixIcon: prefixIcon,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppConstants.borderRadius),
          ),
          filled: true,
          fillColor: Theme.of(context).cardColor,
          isDense: true,
        ),
      ),
    );
  }

  // ... (buildDatePicker, buildDropdown, buildSectionTabs - reuse existing if possible, but I am in replace block)
  // I must include them if they are in the range I selected (Lines 22-600 covers almost everything).

  // ... (Skipping to _buildPersonalTab)

  Widget _buildDatePicker(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: TextFormField(
        controller: _dobController,
        readOnly: true,
        decoration: InputDecoration(
          labelText: 'Date of Birth (YYYY-MM-DD)',
          suffixIcon: const Icon(Icons.calendar_today),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppConstants.borderRadius),
          ),
          filled: true,
          fillColor: Theme.of(context).cardColor,
        ),
        onTap: () async {
          final DateTime? picked = await showDatePicker(
            context: context,
            initialDate: DateTime.now().subtract(const Duration(days: 6570)),
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
      ),
    );
  }

  Widget _buildDropdown(
    String label,
    List<String> items,
    String? value,
    ValueChanged<String?> onChanged,
  ) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: DropdownButtonFormField<String>(
        initialValue: items.contains(value) ? value : null,
        decoration: InputDecoration(
          labelText: label,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppConstants.borderRadius),
          ),
          filled: true,
          fillColor: Theme.of(context).cardColor,
        ),
        items: items
            .map((e) => DropdownMenuItem(value: e, child: Text(e)))
            .toList(),
        onChanged: onChanged,
      ),
    );
  }

  Widget _buildSectionTabs() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: List.generate(_tabs.length, (index) {
          final isSelected = _selectedTabIndex == index;
          return Padding(
            padding: const EdgeInsets.only(right: 12),
            child: GestureDetector(
              onTap: () {
                // HapticFeedback.selectionClick();
                setState(() {
                  _selectedTabIndex = index;
                });
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 300),
                curve: Curves.easeInOut,
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 8,
                ),
                decoration: BoxDecoration(
                  color: isSelected
                      ? Theme.of(context).colorScheme.primary
                      : (Theme.of(context).brightness == Brightness.dark
                            ? Colors.grey[800]
                            : Colors.grey[200]),
                  borderRadius: BorderRadius.circular(isSelected ? 20 : 10),
                ),
                child: Text(
                  _tabs[index],
                  style: TextStyle(
                    color: isSelected
                        ? (Theme.of(context).brightness == Brightness.dark
                              ? Colors.black
                              : Colors.white)
                        : (Theme.of(context).brightness == Brightness.dark
                              ? Colors.white
                              : Colors.black),
                    fontWeight: isSelected
                        ? FontWeight.bold
                        : FontWeight.normal,
                  ),
                ),
              ),
            ),
          );
        }),
      ),
    );
  }

  // --- Screens ---

  Widget _buildPersonalTab() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Identity (Read Only)
        Container(
          padding: const EdgeInsets.all(16),
          margin: const EdgeInsets.only(bottom: 24),
          decoration: BoxDecoration(
            color: Theme.of(context).brightness == Brightness.dark
                ? Colors.blue.shade900.withValues(alpha: 0.3)
                : Colors.blue.shade50,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: Theme.of(context).brightness == Brightness.dark
                  ? Colors.blue.shade900
                  : Colors.blue.shade100,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                widget.profileData['full_name'] ?? 'N/A',
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 18,
                  color: Color(0xFF0D47A1),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                '${widget.profileData['register_number']} | ${widget.profileData['department']}',
                style: TextStyle(color: Colors.blue.shade900),
              ),
              const SizedBox(height: 4),
              Text(
                'Email: ${widget.profileData['email']}',
                style: TextStyle(color: Colors.blue.shade900),
              ),
            ],
          ),
        ),

        _buildTextField(
          controller: _mobileController,
          label: 'Mobile Number',
          type: TextInputType.phone,
          required: true,
        ),
        _buildDatePicker(context),
        _buildDropdown(
          'Gender',
          ['Male', 'Female', 'Other'],
          _selectedGender,
          (val) => setState(() => _selectedGender = val),
        ),
        _buildTextField(
          controller: _addressLine1Controller,
          label: 'Address Line 1',
        ),
        Row(
          children: [
            Expanded(
              child: _buildTextField(
                controller: _addressLine2Controller,
                label: 'Address Line 2 (Optional)',
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: _buildTextField(
                controller: _stateController,
                label: 'State',
              ),
            ),
          ],
        ),

        // About Me Removed

        // Language Skills
        const SizedBox(height: 16),
        const Text(
          "Language Skills",
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: _buildTextField(
                controller: _languageInputController,
                label: 'Add Language (e.g. English)',
                onSubmitted: _addLanguage,
              ),
            ),
            const SizedBox(width: 12),
            IconButton(
              onPressed: _addLanguage,
              icon: Icon(
                Icons.add_circle,
                size: 32,
                color: Theme.of(context).colorScheme.primary,
              ),
              tooltip: 'Add Language',
            ),
          ],
        ),
        if (_languageSkills.isNotEmpty)
          Wrap(
            spacing: 8,
            children: _languageSkills
                .map(
                  (lang) => Chip(
                    label: Text(lang),
                    onDeleted: () {
                      setState(() {
                        _languageSkills.remove(lang);
                      });
                    },
                  ),
                )
                .toList(),
          ),

        const SizedBox(height: 24),
        const Text(
          "Social Links",
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
        ),
        const SizedBox(height: 16),
        _buildTextField(
          controller: _linkedinController,
          label: 'LinkedIn URL',
          type: TextInputType.url,
          prefixIcon: const Padding(
            padding: EdgeInsets.all(12),
            child: FaIcon(
              FontAwesomeIcons.linkedin,
              color: Color(0xFF0077B5),
              size: 20,
            ),
          ),
        ),
        _buildTextField(
          controller: _githubController,
          label: 'GitHub URL',
          type: TextInputType.url,
          prefixIcon: const Padding(
            padding: EdgeInsets.all(12),
            child: FaIcon(FontAwesomeIcons.github, size: 20),
          ),
        ),
        _buildTextField(
          controller: _leetcodeController,
          label: 'LeetCode URL',
          type: TextInputType.url,
          prefixIcon: const Padding(
            padding: EdgeInsets.all(12),
            child: FaIcon(
              FontAwesomeIcons.code,
              color: Color(0xFFFFA116),
              size: 20,
            ),
          ),
        ),
      ],
    );
  }

  void _addLanguage() {
    final text = _languageInputController.text.trim();
    if (text.isNotEmpty && !_languageSkills.contains(text)) {
      setState(() {
        _languageSkills.add(text);
        _languageInputController.clear();
      });
    } else if (text.isNotEmpty) {
      _languageInputController.clear(); // Clear info if duplicate
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Language already added')));
    }
  }

  Widget _buildSectionContainer(String title, List<Widget> children) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 24),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Theme.of(context).dividerColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color:
                  (Theme.of(context).textTheme.bodyLarge?.color ??
                  Colors.black),
            ),
          ),
          const SizedBox(height: 16),
          ...children,
        ],
      ),
    );
  }

  Widget _buildAcademicTab() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 10th
        _buildSectionContainer("10th Standard", [
          _buildTextField(
            controller: _tenthMarkController,
            label: 'Percentage (%)',
            type: TextInputType.number,
          ),
          _buildTextField(controller: _tenthBoardController, label: 'Board'),
          _buildTextField(
            controller: _tenthInstitutionController,
            label: 'Institution',
          ),
        ]),

        // 12th
        _buildSectionContainer("12th Standard", [
          _buildTextField(
            controller: _twelfthMarkController,
            label: 'Percentage (%)',
            type: TextInputType.number,
          ),
          _buildTextField(controller: _twelfthBoardController, label: 'Board'),
          _buildTextField(
            controller: _twelfthInstitutionController,
            label: 'Institution',
          ),
        ]),

        // Diploma
        _buildSectionContainer("Diploma (If applicable)", [
          _buildTextField(
            controller: _diplomaMarkController,
            label: 'Percentage (%)',
            type: TextInputType.number,
          ),
          _buildTextField(
            controller: _diplomaInstitutionController,
            label: 'Institution',
          ),
        ]),

        // UG
        _buildSectionContainer("Undergraduate (UG)", [
          _buildTextField(
            controller: _ugCgpaController,
            label: 'Overall CGPA',
            type: TextInputType.number,
          ),
          const SizedBox(height: 8),
          const Text(
            "Semester GPAs (S1-S8)",
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: List.generate(_ugSemControllers.length, (index) {
              return SizedBox(
                width: 80,
                child: TextFormField(
                  controller: _ugSemControllers[index],
                  decoration: InputDecoration(
                    labelText: 'S${index + 1}',
                    border: const OutlineInputBorder(),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 8),
                    filled: true,
                    fillColor: Theme.of(context).cardColor,
                  ),
                  keyboardType: TextInputType.number,
                ),
              );
            }),
          ),
        ]),

        // PG
        if (widget.profileData['department_type'] == 'PG' ||
            ((double.tryParse(widget.profileData['pg_cgpa'].toString()) ?? 0) >
                0))
          _buildSectionContainer("Postgraduate (PG)", [
            _buildTextField(
              controller: _pgCgpaController,
              label: 'Overall CGPA',
              type: TextInputType.number,
            ),
            const SizedBox(height: 8),
            const Text(
              "PG Semester GPAs (S1-S4)",
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: List.generate(_pgSemControllers.length, (index) {
                return SizedBox(
                  width: 80,
                  child: TextFormField(
                    controller: _pgSemControllers[index],
                    decoration: InputDecoration(
                      labelText: 'S${index + 1}',
                      border: const OutlineInputBorder(),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 8),
                      filled: true,
                      fillColor: Theme.of(context).cardColor,
                    ),
                    keyboardType: TextInputType.number,
                  ),
                );
              }),
            ),
          ]),

        // Backlogs
        _buildSectionContainer("Backlogs & Gaps", [
          Row(
            children: [
              Expanded(
                child: _buildTextField(
                  controller: _currentBacklogsController,
                  label: 'Current',
                  type: TextInputType.number,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: _buildTextField(
                  controller: _historyBacklogsController,
                  label: 'History',
                  type: TextInputType.number,
                ),
              ),
            ],
          ),
          _buildTextField(
            controller: _gapYearsController,
            label: 'Gap Years',
            type: TextInputType.number,
          ),
          _buildTextField(
            controller: _gapReasonController,
            label: 'Gap Reason',
          ),
        ]),
      ],
    );
  }

  Widget _buildDocumentsTab() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          "Identity Numbers",
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
        ),
        const SizedBox(height: 16),
        _buildTextField(
          controller: _aadharNumberController,
          label: 'Aadhar Number',
          type: TextInputType.number,
        ),
        _buildTextField(
          controller: _panNumberController,
          label: 'PAN Number',
          type: TextInputType.text,
        ),
        const SizedBox(height: 24),
        const Text(
          "Documents",
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
        ),
        const SizedBox(height: 16),
        _buildDocUploadRow(
          'Resume (PDF)',
          _resumeUrl,
          _resumeUpdatedAt,
          () => _pickAndUpload('resume'),
        ),
      ],
    );
  }

  Widget _buildDocUploadRow(
    String label,
    String? url,
    DateTime? timestamp,
    VoidCallback onUpload,
  ) {
    final isUploaded = url != null && url.isNotEmpty;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        border: Border.all(color: Theme.of(context).dividerColor),
        borderRadius: BorderRadius.circular(AppConstants.borderRadius),
        color: Theme.of(context).cardColor,
      ),
      child: Row(
        children: [
          Icon(
            isUploaded ? Icons.check_circle : Icons.upload_file,
            color: isUploaded
                ? Colors.green
                : (Theme.of(context).textTheme.bodyMedium?.color ??
                      Colors.grey),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color:
                        (Theme.of(context).textTheme.bodyLarge?.color ??
                        Colors.black),
                  ),
                ),
                if (isUploaded)
                  Text(
                    'Uploaded',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.green.shade700,
                    ),
                  ),
              ],
            ),
          ),
          TextButton(
            onPressed: onUpload,
            child: Text(isUploaded ? 'Change' : 'Upload'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: const Text(
          'Edit Profile',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        foregroundColor: Theme.of(context).brightness == Brightness.dark
            ? Colors.white
            : Colors.black,
        elevation: 0,
        scrolledUnderElevation: 0,
      ),
      body: Column(
        children: [
          // Tabs
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 24),
            child: _buildSectionTabs(),
          ),

          // Scrollable Content
          Expanded(
            child: Form(
              key: _formKey,
              child: IndexedStack(
                index: _selectedTabIndex,
                children: [
                  SingleChildScrollView(
                    padding: const EdgeInsets.all(24),
                    child: _buildPersonalTab(),
                  ),
                  SingleChildScrollView(
                    padding: const EdgeInsets.all(24),
                    child: _buildAcademicTab(),
                  ),
                  SingleChildScrollView(
                    padding: const EdgeInsets.all(24),
                    child: _buildDocumentsTab(),
                  ),
                ],
              ),
            ),
          ),

          // Bottom Save Button
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              border: Border(
                top: BorderSide(color: Theme.of(context).dividerColor),
              ),
            ),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _saveProfile,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Theme.of(context).colorScheme.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  elevation: 0,
                ),
                child: _isLoading
                    ? SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Theme.of(context).cardColor,
                        ),
                      )
                    : const Text(
                        'Save Changes',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
