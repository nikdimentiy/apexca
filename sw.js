const CACHE = 'portal-shell-v2';

// Same-origin shell — cache on install, serve cache-first
const SHELL = [
  '/',
  '/index.html',
  '/styles.css',
  '/auth.css',
  '/app.js',
  '/todoist.js',
  '/supabase-auth.js',
  '/favicon/favicon.ico',
  '/favicon/favicon-32x32.png',
  '/favicon/favicon-16x16.png',
  '/favicon/apple-touch-icon.png',
  '/favicon/android-chrome-192x192.png',
  '/favicon/android-chrome-512x512.png',
  '/favicon/site.webmanifest',
];

// ── Install: pre-cache shell, activate immediately ─────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: wipe old caches, claim existing clients ──────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch ───────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Never intercept Supabase — auth and data must always be live
  if (url.hostname.endsWith('supabase.co')) return;

  // Non-GET requests pass through
  if (request.method !== 'GET') return;

  // CDN assets (fonts, FA icons, Supabase JS, SortableJS):
  // serve from cache if available, update in background
  if (url.hostname !== self.location.hostname) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Same-origin shell: cache-first, fall back to network
  event.respondWith(cacheFirst(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline and not in cache — return a minimal offline page
    return new Response(
      '<html><body style="font:1rem/2 monospace;padding:2rem;background:#050d07;color:#4ade80">' +
      '<h2>⌘ Command Portal</h2><p>You are offline. Please reconnect.</p></body></html>',
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}

async function staleWhileRevalidate(request) {
  const cache  = await caches.open(CACHE);
  const cached = await cache.match(request);

  const networkFetch = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => cached);

  return cached ?? networkFetch;
}
