import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

class AdminShellScreen extends StatelessWidget {
  final StatefulNavigationShell navigationShell;

  const AdminShellScreen({super.key, required this.navigationShell});

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
                  icon: const Icon(Icons.dashboard_outlined),
                  selectedIcon: Icon(
                    Icons.dashboard,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                  label: 'Dashboard',
                ),
                NavigationDestination(
                  icon: const Icon(Icons.people_outlined),
                  selectedIcon: Icon(
                    Icons.people,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                  label: 'Students',
                ),
                NavigationDestination(
                  icon: const Icon(Icons.business_outlined),
                  selectedIcon: Icon(
                    Icons.business,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                  label: 'Drives',
                ),
                NavigationDestination(
                  icon: const Icon(Icons.pending_actions_outlined),
                  selectedIcon: Icon(
                    Icons.pending_actions,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                  label: 'Requests',
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
