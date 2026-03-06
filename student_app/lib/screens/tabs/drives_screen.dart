import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../utils/constants.dart';
import '../../services/notification_service.dart';
import '../../providers/drive_provider.dart';
import '../../widgets/drive_card.dart';
import '../../widgets/haptic_refresh_indicator.dart';
import '../notifications_screen.dart'; // [NEW]

class DrivesScreen extends ConsumerStatefulWidget {
  const DrivesScreen({super.key});

  @override
  ConsumerState<DrivesScreen> createState() => _DrivesScreenState();
}

class _DrivesScreenState extends ConsumerState<DrivesScreen>
    with AutomaticKeepAliveClientMixin {
  final TextEditingController _searchController = TextEditingController();
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
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();

    NotificationService.refreshTrigger.addListener(_handleRefreshTrigger);
    _searchController.addListener(() {
      ref
          .read(driveFilterProvider.notifier)
          .setSearchQuery(_searchController.text.toLowerCase());
    });
  }

  @override
  void dispose() {
    NotificationService.refreshTrigger.removeListener(_handleRefreshTrigger);
    _searchController.dispose();
    super.dispose();
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
    // HapticFeedback.selectionClick(); // Satisfying refresher haptic
    try {
      await ref.read(driveListProvider.notifier).refresh();
      if (mounted) {
        setState(() {
          // Refresh completed
        });
      }
    } catch (e) {
      // Error handled
    }
  }

  void _showFilterModal() {
    showGeneralDialog(
      context: context,
      barrierDismissible: true, // Dismiss on tap outside
      barrierLabel: 'Dismiss',
      barrierColor: Colors.black54,
      transitionDuration: const Duration(milliseconds: 400),
      transitionBuilder: (context, animation, secondaryAnimation, child) {
        // Buttery smooth slide-up animation
        return SlideTransition(
          position: Tween<Offset>(begin: const Offset(0, 1), end: Offset.zero)
              .animate(
                CurvedAnimation(parent: animation, curve: Curves.easeOutQuart),
              ),
          child: child,
        );
      },
      pageBuilder: (context, animation, secondaryAnimation) {
        return Align(
          alignment: Alignment.bottomCenter,
          child: Material(
            type: MaterialType.transparency,
            child: StatefulBuilder(
              builder: (context, setModalState) {
                final currentCategory =
                    _filterCategories[_selectedFilterCategoryIndex];
                final currentOptions = _filterOptionsMap[currentCategory] ?? [];
                // Watch provider state inside the modal?
                // Creating a local consumer or just reading current state might be cleaner.
                // For simplicity, we can read the notifier.
                final filterFn = ref.read(driveFilterProvider.notifier);
                final currentFilters = ref
                    .watch(driveFilterProvider)
                    .categories;

                return Container(
                  height: MediaQuery.of(context).size.height * 0.7,
                  decoration: BoxDecoration(
                    color: Theme.of(context).cardColor,
                    borderRadius: BorderRadius.vertical(
                      top: Radius.circular(20),
                    ),
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
                              color:
                                  Theme.of(context).brightness ==
                                      Brightness.dark
                                  ? Colors.black26
                                  : Colors.grey[50],
                              child: ListView.builder(
                                itemCount: _filterCategories.length,
                                itemBuilder: (context, index) {
                                  final category = _filterCategories[index];
                                  final isSelected =
                                      index == _selectedFilterCategoryIndex;
                                  return InkWell(
                                    onTap: () => setModalState(() {
                                      _selectedFilterCategoryIndex = index;
                                    }),
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(
                                        vertical: 16,
                                        horizontal: 16,
                                      ),
                                      color: isSelected
                                          ? (Theme.of(context).brightness ==
                                                    Brightness.dark
                                                ? Colors.grey.shade900
                                                : Colors.white)
                                          : Colors.transparent,
                                      child: Row(
                                        children: [
                                          if (isSelected)
                                            Container(
                                              width: 4,
                                              height: 16,
                                              color: Theme.of(
                                                context,
                                              ).colorScheme.primary,
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
                                                    ? (Theme.of(
                                                                context,
                                                              ).brightness ==
                                                              Brightness.dark
                                                          ? Colors.white
                                                          : Colors.black)
                                                    : Colors.grey[500],
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
                                  final isSelected = currentFilters.contains(
                                    option,
                                  );
                                  return CheckboxListTile(
                                    value: isSelected,
                                    title: Text(option),
                                    activeColor: Theme.of(
                                      context,
                                    ).colorScheme.primary,
                                    contentPadding: EdgeInsets.zero,
                                    controlAffinity:
                                        ListTileControlAffinity.leading,
                                    onChanged: (val) {
                                      setModalState(() {
                                        filterFn.toggleCategory(option);
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
                                  () => filterFn.clearCategories(),
                                ),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: Theme.of(
                                    context,
                                  ).colorScheme.primary,
                                  side: BorderSide(
                                    color: Theme.of(
                                      context,
                                    ).colorScheme.primary,
                                  ),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  padding: const EdgeInsets.symmetric(
                                    vertical: 10,
                                  ),
                                ),
                                child: const Text('Clear Filters'),
                              ),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: ElevatedButton(
                                onPressed: () {
                                  // No local state to apply, provider is already updated
                                  Navigator.pop(context);
                                },
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Theme.of(
                                    context,
                                  ).colorScheme.primary,
                                  foregroundColor:
                                      Theme.of(context).brightness ==
                                          Brightness.dark
                                      ? Colors.black
                                      : Colors.white,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  padding: const EdgeInsets.symmetric(
                                    vertical: 10,
                                  ),
                                ),
                                child: const Text('Done'),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              },
            ), // StatefulBuilder
          ), // Material
        ); // Align
      },
    ); // showGeneralDialog
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    // Watch optimized providers
    final drivesAsync = ref.watch(filteredDrivesProvider);
    final stats = ref.watch(driveStatsProvider);
    final currentFilters = ref.watch(driveFilterProvider);
    final pillMap = stats;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text(
          'Placement Drives',
          style: GoogleFonts.geist(
            fontWeight: FontWeight.w600,
            color: Theme.of(context).brightness == Brightness.dark
                ? Colors.white
                : Colors.black,
          ),
        ),
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        elevation: 0,
        foregroundColor: Theme.of(context).brightness == Brightness.dark
            ? Colors.white
            : Colors.black,
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const NotificationsScreen(),
                ),
              );
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // Top Bar: Search and Filter/Sort
          Container(
            color: Theme.of(context).scaffoldBackgroundColor,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                Expanded(
                  flex: 5,
                  child: Container(
                    height: 40,
                    decoration: BoxDecoration(
                      color: Theme.of(context).brightness == Brightness.dark
                          ? Colors.grey.shade800
                          : Colors.grey[100],
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
                        color: currentFilters.categories.isNotEmpty
                            ? Theme.of(
                                context,
                              ).colorScheme.primary.withValues(alpha: 0.2)
                            : (Theme.of(context).brightness == Brightness.dark
                                  ? Colors.grey.shade800
                                  : Colors.grey[100]), // Highlight if active
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
                            color:
                                Theme.of(context).brightness == Brightness.dark
                                ? Colors.white70
                                : Colors.grey[800],
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
            color: Theme.of(context).scaffoldBackgroundColor,
            height: 60, // Increased height for badges
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              scrollDirection: Axis.horizontal,
              itemCount: pillMap.length,
              separatorBuilder: (c, i) => const SizedBox(width: 12),
              itemBuilder: (context, index) {
                final name = pillMap.keys.elementAt(index);
                final count = pillMap.values.elementAt(index);
                final isSelected = currentFilters.status == name;

                return Stack(
                  clipBehavior: Clip.none,
                  children: [
                    GestureDetector(
                      onTap: () => ref
                          .read(driveFilterProvider.notifier)
                          .setStatus(name),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 300),
                        curve: Curves.easeInOut,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 8,
                        ),
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: isSelected
                              ? (Theme.of(context).brightness == Brightness.dark
                                    ? Colors.white
                                    : Theme.of(context).colorScheme.primary)
                              : (Theme.of(context).brightness == Brightness.dark
                                    ? Colors.grey.shade800
                                    : Colors.grey[200]),
                          borderRadius: BorderRadius.circular(
                            isSelected ? 20 : 10,
                          ),
                        ),
                        child: Text(
                          name, // Just the name
                          style: TextStyle(
                            color: isSelected
                                ? (Theme.of(context).brightness ==
                                          Brightness.dark
                                      ? Colors.black
                                      : Colors.white)
                                : (Theme.of(context).brightness ==
                                          Brightness.dark
                                      ? Colors.white70
                                      : Colors.black),
                            // fontWeight: isSelected
                            //     ? FontWeight.bold
                            //     : FontWeight.normal,
                          ),
                        ),
                      ),
                    ),
                    if (count > 0)
                      Positioned(
                        top: -6,
                        right: -6,
                        child: Container(
                          padding: const EdgeInsets.all(4),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? (Theme.of(context).brightness ==
                                          Brightness.dark
                                      ? Colors.black
                                      : Colors.white)
                                : (Theme.of(context).brightness ==
                                          Brightness.dark
                                      ? Colors.white
                                      : AppConstants.primaryColor),
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: isSelected
                                  ? (Theme.of(context).brightness ==
                                            Brightness.dark
                                        ? Colors.white
                                        : Theme.of(context).colorScheme.primary)
                                  : (Theme.of(context).brightness ==
                                            Brightness.dark
                                        ? Colors.transparent
                                        : Theme.of(
                                            context,
                                          ).colorScheme.primary),
                              width: 1.5,
                            ),
                          ),
                          constraints: const BoxConstraints(
                            minWidth: 20,
                            minHeight: 20,
                          ),
                          child: Center(
                            child: Text(
                              '$count',
                              style: TextStyle(
                                color: isSelected
                                    ? (Theme.of(context).brightness ==
                                              Brightness.dark
                                          ? Colors.white
                                          : Colors.black)
                                    : (Theme.of(context).brightness ==
                                              Brightness.dark
                                          ? Colors.black
                                          : Colors.white),
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                      ),
                  ],
                );
              },
            ),
          ),

          // Result List
          Expanded(
            child: drivesAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => Center(
                child: Padding(
                  padding: const EdgeInsets.all(24.0),
                  child: HapticRefreshIndicator(
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
                          SizedBox(
                            height: MediaQuery.of(context).size.height * 0.4,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              data: (filteredDrives) {
                return HapticRefreshIndicator(
                  onRefresh: _refresh,
                  child: filteredDrives.isEmpty
                      ? SingleChildScrollView(
                          physics: const AlwaysScrollableScrollPhysics(),
                          child: SizedBox(
                            height: 400,
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.work_off_outlined,
                                  size: 64,
                                  color: Colors.grey[300],
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  'No drives found',
                                  style: GoogleFonts.geist(
                                    color: Colors.grey[600],
                                    fontSize: 17,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  'Try adjusting your filters or check back later',
                                  style: GoogleFonts.geist(
                                    color: Colors.grey[400],
                                    fontSize: 13,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        )
                      : NotificationListener<ScrollNotification>(
                          onNotification: (ScrollNotification scrollInfo) {
                            if (scrollInfo.metrics.pixels >=
                                    scrollInfo.metrics.maxScrollExtent - 200 &&
                                !ref.read(driveListProvider).isLoadingMore) {
                              ref.read(driveListProvider.notifier).loadMore();
                            }
                            return false; // Allow RefreshIndicator to receive scroll events
                          },
                          child: ListView.builder(
                            physics: const AlwaysScrollableScrollPhysics(),
                            padding: const EdgeInsets.all(16),
                            itemCount:
                                filteredDrives.length +
                                (ref.watch(driveListProvider).isLoadingMore
                                    ? 1
                                    : 0),
                            itemBuilder: (context, index) {
                              if (index == filteredDrives.length) {
                                return const Padding(
                                  padding: EdgeInsets.symmetric(vertical: 32),
                                  child: Center(
                                    child: CircularProgressIndicator(),
                                  ),
                                );
                              }
                              return GestureDetector(
                                onTap: () {
                                  // HapticFeedback.lightImpact(); // [NEW] Haptic feedback
                                },
                                child: DriveCard(
                                  drive: filteredDrives[index],
                                  onRefresh: _refresh,
                                ),
                              );
                            },
                          ),
                        ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
