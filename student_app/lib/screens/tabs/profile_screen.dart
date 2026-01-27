import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../providers/auth_provider.dart';
import '../../services/student_service.dart';
import '../../utils/constants.dart';
import '../edit_profile_screen.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  final StudentService _studentService = StudentService();
  late Future<Map<String, dynamic>> _profileFuture;

  @override
  void initState() {
    super.initState();
    _profileFuture = _studentService.getProfile();
  }

  Future<void> _refresh() async {
    setState(() {
      _profileFuture = _studentService.getProfile();
    });
    await _profileFuture;
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
      // Show loading
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Loading document...'),
            duration: Duration(seconds: 1),
          ),
        );
      }

      // Fetch presigned URL from backend
      final presignedURL = await _studentService.getDocumentURL(documentType);

      // Launch the presigned URL directly - DO NOT sanitize/modify presigned URLs
      // as they contain signed query parameters that will become invalid if changed
      if (presignedURL.isEmpty) return;

      final Uri uri = Uri.parse(presignedURL);
      try {
        if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
          throw 'Could not launch $presignedURL';
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Could not launch document: $e')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed to open document: $e')));
      }
    }
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
      backgroundColor: AppConstants.backgroundColor,
      appBar: AppBar(
        title: const Text(
          'My Profile',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: AppConstants.backgroundColor,
        elevation: 0,
        scrolledUnderElevation: 0,
        foregroundColor: AppConstants.textPrimary,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_rounded, color: Colors.red),
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
      body: RefreshIndicator(
        onRefresh: _refresh,
        color: AppConstants.primaryColor,
        child: FutureBuilder<Map<String, dynamic>>(
          future: _profileFuture,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            } else if (snapshot.hasError) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(
                      Icons.error_outline,
                      size: 48,
                      color: Colors.red,
                    ),
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
            final languageSkills = data['language_skills'] as List? ?? [];

            return SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header Section
                  Center(
                    child: Column(
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
                                ? Image.network(
                                    AppConstants.sanitizeUrl(
                                      data['profile_photo_url'],
                                    ),
                                    fit: BoxFit.cover,
                                    errorBuilder: (context, error, stackTrace) {
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
                        const SizedBox(height: 16),
                        Text(
                          _formatValue(data['full_name']),
                          style: Theme.of(context).textTheme.headlineSmall
                              ?.copyWith(
                                fontWeight: FontWeight.bold,
                                color: AppConstants.textPrimary,
                              ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${_formatValue(data['register_number'])} | ${_formatValue(data['department'])}',
                          style: Theme.of(context).textTheme.bodyMedium
                              ?.copyWith(color: AppConstants.textSecondary),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Batch ${_formatValue(data['batch_year'])} • ${_formatValue(data['student_type'])}',
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(color: AppConstants.textSecondary),
                        ),
                        const SizedBox(height: 16),
                        // Social Icons
                        if (socialLinks.isNotEmpty)
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              if (socialLinks.containsKey('linkedin'))
                                IconButton(
                                  icon: const Icon(Icons.business_center),
                                  color: Colors.blue[700],
                                  tooltip: 'LinkedIn',
                                  onPressed: () => _launchURL(
                                    socialLinks['linkedin'].toString(),
                                  ),
                                ),
                              if (socialLinks.containsKey('github'))
                                IconButton(
                                  icon: const Icon(Icons.code),
                                  color: Colors.black87,
                                  tooltip: 'GitHub',
                                  onPressed: () => _launchURL(
                                    socialLinks['github'].toString(),
                                  ),
                                ),
                            ],
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Edit Profile Button
                  Center(
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
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 8,
                        ),
                        side: const BorderSide(
                          color: AppConstants.primaryColor,
                        ),
                        foregroundColor: AppConstants.primaryColor,
                        shape: const RoundedRectangleBorder(
                          borderRadius: BorderRadius.all(Radius.circular(8)),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 32),

                  // Personal Details
                  _buildSectionHeader('Personal Details'),
                  _buildDetailItem('Email', data['email']),
                  _buildDetailItem('Mobile Number', data['mobile_number']),
                  _buildDetailItem('Date of Birth', data['dob']),
                  _buildDetailItem('Gender', data['gender']),
                  _buildDetailItem('City', data['city']),
                  _buildDetailItem('State', data['state']),
                  if (data['about_me'] != null &&
                      data['about_me'].toString().isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'About Me',
                            style: TextStyle(
                              color: AppConstants.textSecondary,
                              fontSize: 14,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _formatValue(data['about_me']),
                            style: const TextStyle(
                              color: AppConstants.textPrimary,
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ),
                    ),
                  if (languageSkills.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
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
                                    backgroundColor:
                                        AppConstants.backgroundColor,
                                    side: const BorderSide(
                                      color: AppConstants.borderColor,
                                    ),
                                  ),
                                )
                                .toList(),
                          ),
                        ],
                      ),
                    ),

                  const SizedBox(height: 24),

                  // Academic Details
                  _buildSectionHeader('Academic Details'),
                  _buildDetailItem(
                    '10th Mark',
                    '${_formatValue(data['tenth_mark'])}%',
                  ),
                  _buildDetailItem(
                    '12th Mark',
                    '${_formatValue(data['twelfth_mark'])}%',
                  ),
                  if ((data['diploma_mark'] ?? 0.0) > 0)
                    _buildDetailItem(
                      'Diploma Mark',
                      '${_formatValue(data['diploma_mark'])}%',
                    ),
                  _buildDetailItem('UG CGPA', _formatValue(data['ug_cgpa'])),
                  if ((data['pg_cgpa'] ?? 0.0) > 0)
                    _buildDetailItem('PG CGPA', _formatValue(data['pg_cgpa'])),
                  _buildDetailItem(
                    'Current Backlogs',
                    _formatValue(data['current_backlogs']),
                  ),
                  _buildDetailItem(
                    'History of Backlogs',
                    _formatValue(data['history_of_backlogs']),
                  ),
                  if ((data['gap_years'] ?? 0) > 0) ...[
                    _buildDetailItem(
                      'Gap Years',
                      _formatValue(data['gap_years']),
                    ),
                    _buildDetailItem(
                      'Gap Reason',
                      _formatValue(data['gap_reason']),
                    ),
                  ],
                  _buildDetailItem(
                    'Placement Willingness',
                    _formatValue(data['placement_willingness']),
                  ),

                  const SizedBox(height: 24),

                  // Documents
                  _buildSectionHeader('Documents'),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      if (data['resume_url'] != null &&
                          data['resume_url'].toString().isNotEmpty)
                        _buildDocumentChip('Resume', 'resume'),
                      if (data['aadhar_card_url'] != null &&
                          data['aadhar_card_url'].toString().isNotEmpty)
                        _buildDocumentChip('Aadhar Card', 'aadhar'),
                      if (data['pan_card_url'] != null &&
                          data['pan_card_url'].toString().isNotEmpty)
                        _buildDocumentChip('PAN Card', 'pan'),
                    ],
                  ),
                  if ((data['resume_url'] ?? '').toString().isEmpty &&
                      (data['aadhar_card_url'] ?? '').toString().isEmpty &&
                      (data['pan_card_url'] ?? '').toString().isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 8),
                      child: Text(
                        'No documents uploaded yet',
                        style: TextStyle(
                          color: AppConstants.textSecondary,
                          fontSize: 14,
                          fontStyle: FontStyle.italic,
                        ),
                      ),
                    ),

                  const SizedBox(height: 48),

                  // Change Password Button
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text(
                              'Change Password functionality coming soon',
                            ),
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
                  const SizedBox(height: 24),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: AppConstants.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          const Divider(height: 1, color: AppConstants.borderColor),
        ],
      ),
    );
  }

  Widget _buildDetailItem(String label, dynamic value) {
    final displayValue = _formatValue(value);
    // Skip rendering if N/A with % or just %
    if (displayValue == 'N/A%' ||
        displayValue == '%' ||
        displayValue == 'N/A') {
      return const SizedBox.shrink();
    }

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 2,
            child: Text(
              label,
              style: const TextStyle(
                color: AppConstants.textSecondary,
                fontSize: 14,
              ),
            ),
          ),
          Expanded(
            flex: 3,
            child: Text(
              displayValue,
              style: const TextStyle(
                color: AppConstants.textPrimary,
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDocumentChip(String label, String documentType) {
    return ActionChip(
      avatar: const Icon(Icons.description_outlined, size: 16),
      label: Text(label),
      onPressed: () => _openDocument(documentType),
      side: const BorderSide(color: AppConstants.borderColor),
      backgroundColor: Colors.transparent,
    );
  }
}
