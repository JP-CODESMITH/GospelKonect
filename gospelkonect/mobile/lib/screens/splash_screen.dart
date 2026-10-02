import 'package:flutter/material.dart';
import 'package:flutter_native_splash/flutter_native_splash.dart';

import '../theme/app_colors.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  static const _logoAsset = 'assets/images/gospelkonect_app_logo.png';

  late final AnimationController _controller;
  late final CurvedAnimation _fade;

  @override
  void initState() {
    super.initState();
    FlutterNativeSplash.remove();

    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..forward();
    _fade = CurvedAnimation(parent: _controller, curve: Curves.easeOut);

    Future.delayed(const Duration(milliseconds: 2600), _goToOnboarding);
  }

  void _goToOnboarding() {
    if (!mounted) return;
    Navigator.of(context).pushReplacementNamed('/onboarding');
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surfacePureWhite,
      body: Center(
        child: FadeTransition(
          opacity: _fade,
          child: ScaleTransition(
            scale: Tween<double>(begin: 0.85, end: 1.0).animate(_fade),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Image.asset(_logoAsset, width: 160),
                const SizedBox(height: 20),
                Text(
                  'GospelKonect',
                  style: Theme.of(context).textTheme.displayLarge?.copyWith(
                        color: AppColors.neutralDark,
                      ),
                ),
                const SizedBox(height: 8),
                Container(
                  height: 3,
                  width: 60,
                  decoration: const BoxDecoration(
                    color: AppColors.sunGold,
                    borderRadius: BorderRadius.all(Radius.circular(2)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
