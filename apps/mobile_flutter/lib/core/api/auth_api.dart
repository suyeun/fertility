import 'client.dart';

class LoginResult {
  LoginResult({
    required this.accessToken,
    required this.uid,
    required this.email,
  });
  final String accessToken;
  final String uid;
  final String email;

  factory LoginResult.fromJson(Map<String, dynamic> j) => LoginResult(
    accessToken: j['access_token'] as String,
    uid: j['uid'] as String,
    email: j['email'] as String,
  );
}

class AuthApi {
  AuthApi(this._client);
  final ApiClient _client;

  Future<LoginResult> signup({
    required String email,
    required String password,
    required String name,
    String? partnerName,
  }) async {
    final res = await _client.post<Map<String, dynamic>>(
      '/auth/signup',
      data: {
        'email': email,
        'password': password,
        'name': name,
        if (partnerName != null) 'partnerName': partnerName,
      },
    );
    return LoginResult.fromJson(res.data!);
  }

  Future<LoginResult> login(String email, String password) async {
    final res = await _client.post<Map<String, dynamic>>(
      '/auth/login',
      data: {'email': email, 'password': password},
    );
    return LoginResult.fromJson(res.data!);
  }

  Future<Map<String, dynamic>> me() async {
    final res = await _client.get<Map<String, dynamic>>('/auth/me');
    return res.data ?? {};
  }
}
