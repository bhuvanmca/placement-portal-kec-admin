import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// A RefreshIndicator wrapper that provides organic, two-phase haptic feedback:
///   Phase 1 (Threshold): Subtle `selectionClick()` when drag crosses the trigger point
///   Phase 2 (Release):   Satisfying `mediumImpact()` when the refresh actually fires
class HapticRefreshIndicator extends StatefulWidget {
  final Future<void> Function() onRefresh;
  final Widget child;
  final Color? color;

  const HapticRefreshIndicator({
    super.key,
    required this.onRefresh,
    required this.child,
    this.color,
  });

  @override
  State<HapticRefreshIndicator> createState() => _HapticRefreshIndicatorState();
}

class _HapticRefreshIndicatorState extends State<HapticRefreshIndicator> {
  bool _thresholdReached = false;
  double _dragDistance = 0.0;

  // Wrap onRefresh to fire Phase 2 haptic right before the actual callback
  Future<void> _onRefreshWithHaptic() async {
    // Phase 2: Subtle confirmation on release
    HapticFeedback.selectionClick();
    await widget.onRefresh();
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _onRefreshWithHaptic,
      color: widget.color,
      child: NotificationListener<ScrollNotification>(
        onNotification: (notification) {
          if (notification is ScrollUpdateNotification) {
            // iOS: BouncingScrollPhysics — pixels go negative on overscroll
            if (notification.metrics.axisDirection == AxisDirection.down &&
                notification.metrics.extentBefore == 0 &&
                notification.metrics.pixels < 0) {
              if (notification.metrics.pixels < -60) {
                if (!_thresholdReached) {
                  // Phase 1: Light detent click at threshold
                  HapticFeedback.selectionClick();
                  _thresholdReached = true;
                }
              } else {
                // Reset if user drags back above threshold (allows re-triggering)
                if (_thresholdReached) _thresholdReached = false;
              }
            }
          } else if (notification is OverscrollNotification) {
            // Android: ClampingScrollPhysics — overscroll accumulates
            if (notification.overscroll < 0) {
              _dragDistance += notification.overscroll.abs();
              if (_dragDistance > 60) {
                if (!_thresholdReached) {
                  // Phase 1: Light detent click at threshold
                  HapticFeedback.selectionClick();
                  _thresholdReached = true;
                }
              }
            }
          } else if (notification is ScrollEndNotification) {
            // Reset state when scroll ends
            _thresholdReached = false;
            _dragDistance = 0.0;
          }
          return false;
        },
        child: widget.child,
      ),
    );
  }
}
