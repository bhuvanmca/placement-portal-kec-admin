import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/drive_service.dart';
import '../services/api_client.dart';

final driveServiceProvider = Provider<DriveService>(
  (ref) => DriveService(ref.read(apiClientProvider)),
);

class PaginatedDriveState {
  final List<dynamic> drives;
  final int page;
  final int total;
  final bool isLoading;
  final bool isLoadingMore;
  final bool hasMore;

  PaginatedDriveState({
    this.drives = const [],
    this.page = 1,
    this.total = 0,
    this.isLoading = false,
    this.isLoadingMore = false,
    this.hasMore = true,
  });

  PaginatedDriveState copyWith({
    List<dynamic>? drives,
    int? page,
    int? total,
    bool? isLoading,
    bool? isLoadingMore,
    bool? hasMore,
  }) {
    return PaginatedDriveState(
      drives: drives ?? this.drives,
      page: page ?? this.page,
      total: total ?? this.total,
      isLoading: isLoading ?? this.isLoading,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      hasMore: hasMore ?? this.hasMore,
    );
  }
}

class PaginatedDriveNotifier extends Notifier<PaginatedDriveState> {
  @override
  PaginatedDriveState build() {
    // We listen to filter changes to reset pagination
    ref.watch(driveFilterProvider.select((f) => f.searchQuery));

    // Initial fetch or fetch on search change
    Future.microtask(() => refresh());

    return PaginatedDriveState(isLoading: true);
  }

  Future<void> refresh() async {
    state = state.copyWith(isLoading: true, page: 1, drives: [], hasMore: true);
    await _fetchPage(1);
  }

  Future<void> loadMore() async {
    if (state.isLoadingMore || !state.hasMore || state.isLoading) return;

    state = state.copyWith(isLoadingMore: true);
    await _fetchPage(state.page + 1);
  }

  Future<void> _fetchPage(int page) async {
    try {
      final driveService = ref.read(driveServiceProvider);
      final filter = ref.read(driveFilterProvider);

      final result = await driveService.getDrives(
        page: page,
        limit: 100,
        search: filter.searchQuery,
      );

      final List<dynamic> newDrives = result['drives'] ?? [];
      final int total = result['total'] ?? 0;

      final updatedDrives = page == 1
          ? newDrives
          : [...state.drives, ...newDrives];

      state = state.copyWith(
        drives: updatedDrives,
        page: page,
        total: total,
        isLoading: false,
        isLoadingMore: false,
        hasMore: updatedDrives.length < total,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, isLoadingMore: false);
    }
  }
}

final driveListProvider =
    NotifierProvider<PaginatedDriveNotifier, PaginatedDriveState>(() {
      return PaginatedDriveNotifier();
    });

// --- Filter Logic ---

class DriveFilter {
  final String status;
  final String searchQuery;
  final List<String> categories;

  const DriveFilter({
    this.status = 'Upcoming',
    this.searchQuery = '',
    this.categories = const [],
  });

  DriveFilter copyWith({
    String? status,
    String? searchQuery,
    List<String>? categories,
  }) {
    return DriveFilter(
      status: status ?? this.status,
      searchQuery: searchQuery ?? this.searchQuery,
      categories: categories ?? this.categories,
    );
  }
}

class DriveFilterNotifier extends Notifier<DriveFilter> {
  @override
  DriveFilter build() {
    return const DriveFilter();
  }

  void setStatus(String status) {
    state = state.copyWith(status: status);
  }

  void setSearchQuery(String query) {
    state = state.copyWith(searchQuery: query);
  }

  void toggleCategory(String category) {
    final current = List<String>.from(state.categories);
    if (current.contains(category)) {
      current.remove(category);
    } else {
      current.add(category);
    }
    state = state.copyWith(categories: current);
  }

  void clearCategories() {
    state = state.copyWith(categories: []);
  }
}

final driveFilterProvider = NotifierProvider<DriveFilterNotifier, DriveFilter>(
  () {
    return DriveFilterNotifier();
  },
);

// --- Computed Provider ---

// --- Helper Logic ---
// Section is determined purely by backend status so that
// a newly-posted 'open' drive always appears in the 'Upcoming' tab.
String getDriveSection(dynamic drive) {
  final status = drive['status'];
  switch (status) {
    case 'open':
      return 'Upcoming';
    case 'closed':
      return 'Closed';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    case 'on_hold':
      return 'On Hold';
    default:
      return 'Upcoming';
  }
}

// --- Computed Provider ---

final filteredDrivesProvider = Provider.autoDispose<AsyncValue<List<dynamic>>>((
  ref,
) {
  final paginatedState = ref.watch(driveListProvider);
  final filter = ref.watch(driveFilterProvider);

  if (paginatedState.isLoading && paginatedState.drives.isEmpty) {
    return const AsyncValue.loading();
  }

  final drives = paginatedState.drives;
  final results = drives.where((drive) {
    // 1. Status/Section Filter (Tabs)
    final currentSection = getDriveSection(drive);
    bool matchesSection = (currentSection == filter.status); // Tab selection

    // 2. Search Filter
    final company = (drive['company_name'] ?? '').toString().toLowerCase();
    final roles = (drive['roles'] as List? ?? [])
        .map((r) => (r['role_name'] ?? '').toString().toLowerCase())
        .toList();

    bool matchesSearch = company.contains(filter.searchQuery);
    if (!matchesSearch) {
      // Check if any role matches
      matchesSearch = roles.any((r) => r.contains(filter.searchQuery));
    }

    // 3. Modal Filters (Mixed Categories)
    bool matchesModalFilters = true;
    if (filter.categories.isNotEmpty) {
      // Group filters manually since they are flat
      // Logic: For each Selected Filter, the drive must match at least one relevant property?
      // Or: If any filter in a group (e.g. Status) is selected, drive must match one of them.
      // Since we don't have groups in 'filter.categories', we check if the selected item "applies" to the drive.
      // Conservative approach: Drive must match ALL selected filters? No, that breaks checkboxes.
      // Usually: (Match Any Status if selected) AND (Match Any Salary if selected) ...
      // Given flat list, we'll try to match each selected filter string against the drive.
      // If the drive matches ANY property corresponding to the string, we count it?
      // Better: Identify what the filter string IS.

      // Helpers
      bool isStatus(String s) => ['Open', 'Closed'].contains(s);
      bool isSalary(String s) => s.contains('LPA');
      bool isType(String s) => ['On Campus', 'Off Campus', 'Pool'].contains(s);
      // Everything else assumed Category/Domain

      // Partition filters
      final statusFilters = filter.categories.where(isStatus).toList();
      final salaryFilters = filter.categories.where(isSalary).toList();
      final typeFilters = filter.categories.where(isType).toList();
      final otherFilters = filter.categories
          .where((s) => !isStatus(s) && !isSalary(s) && !isType(s))
          .toList();

      // 3a. Status Filter (Strict Open Logic)
      if (statusFilters.isNotEmpty) {
        if (drive['deadline_date'] == null) {
          matchesModalFilters = false;
        } else {
          final deadline = DateTime.parse(drive['deadline_date']).toLocal();
          final isDeadlineFuture = deadline.isAfter(DateTime.now());
          final backendStatus = drive['status'];

          bool isOpen = (backendStatus == 'open' && isDeadlineFuture);
          bool isClosed = !isOpen;

          bool matches = false;
          if (statusFilters.contains('Open') && isOpen) matches = true;
          if (statusFilters.contains('Closed') && isClosed) matches = true;
          if (!matches) matchesModalFilters = false;
        }
      }

      // 3b. Salary Filter (One of the roles must match)
      if (matchesModalFilters && salaryFilters.isNotEmpty) {
        final roles = drive['roles'] as List? ?? [];

        bool matches = false;
        for (final role in roles) {
          final ctc = (role['ctc'] ?? '').toString();
          double roleCtc = 0;
          try {
            final match = RegExp(r'(\d+(\.\d+)?)').firstMatch(ctc);
            if (match != null) roleCtc = double.parse(match.group(0)!);
          } catch (_) {}

          for (final f in salaryFilters) {
            double limit = 0;
            final lMatch = RegExp(r'(\d+)').firstMatch(f);
            if (lMatch != null) limit = double.parse(lMatch.group(0)!);
            if (roleCtc >= limit) {
              matches = true;
              break;
            }
          }
          if (matches) break;
        }
        if (!matches) matchesModalFilters = false;
      }

      // 3c. Drive Type
      if (matchesModalFilters && typeFilters.isNotEmpty) {
        final dType = (drive['drive_type'] ?? '').toString();
        if (!typeFilters.contains(dType)) matchesModalFilters = false;
      }

      // 3d. Other (Category/Domain)
      if (matchesModalFilters && otherFilters.isNotEmpty) {
        final cat = (drive['company_category'] ?? '').toString();
        final dom = (drive['company_domain'] ?? '')
            .toString(); // Assuming field exists
        // Match either
        if (!otherFilters.contains(cat) && !otherFilters.contains(dom)) {
          matchesModalFilters = false;
        }
      }
    }

    return matchesSection && matchesSearch && matchesModalFilters;
  }).toList();

  return AsyncValue.data(results);
});

// --- Stats Provider (for pills) ---
final driveStatsProvider = Provider.autoDispose<Map<String, int>>((ref) {
  final paginatedState = ref.watch(driveListProvider);
  final drives = paginatedState.drives;

  if (paginatedState.isLoading && drives.isEmpty) {
    return {
      'Upcoming': 0,
      'Closed': 0,
      'Completed': 0,
      'Cancelled': 0,
      'On Hold': 0,
    };
  }

  int upcoming = 0;
  int closed = 0;
  int completed = 0;
  int cancelled = 0;
  int onHold = 0;

  for (var drive in drives) {
    final section = getDriveSection(drive);
    switch (section) {
      case 'Upcoming':
        upcoming++;
        break;
      case 'Closed':
        closed++;
        break;
      case 'Completed':
        completed++;
        break;
      case 'Cancelled':
        cancelled++;
        break;
      case 'On Hold':
        onHold++;
        break;
    }
  }

  return {
    'Upcoming': upcoming,
    'Closed': closed,
    'Completed': completed,
    'Cancelled': cancelled,
    'On Hold': onHold,
  };
});
