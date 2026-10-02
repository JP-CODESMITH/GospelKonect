import 'package:flutter/material.dart';
import 'package:smooth_page_indicator/smooth_page_indicator.dart';

import '../theme/app_colors.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  static const _logoAsset = 'assets/images/gospelkonect_app_logo.png';

  // Bare placeholders — replace with real onboarding copy.
  static const _titles = ['Welcome', 'Feature', 'Get Started'];
  static const _descriptions = [
    'Add your onboarding description here.',
    'Add your onboarding description here.',
    'Add your onboarding description here.',
  ];

  final PageController _controller = PageController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('GospelKonect')),
      body: PageView.builder(
        controller: _controller,
        itemCount: _titles.length,
        itemBuilder: (context, index) => Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Image.asset(_logoAsset, width: 160),
              const SizedBox(height: 40),
              Text(
                _titles[index],
                style: Theme.of(context).textTheme.headlineLarge,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              Text(
                _descriptions[index],
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: AppColors.neutralMuted,
                    ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
      bottomSheet: _PagingBottomBar(
        controller: _controller,
        pageCount: _titles.length,
      ),
    );
  }
}

/// Persistent bottom bar — DESIGN.md Level 2 (active sheets):
/// white surface, #E2E8F0 hairline, ghost Skip + primary Next/Get Started.
class _PagingBottomBar extends StatefulWidget {
  const _PagingBottomBar({
    required this.controller,
    required this.pageCount,
  });

  final PageController controller;
  final int pageCount;

  @override
  State<_PagingBottomBar> createState() => _PagingBottomBarState();
}

class _PagingBottomBarState extends State<_PagingBottomBar> {
  int _page = 0;

  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_syncPage);
  }

  void _syncPage() {
    final page = widget.controller.page?.round();
    if (page != null && page != _page) {
      setState(() => _page = page);
    }
  }

  @override
  void dispose() {
    widget.controller.removeListener(_syncPage);
    super.dispose();
  }

  void _goTo(int page) => widget.controller.animateToPage(
        page,
        duration: const Duration(milliseconds: 500),
        curve: Curves.easeInOut,
      );

  @override
  Widget build(BuildContext context) {
    final isLast = _page == widget.pageCount - 1;

    return Material(
      color: AppColors.surfacePureWhite,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Divider(height: 1),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  OutlinedButton(
                    onPressed: isLast ? null : () => _goTo(widget.pageCount - 1),
                    child: const Text('Skip'),
                  ),
                  SmoothPageIndicator(
                    controller: widget.controller,
                    count: widget.pageCount,
                    onDotClicked: _goTo,
                    effect: const ExpandingDotsEffect(
                      dotWidth: 8,
                      dotHeight: 8,
                      spacing: 6,
                      activeDotColor: AppColors.royalCerulean,
                      dotColor: AppColors.borderSubtle,
                    ),
                  ),
                  isLast
                      ? ElevatedButton(
                          onPressed: () => Navigator.of(context)
                              .pushReplacementNamed('/login'),
                          child: const Text('Get Started'),
                        )
                      : ElevatedButton(
                          onPressed: () => _goTo(_page + 1),
                          child: const Text('Next'),
                        ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
