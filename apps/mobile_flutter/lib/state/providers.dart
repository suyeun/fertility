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
final diaryApiProvider = Provider<DiaryApi>(
  (ref) => DiaryApi(ref.watch(apiClientProvider)),
);
final aiApiProvider = Provider<AiApi>(
  (ref) => AiApi(ref.watch(apiClientProvider)),
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
