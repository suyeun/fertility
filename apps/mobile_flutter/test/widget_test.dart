import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:bom_mobile/app.dart';

void main() {
  testWidgets('App boots to splash without throwing', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: BomApp()));
    await tester.pump();

    expect(find.byType(CircularProgressIndicator), findsOneWidget);
  });
}
