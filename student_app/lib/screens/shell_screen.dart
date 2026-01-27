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
              indicatorColor: AppConstants.primaryColor.withOpacity(0.12),
              indicatorShape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(24),
              ),
              labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
              selectedIndex: navigationShell.currentIndex,
              onDestinationSelected: (index) {
                navigationShell.goBranch(
                  index,
                  initialLocation: index == navigationShell.currentIndex,
                );
              },
              destinations: [
                NavigationDestination(
                  icon: Icon(
                    Icons.work_outline_rounded,
                    color: navigationShell.currentIndex == 0
                        ? AppConstants.primaryColor
                        : AppConstants.textSecondary,
                  ),
                  selectedIcon: const Icon(
                    Icons.work_rounded,
                    color: AppConstants.primaryColor,
                  ),
                  label: 'Drives',
                ),
                NavigationDestination(
                  icon: Icon(
                    Icons.emoji_events_outlined,
                    color: navigationShell.currentIndex == 1
                        ? AppConstants.primaryColor
                        : AppConstants.textSecondary,
                  ),
                  selectedIcon: const Icon(
                    Icons.emoji_events_rounded,
                    color: AppConstants.primaryColor,
                  ),
                  label: 'Placed',
                ),
                NavigationDestination(
                  icon: Icon(
                    Icons.person_outline_rounded,
                    color: navigationShell.currentIndex == 2
                        ? AppConstants.primaryColor
                        : AppConstants.textSecondary,
                  ),
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
