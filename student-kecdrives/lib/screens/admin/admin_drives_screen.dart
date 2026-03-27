import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../services/admin_service.dart';

class AdminDrivesScreen extends ConsumerStatefulWidget {
  const AdminDrivesScreen({super.key});

  @override
  ConsumerState<AdminDrivesScreen> createState() => _AdminDrivesScreenState();
}

class _AdminDrivesScreenState extends ConsumerState<AdminDrivesScreen> {
  List<dynamic> _drives = [];
  bool _isLoading = true;
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _searchController.addListener(() => setState(() {}));
    _loadDrives();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadDrives() async {
    setState(() => _isLoading = true);
    try {
      final data = await ref
          .read(adminServiceProvider)
          .getDrives(
            limit: 100,
            search: _searchController.text.trim().isNotEmpty
                ? _searchController.text.trim()
                : null,
          );
      if (mounted) {
        setState(() {
          _drives = data['drives'] ?? data['data'] ?? [];
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _editDeadline(dynamic drive) async {
    final driveId = drive['id'] as int;
    final companyName = drive['company_name'] ?? 'Drive';
    final currentDeadline = drive['deadline_date'] != null
        ? DateTime.tryParse(drive['deadline_date'])
        : null;

    final pickedDate = await showDatePicker(
      context: context,
      initialDate:
          currentDeadline ?? DateTime.now().add(const Duration(days: 7)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      helpText: 'Select new deadline for $companyName',
    );

    if (pickedDate == null || !mounted) return;

    final pickedTime = await showTimePicker(
      context: context,
      initialTime: currentDeadline != null
          ? TimeOfDay.fromDateTime(currentDeadline)
          : const TimeOfDay(hour: 23, minute: 59),
    );

    if (pickedTime == null || !mounted) return;

    final newDeadline = DateTime(
      pickedDate.year,
      pickedDate.month,
      pickedDate.day,
      pickedTime.hour,
      pickedTime.minute,
    );

    try {
      await ref.read(adminServiceProvider).patchDrive(driveId, {
        'deadline_date': newDeadline.toUtc().toIso8601String(),
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Deadline updated for $companyName to ${DateFormat('dd MMM yyyy, hh:mm a').format(newDeadline)}',
            ),
            backgroundColor: Colors.green,
          ),
        );
        _loadDrives();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Failed: ${e.toString().replaceAll('Exception: ', '')}',
            ),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null) return 'N/A';
    try {
      final date = DateTime.parse(dateStr).toLocal();
      return DateFormat('dd MMM yyyy, hh:mm a').format(date);
    } catch (_) {
      return dateStr;
    }
  }

  Color _statusColor(String? status) {
    switch (status?.toLowerCase()) {
      case 'open':
        return Colors.green;
      case 'closed':
        return Colors.red;
      case 'cancelled':
        return Colors.grey;
      case 'on_hold':
        return Colors.orange;
      default:
        return Colors.blue;
    }
  }

  bool _isExpired(String? deadlineDateStr) {
    if (deadlineDateStr == null) return false;
    try {
      return DateTime.parse(deadlineDateStr).toLocal().isBefore(DateTime.now());
    } catch (_) {
      return false;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text(
          'Drive Management',
          style: GoogleFonts.geist(fontWeight: FontWeight.bold),
        ),
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        elevation: 0,
        scrolledUnderElevation: 0,
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search drives by company name…',
                hintStyle: GoogleFonts.geist(fontSize: 14),
                prefixIcon: const Icon(Icons.search, size: 20),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 18),
                        onPressed: () {
                          _searchController.clear();
                          _loadDrives();
                        },
                      )
                    : null,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide(color: Theme.of(context).dividerColor),
                ),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 10,
                ),
                filled: true,
                fillColor: Theme.of(context).cardColor,
              ),
              onSubmitted: (_) => _loadDrives(),
            ),
          ),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _drives.isEmpty
                ? Center(
                    child: Text(
                      'No drives found',
                      style: GoogleFonts.geist(color: Colors.grey[500]),
                    ),
                  )
                : RefreshIndicator(
                    onRefresh: _loadDrives,
                    child: ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: _drives.length,
                      itemBuilder: (context, index) =>
                          _buildDriveCard(_drives[index]),
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildDriveCard(dynamic drive) {
    final status = drive['status']?.toString() ?? 'open';
    final expired = _isExpired(drive['deadline_date']);

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: expired
              ? Colors.red.withValues(alpha: 0.3)
              : Theme.of(context).dividerColor,
          width: 0.5,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    drive['company_name'] ?? 'Unknown',
                    style: GoogleFonts.geist(
                      fontWeight: FontWeight.w600,
                      fontSize: 15,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 3,
                  ),
                  decoration: BoxDecoration(
                    color: _statusColor(status).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    status.toUpperCase(),
                    style: GoogleFonts.geist(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: _statusColor(status),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Icon(Icons.calendar_today, size: 14, color: Colors.grey[500]),
                const SizedBox(width: 6),
                Text(
                  'Drive: ${_formatDate(drive['drive_date'])}',
                  style: GoogleFonts.geist(
                    fontSize: 12,
                    color: Colors.grey[600],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                Icon(
                  Icons.timer_outlined,
                  size: 14,
                  color: expired ? Colors.red : Colors.grey[500],
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    'Deadline: ${_formatDate(drive['deadline_date'])}',
                    style: GoogleFonts.geist(
                      fontSize: 12,
                      color: expired ? Colors.red : Colors.grey[600],
                      fontWeight: expired ? FontWeight.w600 : FontWeight.normal,
                    ),
                  ),
                ),
                TextButton.icon(
                  onPressed: () => _editDeadline(drive),
                  icon: const Icon(Icons.edit_calendar, size: 16),
                  label: Text('Edit', style: GoogleFonts.geist(fontSize: 12)),
                  style: TextButton.styleFrom(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
