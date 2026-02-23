import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../services/student_service.dart';

class RequestsScreen extends StatefulWidget {
  const RequestsScreen({super.key});

  @override
  State<RequestsScreen> createState() => _RequestsScreenState();
}

class _RequestsScreenState extends State<RequestsScreen> {
  final StudentService _studentService = StudentService();
  late ScrollController _scrollController;

  bool _isLoadingMarkUpdates = true;
  bool _isLoadingDriveRequests = true;
  List<dynamic> _markUpdates = [];
  List<dynamic> _driveRequests = [];

  @override
  void initState() {
    super.initState();
    _scrollController = ScrollController();
    _fetchMarkUpdates();
    _fetchDriveRequests();
  }

  @override
  void dispose() {
    _scrollController.dispose();
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
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text(
          'My Requests',
          style: GoogleFonts.geist(
            fontWeight: FontWeight.bold,
            color: Theme.of(context).textTheme.bodyLarge?.color ?? Colors.black,
          ),
        ),
        backgroundColor:
            Theme.of(context).appBarTheme.backgroundColor ?? Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        foregroundColor:
            Theme.of(context).textTheme.bodyLarge?.color ??
            (Theme.of(context).textTheme.bodyLarge?.color ?? Colors.black),
      ),
      body: Column(
        children: [
          AnimatedBuilder(
            animation: _scrollController,
            builder: (context, _) {
              double page = 0.0;
              if (_scrollController.hasClients) {
                if (_scrollController.position.hasContentDimensions) {
                  page =
                      _scrollController.offset /
                      MediaQuery.of(context).size.width;
                }
              }
              final int activeIndex = page.round();

              return Container(
                height: 48,
                decoration: BoxDecoration(
                  color: Theme.of(context).scaffoldBackgroundColor,
                  border: Border(
                    bottom: BorderSide(
                      color: Theme.of(context).dividerColor,
                      width: 1,
                    ),
                  ),
                ),
                child: Stack(
                  children: [
                    Positioned(
                      bottom: 0,
                      left: page * (MediaQuery.of(context).size.width / 2),
                      width: MediaQuery.of(context).size.width / 2,
                      child: Center(
                        child: Container(
                          height: 3,
                          width: 48,
                          decoration: BoxDecoration(
                            color: Theme.of(context).colorScheme.primary,
                            borderRadius: const BorderRadius.only(
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
                          'Mark Updates',
                          0,
                          activeIndex,
                          MediaQuery.of(context).size.width,
                          _markUpdates.length,
                        ),
                        _buildCustomTab(
                          'Drive Requests',
                          1,
                          activeIndex,
                          MediaQuery.of(context).size.width,
                          _driveRequests.length,
                        ),
                      ],
                    ),
                  ],
                ),
              );
            },
          ),
          Expanded(
            child: SingleChildScrollView(
              controller: _scrollController,
              scrollDirection: Axis.horizontal,
              physics: const PageScrollPhysics(),
              child: Row(
                children: [
                  SizedBox(
                    width: MediaQuery.of(context).size.width,
                    child: RepaintBoundary(child: _buildMarkUpdatesTab()),
                  ),
                  SizedBox(
                    width: MediaQuery.of(context).size.width,
                    child: RepaintBoundary(child: _buildDriveRequestsTab()),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCustomTab(
    String text,
    int index,
    int activeIndex,
    double screenWidth,
    int badgeCount,
  ) {
    bool isActive = activeIndex == index;
    return Expanded(
      child: InkWell(
        onTap: () {
          if (_scrollController.hasClients) {
            _scrollController.animateTo(
              index * screenWidth,
              duration: const Duration(milliseconds: 300),
              curve: Curves.ease,
            );
          }
        },
        child: Container(
          height: 48,
          alignment: Alignment.center,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                text,
                style: GoogleFonts.geist(
                  fontSize: 14,
                  fontWeight: isActive ? FontWeight.w600 : FontWeight.w500,
                  color: isActive
                      ? Theme.of(context).colorScheme.primary
                      : (Theme.of(context).textTheme.bodyMedium?.color ??
                            Colors.grey[500]),
                ),
              ),
              if (badgeCount > 0) ...[
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 6,
                    vertical: 1,
                  ),
                  decoration: BoxDecoration(
                    color: Theme.of(
                      context,
                    ).colorScheme.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    '$badgeCount',
                    style: GoogleFonts.geist(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMarkUpdatesTab() {
    if (_isLoadingMarkUpdates) {
      return Center(
        child: CircularProgressIndicator(
          color: Theme.of(context).colorScheme.primary,
        ),
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
        itemBuilder: (context, index) {
          final request = _markUpdates[index];
          return Dismissible(
            key: Key(request['id']?.toString() ?? index.toString()),
            direction: DismissDirection.endToStart,
            confirmDismiss: (direction) async {
              HapticFeedback.mediumImpact();
              return await showDialog(
                context: context,
                builder: (BuildContext context) {
                  return AlertDialog(
                    title: const Text("Clear Request"),
                    content: const Text(
                      "Are you sure you want to clear this request from your history?",
                    ),
                    actions: <Widget>[
                      TextButton(
                        onPressed: () => Navigator.of(context).pop(false),
                        child: const Text("Cancel"),
                      ),
                      TextButton(
                        onPressed: () {
                          HapticFeedback.heavyImpact();
                          Navigator.of(context).pop(true);
                        },
                        child: const Text(
                          "Clear",
                          style: TextStyle(color: Colors.red),
                        ),
                      ),
                    ],
                  );
                },
              );
            },
            onDismissed: (direction) async {
              final requestId = request['id'] as int?;
              setState(() {
                _markUpdates.removeAt(index);
              });

              if (requestId != null) {
                try {
                  await _studentService.deleteChangeRequest(requestId);
                } catch (e) {
                  // Silent failure in UI, but backend attempt made
                }
              }

              if (context.mounted) {
                ScaffoldMessenger.of(context).clearSnackBars();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Request cleared'),
                    duration: Duration(seconds: 2),
                  ),
                );
              }
            },
            background: Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.symmetric(horizontal: 20),
              alignment: Alignment.centerRight,
              decoration: BoxDecoration(
                color: Colors.red,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(
                Icons.delete_outline,
                color: Colors.white,
                size: 28,
              ),
            ),
            child: _buildMarkUpdateCard(request),
          );
        },
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
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: (Theme.of(context).brightness == Brightness.dark
              ? Colors.grey[800]
              : Colors.grey[200])!,
        ),
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
      return Center(
        child: CircularProgressIndicator(
          color: Theme.of(context).colorScheme.primary,
        ),
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
        itemBuilder: (context, index) {
          final request = _driveRequests[index];
          return Dismissible(
            key: Key(request['drive_id']?.toString() ?? index.toString()),
            direction: DismissDirection.endToStart,
            confirmDismiss: (direction) async {
              HapticFeedback.mediumImpact();
              return await showDialog(
                context: context,
                builder: (BuildContext context) {
                  return AlertDialog(
                    title: const Text("Clear Request"),
                    content: const Text(
                      "Are you sure you want to clear this request from your history?",
                    ),
                    actions: <Widget>[
                      TextButton(
                        onPressed: () => Navigator.of(context).pop(false),
                        child: const Text("Cancel"),
                      ),
                      TextButton(
                        onPressed: () {
                          HapticFeedback.heavyImpact();
                          Navigator.of(context).pop(true);
                        },
                        child: const Text(
                          "Clear",
                          style: TextStyle(color: Colors.red),
                        ),
                      ),
                    ],
                  );
                },
              );
            },
            onDismissed: (direction) async {
              final driveId = request['drive_id'] as int?;
              setState(() {
                _driveRequests.removeAt(index);
              });

              if (driveId != null) {
                try {
                  await _studentService.deleteDriveRequest(driveId);
                } catch (e) {
                  // Silent failure in UI, but backend attempt made
                }
              }

              if (context.mounted) {
                ScaffoldMessenger.of(context).clearSnackBars();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Drive request cleared'),
                    duration: Duration(seconds: 2),
                  ),
                );
              }
            },
            background: Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.symmetric(horizontal: 20),
              alignment: Alignment.centerRight,
              decoration: BoxDecoration(
                color: Colors.red,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(
                Icons.delete_outline,
                color: Colors.white,
                size: 28,
              ),
            ),
            child: _buildDriveRequestCard(request),
          );
        },
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
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: (Theme.of(context).brightness == Brightness.dark
              ? Colors.grey[800]
              : Colors.grey[200])!,
        ),
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
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    companyName,
                    style: GoogleFonts.geist(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color:
                          (Theme.of(context).textTheme.bodyLarge?.color ??
                          Colors.black),
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
