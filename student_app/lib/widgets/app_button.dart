import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Custom elevated button matching shadcn styling
/// - Border radius: 8px (matching shadcn)
/// - Height: 48-52px
/// - Elevated style with shadow
class AppButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool isLoading;
  final bool isOutlined;
  final IconData? icon;
  final double? width;

  const AppButton({
    super.key,
    required this.label,
    this.onPressed,
    this.isLoading = false,
    this.isOutlined = false,
    this.icon,
    this.width,
  });

  @override
  Widget build(BuildContext context) {
    final buttonStyle = isOutlined
        ? OutlinedButton.styleFrom(
            foregroundColor: Theme.of(context).colorScheme.primary,
            side: BorderSide(
              color: Theme.of(context).colorScheme.primary,
              width: 1.5,
            ),
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8), // shadcn radius
            ),
            minimumSize: Size(width ?? double.infinity, 52),
          )
        : ElevatedButton.styleFrom(
            backgroundColor: Theme.of(context).colorScheme.primary,
            foregroundColor: Theme.of(context).brightness == Brightness.dark
                ? Colors.black
                : Colors.white,
            elevation: 2,
            shadowColor: Theme.of(
              context,
            ).colorScheme.primary.withValues(alpha: 0.3),
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8), // shadcn radius
            ),
            minimumSize: Size(width ?? double.infinity, 52),
          );

    final child = isLoading
        ? SizedBox(
            width: 24,
            height: 24,
            child: CircularProgressIndicator(
              strokeWidth: 2.5,
              valueColor: AlwaysStoppedAnimation<Color>(
                Theme.of(context).brightness == Brightness.dark
                    ? Colors.black
                    : Colors.white,
              ),
            ),
          )
        : Row(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (icon != null) ...[
                Icon(icon, size: 20),
                const SizedBox(width: 8),
              ],
              Text(
                label,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.3,
                ),
              ),
            ],
          );

    return SizedBox(
      width: width,
      child: isOutlined
          ? OutlinedButton(
              onPressed: isLoading || onPressed == null
                  ? null
                  : () {
                      HapticFeedback.lightImpact();
                      onPressed?.call();
                    },
              style: buttonStyle,
              child: child,
            )
          : ElevatedButton(
              onPressed: isLoading || onPressed == null
                  ? null
                  : () {
                      HapticFeedback.lightImpact();
                      onPressed?.call();
                    },
              style: buttonStyle,
              child: child,
            ),
    );
  }
}
