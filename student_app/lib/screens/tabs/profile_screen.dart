import 'dart:io';
import 'package:file_picker/file_picker.dart';
import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart'; // For HapticFeedback
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../providers/auth_provider.dart';
import '../../providers/profile_provider.dart';
import '../../services/student_service.dart';
import '../../utils/constants.dart';
import '../change_password_screen.dart';
import '../../widgets/haptic_refresh_indicator.dart';
import '../requests_screen.dart'; // [NEW]
import 'package:google_fonts/google_fonts.dart';
import '../../providers/theme_provider.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  StudentService get _studentService => ref.read(studentServiceProvider);
  late PageController _pageController;

  // --- In-place Editing State ---
  String? _editingSection;
  bool _isSaving = false;
  bool _isUploadingResume = false;
  int _photoVersion = 0;

  // Controllers
  final _mobileController = TextEditingController();
  final _dobController = TextEditingController();
  final _addressLine1Controller = TextEditingController();
  final _addressLine2Controller = TextEditingController();
  final _stateController = TextEditingController();
  final _linkedinController = TextEditingController();
  final _githubController = TextEditingController();
  final _leetcodeController = TextEditingController();
  final _panNumberController = TextEditingController();
  final _aadharNumberController = TextEditingController();

  final _tenthMarkController = TextEditingController();
  final _tenthBoardController = TextEditingController();
  final _tenthInstitutionController = TextEditingController();
  final _twelfthMarkController = TextEditingController();
  final _twelfthBoardController = TextEditingController();
  final _twelfthInstitutionController = TextEditingController();
  final _diplomaMarkController = TextEditingController();
  final _diplomaInstitutionController = TextEditingController();

  final _ugCgpaController = TextEditingController();
  final List<TextEditingController> _ugSemControllers = List.generate(
    10,
    (_) => TextEditingController(),
  );
  final _pgCgpaController = TextEditingController();
  final List<TextEditingController> _pgSemControllers = List.generate(
    8,
    (_) => TextEditingController(),
  );

  final _currentBacklogsController = TextEditingController();
  final _historyBacklogsController = TextEditingController();
  final _gapYearsController = TextEditingController();
  final _gapReasonController = TextEditingController();

  List<String> _languageSkills = [];
  final _languageInputController = TextEditingController();
  String? _selectedGender;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();

    // Init the provider if it's empty, otherwise keep cached
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!ref.read(profileProvider).hasValue) {
        ref.read(profileProvider.notifier).refresh();
      }
    });
  }

  @override
  void dispose() {
    _pageController.dispose();
    _mobileController.dispose();
    _dobController.dispose();
    _addressLine1Controller.dispose();
    _addressLine2Controller.dispose();
    _stateController.dispose();
    _linkedinController.dispose();
    _githubController.dispose();
    _leetcodeController.dispose();
    _panNumberController.dispose();
    _aadharNumberController.dispose();
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
    _languageInputController.dispose();
    super.dispose();
  }

  Future<void> _refresh() async {
    // HapticFeedback.selectionClick();
    await ref.read(profileProvider.notifier).refreshQuietly();
  }

  void _startEditing(String section, Map<String, dynamic> data) {
    setState(() {
      _editingSection = section;
      _initializeSectionFields(section, data);
    });
  }

  void _cancelEditing() {
    setState(() {
      _editingSection = null;
    });
  }

  void _initializeSectionFields(String section, Map<String, dynamic> data) {
    if (section == 'Contact Details') {
      _mobileController.text = _formatValueRaw(data['mobile_number']);
    } else if (section == 'Address') {
      _addressLine1Controller.text = _formatValueRaw(data['address_line_1']);
      _addressLine2Controller.text = _formatValueRaw(data['address_line_2']);
      _stateController.text = _formatValueRaw(data['state']);
    } else if (section == 'Identity') {
      _dobController.text = _formatValueRaw(data['dob']);
      _selectedGender = data['gender'];
      _aadharNumberController.text = _formatValueRaw(data['aadhar_number']);
      _panNumberController.text = _formatValueRaw(data['pan_number']);
    } else if (section == 'Social Links') {
      final social = data['social_links'] as Map<String, dynamic>? ?? {};
      _linkedinController.text = _formatValueRaw(social['linkedin']);
      _githubController.text = _formatValueRaw(social['github']);
      _leetcodeController.text = _formatValueRaw(social['leetcode']);
    } else if (section == 'Skills & Documents') {
      _languageSkills = List<String>.from(data['language_skills'] ?? []);
    } else if (section == '10th Standard') {
      _tenthMarkController.text = _formatValueRaw(data['tenth_mark']);
      _tenthBoardController.text = _formatValueRaw(data['tenth_board']);
      _tenthInstitutionController.text = _formatValueRaw(
        data['tenth_institution'],
      );
    } else if (section == '12th Standard') {
      _twelfthMarkController.text = _formatValueRaw(data['twelfth_mark']);
      _twelfthBoardController.text = _formatValueRaw(data['twelfth_board']);
      _twelfthInstitutionController.text = _formatValueRaw(
        data['twelfth_institution'],
      );
    } else if (section == 'Diploma (If applicable)') {
      _diplomaMarkController.text = _formatValueRaw(data['diploma_mark']);
      _diplomaInstitutionController.text = _formatValueRaw(
        data['diploma_institution'],
      );
    } else if (section == 'Undergraduate (UG)') {
      _ugCgpaController.text = _formatValueRaw(data['ug_cgpa']);
      _ugSemControllers[0].text = _formatValueRaw(data['ug_gpa_s1']);
      _ugSemControllers[1].text = _formatValueRaw(data['ug_gpa_s2']);
      _ugSemControllers[2].text = _formatValueRaw(data['ug_gpa_s3']);
      _ugSemControllers[3].text = _formatValueRaw(data['ug_gpa_s4']);
      _ugSemControllers[4].text = _formatValueRaw(data['ug_gpa_s5']);
      _ugSemControllers[5].text = _formatValueRaw(data['ug_gpa_s6']);
      _ugSemControllers[6].text = _formatValueRaw(data['ug_gpa_s7']);
      _ugSemControllers[7].text = _formatValueRaw(data['ug_gpa_s8']);
      _ugSemControllers[8].text = _formatValueRaw(data['ug_gpa_s9']);
      _ugSemControllers[9].text = _formatValueRaw(data['ug_gpa_s10']);
    } else if (section == 'Postgraduate (PG)') {
      _pgCgpaController.text = _formatValueRaw(data['pg_cgpa']);
      _pgSemControllers[0].text = _formatValueRaw(data['pg_gpa_s1']);
      _pgSemControllers[1].text = _formatValueRaw(data['pg_gpa_s2']);
      _pgSemControllers[2].text = _formatValueRaw(data['pg_gpa_s3']);
      _pgSemControllers[3].text = _formatValueRaw(data['pg_gpa_s4']);
      _pgSemControllers[4].text = _formatValueRaw(data['pg_gpa_s5']);
      _pgSemControllers[5].text = _formatValueRaw(data['pg_gpa_s6']);
      _pgSemControllers[6].text = _formatValueRaw(data['pg_gpa_s7']);
      _pgSemControllers[7].text = _formatValueRaw(data['pg_gpa_s8']);
    } else if (section == 'Backlogs & History') {
      _currentBacklogsController.text = _formatValueRaw(
        data['current_backlogs'],
      );
      _historyBacklogsController.text = _formatValueRaw(
        data['history_of_backlogs'],
      );
      _gapYearsController.text = _formatValueRaw(data['gap_years']);
      _gapReasonController.text = _formatValueRaw(data['gap_reason']);
    }
  }

  String _formatValueRaw(dynamic value) {
    if (value == null || value == 0 || value == 0.0) return '';
    return value.toString();
  }

  String _formatDateTime(dynamic value) {
    if (value == null) return '';
    try {
      final dt = DateTime.parse(value.toString());
      return DateFormat('dd MMM yyyy, hh:mm a').format(dt.toLocal());
    } catch (_) {
      return value.toString();
    }
  }

  Future<void> _saveSection(String section, Map<String, dynamic> data) async {
    setState(() => _isSaving = true);
    try {
      // Only send fields being edited, not the full profile
      final Map<String, dynamic> updateData = {};

      if (section == 'Contact Details') {
        updateData['mobile_number'] = _mobileController.text;
      } else if (section == 'Address') {
        updateData['address_line_1'] = _addressLine1Controller.text;
        updateData['address_line_2'] = _addressLine2Controller.text;
        updateData['state'] = _stateController.text;
      } else if (section == 'Identity') {
        updateData['dob'] = _dobController.text;
        updateData['gender'] = _selectedGender;
        updateData['aadhar_number'] = _aadharNumberController.text;
        updateData['pan_number'] = _panNumberController.text;
      } else if (section == 'Social Links') {
        updateData['social_links'] = {
          'linkedin': _linkedinController.text,
          'github': _githubController.text,
          'leetcode': _leetcodeController.text,
        };
      } else if (section == 'Skills & Documents') {
        updateData['language_skills'] = _languageSkills;
      } else if (section == '10th Standard') {
        updateData['tenth_mark'] =
            double.tryParse(_tenthMarkController.text) ?? 0.0;
        updateData['tenth_board'] = _tenthBoardController.text;
        updateData['tenth_institution'] = _tenthInstitutionController.text;
      } else if (section == '12th Standard') {
        updateData['twelfth_mark'] =
            double.tryParse(_twelfthMarkController.text) ?? 0.0;
        updateData['twelfth_board'] = _twelfthBoardController.text;
        updateData['twelfth_institution'] = _twelfthInstitutionController.text;
      } else if (section == 'Diploma (If applicable)') {
        updateData['diploma_mark'] =
            double.tryParse(_diplomaMarkController.text) ?? 0.0;
        updateData['diploma_institution'] = _diplomaInstitutionController.text;
      } else if (section == 'Undergraduate (UG)') {
        updateData['ug_cgpa'] = double.tryParse(_ugCgpaController.text) ?? 0.0;
        updateData['ug_gpa_s1'] =
            double.tryParse(_ugSemControllers[0].text) ?? 0.0;
        updateData['ug_gpa_s2'] =
            double.tryParse(_ugSemControllers[1].text) ?? 0.0;
        updateData['ug_gpa_s3'] =
            double.tryParse(_ugSemControllers[2].text) ?? 0.0;
        updateData['ug_gpa_s4'] =
            double.tryParse(_ugSemControllers[3].text) ?? 0.0;
        updateData['ug_gpa_s5'] =
            double.tryParse(_ugSemControllers[4].text) ?? 0.0;
        updateData['ug_gpa_s6'] =
            double.tryParse(_ugSemControllers[5].text) ?? 0.0;
        updateData['ug_gpa_s7'] =
            double.tryParse(_ugSemControllers[6].text) ?? 0.0;
        updateData['ug_gpa_s8'] =
            double.tryParse(_ugSemControllers[7].text) ?? 0.0;
        updateData['ug_gpa_s9'] =
            double.tryParse(_ugSemControllers[8].text) ?? 0.0;
        updateData['ug_gpa_s10'] =
            double.tryParse(_ugSemControllers[9].text) ?? 0.0;
      } else if (section == 'Postgraduate (PG)') {
        updateData['pg_cgpa'] = double.tryParse(_pgCgpaController.text) ?? 0.0;
        updateData['pg_gpa_s1'] =
            double.tryParse(_pgSemControllers[0].text) ?? 0.0;
        updateData['pg_gpa_s2'] =
            double.tryParse(_pgSemControllers[1].text) ?? 0.0;
        updateData['pg_gpa_s3'] =
            double.tryParse(_pgSemControllers[2].text) ?? 0.0;
        updateData['pg_gpa_s4'] =
            double.tryParse(_pgSemControllers[3].text) ?? 0.0;
        updateData['pg_gpa_s5'] =
            double.tryParse(_pgSemControllers[4].text) ?? 0.0;
        updateData['pg_gpa_s6'] =
            double.tryParse(_pgSemControllers[5].text) ?? 0.0;
        updateData['pg_gpa_s7'] =
            double.tryParse(_pgSemControllers[6].text) ?? 0.0;
        updateData['pg_gpa_s8'] =
            double.tryParse(_pgSemControllers[7].text) ?? 0.0;
      } else if (section == 'Backlogs & History') {
        updateData['current_backlogs'] =
            int.tryParse(_currentBacklogsController.text) ?? 0;
        updateData['history_of_backlogs'] =
            int.tryParse(_historyBacklogsController.text) ?? 0;
        updateData['gap_years'] = int.tryParse(_gapYearsController.text) ?? 0;
        updateData['gap_reason'] = _gapReasonController.text;
      }

      await _studentService.updateProfile(updateData);
      if (mounted) {
        _editingSection = null;
        await _refresh();
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Section updated successfully')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Update failed: $e')));
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  void _addLanguage() {
    final text = _languageInputController.text.trim();
    if (text.isNotEmpty && !_languageSkills.contains(text)) {
      setState(() {
        _languageSkills.add(text);
        _languageInputController.clear();
      });
    }
  }

  Future<void> _uploadResume() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf'],
      );
      if (result == null) return;

      setState(() => _isUploadingResume = true);
      final file = result.files.single;

      await _studentService.uploadFile(file.path!, 'resume');
      await _refresh();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Resume uploaded successfully')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Resume upload failed: $e')));
      }
    } finally {
      if (mounted) setState(() => _isUploadingResume = false);
    }
  }

  Widget _buildEditTextField({
    required TextEditingController controller,
    required String label,
    TextInputType type = TextInputType.text,
    int maxLines = 1,
    Widget? prefixIcon,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextFormField(
        controller: controller,
        keyboardType: type,
        maxLines: maxLines,
        decoration: InputDecoration(
          labelText: label,
          prefixIcon: prefixIcon,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppConstants.borderRadius),
          ),
          filled: true,
          fillColor: Theme.of(context).scaffoldBackgroundColor,
          isDense: true,
        ),
      ),
    );
  }

  Widget _buildEditDatePicker() {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextFormField(
        controller: _dobController,
        readOnly: true,
        decoration: InputDecoration(
          labelText: 'Date of Birth (YYYY-MM-DD)',
          suffixIcon: const Icon(Icons.calendar_today, size: 20),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppConstants.borderRadius),
          ),
          filled: true,
          fillColor: Theme.of(context).scaffoldBackgroundColor,
          isDense: true,
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

  Widget _buildEditDropdown(
    String label,
    List<String> items,
    String? value,
    ValueChanged<String?> onChanged,
  ) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: DropdownButtonFormField<String>(
        initialValue: items.contains(value) ? value : null,
        decoration: InputDecoration(
          labelText: label,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppConstants.borderRadius),
          ),
          filled: true,
          fillColor: Theme.of(context).scaffoldBackgroundColor,
          isDense: true,
        ),
        items: items
            .map((e) => DropdownMenuItem(value: e, child: Text(e)))
            .toList(),
        onChanged: onChanged,
      ),
    );
  }

  Future<void> _launchURL(String url) async {
    if (url.isEmpty) return;
    var validUrl = AppConstants.sanitizeUrl(url);
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
      validUrl = 'https://$validUrl';
    }

    final Uri uri = Uri.parse(validUrl);
    try {
      if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
        throw 'Could not launch $validUrl';
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not launch $validUrl: $e')),
        );
      }
    }
  }

  Future<void> _openDocument(String documentType) async {
    try {
      if (mounted) {
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Opening document...'),
            duration: Duration(seconds: 2),
          ),
        );
      }

      final presignedURL = await _studentService.getDocumentURL(documentType);

      if (presignedURL.isEmpty) {
        throw 'Document URL not found';
      }

      final sanitizedURL = AppConstants.sanitizeUrl(
        presignedURL,
      ); // [NEW] Sanitize
      final response = await http.get(Uri.parse(sanitizedURL));

      if (response.statusCode != 200) {
        throw 'Failed to download document (Status: ${response.statusCode})';
      }

      String extension = 'pdf';
      final contentType = response.headers['content-type']?.toLowerCase();
      if (contentType != null) {
        if (contentType.contains('image/jpeg') ||
            contentType.contains('image/jpg')) {
          extension = 'jpg';
        } else if (contentType.contains('image/png')) {
          extension = 'png';
        } else if (contentType.contains('application/pdf')) {
          extension = 'pdf';
        }
      }

      final tempDir = await getTemporaryDirectory();
      final file = File('${tempDir.path}/${documentType}_document.$extension');
      await file.writeAsBytes(response.bodyBytes);

      final result = await OpenFilex.open(file.path);

      if (result.type != ResultType.done) {
        throw result.message;
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to open document: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final picker = ImagePicker();
      final pickedFile = await picker.pickImage(
        source: source,
        maxWidth: 1000,
        maxHeight: 1000,
        imageQuality: 85,
      );

      if (pickedFile != null) {
        File imageFile = File(pickedFile.path);
        int fileSize = await imageFile.length();

        // 1MB = 1,048,576 bytes
        if (fileSize > 1048576) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Compressing image...')),
            );
          }

          final dir = await getTemporaryDirectory();
          final targetPath =
              '${dir.path}/compressed_${DateTime.now().millisecondsSinceEpoch}.jpg';

          var result = await FlutterImageCompress.compressAndGetFile(
            imageFile.absolute.path,
            targetPath,
            quality: 70, // Start with aggressive quality reduction
            minWidth: 1080,
            minHeight: 1080,
          );

          if (result != null) {
            imageFile = File(result.path);
            // Verify size again? Optional. 70 quality usually does the trick for standard photos.
          }
        }

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Uploading profile photo...')),
          );
        }

        await _studentService.uploadFile(imageFile.path, 'profile_pic');

        // Evict the profile photo from cache so the new photo is loaded
        try {
          await CachedNetworkImage.evictFromCache(
            '${AppConstants.apiBaseUrl}/v1/student/profile-photo',
            cacheKey: 'my_profile_photo_$_photoVersion',
          );
        } catch (e) {
          debugPrint("Failed to evict cache: $e");
        }

        // Clear the entire image cache to ensure the new photo is shown
        PaintingBinding.instance.imageCache.clear();
        PaintingBinding.instance.imageCache.clearLiveImages();

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Profile photo updated successfully')),
          );
          setState(() {
            _photoVersion++;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to update profile photo: $e')),
        );
      }
    }
  }

  void _showImageSourceActionSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      builder: (BuildContext context) {
        return SafeArea(
          child: Wrap(
            children: <Widget>[
              ListTile(
                leading: const Icon(Icons.photo_library),
                title: const Text('Photo Library'),
                onTap: () {
                  Navigator.of(context).pop();
                  _pickImage(ImageSource.gallery);
                },
              ),
              ListTile(
                leading: const Icon(Icons.photo_camera),
                title: const Text('Camera'),
                onTap: () {
                  Navigator.of(context).pop();
                  _pickImage(ImageSource.camera);
                },
              ),
            ],
          ),
        );
      },
    );
  }

  String _formatValue(dynamic value) {
    if (value == null ||
        value.toString().isEmpty ||
        value == 0 ||
        value == 0.0) {
      return 'N/A';
    }
    return value.toString();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: const Text(
          'Profile',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        elevation: 0,
        scrolledUnderElevation: 0,
        foregroundColor:
            (Theme.of(context).textTheme.bodyLarge?.color ?? Colors.black),
        actions: [
          IconButton(
            icon: Icon(
              Theme.of(context).brightness == Brightness.dark
                  ? Icons.light_mode
                  : Icons.dark_mode_outlined,
            ),
            tooltip: 'Toggle Theme',
            onPressed: () {
              ref.read(themeModeProvider.notifier).toggleTheme();
            },
          ),
          IconButton(
            icon: Listener(
              // onPointerDown: (_) => HapticFeedback.selectionClick(),
              child: const Icon(Icons.logout_rounded, color: Colors.red),
            ),
            tooltip: 'Logout',
            onPressed: () async {
              await ref.read(authControllerProvider.notifier).logout();
              if (context.mounted) {
                context.go('/login');
              }
            },
          ),
        ],
      ),
      body: Consumer(
        builder: (context, ref, child) {
          final isInitialLoad = ref.watch(
            profileProvider.select((s) => s.isLoading && !s.hasValue),
          );
          final hasError = ref.watch(
            profileProvider.select((s) => s.hasError && !s.hasValue),
          );
          final hasData = ref.watch(profileProvider.select((s) => s.hasValue));

          if (isInitialLoad) {
            return Column(
              children: [
                LinearProgressIndicator(
                  color: Theme.of(context).colorScheme.primary,
                  backgroundColor: Colors.transparent,
                ),
                Expanded(child: SizedBox()),
              ],
            );
          } else if (hasError) {
            final error = ref.read(profileProvider).error;
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 48, color: Colors.red),
                  const SizedBox(height: 16),
                  Text('Error: $error'),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () =>
                        ref.read(profileProvider.notifier).refresh(),
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          } else if (!hasData) {
            return const Center(child: Text('No profile data found.'));
          }

          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // --- Header Section ---
              Consumer(
                builder: (context, headerRef, _) {
                  // The headerData variable was unused, so we remove its assignment.
                  // The data variable below already provides the full map.
                  headerRef.watch(
                    profileProvider.select((s) {
                      final d = s.value ?? {};
                      return (
                        d['profile_photo_url'],
                        d['is_blocked'],
                        d['full_name'],
                        d['register_number'],
                        d['department'],
                        d['batch_year'],
                        d['student_type'],
                      );
                    }),
                  );
                  // Get complete static map for passing inside builders seamlessly
                  final data = headerRef.read(profileProvider).value ?? {};

                  return Padding(
                    padding: const EdgeInsets.fromLTRB(24, 24, 24, 0),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Profile Photo
                        GestureDetector(
                          onTap: () => _showImageSourceActionSheet(context),
                          child: Stack(
                            children: [
                              Container(
                                width: 100,
                                height: 100,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: Theme.of(context).colorScheme.primary,
                                ),
                                child: ClipOval(
                                  child:
                                      data['profile_photo_url'] != null &&
                                          data['profile_photo_url']
                                              .toString()
                                              .isNotEmpty
                                      ? Builder(
                                          builder: (context) {
                                            // Use authenticated proxy endpoint for secure access
                                            final photoUrl =
                                                '${AppConstants.apiBaseUrl}/v1/student/profile-photo';
                                            return FutureBuilder<String?>(
                                              future: ref
                                                  .read(authServiceProvider)
                                                  .getToken(),
                                              builder: (context, tokenSnapshot) {
                                                final token =
                                                    tokenSnapshot.data;
                                                if (token == null ||
                                                    token.isEmpty) {
                                                  return Icon(
                                                    Icons.person,
                                                    size: 60,
                                                    color: Theme.of(
                                                      context,
                                                    ).cardColor,
                                                  );
                                                }
                                                return CachedNetworkImage(
                                                  imageUrl: photoUrl,
                                                  cacheKey: 'my_profile_photo_$_photoVersion',
                                                  httpHeaders: {
                                                    'Authorization':
                                                        'Bearer $token',
                                                  },
                                                  fit: BoxFit.cover,
                                                  memCacheHeight: 300,
                                                  placeholder: (context, url) =>
                                                      Center(
                                                        child:
                                                            CircularProgressIndicator(
                                                              color: Theme.of(
                                                                context,
                                                              ).cardColor,
                                                              strokeWidth: 2,
                                                            ),
                                                      ),
                                                  errorWidget:
                                                      (context, url, error) {
                                                        return Icon(
                                                          Icons.person,
                                                          size: 60,
                                                          color: Theme.of(
                                                            context,
                                                          ).cardColor,
                                                        );
                                                      },
                                                );
                                              },
                                            );
                                          },
                                        )
                                      : Icon(
                                          Icons.person,
                                          size: 60,
                                          color: Theme.of(context).cardColor,
                                        ),
                                ),
                              ),
                              Positioned(
                                right: 0,
                                bottom: 0,
                                child: Container(
                                  padding: const EdgeInsets.all(4),
                                  decoration: BoxDecoration(
                                    color: Theme.of(context).cardColor,
                                    shape: BoxShape.circle,
                                  ),
                                  child: Container(
                                    width: 16,
                                    height: 16,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: data['is_blocked'] == true
                                          ? Colors.red
                                          : const Color(0xFF10B981),
                                      border: Border.all(
                                        color: Theme.of(context).cardColor,
                                        width: 2,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 20),

                        // Details & Social
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const SizedBox(height: 4),
                              Text(
                                _formatValue(data['full_name']),
                                style: Theme.of(context).textTheme.headlineSmall
                                    ?.copyWith(
                                      fontWeight: FontWeight.bold,
                                      color:
                                          (Theme.of(
                                            context,
                                          ).textTheme.bodyLarge?.color ??
                                          Colors.black),
                                      fontSize: 22,
                                    ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${_formatValue(data['register_number'])} | ${_formatValue(data['department'])}',
                                style: Theme.of(context).textTheme.bodyMedium
                                    ?.copyWith(
                                      color:
                                          (Theme.of(
                                            context,
                                          ).textTheme.bodyMedium?.color ??
                                          Colors.grey),
                                      fontWeight: FontWeight.w500,
                                    ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Batch ${_formatValue(data['batch_year'])} • ${_formatValue(data['student_type'])}',
                                style: Theme.of(context).textTheme.bodySmall
                                    ?.copyWith(
                                      color:
                                          (Theme.of(
                                            context,
                                          ).textTheme.bodyMedium?.color ??
                                          Colors.grey),
                                    ),
                              ),
                              const SizedBox(height: 12),

                              const SizedBox(height: 12),
                              // Social links moved to Personal Tab
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
              const SizedBox(height: 16),

              // --- Tab Section ---
              Expanded(child: _buildTabSection()),
            ],
          );
        },
      ),
    );
  }

  Widget _buildTabSection() {
    return Column(
      children: [
        AnimatedBuilder(
          animation: _pageController,
          builder: (context, _) {
            double page = 0.0;
            if (_pageController.hasClients) {
              if (_pageController.position.hasContentDimensions) {
                page = _pageController.page ?? 0.0;
              }
            }
            final int activeIndex = page.round();

            return Container(
              height: 48,
              decoration: BoxDecoration(
                color: Theme.of(context).scaffoldBackgroundColor,
                border: Border(
                  bottom: BorderSide(
                    color: (Theme.of(context).brightness == Brightness.dark
                        ? Colors.grey[800]
                        : Colors.grey[200])!,
                    width: 1,
                  ),
                ),
              ),
              child: Stack(
                children: [
                  Positioned(
                    bottom: 0,
                    left: page * (MediaQuery.of(context).size.width / 3),
                    width: MediaQuery.of(context).size.width / 3,
                    child: Center(
                      child: Container(
                        height: 3,
                        width: 48,
                        decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.primary,
                          borderRadius: BorderRadius.only(
                            topLeft: Radius.circular(3),
                            topRight: Radius.circular(3),
                          ),
                        ),
                      ),
                    ),
                  ),
                  Row(
                    children: [
                      _buildCustomTab(
                        'Personal',
                        0,
                        activeIndex,
                        MediaQuery.of(context).size.width,
                      ),
                      _buildCustomTab(
                        'Academic',
                        1,
                        activeIndex,
                        MediaQuery.of(context).size.width,
                      ),
                      _buildCustomTab(
                        'Placement',
                        2,
                        activeIndex,
                        MediaQuery.of(context).size.width,
                      ),
                    ],
                  ),
                ],
              ),
            );
          },
        ),
        // Pre-build all tabs for zero-frame drop butter smooth swiping using native PageView
        Expanded(
          child: PageView(
            controller: _pageController,
            physics: const BouncingScrollPhysics(),
            children: [
              _KeepAliveTab(child: _buildScrollableTab(0)),
              _KeepAliveTab(child: _buildScrollableTab(1)),
              _KeepAliveTab(child: _buildScrollableTab(2)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildCustomTab(
    String text,
    int index,
    int activeIndex,
    double screenWidth,
  ) {
    bool isActive = activeIndex == index;
    return Expanded(
      child: InkWell(
        onTap: () {
          HapticFeedback.lightImpact();
          if (_pageController.hasClients) {
            _pageController.animateToPage(
              index,
              duration: const Duration(milliseconds: 300),
              curve: Curves.easeOutCubic,
            );
          }
        },
        child: Container(
          height: 48,
          alignment: Alignment.center,
          child: Text(
            text,
            style: GoogleFonts.geist(
              fontSize: 14,
              fontWeight: isActive ? FontWeight.w600 : FontWeight.w500,
              color: isActive
                  ? Theme.of(context).colorScheme.primary
                  : Colors.grey[500],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildScrollableTab(int index) {
    Widget content;
    switch (index) {
      case 0:
        content = _buildPersonalSection(context);
        break;
      case 1:
        content = _buildAcademicSection();
        break;
      case 2:
        content = _buildPlacementStats();
        break;
      default:
        content = const SizedBox.shrink();
    }

    return HapticRefreshIndicator(
      onRefresh: _refresh,
      color: Theme.of(context).colorScheme.primary,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(24, 24, 24, 40),
        child: RepaintBoundary(child: content),
      ),
    );
  }

  Widget _buildPersonalSection(BuildContext context) {
    return Consumer(
      builder: (context, ref, _) {
        ref.watch(profileProvider.select((s) => s.value));
        final data = ref.read(profileProvider).value ?? {};
        final languageSkills = data['language_skills'] as List? ?? [];
        final socialLinks = data['social_links'] as Map<String, dynamic>? ?? {};

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Contact Details
            _buildSectionCard(
              'Contact Details',
              _editingSection == 'Contact Details'
                  ? [
                      _buildEditTextField(
                        controller: _mobileController,
                        label: 'Mobile Number',
                        type: TextInputType.phone,
                      ),
                    ]
                  : [
                      _buildDetailItem('Email', data['email']),
                      _buildDetailItem('Mobile Number', data['mobile_number']),
                    ],
              onEdit: () => _startEditing('Contact Details', data),
              onSave: () => _saveSection('Contact Details', data),
              onCancel: _cancelEditing,
            ),

            // Address
            _buildSectionCard(
              'Address',
              _editingSection == 'Address'
                  ? [
                      _buildEditTextField(
                        controller: _addressLine1Controller,
                        label: 'Address Line 1',
                      ),
                      _buildEditTextField(
                        controller: _addressLine2Controller,
                        label: 'Address Line 2',
                      ),
                      _buildEditTextField(
                        controller: _stateController,
                        label: 'State',
                      ),
                    ]
                  : [
                      _buildDetailItem(
                        'Address Line 1',
                        data['address_line_1'],
                      ),
                      _buildDetailItem(
                        'Address Line 2',
                        data['address_line_2'],
                      ),
                      _buildDetailItem('State', data['state']),
                    ],
              onEdit: () => _startEditing('Address', data),
              onSave: () => _saveSection('Address', data),
              onCancel: _cancelEditing,
            ),

            // Identity
            _buildSectionCard(
              'Identity',
              _editingSection == 'Identity'
                  ? [
                      _buildEditDatePicker(),
                      _buildEditDropdown(
                        'Gender',
                        ['Male', 'Female', 'Other'],
                        _selectedGender,
                        (val) => setState(() => _selectedGender = val),
                      ),
                      _buildEditTextField(
                        controller: _aadharNumberController,
                        label: 'Aadhar Number',
                      ),
                      _buildEditTextField(
                        controller: _panNumberController,
                        label: 'PAN Number',
                      ),
                    ]
                  : [
                      _buildDetailItem('Date of Birth', data['dob']),
                      _buildDetailItem('Gender', data['gender']),
                      _buildDetailItem('Aadhar Number', data['aadhar_number']),
                      _buildDetailItem('PAN Number', data['pan_number']),
                    ],
              onEdit: () => _startEditing('Identity', data),
              onSave: () => _saveSection('Identity', data),
              onCancel: _cancelEditing,
            ),

            // Social Links
            _buildSectionCard(
              'Social Links',
              _editingSection == 'Social Links'
                  ? [
                      _buildEditTextField(
                        controller: _linkedinController,
                        label: 'LinkedIn URL',
                        prefixIcon: const Padding(
                          padding: EdgeInsets.all(12),
                          child: FaIcon(
                            FontAwesomeIcons.linkedin,
                            color: Color(0xFF0077B5),
                            size: 20,
                          ),
                        ),
                      ),
                      _buildEditTextField(
                        controller: _githubController,
                        label: 'GitHub URL',
                        prefixIcon: const Padding(
                          padding: EdgeInsets.all(12),
                          child: FaIcon(FontAwesomeIcons.github, size: 20),
                        ),
                      ),
                      _buildEditTextField(
                        controller: _leetcodeController,
                        label: 'LeetCode URL',
                        prefixIcon: const Padding(
                          padding: EdgeInsets.all(12),
                          child: FaIcon(
                            FontAwesomeIcons.code,
                            color: Color(0xFFFFA116),
                            size: 20,
                          ),
                        ),
                      ),
                    ]
                  : [
                      if (socialLinks.isEmpty)
                        const Text(
                          'No social links added',
                          style: TextStyle(color: Colors.grey, fontSize: 13),
                        ),
                      if (socialLinks.containsKey('linkedin') &&
                          socialLinks['linkedin'].toString().isNotEmpty)
                        _buildSocialItem(
                          FontAwesomeIcons.linkedin,
                          'LinkedIn',
                          socialLinks['linkedin'].toString(),
                          const Color(0xFF0077B5),
                        ),
                      if (socialLinks.containsKey('github') &&
                          socialLinks['github'].toString().isNotEmpty)
                        _buildSocialItem(
                          FontAwesomeIcons.github,
                          'GitHub',
                          socialLinks['github'].toString(),
                          Theme.of(context).brightness == Brightness.dark
                              ? Colors.white
                              : Colors.black87,
                        ),
                      if (socialLinks.containsKey('leetcode') &&
                          socialLinks['leetcode'].toString().isNotEmpty)
                        _buildSocialItem(
                          FontAwesomeIcons.code,
                          'LeetCode',
                          socialLinks['leetcode'].toString(),
                          const Color(0xFFFFA116),
                        ),
                    ],
              onEdit: () => _startEditing('Social Links', data),
              onSave: () => _saveSection('Social Links', data),
              onCancel: _cancelEditing,
            ),
            _buildSectionCard(
              'Skills & Documents',
              _editingSection == 'Skills & Documents'
                  ? [
                      Row(
                        children: [
                          Expanded(
                            child: _buildEditTextField(
                              controller: _languageInputController,
                              label: 'Add Language (e.g. English)',
                            ),
                          ),
                          const SizedBox(width: 8),
                          IconButton(
                            onPressed: _addLanguage,
                            icon: Icon(
                              Icons.add_circle,
                              color: Theme.of(context).colorScheme.primary,
                            ),
                          ),
                        ],
                      ),
                      if (_languageSkills.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: Wrap(
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
                        ),
                      _isUploadingResume
                          ? const Padding(
                              padding: EdgeInsets.symmetric(vertical: 8),
                              child: Row(
                                children: [
                                  SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                    ),
                                  ),
                                  SizedBox(width: 8),
                                  Text(
                                    'Uploading resume...',
                                    style: TextStyle(
                                      color: Colors.grey,
                                      fontSize: 13,
                                    ),
                                  ),
                                ],
                              ),
                            )
                          : TextButton.icon(
                              onPressed: _uploadResume,
                              icon: const Icon(Icons.upload_file, size: 18),
                              label: Text(
                                data['resume_url'] != null &&
                                        data['resume_url'].toString().isNotEmpty
                                    ? 'Update Resume (PDF)'
                                    : 'Upload Resume (PDF)',
                              ),
                            ),
                    ]
                  : [
                      if (languageSkills.isNotEmpty) ...[
                        Text(
                          'Language Skills',
                          style: TextStyle(
                            color:
                                (Theme.of(
                                  context,
                                ).textTheme.bodyMedium?.color ??
                                Colors.grey),
                            fontSize: 14,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: languageSkills
                              .map(
                                (lang) => Chip(
                                  label: Text(lang.toString()),
                                  backgroundColor: Theme.of(
                                    context,
                                  ).scaffoldBackgroundColor,
                                  side: BorderSide(
                                    color: Theme.of(context).dividerColor,
                                  ),
                                ),
                              )
                              .toList(),
                        ),
                        if (data['resume_url'] != null &&
                            data['resume_url'].toString().isNotEmpty)
                          const SizedBox(height: 16),
                      ],
                      if (data['resume_url'] != null &&
                          data['resume_url'].toString().isNotEmpty) ...[
                        Row(
                          children: [
                            InkWell(
                              onTap: () => _openDocument('resume'),
                              borderRadius: BorderRadius.circular(8),
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 8,
                                ),
                                decoration: BoxDecoration(
                                  color: Theme.of(
                                    context,
                                  ).scaffoldBackgroundColor,
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(
                                    color: Theme.of(context).dividerColor,
                                  ),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      Icons.description,
                                      color: Theme.of(
                                        context,
                                      ).colorScheme.primary,
                                      size: 20,
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      'View Resume',
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        color:
                                            (Theme.of(
                                              context,
                                            ).textTheme.bodyLarge?.color ??
                                            Colors.black),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            _isUploadingResume
                                ? const SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                    ),
                                  )
                                : IconButton(
                                    onPressed: _uploadResume,
                                    icon: Icon(
                                      Icons.upload_file,
                                      color: Theme.of(
                                        context,
                                      ).colorScheme.primary,
                                    ),
                                    tooltip: 'Update Resume',
                                  ),
                          ],
                        ),
                        if (data['resume_updated_at'] != null)
                          Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Text(
                              'Last updated: ${_formatDateTime(data['resume_updated_at'])}',
                              style: const TextStyle(
                                color: Colors.grey,
                                fontSize: 12,
                              ),
                            ),
                          ),
                      ] else ...[
                        _isUploadingResume
                            ? const Row(
                                children: [
                                  SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                    ),
                                  ),
                                  SizedBox(width: 8),
                                  Text(
                                    'Uploading resume...',
                                    style: TextStyle(
                                      color: Colors.grey,
                                      fontSize: 13,
                                    ),
                                  ),
                                ],
                              )
                            : TextButton.icon(
                                onPressed: _uploadResume,
                                icon: const Icon(Icons.upload_file, size: 18),
                                label: const Text('Upload Resume (PDF)'),
                              ),
                      ],
                    ],
              onEdit: () => _startEditing('Skills & Documents', data),
              onSave: () => _saveSection('Skills & Documents', data),
              onCancel: _cancelEditing,
            ),

            const SizedBox(height: 24),

            // Action Buttons
            Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 300),
                child: Column(
                  children: [
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        onPressed: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (context) => const RequestsScreen(),
                            ),
                          );
                        },
                        icon: const Icon(Icons.history_edu),
                        label: const Text('My Requests'),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          side: BorderSide(
                            color: Theme.of(context).dividerColor,
                          ),
                          foregroundColor:
                              (Theme.of(context).textTheme.bodyLarge?.color ??
                              Colors.black),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(
                              AppConstants.borderRadius,
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        onPressed: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (context) =>
                                  const ChangePasswordScreen(),
                            ),
                          );
                        },
                        icon: const Icon(Icons.lock_outline),
                        label: const Text('Change Password'),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          side: BorderSide(
                            color: Theme.of(context).dividerColor,
                          ),
                          foregroundColor:
                              (Theme.of(context).textTheme.bodyLarge?.color ??
                              Colors.black),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(
                              AppConstants.borderRadius,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 48),

            // App Info
            Center(
              child: Column(
                children: [
                  Text(
                    'Version 1.0.0+1',
                    style: TextStyle(
                      color: Colors.grey[400],
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      TextButton(
                        onPressed: () =>
                            _launchURL('https://kongu.ac.in/privacy.php'),
                        isSemanticButton: false,
                        style: TextButton.styleFrom(
                          foregroundColor: Colors.grey[500],
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        child: const Text(
                          'Terms & Conditions',
                          style: TextStyle(fontSize: 12),
                        ),
                      ),
                      Text(
                        '•',
                        style: TextStyle(color: Colors.grey[400], fontSize: 12),
                      ),
                      TextButton(
                        onPressed: () =>
                            _launchURL('https://kongu.ac.in/privacy.php'),
                        isSemanticButton: false,
                        style: TextButton.styleFrom(
                          foregroundColor: Colors.grey[500],
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        child: const Text(
                          'Privacy Policy',
                          style: TextStyle(fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildAcademicSection() {
    return Consumer(
      builder: (context, ref, _) {
        ref.watch(
          profileProvider.select((s) {
            final d = s.value ?? {};
            return (
              d['tenth_mark'],
              d['twelfth_mark'],
              d['diploma_mark'],
              d['ug_cgpa'],
              d['pg_cgpa'],
              d['current_backlogs'],
              d['history_of_backlogs'],
            );
          }),
        );
        final data = ref.read(profileProvider).value ?? {};

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 10th
            _buildSectionCard(
              '10th Standard',
              _editingSection == '10th Standard'
                  ? [
                      _buildEditTextField(
                        controller: _tenthMarkController,
                        label: 'Percentage',
                        type: const TextInputType.numberWithOptions(
                          decimal: true,
                        ),
                      ),
                      _buildEditTextField(
                        controller: _tenthBoardController,
                        label: 'Board',
                      ),
                      _buildEditTextField(
                        controller: _tenthInstitutionController,
                        label: 'Institution',
                      ),
                    ]
                  : [
                      _buildDetailItem(
                        'Mark',
                        '${_formatValue(data['tenth_mark'])}%',
                      ),
                      _buildDetailItem('Board', data['tenth_board']),
                      _buildDetailItem(
                        'Institution',
                        data['tenth_institution'],
                      ),
                      _buildDetailItem(
                        'Year of Passing',
                        data['tenth_year_pass'],
                      ),
                    ],
              onEdit: () => _startEditing('10th Standard', data),
              onSave: () => _saveSection('10th Standard', data),
              onCancel: _cancelEditing,
            ),

            // 12th
            _buildSectionCard(
              '12th Standard',
              _editingSection == '12th Standard'
                  ? [
                      _buildEditTextField(
                        controller: _twelfthMarkController,
                        label: 'Percentage',
                        type: const TextInputType.numberWithOptions(
                          decimal: true,
                        ),
                      ),
                      _buildEditTextField(
                        controller: _twelfthBoardController,
                        label: 'Board',
                      ),
                      _buildEditTextField(
                        controller: _twelfthInstitutionController,
                        label: 'Institution',
                      ),
                    ]
                  : [
                      _buildDetailItem(
                        'Mark',
                        '${_formatValue(data['twelfth_mark'])}%',
                      ),
                      _buildDetailItem('Board', data['twelfth_board']),
                      _buildDetailItem(
                        'Institution',
                        data['twelfth_institution'],
                      ),
                      _buildDetailItem(
                        'Year of Passing',
                        data['twelfth_year_pass'],
                      ),
                    ],
              onEdit: () => _startEditing('12th Standard', data),
              onSave: () => _saveSection('12th Standard', data),
              onCancel: _cancelEditing,
            ),

            // Diploma
            if (data['diploma_mark'] != null && data['diploma_mark'] > 0)
              _buildSectionCard(
                'Diploma (If applicable)',
                _editingSection == 'Diploma (If applicable)'
                    ? [
                        _buildEditTextField(
                          controller: _diplomaMarkController,
                          label: 'Percentage',
                          type: const TextInputType.numberWithOptions(
                            decimal: true,
                          ),
                        ),
                        _buildEditTextField(
                          controller: _diplomaInstitutionController,
                          label: 'Institution',
                        ),
                      ]
                    : [
                        _buildDetailItem(
                          'Mark',
                          '${_formatValue(data['diploma_mark'])}%',
                        ),
                        _buildDetailItem(
                          'Institution',
                          data['diploma_institution'],
                        ),
                        _buildDetailItem(
                          'Year of Passing',
                          data['diploma_year_pass'],
                        ),
                      ],
                onEdit: () => _startEditing('Diploma (If applicable)', data),
                onSave: () => _saveSection('Diploma (If applicable)', data),
                onCancel: _cancelEditing,
              ),

            // UG
            _buildSectionCard(
              'Undergraduate (UG)',
              _editingSection == 'Undergraduate (UG)'
                  ? [
                      _buildEditTextField(
                        controller: _ugCgpaController,
                        label: 'CGPA',
                        type: const TextInputType.numberWithOptions(
                          decimal: true,
                        ),
                      ),
                      const Padding(
                        padding: EdgeInsets.only(bottom: 8),
                        child: Text(
                          'Semester GPAs',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                      ),
                      Wrap(
                        spacing: 8,
                        children: List.generate(
                          8,
                          (i) => SizedBox(
                            width: 70,
                            child: _buildEditTextField(
                              controller: _ugSemControllers[i],
                              label: 'S${i + 1}',
                              type: const TextInputType.numberWithOptions(
                                decimal: true,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ]
                  : [
                      _buildDetailItem('CGPA', data['ug_cgpa']),
                      const SizedBox(height: 12),
                      Text(
                        'Semester GPAs',
                        style: TextStyle(
                          color:
                              (Theme.of(context).textTheme.bodyMedium?.color ??
                              Colors.grey),
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          _buildGpaBadge('S1', data['ug_gpa_s1']),
                          _buildGpaBadge('S2', data['ug_gpa_s2']),
                          _buildGpaBadge('S3', data['ug_gpa_s3']),
                          _buildGpaBadge('S4', data['ug_gpa_s4']),
                          _buildGpaBadge('S5', data['ug_gpa_s5']),
                          _buildGpaBadge('S6', data['ug_gpa_s6']),
                          _buildGpaBadge('S7', data['ug_gpa_s7']),
                          _buildGpaBadge('S8', data['ug_gpa_s8']),
                        ],
                      ),
                    ],
              onEdit: () => _startEditing('Undergraduate (UG)', data),
              onSave: () => _saveSection('Undergraduate (UG)', data),
              onCancel: _cancelEditing,
            ),

            // PG
            if (data['department_type'] == 'PG' ||
                (data['pg_cgpa'] != null && data['pg_cgpa'] > 0))
              _buildSectionCard(
                'Postgraduate (PG)',
                _editingSection == 'Postgraduate (PG)'
                    ? [
                        _buildEditTextField(
                          controller: _pgCgpaController,
                          label: 'CGPA',
                          type: const TextInputType.numberWithOptions(
                            decimal: true,
                          ),
                        ),
                        const Padding(
                          padding: EdgeInsets.only(bottom: 8),
                          child: Text(
                            'Semester GPAs',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                          ),
                        ),
                        Wrap(
                          spacing: 8,
                          children: List.generate(
                            4,
                            (i) => SizedBox(
                              width: 70,
                              child: _buildEditTextField(
                                controller: _pgSemControllers[i],
                                label: 'S${i + 1}',
                                type: const TextInputType.numberWithOptions(
                                  decimal: true,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ]
                    : [
                        _buildDetailItem('CGPA', data['pg_cgpa']),
                        const SizedBox(height: 12),
                        Text(
                          'Semester GPAs',
                          style: TextStyle(
                            color:
                                (Theme.of(
                                  context,
                                ).textTheme.bodyMedium?.color ??
                                Colors.grey),
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            _buildGpaBadge('S1', data['pg_gpa_s1']),
                            _buildGpaBadge('S2', data['pg_gpa_s2']),
                            _buildGpaBadge('S3', data['pg_gpa_s3']),
                            _buildGpaBadge('S4', data['pg_gpa_s4']),
                          ],
                        ),
                      ],
                onEdit: () => _startEditing('Postgraduate (PG)', data),
                onSave: () => _saveSection('Postgraduate (PG)', data),
                onCancel: _cancelEditing,
              ),

            // Backlogs
            _buildSectionCard(
              'Backlogs & History',
              _editingSection == 'Backlogs & History'
                  ? [
                      _buildEditTextField(
                        controller: _currentBacklogsController,
                        label: 'Current Backlogs',
                        type: TextInputType.number,
                      ),
                      _buildEditTextField(
                        controller: _historyBacklogsController,
                        label: 'History of Backlogs',
                        type: TextInputType.number,
                      ),
                      _buildEditTextField(
                        controller: _gapYearsController,
                        label: 'Gap Years',
                        type: TextInputType.number,
                      ),
                      _buildEditTextField(
                        controller: _gapReasonController,
                        label: 'Gap Reason',
                        maxLines: 2,
                      ),
                    ]
                  : [
                      _buildDetailItem(
                        'Current Backlogs',
                        data['current_backlogs'],
                      ),
                      _buildDetailItem(
                        'History of Backlogs',
                        data['history_of_backlogs'],
                      ),
                      _buildDetailItem('Gap Years', data['gap_years']),
                      _buildDetailItem('Gap Reason', data['gap_reason']),
                    ],
              onEdit: () => _startEditing('Backlogs & History', data),
              onSave: () => _saveSection('Backlogs & History', data),
              onCancel: _cancelEditing,
            ),
          ],
        );
      },
    );
  }

  Widget _buildSectionCard(
    String title,
    List<Widget> children, {
    VoidCallback? onEdit,
    VoidCallback? onSave,
    VoidCallback? onCancel,
  }) {
    final bool isEditing = _editingSection == title;
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(AppConstants.borderRadius),
        border: Border.all(color: Theme.of(context).dividerColor, width: 0),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
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
              if (!isEditing && onEdit != null && _editingSection == null)
                IconButton(
                  constraints: const BoxConstraints(),
                  padding: EdgeInsets.zero,
                  icon: const Icon(Icons.edit_outlined, size: 20),
                  onPressed: onEdit,
                ),
            ],
          ),
          const SizedBox(height: 12),
          ...children,
          if (isEditing) ...[
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: _isSaving ? null : onCancel,
                  child: const Text('Cancel'),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: _isSaving ? null : onSave,
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  child: _isSaving
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text('Save'),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSocialItem(
    IconData icon,
    String label,
    String value,
    Color iconColor,
  ) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: () => _launchURL(value),
        child: Row(
          children: [
            FaIcon(icon, color: iconColor, size: 20),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                value,
                style: TextStyle(
                  color: Theme.of(context).colorScheme.primary,
                  fontSize: 14,
                  decoration: TextDecoration.underline,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailItem(
    String label,
    dynamic value, {
    bool alwaysShow = true,
  }) {
    final displayValue = _formatValue(value);
    final bool isEmpty =
        displayValue == 'N/A%' ||
        displayValue == '%' ||
        displayValue == 'N/A' ||
        displayValue.isEmpty;

    if (!alwaysShow && isEmpty) {
      return const SizedBox.shrink();
    }

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 7),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 2,
            child: Text(
              label,
              style: TextStyle(
                color: isEmpty ? Colors.grey[400] : Colors.grey[500],
                fontSize: 13,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Expanded(
            flex: 3,
            child: Text(
              isEmpty ? 'N/A' : displayValue,
              textAlign: TextAlign.right,
              style: TextStyle(
                color: isEmpty
                    ? Colors.grey[400]
                    : (Theme.of(context).textTheme.bodyLarge?.color ??
                          Colors.black),
                fontSize: 14,
                fontWeight: isEmpty ? FontWeight.normal : FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGpaBadge(String semester, dynamic value) {
    final displayValue = _formatValue(value);
    final bool isEmpty =
        displayValue == 'N/A' ||
        displayValue.isEmpty ||
        (value is num && value == 0);

    return Chip(
      label: Text(
        '$semester: ${isEmpty ? 'N/A' : displayValue}',
        style: TextStyle(
          fontSize: 13,
          color: isEmpty
              ? (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.grey)
                    .withValues(alpha: 0.5)
              : (Theme.of(context).textTheme.bodyLarge?.color ?? Colors.black),
          fontWeight: isEmpty ? FontWeight.normal : FontWeight.w500,
        ),
      ),
      backgroundColor: isEmpty
          ? Theme.of(context).scaffoldBackgroundColor.withValues(alpha: 0.5)
          : Theme.of(context).scaffoldBackgroundColor,
      side: BorderSide(
        color: isEmpty
            ? Theme.of(context).dividerColor.withValues(alpha: 0.5)
            : Theme.of(context).dividerColor,
      ),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
    );
  }

  Widget _buildPlacementStats() {
    return Consumer(
      builder: (context, ref, _) {
        ref.watch(profileProvider.select((s) => s.value?['placement_stats']));
        final data = ref.read(profileProvider).value ?? {};
        final stats = data['placement_stats'];

        if (stats == null) return const SizedBox.shrink();

        final eligible = (stats['eligible_drives'] as num?)?.toInt() ?? 0;
        final optedIn = (stats['opted_in'] as num?)?.toInt() ?? 0;
        final optedOut = (stats['opted_out'] as num?)?.toInt() ?? 0;

        // Calculate No Action: Eligible - (Opted In + Opted Out)
        int noAction = eligible - (optedIn + optedOut);
        if (noAction < 0) noAction = 0; // Sanity check

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              childAspectRatio: 1.6,
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              children: [
                _buildStatCard('Eligible Drives', eligible, Colors.blue),
                _buildStatCard('Opted In', optedIn, Colors.green),
                _buildStatCard('Attended', stats['attended'], Colors.purple),
                _buildStatCard(
                  'Offers',
                  stats['offers_received'],
                  Colors.orange,
                ),
                _buildStatCard('Opted Out', optedOut, Colors.grey),
                _buildStatCard('No Action', noAction, Colors.red),
              ],
            ),
            const SizedBox(height: 24),
          ],
        );
      },
    );
  }

  Widget _buildStatCard(String title, dynamic value, MaterialColor color) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? color.withValues(alpha: 0.15) : color[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? color.withValues(alpha: 0.3) : color[100]!,
        ),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            value?.toString() ?? '0',
            style: GoogleFonts.geist(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: isDark ? color[300] : color[800],
            ),
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: GoogleFonts.geist(
              fontSize: 13,
              color: isDark ? color[200] : color[700],
              fontWeight: FontWeight.w600,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class _KeepAliveTab extends StatefulWidget {
  final Widget child;

  const _KeepAliveTab({required this.child});

  @override
  State<_KeepAliveTab> createState() => _KeepAliveTabState();
}

class _KeepAliveTabState extends State<_KeepAliveTab>
    with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return widget.child;
  }
}
