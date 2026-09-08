/* ============================================================
   Firebase 초기화 — Fertility Admin
   Firebase Compat SDK (CDN)를 사용합니다.
   이 파일은 firebase-app-compat.js, firebase-auth-compat.js
   스크립트 이후에 로드되어야 합니다.
   ============================================================ */

const firebaseConfig = {
  apiKey:            "AIzaSyAWfIvQIpbiNOHdAKHEQjUgWciokhV4L7M",
  authDomain:        "lunera-a47ac.firebaseapp.com",
  projectId:         "lunera-a47ac",
  storageBucket:     "lunera-a47ac.firebasestorage.app",
  messagingSenderId: "756585631935",
  appId:             "1:756585631935:web:0f652bd03b41abc12f360a",
  measurementId:     "G-V8FZ0N6QRV"
};

// 중복 초기화 방지
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
