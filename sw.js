// BrahmaMode SW v3 — Cache-first + Offline Queue Sync
const CACHE_NAME = 'brahmamode-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Rajdhani:wght@300;400;500;600;700&display=swap',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// ── INSTALL: cache everything ─────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

// ── ACTIVATE: remove old caches ──────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── FETCH: cache-first for app shell, skip Supabase ──────────
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = e.request.url;

  // Never intercept Supabase — always real network
  if (url.includes('supabase.co') || url.includes('supabase.io')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      // Return cache immediately (app loads offline instantly)
      if (cached) {
        // Update cache in background silently
        fetch(e.request).then(res => {
          if (res && res.status === 200) {
            caches.open(CACHE_NAME).then(c => c.put(e.request, res));
          }
        }).catch(() => {});
        return cached;
      }
      // Not in cache — try network
      return fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => {
        // Total failure — return index.html for navigation requests
        if (e.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// ── BACKGROUND SYNC: tell page to flush offline queue ────────
self.addEventListener('sync', e => {
  if (e.tag === 'bm-sync-checkins') {
    e.waitUntil(
      self.clients.matchAll({ type: 'window' }).then(clients =>
        clients.forEach(c => c.postMessage({ type: 'FLUSH_OFFLINE_QUEUE' }))
      )
    );
  }
});
