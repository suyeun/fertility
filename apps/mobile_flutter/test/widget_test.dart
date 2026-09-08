import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:bom_mobile/app.dart';
import 'package:bom_mobile/core/api/api.dart';
import 'package:bom_mobile/core/storage/token_store.dart';
import 'package:bom_mobile/state/providers.dart';

/// 앱 부팅 시 BomApp.initState 가 버전 체크 API 를 호출한다. 테스트 환경에서는
/// 네트워크가 막혀 있어 Dio 가 만든 타이머가 위젯 트리 폐기 후에도 남고
/// flutter_test 의 "pending timer" 검사에 걸린다. 네트워크를 타지 않는 가짜로 대체한다.
class _FakeVersionApi extends VersionApi {
  _FakeVersionApi() : super(ApiClient(TokenStore()));

  @override
  Future<VersionCheckResult> check(String version, String platform) async =>
      VersionCheckResult(status: 'ok', message: '');
}

void main() {
  testWidgets('App boots to splash without throwing', (WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [versionApiProvider.overrideWithValue(_FakeVersionApi())],
        child: const BomApp(),
      ),
    );
    await tester.pump();

    expect(find.byType(CircularProgressIndicator), findsOneWidget);
  });
}
