import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show kIsWeb;

import '../storage/token_store.dart';

/// Mirrors packages/shared/lib/api.ts's request() wrapper: base URL resolution,
/// Bearer-token header injection, timeouts, and Korean-language error surfacing.
class ApiException implements Exception {
  ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

class ApiClient {
  ApiClient(this._tokenStore) : dio = Dio(_baseOptions()) {
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _tokenStore.getToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (error, handler) {
          handler.next(_mapError(error));
        },
      ),
    );
  }

  final TokenStore _tokenStore;
  final Dio dio;

  static BaseOptions _baseOptions() {
    return BaseOptions(
      baseUrl: _resolveBaseUrl(),
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      sendTimeout: const Duration(seconds: 10),
      headers: const {'Content-Type': 'application/json'},
    );
  }

  static String _resolveBaseUrl() {
    const fromDefine = String.fromEnvironment('API_BASE_URL');
    if (fromDefine.isNotEmpty) return fromDefine;
    // Android emulator can't reach the host via `localhost`; RN's fallback
    // ('http://localhost:3001/api') is preserved for iOS/simulators/desktop.
    if (!kIsWeb && Platform.isAndroid) {
      return 'http://10.0.2.2:3001/api';
    }
    return 'http://localhost:3001/api';
  }

  DioException _mapError(DioException error) {
    if (error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.sendTimeout ||
        error.type == DioExceptionType.receiveTimeout) {
      return error.copyWith(
        error: ApiException('요청 시간이 초과됐어요. 네트워크 상태를 확인해주세요.'),
      );
    }
    final response = error.response;
    if (response != null) {
      final data = response.data;
      String message = 'API ${response.statusCode}';
      if (data is Map && data['message'] != null) {
        final m = data['message'];
        message = m is List ? m.join(', ') : m.toString();
      }
      return error.copyWith(
        error: ApiException(message, statusCode: response.statusCode),
      );
    }
    // No HTTP response was ever received (DNS failure, connection refused,
    // certificate error, request cancelled, ...). Dio's own `.message` here
    // is raw/English (e.g. "SocketException: Failed host lookup"), so
    // substitute a curated Korean message instead of leaking it to the UI.
    return error.copyWith(
      error: ApiException('네트워크에 연결할 수 없어요. 인터넷 연결을 확인해주세요.'),
    );
  }

  Future<Response<T>> get<T>(String path, {Map<String, dynamic>? query}) {
    return _run(() => dio.get<T>(path, queryParameters: _clean(query)));
  }

  Future<Response<T>> post<T>(String path, {Object? data}) {
    return _run(() => dio.post<T>(path, data: data));
  }

  Future<Response<T>> patch<T>(String path, {Object? data}) {
    return _run(() => dio.patch<T>(path, data: data));
  }

  Future<Response<T>> put<T>(String path, {Object? data}) {
    return _run(() => dio.put<T>(path, data: data));
  }

  Future<Response<T>> delete<T>(String path) {
    return _run(() => dio.delete<T>(path));
  }

  Map<String, dynamic>? _clean(Map<String, dynamic>? query) {
    if (query == null) return null;
    final out = <String, dynamic>{};
    for (final entry in query.entries) {
      if (entry.value != null) out[entry.key] = entry.value;
    }
    return out;
  }

  Future<Response<T>> _run<T>(Future<Response<T>> Function() call) async {
    try {
      return await call();
    } on DioException catch (e) {
      if (e.error is ApiException) throw e.error as ApiException;
      throw ApiException(e.message ?? '알 수 없는 오류가 발생했어요.');
    }
  }
}
