import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../services/admin_service.dart';

class AdminStudentsScreen extends ConsumerStatefulWidget {
  const AdminStudentsScreen({super.key});

  @override
  ConsumerState<AdminStudentsScreen> createState() =>
      _AdminStudentsScreenState();
}

class _AdminStudentsScreenState extends ConsumerState<AdminStudentsScreen> {
  final _searchController = TextEditingController();
  List<dynamic> _students = [];
  bool _isLoading = true;
  int _page = 1;
  int _total = 0;
  static const int _limit = 20;
  String _searchType = 'name';
  Timer? _debounce;

  static const Map<String, String> _searchTypes = {
    'name': 'Name',
    'register_number': 'Reg No',
    'phone': 'Phone',
  };

  @override
  void initState() {
    super.initState();
    _searchController.addListener(_onSearchChanged);
    _loadStudents();
  }

  String _getStudentName(dynamic s) {
    // Try full_name first (from users.name), then build from parts
    final fullName = (s['full_name'] ?? '').toString().trim();
    if (fullName.isNotEmpty) return fullName;
    final first = (s['first_name'] ?? '').toString().trim();
    final last = (s['last_name'] ?? '').toString().trim();
    final combined = '$first $last'.trim();
    if (combined.isNotEmpty) return combined;
    return 'Unknown';
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged() {
    setState(() {});
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () {
      _loadStudents(refresh: true);
    });
  }

  Future<void> _loadStudents({bool refresh = false}) async {
    if (refresh) _page = 1;
    setState(() => _isLoading = true);
    try {
      final data = await ref
          .read(adminServiceProvider)
          .getStudents(
            page: _page,
            limit: _limit,
            search: _searchController.text.trim().isNotEmpty
                ? _searchController.text.trim()
                : null,
            searchType: _searchType,
          );
      if (mounted) {
        setState(() {
          _students = data['data'] ?? [];
          _total = data['meta']?['total'] ?? 0;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _toggleBlock(dynamic student) async {
    final id = student['id'] as int;
    final isBlocked = student['is_blocked'] == true;
    final name = _getStudentName(student);

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(isBlocked ? 'Unblock $name?' : 'Block $name?'),
        content: Text(
          isBlocked
              ? 'This will restore access for this student.'
              : 'This will prevent the student from logging in.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(
              isBlocked ? 'Unblock' : 'Block',
              style: TextStyle(color: isBlocked ? Colors.green : Colors.red),
            ),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      await ref.read(adminServiceProvider).toggleBlockStudent(id, !isBlocked);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              isBlocked ? '$name has been unblocked' : '$name has been blocked',
            ),
            backgroundColor: isBlocked ? Colors.green : Colors.orange,
          ),
        );
        _loadStudents();
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

  @override
  Widget build(BuildContext context) {
    final totalPages = (_total / _limit).ceil();

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text(
          'Student Management',
          style: GoogleFonts.geist(fontWeight: FontWeight.bold),
        ),
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        elevation: 0,
        scrolledUnderElevation: 0,
      ),
      body: Column(
        children: [
          // Search bar with dropdown
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            child: Row(
              children: [
                // Search type dropdown
                Container(
                  height: 44,
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  decoration: BoxDecoration(
                    color: Theme.of(context).cardColor,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Theme.of(context).dividerColor),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: _searchType,
                      isDense: true,
                      style: GoogleFonts.geist(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: Theme.of(context).textTheme.bodyLarge?.color,
                      ),
                      items: _searchTypes.entries.map((e) {
                        return DropdownMenuItem(
                          value: e.key,
                          child: Text(e.value),
                        );
                      }).toList(),
                      onChanged: (value) {
                        if (value != null) {
                          setState(() => _searchType = value);
                          if (_searchController.text.trim().isNotEmpty) {
                            _loadStudents(refresh: true);
                          }
                        }
                      },
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                // Search field
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    decoration: InputDecoration(
                      hintText:
                          'Search by ${_searchTypes[_searchType]?.toLowerCase()}…',
                      hintStyle: GoogleFonts.geist(fontSize: 14),
                      prefixIcon: const Icon(Icons.search, size: 20),
                      suffixIcon: _searchController.text.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear, size: 18),
                              onPressed: () {
                                _searchController.clear();
                                _loadStudents(refresh: true);
                              },
                            )
                          : null,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: BorderSide(
                          color: Theme.of(context).dividerColor,
                        ),
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 10,
                      ),
                      filled: true,
                      fillColor: Theme.of(context).cardColor,
                    ),
                    onSubmitted: (_) => _loadStudents(refresh: true),
                  ),
                ),
              ],
            ),
          ),

          // Results
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _students.isEmpty
                ? Center(
                    child: Text(
                      'No students found',
                      style: GoogleFonts.geist(color: Colors.grey[500]),
                    ),
                  )
                : RefreshIndicator(
                    onRefresh: () => _loadStudents(refresh: true),
                    child: ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: _students.length,
                      itemBuilder: (context, index) {
                        final s = _students[index];
                        final isBlocked = s['is_blocked'] == true;
                        return Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          decoration: BoxDecoration(
                            color: Theme.of(context).cardColor,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: isBlocked
                                  ? Colors.red.withValues(alpha: 0.3)
                                  : Theme.of(context).dividerColor,
                              width: 0.5,
                            ),
                          ),
                          child: ListTile(
                            leading: CircleAvatar(
                              backgroundColor: isBlocked
                                  ? Colors.red.withValues(alpha: 0.1)
                                  : Theme.of(context).colorScheme.primary
                                        .withValues(alpha: 0.1),
                              child: Icon(
                                isBlocked ? Icons.block : Icons.person_outline,
                                color: isBlocked
                                    ? Colors.red
                                    : Theme.of(context).colorScheme.primary,
                                size: 20,
                              ),
                            ),
                            title: Text(
                              _getStudentName(s),
                              style: GoogleFonts.geist(
                                fontWeight: FontWeight.w600,
                                fontSize: 14,
                              ),
                            ),
                            subtitle: Text(
                              '${s['register_number'] ?? ''} • ${s['department_code'] ?? ''}',
                              style: GoogleFonts.geist(
                                fontSize: 12,
                                color: Colors.grey[500],
                              ),
                            ),
                            trailing: Switch.adaptive(
                              value: !isBlocked,
                              onChanged: (_) => _toggleBlock(s),
                              activeTrackColor: Colors.green,
                              inactiveThumbColor: Colors.red,
                            ),
                          ),
                        );
                      },
                    ),
                  ),
          ),

          // Pagination
          if (!_isLoading && totalPages > 1)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  IconButton(
                    icon: const Icon(Icons.chevron_left),
                    onPressed: _page > 1
                        ? () {
                            _page--;
                            _loadStudents();
                          }
                        : null,
                  ),
                  Text(
                    'Page $_page of $totalPages',
                    style: GoogleFonts.geist(fontSize: 13),
                  ),
                  IconButton(
                    icon: const Icon(Icons.chevron_right),
                    onPressed: _page < totalPages
                        ? () {
                            _page++;
                            _loadStudents();
                          }
                        : null,
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
