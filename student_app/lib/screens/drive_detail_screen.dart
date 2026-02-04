import 'package:flutter/material.dart';
import 'package:flutter/services.dart'; // For HapticFeedback
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'dart:io'; // Add import
import 'package:http/http.dart' as http; // Add import
import 'package:path_provider/path_provider.dart'; // Add import
import 'package:open_filex/open_filex.dart'; // Add import
import '../utils/constants.dart';
import '../utils/formatters.dart'; // [NEW]
import '../../providers/drive_provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:url_launcher/url_launcher.dart'; // Add import

class DriveDetailScreen extends ConsumerStatefulWidget {
  final Map<String, dynamic> drive;

  const DriveDetailScreen({super.key, required this.drive});

  @override
  ConsumerState<DriveDetailScreen> createState() => _DriveDetailScreenState();
}

class _DriveDetailScreenState extends ConsumerState<DriveDetailScreen> {
  late String _userStatus;
  List<int> _selectedRoleIds = [];

  @override
  void initState() {
    super.initState();
    _userStatus = widget.drive['user_status'] ?? '';

    // Initialize selected roles if already applied
    if (widget.drive['user_applied_role_ids'] != null) {
      _selectedRoleIds = List<int>.from(
        (widget.drive['user_applied_role_ids'] as List).map((e) => e as int),
      );
    }
  }

  Future<void> _handleOptIn() async {
    HapticFeedback.selectionClick();

    // 1. Validation: If roles exist, at least one must be selected
    final List roles = widget.drive['roles'] ?? [];
    if (roles.isNotEmpty && _selectedRoleIds.isEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Please select at least one job role.'),
            backgroundColor: Colors.orange,
          ),
        );
      }
      return;
    }

    // 2. T&C Dialog
    final confirmed = await _showTnCDialog();
    if (confirmed != true) return;

    try {
      final driveService = ref.read(driveServiceProvider);
      // Pass selected roles (can be empty list if no roles defined)
      await driveService.applyForDrive(
        widget.drive['id'],
        roleIds: _selectedRoleIds.isNotEmpty ? _selectedRoleIds : null,
      );

      setState(() {
        _userStatus = 'opted_in';
      });
      ref.invalidate(driveListProvider);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Successfully applied!'),
            backgroundColor: AppConstants.successColor,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed to opt in: $e')));
      }
    }
  }

  Future<bool?> _showTnCDialog() {
    return showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Terms & Conditions'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: const [
              Text(
                'By applying for this drive, you agree to the following terms:',
              ),
              SizedBox(height: 10),
              Text('1. You meet all the eligibility criteria mentioned.'),
              Text(
                '2. You will attend the valid selection process if shortlisted.',
              ),
              Text(
                '3. Any false information provided will lead to disqualification.',
              ),
              Text('4. You accept the Placement Policy of the institution.'),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppConstants.primaryColor,
            ),
            child: const Text(
              'Accept & Apply',
              style: TextStyle(color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _handleOptOut() async {
    HapticFeedback.selectionClick();

    // 1. Reason Dialog
    final reason = await _showOptOutDialog();
    if (reason == null) return; // Cancelled

    try {
      final driveService = ref.read(driveServiceProvider);
      await driveService.withdrawFromDrive(widget.drive['id'], reason: reason);

      setState(() {
        _userStatus = 'opted_out';
        _selectedRoleIds = []; // Clear selection on opt out
      });
      ref.invalidate(driveListProvider);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Successfully opted out.')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed to opt out: $e')));
      }
    }
  }

  Future<String?> _showOptOutDialog() {
    String? selectedReason;
    final otherReasonController = TextEditingController();
    final List<String> reasons = [
      'Not Interested',
      'Got Better Offer',
      'Higher Studies',
      'Location Constraints',
      'Salary Expectations',
      'Health Issues',
      'Other',
    ];

    return showDialog<String>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) {
          return AlertDialog(
            title: const Text('Withdraw Application'),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    'Are you sure you want to withdraw? Please select a reason:',
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String>(
                    decoration: const InputDecoration(
                      border: OutlineInputBorder(),
                      contentPadding: EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 8,
                      ),
                      labelText: 'Reason',
                    ),
                    initialValue: selectedReason,
                    items: reasons.map((reason) {
                      return DropdownMenuItem(
                        value: reason,
                        child: Text(reason),
                      );
                    }).toList(),
                    onChanged: (val) {
                      setState(() {
                        selectedReason = val;
                      });
                    },
                  ),
                  if (selectedReason == 'Other') ...[
                    const SizedBox(height: 12),
                    TextField(
                      controller: otherReasonController,
                      decoration: const InputDecoration(
                        hintText: 'Please specify...',
                        border: OutlineInputBorder(),
                      ),
                      maxLines: 2,
                    ),
                  ],
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancel'),
              ),
              TextButton(
                onPressed: () {
                  if (selectedReason == null) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Please select a reason')),
                    );
                    return;
                  }
                  String finalReason = selectedReason!;
                  if (selectedReason == 'Other') {
                    if (otherReasonController.text.trim().isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Please specify the reason'),
                        ),
                      );
                      return;
                    }
                    finalReason = "Other: ${otherReasonController.text.trim()}";
                  }
                  Navigator.pop(context, finalReason);
                },
                child: const Text(
                  'Withdraw',
                  style: TextStyle(color: Colors.red),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Future<void> _launchUrl(String url) async {
    String launchUrlStr = AppConstants.sanitizeUrl(url);
    if (!launchUrlStr.startsWith('http://') &&
        !launchUrlStr.startsWith('https://')) {
      launchUrlStr = 'https://$launchUrlStr';
    }
    final Uri uri = Uri.parse(launchUrlStr);
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Could not open link: $url')));
      }
    }
  }

  Future<void> _openAttachment(String url, String fileName) async {
    try {
      if (mounted) {
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Opening document...'),
            duration: Duration(seconds: 1), // Short duration
          ),
        );
      }

      final validUrl = AppConstants.sanitizeUrl(url);
      final response = await http.get(Uri.parse(validUrl));

      if (response.statusCode != 200) {
        throw 'Failed to download (Status: ${response.statusCode})';
      }

      final tempDir = await getTemporaryDirectory();
      // Use logical filename logic equivalent to profile screen if needed,
      // but here we trust fileName from backend or derive from url/header
      final file = File('${tempDir.path}/$fileName');

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

  Widget _buildDetailCard(String title, Widget content) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 20),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppConstants.borderColor, width: 0),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
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
          const SizedBox(height: 16),
          content,
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final drive = widget.drive;
    final bool isExpired = DateTime.parse(
      drive['deadline_date'],
    ).isBefore(DateTime.now());

    final bool hasJobDescription =
        drive['job_description'] != null &&
        drive['job_description'].toString().isNotEmpty;

    return Scaffold(
      backgroundColor: const Color(
        0xFFFAFAFA,
      ), // Slightly off-white for card contrast
      appBar: AppBar(
        title: const Text('Drive Details'),
        backgroundColor: Colors.white,
        foregroundColor: AppConstants.textPrimary,
        elevation: 0,
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildHeader(drive),
                  const SizedBox(height: 24),
                  if (drive['roles'] != null &&
                      (drive['roles'] as List).isNotEmpty)
                    _buildDetailCard(
                      'Available Roles',
                      _buildRolesContent(drive),
                    ),

                  if (hasJobDescription)
                    _buildDetailCard(
                      'Job Description',
                      Text(
                        drive['job_description'],
                        style: const TextStyle(
                          height: 1.5,
                          color: Colors.black87,
                        ),
                      ),
                    ),

                  _buildKeyDetails(drive),
                  _buildCompensation(drive),
                  _buildEligibility(drive),
                  _buildRounds(drive),
                  _buildAttachments(drive),
                  _buildSpocDetails(drive),

                  const SizedBox(height: 12),
                  _buildActionButtons(isExpired),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRolesContent(Map<String, dynamic> drive) {
    final roles = drive['roles'] as List;
    final bool isEditable =
        _userStatus != 'opted_in' &&
        _userStatus != 'shortlisted' &&
        _userStatus != 'placed';

    return Column(
      children: roles.map<Widget>((role) {
        final int roleId = role['id'];
        final bool isSelected = _selectedRoleIds.contains(roleId);

        return Column(
          children: [
            CheckboxListTile(
              value: isSelected,
              enabled: isEditable,
              onChanged: (val) {
                setState(() {
                  if (val == true) {
                    _selectedRoleIds.add(roleId);
                  } else {
                    _selectedRoleIds.remove(roleId);
                  }
                });
              },
              title: Text(
                role['role_name'] ?? 'Unknown Role',
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (role['ctc'] != null)
                    Text(
                      'CTC: ${role['ctc']}',
                      style: TextStyle(color: Colors.grey[600], fontSize: 12),
                    ),
                ],
              ),
              activeColor: AppConstants.primaryColor,
              controlAffinity: ListTileControlAffinity.leading,
              contentPadding: EdgeInsets.zero,
            ),
            if (role != roles.last) Divider(height: 1, color: Colors.grey[200]),
          ],
        );
      }).toList(),
    );
  }

  Widget _buildHeader(Map<String, dynamic> drive) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Company Logo
        Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            color: Colors.grey[100],
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey[200]!),
          ),
          child:
              drive['logo_url'] != null &&
                  drive['logo_url'].toString().isNotEmpty
              ? ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: CachedNetworkImage(
                    imageUrl: AppConstants.sanitizeUrl(drive['logo_url']),
                    fit: BoxFit.cover,
                    placeholder: (context, url) => const Center(
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                    errorWidget: (context, url, error) => const Icon(
                      Icons.business,
                      size: 40,
                      color: Colors.grey,
                    ),
                  ),
                )
              : const Icon(Icons.business, size: 40, color: Colors.grey),
        ),
        const SizedBox(width: 16),

        // Details
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                drive['company_name'] ?? 'Unknown Company',
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: AppConstants.textPrimary,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                _getRolesText(drive),
                style: const TextStyle(
                  fontSize: 16,
                  color: AppConstants.textSecondary,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: AppConstants.primaryColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      drive['drive_type'] ?? 'Drive',
                      style: const TextStyle(
                        color: AppConstants.primaryColor,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ),
                  _buildStatusBadge(_userStatus),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  // Restore _buildWebsiteRow
  Widget _buildWebsiteRow(String url) {
    String displayUrl = url;
    try {
      var uri = Uri.parse(AppConstants.sanitizeUrl(url));
      if (!uri.hasScheme) {
        uri = Uri.parse('https://${AppConstants.sanitizeUrl(url)}');
      }
      if (uri.host.isNotEmpty) {
        displayUrl = uri.host;
      }
    } catch (_) {}

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(
            Icons.language,
            size: 20,
            color: AppConstants.textSecondary,
          ),
          const SizedBox(width: 12),
          const SizedBox(
            width: 100,
            child: Text(
              'Website',
              style: TextStyle(color: AppConstants.textSecondary),
            ),
          ),
          Expanded(
            child: InkWell(
              onTap: () => _launchUrl(url),
              child: Text(
                displayUrl,
                style: const TextStyle(
                  fontWeight: FontWeight.w500,
                  color: Colors.blue,
                  decoration: TextDecoration.underline,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _getRolesText(Map<String, dynamic> drive) {
    final roles = drive['roles'] as List? ?? [];
    if (roles.isEmpty) return 'No Roles Specified';
    if (roles.length == 1) return roles.first['role_name'] ?? 'Unknown Role';
    return '${roles.length} Roles Available';
  }

  Widget _buildStatusBadge(String status) {
    String label;
    Color color;
    IconData icon;

    switch (status) {
      case 'opted_in':
        label = 'Applied';
        color = AppConstants.successColor;
        icon = Icons.check_circle_outline;
        break;
      case 'opted_out':
        label = 'Opted Out';
        color = Colors.orange;
        icon = Icons.cancel_outlined;
        break;
      case 'shortlisted':
        label = 'Shortlisted';
        color = Colors.blue;
        icon = Icons.star_outline;
        break;
      case 'rejected':
        label = 'Rejected';
        color = Colors.red;
        icon = Icons.cancel;
        break;
      case 'placed':
        label = 'Placed';
        color = Colors.green[800]!;
        icon = Icons.verified;
        break;
      default:
        label = 'Eligible';
        color = Colors.blueGrey;
        icon = Icons.info_outline;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        border: Border.all(color: color.withValues(alpha: 0.5)),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 18, color: color),
          const SizedBox(width: 8),
          Text(
            label,
            style: TextStyle(color: color, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }

  Widget _buildKeyDetails(Map<String, dynamic> drive) {
    return _buildDetailCard(
      'Key Details',
      Column(
        children: [
          if (drive['website'] != null &&
              drive['website'].toString().isNotEmpty)
            _buildWebsiteRow(drive['website']),
          _buildDetailRow(
            Icons.location_on_outlined,
            'Location',
            '${drive['location'] ?? 'Varies'} (${drive['location_type'] ?? 'On-Site'})',
          ),
          _buildDetailRow(
            Icons.calendar_today,
            'Event Date',
            Formatters.formatDateTime(drive['drive_date']),
          ),
          _buildDetailRow(
            Icons.timer_outlined,
            'Deadline',
            Formatters.formatDateTime(drive['deadline_date']),
          ),
        ],
      ),
    );
  }

  Widget _buildCompensation(Map<String, dynamic> drive) {
    final roles = drive['roles'] as List? ?? [];
    if (roles.isEmpty) return const SizedBox.shrink();
    final ctcs = roles
        .map((r) => r['ctc'])
        .where((c) => c != null && c.toString().isNotEmpty)
        .toSet()
        .toList();
    if (ctcs.isEmpty) return const SizedBox.shrink();

    return _buildDetailCard(
      'Compensation',
      Column(
        children: [
          _buildDetailRow(
            Icons.currency_rupee,
            'Package (CTC)',
            ctcs.length == 1 ? ctcs.first : 'Refer to Roles',
          ),
        ],
      ),
    );
  }

  Widget _buildEligibility(Map<String, dynamic> drive) {
    return _buildDetailCard(
      'Eligibility Criteria',
      Column(
        children: [
          _buildDetailRow(
            Icons.school_outlined,
            'Min CGPA',
            '${drive['min_cgpa'] ?? 0} CGPA',
          ),
          if (drive['tenth_percentage'] != null &&
              drive['tenth_percentage'] > 0)
            _buildDetailRow(
              Icons.percent,
              '10th %',
              '${drive['tenth_percentage']}%',
            ),
          if (drive['twelfth_percentage'] != null &&
              drive['twelfth_percentage'] > 0)
            _buildDetailRow(
              Icons.percent,
              '12th %',
              '${drive['twelfth_percentage']}%',
            ),
          if (drive['ug_min_cgpa'] != null && drive['ug_min_cgpa'] > 0)
            _buildDetailRow(
              Icons.school,
              'UG Min CGPA',
              '${drive['ug_min_cgpa']}',
            ),
          if (drive['pg_min_cgpa'] != null && drive['pg_min_cgpa'] > 0)
            _buildDetailRow(
              Icons.school,
              'PG Min CGPA',
              '${drive['pg_min_cgpa']}',
            ),
          _buildDetailRow(
            Icons.block,
            'Max Backlogs',
            '${drive['max_backlogs_allowed']}',
          ),
          if (drive['eligible_batches'] != null)
            _buildDetailRow(
              Icons.calendar_view_day,
              'Batches',
              (drive['eligible_batches'] as List).join(', '),
            ),
          if (drive['eligible_departments'] != null)
            _buildDetailRow(
              Icons.account_tree_outlined,
              'Depts',
              (drive['eligible_departments'] as List).join(', '),
            ),
        ],
      ),
    );
  }

  Widget _buildRounds(Map<String, dynamic> drive) {
    if (drive['rounds'] == null || (drive['rounds'] as List).isEmpty) {
      return const SizedBox.shrink();
    }
    return _buildDetailCard(
      'Interview Rounds',
      Column(
        children: (drive['rounds'] as List)
            .map(
              (r) => Padding(
                padding: const EdgeInsets.only(bottom: 8.0),
                child: Row(
                  children: [
                    const Icon(
                      Icons.check_circle_outline,
                      size: 16,
                      color: AppConstants.textSecondary,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '${r['name']} (${Formatters.formatDateTime(r['date'])})',
                        style: const TextStyle(fontSize: 14),
                      ),
                    ),
                  ],
                ),
              ),
            )
            .toList(),
      ),
    );
  }

  Widget _buildAttachments(Map<String, dynamic> drive) {
    if (drive['attachments'] == null ||
        (drive['attachments'] as List).isEmpty) {
      return const SizedBox.shrink();
    }
    return _buildDetailCard(
      'Attachments',
      Column(
        children: (drive['attachments'] as List)
            .map(
              (a) => Container(
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: Colors.grey[50],
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.grey[200]!),
                ),
                child: InkWell(
                  onTap: () => _openAttachment(a['url'], a['name']),
                  borderRadius: BorderRadius.circular(8),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.attachment,
                          color: Colors.blue,
                          size: 20,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            a['name'],
                            style: const TextStyle(fontWeight: FontWeight.w500),
                          ),
                        ),
                        const Icon(
                          Icons.open_in_new,
                          color: Colors.grey,
                          size: 16,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            )
            .toList(),
      ),
    );
  }

  Widget _buildSpocDetails(Map<String, dynamic> drive) {
    String spocName = drive['spoc_name'] ?? '';
    String spocDesignation = drive['spoc_designation'] ?? '';
    if (spocName.isEmpty) return const SizedBox.shrink();

    return _buildDetailCard(
      'Contact Person (SPOC)',
      Row(
        children: [
          CircleAvatar(
            backgroundColor: Colors.blue.shade100,
            child: Icon(Icons.person, color: Colors.blue.shade800),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                spocName,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
              if (spocDesignation.isNotEmpty)
                Text(
                  spocDesignation,
                  style: const TextStyle(
                    color: AppConstants.textSecondary,
                    fontSize: 13,
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildActionButtons(bool isExpired) {
    if (isExpired) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.red[50],
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Text(
          'Application Closed',
          textAlign: TextAlign.center,
          style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold),
        ),
      );
    }
    return Row(
      children: [
        // Opt Out Button
        Expanded(
          child: GestureDetector(
            onTap: () {
              if (_userStatus != 'opted_out') {
                _handleOptOut();
              }
            },
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              curve: Curves.easeInOut,
              height: 50,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: _userStatus == 'opted_out'
                    ? AppConstants.primaryColor
                    : Colors.white,
                border: Border.all(
                  color: AppConstants.primaryColor,
                  width: 1.5,
                ),
                borderRadius: BorderRadius.circular(
                  _userStatus == 'opted_out' ? 30 : 10,
                ),
              ),
              child: Text(
                'Opt Out',
                style: TextStyle(
                  color: _userStatus == 'opted_out'
                      ? Colors.white
                      : AppConstants.primaryColor,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
        ),
        const SizedBox(width: 16),
        // Opt In Button
        Expanded(
          child: GestureDetector(
            onTap: () {
              if (_userStatus != 'opted_in') {
                _handleOptIn();
              }
            },
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              curve: Curves.easeInOut,
              height: 50,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: _userStatus == 'opted_in'
                    ? AppConstants.primaryColor
                    : Colors.white,
                border: Border.all(
                  color: AppConstants.primaryColor,
                  width: 1.5,
                ),
                borderRadius: BorderRadius.circular(
                  _userStatus == 'opted_in' ? 30 : 10,
                ),
              ),
              child: Text(
                'Opt In',
                style: TextStyle(
                  color: _userStatus == 'opted_in'
                      ? Colors.white
                      : AppConstants.primaryColor,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDetailRow(IconData icon, String label, String? value) {
    if (value == null || value.isEmpty || value == '0' || value == '0.0') {
      return const SizedBox.shrink();
    }
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: AppConstants.textSecondary),
          const SizedBox(width: 12),
          SizedBox(
            width: 100,
            child: Text(
              label,
              style: const TextStyle(color: AppConstants.textSecondary),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontWeight: FontWeight.w500),
            ),
          ),
        ],
      ),
    );
  }
}
