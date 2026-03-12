import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../screens/login_screen.dart';
import '../providers/auth_provider.dart'; // [NEW]
import '../screens/shell_screen.dart';
import '../screens/tabs/drives_screen.dart';
import '../screens/tabs/placed_screen.dart';
import '../screens/tabs/profile_screen.dart';
import '../screens/onboarding/welcome_screen.dart';
import '../screens/onboarding/contact_details_screen.dart';
import '../screens/onboarding/academic_details_screen.dart';
import '../screens/onboarding/address_screen.dart';
import '../screens/onboarding/profile_pic_screen.dart';
import '../screens/onboarding/documents_screen.dart';
import '../screens/loading_screen.dart'; // [NEW]
import '../screens/admin/admin_shell_screen.dart';
import '../screens/admin/admin_dashboard_screen.dart';
import '../screens/admin/admin_students_screen.dart';
import '../screens/admin/admin_drives_screen.dart';
import '../screens/admin/admin_requests_screen.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>();
// final _shellNavigatorKey = GlobalKey<NavigatorState>();

final routerProvider = Provider<GoRouter>((ref) {
  // We use a Listenable to notify GoRouter of updates.
  // This prevents the GoRouter from being rebuilt on every change,
  // which causes navigation state loss and flickering.
  final authNotifier = ValueNotifier<AsyncValue<AuthState?>>(
    const AsyncValue.loading(),
  );

  // Listen to auth changes and update the notifier
  ref.listen(
    authControllerProvider,
    (_, next) => authNotifier.value = next,
    fireImmediately: true,
  );

  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    refreshListenable: authNotifier,
    initialLocation: '/drives', // Default to drives, redirect will handle auth
    redirect: (context, state) {
      // Read the current source of truth directly
      final authState = ref.read(authControllerProvider);

      final isLoading = authState.isLoading;
      final isAuthenticated = authState.value != null;

      final isLoginRoute = state.matchedLocation == '/login';
      final isOnboardingRoute = state.matchedLocation.startsWith('/onboarding');
      final isLoadingRoute = state.matchedLocation == '/loading';
      final isAdminRoute = state.matchedLocation.startsWith('/admin');

      // If loading, show loading screen
      if (isLoading) return '/loading';

      // If finished loading and still on loading screen, redirect based on auth
      if (!isLoading && isLoadingRoute) {
        if (!isAuthenticated) return '/login';
        if (authState.value!.isAdmin) return '/admin/dashboard';
        return authState.value!.isProfileComplete
            ? '/drives'
            : '/onboarding/welcome';
      }

      if (!isAuthenticated) {
        return isLoginRoute ? null : '/login';
      }

      // Admin role routing
      if (isAuthenticated && authState.value!.isAdmin) {
        // Admins should not access student routes
        if (isLoginRoute) return '/admin/dashboard';
        if (!isAdminRoute) return '/admin/dashboard';
        return null;
      }

      // Student role routing — block admin routes
      if (isAuthenticated && !authState.value!.isAdmin) {
        if (isAdminRoute) return '/drives';

        final isProfileComplete = authState.value!.isProfileComplete;
        if (!isProfileComplete && !isOnboardingRoute) {
          return '/onboarding/welcome';
        }
        if (isProfileComplete && isOnboardingRoute) {
          return '/drives';
        }
      }

      return null;
    },
    routes: [
      // Loading Screen
      GoRoute(
        path: '/loading',
        builder: (context, state) => const LoadingScreen(),
      ),

      // Login
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),

      // Onboarding Flow
      GoRoute(
        path: '/onboarding/welcome',
        builder: (context, state) => const WelcomeScreen(),
      ),
      GoRoute(
        path: '/onboarding/contact',
        builder: (context, state) => const ContactDetailsScreen(),
      ),
      GoRoute(
        path: '/onboarding/academic',
        builder: (context, state) => const AcademicDetailsScreen(),
      ),
      GoRoute(
        path: '/onboarding/address',
        builder: (context, state) => const AddressScreen(),
      ),
      GoRoute(
        path: '/onboarding/profile-pic',
        builder: (context, state) => const ProfilePicScreen(),
      ),
      GoRoute(
        path: '/onboarding/documents',
        builder: (context, state) => const DocumentsScreen(),
      ),

      // Main App Shell with Bottom Navigation
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return ShellScreen(navigationShell: navigationShell);
        },
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/drives',
                builder: (context, state) => const DrivesScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/placed',
                builder: (context, state) => const PlacedScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/profile',
                builder: (context, state) => const ProfileScreen(),
              ),
            ],
          ),
        ],
      ),

      // Admin Shell with Bottom Navigation
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return AdminShellScreen(navigationShell: navigationShell);
        },
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/admin/dashboard',
                builder: (context, state) => const AdminDashboardScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/admin/students',
                builder: (context, state) => const AdminStudentsScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/admin/drives',
                builder: (context, state) => const AdminDrivesScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/admin/requests',
                builder: (context, state) => const AdminRequestsScreen(),
              ),
            ],
          ),
        ],
      ),
    ],
  );
});
