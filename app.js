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
    } else {
        const endMonth = new Date(year, now.getMonth() + 1, 0, 23, 59, 59, 999);
        let msLeft = Math.max(0, endMonth - now);
        const h = Math.floor(msLeft / 3600000);
        document.getElementById('midnightCountdown').innerText =
            `${h}h remaining`;
    }

    document.getElementById('liveTimeFooter').innerText =
        now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
}

updateAllTimeMetrics();
setInterval(updateAllTimeMetrics, 1000);

// Countdown widget click handler to toggle between daily/monthly mode
const countdownWidget = document.querySelector('[id="midnightCountdown"]')?.parentElement?.parentElement;
if (countdownWidget) {
    countdownWidget.classList.add('stat-widget-clickable');
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
    { id: 'mod-focus',    name: 'FocusTrack',   icon: 'fa-solid fa-crosshairs', accent: '--accent-focus' },
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

function incrementView(id) {
    viewCounts[id] = (viewCounts[id] || 0) + 1;
    localStorage.setItem(VIEW_KEY, JSON.stringify(viewCounts));
    renderLeaderboard();
    renderQuickLinks();
    if (tlVisible) renderTopLinksPanel();
    window.savePortalData?.(VIEW_KEY, viewCounts);
}

const MEDALS = ['🥇', '🥈', '🥉'];

function renderLeaderboard() {
    const body = document.getElementById('leaderboardBody');
    if (!body) return;
    const total = MODULES.reduce((sum, m) => sum + (viewCounts[m.id] || 0), 0);
    const sorted = MODULES
        .map(m => ({ ...m, views: viewCounts[m.id] || 0 }))
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
        .map(ql => ({ ...ql, views: viewCounts[ql.id] || 0 }))
        .sort((a, b) => b.views - a.views || a.name.localeCompare(b.name));

    grid.innerHTML = sorted.map(ql => `
        <a href="${ql.url}" target="_blank" rel="noopener noreferrer"
           class="ql-widget" data-id="${ql.id}" style="--ql-accent: var(${ql.accent})">
            <div class="ql-icon">${renderQlIcon(ql)}</div>
            <div class="ql-name">${ql.name}</div>
            <div class="ql-views-count">${ql.views} visits</div>
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
    visitedModules = [];
    viewCounts = {};
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
        .map(ql => ({ ...ql, views: viewCounts[ql.id] || 0 }))
        .sort((a, b) => b.views - a.views || a.name.localeCompare(b.name))
        .slice(0, 5);

    grid.innerHTML = top5.map((ql, i) => `
        <a href="${ql.url}" target="_blank" rel="noopener noreferrer"
           class="tl-widget" data-id="${ql.id}" style="--tl-accent: var(${ql.accent})">
            <span class="tl-rank-badge">${TL_MEDALS[i]}</span>
            <div class="tl-icon"><i class="${ql.icon}"></i></div>
            <div class="tl-name">${ql.name}</div>
            <div class="tl-views">${ql.views} visits</div>
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
    localStorage.setItem('portal_tl_visible', String(show));
    if (show) renderTopLinksPanel();
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
    qlToggleBtn.classList.toggle('ql-fab-active', show);
    localStorage.setItem('portal_ql_visible', String(show));
    if (show) renderQuickLinks();
}

setQlVisible(qlVisible);
qlToggleBtn.addEventListener('click', () => {
    setQlVisible(!qlVisible);
    if (qlVisible && lbVisible) setLbVisible(false);
});
qlCloseBtn.addEventListener('click',  () => setQlVisible(false));

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

    const modId = KEY_MODULE_MAP[e.key];
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
    yearStatWidget.classList.toggle('stat-widget-active', open);
}

yearStatWidget.addEventListener('click', () => setMonthCalOpen(!monthCalOpen));
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
}

kbHelpBtn.addEventListener('click', () => setKbVisible(!kbVisible));
kbCloseBtn.addEventListener('click', () => setKbVisible(false));

// ---------- INIT ----------
loadVisitedState();
loadViewCounts();
renderLeaderboard();
renderQuickLinks();
renderTopLinksPanel();

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

function applyCloudRow(key, value) {
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
        if (Array.isArray(allData['portal_visited_launchpad']))
            applyCloudRow('portal_visited_launchpad', JSON.stringify(allData['portal_visited_launchpad']));
        if (allData[VIEW_KEY])
            applyCloudRow(VIEW_KEY, JSON.stringify(allData[VIEW_KEY]));
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
            if (row?.key) applyCloudRow(row.key, row.value);
        })
        .subscribe();
};

window.onPortalSyncStop = function() {
    if (_syncChannel) { _syncChannel.unsubscribe(); _syncChannel = null; }
};
