import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart';
import 'package:travelwise_mobile/main.dart';

void main() {
  testWidgets('shows the TravelWise sign-in screen', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: LoginPage(onSignedIn: _noop)));
    await tester.pump();
    expect(find.text('TravelWise'), findsOneWidget);
    expect(find.text('Sign in'), findsOneWidget);
  });
}

void _noop() {}
