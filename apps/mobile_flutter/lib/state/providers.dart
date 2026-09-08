import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/api/api.dart';
import '../core/storage/local_cache.dart';
import '../core/storage/token_store.dart';

final tokenStoreProvider = Provider<TokenStore>((ref) => TokenStore());
final localCacheProvider = Provider<LocalCache>((ref) => LocalCache());

final apiClientProvider = Provider<ApiClient>(
  (ref) => ApiClient(ref.watch(tokenStoreProvider)),
);

final authApiProvider = Provider<AuthApi>(
  (ref) => AuthApi(ref.watch(apiClientProvider)),
);
final usersApiProvider = Provider<UsersApi>(
  (ref) => UsersApi(ref.watch(apiClientProvider)),
);
final cyclesApiProvider = Provider<CyclesApi>(
  (ref) => CyclesApi(ref.watch(apiClientProvider)),
);
final hormonesApiProvider = Provider<HormonesApi>(
  (ref) => HormonesApi(ref.watch(apiClientProvider)),
);
final treatmentApiProvider = Provider<TreatmentApi>(
  (ref) => TreatmentApi(ref.watch(apiClientProvider)),
);
final dailyNotesApiProvider = Provider<DailyNotesApi>(
  (ref) => DailyNotesApi(ref.watch(apiClientProvider)),
);
final communityApiProvider = Provider<CommunityApi>(
  (ref) => CommunityApi(ref.watch(apiClientProvider)),
);
final notificationsApiProvider = Provider<NotificationsApi>(
  (ref) => NotificationsApi(ref.watch(apiClientProvider)),
);
final versionApiProvider = Provider<VersionApi>(
  (ref) => VersionApi(ref.watch(apiClientProvider)),
);
final infoApiProvider = Provider<InfoApi>(
  (ref) => InfoApi(ref.watch(apiClientProvider)),
);
final couplesApiProvider = Provider<CouplesApi>(
  (ref) => CouplesApi(ref.watch(apiClientProvider)),
);
final hospitalsApiProvider = Provider<HospitalsApi>(
  (ref) => HospitalsApi(ref.watch(apiClientProvider)),
);
final articlesApiProvider = Provider<ArticlesApi>(
  (ref) => ArticlesApi(ref.watch(apiClientProvider)),
);
final subsidyApiProvider = Provider<SubsidyApi>(
  (ref) => SubsidyApi(ref.watch(apiClientProvider)),
);
final bannersApiProvider = Provider<BannersApi>(
  (ref) => BannersApi(ref.watch(apiClientProvider)),
);

/// 홈 화면 등 다른 탭에서 캘린더의 특정 날짜 일별 상세를 열어달라는 요청을
/// 전달하는 상태. `StatefulShellRoute.indexedStack`은 브랜치 위젯을 계속
/// 유지하므로 쿼리 파라미터 대신 이 provider를 캘린더 화면이 `ref.listen`한다.
final pendingCalendarOpenDateProvider = StateProvider<String?>((ref) => null);
