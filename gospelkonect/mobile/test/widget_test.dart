import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:gospelkonect/main.dart';
import 'package:gospelkonect/screens/login_screen.dart';
import 'package:gospelkonect/screens/onboarding_screen.dart';
import 'package:gospelkonect/screens/registration_screen.dart';
import 'package:gospelkonect/screens/splash_screen.dart';

void main() {
  testWidgets('splash → onboarding → login → register flow',
      (WidgetTester tester) async {
    await tester.pumpWidget(const MyApp());

    expect(find.byType(SplashScreen), findsOneWidget);

    await tester.pump(const Duration(milliseconds: 2600));
    await tester.pumpAndSettle();

    expect(find.byType(OnboardingScreen), findsOneWidget);
    expect(find.byType(MyHomePage), findsNothing);

    await tester.tap(find.widgetWithText(ElevatedButton, 'Next'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(ElevatedButton, 'Next'));
    await tester.pumpAndSettle();

    expect(find.widgetWithText(ElevatedButton, 'Get Started'), findsOneWidget);

    await tester.tap(find.widgetWithText(ElevatedButton, 'Get Started'));
    await tester.pumpAndSettle();

    expect(find.byType(LoginScreen), findsOneWidget);

    await tester.tap(find.widgetWithText(TextButton, 'Create Account'));
    await tester.pumpAndSettle();

    expect(find.byType(RegistrationScreen), findsOneWidget);

    await tester.tap(find.widgetWithText(TextButton, 'Sign In'));
    await tester.pumpAndSettle();

    expect(find.byType(LoginScreen), findsOneWidget);
    expect(find.byType(RegistrationScreen), findsNothing);
  });
}
