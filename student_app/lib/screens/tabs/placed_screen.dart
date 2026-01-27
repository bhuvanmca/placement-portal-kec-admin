import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/drive_provider.dart';
import '../../widgets/drive_card.dart';
import '../../utils/constants.dart';

class PlacedScreen extends ConsumerWidget {
  const PlacedScreen({super.key});

  Future<void> _refresh(WidgetRef ref) {
    return ref.refresh(driveListProvider.future);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final drivesAsync = ref.watch(driveListProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Placed Drives',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        foregroundColor: AppConstants.textPrimary,
      ),
      body: drivesAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('Error: $error')),
        data: (drives) {
          final placedDrives = drives
              .where((d) => d['user_status'] == 'placed')
              .toList();

          if (placedDrives.isEmpty) {
            return RefreshIndicator(
              onRefresh: () => _refresh(ref),
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                child: SizedBox(
                  height: MediaQuery.of(context).size.height * 0.8,
                  width: double.infinity,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.check_circle_outline,
                        size: 80,
                        color: Colors.grey[300],
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'No placed drives yet.',
                        style: TextStyle(
                          fontSize: 18,
                          color: Colors.grey,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Keep applying and best of luck!',
                        style: TextStyle(color: Colors.grey),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () => _refresh(ref),
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: placedDrives.length,
              itemBuilder: (context, index) {
                return DriveCard(
                  drive: placedDrives[index],
                  onRefresh: () => _refresh(ref),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
