import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../services/student_service.dart';
import '../utils/constants.dart';

class RequestsScreen extends StatefulWidget {
  const RequestsScreen({super.key});

  @override
  State<RequestsScreen> createState() => _RequestsScreenState();
}

class _RequestsScreenState extends State<RequestsScreen>
    with SingleTickerProviderStateMixin {
  final StudentService _studentService = StudentService();
  late TabController _tabController;

  bool _isLoadingMarkUpdates = true;
  bool _isLoadingDriveRequests = true;
  List<dynamic> _markUpdates = [];
  List<dynamic> _driveRequests = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _fetchMarkUpdates();
    _fetchDriveRequests();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _fetchMarkUpdates() async {
    try {
      final data = await _studentService.getRequests();
      if (mounted) {
        setState(() {
          _markUpdates = data;
          _isLoadingMarkUpdates = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoadingMarkUpdates = false);
      }
    }
  }

  Future<void> _fetchDriveRequests() async {
    try {
      final data = await _studentService.getDriveRequests();
      if (mounted) {
        setState(() {
          _driveRequests = data;
          _isLoadingDriveRequests = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoadingDriveRequests = false);
      }
    }
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'opted_in':
        return const Color(0xFF10B981);
      case 'rejected':
        return const Color(0xFFEF4444);
      case 'pending':
      case 'request_to_attend':
        return const Color(0xFFF59E0B);
      default:
        return Colors.grey;
    }
  }

  IconData _getStatusIcon(String status) {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'opted_in':
        return Icons.check_circle_outline;
      case 'rejected':
        return Icons.cancel_outlined;
      case 'pending':
      case 'request_to_attend':
        return Icons.pending_outlined;
      default:
        return Icons.info_outline;
    }
  }

  String _getStatusLabel(String status) {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'opted_in':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'pending':
      case 'request_to_attend':
        return 'Pending';
      default:
        return status;
    }
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return '';
    try {
      final date = DateTime.parse(dateStr);
      return DateFormat('dd MMM yyyy, hh:mm a').format(date);
    } catch (e) {
      return dateStr;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: Text(
          'My Requests',
          style: GoogleFonts.geist(
            fontWeight: FontWeight.bold,
            color: Colors.black,
          ),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        foregroundColor: AppConstants.textPrimary,
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppConstants.primaryColor,
          unselectedLabelColor: Colors.grey[500],
          indicatorColor: AppConstants.primaryColor,
          indicatorSize: TabBarIndicatorSize.label,
          labelStyle: GoogleFonts.geist(
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
          unselectedLabelStyle: GoogleFonts.geist(
            fontSize: 13,
            fontWeight: FontWeight.w500,
          ),
          tabs: [
            Tab(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('Mark Updates'),
                  if (_markUpdates.isNotEmpty) ...[
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 6,
                        vertical: 1,
                      ),
                      decoration: BoxDecoration(
                        color: AppConstants.primaryColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        '${_markUpdates.length}',
                        style: GoogleFonts.geist(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: AppConstants.primaryColor,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            Tab(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('Drive Requests'),
                  if (_driveRequests.isNotEmpty) ...[
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 6,
                        vertical: 1,
                      ),
                      decoration: BoxDecoration(
                        color: AppConstants.primaryColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        '${_driveRequests.length}',
                        style: GoogleFonts.geist(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: AppConstants.primaryColor,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [_buildMarkUpdatesTab(), _buildDriveRequestsTab()],
      ),
    );
  }

  Widget _buildMarkUpdatesTab() {
    if (_isLoadingMarkUpdates) {
      return const Center(
        child: CircularProgressIndicator(color: AppConstants.primaryColor),
      );
    }

    if (_markUpdates.isEmpty) {
      return RefreshIndicator(
        onRefresh: _fetchMarkUpdates,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: SizedBox(
            height: MediaQuery.of(context).size.height * 0.6,
            width: double.infinity,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Icon(
                  Icons.edit_note_outlined,
                  size: 64,
                  color: Colors.grey[300],
                ),
                const SizedBox(height: 16),
                Text(
                  'No mark update requests',
                  style: GoogleFonts.geist(
                    color: Colors.grey[600],
                    fontSize: 17,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Your profile update requests will appear here',
                  style: GoogleFonts.geist(
                    color: Colors.grey[400],
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _fetchMarkUpdates,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _markUpdates.length,
        itemBuilder: (context, index) =>
            _buildMarkUpdateCard(_markUpdates[index]),
      ),
    );
  }

  Widget _buildMarkUpdateCard(dynamic request) {
    final status = request['status'] ?? 'pending';
    final statusColor = _getStatusColor(status);
    final statusLabel = _getStatusLabel(status);
    final fieldName = (request['field_name'] ?? '').toString().replaceAll(
      '_',
      ' ',
    );

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    fieldName.isNotEmpty
                        ? fieldName[0].toUpperCase() + fieldName.substring(1)
                        : 'Field Update',
                    style: GoogleFonts.geist(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 3,
                  ),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(
                      color: statusColor.withValues(alpha: 0.3),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        _getStatusIcon(status),
                        size: 12,
                        color: statusColor,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        statusLabel,
                        style: GoogleFonts.geist(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: statusColor,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Values
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                Expanded(
                  child: _buildValueBox(
                    'Current',
                    request['old_value'] ?? 'N/A',
                    Colors.grey[100]!,
                    Colors.grey[600]!,
                  ),
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 8),
                  child: Icon(
                    Icons.arrow_forward,
                    size: 16,
                    color: Colors.grey,
                  ),
                ),
                Expanded(
                  child: _buildValueBox(
                    'New',
                    request['new_value'] ?? 'N/A',
                    const Color(0xFF10B981).withValues(alpha: 0.05),
                    const Color(0xFF10B981),
                  ),
                ),
              ],
            ),
          ),

          // Reason & Date
          if (request['reason'] != null &&
              request['reason'].toString().isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
              child: Text(
                '"${request['reason']}"',
                style: GoogleFonts.geist(
                  fontSize: 12,
                  fontStyle: FontStyle.italic,
                  color: Colors.grey[500],
                ),
              ),
            ),

          // Admin comment
          if (request['admin_comment'] != null &&
              request['admin_comment'].toString().isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 6, 16, 0),
              child: Row(
                children: [
                  Icon(
                    Icons.comment_outlined,
                    size: 12,
                    color: Colors.grey[400],
                  ),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      request['admin_comment'],
                      style: GoogleFonts.geist(
                        fontSize: 12,
                        color: Colors.grey[500],
                      ),
                    ),
                  ),
                ],
              ),
            ),

          // Date
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 14),
            child: Text(
              _formatDate(request['created_at']),
              style: GoogleFonts.geist(fontSize: 11, color: Colors.grey[400]),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildValueBox(
    String label,
    String value,
    Color bgColor,
    Color labelColor,
  ) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: GoogleFonts.geist(
              fontSize: 10,
              fontWeight: FontWeight.w500,
              color: labelColor,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: GoogleFonts.geist(fontSize: 13, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }

  Widget _buildDriveRequestsTab() {
    if (_isLoadingDriveRequests) {
      return const Center(
        child: CircularProgressIndicator(color: AppConstants.primaryColor),
      );
    }

    if (_driveRequests.isEmpty) {
      return RefreshIndicator(
        onRefresh: _fetchDriveRequests,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: SizedBox(
            height: MediaQuery.of(context).size.height * 0.6,
            width: double.infinity,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.send_outlined, size: 64, color: Colors.grey[300]),
                const SizedBox(height: 16),
                Text(
                  'No drive requests',
                  style: GoogleFonts.geist(
                    color: Colors.grey[600],
                    fontSize: 17,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Drive attendance requests will appear here',
                  style: GoogleFonts.geist(
                    color: Colors.grey[400],
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _fetchDriveRequests,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _driveRequests.length,
        itemBuilder: (context, index) =>
            _buildDriveRequestCard(_driveRequests[index]),
      ),
    );
  }

  Widget _buildDriveRequestCard(dynamic request) {
    final status = request['status'] ?? 'pending';
    final statusColor = _getStatusColor(status);
    final statusLabel = request['status_label'] ?? _getStatusLabel(status);
    final companyName = request['company_name'] ?? 'Unknown Company';
    final appliedRoleNames = request['applied_role_names'] ?? '';
    final remarks = request['remarks'] ?? '';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header with company name and status
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
            child: Row(
              children: [
                Icon(
                  Icons.business,
                  size: 18,
                  color: AppConstants.primaryColor,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    companyName,
                    style: GoogleFonts.geist(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: AppConstants.textPrimary,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 3,
                  ),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(
                      color: statusColor.withValues(alpha: 0.3),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        _getStatusIcon(status),
                        size: 12,
                        color: statusColor,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        statusLabel,
                        style: GoogleFonts.geist(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: statusColor,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Roles
          if (appliedRoleNames.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(44, 0, 16, 6),
              child: Row(
                children: [
                  Icon(Icons.work_outline, size: 13, color: Colors.grey[500]),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      appliedRoleNames,
                      style: GoogleFonts.geist(
                        fontSize: 12,
                        color: Colors.grey[600],
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),

          // Admin remarks
          if (remarks.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(44, 0, 16, 6),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    Icons.comment_outlined,
                    size: 13,
                    color: Colors.grey[400],
                  ),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      remarks,
                      style: GoogleFonts.geist(
                        fontSize: 12,
                        fontStyle: FontStyle.italic,
                        color: Colors.grey[500],
                      ),
                    ),
                  ),
                ],
              ),
            ),

          // Actioned by / Date
          Padding(
            padding: const EdgeInsets.fromLTRB(44, 0, 16, 14),
            child: Text(
              _formatDate(request['applied_at']),
              style: GoogleFonts.geist(fontSize: 11, color: Colors.grey[400]),
            ),
          ),
        ],
      ),
    );
  }
}
