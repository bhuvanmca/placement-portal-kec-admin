import 'package:flutter/material.dart';
// For HapticFeedback
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:open_filex/open_filex.dart';
import '../utils/constants.dart';
import '../utils/formatters.dart';
import '../../providers/drive_provider.dart';
import '../services/drive_service.dart';
import '../services/api_client.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:url_launcher/url_launcher.dart';
import '../providers/auth_provider.dart';

class DriveDetailScreen extends ConsumerStatefulWidget {
  final Map<String, dynamic> drive;

  const DriveDetailScreen({super.key, required this.drive});

  @override
  ConsumerState<DriveDetailScreen> createState() => _DriveDetailScreenState();
}

class _DriveDetailScreenState extends ConsumerState<DriveDetailScreen> {
  late String _userStatus;
  late bool _isEligible;
  List<int> _selectedRoleIds = [];

  @override
  void initState() {
    super.initState();
    _userStatus = widget.drive['user_status'] ?? '';
    _isEligible = widget.drive['is_eligible'] == true;

    // Initialize selected roles if already applied
    if (widget.drive['user_applied_role_ids'] != null) {
      _selectedRoleIds = List<int>.from(
        (widget.drive['user_applied_role_ids'] as List).map((e) => e as int),
      );
    }
  }

  Future<void> _handleRequestToAttend() async {
    // Validation: If roles exist, at least one must be selected
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

    try {
      final driveService = DriveService(ref.read(apiClientProvider));
      await driveService.requestToAttend(
        widget.drive['id'],
        roleIds: _selectedRoleIds.isNotEmpty ? _selectedRoleIds : null,
      );
      if (mounted) {
        setState(() {
          _userStatus = 'request_to_attend';
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Request submitted! Admin will be notified.'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to submit request: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _handleOptIn() async {
    // HapticFeedback.selectionClick();

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

    // 2. Direct Opt-In (No T&C Dialog anymore per user request)

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

  Future<void> _handleOptOut() async {
    // HapticFeedback.selectionClick();

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
      final token = await ref.read(authServiceProvider).getToken();

      final response = await http.get(
        Uri.parse(validUrl),
        headers: token != null ? {'Authorization': 'Bearer $token'} : null,
      );

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
          const SizedBox(height: 12),
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
      backgroundColor: Theme.of(context).brightness == Brightness.dark
          ? Theme.of(context).scaffoldBackgroundColor
          : const Color(0xFFFAFAFA), // Slightly off-white for card contrast
      appBar: AppBar(
        title: const Text(
          'Drive Details',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        foregroundColor: Theme.of(context).brightness == Brightness.dark
            ? Colors.white
            : Colors.black,
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
                        style: TextStyle(
                          height: 1.5,
                          color:
                              (Theme.of(context).textTheme.bodyMedium?.color ??
                              Colors.black87),
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
              activeColor: Theme.of(context).colorScheme.primary,
              controlAffinity: ListTileControlAffinity.leading,
              contentPadding: EdgeInsets.zero,
            ),
            if (role != roles.last)
              Divider(
                height: 1,
                color: (Theme.of(context).brightness == Brightness.dark
                    ? Colors.grey[800]
                    : Colors.grey[200]),
              ),
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
          width: 60,
          height: 60,
          decoration: BoxDecoration(
            color: (Theme.of(context).brightness == Brightness.dark
                ? Colors.grey[800]
                : Colors.grey[200]),
            borderRadius: BorderRadius.circular(12),
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
                    errorWidget: (context, url, error) =>
                        const Icon(Icons.business, color: Colors.grey),
                  ),
                )
              : const Icon(Icons.business, color: Colors.grey),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                drive['company_name'] ?? 'Unknown Company',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color:
                      (Theme.of(context).textTheme.bodyLarge?.color ??
                      Colors.black),
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
                      color: Theme.of(
                        context,
                      ).colorScheme.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      drive['drive_type'] ?? 'Drive',
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.primary,
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
          Icon(
            Icons.language,
            size: 20,
            color:
                (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.grey),
          ),
          const SizedBox(width: 12),
          SizedBox(
            width: 100,
            child: Text(
              'Website',
              style: TextStyle(
                color:
                    (Theme.of(context).textTheme.bodyMedium?.color ??
                    Colors.grey),
              ),
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

  Widget _buildStatusBadge(String status) {
    String label;
    Color color;
    IconData icon;

    switch (status) {
      case 'opted_in':
        label = 'Applied';
        color = const Color(0xFF10B981);
        icon = Icons.check_circle_outline;
        break;
      case 'opted_out':
        label = 'Opted Out';
        color = const Color(0xFF6B7280);
        icon = Icons.cancel_outlined;
        break;
      case 'shortlisted':
        label = 'Shortlisted';
        color = const Color(0xFFF59E0B);
        icon = Icons.star_outline;
        break;
      case 'rejected':
        label = 'Rejected';
        color = const Color(0xFFEF4444);
        icon = Icons.cancel;
        break;
      case 'placed':
        label = 'Placed';
        color = const Color(0xFF059669);
        icon = Icons.verified;
        break;
      case 'request_to_attend':
        label = 'Requested';
        color = const Color(0xFF002147);
        icon = Icons.pending_outlined;
        break;
      default:
        if (_isEligible) {
          label = 'Eligible';
          color = const Color(0xFF10B981);
          icon = Icons.check_circle_outline;
        } else {
          label = 'Not Eligible';
          color = const Color(0xFFEF4444);
          icon = Icons.block;
        }
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withValues(alpha: 0.25), width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 12,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.3,
            ),
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
            Formatters.formatDateOnly(drive['drive_date']),
          ),
          _buildDetailRow(
            Icons.timer_outlined,
            'Deadline',
            '${Formatters.formatDateOnly(drive['deadline_date'])} (${Formatters.timeUntil(drive['deadline_date'])})',
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
              '10th',
              '${drive['tenth_percentage']}',
            ),
          if (drive['twelfth_percentage'] != null &&
              drive['twelfth_percentage'] > 0)
            _buildDetailRow(
              Icons.percent,
              '12th',
              '${drive['twelfth_percentage']}',
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
                    Icon(
                      Icons.check_circle_outline,
                      size: 16,
                      color:
                          (Theme.of(context).textTheme.bodyMedium?.color ??
                          Colors.grey),
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
                  color: Theme.of(context).brightness == Brightness.dark
                      ? Colors.grey.shade900
                      : Colors.grey[50],
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: (Theme.of(context).brightness == Brightness.dark
                        ? Colors.grey[800]
                        : Colors.grey[200])!,
                  ),
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
                  style: TextStyle(
                    color:
                        (Theme.of(context).textTheme.bodyMedium?.color ??
                        Colors.grey),
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
    if (_userStatus == 'placed') {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.green.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: Colors.green.withValues(alpha: 0.3)),
        ),
        child: const Text(
          'You are Placed in this Drive!',
          textAlign: TextAlign.center,
          style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold),
        ),
      );
    }

    if (isExpired) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.red.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(10),
        ),
        child: const Text(
          'Application Closed',
          textAlign: TextAlign.center,
          style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold),
        ),
      );
    }

    // If student is NOT eligible natively, handle the special Request flow states
    if (!_isEligible) {
      if (_userStatus == 'request_to_attend') {
        return Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Text(
            'Request Submitted — Awaiting Approval',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Theme.of(context).colorScheme.primary,
              fontWeight: FontWeight.bold,
            ),
          ),
        );
      } else if (_userStatus == 'opted_in' ||
          _userStatus == 'placed' ||
          _userStatus == 'shortlisted') {
        return Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.green.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: Colors.green.withValues(alpha: 0.3)),
          ),
          child: const Text(
            'Request Approved — Opted In',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold),
          ),
        );
      } else if (_userStatus == 'rejected') {
        final remarks = widget.drive['user_remarks'] ?? '';
        return Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.grey.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: Colors.grey.withValues(alpha: 0.3)),
          ),
          child: Column(
            children: [
              const Text(
                'Not Eligible',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Colors.grey,
                  fontWeight: FontWeight.bold,
                ),
              ),
              if (remarks.isNotEmpty) ...[
                const SizedBox(height: 6),
                Text(
                  remarks,
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey, fontSize: 12),
                ),
              ],
            ],
          ),
        );
      } else {
        // Show Request to Attend
        return SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _handleRequestToAttend,
            style: ElevatedButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.primary,
              foregroundColor: Theme.of(context).brightness == Brightness.dark
                  ? Colors.black
                  : Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            child: const Text(
              'Request to Attend',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
        );
      }
    }

    // Default: Opt In / Opt Out buttons for eligible students
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
                    ? Theme.of(context).colorScheme.primary
                    : (Theme.of(context).brightness == Brightness.dark
                          ? Colors.transparent
                          : Colors.white),
                border: Border.all(
                  color: Theme.of(context).colorScheme.primary,
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
                      ? (Theme.of(context).brightness == Brightness.dark
                            ? Colors.black
                            : Colors.white)
                      : Theme.of(context).colorScheme.primary,
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
                    ? Theme.of(context).colorScheme.primary
                    : (Theme.of(context).brightness == Brightness.dark
                          ? Colors.transparent
                          : Colors.white),
                border: Border.all(
                  color: Theme.of(context).colorScheme.primary,
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
                      ? (Theme.of(context).brightness == Brightness.dark
                            ? Colors.black
                            : Colors.white)
                      : Theme.of(context).colorScheme.primary,
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
          Icon(
            icon,
            size: 20,
            color:
                (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.grey),
          ),
          const SizedBox(width: 12),
          SizedBox(
            width: 100,
            child: Text(
              label,
              style: TextStyle(
                color: Colors.grey[500],
                fontSize: 13,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}
