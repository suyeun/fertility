/* ============================================================
   firebase-api.js — Firestore CRUD 래퍼
   firebase-config.js 이후에 로드되어야 합니다.
   ============================================================ */

const db         = firebase.firestore();
const FieldValue = firebase.firestore.FieldValue;
const Timestamp  = firebase.firestore.Timestamp;

// ──────────────────────────────────────────────
// 유틸: Timestamp → 날짜 문자열 변환
// ──────────────────────────────────────────────
function tsToDate(val) {
  if (!val) return '';
  if (val.toDate) return val.toDate().toISOString().slice(0, 10);
  if (typeof val === 'string') return val.slice(0, 10);
  return String(val);
}

function tsToDateTime(val) {
  if (!val) return '';
  if (val.toDate) {
    return val.toDate().toLocaleString('ko-KR', {
      year:'numeric', month:'2-digit', day:'2-digit',
      hour:'2-digit', minute:'2-digit'
    });
  }
  return String(val);
}

// ──────────────────────────────────────────────
// USERS
// ──────────────────────────────────────────────

async function apiGetUsers() {
  const snap = await db.collection('users')
    .orderBy('joinDate', 'desc')
    .get();

  return snap.docs.map(d => {
    const data = d.data();
    return {
      id:             d.id,
      name:           data.name           || '',
      email:          data.email          || '',
      phone:          data.phone          || '',
      joinDate:       tsToDate(data.joinDate),
      pregnancyWeek:  data.pregnancyWeek  || 0,
      dueDate:        tsToDate(data.dueDate),
      status:         data.status         || 'active',
      device:         data.device         || 'iOS',
      appVersion:     data.appVersion     || '',
      fcmToken:       data.fcmToken       || '',
      lastLogin:      tsToDate(data.lastLogin),
    };
  });
}

async function apiUpdateUserStatus(docId, status) {
  await db.collection('users').doc(docId).update({
    status,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

// ──────────────────────────────────────────────
// CONTENTS
// ──────────────────────────────────────────────

async function apiGetContents() {
  const snap = await db.collection('contents')
    .orderBy('createdAt', 'desc')
    .get();

  return snap.docs.map(d => {
    const data = d.data();
    return {
      id:       d.id,
      category: data.category || 'pregnancy',
      emoji:    data.emoji    || '📄',
      title:    data.title    || '',
      body:     data.body     || '',
      tags:     data.tags     || [],
      views:    data.views    || 0,
      status:   data.status   || 'draft',
      date:     tsToDate(data.createdAt),
    };
  });
}

async function apiCreateContent(data) {
  await db.collection('contents').add({
    category:  data.category  || 'pregnancy',
    emoji:     data.emoji     || '📄',
    title:     data.title     || '',
    body:      data.body      || '',
    tags:      data.tags      || [],
    views:     0,
    status:    'draft',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

async function apiUpdateContent(docId, data) {
  const updateData = { updatedAt: FieldValue.serverTimestamp() };
  if (data.category  !== undefined) updateData.category  = data.category;
  if (data.emoji     !== undefined) updateData.emoji     = data.emoji;
  if (data.title     !== undefined) updateData.title     = data.title;
  if (data.body      !== undefined) updateData.body      = data.body;
  if (data.tags      !== undefined) updateData.tags      = data.tags;
  if (data.status    !== undefined) updateData.status    = data.status;
  await db.collection('contents').doc(docId).update(updateData);
}

async function apiDeleteContent(docId) {
  await db.collection('contents').doc(docId).delete();
}

// ──────────────────────────────────────────────
// APP CONFIG
// ──────────────────────────────────────────────

async function apiGetAppConfig() {
  const [iosSnap, androidSnap, noticeSnap] = await Promise.all([
    db.collection('app_config').doc('ios').get(),
    db.collection('app_config').doc('android').get(),
    db.collection('app_config').doc('notice').get(),
  ]);

  const defaultIos = {
    currentVersion: '1.0.0',
    latestVersion:  '1.0.0',
    forceUpdate:    false,
    updateMessage:  '',
    releaseDate:    '',
  };
  const defaultNotice = {
    maintenanceMode: false,
    maintenanceMsg:  '시스템 점검 중입니다. 잠시 후 다시 이용해 주세요.',
    bannerEnabled:   false,
    bannerMsg:       '',
  };

  return {
    ios:     iosSnap.exists     ? iosSnap.data()     : { ...defaultIos },
    android: androidSnap.exists ? androidSnap.data() : { ...defaultIos },
    notice:  noticeSnap.exists  ? noticeSnap.data()  : { ...defaultNotice },
  };
}

async function apiUpdateAppConfig(platform, data) {
  // platform: 'ios' | 'android' | 'notice'
  await db.collection('app_config').doc(platform).set(data, { merge: true });
}

// ──────────────────────────────────────────────
// PUSH HISTORY (Spark 요금제: 이력 기록만 지원)
// ──────────────────────────────────────────────

async function apiGetPushHistory() {
  const snap = await db.collection('push_history')
    .orderBy('sentAt', 'desc')
    .limit(30)
    .get();

  return snap.docs.map(d => {
    const data = d.data();
    return {
      id:        d.id,
      title:     data.title     || '',
      body:      data.body      || '',
      target:    data.target    || '전체',
      sentCount: data.sentCount || 0,
      readCount: data.readCount || 0,
      sendDate:  tsToDateTime(data.sentAt),
      status:    data.status    || 'sent',
    };
  });
}

async function apiSavePushRecord(data) {
  await db.collection('push_history').add({
    title:     data.title     || '',
    body:      data.body      || '',
    target:    data.target    || '전체',
    sentCount: data.sentCount || 0,
    readCount: 0,
    status:    'sent',
    sentAt:    FieldValue.serverTimestamp(),
  });
}

// ──────────────────────────────────────────────
// BANNERS (이벤트 배너)
// ──────────────────────────────────────────────

async function apiGetBanners() {
  const snap = await db.collection('banners')
    .orderBy('order', 'asc')
    .get();

  return snap.docs.map(d => {
    const data = d.data();
    return {
      id:        d.id,
      title:     data.title     || '',
      subTitle:  data.subTitle  || '',
      imageUrl:  data.imageUrl  || '',
      linkUrl:   data.linkUrl   || '',
      position:  data.position  || 'home',
      order:     data.order     || 1,
      isActive:  data.isActive !== false,
      bgColor:   data.bgColor   || 'hsl(340, 68%, 52%)',
      createdAt: tsToDate(data.createdAt),
    };
  });
}

async function apiCreateBanner(data) {
  await db.collection('banners').add({
    title:     data.title     || '',
    subTitle:  data.subTitle  || '',
    imageUrl:  data.imageUrl  || '',
    linkUrl:   data.linkUrl   || '',
    position:  data.position  || 'home',
    order:     Number(data.order) || 1,
    isActive:  data.isActive !== false,
    bgColor:   data.bgColor   || 'hsl(340, 68%, 52%)',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

async function apiUpdateBanner(docId, data) {
  const updateData = { updatedAt: FieldValue.serverTimestamp() };
  if (data.title     !== undefined) updateData.title     = data.title;
  if (data.subTitle  !== undefined) updateData.subTitle  = data.subTitle;
  if (data.imageUrl  !== undefined) updateData.imageUrl  = data.imageUrl;
  if (data.linkUrl   !== undefined) updateData.linkUrl   = data.linkUrl;
  if (data.position  !== undefined) updateData.position  = data.position;
  if (data.order     !== undefined) updateData.order     = Number(data.order);
  if (data.isActive  !== undefined) updateData.isActive  = data.isActive;
  if (data.bgColor   !== undefined) updateData.bgColor   = data.bgColor;
  await db.collection('banners').doc(docId).update(updateData);
}

async function apiDeleteBanner(docId) {
  await db.collection('banners').doc(docId).delete();
}

