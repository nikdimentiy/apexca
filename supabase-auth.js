// ============================================================
//  Supabase Auth — Command Portal
//  ──────────────────────────────
//  SETUP:
//  1. Go to https://app.supabase.com → your project → Settings → API
//  2. Replace SUPABASE_URL and SUPABASE_ANON_KEY below
//  3. Run supabase-setup.sql in your Supabase SQL Editor
// ============================================================

const SUPABASE_URL      = 'https://adutpmnwxjnsxdxpfiux.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ELdWCy6zRapc0zmGZtXljQ_Eov3P7ks';

// Supabase JS v2 is loaded via CDN — exposes window.supabase
const _supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── DOM refs ─────────────────────────────────────────────────
const overlay    = document.getElementById('auth-overlay');
const loginForm  = document.getElementById('login-form');
const loginMsg   = document.getElementById('login-msg');
const userBar    = document.getElementById('user-bar');
const userNameEl = document.getElementById('user-display-name');


// ── Overlay open / close ──────────────────────────────────────
function openAuth() { overlay.classList.add('visible'); }
function closeAuth() { overlay.classList.remove('visible'); }

document.querySelector('.auth-close')?.addEventListener('click', closeAuth);
overlay.addEventListener('click', e => { if (e.target === overlay) closeAuth(); });


// Close on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeAuth();
});

// ── Message helpers ───────────────────────────────────────────
function setMsg(el, text, type = '') {
  el.textContent = text;
  el.className   = `auth-msg${type ? ' ' + type : ''}`;
}
function clearMessages() { setMsg(loginMsg, ''); }

// ── Loading state ─────────────────────────────────────────────
function setLoading(form, on) {
  const btn    = form.querySelector('.auth-submit');
  const text   = btn.querySelector('.submit-text');
  const loader = btn.querySelector('.submit-loader');
  btn.disabled  = on;
  text.hidden   = on;
  loader.hidden = !on;
}

// ── LOGIN ─────────────────────────────────────────────────────
loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) { setMsg(loginMsg, 'Fill in all fields.', 'error'); return; }

  setLoading(loginForm, true);
  clearMessages();

  const { data, error } = await _supa.auth.signInWithPassword({ email, password });

  setLoading(loginForm, false);
  if (error) { setMsg(loginMsg, error.message, 'error'); return; }

  setMsg(loginMsg, 'Access granted.', 'success');
  showUserBar(data.user);
  setTimeout(closeAuth, 900);
});

// ── SESSION INIT ──────────────────────────────────────────────
async function initAuth() {
  // Check existing session
  const { data: { session } } = await _supa.auth.getSession();
  if (session?.user) {
    showUserBar(session.user);
  } else {
    openAuth();
  }

  // React to future auth changes
  _supa.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      showUserBar(session.user);
    } else {
      window.onPortalSyncStop?.();
      userBar.classList.add('hidden');
      
      document.getElementById('app-content').style.display = 'none';
      openAuth();
    }
  });
}

// ── USER BAR ─────────────────────────────────────────────────
let userBarIdleTimer;
function resetUserBarIdle() {
  userBar?.classList.remove('idle');
  clearTimeout(userBarIdleTimer);
  userBarIdleTimer = setTimeout(() => {
    userBar?.classList.add('idle');
  }, 4000);
}

function showUserBar(user) {
  const name = user.user_metadata?.username || user.email?.split('@')[0] || 'user';
  if (userNameEl) userNameEl.textContent = name;
  userBar?.classList.remove('hidden');
  
  document.getElementById('app-content').style.display = '';
  window.onPortalSyncReady?.();

  // Start idle timer
  resetUserBarIdle();
  window.addEventListener('mousemove', resetUserBarIdle);
  window.addEventListener('keydown', resetUserBarIdle);
}

// ── AVATAR DROPDOWN ───────────────────────────────────────────
const userAvatarBtn = document.getElementById('user-avatar-btn');
const userDropdown  = document.getElementById('user-dropdown');

function closeDropdown() {
  if (userDropdown) userDropdown.hidden = true;
  userAvatarBtn?.classList.remove('active');
}

userAvatarBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  const isOpen = !userDropdown.hidden;
  if (isOpen) { closeDropdown(); } else {
    userDropdown.hidden = false;
    userAvatarBtn.classList.add('active');
  }
});

document.addEventListener('click', closeDropdown);

document.getElementById('logout-btn')?.addEventListener('click', async () => {
  closeDropdown();
  await _supa.auth.signOut();
  userBar?.classList.add('hidden');
  window.removeEventListener('mousemove', resetUserBarIdle);
  window.removeEventListener('keydown', resetUserBarIdle);
});

// ── CLOUD DATA API ────────────────────────────────────────────
// Save any JSON value by string key (per-user, synced to cloud)
async function savePortalData(key, value) {
  const { data: { user } } = await _supa.auth.getUser();
  if (!user) return { error: 'Not logged in.' };

  const { error } = await _supa.from('portal_data').upsert(
    { user_id: user.id, key, value: JSON.stringify(value), updated_at: new Date().toISOString() },
    { onConflict: 'user_id,key' }
  );
  return { error };
}

// Load a saved value by key (returns parsed value or null)
async function loadPortalData(key) {
  const { data: { user } } = await _supa.auth.getUser();
  if (!user) return null;

  const { data, error } = await _supa
    .from('portal_data')
    .select('value')
    .eq('user_id', user.id)
    .eq('key', key)
    .maybeSingle();

  if (error || !data) return null;
  try { return JSON.parse(data.value); } catch { return data.value; }
}

// Load all portal data for the logged-in user
async function loadAllPortalData() {
  const { data: { user } } = await _supa.auth.getUser();
  if (!user) return {};

  const { data, error } = await _supa
    .from('portal_data')
    .select('key, value')
    .eq('user_id', user.id);

  if (error || !data) return {};
  return Object.fromEntries(data.map(r => {
    try { return [r.key, JSON.parse(r.value)]; } catch { return [r.key, r.value]; }
  }));
}

// ── Expose to window (call from app.js as needed) ────────────
window.supaAuth        = _supa;
window.openAuth        = openAuth;
window.closeAuth       = closeAuth;
window.savePortalData  = savePortalData;
window.loadPortalData  = loadPortalData;
window.loadAllPortalData = loadAllPortalData;

// Boot
initAuth();
