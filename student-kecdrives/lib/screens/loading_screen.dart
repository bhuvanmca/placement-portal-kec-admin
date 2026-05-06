import 'package:flutter/material.dart';

class LoadingScreen extends StatelessWidget {
  const LoadingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // KEC Logo - Same as native splash
            // Using Padding/Container constraints to match native look as closely as possible
            // Native splash usually centers image.
            Padding(
              padding: EdgeInsets.all(32.0),
              child: Image.asset(
                'assets/images/kecdrives_logo.png',
                width: MediaQuery.of(context).size.width * 0.6,
                fit: BoxFit.contain,
              ),
            ),
            SizedBox(height: 48),
            // Horizontal Progress Bar
            SizedBox(
              width: MediaQuery.of(context).size.width * 0.5,
              child: LinearProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(
                  Theme.of(context).colorScheme.primary,
                ),
                backgroundColor: Color(0xFFE0E0E0),
                minHeight: 4,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
