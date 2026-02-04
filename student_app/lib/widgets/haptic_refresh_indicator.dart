import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

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
  bool _hapticTriggered = false;
  double _dragDistance = 0.0;

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: widget.onRefresh,
      color: widget.color,
      child: NotificationListener<ScrollNotification>(
        onNotification: (notification) {
          // Detect pull distance
          if (notification is ScrollUpdateNotification) {
            // For BouncingScrollPhysics (iOS)
            if (notification.metrics.axisDirection == AxisDirection.down &&
                notification.metrics.extentBefore == 0 &&
                notification.metrics.pixels < 0) {
              if (notification.metrics.pixels < -60) {
                if (!_hapticTriggered) {
                  HapticFeedback.mediumImpact(); // Trigger haptic
                  _hapticTriggered = true;
                }
              } else {
                if (_hapticTriggered) _hapticTriggered = false;
              }
            }
          } else if (notification is OverscrollNotification) {
            // For ClampingScrollPhysics (Android)
            if (notification.overscroll < 0) {
              _dragDistance += notification.overscroll.abs();
              if (_dragDistance > 60) {
                if (!_hapticTriggered) {
                  HapticFeedback.mediumImpact();
                  _hapticTriggered = true;
                }
              }
            }
          } else if (notification is ScrollEndNotification) {
            _hapticTriggered = false;
            _dragDistance = 0.0;
          }
          return false;
        },
        child: widget.child,
      ),
    );
  }
}
