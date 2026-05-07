// ── Todoist Today Widget ──────────────────────────────────────
// Calls the Supabase Edge Function "todoist-today" which holds
// the TODOIST_TOKEN secret server-side. The frontend only ever
// touches its own Supabase project.

// Priority → accent colour (matches Todoist's own colour scheme)
const TD_PRIORITY = {
    4: { color: '#db4035' },   // P1 urgent  — red
    3: { color: '#ff9933' },   // P2 high    — orange
    2: { color: '#4073ff' },   // P3 medium  — blue
    1: { color: '#8b8b8b' },   // P4 normal  — grey
};

// ── State ────────────────────────────────────────────────────
let tdVisible    = localStorage.getItem('portal_td_visible') === 'true';
let tdTasks      = [];
let tdCompleted  = new Set();   // ids completed in this session
let tdAutoTimer  = null;

// ── DOM refs ─────────────────────────────────────────────────
const tdPanel      = document.getElementById('todoistPanel');
const tdToggleBtn  = document.getElementById('tdToggleBtn');
const tdCloseBtn   = document.getElementById('tdCloseBtn');
const tdRefreshBtn = document.getElementById('tdRefreshBtn');
const tdTaskList   = document.getElementById('tdTaskList');
const tdLoading    = document.getElementById('tdLoading');
const tdError      = document.getElementById('tdError');
const tdProgress   = document.getElementById('tdProgress');
const tdCountBadge = document.getElementById('tdCountBadge');

// ── Network helpers ──────────────────────────────────────────
async function tdRequest(body) {
    const { data, error } = await window.supaAuth.functions.invoke('todoist-today', { body });
    if (error) {
        // functions.invoke wraps HTTP errors — extract the real message from the response body
        let msg = error.message;
        try { const detail = await error.context?.json(); if (detail?.error) msg = detail.error; } catch {}
        throw new Error(msg);
    }
    return data;
}

// ── Due-date helpers ─────────────────────────────────────────
// Today in the user's local timezone (YYYY-MM-DD). Todoist stores
// due.date in the user's local timezone, so comparisons must too —
// a UTC-based "today" silently wraps for users west of UTC after
// the server day has rolled over.
function localTodayStr() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function formatDue(due) {
    if (!due?.date) return null;
    const todayStr = localTodayStr();
    const dueDateStr = due.date.slice(0, 10);
    if (dueDateStr < todayStr) return { text: 'Overdue', overdue: true };
    // Sync API encodes time directly in due.date as a full ISO string (length > 10)
    if (due.date.length > 10) {
        return {
            text: new Date(due.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            overdue: false,
        };
    }
    return null;
}

// ── HTML escape ───────────────────────────────────────────────
function esc(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// ── Render task list ─────────────────────────────────────────
function renderTasks() {
    const pending   = tdTasks.filter(t => !tdCompleted.has(t.id));
    const completed = tdTasks.filter(t =>  tdCompleted.has(t.id));
    const total     = tdTasks.length;
    const doneCount = completed.length;

    // Progress label
    tdProgress.textContent = total > 0 ? `${doneCount} / ${total}` : '';

    // FAB badge: shows number of pending tasks
    if (pending.length > 0) {
        tdCountBadge.textContent = pending.length;
        tdCountBadge.hidden = false;
    } else {
        tdCountBadge.hidden = true;
    }

    // Empty state
    if (total === 0) {
        tdTaskList.innerHTML = `
            <div class="td-empty">
                <i class="fa-solid fa-circle-check"></i>
                <span>All clear for today!</span>
            </div>`;
        return;
    }

    // Sort pending by priority descending, then append completed
    const sortedPending   = [...pending].sort((a, b) => b.priority - a.priority);
    const sortedCompleted = [...completed].sort((a, b) => b.priority - a.priority);

    function taskHTML(task) {
        const p    = TD_PRIORITY[task.priority] || TD_PRIORITY[1];
        const done = tdCompleted.has(task.id);
        const due  = formatDue(task.due);
        return `
            <div class="td-task ${done ? 'td-task-done' : ''}"
                 data-id="${esc(task.id)}"
                 style="--td-p: ${p.color}">
                <button class="td-checkbox" title="${done ? 'Mark incomplete' : 'Mark complete'}">
                    <i class="${done ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle'}"></i>
                </button>
                <div class="td-task-body">
                    <span class="td-task-content">${esc(task.content)}</span>
                    ${due ? `<span class="td-task-due${due.overdue ? ' td-overdue' : ''}">${due.text}</span>` : ''}
                </div>
                <a href="${esc(task.url)}" target="_blank" rel="noopener noreferrer"
                   class="td-open-link" title="Open in Todoist">
                    <i class="fa-solid fa-arrow-up-right-from-square"></i>
                </a>
            </div>`;
    }

    let html = sortedPending.map(taskHTML).join('');

    if (sortedCompleted.length > 0) {
        html += `<div class="td-divider">Completed</div>`;
        html += sortedCompleted.map(taskHTML).join('');
    }

    tdTaskList.innerHTML = html;

    // Attach checkbox handlers
    tdTaskList.querySelectorAll('.td-checkbox').forEach(btn => {
        btn.addEventListener('click', () => {
            const taskEl = btn.closest('.td-task');
            toggleTask(taskEl.dataset.id, taskEl);
        });
    });
}

// ── Toggle task complete / reopen ────────────────────────────
async function toggleTask(id, taskEl) {
    const completing = !tdCompleted.has(id);

    if (completing) {
        tdCompleted.add(id);
        taskEl.classList.add('td-task-completing');
        setTimeout(renderTasks, 430);
    } else {
        tdCompleted.delete(id);
        renderTasks();
    }

    try {
        await tdRequest({ task_id: id, action: completing ? 'close' : 'reopen' });
    } catch (err) {
        // Revert optimistic update
        if (completing) tdCompleted.delete(id);
        else tdCompleted.add(id);
        renderTasks();
        console.error('Todoist toggle error:', err);
    }
}

// ── Fetch from Edge Function ─────────────────────────────────
async function loadTodayTasks() {
    tdError.hidden = true;
    tdRefreshBtn.disabled = true;
    // Show shimmer only when the list is empty (first open); silent on auto-refresh
    if (tdTasks.length === 0) tdLoading.hidden = false;

    try {
        const { tasks } = await tdRequest({ action: 'fetch', client_today: localTodayStr() });
        tdTasks = tasks ?? [];
        tdCompleted.clear();
        renderTasks();
    } catch (err) {
        tdError.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${esc(err.message)}`;
        tdError.hidden    = false;
        tdCountBadge.hidden = true;
    } finally {
        tdLoading.hidden      = true;
        tdRefreshBtn.disabled = false;
    }
}

// ── Show / hide panel ────────────────────────────────────────
function setTdVisible(show) {
    tdVisible = show;
    tdPanel.classList.toggle('td-hidden', !show);
    tdToggleBtn.classList.toggle('td-fab-active', show);
    localStorage.setItem('portal_td_visible', String(show));

    if (show) {
        window.supaAuth.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                loadTodayTasks();
                clearInterval(tdAutoTimer);
                tdAutoTimer = setInterval(loadTodayTasks, 5 * 60 * 1000);
            }
        });
    } else {
        clearInterval(tdAutoTimer);
        tdAutoTimer = null;
    }
}

// ── Wire up controls ─────────────────────────────────────────
setTdVisible(tdVisible);
tdToggleBtn.addEventListener('click', () => setTdVisible(!tdVisible));
tdCloseBtn.addEventListener('click',  () => setTdVisible(false));
tdRefreshBtn.addEventListener('click', loadTodayTasks);

// Keyboard shortcut: T
document.addEventListener('keydown', e => {
    if (e.target.closest('input, textarea, select')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key.toLowerCase() === 't') setTdVisible(!tdVisible);
});

// ── Footer Quick-Add ─────────────────────────────────────────
const tdQuickAddForm  = document.getElementById('tdQuickAddForm');
const tdQuickAddInput = document.getElementById('tdQuickAddInput');

tdQuickAddForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = tdQuickAddInput.value.trim();
    if (!content) return;

    const { data: { session } } = await window.supaAuth.auth.getSession();
    if (!session) return;

    const form = tdQuickAddForm;
    tdQuickAddInput.disabled = true;
    form.querySelector('.td-qa-btn').disabled = true;

    try {
        await tdRequest({ action: 'add', content });
        tdQuickAddInput.value = '';
        tdQuickAddInput.placeholder = '✓ added to inbox';
        form.classList.add('td-qa-success');
        setTimeout(() => {
            form.classList.remove('td-qa-success');
            tdQuickAddInput.placeholder = 'quick add to inbox…';
        }, 1800);
    } catch (err) {
        console.error('Todoist quick-add error:', err);
        tdQuickAddInput.placeholder = '⚠ failed, try again';
        form.classList.add('td-qa-error');
        setTimeout(() => {
            form.classList.remove('td-qa-error');
            tdQuickAddInput.placeholder = 'quick add to inbox…';
        }, 2200);
    } finally {
        tdQuickAddInput.disabled = false;
        form.querySelector('.td-qa-btn').disabled = false;
        tdQuickAddInput.focus();
    }
});

// ── Auth sync ────────────────────────────────────────────────
// Load tasks when the user's session is confirmed (handles
// both page reload with existing session and fresh login).
window.supaAuth.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN'  && tdVisible) loadTodayTasks();
    if (event === 'SIGNED_OUT') {
        tdTasks = [];
        tdCompleted.clear();
        clearInterval(tdAutoTimer);
        tdAutoTimer = null;
        tdTaskList.innerHTML = '';
        tdCountBadge.hidden = true;
    }
});
