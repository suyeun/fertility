'use strict';
/* ============================================================
   index.js — Fertility Admin SPA
   Firestore 실제 데이터 연동 버전
   ============================================================ */

// ── 데이터 캐시 ──
const dataCache = {
  users:       null,
  contents:    null,
  banners:     null,
  pushHistory: null,
  appConfig:   null,
};

// ── Chart 인스턴스 ──
let charts = {};

// ── 앱 상태 ──
let currentPage       = '';
let selectedUserId    = null;
let selectedContentId = null;
let selectedBannerId  = null;
let settingsTab       = 'updates';

const userState    = { search: '', status: 'all', device: 'all', page: 1, pageSize: 10 };
const contentState = { tab: 'pregnancy' };
const bannerState  = { position: 'all' };
const statsState   = { period: '7' };

// ──────────────────────────────────────────────
// 1. CACHE HELPERS
// ──────────────────────────────────────────────

async function ensureUsers(force = false) {
  if (!dataCache.users || force) dataCache.users = await apiGetUsers();
  return dataCache.users;
}

async function ensureContents(force = false) {
  if (!dataCache.contents || force) dataCache.contents = await apiGetContents();
  return dataCache.contents;
}

async function ensureBanners(force = false) {
  if (!dataCache.banners || force) dataCache.banners = await apiGetBanners();
  return dataCache.banners;
}

async function ensureAppConfig(force = false) {
  if (!dataCache.appConfig || force) dataCache.appConfig = await apiGetAppConfig();
  return dataCache.appConfig;
}

async function ensurePushHistory(force = false) {
  if (!dataCache.pushHistory || force) dataCache.pushHistory = await apiGetPushHistory();
  return dataCache.pushHistory;
}

// ──────────────────────────────────────────────
// 2. SKELETON HELPERS
// ──────────────────────────────────────────────

function skeletonRow(cols) {
  const cells = Array.from({ length: cols }, () =>
    `<td><div class="skeleton" style="height:13px;border-radius:4px"></div></td>`
  ).join('');
  return `<tr>${cells}</tr>`;
}

function skeletonRows(n, cols) {
  return Array.from({ length: n }, () => skeletonRow(cols)).join('');
}

function skeletonKpi() {
  return `<div class="kpi-card">
    <div class="skeleton" style="height:11px;width:55%;border-radius:4px;margin-bottom:14px"></div>
    <div class="skeleton" style="height:30px;width:40%;border-radius:6px;margin-bottom:10px"></div>
    <div class="skeleton" style="height:11px;width:65%;border-radius:4px"></div>
  </div>`;
}

// ──────────────────────────────────────────────
// 3. ROUTER
// ──────────────────────────────────────────────

async function navigate(page) {
  // 차트 정리
  Object.values(charts).forEach(c => { try { c.destroy(); } catch(_) {} });
  charts = {};

  // 네비게이션 활성화
  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  if (page !== currentPage) userState.page = 1;
  currentPage = page;

  const el = document.getElementById('page-content');
  if (!el) return;

  switch (page) {
    case 'dashboard': el.innerHTML = dashboardShell(); lucide.createIcons(); await loadDashboard();  break;
    case 'users':     el.innerHTML = usersShell();     lucide.createIcons(); await loadUsersTable(); break;
    case 'content':   el.innerHTML = contentShell();   lucide.createIcons(); await loadContent();   break;
    case 'banner':    el.innerHTML = bannerShell();    lucide.createIcons(); await loadBanners();   break;
    case 'push':      el.innerHTML = pushShell();      lucide.createIcons(); await loadPushData();  break;
    case 'stats':     el.innerHTML = statsShell();     lucide.createIcons(); await loadStats();     break;
    case 'settings':  el.innerHTML = settingsShell();  lucide.createIcons(); await loadSettings();  break;
    default:          el.innerHTML = dashboardShell(); lucide.createIcons(); await loadDashboard();
  }
}

// ──────────────────────────────────────────────
// 4. DASHBOARD
// ──────────────────────────────────────────────

function dashboardShell() {
  return `
    <div class="page-header">
      <h1>대시보드</h1>
      <p>Fertility 앱의 주요 지표와 최신 현황을 확인합니다.</p>
    </div>
    <div class="kpi-grid" id="kpi-grid">
      ${Array(4).fill(skeletonKpi()).join('')}
    </div>
    <div class="chart-grid" style="margin-bottom:24px">
      <div class="card">
        <div class="card-header"><span class="card-header-title">주간 가입자 추이</span></div>
        <div class="card-body"><canvas id="weeklyChart" height="180"></canvas></div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-header-title">OS별 사용자 비율</span></div>
        <div class="card-body" id="os-card-body" style="display:flex;flex-direction:column;align-items:center;gap:16px">
          <div class="skeleton" style="width:160px;height:160px;border-radius:50%"></div>
        </div>
      </div>
    </div>
    <div class="table-container" id="recent-wrap">
      <div class="card-header">
        <span class="card-header-title">최근 가입 사용자</span>
        <button class="btn btn-secondary btn-sm" onclick="navigate('users')">전체 보기</button>
      </div>
      <table>
        <thead><tr><th>이름</th><th>이메일</th><th>가입일</th><th>임신주차</th><th>기기</th><th>상태</th></tr></thead>
        <tbody>${skeletonRows(5, 6)}</tbody>
      </table>
    </div>`;
}

async function loadDashboard() {
  try {
    const [users, cfg] = await Promise.all([ensureUsers(), ensureAppConfig()]);

    const total    = users.length;
    const active   = users.filter(u => u.status === 'active').length;
    const today    = new Date().toISOString().slice(0, 10);
    const todayNew = users.filter(u => u.joinDate === today).length;
    const iosCount = users.filter(u => u.device === 'iOS').length;

    // KPI Cards
    document.getElementById('kpi-grid').innerHTML = `
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-label">전체 사용자</span>
          <div class="kpi-icon" style="background:hsl(340,68%,95%)"><i data-lucide="users" style="color:var(--primary)"></i></div>
        </div>
        <div class="kpi-value">${total.toLocaleString()}</div>
        <div class="kpi-sub"><span class="trend-up">+${todayNew}</span> 오늘 신규 가입</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-label">활성 사용자</span>
          <div class="kpi-icon" style="background:var(--success-bg)"><i data-lucide="activity" style="color:var(--success)"></i></div>
        </div>
        <div class="kpi-value">${active.toLocaleString()}</div>
        <div class="kpi-sub">전체의 <strong>${total ? Math.round(active/total*100) : 0}%</strong></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-label">오늘 가입</span>
          <div class="kpi-icon" style="background:var(--info-bg)"><i data-lucide="user-plus" style="color:var(--info)"></i></div>
        </div>
        <div class="kpi-value">${todayNew}</div>
        <div class="kpi-sub">금일 신규 가입자</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-label">앱 최신 버전</span>
          <div class="kpi-icon" style="background:var(--warning-bg)"><i data-lucide="smartphone" style="color:var(--warning)"></i></div>
        </div>
        <div class="kpi-value">v${cfg.ios.latestVersion || '-'}</div>
        <div class="kpi-sub">iOS · Android 배포 완료</div>
      </div>`;
    lucide.createIcons();

    // Weekly Chart
    const wLabels = [], wData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      wLabels.push(`${d.getMonth()+1}/${d.getDate()}`);
      wData.push(users.filter(u => u.joinDate === ds).length);
    }
    const wCtx = document.getElementById('weeklyChart');
    if (wCtx) {
      charts.weekly = new Chart(wCtx, {
        type: 'line',
        data: { labels: wLabels, datasets: [{ label: '신규 가입', data: wData,
          borderColor: 'hsl(340,68%,52%)', backgroundColor: 'hsl(340,68%,97%)',
          borderWidth: 2.5, fill: true, tension: 0.4,
          pointBackgroundColor: 'hsl(340,68%,52%)', pointRadius: 4, pointHoverRadius: 6 }] },
        options: chartDefaults({ yLabel: '명' }),
      });
    }

    // OS Chart
    const andCount = total - iosCount;
    document.getElementById('os-card-body').innerHTML = `
      <canvas id="osChart" width="160" height="160" style="max-width:160px"></canvas>
      <div style="display:flex;gap:24px">
        <div class="mini-stat"><div class="mini-stat-value" style="color:hsl(215,75%,55%)">${iosCount}</div><div class="mini-stat-label">iOS</div></div>
        <div class="mini-stat"><div class="mini-stat-value" style="color:var(--success)">${andCount}</div><div class="mini-stat-label">Android</div></div>
      </div>`;
    const oCtx = document.getElementById('osChart');
    if (oCtx) {
      charts.os = new Chart(oCtx, {
        type: 'doughnut',
        data: { labels: ['iOS','Android'], datasets: [{ data: [iosCount, andCount],
          backgroundColor: ['hsl(215,75%,55%)','hsl(155,60%,40%)'], borderWidth: 2, borderColor:'#fff' }] },
        options: { responsive: false, cutout: '68%',
          plugins: { legend: { display: false },
            tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw}명` } } } },
      });
    }

    // Recent Users
    const recent = [...users].sort((a,b) => (b.joinDate||'').localeCompare(a.joinDate||'')).slice(0,5);
    const tbody = document.querySelector('#recent-wrap tbody');
    if (tbody) {
      tbody.innerHTML = recent.length
        ? recent.map(u => `
          <tr>
            <td><strong>${u.name}</strong></td>
            <td style="color:var(--text-secondary)">${u.email}</td>
            <td>${u.joinDate}</td>
            <td>${u.pregnancyWeek}주차</td>
            <td><span class="badge ${u.device==='iOS'?'badge-info':'badge-success'}">${u.device}</span></td>
            <td>${statusBadge(u.status)}</td>
          </tr>`).join('')
        : `<tr><td colspan="6" class="empty-state">
            사용자 데이터가 없습니다.
            <a href="seed.html" target="_blank" style="color:var(--primary)">seed.html</a>을 실행하여 초기 데이터를 추가하세요.
           </td></tr>`;
      lucide.createIcons();
    }
  } catch(err) {
    console.error('Dashboard error:', err);
    showToast('대시보드 로드 실패: ' + err.message, 'error');
  }
}

// ──────────────────────────────────────────────
// 5. USERS
// ──────────────────────────────────────────────

function usersShell() {
  return `
    <div class="page-header">
      <h1>사용자 관리</h1>
      <p>Firestore에 등록된 사용자를 조회하고 상태를 관리합니다.</p>
    </div>
    <div id="users-table-wrapper">
      <div class="table-container">
        <div class="table-toolbar">
          <div class="skeleton" style="height:36px;width:260px;border-radius:6px"></div>
          <div class="skeleton" style="height:36px;width:120px;border-radius:6px"></div>
          <div class="skeleton" style="height:36px;width:110px;border-radius:6px"></div>
        </div>
        <table>
          <thead><tr><th>#</th><th>이름</th><th>이메일</th><th>가입일</th><th>임신주차</th><th>기기</th><th>앱 버전</th><th>상태</th><th>마지막 로그인</th><th></th></tr></thead>
          <tbody>${skeletonRows(8, 10)}</tbody>
        </table>
        <div class="table-footer">
          <span class="skeleton" style="height:12px;width:100px;border-radius:4px;display:inline-block"></span>
        </div>
      </div>
    </div>`;
}

async function loadUsersTable(force = false) {
  try {
    await ensureUsers(force);
    const wrapper = document.getElementById('users-table-wrapper');
    if (wrapper) { wrapper.innerHTML = renderUsersTable(); lucide.createIcons(); }
  } catch(err) {
    showToast('사용자 로드 실패: ' + err.message, 'error');
  }
}

function renderUsersTable() {
  const users = dataCache.users || [];
  const { search, status, device, page, pageSize } = userState;
  const latestVer = dataCache.appConfig?.ios?.latestVersion || '';

  const filtered = users.filter(u => {
    if (search && !u.name.includes(search) && !u.email.includes(search)) return false;
    if (status !== 'all' && u.status !== status) return false;
    if (device !== 'all' && u.device !== device) return false;
    return true;
  });

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const cur   = Math.min(page, pages);
  const paged = filtered.slice((cur-1)*pageSize, cur*pageSize);

  const pgBtns = [
    `<button class="pg-btn" ${cur===1?'disabled':''} onclick="changeUserPage(${cur-1})"><i data-lucide="chevron-left"></i></button>`,
    ...Array.from({length:pages},(_,i)=>`<button class="pg-btn ${i+1===cur?'active':''}" onclick="changeUserPage(${i+1})">${i+1}</button>`),
    `<button class="pg-btn" ${cur===pages?'disabled':''} onclick="changeUserPage(${cur+1})"><i data-lucide="chevron-right"></i></button>`,
  ].join('');

  return `
    <div class="table-container">
      <div class="table-toolbar">
        <div class="search-wrap" style="flex:1;max-width:280px">
          <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input type="text" class="form-input" placeholder="이름 또는 이메일 검색"
            value="${search}" oninput="updateUserFilter('search',this.value)" style="width:100%">
        </div>
        <select class="form-select" onchange="updateUserFilter('status',this.value)" style="width:130px">
          <option value="all" ${status==='all'?'selected':''}>전체 상태</option>
          <option value="active" ${status==='active'?'selected':''}>활성</option>
          <option value="inactive" ${status==='inactive'?'selected':''}>비활성</option>
          <option value="paused" ${status==='paused'?'selected':''}>일시정지</option>
        </select>
        <select class="form-select" onchange="updateUserFilter('device',this.value)" style="width:120px">
          <option value="all" ${device==='all'?'selected':''}>전체 기기</option>
          <option value="iOS" ${device==='iOS'?'selected':''}>iOS</option>
          <option value="Android" ${device==='Android'?'selected':''}>Android</option>
        </select>
        <button class="btn btn-secondary btn-sm" onclick="loadUsersTable(true)" title="Firestore에서 새로 불러오기">
          <i data-lucide="refresh-cw"></i>
        </button>
        <span style="font-size:12px;color:var(--text-muted);margin-left:auto">총 ${total}명</span>
      </div>
      <table>
        <thead><tr><th>#</th><th>이름</th><th>이메일</th><th>가입일</th><th>임신주차</th><th>기기</th><th>앱 버전</th><th>상태</th><th>마지막 로그인</th><th></th></tr></thead>
        <tbody>
          ${paged.length
            ? paged.map((u,i) => `
              <tr>
                <td style="color:var(--text-muted);font-size:11px">${(cur-1)*pageSize+i+1}</td>
                <td><strong>${u.name}</strong></td>
                <td style="color:var(--text-secondary);font-size:13px">${u.email}</td>
                <td style="font-size:13px">${u.joinDate || '-'}</td>
                <td>${u.pregnancyWeek}주차</td>
                <td><span class="badge ${u.device==='iOS'?'badge-info':'badge-success'}">${u.device}</span></td>
                <td><span style="font-size:12px;${latestVer && u.appVersion!==latestVer?'color:var(--warning);font-weight:600':''}">
                  v${u.appVersion||'-'}${latestVer && u.appVersion!==latestVer?' ⚠':''}
                </span></td>
                <td>${statusBadge(u.status)}</td>
                <td style="color:var(--text-muted);font-size:12px">${u.lastLogin||'-'}</td>
                <td><button class="btn btn-secondary btn-sm" onclick="openUserModal('${u.id}')">상세</button></td>
              </tr>`).join('')
            : `<tr><td colspan="10" class="empty-state">
                ${search||status!=='all'||device!=='all'
                  ? '검색 결과가 없습니다.'
                  : 'Firestore에 사용자 데이터가 없습니다. <a href="seed.html" target="_blank" style="color:var(--primary)">seed.html</a>을 실행해 초기 데이터를 추가하세요.'}
               </td></tr>`
          }
        </tbody>
      </table>
      <div class="table-footer">
        <span class="table-info">${paged.length ? `${(cur-1)*pageSize+1}–${Math.min(cur*pageSize,total)} / 총 ${total}명` : '데이터 없음'}</span>
        <div class="pagination">${pgBtns}</div>
      </div>
    </div>`;
}

function updateUserFilter(key, value) {
  userState[key] = value;
  userState.page = 1;
  const wrapper = document.getElementById('users-table-wrapper');
  if (wrapper) { wrapper.innerHTML = renderUsersTable(); lucide.createIcons(); }
}

function changeUserPage(p) {
  userState.page = p;
  const wrapper = document.getElementById('users-table-wrapper');
  if (wrapper) { wrapper.innerHTML = renderUsersTable(); lucide.createIcons(); }
}

function openUserModal(uid) {
  const u = (dataCache.users||[]).find(x => x.id === uid);
  if (!u) return;
  selectedUserId = uid;

  document.getElementById('modal-user-title').textContent = `사용자 상세 — ${u.name}`;
  const deactivateBtn = document.querySelector('#user-modal .btn-danger-outline');
  if (deactivateBtn) deactivateBtn.textContent = u.status === 'active' ? '비활성화' : '활성화';

  document.getElementById('user-modal-body').innerHTML = `
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
      <div class="user-avatar">${u.name[0]}</div>
      <div>
        <div style="font-size:17px;font-weight:700;color:var(--text-primary)">${u.name}</div>
        <div style="font-size:13px;color:var(--text-secondary);margin-top:2px">${u.email}</div>
        <div style="margin-top:6px">${statusBadge(u.status)}</div>
      </div>
    </div>
    <div class="user-detail-section">
      <div class="user-detail-section-title">기본 정보</div>
      <div class="user-detail-grid">
        <div class="user-detail-item"><div class="user-detail-item-label">전화번호</div><div class="user-detail-item-value">${u.phone||'-'}</div></div>
        <div class="user-detail-item"><div class="user-detail-item-label">가입일</div><div class="user-detail-item-value">${u.joinDate||'-'}</div></div>
        <div class="user-detail-item"><div class="user-detail-item-label">임신주차</div><div class="user-detail-item-value">${u.pregnancyWeek}주차</div></div>
        <div class="user-detail-item"><div class="user-detail-item-label">출산예정일</div><div class="user-detail-item-value">${u.dueDate||'-'}</div></div>
      </div>
    </div>
    <div class="divider"></div>
    <div class="user-detail-section">
      <div class="user-detail-section-title">앱 사용 현황</div>
      <div class="user-detail-grid">
        <div class="user-detail-item"><div class="user-detail-item-label">사용 기기</div><div class="user-detail-item-value">${u.device}</div></div>
        <div class="user-detail-item"><div class="user-detail-item-label">앱 버전</div><div class="user-detail-item-value">v${u.appVersion||'-'}</div></div>
        <div class="user-detail-item"><div class="user-detail-item-label">마지막 로그인</div><div class="user-detail-item-value">${u.lastLogin||'-'}</div></div>
        <div class="user-detail-item"><div class="user-detail-item-label">FCM 토큰</div>
          <div class="user-detail-item-value" style="font-size:11px;word-break:break-all">
            ${u.fcmToken ? u.fcmToken.slice(0,24)+'…' : '없음 (푸시 불가)'}
          </div>
        </div>
      </div>
    </div>`;
  openModal('user-modal-overlay');
}

async function handleDeactivateUser() {
  const u = (dataCache.users||[]).find(x => x.id === selectedUserId);
  if (!u) return;
  const newStatus = u.status === 'active' ? 'inactive' : 'active';
  try {
    await apiUpdateUserStatus(u.id, newStatus);
    u.status = newStatus;
    closeModal('user-modal-overlay');
    showToast(`${u.name} 상태가 ${newStatus === 'active' ? '활성' : '비활성'}으로 변경되었습니다.`, 'success');
    if (currentPage === 'users') {
      const wrapper = document.getElementById('users-table-wrapper');
      if (wrapper) { wrapper.innerHTML = renderUsersTable(); lucide.createIcons(); }
    }
  } catch(err) {
    showToast('상태 변경 실패: ' + err.message, 'error');
  }
}

// ──────────────────────────────────────────────
// 6. CONTENT
// ──────────────────────────────────────────────

function contentShell() {
  return `
    <div class="page-header" style="display:flex;align-items:flex-start;justify-content:space-between">
      <div>
        <h1>콘텐츠 관리</h1>
        <p>앱 내 임신·건강 정보와 공지사항을 Firestore에서 관리합니다.</p>
      </div>
      <button class="btn btn-primary" onclick="openContentModal()" style="margin-top:4px">
        <i data-lucide="plus"></i> 새 콘텐츠
      </button>
    </div>
    <div class="tab-bar">
      <div class="tab-item ${contentState.tab==='pregnancy'?'active':''}" onclick="switchContentTab('pregnancy')">임신 정보</div>
      <div class="tab-item ${contentState.tab==='health'?'active':''}" onclick="switchContentTab('health')">건강 팁</div>
      <div class="tab-item ${contentState.tab==='notice'?'active':''}" onclick="switchContentTab('notice')">공지사항</div>
    </div>
    <div class="content-grid" id="content-grid">
      ${Array(3).fill(`<div class="content-card">
        <div class="content-card-img" style="background:var(--divider)">
          <div class="skeleton" style="width:44px;height:44px;border-radius:50%"></div>
        </div>
        <div class="content-card-body">
          <div class="skeleton" style="height:10px;width:35%;border-radius:4px;margin-bottom:8px"></div>
          <div class="skeleton" style="height:14px;width:90%;border-radius:4px;margin-bottom:6px"></div>
          <div class="skeleton" style="height:11px;width:55%;border-radius:4px"></div>
        </div>
        <div class="content-card-footer">
          <div class="skeleton" style="height:28px;width:52px;border-radius:6px"></div>
          <div class="skeleton" style="height:28px;width:52px;border-radius:6px"></div>
        </div>
      </div>`).join('')}
    </div>`;
}

async function loadContent(force = false) {
  try {
    await ensureContents(force);
    renderContentGrid();
  } catch(err) {
    showToast('콘텐츠 로드 실패: ' + err.message, 'error');
  }
}

function renderContentGrid() {
  const catLabel = { pregnancy:'임신 정보', health:'건강 팁', notice:'공지사항' };
  const catBgMap = { pregnancy:'hsl(340,68%,95%)', health:'hsl(155,60%,93%)', notice:'hsl(38,92%,93%)' };
  const items = (dataCache.contents||[]).filter(c => c.category === contentState.tab);
  const grid  = document.getElementById('content-grid');
  if (!grid) return;

  grid.innerHTML = items.length
    ? items.map(item => `
      <div class="content-card">
        <div class="content-card-img" style="background:${catBgMap[item.category]||'var(--divider)'}">${item.emoji||'📄'}</div>
        <div class="content-card-body">
          <div class="content-card-cat">${catLabel[item.category]||item.category}</div>
          <div class="content-card-title">${item.title}</div>
          <div class="content-card-meta">
            ${item.date||'-'} · 조회 ${(item.views||0).toLocaleString()}회 ·
            ${item.status==='published'
              ? '<span style="color:var(--success);font-weight:600">게시됨</span>'
              : '<span style="color:var(--text-muted)">초안</span>'}
          </div>
        </div>
        <div class="content-card-footer">
          <button class="btn btn-secondary btn-sm" onclick="editContent('${item.id}')"><i data-lucide="pencil"></i> 수정</button>
          <button class="btn btn-danger-outline btn-sm" onclick="handleDeleteContent('${item.id}')"><i data-lucide="trash-2"></i> 삭제</button>
          ${item.status==='draft'
            ? `<button class="btn btn-primary btn-sm" onclick="handlePublishContent('${item.id}')"><i data-lucide="send"></i> 게시</button>`
            : ''}
        </div>
      </div>`).join('')
    : `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-muted)">
        이 카테고리에 등록된 콘텐츠가 없습니다.<br>
        <button class="btn btn-primary btn-sm" onclick="openContentModal()" style="margin-top:12px">
          <i data-lucide="plus"></i> 새 콘텐츠 작성
        </button>
      </div>`;
  lucide.createIcons();
}

function switchContentTab(tab) {
  contentState.tab = tab;
  document.querySelectorAll('.tab-item').forEach((el, i) => {
    el.classList.toggle('active', ['pregnancy','health','notice'][i] === tab);
  });
  renderContentGrid();
}

function openContentModal(item = null) {
  selectedContentId = item ? item.id : null;
  document.getElementById('content-modal-title').textContent = item ? '콘텐츠 수정' : '새 콘텐츠 작성';
  document.getElementById('content-cat').value       = item ? item.category : contentState.tab;
  document.getElementById('content-title-input').value = item ? item.title  : '';
  document.getElementById('content-body-input').value  = item ? (item.body||'')   : '';
  document.getElementById('content-tags-input').value  = item ? (item.tags||[]).join(', ') : '';
  openModal('content-modal-overlay');
}

function editContent(id) {
  const item = (dataCache.contents||[]).find(c => c.id === id);
  if (item) openContentModal(item);
}

async function handleDeleteContent(id) {
  if (!confirm('이 콘텐츠를 Firestore에서 삭제하시겠습니까?')) return;
  try {
    await apiDeleteContent(id);
    dataCache.contents = (dataCache.contents||[]).filter(c => c.id !== id);
    renderContentGrid();
    showToast('콘텐츠가 삭제되었습니다.', 'success');
  } catch(err) {
    showToast('삭제 실패: ' + err.message, 'error');
  }
}

async function handlePublishContent(id) {
  try {
    await apiUpdateContent(id, { status: 'published' });
    const item = (dataCache.contents||[]).find(c => c.id === id);
    if (item) item.status = 'published';
    renderContentGrid();
    showToast('콘텐츠가 게시되었습니다.', 'success');
  } catch(err) {
    showToast('게시 실패: ' + err.message, 'error');
  }
}

async function handleSaveContent() {
  const title = document.getElementById('content-title-input').value.trim();
  const body  = document.getElementById('content-body-input').value.trim();
  const cat   = document.getElementById('content-cat').value;
  const tags  = document.getElementById('content-tags-input').value
    .split(',').map(t => t.trim()).filter(Boolean);

  if (!title) { showToast('제목을 입력해 주세요.', 'error'); return; }

  const emojiMap = { pregnancy: '🤰', health: '💚', notice: '📢' };
  const saveBtn  = document.querySelector('#content-modal .btn-primary');
  if (saveBtn) saveBtn.disabled = true;

  try {
    if (selectedContentId) {
      await apiUpdateContent(selectedContentId, { category: cat, emoji: emojiMap[cat], title, body, tags });
      const idx = (dataCache.contents||[]).findIndex(c => c.id === selectedContentId);
      if (idx >= 0) Object.assign(dataCache.contents[idx], { category: cat, emoji: emojiMap[cat], title, body, tags });
    } else {
      await apiCreateContent({ category: cat, emoji: emojiMap[cat], title, body, tags });
      dataCache.contents = null; // 캐시 무효화
    }
    closeModal('content-modal-overlay');
    showToast(`콘텐츠가 Firestore에 ${selectedContentId?'수정':'저장'}되었습니다.`, 'success');
    await loadContent(true);
  } catch(err) {
    showToast('저장 실패: ' + err.message, 'error');
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
}

// ──────────────────────────────────────────────
// 6-1. BANNER (이벤트 배너)
// ──────────────────────────────────────────────

function bannerShell() {
  return `
    <div class="page-header" style="display:flex;align-items:flex-start;justify-content:space-between">
      <div>
        <h1>이벤트 배너 관리</h1>
        <p>Flutter 앱 홈 화면 및 설정 화면에 슬라이드로 표시될 이벤트 배너를 관리합니다.</p>
      </div>
      <button class="btn btn-primary" onclick="openBannerModal()" style="margin-top:4px">
        <i data-lucide="plus"></i> 새 배너 추가
      </button>
    </div>
    <div class="tab-bar">
      <div class="tab-item ${bannerState.position==='all'?'active':''}" onclick="switchBannerTab('all')">전체 배너</div>
      <div class="tab-item ${bannerState.position==='home'?'active':''}" onclick="switchBannerTab('home')">홈 화면</div>
      <div class="tab-item ${bannerState.position==='settings'?'active':''}" onclick="switchBannerTab('settings')">설정 화면</div>
    </div>
    <div class="content-grid" id="banner-grid">
      ${Array(2).fill(`<div class="content-card">
        <div class="content-card-img" style="background:var(--divider);height:100px">
          <div class="skeleton" style="width:100%;height:100%"></div>
        </div>
        <div class="content-card-body">
          <div class="skeleton" style="height:14px;width:70%;border-radius:4px;margin-bottom:8px"></div>
          <div class="skeleton" style="height:11px;width:50%;border-radius:4px"></div>
        </div>
      </div>`).join('')}
    </div>`;
}

async function loadBanners(force = false) {
  try {
    await ensureBanners(force);
    renderBannerGrid();
  } catch(err) {
    showToast('배너 로드 실패: ' + err.message, 'error');
  }
}

function renderBannerGrid() {
  const items = (dataCache.banners||[]).filter(b => {
    if (bannerState.position === 'all') return true;
    return b.position === bannerState.position;
  });
  const grid = document.getElementById('banner-grid');
  if (!grid) return;

  grid.innerHTML = items.length
    ? items.map(b => `
      <div class="content-card" style="border-top: 4px solid ${b.bgColor||'var(--primary)'}">
        <div style="background:${b.bgColor||'var(--primary)'};color:white;padding:18px 20px;min-height:90px;display:flex;flex-direction:column;justify-content:center;position:relative">
          <div style="font-size:11px;opacity:0.85;margin-bottom:4px">
            ${b.position==='home' ? '🏠 홈 화면' : '⚙️ 설정 화면'} · 순서: ${b.order}
          </div>
          <div style="font-size:16px;font-weight:700;letter-spacing:-0.3px">${b.title}</div>
          ${b.subTitle ? `<div style="font-size:12px;opacity:0.9;margin-top:2px">${b.subTitle}</div>` : ''}
        </div>
        <div class="content-card-body" style="padding:14px 16px">
          <div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px;word-break:break-all">
            <strong>이동 링크:</strong> ${b.linkUrl || '없음'}
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span class="badge ${b.isActive ? 'badge-success' : 'badge-neutral'}">
              ${b.isActive ? '노출 중' : '숨김 상태'}
            </span>
            <span style="font-size:11px;color:var(--text-muted)">${b.createdAt||''}</span>
          </div>
        </div>
        <div class="content-card-footer" style="padding:10px 16px">
          <button class="btn btn-secondary btn-sm" onclick="toggleBannerActive('${b.id}')">
            ${b.isActive ? '숨기기' : '노출하기'}
          </button>
          <button class="btn btn-secondary btn-sm" onclick="editBanner('${b.id}')">
            <i data-lucide="pencil"></i> 수정
          </button>
          <button class="btn btn-danger-outline btn-sm" onclick="handleDeleteBanner('${b.id}')">
            <i data-lucide="trash-2"></i> 삭제
          </button>
        </div>
      </div>`).join('')
    : `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-muted)">
        등록된 이벤트 배너가 없습니다.<br>
        <button class="btn btn-primary btn-sm" onclick="openBannerModal()" style="margin-top:12px">
          <i data-lucide="plus"></i> 새 배너 추가
        </button>
      </div>`;
  lucide.createIcons();
}

function switchBannerTab(pos) {
  bannerState.position = pos;
  document.querySelectorAll('.tab-bar .tab-item').forEach((el, i) => {
    el.classList.toggle('active', ['all','home','settings'][i] === pos);
  });
  renderBannerGrid();
}

function openBannerModal(item = null) {
  selectedBannerId = item ? item.id : null;
  document.getElementById('banner-modal-title').textContent = item ? '배너 수정' : '새 이벤트 배너 추가';
  document.getElementById('banner-position-input').value = item ? item.position : 'home';
  document.getElementById('banner-title-input').value    = item ? item.title    : '';
  document.getElementById('banner-subtitle-input').value = item ? (item.subTitle||'') : '';
  document.getElementById('banner-imgurl-input').value   = item ? (item.imageUrl||'') : '';
  document.getElementById('banner-linkurl-input').value  = item ? (item.linkUrl||'')  : '';
  document.getElementById('banner-order-input').value    = item ? (item.order||1)     : 1;
  document.getElementById('banner-bgcolor-input').value  = item ? (item.bgColor||'hsl(340, 68%, 52%)') : 'hsl(340, 68%, 52%)';
  openModal('banner-modal-overlay');
}

function editBanner(id) {
  const item = (dataCache.banners||[]).find(b => b.id === id);
  if (item) openBannerModal(item);
}

async function toggleBannerActive(id) {
  const item = (dataCache.banners||[]).find(b => b.id === id);
  if (!item) return;
  const newActive = !item.isActive;
  try {
    await apiUpdateBanner(id, { isActive: newActive });
    item.isActive = newActive;
    renderBannerGrid();
    showToast(`배너가 ${newActive ? '노출 상태' : '숨김 상태'}로 변경되었습니다.`, 'success');
  } catch(err) {
    showToast('변경 실패: ' + err.message, 'error');
  }
}

async function handleDeleteBanner(id) {
  if (!confirm('이 이벤트 배너를 삭제하시겠습니까?')) return;
  try {
    await apiDeleteBanner(id);
    dataCache.banners = (dataCache.banners||[]).filter(b => b.id !== id);
    renderBannerGrid();
    showToast('배너가 삭제되었습니다.', 'success');
  } catch(err) {
    showToast('삭제 실패: ' + err.message, 'error');
  }
}

async function handleSaveBanner() {
  const title    = document.getElementById('banner-title-input').value.trim();
  const subTitle = document.getElementById('banner-subtitle-input').value.trim();
  const position = document.getElementById('banner-position-input').value;
  const imageUrl = document.getElementById('banner-imgurl-input').value.trim();
  const linkUrl  = document.getElementById('banner-linkurl-input').value.trim();
  const order    = Number(document.getElementById('banner-order-input').value) || 1;
  const bgColor  = document.getElementById('banner-bgcolor-input').value.trim() || 'hsl(340, 68%, 52%)';

  if (!title) { showToast('배너 제목을 입력해 주세요.', 'error'); return; }

  const saveBtn = document.querySelector('#banner-modal .btn-primary');
  if (saveBtn) saveBtn.disabled = true;

  try {
    if (selectedBannerId) {
      await apiUpdateBanner(selectedBannerId, { title, subTitle, position, imageUrl, linkUrl, order, bgColor });
    } else {
      await apiCreateBanner({ title, subTitle, position, imageUrl, linkUrl, order, bgColor, isActive: true });
    }
    dataCache.banners = null; // 무효화
    closeModal('banner-modal-overlay');
    showToast(`이벤트 배너가 ${selectedBannerId ? '수정' : '추가'}되었습니다.`, 'success');
    await loadBanners(true);
  } catch(err) {
    showToast('저장 실패: ' + err.message, 'error');
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
}

// ──────────────────────────────────────────────
// 7. PUSH
// ──────────────────────────────────────────────

function pushShell() {
  return `
    <div class="page-header">
      <h1>푸시 알림</h1>
      <p>사용자에게 푸시 알림을 발송하고 이력을 관리합니다.<br>
        <span style="color:var(--warning);font-size:12px;font-weight:500">
          ⚠️ 실제 FCM 발송은 Firebase Blaze 요금제 업그레이드 후 지원됩니다. 현재는 이력만 Firestore에 기록됩니다.
        </span>
      </p>
    </div>
    <div class="push-layout">
      <div class="card">
        <div class="card-header"><span class="card-header-title">새 알림 작성</span></div>
        <div class="card-body">
          <div class="form-group">
            <label class="form-label">발송 대상</label>
            <select class="form-select w-full" id="push-target" onchange="updatePushTargetCount()">
              <option value="all">전체 사용자</option>
              <option value="active">활성 사용자만</option>
              <option value="early">초기 임신 (1–12주)</option>
              <option value="mid">중기 임신 (13–27주)</option>
              <option value="late">후기 임신 (28주+)</option>
            </select>
            <div class="form-hint" id="push-target-count">로딩 중...</div>
          </div>
          <div class="form-group">
            <label class="form-label">알림 제목 <span style="color:var(--danger)">*</span></label>
            <input type="text" class="form-input w-full" id="push-title" placeholder="알림 제목을 입력하세요" maxlength="50">
            <div class="form-hint">최대 50자</div>
          </div>
          <div class="form-group">
            <label class="form-label">알림 내용 <span style="color:var(--danger)">*</span></label>
            <textarea class="form-textarea w-full" id="push-body" placeholder="알림 내용을 입력하세요" maxlength="200" style="min-height:100px"></textarea>
            <div class="form-hint">최대 200자</div>
          </div>
          <div style="display:flex;gap:10px;justify-content:flex-end">
            <button class="btn btn-secondary" onclick="document.getElementById('push-title').value='';document.getElementById('push-body').value=''">초기화</button>
            <button class="btn btn-primary" id="push-send-btn" onclick="handleSendPush()">
              <i data-lucide="send"></i> 이력 기록
            </button>
          </div>
        </div>
      </div>
      <div>
        <div class="table-container">
          <div class="card-header"><span class="card-header-title">발송 이력 (Firestore)</span></div>
          <table>
            <thead><tr><th>제목</th><th>대상</th><th>발송 수</th><th>발송일시</th><th>상태</th></tr></thead>
            <tbody id="push-history-tbody">${skeletonRows(5, 5)}</tbody>
          </table>
        </div>
      </div>
    </div>`;
}

async function loadPushData() {
  // 사용자 수 카운트를 위해 사용자 데이터도 로드
  await ensureUsers();
  updatePushTargetCount();

  const badge = document.getElementById('push-badge');
  if (badge) badge.style.display = 'none';

  try {
    const history = await ensurePushHistory(true);
    const tbody = document.getElementById('push-history-tbody');
    if (!tbody) return;
    tbody.innerHTML = history.length
      ? history.map(h => `
          <tr>
            <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${h.title}</td>
            <td style="color:var(--text-secondary);font-size:12px">${h.target}</td>
            <td>${(h.sentCount||0).toLocaleString()}</td>
            <td style="color:var(--text-muted);font-size:12px">${h.sendDate}</td>
            <td><span class="badge badge-success badge-dot">기록됨</span></td>
          </tr>`).join('')
      : `<tr><td colspan="5" class="empty-state">발송 이력이 없습니다.</td></tr>`;
    lucide.createIcons();
  } catch(err) {
    showToast('이력 로드 실패: ' + err.message, 'error');
  }
}

function updatePushTargetCount() {
  const users  = dataCache.users || [];
  const target = document.getElementById('push-target')?.value || 'all';
  const countEl = document.getElementById('push-target-count');
  if (!countEl) return;

  let count = users.length;
  if (target === 'active') count = users.filter(u => u.status === 'active').length;
  else if (target === 'early') count = users.filter(u => (u.pregnancyWeek||0) <= 12).length;
  else if (target === 'mid')   count = users.filter(u => { const w = u.pregnancyWeek||0; return w>=13&&w<=27; }).length;
  else if (target === 'late')  count = users.filter(u => (u.pregnancyWeek||0) >= 28).length;

  countEl.textContent = `대상: ${count.toLocaleString()}명`;
}

async function handleSendPush() {
  const title  = document.getElementById('push-title').value.trim();
  const body   = document.getElementById('push-body').value.trim();
  const target = document.getElementById('push-target').value;

  if (!title) { showToast('알림 제목을 입력해 주세요.', 'error'); return; }
  if (!body)  { showToast('알림 내용을 입력해 주세요.', 'error'); return; }

  const users = dataCache.users || [];
  const labelMap = { all:'전체', active:'활성 사용자', early:'초기 임신', mid:'중기 임신', late:'후기 임신' };
  let sentCount = users.length;
  if (target === 'active') sentCount = users.filter(u => u.status==='active').length;
  else if (target === 'early') sentCount = users.filter(u => (u.pregnancyWeek||0)<=12).length;
  else if (target === 'mid')   sentCount = users.filter(u => { const w=u.pregnancyWeek||0; return w>=13&&w<=27; }).length;
  else if (target === 'late')  sentCount = users.filter(u => (u.pregnancyWeek||0)>=28).length;

  const btn = document.getElementById('push-send-btn');
  if (btn) btn.disabled = true;
  try {
    await apiSavePushRecord({ title, body, target: labelMap[target]||target, sentCount });
    dataCache.pushHistory = null;
    showToast('발송 이력이 Firestore에 저장되었습니다. (실제 FCM 발송: Blaze 요금제 필요)', 'success');
    document.getElementById('push-title').value = '';
    document.getElementById('push-body').value  = '';
    await loadPushData();
  } catch(err) {
    showToast('저장 실패: ' + err.message, 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ──────────────────────────────────────────────
// 8. STATS
// ──────────────────────────────────────────────

function statsShell() {
  const periods = [{v:'7',l:'최근 7일'},{v:'30',l:'최근 30일'},{v:'90',l:'최근 90일'}];
  return `
    <div class="page-header">
      <h1>통계 / 리포트</h1>
      <p>Firestore 실제 데이터 기반의 사용자 분석 리포트입니다.</p>
    </div>
    <div class="stats-filter-bar">
      <span style="font-size:12px;color:var(--text-muted);font-weight:600">기간</span>
      ${periods.map(p=>`<button class="period-btn ${statsState.period===p.v?'active':''}" onclick="switchStatsPeriod('${p.v}')">${p.l}</button>`).join('')}
    </div>
    <div class="kpi-grid" id="stats-kpi-grid">${Array(4).fill(skeletonKpi()).join('')}</div>
    <div class="chart-grid" style="margin-bottom:20px">
      <div class="card">
        <div class="card-header"><span class="card-header-title">가입자 추이</span></div>
        <div class="card-body"><canvas id="joinChart" height="200"></canvas></div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-header-title">사용자 상태 분포</span></div>
        <div class="card-body" style="display:flex;align-items:center;justify-content:center">
          <canvas id="statusChart" width="200" height="200" style="max-width:200px"></canvas>
        </div>
      </div>
    </div>
    <div class="chart-grid-3">
      <div class="card">
        <div class="card-header"><span class="card-header-title">임신주차별 분포</span></div>
        <div class="card-body"><canvas id="weekChart" height="200"></canvas></div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-header-title">앱 버전 분포</span></div>
        <div class="card-body"><canvas id="versionChart" height="200"></canvas></div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-header-title">OS별 비율</span></div>
        <div class="card-body" style="display:flex;align-items:center;justify-content:center">
          <canvas id="osChart2" width="190" height="190" style="max-width:190px"></canvas>
        </div>
      </div>
    </div>`;
}

async function loadStats() {
  try {
    const [users, cfg] = await Promise.all([ensureUsers(), ensureAppConfig()]);
    renderStatsKpi(users, cfg);
    renderStatsCharts(users, statsState.period);
  } catch(err) {
    showToast('통계 로드 실패: ' + err.message, 'error');
  }
}

function renderStatsKpi(users, cfg) {
  const total    = users.length;
  const active   = users.filter(u => u.status==='active').length;
  const inactive = users.filter(u => u.status!=='active').length;
  const latest   = users.filter(u => u.appVersion === (cfg?.ios?.latestVersion||'')).length;
  const el = document.getElementById('stats-kpi-grid');
  if (!el) return;
  el.innerHTML = `
    <div class="kpi-card">
      <div class="kpi-header"><span class="kpi-label">총 가입자</span>
        <div class="kpi-icon" style="background:hsl(340,68%,95%)"><i data-lucide="users" style="color:var(--primary)"></i></div>
      </div>
      <div class="kpi-value">${total}</div><div class="kpi-sub">Firestore 전체</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-header"><span class="kpi-label">활성 사용자</span>
        <div class="kpi-icon" style="background:var(--success-bg)"><i data-lucide="check-circle" style="color:var(--success)"></i></div>
      </div>
      <div class="kpi-value">${active}</div><div class="kpi-sub">${total?Math.round(active/total*100):0}% 활성 비율</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-header"><span class="kpi-label">비활성</span>
        <div class="kpi-icon" style="background:var(--danger-bg)"><i data-lucide="x-circle" style="color:var(--danger)"></i></div>
      </div>
      <div class="kpi-value">${inactive}</div><div class="kpi-sub">비활성 + 일시정지</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-header"><span class="kpi-label">최신 버전 사용자</span>
        <div class="kpi-icon" style="background:var(--info-bg)"><i data-lucide="smartphone" style="color:var(--info)"></i></div>
      </div>
      <div class="kpi-value">${latest}</div><div class="kpi-sub">${total?Math.round(latest/total*100):0}% 최신 버전</div>
    </div>`;
  lucide.createIcons();
}

function renderStatsCharts(users, period) {
  const days = parseInt(period);
  const labels = [], data = [];
  for (let i = days-1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate()-i);
    const ds = d.toISOString().slice(0,10);
    labels.push(days<=7 ? `${d.getMonth()+1}/${d.getDate()}` : `${d.getMonth()+1}/${d.getDate()}`);
    data.push(users.filter(u => u.joinDate === ds).length);
  }

  const jCtx = document.getElementById('joinChart');
  if (jCtx) charts.join = new Chart(jCtx, {
    type:'bar', data:{ labels, datasets:[{ label:'신규 가입', data,
      backgroundColor:'hsl(340,68%,52%)', borderRadius:4, borderSkipped:false }] },
    options: chartDefaults({ yLabel:'명' }),
  });

  const active   = users.filter(u=>u.status==='active').length;
  const inactive = users.filter(u=>u.status==='inactive').length;
  const paused   = users.filter(u=>u.status==='paused').length;
  const sCtx = document.getElementById('statusChart');
  if (sCtx) charts.status = new Chart(sCtx, {
    type:'pie', data:{ labels:['활성','비활성','일시정지'], datasets:[{
      data:[active,inactive,paused],
      backgroundColor:['hsl(155,60%,40%)','hsl(0,72%,55%)','hsl(38,92%,50%)'],
      borderWidth:2, borderColor:'#fff' }] },
    options:{ responsive:false, plugins:{ legend:{ position:'bottom', labels:{ font:{size:11}, padding:8 } } } },
  });

  const t1 = users.filter(u=>(u.pregnancyWeek||0)<=12).length;
  const t2 = users.filter(u=>{ const w=u.pregnancyWeek||0; return w>=13&&w<=27; }).length;
  const t3 = users.filter(u=>(u.pregnancyWeek||0)>=28).length;
  const wCtx = document.getElementById('weekChart');
  if (wCtx) charts.week = new Chart(wCtx, {
    type:'bar', data:{ labels:['초기 (1–12주)','중기 (13–27주)','후기 (28주+)'],
      datasets:[{ label:'사용자 수', data:[t1,t2,t3],
        backgroundColor:['hsl(215,75%,65%)','hsl(340,68%,65%)','hsl(155,60%,55%)'],
        borderRadius:6, borderSkipped:false }] },
    options: chartDefaults({ yLabel:'명' }),
  });

  const verMap = {};
  users.forEach(u => { const v = u.appVersion||'unknown'; verMap[v] = (verMap[v]||0)+1; });
  const vLabels = Object.keys(verMap).sort().reverse();
  const vCtx = document.getElementById('versionChart');
  if (vCtx) charts.ver = new Chart(vCtx, {
    type:'bar', data:{ labels: vLabels.map(v=>`v${v}`),
      datasets:[{ label:'사용자', data: vLabels.map(v=>verMap[v]),
        backgroundColor:['hsl(155,60%,40%)','hsl(38,92%,50%)','hsl(0,72%,55%)'],
        borderRadius:6, borderSkipped:false }] },
    options: chartDefaults({ yLabel:'명' }),
  });

  const ios = users.filter(u=>u.device==='iOS').length;
  const o2  = document.getElementById('osChart2');
  if (o2) charts.os2 = new Chart(o2, {
    type:'doughnut', data:{ labels:['iOS','Android'], datasets:[{ data:[ios,users.length-ios],
      backgroundColor:['hsl(215,75%,55%)','hsl(155,60%,40%)'], borderWidth:2, borderColor:'#fff' }] },
    options:{ responsive:false, cutout:'65%',
      plugins:{ legend:{ position:'bottom', labels:{ font:{size:11} } } } },
  });
}

function switchStatsPeriod(p) {
  statsState.period = p;
  Object.values(charts).forEach(c => { try { c.destroy(); } catch(_) {} });
  charts = {};
  const el = document.getElementById('page-content');
  el.innerHTML = statsShell();
  lucide.createIcons();
  const users = dataCache.users || [];
  const cfg   = dataCache.appConfig;
  renderStatsKpi(users, cfg);
  renderStatsCharts(users, p);
}

// ──────────────────────────────────────────────
// 9. SETTINGS
// ──────────────────────────────────────────────

function settingsShell() {
  return `
    <div class="page-header">
      <h1>설정</h1>
      <p>앱 업데이트, 서비스 공지, 관리자 계정을 관리합니다. 변경사항은 Firestore에 저장됩니다.</p>
    </div>
    <div class="settings-layout">
      <div class="settings-sidebar">
        <div class="settings-nav-item ${settingsTab==='updates'?'active':''}" onclick="switchSettingsTab('updates')">
          <i data-lucide="smartphone"></i> 앱 업데이트
        </div>
        <div class="settings-nav-item ${settingsTab==='notice'?'active':''}" onclick="switchSettingsTab('notice')">
          <i data-lucide="megaphone"></i> 서비스 공지
        </div>
        <div class="settings-nav-item ${settingsTab==='account'?'active':''}" onclick="switchSettingsTab('account')">
          <i data-lucide="shield"></i> 관리자 계정
        </div>
      </div>
      <div class="settings-content" id="settings-content">
        <div style="display:flex;flex-direction:column;gap:16px">
          <div class="skeleton" style="height:220px;border-radius:10px"></div>
          <div class="skeleton" style="height:220px;border-radius:10px"></div>
        </div>
      </div>
    </div>`;
}

async function loadSettings() {
  try {
    await ensureAppConfig();
    renderSettingsContent();
  } catch(err) {
    showToast('설정 로드 실패: ' + err.message, 'error');
  }
}

function switchSettingsTab(tab) {
  settingsTab = tab;
  document.querySelectorAll('.settings-nav-item').forEach((el,i) => {
    el.classList.toggle('active', ['updates','notice','account'][i] === tab);
  });
  const el = document.getElementById('settings-content');
  if (el) { el.innerHTML = getSettingsContent(); lucide.createIcons(); }
}

function renderSettingsContent() {
  const el = document.getElementById('settings-content');
  if (!el) return;
  el.innerHTML = getSettingsContent();
  lucide.createIcons();
}

function getSettingsContent() {
  switch (settingsTab) {
    case 'updates': return renderSettingsUpdates();
    case 'notice':  return renderSettingsNotice();
    case 'account': return renderSettingsAccount();
    default:        return renderSettingsUpdates();
  }
}

function renderSettingsUpdates() {
  const ios     = dataCache.appConfig?.ios     || {};
  const android = dataCache.appConfig?.android || {};

  const platformCard = (id, data, platformLabel, storeLabel, iconHtml, iconBg) => `
    <div class="version-card">
      <div class="version-card-header">
        <div class="platform-icon" style="background:${iconBg}">${iconHtml}</div>
        <div>
          <div class="platform-name">${platformLabel}</div>
          <div class="platform-store">${storeLabel}</div>
        </div>
        <span class="badge badge-success" style="margin-left:auto">Firestore</span>
      </div>
      <div class="version-field">
        <label>최소 허용 버전 (이상만 허용)</label>
        <input type="text" id="${id}-min-ver" value="${data.currentVersion||''}" placeholder="예: 2.0.0">
      </div>
      <div class="version-field">
        <label>최신 버전 (스토어 배포)</label>
        <input type="text" id="${id}-latest-ver" value="${data.latestVersion||''}" placeholder="예: 2.1.0">
      </div>
      <div class="version-field">
        <label>배포일</label>
        <input type="text" id="${id}-release-date" value="${data.releaseDate||''}" placeholder="예: 2026-08-01">
      </div>
      <div class="divider"></div>
      <div class="toggle-row">
        <div class="toggle-info">
          <div class="toggle-info-label">강제 업데이트</div>
          <div class="toggle-info-desc">최소 버전 미만 사용자 접속 차단</div>
        </div>
        <div class="toggle ${data.forceUpdate?'on':''}" id="${id}-force-toggle" onclick="toggleForce('${id}')"></div>
      </div>
      <div class="version-field" style="margin-top:12px">
        <label>업데이트 안내 메시지</label>
        <textarea class="form-textarea w-full" id="${id}-update-msg" style="min-height:72px">${data.updateMessage||''}</textarea>
      </div>
    </div>`;

  const iosIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="color:#555;width:18px;height:18px"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>`;
  const andIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="color:hsl(155,60%,38%);width:18px;height:18px"><path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.2439 13.8533 7.8508 12 7.8508s-3.5902.3931-5.1367 1.0989L4.841 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3435-4.1021-2.6892-7.5743-6.1185-9.4396"/></svg>`;

  return `
    <div class="settings-section">
      <div class="settings-section-title">앱 업데이트 관리</div>
      <div class="settings-section-desc">
        iOS, Android 버전 정보를 Firestore <code>app_config</code> 컬렉션에 저장합니다.
        Flutter 앱은 실행 시 이 값을 읽어 업데이트를 안내합니다.
      </div>
      <div class="version-grid">
        ${platformCard('ios',     ios,     'iOS',     'App Store',    iosIcon, 'hsl(220,15%,95%)')}
        ${platformCard('android', android, 'Android', 'Google Play',  andIcon, 'hsl(155,60%,94%)')}
      </div>
      <div style="display:flex;justify-content:flex-end">
        <button class="btn btn-primary" onclick="saveAppUpdates()">
          <i data-lucide="save"></i> Firestore에 저장
        </button>
      </div>
    </div>`;
}

function renderSettingsNotice() {
  const n = dataCache.appConfig?.notice || {};
  return `
    <div class="settings-section">
      <div class="settings-section-title">서비스 공지 설정</div>
      <div class="settings-section-desc">Firestore <code>app_config/notice</code>에 저장됩니다. Flutter 앱이 실행 시 이 값을 확인합니다.</div>
      <div class="card" style="margin-bottom:16px">
        <div class="card-header"><span class="card-header-title">점검 모드</span></div>
        <div class="card-body">
          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-info-label">점검 모드 활성화</div>
              <div class="toggle-info-desc">활성화 시 앱 접속 차단 및 점검 메시지 표시</div>
            </div>
            <div class="toggle ${n.maintenanceMode?'on':''}" id="maintenance-toggle" onclick="toggleSetting('maintenance')"></div>
          </div>
          <div class="form-group" style="margin-top:14px;margin-bottom:0">
            <label class="form-label">점검 안내 메시지</label>
            <textarea class="form-textarea w-full" id="maintenance-msg" style="min-height:72px">${n.maintenanceMsg||''}</textarea>
          </div>
        </div>
      </div>
      <div class="card" style="margin-bottom:20px">
        <div class="card-header"><span class="card-header-title">앱 내 배너 공지</span></div>
        <div class="card-body">
          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-info-label">배너 공지 활성화</div>
              <div class="toggle-info-desc">앱 메인 화면 상단에 공지 배너를 표시합니다.</div>
            </div>
            <div class="toggle ${n.bannerEnabled?'on':''}" id="banner-toggle" onclick="toggleSetting('banner')"></div>
          </div>
          <div class="form-group" style="margin-top:14px;margin-bottom:0">
            <label class="form-label">배너 메시지</label>
            <input type="text" class="form-input w-full" id="banner-msg" value="${n.bannerMsg||''}">
          </div>
        </div>
      </div>
      <div style="display:flex;justify-content:flex-end">
        <button class="btn btn-primary" onclick="saveNotice()">
          <i data-lucide="save"></i> Firestore에 저장
        </button>
      </div>
    </div>`;
}

function renderSettingsAccount() {
  const user = firebase.auth().currentUser;
  return `
    <div class="settings-section">
      <div class="settings-section-title">관리자 계정</div>
      <div class="settings-section-desc">현재 로그인된 Firebase 계정 정보입니다.</div>
      <div class="card" style="max-width:480px;margin-bottom:16px">
        <div class="card-header"><span class="card-header-title">계정 정보</span></div>
        <div class="card-body">
          <div class="form-group">
            <label class="form-label">이메일</label>
            <input type="email" class="form-input w-full" value="${user?.email||'-'}" disabled style="background:var(--divider)">
          </div>
          <div class="form-group" style="margin-bottom:0">
            <label class="form-label">Firebase UID</label>
            <input type="text" class="form-input w-full" value="${user?.uid||'-'}" disabled style="background:var(--divider);font-size:11px">
          </div>
        </div>
      </div>
      <div class="card" style="max-width:480px;margin-bottom:20px">
        <div class="card-header"><span class="card-header-title">비밀번호 변경</span></div>
        <div class="card-body">
          <div class="form-group">
            <label class="form-label">새 비밀번호</label>
            <input type="password" class="form-input w-full" id="pw-new" placeholder="새 비밀번호 (8자 이상)">
          </div>
          <div class="form-group" style="margin-bottom:0">
            <label class="form-label">새 비밀번호 확인</label>
            <input type="password" class="form-input w-full" id="pw-confirm" placeholder="비밀번호 재입력">
          </div>
        </div>
      </div>
      <div style="max-width:480px;display:flex;justify-content:flex-end">
        <button class="btn btn-primary" onclick="saveAccount()">
          <i data-lucide="save"></i> 비밀번호 변경
        </button>
      </div>
    </div>`;
}

// Settings Handlers
function toggleForce(platform) {
  if (!dataCache.appConfig) return;
  dataCache.appConfig[platform].forceUpdate = !dataCache.appConfig[platform].forceUpdate;
  const el = document.getElementById(`${platform}-force-toggle`);
  if (el) el.classList.toggle('on', dataCache.appConfig[platform].forceUpdate);
}

function toggleSetting(key) {
  if (!dataCache.appConfig) return;
  if (key === 'maintenance') {
    dataCache.appConfig.notice.maintenanceMode = !dataCache.appConfig.notice.maintenanceMode;
    document.getElementById('maintenance-toggle')?.classList.toggle('on', dataCache.appConfig.notice.maintenanceMode);
  } else if (key === 'banner') {
    dataCache.appConfig.notice.bannerEnabled = !dataCache.appConfig.notice.bannerEnabled;
    document.getElementById('banner-toggle')?.classList.toggle('on', dataCache.appConfig.notice.bannerEnabled);
  }
}

async function saveAppUpdates() {
  const g = id => document.getElementById(id)?.value.trim() || '';
  const iosData = {
    currentVersion: g('ios-min-ver'),
    latestVersion:  g('ios-latest-ver'),
    releaseDate:    g('ios-release-date'),
    updateMessage:  g('ios-update-msg'),
    forceUpdate:    dataCache.appConfig?.ios?.forceUpdate || false,
  };
  const androidData = {
    currentVersion: g('android-min-ver'),
    latestVersion:  g('android-latest-ver'),
    releaseDate:    g('android-release-date'),
    updateMessage:  g('android-update-msg'),
    forceUpdate:    dataCache.appConfig?.android?.forceUpdate || false,
  };
  try {
    await Promise.all([apiUpdateAppConfig('ios', iosData), apiUpdateAppConfig('android', androidData)]);
    if (dataCache.appConfig) { dataCache.appConfig.ios = iosData; dataCache.appConfig.android = androidData; }
    showToast('앱 업데이트 설정이 Firestore에 저장되었습니다. ✓', 'success');
  } catch(err) {
    showToast('저장 실패: ' + err.message, 'error');
  }
}

async function saveNotice() {
  const noticeData = {
    maintenanceMode: dataCache.appConfig?.notice?.maintenanceMode || false,
    maintenanceMsg:  document.getElementById('maintenance-msg')?.value || '',
    bannerEnabled:   dataCache.appConfig?.notice?.bannerEnabled || false,
    bannerMsg:       document.getElementById('banner-msg')?.value || '',
  };
  try {
    await apiUpdateAppConfig('notice', noticeData);
    if (dataCache.appConfig) dataCache.appConfig.notice = noticeData;
    showToast('서비스 공지 설정이 Firestore에 저장되었습니다. ✓', 'success');
  } catch(err) {
    showToast('저장 실패: ' + err.message, 'error');
  }
}

async function saveAccount() {
  const nw = document.getElementById('pw-new')?.value;
  const cf = document.getElementById('pw-confirm')?.value;
  if (!nw || nw.length < 8) { showToast('비밀번호는 8자 이상이어야 합니다.', 'error'); return; }
  if (nw !== cf)             { showToast('비밀번호가 일치하지 않습니다.', 'error'); return; }
  try {
    await firebase.auth().currentUser.updatePassword(nw);
    showToast('비밀번호가 변경되었습니다. ✓', 'success');
    document.getElementById('pw-new').value = '';
    document.getElementById('pw-confirm').value = '';
  } catch(err) {
    if (err.code === 'auth/requires-recent-login') {
      showToast('보안을 위해 로그아웃 후 재로그인 후 변경해 주세요.', 'error');
    } else {
      showToast('변경 실패: ' + err.message, 'error');
    }
  }
}

// ──────────────────────────────────────────────
// 10. LOGOUT
// ──────────────────────────────────────────────

function handleLogout() {
  if (!confirm('로그아웃 하시겠습니까?')) return;
  firebase.auth().signOut()
    .then(() => window.location.replace('login.html'))
    .catch(err => showToast('로그아웃 실패: ' + err.message, 'error'));
}

// ──────────────────────────────────────────────
// 11. UTILITIES
// ──────────────────────────────────────────────

function statusBadge(status) {
  const map = {
    active:   '<span class="badge badge-success badge-dot">활성</span>',
    inactive: '<span class="badge badge-danger badge-dot">비활성</span>',
    paused:   '<span class="badge badge-warning badge-dot">일시정지</span>',
  };
  return map[status] || '<span class="badge badge-neutral">알수없음</span>';
}

function chartDefaults({ yLabel = '' } = {}) {
  return {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'hsl(220,26%,12%)', padding: 10, cornerRadius: 8,
        titleFont: { size: 12 }, bodyFont: { size: 12 },
        callbacks: { label: ctx => ` ${ctx.formattedValue}${yLabel}` },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 11 }, color: 'hsl(220,8%,60%)' } },
      y: { grid: { color: 'hsl(220,14%,95%)' }, ticks: { font: { size: 11 }, color: 'hsl(220,8%,60%)' },
           border: { display: false }, beginAtZero: true },
    },
  };
}

function openModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.add('open'); document.body.style.overflow = 'hidden'; }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.remove('open'); document.body.style.overflow = ''; }
}

function showToast(message, type = 'default') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = {
    success: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
    error:   `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    info:    `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  };
  toast.innerHTML = `${icons[type]||''}<span>${message}</span>`;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('visible'));
  setTimeout(() => {
    toast.style.opacity = '0'; toast.style.transform = 'translateX(16px)';
    toast.style.transition = 'opacity 0.2s, transform 0.2s';
    setTimeout(() => toast.remove(), 250);
  }, 4500);
}

// ──────────────────────────────────────────────
// 12. INIT
// ──────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  navigate('dashboard');
});
