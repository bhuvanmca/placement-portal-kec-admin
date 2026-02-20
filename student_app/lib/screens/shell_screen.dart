import 'package:flutter/material.dart';

import 'package:go_router/go_router.dart';
import '../utils/constants.dart';

/// Shell screen with Google Pay-style bottom navigation bar
class ShellScreen extends StatelessWidget {
  final StatefulNavigationShell navigationShell;

  const ShellScreen({super.key, required this.navigationShell});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(color: Colors.white),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: NavigationBar(
              height: 64,
              elevation: 0,
              backgroundColor: Colors.transparent,
              surfaceTintColor: Colors.transparent,
              indicatorColor: AppConstants.primaryColor.withValues(alpha: 0.12),
              indicatorShape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(24),
              ),
              labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
              labelTextStyle: WidgetStateProperty.resolveWith<TextStyle>((
                states,
              ) {
                if (states.contains(WidgetState.selected)) {
                  return const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppConstants.primaryColor,
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
                navigationShell.goBranch(
                  index,
                  initialLocation: index == navigationShell.currentIndex,
                );
              },
              destinations: [
                NavigationDestination(
                  icon: const Icon(Icons.work_outline_rounded),
                  selectedIcon: const Icon(
                    Icons.work_rounded,
                    color: AppConstants.primaryColor,
                  ),
                  label: 'Drives',
                ),
                NavigationDestination(
                  icon: const Icon(Icons.emoji_events_outlined),
                  selectedIcon: const Icon(
                    Icons.emoji_events_rounded,
                    color: AppConstants.primaryColor,
                  ),
                  label: 'Placed',
                ),
                NavigationDestination(
                  icon: const Icon(Icons.person_outline_rounded),
                  selectedIcon: const Icon(
                    Icons.person_rounded,
                    color: AppConstants.primaryColor,
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
