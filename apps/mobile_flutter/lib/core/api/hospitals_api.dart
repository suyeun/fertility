import '../models/article.dart';
import '../models/hospital.dart';
import 'client.dart';

class HospitalsApi {
  HospitalsApi(this._client);
  final ApiClient _client;

  Future<List<Hospital>> getAll({
    String? region,
    String? specialty,
    String? search,
  }) async {
    final res = await _client.get<List<dynamic>>(
      '/hospitals',
      query: {
        if (region != null) 'region': region,
        if (specialty != null) 'specialty': specialty,
        if (search != null) 'search': search,
      },
    );
    return (res.data ?? const [])
        .map((e) => Hospital.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<Hospital> getById(String id) async {
    final res = await _client.get<Map<String, dynamic>>('/hospitals/$id');
    return Hospital.fromJson(res.data!);
  }

  Future<void> suggest(HospitalSuggestPayload data) =>
      _client.post('/hospitals/suggest', data: data.toJson());
}

class ArticlesApi {
  ArticlesApi(this._client);
  final ApiClient _client;

  Future<List<MedicalArticle>> getAll({
    String? category,
    String? search,
  }) async {
    final res = await _client.get<List<dynamic>>(
      '/articles',
      query: {
        if (category != null) 'category': category,
        if (search != null) 'search': search,
      },
    );
    return (res.data ?? const [])
        .map((e) => MedicalArticle.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<MedicalArticle> getById(String id) async {
    final res = await _client.get<Map<String, dynamic>>('/articles/$id');
    return MedicalArticle.fromJson(res.data!);
  }
}
