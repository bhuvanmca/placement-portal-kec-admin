import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../utils/constants.dart';
import '../../services/notification_service.dart';
import '../../providers/drive_provider.dart';
import '../../widgets/drive_card.dart'; // [NEW]

class DrivesScreen extends ConsumerStatefulWidget {
  const DrivesScreen({super.key});

  @override
  ConsumerState<DrivesScreen> createState() => _DrivesScreenState();
}

class _DrivesScreenState extends ConsumerState<DrivesScreen>
    with WidgetsBindingObserver {
  DateTime? _lastRefreshTime;
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  final List<String> _selectedCategories = [];
  String _selectedStatus = 'Upcoming'; // Default
  int _selectedFilterCategoryIndex = 0; // For 2-pane modal

  // Filter Categories mimicking the image
  final List<String> _filterCategories = [
    'Status',
    'Salary',
    'Drive Type',
    'Company Domain',
    'Drive Objective',
    'Company Category',
  ];

  // Options for each category (Mocked/Simplified for now)
  final Map<String, List<String>> _filterOptionsMap = {
    'Status': ['Open', 'Closed'],
    'Salary': ['3LPA+', '5LPA+', '10LPA+'],
    'Drive Type': ['On Campus', 'Off Campus', 'Pool'],
    'Company Domain': ['FinTech', 'EdTech', 'HealthTech', 'E-commerce'],
    'Drive Objective': ['Internship', 'Full Time', 'Intern + PPO'],
    'Company Category': ['Core', 'IT', 'Product', 'Service', 'Start-up', 'MNC'],
  };

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _lastRefreshTime = DateTime.now();

    NotificationService.refreshTrigger.addListener(_handleRefreshTrigger);
    _searchController.addListener(() {
      setState(() {
        _searchQuery = _searchController.text.toLowerCase();
      });
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    NotificationService.refreshTrigger.removeListener(_handleRefreshTrigger);
    _searchController.dispose();
    super.dispose();
  }

  // ... (didChangeAppLifecycleState, _handleRefreshTrigger, _refresh, _apply unchanged)
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _refresh();
    }
  }

  void _handleRefreshTrigger() {
    if (mounted) {
      _refresh();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('New drive posted! List updated.'),
          backgroundColor: AppConstants.successColor,
          duration: Duration(seconds: 2),
        ),
      );
    }
  }

  Future<void> _refresh() async {
    try {
      await ref.refresh(driveListProvider.future);
      if (mounted) {
        setState(() {
          _lastRefreshTime = DateTime.now();
        });
      }
    } catch (e) {
      // Error handled
    }
  }

  void _showFilterModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            final currentCategory =
                _filterCategories[_selectedFilterCategoryIndex];
            final currentOptions = _filterOptionsMap[currentCategory] ?? [];

            return Container(
              height: MediaQuery.of(context).size.height * 0.7,
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
              ),
              child: Column(
                children: [
                  // Header
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Filter',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close),
                          onPressed: () => Navigator.pop(context),
                        ),
                      ],
                    ),
                  ),
                  const Divider(height: 1),

                  // Body (2-Pane)
                  Expanded(
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Left Pane (Categories)
                        Container(
                          width: 140,
                          color: Colors.grey[50],
                          child: ListView.builder(
                            itemCount: _filterCategories.length,
                            itemBuilder: (context, index) {
                              final category = _filterCategories[index];
                              final isSelected =
                                  index == _selectedFilterCategoryIndex;
                              return InkWell(
                                onTap: () => setModalState(
                                  () => _selectedFilterCategoryIndex = index,
                                ),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                    vertical: 16,
                                    horizontal: 16,
                                  ),
                                  color: isSelected
                                      ? Colors.white
                                      : Colors.transparent,
                                  child: Row(
                                    children: [
                                      if (isSelected)
                                        Container(
                                          width: 4,
                                          height: 16,
                                          color: AppConstants.primaryColor,
                                          margin: const EdgeInsets.only(
                                            right: 8,
                                          ),
                                        ),
                                      Expanded(
                                        child: Text(
                                          category,
                                          style: TextStyle(
                                            fontWeight: isSelected
                                                ? FontWeight.bold
                                                : FontWeight.normal,
                                            color: isSelected
                                                ? Colors.black
                                                : Colors.grey[700],
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
                        // Right Pane (Options)
                        Expanded(
                          child: ListView.builder(
                            padding: const EdgeInsets.all(16),
                            itemCount: currentOptions.length,
                            itemBuilder: (context, index) {
                              final option = currentOptions[index];
                              final isSelected = _selectedCategories.contains(
                                option,
                              ); // Reusing logic for now
                              return CheckboxListTile(
                                value: isSelected,
                                title: Text(option),
                                activeColor: AppConstants.primaryColor,
                                contentPadding: EdgeInsets.zero,
                                controlAffinity:
                                    ListTileControlAffinity.leading,
                                onChanged: (val) {
                                  setModalState(() {
                                    if (val == true) {
                                      _selectedCategories.add(option);
                                    } else {
                                      _selectedCategories.remove(option);
                                    }
                                  });
                                },
                              );
                            },
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Footer
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () => setModalState(
                              () => _selectedCategories.clear(),
                            ),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: AppConstants.primaryColor,
                              side: const BorderSide(
                                color: AppConstants.primaryColor,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                              padding: const EdgeInsets.symmetric(vertical: 10),
                            ),
                            child: const Text('Clear Filters'),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: ElevatedButton(
                            onPressed: () {
                              setState(() {});
                              Navigator.pop(context);
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppConstants.primaryColor,
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                              padding: const EdgeInsets.symmetric(vertical: 10),
                            ),
                            child: const Text('Apply'),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final drivesAsync = ref.watch(driveListProvider);

    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      appBar: AppBar(
        title: const Text(
          'Placement Drives',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        foregroundColor: AppConstants.textPrimary,
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () {
              // Notification Screen
            },
          ),
        ],
      ),
      body: drivesAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: RefreshIndicator(
              onRefresh: _refresh,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(
                      Icons.cloud_off_rounded,
                      size: 48,
                      color: Colors.red,
                    ),
                    const SizedBox(height: 16),
                    Text('$error', textAlign: TextAlign.center),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: _refresh,
                      child: const Text('Retry'),
                    ),
                    SizedBox(height: MediaQuery.of(context).size.height * 0.4),
                  ],
                ),
              ),
            ),
          ),
        ),
        data: (drives) {
          // 1. Calculate Counts for Pills
          final now = DateTime.now();
          final today = DateTime(now.year, now.month, now.day);

          final upcomingCount = drives.where((d) {
            // Upcoming: Status Open + Date > Today
            if (d['status'] != 'open') return false;
            final dDate = DateTime.parse(d['drive_date']);
            final dDay = DateTime(dDate.year, dDate.month, dDate.day);
            // "Upcoming" usually means future.
            // User logic: "for on going, check date... if matches today push to ongoing".
            // So Upcoming is > Today (future)
            return dDay.isAfter(today);
          }).length;

          final ongoingCount = drives.where((d) {
            // Ongoing: Status Open + Date == Today
            if (d['status'] != 'open') return false;
            final dDate = DateTime.parse(d['drive_date']);
            final dDay = DateTime(dDate.year, dDate.month, dDate.day);
            return dDay.isAtSameMomentAs(today);
          }).length;

          final completedCount = drives
              .where((d) => d['status'] == 'completed')
              .length;
          final cancelledCount = drives
              .where((d) => d['status'] == 'cancelled')
              .length;
          final onHoldCount = drives
              .where((d) => d['status'] == 'on_hold')
              .length;

          final pillMap = {
            'Upcoming': upcomingCount,
            'Ongoing': ongoingCount,
            'Completed': completedCount,
            'Cancelled': cancelledCount,
            'On Hold': onHoldCount,
          };

          // 2. Filter Logic for List
          final filteredDrives = drives.where((drive) {
            // Status/Pill Filter
            bool matchesStatus = false;
            final status = drive['status'];
            final dDate = DateTime.parse(drive['drive_date']);
            final dDay = DateTime(dDate.year, dDate.month, dDate.day);

            if (_selectedStatus == 'Upcoming') {
              matchesStatus = (status == 'open' && dDay.isAfter(today));
            } else if (_selectedStatus == 'Ongoing') {
              matchesStatus =
                  (status == 'open' && dDay.isAtSameMomentAs(today));
            } else if (_selectedStatus == 'Completed') {
              matchesStatus = (status == 'completed');
            } else if (_selectedStatus == 'Cancelled') {
              matchesStatus = (status == 'cancelled');
            } else if (_selectedStatus == 'On Hold') {
              matchesStatus = (status == 'on_hold');
            }

            // Search Filter
            final company = (drive['company_name'] ?? '')
                .toString()
                .toLowerCase();
            final matchesSearch = company.contains(_searchQuery);

            // Category Filter (from Modal)
            bool matchesCategory = true;
            if (_selectedCategories.isNotEmpty) {
              // Check exact matches or simplified matches (Core, IT..)
              // We support "Company Category" from modal
              final cat = (drive['company_category'] ?? '').toString();
              matchesCategory = _selectedCategories.contains(cat);
            }

            return matchesStatus && matchesSearch && matchesCategory;
          }).toList();

          return RefreshIndicator(
            onRefresh: _refresh,
            child: Column(
              children: [
                // Top Bar: Search and Filter/Sort
                Container(
                  color: Colors.white,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        flex: 5,
                        child: Container(
                          height: 40,
                          decoration: BoxDecoration(
                            color: Colors.grey[100],
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: TextField(
                            controller: _searchController,
                            textAlignVertical:
                                TextAlignVertical.center, // Fix alignment
                            decoration: const InputDecoration(
                              // hint: Text('Search'),
                              prefixIcon: Icon(
                                Icons.search,
                                color: Colors.grey,
                                size: 20,
                              ),
                              border: InputBorder.none,
                              contentPadding: EdgeInsets
                                  .zero, // Remove padding to let Align center it
                              isDense: true,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        flex: 2,
                        child: GestureDetector(
                          onTap: _showFilterModal,
                          child: Container(
                            height: 40,
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            decoration: BoxDecoration(
                              color: _selectedCategories.isNotEmpty
                                  ? Colors.grey[300]
                                  : Colors.grey[100], // Highlight if active
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Text(
                                  'Filter',
                                  style: TextStyle(fontWeight: FontWeight.w500),
                                ),
                                const SizedBox(width: 8),
                                Icon(
                                  Icons.tune,
                                  color: Colors.grey[800],
                                  size: 16,
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // Horizontal Status Pills
                Container(
                  color: Colors.white,
                  height: 60, // Increased height for badges
                  child: ListView.separated(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 10,
                    ),
                    scrollDirection: Axis.horizontal,
                    itemCount: pillMap.length,
                    separatorBuilder: (c, i) => const SizedBox(width: 12),
                    itemBuilder: (context, index) {
                      final name = pillMap.keys.elementAt(index);
                      final count = pillMap.values.elementAt(index);
                      final isSelected = _selectedStatus == name;

                      return GestureDetector(
                        onTap: () => setState(() => _selectedStatus = name),
                        child: Stack(
                          clipBehavior: Clip.none,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 8,
                              ),
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                color: isSelected
                                    ? AppConstants.primaryColor
                                    : Colors.grey[200],
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Text(
                                name, // Just the name
                                style: TextStyle(
                                  color: isSelected
                                      ? Colors.white
                                      : Colors.black,
                                  fontWeight: isSelected
                                      ? FontWeight.bold
                                      : FontWeight.normal,
                                ),
                              ),
                            ),
                            if (count > 0)
                              Positioned(
                                top: -6,
                                right: -6,
                                child: Container(
                                  padding: const EdgeInsets.all(4),
                                  decoration: const BoxDecoration(
                                    color: Colors.red,
                                    shape: BoxShape.circle,
                                  ),
                                  constraints: const BoxConstraints(
                                    minWidth: 16,
                                    minHeight: 16,
                                  ),
                                  child: Center(
                                    child: Text(
                                      '$count',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                          ],
                        ),
                      );
                    },
                  ),
                ),

                // Result List
                Expanded(
                  child: filteredDrives.isEmpty
                      ? SingleChildScrollView(
                          physics: const AlwaysScrollableScrollPhysics(),
                          child: SizedBox(
                            height: 400,
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.search_off,
                                  size: 60,
                                  color: Colors.grey[300],
                                ),
                                const SizedBox(height: 16),
                                const Text("No drives found here"),
                              ],
                            ),
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: filteredDrives.length,
                          itemBuilder: (context, index) => DriveCard(
                            drive: filteredDrives[index],
                            onRefresh: _refresh,
                          ),
                        ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
