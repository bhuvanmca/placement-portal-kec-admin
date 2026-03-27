import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../utils/constants.dart';
import '../../widgets/app_button.dart';

class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppConstants.spacingLarge),
          child: Column(
            children: [
              const Spacer(),
              // Logo / Illustration
              Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  color: Theme.of(
                    context,
                  ).colorScheme.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(60),
                ),
                child: Icon(
                  Icons.school_rounded,
                  size: 64,
                  color: Theme.of(context).colorScheme.primary,
                ),
              ),
              const SizedBox(height: 32),
              Text(
                'Welcome to KEC',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  color: Theme.of(context).colorScheme.primary,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              Text(
                'Placement Portal',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  color:
                      (Theme.of(context).textTheme.bodyMedium?.color ??
                      Colors.grey),
                  fontWeight: FontWeight.w500,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              Text(
                "Let's complete your profile to get started with placement opportunities.",
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color:
                      (Theme.of(context).textTheme.bodyMedium?.color ??
                      Colors.grey),
                ),
                textAlign: TextAlign.center,
              ),
              const Spacer(),
              AppButton(
                label: 'Get Started',
                icon: Icons.arrow_forward_rounded,
                onPressed: () => context.go('/onboarding/basic-info'),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}
