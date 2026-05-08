// ---------- FOCUS TRAP UTILITY ----------
function trapFocus(panel) {
    const sel = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const getFocusable = () => [...panel.querySelectorAll(sel)];
    panel._trapHandler = (e) => {
        if (e.key !== 'Tab') return;
        const focusable = getFocusable();
        if (!focusable.length) return;
        const first = focusable[0];
        const last  = focusable[focusable.length - 1];
        if (e.shiftKey) {
            if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
            if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
        }
    };
    panel.addEventListener('keydown', panel._trapHandler);
}

function releaseFocus(panel) {
    if (panel._trapHandler) {
        panel.removeEventListener('keydown', panel._trapHandler);
        panel._trapHandler = null;
    }
}

// ---------- LAST-MODIFIED META STORE ----------
const META_KEY = 'portal_meta';

function _getMeta() {
    try { return JSON.parse(localStorage.getItem(META_KEY)) || {}; } catch { return {}; }
}
function setLastModified(key) {
    const m = _getMeta(); m[key] = Date.now();
    localStorage.setItem(META_KEY, JSON.stringify(m));
}
function getLastModified(key) { return _getMeta()[key] || 0; }

// ---------- TOAST NOTIFICATIONS ----------
const _toastContainer = document.getElementById('toast-container');

function showToast(message, type = 'info', duration = 5000) {
    if (!_toastContainer) return;
    const t = document.createElement('div');
    const icon = type === 'warn'  ? 'fa-triangle-exclamation'
               : type === 'error' ? 'fa-circle-xmark' : 'fa-circle-info';
    t.className = `toast toast-${type}`;
    t.innerHTML = `<i class="fa-solid ${icon}" aria-hidden="true"></i><span>${message}</span>`;
    _toastContainer.appendChild(t);
    const remove = () => {
        t.classList.add('toast-hiding');
        t.addEventListener('animationend', () => t.remove(), { once: true });
    };
    const timer = setTimeout(remove, duration);
    t.addEventListener('click', () => { clearTimeout(timer); remove(); });
}

// ---------- STORAGE USAGE ----------
const LS_WARN_BYTES = 4 * 1024 * 1024;
let _storageWarnShown = false;

function _lsBytes() {
    let n = 0;
    for (const k in localStorage) {
        if (Object.prototype.hasOwnProperty.call(localStorage, k))
            n += (k.length + (localStorage.getItem(k) || '').length) * 2;
    }
    return n;
}

function _fmtBytes(b) {
    if (b < 1024)    return `${b} B`;
    if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1048576).toFixed(2)} MB`;
}

async function updateStorageIndicator() {
    const textEl = document.getElementById('udStorageText');
    const barEl  = document.getElementById('udStorageBar');
    const lsUsed = _lsBytes();
    let pct   = Math.min(100, Math.round(lsUsed / (5 * 1048576) * 100));
    let label = `${_fmtBytes(lsUsed)} / 5 MB`;

    try {
        const est = await navigator.storage?.estimate?.();
        if (est?.quota) {
            pct   = Math.min(100, Math.round((est.usage || 0) / est.quota * 100));
            label = `${_fmtBytes(est.usage || 0)} / ${_fmtBytes(est.quota)}`;
        }
    } catch {}

    if (textEl) textEl.textContent = label;
    if (barEl) {
        barEl.style.width = pct + '%';
        barEl.className = 'ud-storage-fill' + (pct > 80 ? ' critical' : pct > 50 ? ' warn' : '');
    }

    if (!_storageWarnShown && lsUsed > LS_WARN_BYTES) {
        _storageWarnShown = true;
        showToast(`localStorage ${_fmtBytes(lsUsed)} used — approaching 5 MB limit`, 'warn', 8000);
    }
}

window.updateStorageIndicator = updateStorageIndicator;

// ---------- DATA EXPORT ----------
function exportPortalData() {
    const keys = [
        'portal_view_counts', 'portal_visited_launchpad',
        'portal_daily_view_counts', 'portal_monthly_view_counts', 'portal_module_order',
    ];
    const out = { _exported: new Date().toISOString() };
    keys.forEach(k => {
        const raw = localStorage.getItem(k);
        try { out[k] = raw ? JSON.parse(raw) : null; } catch { out[k] = raw; }
    });
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), {
        href: url,
        download: `portal-${new Date().toISOString().slice(0, 10)}.json`,
    });
    a.click();
    URL.revokeObjectURL(url);
}

document.getElementById('export-data-btn')?.addEventListener('click', () => {
    exportPortalData();
    const dd = document.getElementById('user-dropdown');
    if (dd) dd.hidden = true;
});

// ---------- THEME TOGGLE ----------
const themeBtn = document.getElementById('themeToggleBtn');
const themeIconSpan = document.getElementById('themeIconMode');
const rootBody = document.body;

function applyTheme(theme) {
    if (theme === 'dark') {
        rootBody.classList.add('dark');
        themeIconSpan.className = 'fa-solid fa-moon';
        themeBtn.classList.remove('theme-is-light');
        themeBtn.classList.add('theme-is-dark');
        themeBtn.title = 'Switch to light mode';
    } else {
        rootBody.classList.remove('dark');
        themeIconSpan.className = 'fa-solid fa-sun';
        themeBtn.classList.remove('theme-is-dark');
        themeBtn.classList.add('theme-is-light');
        themeBtn.title = 'Switch to dark mode';
    }
    localStorage.setItem('portal_user_theme', theme);
}

const storedTheme = localStorage.getItem('portal_user_theme');
if (storedTheme === 'dark') applyTheme('dark');
else applyTheme('light');

themeBtn.addEventListener('click', () => {
    themeBtn.classList.add('theme-switching');
    themeBtn.addEventListener('animationend', () => themeBtn.classList.remove('theme-switching'), { once: true });
    applyTheme(rootBody.classList.contains('dark') ? 'light' : 'dark');
});

// ---------- DATE, PROGRESS & COUNTDOWN ----------
let countdownMode = 'today'; // 'today' or 'month'
let dateMode = 'date'; // 'date' or 'yearPercent'

function updateAllTimeMetrics() {
    const now = new Date();
    const year = now.getFullYear();

    // Update date/weekday widget
    if (dateMode === 'date') {
        document.getElementById('widgetDate').innerText =
            now.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
        document.getElementById('widgetWeekday').innerText =
            now.toLocaleDateString(undefined, { weekday: 'long' });
    } else {
        const start = new Date(year, 0, 0);
        const dayNum = Math.floor((now - start) / 86400000);
        const isLeap = (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0));
        const totalDays = isLeap ? 366 : 365;
        const percentage = Math.round((dayNum / totalDays) * 100);
        document.getElementById('widgetDate').innerText = `${percentage}%`;
        document.getElementById('widgetWeekday').innerText = 'OF YEAR';
    }

    const start = new Date(year, 0, 0);
    const dayNum = Math.floor((now - start) / 86400000);
    const total = (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 366 : 365;
    document.getElementById('dayOfYearSpan').innerText = `${dayNum}/${total}`;

    // Update countdown widget
    if (countdownMode === 'today') {
        const endToday = new Date(year, now.getMonth(), now.getDate(), 23, 59, 59, 999);
        let msLeft = Math.max(0, endToday - now);
        const h = Math.floor(msLeft / 3600000);
        const m = Math.floor((msLeft % 3600000) / 60000);
        const s = Math.floor((msLeft % 60000) / 1000);
        document.getElementById('midnightCountdown').innerText =
            `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        document.getElementById('countdownLabel').innerText = 'REMAINING TODAY';
    } else {
        const endMonth = new Date(year, now.getMonth() + 1, 0, 23, 59, 59, 999);
        let msLeft = Math.max(0, endMonth - now);
        const h = Math.floor(msLeft / 3600000);
        document.getElementById('midnightCountdown').innerText =
            `${h}h remaining`;
        document.getElementById('countdownLabel').innerText = 'REMAINING THIS MONTH';
    }

    document.getElementById('liveTimeFooter').innerText =
        now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
}

updateAllTimeMetrics();
setInterval(updateAllTimeMetrics, 1000);

// Countdown widget click handler to toggle between daily/monthly mode
const countdownWidget = document.getElementById('countdownStatWidget');
if (countdownWidget) {
    countdownWidget.addEventListener('click', () => {
        countdownMode = countdownMode === 'today' ? 'month' : 'today';
        updateAllTimeMetrics();
    });
}

// Date widget click handler to toggle between date/year percentage mode
const dateWidget = document.querySelector('[id="widgetDate"]')?.parentElement?.parentElement;
if (dateWidget) {
    dateWidget.classList.add('stat-widget-clickable');
    dateWidget.addEventListener('click', () => {
        dateMode = dateMode === 'date' ? 'yearPercent' : 'date';
        updateAllTimeMetrics();
    });
}

// ---------- MODULE REGISTRY ----------
const MODULES = [
    { id: 'mod-focus',    name: 'Focus Track',   icon: 'fa-solid fa-crosshairs', accent: '--accent-focus' },
    { id: 'mod-hustler',  name: 'Cali Hustler',  icon: 'fa-solid fa-fire',       accent: '--accent-hustler' },
    { id: 'mod-nexus',    name: 'Nexus Hub',     icon: 'fa-solid fa-microchip',  accent: '--accent-nexus' },
    { id: 'mod-sportage', name: 'Sportage',   icon: 'fa-solid fa-gauge-high', accent: '--accent-sportage' },
    { id: 'mod-titan',    name: 'Titan Crew',    icon: 'fa-solid fa-dumbbell',   accent: '--accent-titan' },
];
const moduleIds = MODULES.map(m => m.id);

// ---------- QUICK LINKS REGISTRY ----------
const QUICK_LINKS = [
    { id: 'ql-google',    name: 'Google',       icon: 'fa-brands fa-google',    accent: '--accent-hustler', url: 'https://google.com' },
    { id: 'ql-github',    name: 'GitHub',       icon: 'fa-brands fa-github',    accent: '--accent-nexus',    url: 'https://github.com' },
    { id: 'ql-youtube',   name: 'YouTube',      icon: 'fa-brands fa-youtube',   accent: '--accent-focus',    url: 'https://youtube.com' },
    { id: 'ql-perplexity', name: 'Perplexity',   icon: 'fa-solid fa-circle-nodes', accent: '--accent-nexus',  url: 'https://perplexity.ai' },
    { id: 'ql-reddit',    name: 'Reddit',       icon: 'fa-brands fa-reddit',    accent: '--accent-hustler',  url: 'https://reddit.com' },
    { id: 'ql-gmail',     name: 'Gmail',        icon: 'fa-solid fa-envelope',   accent: '--accent-focus',    url: 'https://mail.google.com' },
    // Also include the main modules in quick links
    ...MODULES.map(m => ({
        ...m,
        url: document.getElementById(m.id)?.href || '#'
    }))
];

// ---------- VISITED TRACKING ----------
let visitedModules = [];

function loadVisitedState() {
    try {
        const raw = localStorage.getItem('portal_visited_launchpad');
        visitedModules = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(visitedModules)) visitedModules = [];
    } catch(e) { visitedModules = []; }
    moduleIds.forEach(id => {
        const card = document.getElementById(id);
        if (card) card.classList.toggle('visited', visitedModules.includes(id));
    });
}

function markAsVisited(id) {
    if (!visitedModules.includes(id)) {
        visitedModules.push(id);
        localStorage.setItem('portal_visited_launchpad', JSON.stringify(visitedModules));
        setLastModified('portal_visited_launchpad');
        document.getElementById(id)?.classList.add('visited');
        window.savePortalData?.('portal_visited_launchpad', visitedModules);
    }
}

// ---------- VIEW COUNTS & LEADERBOARD ----------
const VIEW_KEY = 'portal_view_counts';
let viewCounts = {};

function loadViewCounts() {
    try {
        const raw = localStorage.getItem(VIEW_KEY);
        viewCounts = raw ? JSON.parse(raw) : {};
        if (typeof viewCounts !== 'object' || Array.isArray(viewCounts)) viewCounts = {};
    } catch(e) { viewCounts = {}; }
}

// ---------- DAILY VIEW COUNTS (Quick Links — resets each day) ----------
const DAILY_VIEW_KEY = 'portal_daily_view_counts';
let dailyViewCounts = {};

function getTodayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function loadDailyViewCounts() {
    try {
        const raw = localStorage.getItem(DAILY_VIEW_KEY);
        const data = raw ? JSON.parse(raw) : null;
        if (data && data.date === getTodayStr()) {
            dailyViewCounts = data.counts || {};
        } else {
            dailyViewCounts = {};
            localStorage.setItem(DAILY_VIEW_KEY, JSON.stringify({ date: getTodayStr(), counts: {} }));
        }
    } catch(e) { dailyViewCounts = {}; }
}

function saveDailyViewCounts() {
    localStorage.setItem(DAILY_VIEW_KEY, JSON.stringify({ date: getTodayStr(), counts: dailyViewCounts }));
}

// ---------- MONTHLY VIEW COUNTS (Rankings — resets each month) ----------
const MONTHLY_VIEW_KEY = 'portal_monthly_view_counts';
let monthlyViewCounts = {};

function getMonthStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

function loadMonthlyViewCounts() {
    try {
        const raw = localStorage.getItem(MONTHLY_VIEW_KEY);
        const data = raw ? JSON.parse(raw) : null;
        if (data && data.month === getMonthStr()) {
            monthlyViewCounts = data.counts || {};
        } else {
            monthlyViewCounts = {};
            localStorage.setItem(MONTHLY_VIEW_KEY, JSON.stringify({ month: getMonthStr(), counts: {} }));
        }
    } catch(e) { monthlyViewCounts = {}; }
}

function saveMonthlyViewCounts() {
    localStorage.setItem(MONTHLY_VIEW_KEY, JSON.stringify({ month: getMonthStr(), counts: monthlyViewCounts }));
}

function incrementView(id) {
    viewCounts[id] = (viewCounts[id] || 0) + 1;
    localStorage.setItem(VIEW_KEY, JSON.stringify(viewCounts));
    setLastModified(VIEW_KEY);

    dailyViewCounts[id] = (dailyViewCounts[id] || 0) + 1;
    saveDailyViewCounts();

    monthlyViewCounts[id] = (monthlyViewCounts[id] || 0) + 1;
    saveMonthlyViewCounts();

    renderLeaderboard();
    renderQuickLinks();
    if (tlVisible) renderTopLinksPanel();
    window.savePortalData?.(VIEW_KEY, viewCounts);
}

const MEDALS = ['🥇', '🥈', '🥉'];

function renderLeaderboard() {
    const body = document.getElementById('leaderboardBody');
    if (!body) return;
    const total = MODULES.reduce((sum, m) => sum + (monthlyViewCounts[m.id] || 0), 0);
    const sorted = MODULES
        .map(m => ({ ...m, views: monthlyViewCounts[m.id] || 0 }))
        .sort((a, b) => b.views - a.views || a.name.localeCompare(b.name));

    body.innerHTML = sorted.map((m, i) => {
        const pct = total > 0 ? Math.round((m.views / total) * 100) : 0;
        const medal = i < 3 ? MEDALS[i] : String(i + 1);
        const topClass = i === 0 ? ' rank-first' : '';
        return `
            <tr class="lb-row${topClass}" style="--row-accent: var(${m.accent})">
                <td class="lb-rank">${medal}</td>
                <td class="lb-widget">
                    <span class="lb-icon"><i class="${m.icon}"></i></span>
                    <span class="lb-name">${m.name}</span>
                </td>
                <td class="lb-views">${m.views.toLocaleString()}</td>
                <td class="lb-bar-cell">
                    <div class="lb-bar-track">
                        <div class="lb-bar-fill" style="width:${pct}%"></div>
                    </div>
                    <span class="lb-pct">${pct}%</span>
                </td>
            </tr>`;
    }).join('');
}

const GOOGLE_G_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="google-g-icon" aria-hidden="true">
  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
</svg>`;

function renderQlIcon(ql) {
    if (ql.id === 'ql-google') return GOOGLE_G_SVG;
    return `<i class="${ql.icon}"></i>`;
}

function renderQuickLinks() {
    const grid = document.getElementById('quickLinksGrid');
    if (!grid) return;

    const sorted = [...QUICK_LINKS]
        .map(ql => ({ ...ql, views: dailyViewCounts[ql.id] || 0, totalViews: viewCounts[ql.id] || 0 }))
        .sort((a, b) => b.views - a.views || b.totalViews - a.totalViews || a.name.localeCompare(b.name));

    grid.innerHTML = sorted.map(ql => `
        <a href="${ql.url}" target="_blank" rel="noopener noreferrer"
           class="ql-widget" data-id="${ql.id}" style="--ql-accent: var(${ql.accent})">
            <div class="ql-icon">${renderQlIcon(ql)}</div>
            <div class="ql-name">${ql.name}</div>
            <div class="ql-views-count">${ql.views} today</div>
        </a>
    `).join('');

    // Add click handlers to new elements
    grid.querySelectorAll('.ql-widget').forEach(el => {
        el.addEventListener('click', () => {
            const id = el.getAttribute('data-id');
            if (id.startsWith('mod-')) markAsVisited(id);
            incrementView(id);
        });
    });
}

// ---------- CARD CLICK HANDLERS ----------
MODULES.forEach(({ id }) => {
    document.getElementById(id)?.addEventListener('click', () => {
        markAsVisited(id);
        incrementView(id);
    });
});

// ---------- WIPE / RESET ----------
const wipeBtn = document.getElementById('wipeAllBtn');
const wipeIcon = document.getElementById('wipeTrashIcon');
wipeBtn.addEventListener('click', () => {
    wipeIcon.classList.add('spin-wipe');
    localStorage.removeItem('portal_visited_launchpad');
    localStorage.removeItem(VIEW_KEY);
    setLastModified('portal_visited_launchpad');
    setLastModified(VIEW_KEY);
    visitedModules = [];
    viewCounts = {};
    dailyViewCounts = {};
    monthlyViewCounts = {};
    localStorage.setItem(DAILY_VIEW_KEY, JSON.stringify({ date: getTodayStr(), counts: {} }));
    localStorage.setItem(MONTHLY_VIEW_KEY, JSON.stringify({ month: getMonthStr(), counts: {} }));
    moduleIds.forEach(id => document.getElementById(id)?.classList.remove('visited'));
    renderLeaderboard();
    renderQuickLinks();
    window.savePortalData?.('portal_visited_launchpad', []);
    window.savePortalData?.(VIEW_KEY, {});
    setTimeout(() => wipeIcon.classList.remove('spin-wipe'), 450);
});

// ---------- RANKINGS TOGGLE ----------
const lbPanel       = document.getElementById('leaderboardPanel');
const lbToggleBtn   = document.getElementById('lbToggleBtn');
const lbCloseBtn    = document.getElementById('lbCloseBtn');
let lbVisible = localStorage.getItem('portal_lb_visible') === 'true';

function setLbVisible(show) {
    lbVisible = show;
    lbPanel.classList.toggle('lb-hidden', !show);
    lbToggleBtn.classList.toggle('lb-fab-active', show);
    lbToggleBtn.setAttribute('aria-expanded', String(show));
    lbPanel.setAttribute('aria-hidden', String(!show));
    localStorage.setItem('portal_lb_visible', String(show));
}

setLbVisible(lbVisible);
lbToggleBtn.addEventListener('click', () => setLbVisible(!lbVisible));
lbCloseBtn.addEventListener('click',  () => setLbVisible(false));

// ---------- TOP LINKS PANEL ----------
const TL_MEDALS = ['🥇', '🥈', '🥉', '4', '5'];

function renderTopLinksPanel() {
    const grid = document.getElementById('topLinksGrid');
    if (!grid) return;

    const top5 = [...QUICK_LINKS]
        .map(ql => ({ ...ql, views: dailyViewCounts[ql.id] || 0, totalViews: viewCounts[ql.id] || 0 }))
        .sort((a, b) => b.views - a.views || b.totalViews - a.totalViews || a.name.localeCompare(b.name))
        .slice(0, 5);

    grid.innerHTML = top5.map((ql, i) => `
        <a href="${ql.url}" target="_blank" rel="noopener noreferrer"
           class="tl-widget" data-id="${ql.id}" style="--tl-accent: var(${ql.accent})">
            <span class="tl-rank-badge">${TL_MEDALS[i]}</span>
            <div class="tl-icon"><i class="${ql.icon}"></i></div>
            <div class="tl-name">${ql.name}</div>
            <div class="tl-views">${ql.views} today</div>
        </a>
    `).join('');

    grid.querySelectorAll('.tl-widget').forEach(el => {
        el.addEventListener('click', () => {
            const id = el.getAttribute('data-id');
            if (id.startsWith('mod-')) markAsVisited(id);
            incrementView(id);
        });
    });
}

const tlPanel     = document.getElementById('topLinksPanel');
const topLinksBtn = document.getElementById('topLinksBtn');
const tlCloseBtn  = document.getElementById('tlCloseBtn');
let tlVisible = localStorage.getItem('portal_tl_visible') === 'true';

function setTlVisible(show) {
    tlVisible = show;
    tlPanel.classList.toggle('tl-hidden', !show);
    topLinksBtn.classList.toggle('tl-btn-active', show);
    topLinksBtn.setAttribute('aria-expanded', String(show));
    tlPanel.setAttribute('aria-hidden', String(!show));
    localStorage.setItem('portal_tl_visible', String(show));
    if (show) {
        renderTopLinksPanel();
        trapFocus(tlPanel);
        const firstFocusable = tlPanel.querySelector('button, a[href]');
        firstFocusable?.focus();
    } else {
        releaseFocus(tlPanel);
        topLinksBtn.focus();
    }
}

setTlVisible(tlVisible);
topLinksBtn.addEventListener('click', () => setTlVisible(!tlVisible));
tlCloseBtn.addEventListener('click',  () => setTlVisible(false));

// ---------- QUICK LINKS TOGGLE ----------
const qlPanel       = document.getElementById('quickLinksPanel');
const qlToggleBtn   = document.getElementById('qlToggleBtn');
const qlCloseBtn    = document.getElementById('qlCloseBtn');
let qlVisible = localStorage.getItem('portal_ql_visible') === 'true';

function setQlVisible(show) {
    qlVisible = show;
    qlPanel.classList.toggle('ql-hidden', !show);
    qlPanel.setAttribute('aria-hidden', String(!show));
    localStorage.setItem('portal_ql_visible', String(show));
    if (show) renderQuickLinks();
}

setQlVisible(qlVisible);
qlCloseBtn.addEventListener('click',  () => setQlVisible(false));

// ---------- DRAG AND DROP REORDERING ----------
const gridContainer = document.querySelector('.app-grid-centered');
const MODULE_ORDER_KEY = 'portal_module_order';

function updateModuleBadges() {
    const cards = [...gridContainer.querySelectorAll('.portal-card')];
    cards.forEach((card, index) => {
        const badge = card.querySelector('.card-key-badge');
        if (badge) badge.textContent = index + 1;
    });
}

function getPositionalShortcutMap() {
    const cards = [...gridContainer.querySelectorAll('.portal-card')];
    const map = {};
    cards.forEach((card, index) => {
        map[String(index + 1)] = card.id;
    });
    return map;
}

function saveModuleOrder() {
    const cards = [...gridContainer.querySelectorAll('.portal-card')];
    const order = cards.map(c => c.id);
    localStorage.setItem(MODULE_ORDER_KEY, JSON.stringify(order));
    setLastModified(MODULE_ORDER_KEY);
    window.savePortalData?.(MODULE_ORDER_KEY, order);
}

function loadModuleOrder() {
    const raw = localStorage.getItem(MODULE_ORDER_KEY);
    if (!raw) return;
    try {
        const order = JSON.parse(raw);
        if (!Array.isArray(order)) return;
        order.forEach(id => {
            const card = document.getElementById(id);
            if (card) gridContainer.appendChild(card);
        });
        updateModuleBadges();
    } catch (e) { console.error('Order load fail', e); }
}

function initDragAndDrop() {
    if (typeof Sortable === 'undefined') return;

    new Sortable(gridContainer, {
        animation: 350,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        dragClass: 'sortable-drag',
        onEnd: () => {
            updateModuleBadges();
            saveModuleOrder();
        },
        // Enable touch delay for mobile to distinguish from scroll
        delay: 150,
        delayOnTouchOnly: true,
        touchStartThreshold: 5
    });
}

function getDragAfterElement(container, x, y) {
    const draggableElements = [...container.querySelectorAll('.portal-card:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        // Since it's a grid, we consider both X and Y
        const centerX = box.left + box.width / 2;
        const centerY = box.top + box.height / 2;
        const offset = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));

        if (offset < closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.POSITIVE_INFINITY }).element;
}

// Initial call to load order
loadModuleOrder();
initDragAndDrop();

// ---------- COMMAND PALETTE (Ctrl+K) ----------
const cpOverlay = document.getElementById('cmdPalette');
const cpInput   = document.getElementById('cpInput');
const cpResults = document.getElementById('cpResults');
let cpVisible = false;
let cpSelectedIndex = 0;
let cpFilteredItems = [];

const COMMANDS = [
    { id: 'cmd-theme', name: 'Toggle Theme', desc: 'Switch between light and dark mode', icon: 'fa-solid fa-circle-half-stroke', type: 'Action', action: () => themeBtn.click() },
    { id: 'cmd-todo',  name: 'Add Todoist Task', desc: 'Type "todo: content" to add directly', icon: 'fa-solid fa-plus', type: 'Action', action: (val) => {
        const content = val.replace(/^todo:/i, '').trim();
        if (content) {
            const tdInput = document.getElementById('tdQuickAddInput');
            const tdForm = document.getElementById('tdQuickAddForm');
            if (tdInput && tdForm) {
                tdInput.value = content;
                tdForm.dispatchEvent(new Event('submit'));
            }
        } else {
            cpInput.value = 'todo: ';
            renderCPResults();
        }
    }},
    { id: 'cmd-wipe',  name: 'Reset Statistics', desc: 'Clear visit rankings and history', icon: 'fa-solid fa-broom', type: 'Danger', action: () => wipeBtn.click() },
    { id: 'cmd-kb',    name: 'Keyboard Shortcuts', desc: 'Show all available shortcuts', icon: 'fa-solid fa-keyboard', type: 'Action', action: () => setKbVisible(true) },
    { id: 'cmd-rank',  name: 'View Rankings', desc: 'Show module visit statistics', icon: 'fa-solid fa-trophy', type: 'Panel', action: () => setLbVisible(true) },
];

function getAllCPItems() {
    const items = [...COMMANDS];
    
    // Add Modules
    MODULES.forEach(m => {
        items.push({
            id: m.id,
            name: m.name,
            desc: `Launch ${m.name} module`,
            icon: m.icon,
            type: 'Module',
            action: () => {
                const card = document.getElementById(m.id);
                if (card) card.click();
            }
        });
    });

    // Add Quick Links
    QUICK_LINKS.forEach(ql => {
        items.push({
            id: ql.id,
            name: ql.name,
            desc: `Open ${ql.name} (${ql.url})`,
            icon: ql.icon,
            type: 'Link',
            action: () => {
                window.open(ql.url, '_blank', 'noopener,noreferrer');
                incrementView(ql.id);
            }
        });
    });

    return items;
}

function renderCPResults() {
    const val = cpInput.value.toLowerCase().trim();
    const all = getAllCPItems();
    
    if (val.startsWith('todo:')) {
        cpFilteredItems = [COMMANDS.find(c => c.id === 'cmd-todo')];
    } else {
        cpFilteredItems = all.filter(item => 
            item.name.toLowerCase().includes(val) || 
            item.desc.toLowerCase().includes(val) ||
            item.type.toLowerCase().includes(val)
        );
    }

    if (cpFilteredItems.length === 0) {
        cpResults.innerHTML = `<div class="td-empty" style="padding:2rem">No results found for "${val}"</div>`;
        return;
    }

    cpSelectedIndex = Math.min(cpSelectedIndex, cpFilteredItems.length - 1);
    if (cpSelectedIndex < 0) cpSelectedIndex = 0;

    cpResults.innerHTML = cpFilteredItems.map((item, i) => `
        <div class="cp-item ${i === cpSelectedIndex ? 'selected' : ''}" data-index="${i}"
             role="option" aria-selected="${i === cpSelectedIndex}">
            <div class="cp-item-icon" aria-hidden="true">
                ${item.id === 'ql-google' ? GOOGLE_G_SVG : `<i class="${item.icon}"></i>`}
            </div>
            <div class="cp-item-content">
                <span class="cp-item-name">${item.name}</span>
                <span class="cp-item-desc">${item.desc}</span>
            </div>
            <span class="cp-item-type">${item.type}</span>
        </div>
    `).join('');

    const selected = cpResults.querySelector('.selected');
    if (selected) selected.scrollIntoView({ block: 'nearest' });
}

function setCPVisible(show) {
    cpVisible = show;
    cpOverlay.classList.toggle('cp-hidden', !show);
    cpOverlay.setAttribute('aria-hidden', String(!show));
    if (show) {
        cpInput.value = '';
        cpSelectedIndex = 0;
        renderCPResults();
        setTimeout(() => cpInput.focus(), 50);
    }
}

cpInput.addEventListener('input', () => {
    cpSelectedIndex = 0;
    renderCPResults();
});

cpInput.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        cpSelectedIndex = (cpSelectedIndex + 1) % cpFilteredItems.length;
        renderCPResults();
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        cpSelectedIndex = (cpSelectedIndex - 1 + cpFilteredItems.length) % cpFilteredItems.length;
        renderCPResults();
    } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = cpFilteredItems[cpSelectedIndex];
        if (item) {
            item.action(cpInput.value);
            setCPVisible(false);
        }
    } else if (e.key === 'Escape') {
        setCPVisible(false);
    }
});

cpOverlay.addEventListener('click', (e) => {
    if (e.target === cpOverlay) setCPVisible(false);
});

cpResults.addEventListener('click', (e) => {
    const itemEl = e.target.closest('.cp-item');
    if (itemEl) {
        const index = parseInt(itemEl.dataset.index);
        const item = cpFilteredItems[index];
        if (item) {
            item.action(cpInput.value);
            setCPVisible(false);
        }
    }
});

document.addEventListener('keydown', e => {
    const isMac = /Mac|iPhone|iPod|iPad/.test(navigator.platform);
    // Shortcut: Alt+K for Windows/Linux, Cmd+J for macOS
    const isTrigger = isMac ? (e.metaKey && e.key.toLowerCase() === 'j') : (e.altKey && e.key.toLowerCase() === 'k');

    if (isTrigger) {
        e.preventDefault();
        setCPVisible(!cpVisible);
    }
});

// ---------- KEYBOARD SHORTCUTS ----------

const KEY_MODULE_MAP = { '1': 'mod-focus', '2': 'mod-hustler', '3': 'mod-nexus', '4': 'mod-sportage', '5': 'mod-titan' };

// Ctrl+/ — focus / blur the quick-add inbox field
document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        const input = document.getElementById('tdQuickAddInput');
        if (!input) return;
        if (document.activeElement === input) input.blur();
        else { input.focus(); input.select(); }
    }
});

document.addEventListener('keydown', e => {
    if (e.target.closest('input, textarea, select')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    // Use positional mapping if order has changed, otherwise fallback to default
    const currentMap = getPositionalShortcutMap();
    const modId = currentMap[e.key] || KEY_MODULE_MAP[e.key];
    
    if (modId) {
        const card = document.getElementById(modId);
        if (card) {
            markAsVisited(modId);
            incrementView(modId);
            window.open(card.href, '_blank', 'noopener,noreferrer');
        }
        return;
    }
    if (e.key.toLowerCase() === 'r') setLbVisible(!lbVisible);
    if (e.key.toLowerCase() === 'q') setQlVisible(!qlVisible);
    if (e.key.toLowerCase() === 'h') setTlVisible(!tlVisible);
    if (e.key === '/') setKbVisible(!kbVisible);
});


// ---------- MONTH CALENDAR POPUP ----------
const yearStatWidget = document.getElementById('yearStatWidget');
const monthCalPanel  = document.getElementById('monthCalPanel');
const monthCalClose  = document.getElementById('monthCalClose');
const monthCalGrid   = document.getElementById('monthCalGrid');
const monthCalTitle  = document.getElementById('monthCalTitle');
const monthCalFooter = document.getElementById('monthCalFooter');
let monthCalOpen = false;

function renderMonthCalendar() {
    const now   = new Date();
    const year  = now.getFullYear();
    const month = now.getMonth();
    const today = now.getDate();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDow    = new Date(year, month, 1).getDay(); // 0 = Sunday

    monthCalTitle.textContent  = now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    monthCalFooter.textContent = `${today} of ${daysInMonth} days complete`;

    let html = '';
    for (let i = 0; i < firstDow; i++) html += '<div class="mc-cell mc-blank"></div>';

    for (let d = 1; d <= daysInMonth; d++) {
        const dow     = new Date(year, month, d).getDay(); // 0=Sun, 6=Sat
        const isSun   = dow === 0;
        const isSat   = dow === 6;
        const isToday = d === today;
        const isPast  = d < today;

        let cls = 'mc-cell';
        if (isSun)   cls += ' mc-sun';
        if (isSat)   cls += ' mc-sat';
        if (isToday) cls += ' mc-today';
        else if (isPast) cls += ' mc-past';
        else cls += ' mc-future';

        html += `<div class="${cls}"><span>${d}</span></div>`;
    }
    monthCalGrid.innerHTML = html;
}

function positionMonthCal() {
    const rect = yearStatWidget.getBoundingClientRect();
    const W = 298, GAP = 10;
    let left = rect.left + rect.width / 2 - W / 2;
    left = Math.max(GAP, Math.min(left, window.innerWidth - W - GAP));
    let top = rect.bottom + GAP;
    if (top + 360 > window.innerHeight - GAP) top = Math.max(GAP, rect.top - 360 - GAP);
    monthCalPanel.style.left = left + 'px';
    monthCalPanel.style.top  = top  + 'px';
}

function setMonthCalOpen(open) {
    monthCalOpen = open;
    if (open) { renderMonthCalendar(); positionMonthCal(); }
    monthCalPanel.classList.toggle('month-cal-hidden', !open);
    monthCalPanel.setAttribute('aria-hidden', String(!open));
    yearStatWidget.classList.toggle('stat-widget-active', open);
    yearStatWidget.setAttribute('aria-expanded', String(open));
    if (open) {
        trapFocus(monthCalPanel);
        monthCalClose.focus();
    } else {
        releaseFocus(monthCalPanel);
        yearStatWidget.focus();
    }
}

yearStatWidget.addEventListener('click', () => setMonthCalOpen(!monthCalOpen));
yearStatWidget.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMonthCalOpen(!monthCalOpen); }
});
monthCalClose.addEventListener('click', (e) => { e.stopPropagation(); setMonthCalOpen(false); });
document.addEventListener('click', (e) => {
    if (monthCalOpen && !monthCalPanel.contains(e.target) && !yearStatWidget.contains(e.target))
        setMonthCalOpen(false);
});
window.addEventListener('resize', () => { if (monthCalOpen) positionMonthCal(); });

// ---------- KEYBOARD SHORTCUTS HELP ----------
const kbHelpBtn   = document.getElementById('kbHelpBtn');
const kbHelpPanel = document.getElementById('kbHelpPanel');
const kbCloseBtn  = document.getElementById('kbCloseBtn');
let kbVisible = false;

function setKbVisible(show) {
    kbVisible = show;
    kbHelpPanel.classList.toggle('kb-hidden', !show);
    kbHelpBtn.classList.toggle('kb-active', show);
    kbHelpBtn.setAttribute('aria-expanded', String(show));
    kbHelpPanel.setAttribute('aria-hidden', String(!show));
    if (show) {
        trapFocus(kbHelpPanel);
        kbCloseBtn.focus();
    } else {
        releaseFocus(kbHelpPanel);
        kbHelpBtn.focus();
    }
}

kbHelpBtn.addEventListener('click', () => setKbVisible(!kbVisible));
kbCloseBtn.addEventListener('click', () => setKbVisible(false));

// ---------- FOCUS HOURS WIDGET (9–12 AM + 1–2 PM, Mon–Fri) ----------
function calcFocusHours(weekOnly = false) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const today = now.getDate();
    
    // Determine the range of days to check
    let startDay, endDay;
    if (weekOnly) {
        // Current week (Sunday=0 to Saturday=6)
        const currentDow = now.getDay();
        const firstDayOfWeek = today - currentDow; // Sunday
        startDay = firstDayOfWeek;
        endDay = firstDayOfWeek + 6; // Saturday
    } else {
        startDay = 1;
        endDay = new Date(year, month + 1, 0).getDate();
    }

    const FOCUS_START  = 9;   // 9 AM
    const LUNCH_START  = 12;  // 12 PM
    const LUNCH_END    = 13;  // 1 PM
    const FOCUS_END    = 15;  // 3 PM
    const DAILY_NET    = 5;   // net focus hours per day (9-12 + 1-3)
    let totalWorkDays = 0;
    let remainingHours = 0;

    for (let d = startDay; d <= endDay; d++) {
        const dateObj = new Date(year, month, d);
        // Ensure we are within the same month if not weekOnly
        if (!weekOnly && dateObj.getMonth() !== month) continue;
        
        const dow = dateObj.getDay();
        if (dow === 0 || dow === 6) continue;
        totalWorkDays++;
        
        // If it's a future day (either in this month or in this week's window)
        if (d > today) {
            remainingHours += DAILY_NET;
        } else if (d === today) {
            const h = now.getHours() + now.getMinutes() / 60;
            let todayLeft = 0;
            if (h < FOCUS_START) {
                todayLeft = DAILY_NET;
            } else if (h < LUNCH_START) {
                todayLeft = (LUNCH_START - h) + (FOCUS_END - LUNCH_END);
            } else if (h < LUNCH_END) {
                todayLeft = FOCUS_END - LUNCH_END;
            } else if (h < FOCUS_END) {
                todayLeft = FOCUS_END - h;
            }
            remainingHours += Math.max(0, todayLeft);
        }
    }
    return { remaining: Math.round(remainingHours), total: totalWorkDays * DAILY_NET };
}

function updateFocusHoursWidget() {
    const remEl   = document.getElementById('focusHoursRemaining');
    const totalEl = document.getElementById('focusHoursTotal');
    const barEl   = document.getElementById('focusHoursBar');
    const captionEl = document.querySelector('.focus-hours-widget .fh-caption');
    if (!remEl) return;
    
    const isWeek = remEl.dataset.view === 'week';
    const fh = calcFocusHours(isWeek);
    
    remEl.textContent = fh.remaining;
    totalEl.textContent = fh.total;
    if (captionEl) {
        captionEl.textContent = isWeek ? 'focus hrs left · week' : 'focus hrs left · month';
    }

    if (barEl) {
        const elapsed = fh.total > 0 ? (fh.total - fh.remaining) / fh.total : 0;
        barEl.style.width = Math.round(elapsed * 100) + '%';
        const rem = 1 - elapsed;
        barEl.style.background = rem > 0.5
            ? 'linear-gradient(90deg,rgba(99,179,237,.85),rgba(59,130,246,.95))'
            : rem > 0.25
                ? 'linear-gradient(90deg,rgba(167,139,250,.85),rgba(139,92,246,.95))'
                : 'linear-gradient(90deg,rgba(248,113,113,.85),rgba(239,68,68,.95))';
    }
}

// ---------- REMAINING WORK HOURS WIDGET ----------
function calcRemainingWorkHours(weekOnly = false) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const today = now.getDate();

    let startDay, endDay;
    if (weekOnly) {
        const currentDow = now.getDay();
        const firstDayOfWeek = today - currentDow;
        startDay = firstDayOfWeek;
        endDay = firstDayOfWeek + 6;
    } else {
        startDay = 1;
        endDay = new Date(year, month + 1, 0).getDate();
    }

    const WORK_START = 9;   // 9 AM
    const WORK_END   = 17;  // 5 PM
    let totalWorkDays = 0;
    let remainingHours = 0;

    for (let d = startDay; d <= endDay; d++) {
        const dateObj = new Date(year, month, d);
        if (!weekOnly && dateObj.getMonth() !== month) continue;

        const dow = dateObj.getDay();
        if (dow === 0 || dow === 6) continue;
        totalWorkDays++;

        const checkDate = dateObj.getDate();
        if (checkDate > today || (weekOnly && d > today)) {
            remainingHours += 8;
        } else if (checkDate === today) {
            const currentHour = now.getHours() + now.getMinutes() / 60;
            remainingHours += Math.max(0, Math.min(WORK_END - Math.max(currentHour, WORK_START), 8));
        }
    }
    return { remaining: Math.round(remainingHours), total: totalWorkDays * 8 };
}

function updateWorkHoursWidget() {
    const remEl   = document.getElementById('workHoursRemaining');
    const totalEl = document.getElementById('workHoursTotal');
    const barEl   = document.getElementById('workHoursBar');
    const captionEl = document.querySelector('.work-hours-widget .wh-caption');
    if (!remEl) return;

    const isWeek = remEl.dataset.view === 'week';
    const wh = calcRemainingWorkHours(isWeek);

    remEl.textContent = wh.remaining;
    totalEl.textContent = wh.total;
    if (captionEl) {
        captionEl.textContent = isWeek ? 'work hrs left · week' : 'work hrs left · month';
    }

    if (barEl) {
        const elapsed = wh.total > 0 ? (wh.total - wh.remaining) / wh.total : 0;
        barEl.style.width = Math.round(elapsed * 100) + '%';
        const rem = 1 - elapsed;
        barEl.style.background = rem > 0.5
            ? 'linear-gradient(90deg,rgba(74,222,128,.85),rgba(34,197,94,.95))'
            : rem > 0.25
                ? 'linear-gradient(90deg,rgba(251,191,36,.85),rgba(245,158,11,.95))'
                : 'linear-gradient(90deg,rgba(248,113,113,.85),rgba(239,68,68,.95))';
    }
}

// Click to toggle remaining view (Month vs Week) in the widget
document.getElementById('focusHoursWidget')?.addEventListener('click', () => {
    const remEl = document.getElementById('focusHoursRemaining');
    if (!remEl) return;
    remEl.dataset.view = (remEl.dataset.view === 'week') ? 'month' : 'week';
    updateFocusHoursWidget();
});

document.getElementById('workHoursWidget')?.addEventListener('click', () => {
    const remEl = document.getElementById('workHoursRemaining');
    if (!remEl) return;
    remEl.dataset.view = (remEl.dataset.view === 'week') ? 'month' : 'week';
    updateWorkHoursWidget();
});

// ---------- INIT ----------
loadVisitedState();
loadViewCounts();
loadDailyViewCounts();
loadMonthlyViewCounts();
renderLeaderboard();
renderQuickLinks();
renderTopLinksPanel();
updateFocusHoursWidget();
updateWorkHoursWidget();

// Update CP shortcut label in help panel based on platform
const isMac = /Mac|iPhone|iPod|iPad/.test(navigator.platform);
const cpKeyLabel = document.getElementById('cpKeyPlatform');
const cpLetterLabel = document.getElementById('cpLetterPlatform');
if (cpKeyLabel) cpKeyLabel.textContent = isMac ? '⌘' : 'Alt';
if (cpLetterLabel) cpLetterLabel.textContent = isMac ? 'J' : 'K';

setInterval(() => { updateFocusHoursWidget(); updateWorkHoursWidget(); }, 60000);

window.addEventListener('storage', (e) => {
    if (e.key === 'portal_visited_launchpad') loadVisitedState();
    if (e.key === 'portal_user_theme') applyTheme(e.newValue === 'dark' ? 'dark' : 'light');
    if (e.key === VIEW_KEY) { 
        loadViewCounts(); 
        renderLeaderboard(); 
        renderQuickLinks(); 
    }
});

// ---------- REALTIME SYNC ----------
let _syncChannel = null;

function _getLocalValueForKey(key) {
    switch (key) {
        case 'portal_visited_launchpad': return visitedModules;
        case VIEW_KEY: return viewCounts;
        case MODULE_ORDER_KEY:
            try { return JSON.parse(localStorage.getItem(MODULE_ORDER_KEY)); } catch { return null; }
        default: return null;
    }
}

function applyCloudRow(key, value, cloudUpdatedAt) {
    // Last-write-wins: if local data was modified more recently, push local to cloud and skip
    if (cloudUpdatedAt) {
        const localLm  = getLastModified(key);
        const cloudLm  = new Date(cloudUpdatedAt).getTime();
        if (localLm > cloudLm) {
            const localVal = _getLocalValueForKey(key);
            if (localVal !== null) window.savePortalData?.(key, localVal);
            return;
        }
    }

    let parsed;
    try { parsed = JSON.parse(value); } catch { parsed = value; }

    if (key === 'portal_visited_launchpad' && Array.isArray(parsed)) {
        visitedModules = parsed;
        localStorage.setItem('portal_visited_launchpad', JSON.stringify(visitedModules));
        moduleIds.forEach(id => {
            document.getElementById(id)?.classList.toggle('visited', visitedModules.includes(id));
        });
    } else if (key === VIEW_KEY && parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        viewCounts = parsed;
        localStorage.setItem(VIEW_KEY, JSON.stringify(viewCounts));
        renderLeaderboard();
        renderQuickLinks();
        renderTopLinksPanel();
    }
}

// Called by supabase-auth.js once the user is authenticated — cloud data wins
window.onPortalSyncReady = async function() {
    const { data: { user } } = await window.supaAuth.auth.getUser();
    if (!user) return;

    const allData = await window.loadAllPortalData?.();
    if (allData) {
        const vl = allData['portal_visited_launchpad'];
        if (Array.isArray(vl?.value))
            applyCloudRow('portal_visited_launchpad', JSON.stringify(vl.value), vl.updatedAt);
        const vc = allData[VIEW_KEY];
        if (vc?.value && typeof vc.value === 'object' && !Array.isArray(vc.value))
            applyCloudRow(VIEW_KEY, JSON.stringify(vc.value), vc.updatedAt);
    }

    // Subscribe to real-time changes for this user's rows
    if (_syncChannel) { _syncChannel.unsubscribe(); _syncChannel = null; }
    _syncChannel = window.supaAuth
        .channel('portal-realtime')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'portal_data',
            filter: `user_id=eq.${user.id}`
        }, payload => {
            const row = payload.new;
            // row.value is raw JSON string from Postgres; row.updated_at is ISO timestamp
            if (row?.key) applyCloudRow(row.key, row.value, row.updated_at);
        })
        .subscribe();
};

window.onPortalSyncStop = function() {
    if (_syncChannel) { _syncChannel.unsubscribe(); _syncChannel = null; }
};
