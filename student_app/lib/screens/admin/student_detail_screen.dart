import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/admin_provider.dart';
import '../../utils/constants.dart';
import '../../utils/formatters.dart';

class StudentDetailScreen extends ConsumerStatefulWidget {
  final String registerNumber;
  final String studentName;

  const StudentDetailScreen({
    super.key,
    required this.registerNumber,
    required this.studentName,
  });

  @override
  ConsumerState<StudentDetailScreen> createState() =>
      _StudentDetailScreenState();
}

class _StudentDetailScreenState extends ConsumerState<StudentDetailScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isActionLoading = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
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

  Future<void> _blockStudent(Map<String, dynamic> student) async {
    final reasonController = TextEditingController();
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.block_rounded, color: Colors.redAccent, size: 24),
            SizedBox(width: 10),
            Text(
              'Block Student',
              style: TextStyle(color: Colors.white, fontSize: 18),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Are you sure you want to block "${student['full_name']}"?',
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.7),
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'This will prevent the student from applying to drives.',
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.4),
                fontSize: 12,
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: reasonController,
              style: const TextStyle(color: Colors.white, fontSize: 14),
              maxLines: 2,
              decoration: InputDecoration(
                hintText: 'Reason for blocking (optional)',
                hintStyle: TextStyle(
                  color: Colors.white.withValues(alpha: 0.3),
                ),
                filled: true,
                fillColor: const Color(0xFF0F172A),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide(
                    color: Colors.white.withValues(alpha: 0.1),
                  ),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide(
                    color: Colors.white.withValues(alpha: 0.1),
                  ),
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text(
              'Cancel',
              style: TextStyle(color: Colors.white54),
            ),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.redAccent,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text(
              'Block Student',
              style: TextStyle(color: Colors.white),
            ),
          ),
        ],
      ),
    );

    if (confirm != true || !mounted) return;

    setState(() => _isActionLoading = true);
    try {
      final userId = student['id'] is int
          ? student['id'] as int
          : int.parse(student['id'].toString());
      await ref
          .read(adminServiceProvider)
          .blockStudent(
            userId,
            reason: reasonController.text.isNotEmpty
                ? reasonController.text
                : null,
          );

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Student blocked successfully'),
          backgroundColor: Colors.redAccent,
        ),
      );
      ref.invalidate(adminStudentDetailProvider(widget.registerNumber));
      ref.invalidate(adminStudentListProvider);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString().replaceAll('Exception: ', '')),
          backgroundColor: Colors.redAccent,
        ),
      );
    } finally {
      if (mounted) setState(() => _isActionLoading = false);
    }
    reasonController.dispose();
  }

  Future<void> _unblockStudent(Map<String, dynamic> student) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(
              Icons.check_circle_rounded,
              color: Color(0xFF10B981),
              size: 24,
            ),
            SizedBox(width: 10),
            Text(
              'Unblock Student',
              style: TextStyle(color: Colors.white, fontSize: 18),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Are you sure you want to unblock "${student['full_name']}"?',
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.7),
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'The student will be able to apply to drives again.',
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.4),
                fontSize: 12,
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text(
              'Cancel',
              style: TextStyle(color: Colors.white54),
            ),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF10B981),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text(
              'Unblock Student',
              style: TextStyle(color: Colors.white),
            ),
          ),
        ],
      ),
    );

    if (confirm != true || !mounted) return;

    setState(() => _isActionLoading = true);
    try {
      final userId = student['id'] is int
          ? student['id'] as int
          : int.parse(student['id'].toString());
      await ref.read(adminServiceProvider).unblockStudent(userId);

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Student unblocked successfully'),
          backgroundColor: Color(0xFF10B981),
        ),
      );
      ref.invalidate(adminStudentDetailProvider(widget.registerNumber));
      ref.invalidate(adminStudentListProvider);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString().replaceAll('Exception: ', '')),
          backgroundColor: Colors.redAccent,
        ),
      );
    } finally {
      if (mounted) setState(() => _isActionLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final detailAsync = ref.watch(
      adminStudentDetailProvider(widget.registerNumber),
    );

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          widget.studentName,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: Colors.white70),
            onPressed: () => ref.invalidate(
              adminStudentDetailProvider(widget.registerNumber),
            ),
          ),
        ],
      ),
      body: detailAsync.when(
        data: (student) => _buildContent(student),
        loading: () => const Center(
          child: CircularProgressIndicator(color: Color(0xFF3B82F6)),
        ),
        error: (error, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.error_outline_rounded,
                size: 48,
                color: Colors.redAccent,
              ),
              const SizedBox(height: 16),
              Text(
                'Error loading student details',
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.7),
                  fontSize: 16,
                ),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => ref.invalidate(
                  adminStudentDetailProvider(widget.registerNumber),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF3B82F6),
                ),
                child: const Text(
                  'Retry',
                  style: TextStyle(color: Colors.white),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildContent(Map<String, dynamic> student) {
    final isBlocked = student['is_blocked'] == true;
    final profilePhoto = student['profile_photo_url'];
    final socialLinks = student['social_links'] as Map<String, dynamic>? ?? {};

    return Column(
      children: [
        // Student Header
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 0),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Profile Photo
              Stack(
                children: [
                  CircleAvatar(
                    radius: 36,
                    backgroundColor: const Color(
                      0xFF3B82F6,
                    ).withValues(alpha: 0.2),
                    backgroundImage:
                        profilePhoto != null &&
                            profilePhoto.toString().isNotEmpty
                        ? NetworkImage(AppConstants.sanitizeUrl(profilePhoto))
                        : null,
                    child:
                        profilePhoto == null || profilePhoto.toString().isEmpty
                        ? Text(
                            (student['full_name'] ?? '?')[0].toUpperCase(),
                            style: const TextStyle(
                              color: Color(0xFF3B82F6),
                              fontWeight: FontWeight.bold,
                              fontSize: 28,
                            ),
                          )
                        : null,
                  ),
                  Positioned(
                    right: 0,
                    bottom: 0,
                    child: Container(
                      width: 18,
                      height: 18,
                      decoration: BoxDecoration(
                        color: isBlocked ? Colors.red : const Color(0xFF10B981),
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: const Color(0xFF0F172A),
                          width: 2.5,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 16),
              // Info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _formatValue(student['full_name']),
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${_formatValue(student['register_number'])} • ${_formatValue(student['department'])}',
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.white.withValues(alpha: 0.5),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Batch ${_formatValue(student['batch_year'])} • ${_formatValue(student['student_type'])}',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.white.withValues(alpha: 0.35),
                      ),
                    ),
                    if (isBlocked)
                      Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 3,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.redAccent.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Text(
                            '🚫 BLOCKED',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: Colors.redAccent,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Block / Unblock Buttons
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Center(
            child: isBlocked
                ? ElevatedButton.icon(
                    onPressed: _isActionLoading
                        ? null
                        : () => _unblockStudent(student),
                    icon: _isActionLoading
                        ? const SizedBox(
                            width: 14,
                            height: 14,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Icon(Icons.lock_open_rounded, size: 16),
                    label: const Text(
                      'Unblock Student',
                      style: TextStyle(fontSize: 13),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF10B981),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 24,
                        vertical: 8,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                  )
                : ElevatedButton.icon(
                    onPressed: _isActionLoading
                        ? null
                        : () => _blockStudent(student),
                    icon: _isActionLoading
                        ? const SizedBox(
                            width: 14,
                            height: 14,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Icon(Icons.block_rounded, size: 16),
                    label: const Text(
                      'Block Student',
                      style: TextStyle(fontSize: 13),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.redAccent,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 24,
                        vertical: 8,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                  ),
          ),
        ),
        const SizedBox(height: 20),

        // Tab Bar
        Container(
          margin: const EdgeInsets.symmetric(horizontal: 20),
          decoration: BoxDecoration(
            color: const Color(0xFF1E293B),
            borderRadius: BorderRadius.circular(12),
          ),
          child: TabBar(
            controller: _tabController,
            indicator: BoxDecoration(
              color: const Color(0xFF3B82F6),
              borderRadius: BorderRadius.circular(10),
            ),
            indicatorSize: TabBarIndicatorSize.tab,
            indicatorPadding: const EdgeInsets.all(3),
            labelColor: Colors.white,
            unselectedLabelColor: Colors.white54,
            labelStyle: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
            unselectedLabelStyle: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
            dividerColor: Colors.transparent,
            tabs: const [
              Tab(text: 'Personal'),
              Tab(text: 'Academic'),
              Tab(text: 'Documents'),
              Tab(text: 'Placement'),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // Tab Content
        Expanded(
          child: TabBarView(
            controller: _tabController,
            children: [
              _buildPersonalTab(student, socialLinks),
              _buildAcademicTab(student),
              _buildDocumentsTab(student),
              _buildPlacementTab(student),
            ],
          ),
        ),
      ],
    );
  }

  // ─── PERSONAL TAB ─────────────────────────────────────────────

  Widget _buildPersonalTab(
    Map<String, dynamic> student,
    Map<String, dynamic> socialLinks,
  ) {
    final languageSkills = student['language_skills'] as List? ?? [];

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSection('Contact Information', [
            _buildDetailRow('Email', student['email']),
            _buildDetailRow('Mobile Number', student['mobile_number']),
          ]),
          _buildSection('Identity', [
            _buildDetailRow('Full Name', student['full_name']),
            _buildDetailRow('Date of Birth', student['dob']),
            _buildDetailRow('Gender', student['gender']),
            _buildDetailRow('Aadhar Number', student['aadhar_number']),
            _buildDetailRow('PAN Number', student['pan_number']),
          ]),
          _buildSection('Address', [
            _buildDetailRow('Address Line 1', student['address_line_1']),
            _buildDetailRow('Address Line 2', student['address_line_2']),
            _buildDetailRow('State', student['state']),
          ]),
          _buildSection('Academic Info', [
            _buildDetailRow('Register Number', student['register_number']),
            _buildDetailRow('Department', student['department']),
            _buildDetailRow('Batch Year', student['batch_year']),
            _buildDetailRow('Student Type', student['student_type']),
          ]),
          if (languageSkills.isNotEmpty)
            _buildSection('Language Skills', [
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: languageSkills
                    .map(
                      (lang) => Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFF3B82F6).withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: const Color(
                              0xFF3B82F6,
                            ).withValues(alpha: 0.3),
                          ),
                        ),
                        child: Text(
                          lang.toString(),
                          style: const TextStyle(
                            color: Color(0xFF3B82F6),
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    )
                    .toList(),
              ),
            ]),
          if (socialLinks.isNotEmpty)
            _buildSection('Social Links', [
              if (socialLinks.containsKey('linkedin'))
                _buildDetailRow('LinkedIn', socialLinks['linkedin']),
              if (socialLinks.containsKey('github'))
                _buildDetailRow('GitHub', socialLinks['github']),
              if (socialLinks.containsKey('leetcode'))
                _buildDetailRow('LeetCode', socialLinks['leetcode']),
            ]),
        ],
      ),
    );
  }

  // ─── ACADEMIC TAB ─────────────────────────────────────────────

  Widget _buildAcademicTab(Map<String, dynamic> student) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSection('10th Grade', [
            _buildDetailRow('Mark', '${_formatValue(student['tenth_mark'])}%'),
            _buildDetailRow('Board', student['tenth_board']),
            _buildDetailRow('Institution', student['tenth_institution']),
            _buildDetailRow('Year of Passing', student['tenth_year_pass']),
          ]),
          _buildSection('12th Grade', [
            _buildDetailRow(
              'Mark',
              '${_formatValue(student['twelfth_mark'])}%',
            ),
            _buildDetailRow('Board', student['twelfth_board']),
            _buildDetailRow('Institution', student['twelfth_institution']),
            _buildDetailRow('Year of Passing', student['twelfth_year_pass']),
          ]),
          if (_formatValue(student['diploma_mark']) != 'N/A' &&
              student['diploma_mark'] != 0)
            _buildSection('Diploma', [
              _buildDetailRow(
                'Mark',
                '${_formatValue(student['diploma_mark'])}%',
              ),
              _buildDetailRow('Institution', student['diploma_institution']),
              _buildDetailRow('Year of Passing', student['diploma_year_pass']),
            ]),
          _buildSection('Undergraduate (UG)', [
            _buildDetailRow('CGPA', student['ug_cgpa']),
            const SizedBox(height: 8),
            _buildGpaGrid('Semester GPAs', [
              {'label': 'S1', 'value': student['ug_gpa_s1']},
              {'label': 'S2', 'value': student['ug_gpa_s2']},
              {'label': 'S3', 'value': student['ug_gpa_s3']},
              {'label': 'S4', 'value': student['ug_gpa_s4']},
              {'label': 'S5', 'value': student['ug_gpa_s5']},
              {'label': 'S6', 'value': student['ug_gpa_s6']},
              {'label': 'S7', 'value': student['ug_gpa_s7']},
              {'label': 'S8', 'value': student['ug_gpa_s8']},
            ]),
          ]),
          if (_formatValue(student['pg_cgpa']) != 'N/A' &&
              student['pg_cgpa'] != 0)
            _buildSection('Postgraduate (PG)', [
              _buildDetailRow('CGPA', student['pg_cgpa']),
              const SizedBox(height: 8),
              _buildGpaGrid('Semester GPAs', [
                {'label': 'S1', 'value': student['pg_gpa_s1']},
                {'label': 'S2', 'value': student['pg_gpa_s2']},
                {'label': 'S3', 'value': student['pg_gpa_s3']},
                {'label': 'S4', 'value': student['pg_gpa_s4']},
              ]),
            ]),
          _buildSection('Arrears', [
            _buildDetailRow('Standing Arrears', student['standing_arrears']),
            _buildDetailRow(
              'History of Arrears',
              student['history_of_arrears'],
            ),
          ]),
        ],
      ),
    );
  }

  // ─── DOCUMENTS TAB ─────────────────────────────────────────────

  Widget _buildDocumentsTab(Map<String, dynamic> student) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSection('Uploaded Documents', [
            _buildDocRow('Resume', student['resume_url']),
            _buildDocRow('Profile Photo', student['profile_photo_url']),
            _buildDocRow('10th Marksheet', student['tenth_marksheet_url']),
            _buildDocRow('12th Marksheet', student['twelfth_marksheet_url']),
            if (student['diploma_marksheet_url'] != null)
              _buildDocRow(
                'Diploma Marksheet',
                student['diploma_marksheet_url'],
              ),
            _buildDocRow('UG Provisional', student['ug_provisional_url']),
            _buildDocRow('Consolidated Mark', student['consolidated_mark_url']),
            _buildDocRow('Aadhar Card', student['aadhar_url']),
            _buildDocRow('PAN Card', student['pan_url']),
          ]),
          _buildSection('Upload Timestamps', [
            _buildDetailRow(
              'Resume Updated',
              student['resume_uploaded_at'] != null
                  ? Formatters.formatDateTime(
                      student['resume_uploaded_at'].toString(),
                    )
                  : null,
            ),
            _buildDetailRow(
              'Profile Photo Updated',
              student['profile_photo_uploaded_at'] != null
                  ? Formatters.formatDateTime(
                      student['profile_photo_uploaded_at'].toString(),
                    )
                  : null,
            ),
          ]),
        ],
      ),
    );
  }

  // ─── PLACEMENT TAB ─────────────────────────────────────────────

  Widget _buildPlacementTab(Map<String, dynamic> student) {
    final stats = student['placement_stats'] as Map<String, dynamic>? ?? {};
    final assignedDrives = student['assigned_drives'] as List? ?? [];

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSection('Placement Stats', [
            Row(
              children: [
                _buildStatCard(
                  'Drives Applied',
                  _formatValue(stats['drives_applied']),
                  const Color(0xFF3B82F6),
                ),
                const SizedBox(width: 10),
                _buildStatCard(
                  'Shortlisted',
                  _formatValue(stats['shortlisted']),
                  const Color(0xFFF59E0B),
                ),
                const SizedBox(width: 10),
                _buildStatCard(
                  'Placed',
                  _formatValue(stats['placed']),
                  const Color(0xFF10B981),
                ),
              ],
            ),
          ]),
          _buildSection('Account Status', [
            _buildDetailRow(
              'Is Blocked',
              student['is_blocked'] == true ? 'Yes' : 'No',
            ),
            _buildDetailRow('Block Reason', student['block_reason']),
            _buildDetailRow(
              'Profile Complete',
              student['is_profile_complete'] == true ? 'Yes' : 'No',
            ),
            _buildDetailRow(
              'Account Created',
              student['created_at'] != null
                  ? Formatters.formatDateTime(student['created_at'].toString())
                  : null,
            ),
            _buildDetailRow(
              'Last Updated',
              student['updated_at'] != null
                  ? Formatters.formatDateTime(student['updated_at'].toString())
                  : null,
            ),
          ]),
          if (assignedDrives.isNotEmpty)
            _buildSection('Assigned Drives (${assignedDrives.length})', [
              ...assignedDrives.map((drive) => _buildDriveRow(drive)),
            ]),
        ],
      ),
    );
  }

  // ─── HELPER WIDGETS ──────────────────────────────────────────

  Widget _buildSection(String title, List<Widget> children) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
            child: Text(
              title,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: Color(0xFF3B82F6),
                letterSpacing: 0.3,
              ),
            ),
          ),
          Divider(color: Colors.white.withValues(alpha: 0.06), height: 1),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: children,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, dynamic value) {
    final displayValue = _formatValue(value);
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 130,
            child: Text(
              label,
              style: TextStyle(
                fontSize: 12,
                color: Colors.white.withValues(alpha: 0.4),
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Expanded(
            child: Text(
              displayValue,
              style: TextStyle(
                fontSize: 13,
                color: displayValue == 'N/A'
                    ? Colors.white.withValues(alpha: 0.2)
                    : Colors.white.withValues(alpha: 0.9),
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDocRow(String label, dynamic url) {
    final hasDoc = url != null && url.toString().isNotEmpty;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(
            hasDoc ? Icons.check_circle_rounded : Icons.cancel_rounded,
            size: 16,
            color: hasDoc
                ? const Color(0xFF10B981)
                : Colors.white.withValues(alpha: 0.2),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 13,
                color: Colors.white.withValues(alpha: 0.7),
              ),
            ),
          ),
          Text(
            hasDoc ? 'Uploaded' : 'Missing',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: hasDoc
                  ? const Color(0xFF10B981)
                  : Colors.white.withValues(alpha: 0.3),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGpaGrid(String title, List<Map<String, dynamic>> gpas) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: TextStyle(
            fontSize: 12,
            color: Colors.white.withValues(alpha: 0.4),
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: gpas.map((gpa) {
            final value = gpa['value'];
            final displayValue = _formatValue(value);
            return Container(
              width: 70,
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFF0F172A),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
              ),
              child: Column(
                children: [
                  Text(
                    gpa['label'],
                    style: TextStyle(
                      fontSize: 10,
                      color: Colors.white.withValues(alpha: 0.4),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    displayValue,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: displayValue == 'N/A'
                          ? Colors.white.withValues(alpha: 0.2)
                          : Colors.white,
                    ),
                  ),
                ],
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildStatCard(String title, String value, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withValues(alpha: 0.2)),
        ),
        child: Column(
          children: [
            Text(
              value,
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              title,
              style: TextStyle(
                fontSize: 10,
                color: color.withValues(alpha: 0.8),
                fontWeight: FontWeight.w500,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDriveRow(dynamic drive) {
    final driveName = drive['company_name'] ?? 'Unknown';
    final status = drive['application_status'] ?? drive['status'] ?? '';

    Color statusColor;
    switch (status.toString().toLowerCase()) {
      case 'applied':
        statusColor = const Color(0xFF3B82F6);
        break;
      case 'shortlisted':
        statusColor = const Color(0xFFF59E0B);
        break;
      case 'placed':
        statusColor = const Color(0xFF10B981);
        break;
      case 'rejected':
        statusColor = Colors.redAccent;
        break;
      default:
        statusColor = Colors.white54;
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(
              Icons.work_outlined,
              size: 16,
              color: Colors.white54,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              driveName.toString(),
              style: TextStyle(
                fontSize: 13,
                color: Colors.white.withValues(alpha: 0.8),
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: statusColor.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              status.toString().toUpperCase(),
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.bold,
                color: statusColor,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
