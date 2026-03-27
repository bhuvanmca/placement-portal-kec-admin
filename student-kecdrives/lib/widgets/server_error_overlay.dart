import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/server_status_provider.dart';
import '../services/api_client.dart';
import '../utils/constants.dart';
import '../providers/theme_provider.dart';

class ServerErrorOverlay extends ConsumerStatefulWidget {
  const ServerErrorOverlay({super.key});

  @override
  ConsumerState<ServerErrorOverlay> createState() => _ServerErrorOverlayState();
}

class _ServerErrorOverlayState extends ConsumerState<ServerErrorOverlay> {
  bool _isRetrying = false;
  Timer? _autoRecoveryTimer;

  @override
  void initState() {
    super.initState();
    _startAutoRecovery();
  }

  @override
  void dispose() {
    _autoRecoveryTimer?.cancel();
    super.dispose();
  }

  void _startAutoRecovery() {
    _autoRecoveryTimer?.cancel();
    _autoRecoveryTimer = Timer.periodic(const Duration(seconds: 120), (
      _,
    ) async {
      if (!mounted) return;
      final isServerUp = ref.read(serverStatusProvider);
      if (isServerUp) {
        _autoRecoveryTimer?.cancel();
        return;
      }
      final apiClient = ref.read(apiClientProvider);
      final isUp = await apiClient.checkHealth(AppConstants.apiBaseUrl);
      if (isUp && mounted) {
        ref.read(serverStatusProvider.notifier).setStatus(true);
        _autoRecoveryTimer?.cancel();
      }
    });
  }

  Future<void> _retry() async {
    setState(() => _isRetrying = true);

    // Attempt health check
    final apiClient = ref.read(apiClientProvider);
    final isUp = await apiClient.checkHealth(AppConstants.apiBaseUrl);

    if (isUp) {
      ref.read(serverStatusProvider.notifier).setStatus(true);
    } else {
      // Artificial delay if check was too fast
      await Future.delayed(const Duration(milliseconds: 500));
    }

    if (mounted) setState(() => _isRetrying = false);
  }

  @override
  Widget build(BuildContext context) {
    final isServerUp = ref.watch(serverStatusProvider);

    if (isServerUp) return const SizedBox.shrink();

    final theme = AppTheme.lightTheme;

    return Theme(
      data: theme,
      child: Material(
        color: Colors.black.withValues(alpha: 0.7),
        child: Center(
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 32),
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: theme.cardColor,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.2),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    Icons.dns_rounded, // Server icon
                    size: 40,
                    color: Colors.red.shade600,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'Server Unavailable',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color:
                        (theme.textTheme.bodyMedium?.color ?? Colors.black87),
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  'We are having trouble connecting to the server. It might be down for maintenance.',
                  style: TextStyle(
                    fontSize: 14,
                    color: (theme.textTheme.bodySmall?.color ?? Colors.black54),
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _isRetrying ? null : _retry,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.black87,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    child: _isRetrying
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation<Color>(
                                Colors.white,
                              ),
                            ),
                          )
                        : Text(
                            'Retry Connection',
                            style: TextStyle(
                              color: (theme.brightness == Brightness.dark
                                  ? Colors.black
                                  : Colors.white),
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
