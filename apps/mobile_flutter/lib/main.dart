import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';
import 'firebase_options.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
  } catch (_) {
    // FCM registration degrades gracefully if Firebase init fails (e.g. iOS
    // config not yet provisioned) — matches RN's initPurchases()/registerPushToken()
    // no-op-on-missing-config pattern.
  }
  runApp(const ProviderScope(child: BomApp()));
}
