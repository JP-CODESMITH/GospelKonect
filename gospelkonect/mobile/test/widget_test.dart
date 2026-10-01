import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:gospelkonect/main.dart';
import 'package:gospelkonect/screens/splash_screen.dart';

void main() {
  testWidgets('splash screen shows then navigates home',
      (WidgetTester tester) async {
    await tester.pumpWidget(const MyApp());

    expect(find.byType(SplashScreen), findsOneWidget);
    expect(find.text('GospelKonect'), findsOneWidget);

    await tester.pump(const Duration(milliseconds: 2600));
    await tester.pumpAndSettle();

    expect(find.byType(SplashScreen), findsNothing);
    expect(find.byIcon(Icons.add), findsOneWidget);
    expect(find.text('0'), findsOneWidget);

    await tester.tap(find.byIcon(Icons.add));
    await tester.pump();

    expect(find.text('1'), findsOneWidget);
  });
}
