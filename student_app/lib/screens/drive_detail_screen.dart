import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../utils/constants.dart';
import '../utils/formatters.dart'; // [NEW]
import '../../providers/drive_provider.dart';
import 'package:cached_network_image/cached_network_image.dart';

class DriveDetailScreen extends ConsumerStatefulWidget {
  final Map<String, dynamic> drive;

  const DriveDetailScreen({super.key, required this.drive});

  @override
  ConsumerState<DriveDetailScreen> createState() => _DriveDetailScreenState();
}

class _DriveDetailScreenState extends ConsumerState<DriveDetailScreen> {
  bool _isLoading = false;
  late String _userStatus;

  // Banner state
  String? _bannerMessage;
  Color? _bannerColor;
  int _bannerId = 0;

  @override
  void initState() {
    super.initState();
    _userStatus = widget.drive['user_status'] ?? '';
  }

  Future<void> _handleOptIn() async {
    setState(() => _isLoading = true);
    try {
      final driveService = ref.read(driveServiceProvider);
      await driveService.applyForDrive(widget.drive['id']);
      setState(() {
        _userStatus = 'opted_in';
        _isLoading = false;
      });
      // Invalidate list to reflect badge change on back
      ref.invalidate(driveListProvider);

      if (mounted) {
        _showBanner('Successfully opted in!', AppConstants.successColor);
      }
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        _showBanner('Error: ${e.toString()}', Colors.red);
      }
    }
  }

  Future<void> _handleOptOut() async {
    setState(() => _isLoading = true);
    try {
      final driveService = ref.read(driveServiceProvider);
      await driveService.withdrawFromDrive(widget.drive['id']);
      setState(() {
        _userStatus = 'withdrawn';
        _isLoading = false;
      });
      // Invalidate list
      ref.invalidate(driveListProvider);

      if (mounted) {
        _showBanner('Successfully opted out.', Colors.orange);
      }
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        _showBanner('Error: ${e.toString()}', Colors.red);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final drive = widget.drive;
    final bool isExpired = DateTime.parse(
      drive['deadline_date'],
    ).isBefore(DateTime.now());
    final bool isOptedIn = _userStatus == 'opted_in';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Drive Details'), // [CHANGED] Generic Title
        backgroundColor: Colors.white,
        foregroundColor: AppConstants.textPrimary,
        elevation: 0,
      ),
      body: Column(
        children: [
          if (_bannerMessage != null)
            MaterialBanner(
              content: Text(_bannerMessage!),
              backgroundColor: _bannerColor,
              elevation: 0,
              contentTextStyle: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
              actions: [
                TextButton(
                  onPressed: _dismissBanner,
                  child: const Text(
                    'DISMISS',
                    style: TextStyle(color: Colors.white),
                  ),
                ),
              ],
            ),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Company Header
                  Center(
                    child: Container(
                      width: 80,
                      height: 80,
                      decoration: BoxDecoration(
                        color: Colors.grey[100],
                        borderRadius: BorderRadius.circular(12),
                        image:
                            drive['logo_url'] != null &&
                                drive['logo_url'].toString().isNotEmpty
                            ? DecorationImage(
                                image: NetworkImage(
                                  AppConstants.sanitizeUrl(drive['logo_url']),
                                ),
                              )
                            : null,
                      ),
                      child:
                          drive['logo_url'] != null &&
                              drive['logo_url'].toString().isNotEmpty
                          ? ClipRRect(
                              borderRadius: BorderRadius.circular(12),
                              child: CachedNetworkImage(
                                imageUrl: AppConstants.sanitizeUrl(
                                  drive['logo_url'],
                                ),
                                width: 80,
                                height: 80,
                                fit: BoxFit.cover,
                                placeholder: (context, url) =>
                                    Container(color: Colors.grey[200]),
                                errorWidget: (context, url, error) =>
                                    const Icon(
                                      Icons.business,
                                      size: 40,
                                      color: Colors.grey,
                                    ),
                              ),
                            )
                          : const Icon(
                              Icons.business,
                              size: 40,
                              color: Colors.grey,
                            ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  // [CHANGED] Company Name below Icon
                  Center(
                    child: Text(
                      drive['company_name'],
                      style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: AppConstants.primaryColor,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Center(
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: AppConstants.primaryColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        drive['drive_type'],
                        style: const TextStyle(
                          color: AppConstants.primaryColor,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // [NEW] Status Badge
                  Center(child: _buildStatusBadge(_userStatus)),
                  const SizedBox(height: 24),

                  _buildSectionTitle('Job Description'),
                  Text(
                    drive['job_description'] ?? 'No description provided.',
                    style: const TextStyle(height: 1.5, color: Colors.black87),
                  ),
                  const SizedBox(height: 20),

                  _buildSectionTitle('Key Details'),
                  _buildDetailRow(
                    Icons.work_outline,
                    'Role',
                    drive['job_role'],
                  ), // [MOVED]
                  _buildDetailRow(
                    Icons.currency_rupee,
                    'Package',
                    drive['ctc_display'],
                  ),
                  _buildDetailRow(
                    Icons.location_on_outlined,
                    'Location',
                    drive['location'],
                  ),
                  _buildDetailRow(
                    Icons.calendar_today,
                    'Event Date',
                    Formatters.formatDate(drive['drive_date']),
                  ),
                  _buildDetailRow(
                    Icons.timer_outlined,
                    'Deadline',
                    Formatters.formatDate(drive['deadline_date']),
                  ),

                  const SizedBox(height: 20),

                  _buildSectionTitle('Rounds'),
                  if (drive['rounds'] != null &&
                      (drive['rounds'] as List).isNotEmpty)
                    ...((drive['rounds'] as List).map(
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
                            Text('${r['name']} (${r['date']})'),
                          ],
                        ),
                      ),
                    ))
                  else
                    const Text('No rounds specified.'),

                  const SizedBox(height: 32),

                  // Action Button
                  // Action Buttons
                  if (isExpired)
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.red[50],
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Text(
                        'Application Closed',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: Colors.red,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    )
                  else
                    Row(
                      children: [
                        // Opt Out Button
                        Expanded(
                          child: SizedBox(
                            height: 50,
                            child: ElevatedButton(
                              onPressed:
                                  _isLoading || _userStatus == 'opted_out'
                                  ? null // Disabled if already opted out
                                  : _handleOptOut,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.red[50],
                                foregroundColor: Colors.red,
                                elevation: 0,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                disabledBackgroundColor: Colors.grey[200],
                              ),
                              child: Text(
                                _userStatus == 'opted_out'
                                    ? 'Opted Out'
                                    : 'Opt Out',
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 16),
                        // Opt In Button
                        Expanded(
                          child: SizedBox(
                            height: 50,
                            child: ElevatedButton(
                              onPressed: _isLoading || _userStatus == 'opted_in'
                                  ? null // Disabled if already opted in
                                  : _handleOptIn,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppConstants.primaryColor,
                                foregroundColor: Colors.white,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                disabledBackgroundColor: AppConstants
                                    .primaryColor
                                    .withOpacity(0.5),
                              ),
                              child: _isLoading
                                  ? const SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: Colors.white,
                                      ),
                                    )
                                  : Text(
                                      _userStatus == 'opted_in'
                                          ? 'Applied'
                                          : 'Opt In',
                                    ),
                            ),
                          ),
                        ),
                      ],
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.bold,
          color: AppConstants.textPrimary,
        ),
      ),
    );
  }

  Widget _buildDetailRow(IconData icon, String label, String? value) {
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
              value ?? 'N/A',
              style: const TextStyle(fontWeight: FontWeight.w500),
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
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        border: Border.all(color: color.withOpacity(0.5)),
        borderRadius: BorderRadius.circular(20),
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

  void _showBanner(String message, Color color) {
    final int bannerId = ++_bannerId;
    setState(() {
      _bannerMessage = message;
      _bannerColor = color;
    });

    Future.delayed(const Duration(seconds: 2), () {
      if (mounted && _bannerId == bannerId) {
        setState(() {
          _bannerMessage = null;
        });
      }
    });
  }

  void _dismissBanner() {
    setState(() {
      _bannerMessage = null;
    });
  }
}
