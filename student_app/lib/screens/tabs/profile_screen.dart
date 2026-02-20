import 'dart:io';
import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'package:flutter/material.dart';
// For HapticFeedback
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../providers/auth_provider.dart';
import '../../services/student_service.dart';
import '../../utils/constants.dart';
import '../edit_profile_screen.dart';
import '../change_password_screen.dart'; // [NEW]
import '../../widgets/haptic_refresh_indicator.dart';
import '../requests_screen.dart'; // [NEW]
import 'package:google_fonts/google_fonts.dart';

class KeepAlivePage extends StatefulWidget {
  const KeepAlivePage({super.key, required this.child});
  final Widget child;

  @override
  State<KeepAlivePage> createState() => _KeepAlivePageState();
}

class _KeepAlivePageState extends State<KeepAlivePage>
    with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return widget.child;
  }
}

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen>
    with TickerProviderStateMixin, AutomaticKeepAliveClientMixin {
  final StudentService _studentService = StudentService();
  late Future<Map<String, dynamic>> _profileFuture;
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) {
        setState(() {});
      }
    });
    _profileFuture = _studentService.getProfile();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _refresh() async {
    // HapticFeedback.selectionClick();
    setState(() {
      _profileFuture = _studentService.getProfile();
    });
    await _profileFuture;
  }

  @override
  bool get wantKeepAlive => true;

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
            content: Text('Downloading document...'),
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

        final newUrl = await _studentService.uploadFile(
          imageFile.path,
          'profile_pic',
        );

        // Evict from cache ensuring we use the sanitized URL (same as UI)
        try {
          final sanitizedUrl = AppConstants.sanitizeUrl(newUrl);
          await CachedNetworkImage.evictFromCache(sanitizedUrl);
        } catch (e) {
          debugPrint("Failed to evict cache: $e");
        }

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Profile photo updated successfully')),
          );
          _refresh();
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
    super.build(context);
    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      appBar: AppBar(
        title: const Text(
          'Profile',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: AppConstants.backgroundColor,
        elevation: 0,
        scrolledUnderElevation: 0,
        foregroundColor: AppConstants.textPrimary,
        actions: [
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
      body: FutureBuilder<Map<String, dynamic>>(
        future: _profileFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Column(
              children: [
                LinearProgressIndicator(
                  color: AppConstants.primaryColor,
                  backgroundColor: Colors.transparent,
                ),
                Expanded(child: SizedBox()),
              ],
            );
          } else if (snapshot.hasError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 48, color: Colors.red),
                  const SizedBox(height: 16),
                  Text('Error: ${snapshot.error}'),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: _refresh,
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          } else if (!snapshot.hasData) {
            return const Center(child: Text('No profile data found.'));
          }

          final data = snapshot.data!;
          final socialLinks =
              data['social_links'] as Map<String, dynamic>? ?? {};

          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // --- Header Section ---
              Padding(
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
                            decoration: const BoxDecoration(
                              shape: BoxShape.circle,
                              color: AppConstants.primaryColor,
                            ),
                            child: ClipOval(
                              child:
                                  data['profile_photo_url'] != null &&
                                      data['profile_photo_url']
                                          .toString()
                                          .isNotEmpty
                                  ? CachedNetworkImage(
                                      key: ValueKey(data['profile_photo_url']),
                                      imageUrl: AppConstants.sanitizeUrl(
                                        data['profile_photo_url'],
                                      ),
                                      fit: BoxFit.cover,
                                      memCacheHeight: 300,
                                      placeholder: (context, url) =>
                                          const Center(
                                            child: CircularProgressIndicator(
                                              color: Colors.white,
                                              strokeWidth: 2,
                                            ),
                                          ),
                                      errorWidget: (context, url, error) {
                                        return const Icon(
                                          Icons.person,
                                          size: 60,
                                          color: Colors.white,
                                        );
                                      },
                                    )
                                  : const Icon(
                                      Icons.person,
                                      size: 60,
                                      color: Colors.white,
                                    ),
                            ),
                          ),
                          Positioned(
                            right: 0,
                            bottom: 0,
                            child: Container(
                              padding: const EdgeInsets.all(4),
                              decoration: const BoxDecoration(
                                color: Colors.white,
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
                                    color: Colors.white,
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
                                  color: AppConstants.textPrimary,
                                  fontSize: 22,
                                ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${_formatValue(data['register_number'])} | ${_formatValue(data['department'])}',
                            style: Theme.of(context).textTheme.bodyMedium
                                ?.copyWith(
                                  color: AppConstants.textSecondary,
                                  fontWeight: FontWeight.w500,
                                ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Batch ${_formatValue(data['batch_year'])} • ${_formatValue(data['student_type'])}',
                            style: Theme.of(context).textTheme.bodySmall
                                ?.copyWith(color: AppConstants.textSecondary),
                          ),
                          const SizedBox(height: 12),

                          if (socialLinks.isNotEmpty)
                            Row(
                              children: [
                                if (socialLinks.containsKey('linkedin') &&
                                    socialLinks['linkedin']
                                        .toString()
                                        .isNotEmpty)
                                  Padding(
                                    padding: const EdgeInsets.only(right: 8),
                                    child: IconButton(
                                      constraints: const BoxConstraints(),
                                      padding: EdgeInsets.zero,
                                      icon: const FaIcon(
                                        FontAwesomeIcons.linkedin,
                                        color: Color(0xFF0077B5),
                                        size: 22,
                                      ),
                                      tooltip: 'LinkedIn',
                                      onPressed: () => _launchURL(
                                        socialLinks['linkedin'].toString(),
                                      ),
                                    ),
                                  ),
                                if (socialLinks.containsKey('github') &&
                                    socialLinks['github'].toString().isNotEmpty)
                                  Padding(
                                    padding: const EdgeInsets.only(right: 8),
                                    child: IconButton(
                                      constraints: const BoxConstraints(),
                                      padding: EdgeInsets.zero,
                                      icon: const FaIcon(
                                        FontAwesomeIcons.github,
                                        color: Colors.black87,
                                        size: 22,
                                      ),
                                      tooltip: 'GitHub',
                                      onPressed: () => _launchURL(
                                        socialLinks['github'].toString(),
                                      ),
                                    ),
                                  ),
                                if (socialLinks.containsKey('leetcode') &&
                                    socialLinks['leetcode']
                                        .toString()
                                        .isNotEmpty)
                                  Padding(
                                    padding: const EdgeInsets.only(right: 8),
                                    child: IconButton(
                                      constraints: const BoxConstraints(),
                                      padding: EdgeInsets.zero,
                                      icon: const FaIcon(
                                        FontAwesomeIcons.code,
                                        color: Color(0xFFFFA116),
                                        size: 20,
                                      ),
                                      tooltip: 'LeetCode',
                                      onPressed: () => _launchURL(
                                        socialLinks['leetcode'].toString(),
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // --- Tab Section ---
              Expanded(child: _buildTabSection(data)),
            ],
          );
        },
      ),
    );
  }

  Widget _buildTabSection(Map<String, dynamic> data) {
    return Column(
      children: [
        Container(
          decoration: BoxDecoration(
            color: AppConstants.backgroundColor,
            border: Border(
              bottom: BorderSide(color: Colors.grey[200]!, width: 1),
            ),
          ),
          child: TabBar(
            controller: _tabController,
            labelColor: AppConstants.primaryColor,
            unselectedLabelColor: Colors.grey[500],
            indicatorColor: AppConstants.primaryColor,
            indicatorSize: TabBarIndicatorSize.label,
            labelStyle: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
            unselectedLabelStyle: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
            ),
            tabs: const [
              Tab(text: 'Personal'),
              Tab(text: 'Academic'),
              Tab(text: 'Placement'),
            ],
          ),
        ),
        // Use TabBarView for swipe support
        Expanded(
          child: TabBarView(
            controller: _tabController,
            children: [
              _buildScrollableTab(data, 0),
              _buildScrollableTab(data, 1),
              _buildScrollableTab(data, 2),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildScrollableTab(Map<String, dynamic> data, int index) {
    Widget content;
    switch (index) {
      case 0:
        content = _buildPersonalSection(context, data);
        break;
      case 1:
        content = _buildAcademicSection(data);
        break;
      case 2:
        content = _buildPlacementStats(data['placement_stats']);
        break;
      default:
        content = const SizedBox.shrink();
    }

    return KeepAlivePage(
      child: HapticRefreshIndicator(
        onRefresh: _refresh,
        color: AppConstants.primaryColor,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(24, 24, 24, 40),
          child: content,
        ),
      ),
    );
  }

  Widget _buildPersonalSection(
    BuildContext context,
    Map<String, dynamic> data,
  ) {
    final languageSkills = data['language_skills'] as List? ?? [];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Contact Details
        _buildSectionCard('Contact Details', [
          _buildDetailItem('Email', data['email']),
          _buildDetailItem('Mobile Number', data['mobile_number']),
        ]),

        // Address
        _buildSectionCard('Address', [
          _buildDetailItem('Address Line 1', data['address_line_1']),
          _buildDetailItem('Address Line 2', data['address_line_2']),
          _buildDetailItem('State', data['state']),
        ]),

        // Identity
        _buildSectionCard('Identity', [
          _buildDetailItem('Date of Birth', data['dob']),
          _buildDetailItem('Gender', data['gender']),
          _buildDetailItem('Aadhar Number', data['aadhar_number']),
          _buildDetailItem('PAN Number', data['pan_number']),
        ]),

        // Skills & Documents
        if (languageSkills.isNotEmpty ||
            (data['resume_url'] != null &&
                data['resume_url'].toString().isNotEmpty))
          _buildSectionCard('Skills & Documents', [
            if (languageSkills.isNotEmpty) ...[
              const Text(
                'Language Skills',
                style: TextStyle(
                  color: AppConstants.textSecondary,
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
                        backgroundColor: AppConstants.backgroundColor,
                        side: const BorderSide(color: AppConstants.borderColor),
                      ),
                    )
                    .toList(),
              ),
              if (data['resume_url'] != null &&
                  data['resume_url'].toString().isNotEmpty)
                const SizedBox(height: 16),
            ],
            if (data['resume_url'] != null &&
                data['resume_url'].toString().isNotEmpty)
              InkWell(
                onTap: () => _openDocument('resume'),
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: AppConstants.backgroundColor,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppConstants.borderColor),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.description,
                        color: AppConstants.primaryColor,
                        size: 20,
                      ),
                      SizedBox(width: 8),
                      Text(
                        'View Resume',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: AppConstants.textPrimary,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
          ]),

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
                      side: const BorderSide(color: AppConstants.borderColor),
                      foregroundColor: AppConstants.textPrimary,
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
                    onPressed: () async {
                      final result = await Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (context) =>
                              EditProfileScreen(profileData: data),
                        ),
                      );
                      if (result == true && mounted) {
                        _refresh();
                      }
                    },
                    icon: const Icon(Icons.edit_outlined),
                    label: const Text('Edit Profile'),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      side: const BorderSide(color: AppConstants.borderColor),
                      foregroundColor: AppConstants.textPrimary,
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
                          builder: (context) => const ChangePasswordScreen(),
                        ),
                      );
                    },
                    icon: const Icon(Icons.lock_outline),
                    label: const Text('Change Password'),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      side: const BorderSide(color: AppConstants.borderColor),
                      foregroundColor: AppConstants.textPrimary,
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
      ],
    );
  }

  Widget _buildAcademicSection(Map<String, dynamic> data) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 10th
        _buildSectionCard('10th Grade', [
          _buildDetailItem('Mark', '${_formatValue(data['tenth_mark'])}%'),
          _buildDetailItem('Board', data['tenth_board']),
          _buildDetailItem('Institution', data['tenth_institution']),
          _buildDetailItem('Year of Passing', data['tenth_year_pass']),
        ]),

        // 12th
        _buildSectionCard('12th Grade', [
          _buildDetailItem('Mark', '${_formatValue(data['twelfth_mark'])}%'),
          _buildDetailItem('Board', data['twelfth_board']),
          _buildDetailItem('Institution', data['twelfth_institution']),
          _buildDetailItem('Year of Passing', data['twelfth_year_pass']),
        ]),

        // Diploma (Only show if data exists/significant)
        if (_formatValue(data['diploma_mark']) != 'N/A' &&
            data['diploma_mark'] != 0)
          _buildSectionCard('Diploma', [
            _buildDetailItem('Mark', '${_formatValue(data['diploma_mark'])}%'),
            _buildDetailItem('Institution', data['diploma_institution']),
            _buildDetailItem('Year of Passing', data['diploma_year_pass']),
          ]),

        // UG
        _buildSectionCard('Undergraduate (UG)', [
          _buildDetailItem('CGPA', data['ug_cgpa']),
          const SizedBox(height: 12),
          const Text(
            'Semester GPAs',
            style: TextStyle(
              color: AppConstants.textSecondary,
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
        ]),

        // PG (Show if data valid or student type implies PG)
        // Adjust check: Show if PG CGPA is available OR Department Type is PG
        if (data['department_type'] == 'PG' ||
            (data['pg_cgpa'] != null && data['pg_cgpa'] > 0))
          _buildSectionCard('Postgraduate (PG)', [
            _buildDetailItem('CGPA', data['pg_cgpa']),
            const SizedBox(height: 12),
            const Text(
              'Semester GPAs',
              style: TextStyle(
                color: AppConstants.textSecondary,
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
                _buildGpaBadge('S5', data['pg_gpa_s5']),
                _buildGpaBadge('S6', data['pg_gpa_s6']),
                _buildGpaBadge('S7', data['pg_gpa_s7']),
                _buildGpaBadge('S8', data['pg_gpa_s8']),
              ],
            ),
          ]),

        // Backlogs
        _buildSectionCard('Backlogs & History', [
          _buildDetailItem('Current Backlogs', data['current_backlogs']),
          _buildDetailItem('History of Backlogs', data['history_of_backlogs']),
          _buildDetailItem('Gap Years', data['gap_years']),
          _buildDetailItem('Gap Reason', data['gap_reason']),
        ]),
      ],
    );
  }

  Widget _buildSectionCard(String title, List<Widget> children) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppConstants.borderRadius),
        border: Border.all(color: AppConstants.borderColor, width: 0),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: AppConstants.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          ...children,
        ],
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
              style: TextStyle(
                color: isEmpty ? Colors.grey[400] : AppConstants.textPrimary,
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
              ? AppConstants.textSecondary.withValues(alpha: 0.5)
              : AppConstants.textPrimary,
          fontWeight: isEmpty ? FontWeight.normal : FontWeight.w500,
        ),
      ),
      backgroundColor: isEmpty
          ? AppConstants.backgroundColor.withValues(alpha: 0.5)
          : AppConstants.backgroundColor,
      side: BorderSide(
        color: isEmpty
            ? AppConstants.borderColor.withValues(alpha: 0.5)
            : AppConstants.borderColor,
      ),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
    );
  }

  Widget _buildPlacementStats(Map<String, dynamic>? stats) {
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
            _buildStatCard('Offers', stats['offers_received'], Colors.orange),
            _buildStatCard('Opted Out', optedOut, Colors.grey),
            _buildStatCard('No Action', noAction, Colors.red),
          ],
        ),
        const SizedBox(height: 24),
      ],
    );
  }

  Widget _buildStatCard(String title, dynamic value, MaterialColor color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color[50], // using bracket notation for MaterialColor shades
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color[100]!),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            value?.toString() ?? '0',
            style: GoogleFonts.geist(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: color[800],
            ),
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: GoogleFonts.geist(
              fontSize: 13,
              color: color[700],
              fontWeight: FontWeight.w600,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
