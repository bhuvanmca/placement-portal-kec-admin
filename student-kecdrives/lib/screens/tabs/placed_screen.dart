import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/drive_provider.dart';
import '../../widgets/drive_card.dart';
import '../../widgets/haptic_refresh_indicator.dart';

class PlacedScreen extends ConsumerStatefulWidget {
  const PlacedScreen({super.key});

  @override
  ConsumerState<PlacedScreen> createState() => _PlacedScreenState();
}

class _PlacedScreenState extends ConsumerState<PlacedScreen>
    with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _searchController.addListener(() {
      setState(() {
        _searchQuery = _searchController.text.toLowerCase();
      });
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _refresh() async {
    await ref.read(driveListProvider.notifier).refresh();
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final paginatedState = ref.watch(driveListProvider);
    final drives = paginatedState.drives;

    if (paginatedState.isLoading && drives.isEmpty) {
      return Scaffold(
        appBar: AppBar(
          title: Text(
            'Placed Drives',
            style: GoogleFonts.geist(fontWeight: FontWeight.w600),
          ),
          backgroundColor: Theme.of(context).scaffoldBackgroundColor,
          elevation: 0,
          foregroundColor:
              (Theme.of(context).textTheme.bodyLarge?.color ?? Colors.black),
        ),
        body: Column(
          children: [
            LinearProgressIndicator(
              color: Theme.of(context).colorScheme.primary,
              backgroundColor: Colors.transparent,
            ),
            Expanded(child: SizedBox()),
          ],
        ),
      );
    }

    final filteredDrives = drives.where((d) {
      final isPlaced = d['user_status'] == 'placed';
      if (!isPlaced) return false;

      if (_searchQuery.isEmpty) return true;

      final companyName = (d['company_name'] ?? '').toString().toLowerCase();
      final jobRole = (d['job_role'] ?? '').toString().toLowerCase();

      return companyName.contains(_searchQuery) ||
          jobRole.contains(_searchQuery);
    }).toList();

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Placed Drives',
          style: GoogleFonts.geist(fontWeight: FontWeight.w600),
        ),
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        elevation: 0,
        foregroundColor:
            (Theme.of(context).textTheme.bodyLarge?.color ?? Colors.black),
      ),
      body: Column(
        children: [
          // Search Bar
          Container(
            color: Theme.of(context).scaffoldBackgroundColor,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
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
                textAlignVertical: TextAlignVertical.center,
                decoration: const InputDecoration(
                  prefixIcon: Icon(Icons.search, color: Colors.grey, size: 20),
                  hintText: 'Search companies or roles...',
                  hintStyle: TextStyle(color: Colors.grey, fontSize: 14),
                  border: InputBorder.none,
                  contentPadding: EdgeInsets.zero,
                  isDense: true,
                ),
              ),
            ),
          ),
          Expanded(
            child: filteredDrives.isEmpty
                ? (drives.where((d) => d['user_status'] == 'placed').isEmpty
                      ? _buildEmptyState()
                      : _buildNoSearchResults())
                : HapticRefreshIndicator(
                    onRefresh: _refresh,
                    child: ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: filteredDrives.length,
                      itemBuilder: (context, index) {
                        return DriveCard(
                          drive: filteredDrives[index],
                          onRefresh: _refresh,
                        );
                      },
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return HapticRefreshIndicator(
      onRefresh: _refresh,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: SizedBox(
          height: MediaQuery.of(context).size.height * 0.6,
          width: double.infinity,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.emoji_events_outlined,
                size: 64,
                color: Colors.grey[300],
              ),
              const SizedBox(height: 16),
              Text(
                'No placed drives yet',
                style: GoogleFonts.geist(
                  color: Colors.grey[600],
                  fontSize: 17,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Keep applying and best of luck!',
                style: GoogleFonts.geist(color: Colors.grey[400], fontSize: 13),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNoSearchResults() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.search_off, size: 64, color: Colors.grey[300]),
          const SizedBox(height: 16),
          Text(
            'No matching drives found',
            style: GoogleFonts.geist(
              color: Colors.grey[600],
              fontSize: 17,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
