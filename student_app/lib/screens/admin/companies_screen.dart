import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../models/company.dart';
import '../../providers/company_provider.dart';

class CompaniesScreen extends ConsumerStatefulWidget {
  const CompaniesScreen({super.key});

  @override
  ConsumerState<CompaniesScreen> createState() => _CompaniesScreenState();
}

class _CompaniesScreenState extends ConsumerState<CompaniesScreen> {
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _showAddEditDialog({Company? company}) {
    showDialog(
      context: context,
      builder: (context) => _AddEditCompanyDialog(company: company),
    );
  }

  void _showChecklistDialog(Company company) {
    showDialog(
      context: context,
      builder: (context) => _ChecklistDialog(company: company),
    );
  }

  @override
  Widget build(BuildContext context) {
    final companiesAsync = ref.watch(filteredCompaniesProvider);

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(
            Icons.arrow_back_ios_new_rounded,
            color: Colors.white,
          ),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text(
          'Company Details',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: Colors.white70),
            onPressed: () => ref.invalidate(companyListProvider),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Column(
        children: [
          // Search and Add
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              children: [
                Expanded(
                  child: Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: Colors.white.withValues(alpha: 0.1),
                      ),
                    ),
                    child: TextField(
                      controller: _searchController,
                      style: const TextStyle(color: Colors.white),
                      onChanged: (val) =>
                          ref.read(companySearchProvider.notifier).set(val),
                      decoration: InputDecoration(
                        hintText: 'Search companies...',
                        hintStyle: TextStyle(
                          color: Colors.white.withValues(alpha: 0.3),
                        ),
                        prefixIcon: const Icon(
                          Icons.search,
                          color: Colors.white38,
                        ),
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(
                          vertical: 12,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                ElevatedButton.icon(
                  onPressed: () => _showAddEditDialog(),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF3B82F6),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 12,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  icon: const Icon(Icons.add, size: 18),
                  label: const Text('Add'),
                ),
              ],
            ),
          ),

          // Table Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: const BoxDecoration(
              color: Color(0xFF1E293B),
              border: Border(bottom: BorderSide(color: Colors.white10)),
            ),
            child: const Row(
              children: [
                SizedBox(
                  width: 30,
                  child: Text(
                    'S#',
                    style: TextStyle(
                      color: Colors.white54,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
                Expanded(
                  flex: 3,
                  child: Text(
                    'Company Name',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
                Expanded(
                  flex: 2,
                  child: Text(
                    'Date',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
                SizedBox(
                  width: 60,
                  child: Text(
                    'Actions',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                    textAlign: TextAlign.right,
                  ),
                ),
              ],
            ),
          ),

          // Table Body
          Expanded(
            child: companiesAsync.when(
              data: (companies) {
                if (companies.isEmpty) {
                  return const Center(
                    child: Text(
                      'No companies found',
                      style: TextStyle(color: Colors.white38),
                    ),
                  );
                }
                return ListView.builder(
                  itemCount: companies.length,
                  itemBuilder: (context, index) {
                    final company = companies[index];
                    return InkWell(
                      onTap: () => _showChecklistDialog(company),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 16,
                        ),
                        decoration: BoxDecoration(
                          border: Border(
                            bottom: BorderSide(
                              color: Colors.white.withValues(alpha: 0.05),
                            ),
                          ),
                        ),
                        child: Row(
                          children: [
                            SizedBox(
                              width: 30,
                              child: Text(
                                '${index + 1}',
                                style: const TextStyle(
                                  color: Colors.white38,
                                  fontSize: 13,
                                ),
                              ),
                            ),
                            Expanded(
                              flex: 3,
                              child: Text(
                                company.name,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w600,
                                  fontSize: 14,
                                ),
                              ),
                            ),
                            Expanded(
                              flex: 2,
                              child: Row(
                                children: [
                                  const Icon(
                                    Icons.calendar_today,
                                    size: 12,
                                    color: Color(0xFF3B82F6),
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    DateFormat(
                                      'dd MMM yyyy',
                                    ).format(company.visitDate),
                                    style: const TextStyle(
                                      color: Colors.white70,
                                      fontSize: 12,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            SizedBox(
                              width: 60,
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.end,
                                children: [
                                  IconButton(
                                    icon: const Icon(
                                      Icons.edit,
                                      size: 16,
                                      color: Colors.blueAccent,
                                    ),
                                    onPressed: () =>
                                        _showAddEditDialog(company: company),
                                    constraints: const BoxConstraints(),
                                    padding: EdgeInsets.zero,
                                  ),
                                  const SizedBox(width: 8),
                                  IconButton(
                                    icon: const Icon(
                                      Icons.delete,
                                      size: 16,
                                      color: Colors.redAccent,
                                    ),
                                    onPressed: () => _confirmDelete(company),
                                    constraints: const BoxConstraints(),
                                    padding: EdgeInsets.zero,
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                );
              },
              loading: () => const Center(
                child: CircularProgressIndicator(color: Color(0xFF3B82F6)),
              ),
              error: (err, _) => Center(
                child: Text(
                  'Error: $err',
                  style: const TextStyle(color: Colors.redAccent),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _confirmDelete(Company company) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        title: const Text(
          'Delete Company',
          style: TextStyle(color: Colors.white),
        ),
        content: Text(
          'Are you sure you want to delete ${company.name}?',
          style: const TextStyle(color: Colors.white70),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text(
              'Delete',
              style: TextStyle(color: Colors.redAccent),
            ),
          ),
        ],
      ),
    );

    if (confirm == true) {
      try {
        await ref.read(companyServiceProvider).deleteCompany(company.id);
        ref.invalidate(companyListProvider);
        if (mounted)
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(const SnackBar(content: Text('Company deleted')));
      } catch (e) {
        if (mounted)
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }
}

class _AddEditCompanyDialog extends ConsumerStatefulWidget {
  final Company? company;
  const _AddEditCompanyDialog({this.company});

  @override
  ConsumerState<_AddEditCompanyDialog> createState() =>
      __AddEditCompanyDialogState();
}

class __AddEditCompanyDialogState extends ConsumerState<_AddEditCompanyDialog> {
  late TextEditingController _nameController;
  late TextEditingController _dateController;
  late TextEditingController _inchargeController;
  late TextEditingController _deptController;
  late TextEditingController _salaryController;
  late TextEditingController _eligibilityController;
  late TextEditingController _remarksController;
  DateTime _selectedDate = DateTime.now();

  @override
  void initState() {
    super.initState();
    final c = widget.company;
    _nameController = TextEditingController(text: c?.name ?? '');
    _selectedDate = c?.visitDate ?? DateTime.now();
    _dateController = TextEditingController(
      text: DateFormat('yyyy-MM-dd').format(_selectedDate),
    );
    _inchargeController = TextEditingController(text: c?.incharge ?? '');
    _deptController = TextEditingController(text: c?.eligibleDepartments ?? '');
    _salaryController = TextEditingController(text: c?.salary ?? '');
    _eligibilityController = TextEditingController(text: c?.eligibility ?? '');
    _remarksController = TextEditingController(text: c?.remarks ?? '');
  }

  @override
  void dispose() {
    _nameController.dispose();
    _dateController.dispose();
    _inchargeController.dispose();
    _deptController.dispose();
    _salaryController.dispose();
    _eligibilityController.dispose();
    _remarksController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: const Color(0xFF1E293B),
      title: Text(
        widget.company == null ? 'Add Company' : 'Edit Company',
        style: const TextStyle(color: Colors.white),
      ),
      content: SingleChildScrollView(
        child: Column(
          children: [
            _buildField('Name', _nameController),
            _buildDateField(),
            _buildField('Incharge', _inchargeController),
            _buildField('Departments', _deptController),
            _buildField('Salary', _salaryController),
            _buildField('Eligibility', _eligibilityController),
            _buildField('Remarks', _remarksController, maxLines: 3),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: _save,
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF3B82F6),
          ),
          child: const Text('Save', style: TextStyle(color: Colors.white)),
        ),
      ],
    );
  }

  Widget _buildField(
    String label,
    TextEditingController controller, {
    int maxLines = 1,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextField(
        controller: controller,
        maxLines: maxLines,
        style: const TextStyle(color: Colors.white, fontSize: 14),
        decoration: InputDecoration(
          labelText: label,
          labelStyle: const TextStyle(color: Colors.white54, fontSize: 12),
          enabledBorder: const UnderlineInputBorder(
            borderSide: BorderSide(color: Colors.white10),
          ),
        ),
      ),
    );
  }

  Widget _buildDateField() {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextField(
        controller: _dateController,
        readOnly: true,
        style: const TextStyle(color: Colors.white, fontSize: 14),
        onTap: () async {
          final picked = await showDatePicker(
            context: context,
            initialDate: _selectedDate,
            firstDate: DateTime(2000),
            lastDate: DateTime(2100),
          );
          if (picked != null) {
            setState(() {
              _selectedDate = picked;
              _dateController.text = DateFormat('yyyy-MM-dd').format(picked);
            });
          }
        },
        decoration: const InputDecoration(
          labelText: 'Visit Date',
          labelStyle: TextStyle(color: Colors.white54, fontSize: 12),
          enabledBorder: UnderlineInputBorder(
            borderSide: BorderSide(color: Colors.white10),
          ),
          suffixIcon: Icon(
            Icons.calendar_today,
            size: 16,
            color: Colors.white38,
          ),
        ),
      ),
    );
  }

  void _save() async {
    final data = {
      'name': _nameController.text,
      'visit_date': _dateController.text,
      'incharge': _inchargeController.text,
      'eligible_departments': _deptController.text,
      'salary': _salaryController.text,
      'eligibility': _eligibilityController.text,
      'remarks': _remarksController.text,
    };

    try {
      if (widget.company == null) {
        await ref.read(companyServiceProvider).createCompany(data);
      } else {
        await ref
            .read(companyServiceProvider)
            .updateCompany(widget.company!.id, data);
      }
      ref.invalidate(companyListProvider);
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted)
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error: $e')));
    }
  }
}

class _ChecklistDialog extends ConsumerStatefulWidget {
  final Company company;
  const _ChecklistDialog({required this.company});

  @override
  ConsumerState<_ChecklistDialog> createState() => __ChecklistDialogState();
}

class __ChecklistDialogState extends ConsumerState<_ChecklistDialog> {
  late CompanyChecklist _checklist;

  @override
  void initState() {
    super.initState();
    _checklist = widget.company.checklist;
  }

  void _toggle(String item) async {
    CompanyChecklist next;
    switch (item) {
      case 'approved':
        next = _checklist.copyWith(approved: !_checklist.approved);
        break;
      case 'cab':
        next = _checklist.copyWith(cab: !_checklist.cab);
        break;
      case 'accommodation':
        next = _checklist.copyWith(accommodation: !_checklist.accommodation);
        break;
      case 'rounds':
        next = _checklist.copyWith(rounds: !_checklist.rounds);
        break;
      case 'qpPrintout':
        next = _checklist.copyWith(qpPrintout: !_checklist.qpPrintout);
        break;
      default:
        return;
    }
    setState(() => _checklist = next);
    try {
      await ref
          .read(companyServiceProvider)
          .updateChecklist(widget.company.id, next);
      ref.invalidate(companyListProvider);
    } catch (e) {
      if (mounted)
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed to update: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: const Color(0xFF1E293B),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Readiness Checklist',
            style: TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            widget.company.name,
            style: const TextStyle(color: Color(0xFF3B82F6), fontSize: 14),
          ),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          _buildItem(
            '📜',
            'All Required Approved',
            _checklist.approved,
            () => _toggle('approved'),
          ),
          _buildItem(
            '🚗',
            'Cab Arrangement',
            _checklist.cab,
            () => _toggle('cab'),
          ),
          _buildItem(
            '🏨',
            'Accommodation',
            _checklist.accommodation,
            () => _toggle('accommodation'),
          ),
          _buildItem(
            '👥',
            'Rounds of Interview',
            _checklist.rounds,
            () => _toggle('rounds'),
          ),
          _buildItem(
            '📄',
            'Q/P Printout if any',
            _checklist.qpPrintout,
            () => _toggle('qpPrintout'),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text(
            'Done',
            style: TextStyle(
              color: Color(0xFF3B82F6),
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildItem(String emoji, String text, bool value, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(
          children: [
            Text(emoji, style: const TextStyle(fontSize: 20)),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                text,
                style: const TextStyle(color: Colors.white, fontSize: 14),
              ),
            ),
            Checkbox(
              value: value,
              onChanged: (_) => onTap(),
              activeColor: Colors.green,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(4),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
