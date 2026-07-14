import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';

/// Port of apps/mobile/app/(tabs)/chat/index.tsx — a "coming soon"
/// placeholder in the original RN app too; no real chat UI is wired up
/// (aiApi.streamChat exists in the API layer for contract parity, but
/// there's nothing in the original product to port here beyond this screen).
class ChatScreen extends StatelessWidget {
  const ChatScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFFFBFC),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 16),
                child: IconButton(
                  onPressed: () => context.pop(),
                  icon: const Icon(
                    Icons.chevron_left,
                    color: AppColors.textMuted,
                  ),
                  padding: EdgeInsets.zero,
                  alignment: Alignment.centerLeft,
                ),
              ),
              Expanded(
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Image.asset(
                        'assets/images/clay_chat_bubble.png',
                        width: 90,
                        height: 90,
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'AI 파트너 봄이',
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textDark,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: AppColors.primaryLight),
                        ),
                        child: const Text(
                          '서비스 준비중',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),
                      const Text(
                        '임신 준비 전 과정을 함께할\nAI 채팅 서비스를 준비하고 있어요.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 15,
                          color: AppColors.textDark,
                          height: 1.6,
                        ),
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        '수치 해석, 시술 Q&A, 감정 지지까지\n곧 만나요 💕',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 13,
                          color: AppColors.textMuted,
                          height: 1.7,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
