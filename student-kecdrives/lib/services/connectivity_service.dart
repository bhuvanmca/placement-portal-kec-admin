import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// Provides the current list of connectivity results (e.g. mobile, wifi, none)
final connectivityStreamProvider = StreamProvider<List<ConnectivityResult>>((
  ref,
) {
  return Connectivity().onConnectivityChanged;
});

// Provides a simplified boolean: true if connected, false if no connection
final isConnectedProvider = Provider<bool>((ref) {
  final connectivityAsync = ref.watch(connectivityStreamProvider);

  return connectivityAsync.when(
    data: (results) {
      // If result contains none, we are offline.
      // Note: connectivity_plus 6.0+ returns List<ConnectivityResult>
      if (results.contains(ConnectivityResult.none)) {
        return false;
      }
      // If the list is empty, treat as unknown/disconnected or handle gracefully.
      // Usually it returns at least one value.
      return results.isNotEmpty;
    },
    error: (error, stackTrace) =>
        true, // Assume connected on error to avoid blocking user unnecessarily
    loading: () => true, // Assume connected while loading
  );
});
