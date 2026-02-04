import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/drive_service.dart';
import '../services/api_client.dart';

final driveServiceProvider = Provider<DriveService>(
  (ref) => DriveService(ref.read(apiClientProvider)),
);

final driveListProvider = FutureProvider.autoDispose<List<dynamic>>((
  ref,
) async {
  // Keep the state alive even if not being listened to (caching)
  // Use keepAlive for 5 minutes or until manually invalidated
  ref.keepAlive();

  // Auto-dispose if not used for 5 minutes?
  // For now, let's just keep it alive while the app is running or until refresh.
  // Actually, standard keepAlive is fine for tab switching.

  final driveService = ref.watch(driveServiceProvider);
  return driveService.getDrives();
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
String getDriveSection(dynamic drive) {
  final status = drive['status'];
  if (status == 'cancelled') return 'Cancelled';
  if (status == 'on_hold') return 'On Hold';
  // Explicit completed status takes precedence, or we auto-move
  if (status == 'completed') return 'Completed';

  final dateStr = drive['drive_date'];
  if (dateStr == null) return 'Upcoming'; // Safe fallback

  final now = DateTime.now();
  final driveDate = DateTime.parse(dateStr);
  final completionThreshold = driveDate.add(const Duration(hours: 24));

  // 1. Completed: > 24h after drive date
  if (now.isAfter(completionThreshold)) {
    return 'Completed';
  }

  // 2. Upcoming: Future date
  if (driveDate.isAfter(now)) {
    return 'Upcoming';
  }

  // 3. Ongoing: Started but not yet 24h past
  return 'Ongoing';
}

// --- Computed Provider ---

final filteredDrivesProvider = Provider.autoDispose<AsyncValue<List<dynamic>>>((
  ref,
) {
  final drivesAsync = ref.watch(driveListProvider);
  final filter = ref.watch(driveFilterProvider);

  return drivesAsync.whenData((drives) {
    return drives.where((drive) {
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
        bool isType(String s) =>
            ['On Campus', 'Off Campus', 'Pool'].contains(s);
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
          final deadline = DateTime.parse(drive['deadline_date']);
          final isDeadlineFuture = deadline.isAfter(DateTime.now());
          final backendStatus = drive['status'];

          bool isOpen = (backendStatus == 'open' && isDeadlineFuture);
          bool isClosed = !isOpen; // Simplification as requested

          bool matches = false;
          if (statusFilters.contains('Open') && isOpen) matches = true;
          if (statusFilters.contains('Closed') && isClosed) matches = true;
          if (!matches) matchesModalFilters = false;
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
  });
});

// --- Stats Provider (for pills) ---
final driveStatsProvider = Provider.autoDispose<Map<String, int>>((ref) {
  final drivesAsync = ref.watch(driveListProvider);

  return drivesAsync.maybeWhen(
    data: (drives) {
      int upcoming = 0;
      int ongoing = 0;
      int completed = 0;
      int cancelled = 0;
      int onHold = 0;

      for (var drive in drives) {
        final section = getDriveSection(drive);
        switch (section) {
          case 'Upcoming':
            upcoming++;
            break;
          case 'Ongoing':
            ongoing++;
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
        'Ongoing': ongoing,
        'Completed': completed,
        'Cancelled': cancelled,
        'On Hold': onHold,
      };
    },
    orElse: () => {
      'Upcoming': 0,
      'Ongoing': 0,
      'Completed': 0,
      'Cancelled': 0,
      'On Hold': 0,
    },
  );
});
