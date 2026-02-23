import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'package:go_router/go_router.dart';

/// Shell screen with Google Pay-style bottom navigation bar
class ShellScreen extends StatelessWidget {
  final StatefulNavigationShell navigationShell;

  const ShellScreen({super.key, required this.navigationShell});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: Container(
        decoration: BoxDecoration(color: Theme.of(context).cardColor),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: NavigationBar(
              height: 64,
              elevation: 0,
              backgroundColor: Colors.transparent,
              surfaceTintColor: Colors.transparent,
              indicatorColor: Theme.of(
                context,
              ).colorScheme.primary.withValues(alpha: 0.12),
              indicatorShape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(24),
              ),
              labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
              labelTextStyle: WidgetStateProperty.resolveWith<TextStyle>((
                states,
              ) {
                if (states.contains(WidgetState.selected)) {
                  return TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: Theme.of(context).colorScheme.primary,
                  );
                }
                return TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w400,
                  color: Colors.grey[600],
                );
              }),
              selectedIndex: navigationShell.currentIndex,
              onDestinationSelected: (index) {
                HapticFeedback.lightImpact();
                navigationShell.goBranch(
                  index,
                  initialLocation: index == navigationShell.currentIndex,
                );
              },
              destinations: [
                NavigationDestination(
                  icon: const Icon(Icons.work_outline_rounded),
                  selectedIcon: Icon(
                    Icons.work_rounded,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                  label: 'Drives',
                ),
                NavigationDestination(
                  icon: const Icon(Icons.emoji_events_outlined),
                  selectedIcon: Icon(
                    Icons.emoji_events_rounded,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                  label: 'Placed',
                ),
                NavigationDestination(
                  icon: const Icon(Icons.person_outline_rounded),
                  selectedIcon: Icon(
                    Icons.person_rounded,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                  label: 'Profile',
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
