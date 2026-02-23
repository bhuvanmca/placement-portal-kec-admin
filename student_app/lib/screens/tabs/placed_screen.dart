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

  Future<void> _refresh() {
    return ref.refresh(driveListProvider.future);
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final drivesAsync = ref.watch(driveListProvider);

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
      body: drivesAsync.when(
        loading: () => Column(
          children: [
            LinearProgressIndicator(
              color: Theme.of(context).colorScheme.primary,
              backgroundColor: Colors.transparent,
            ),
            Expanded(child: SizedBox()),
          ],
        ),
        error: (error, stack) => Center(child: Text('Error: $error')),
        data: (drives) {
          final placedDrives = drives
              .where((d) => d['user_status'] == 'placed')
              .toList();

          if (placedDrives.isEmpty) {
            return HapticRefreshIndicator(
              onRefresh: _refresh,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                child: SizedBox(
                  height: MediaQuery.of(context).size.height * 0.8,
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

          return HapticRefreshIndicator(
            onRefresh: _refresh,
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: placedDrives.length,
              itemBuilder: (context, index) {
                return DriveCard(
                  drive: placedDrives[index],
                  onRefresh: _refresh,
                );
              },
            ),
          );
        },
      ),
    );
  }
}
