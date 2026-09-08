import '../models/cycle.dart';
import '../models/daily_note.dart';
import '../models/hormone_record.dart';
import '../models/protocol_template.dart';
import '../models/treatment.dart';
import 'client.dart';

class CyclesApi {
  CyclesApi(this._client);
  final ApiClient _client;

  Future<List<MenstrualCycle>> getAll({String? cursor, int? limit}) async {
    final res = await _client.get<List<dynamic>>(
      '/cycles',
      query: {
        if (cursor != null) 'cursor': cursor,
        if (limit != null) 'limit': limit,
      },
    );
    return (res.data ?? const [])
        .map((e) => MenstrualCycle.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<MenstrualCycle> save(Map<String, dynamic> data) async {
    final res = await _client.post<Map<String, dynamic>>('/cycles', data: data);
    return MenstrualCycle.fromJson(res.data!);
  }
}

class HormonesApi {
  HormonesApi(this._client);
  final ApiClient _client;

  Future<List<HormoneRecord>> getAll() async {
    final res = await _client.get<List<dynamic>>('/hormones');
    return (res.data ?? const [])
        .map((e) => HormoneRecord.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<HormoneRecord> save(Map<String, dynamic> data) async {
    final res = await _client.post<Map<String, dynamic>>(
      '/hormones',
      data: data,
    );
    return HormoneRecord.fromJson(res.data!);
  }

  Future<void> delete(String id) => _client.delete('/hormones/$id');
}

class TreatmentApi {
  TreatmentApi(this._client);
  final ApiClient _client;

  Future<List<TreatmentSchedule>> getAll() async {
    final res = await _client.get<List<dynamic>>('/treatment');
    return (res.data ?? const [])
        .map((e) => TreatmentSchedule.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<TreatmentSchedule> save(Map<String, dynamic> data) async {
    final res = await _client.post<Map<String, dynamic>>(
      '/treatment',
      data: data,
    );
    return TreatmentSchedule.fromJson(res.data!);
  }

  /// 회차 프로토콜 템플릿 (예시 일정)
  Future<List<ProtocolTemplate>> getTemplates() async {
    final res = await _client.get<List<dynamic>>('/treatment/templates');
    return (res.data ?? const [])
        .map((e) => ProtocolTemplate.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> updateStatus(String id, String status) =>
      _client.patch('/treatment/$id/status', data: {'status': status});

  Future<void> delete(String id) => _client.delete('/treatment/$id');
}

class DailyNotesApi {
  DailyNotesApi(this._client);
  final ApiClient _client;

  Future<List<DailyNote>> getAll() async {
    final res = await _client.get<List<dynamic>>('/daily-notes');
    return (res.data ?? const [])
        .map((e) => DailyNote.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<DailyNote?> getByDate(String date) async {
    final res = await _client.get<Map<String, dynamic>?>('/daily-notes/$date');
    final data = res.data;
    return data == null ? null : DailyNote.fromJson(data);
  }

  Future<DailyNote> save(String date, Map<String, dynamic> data) async {
    final res = await _client.post<Map<String, dynamic>>(
      '/daily-notes/$date',
      data: data,
    );
    return DailyNote.fromJson(res.data!);
  }

  Future<void> delete(String id) => _client.delete('/daily-notes/$id');
}
