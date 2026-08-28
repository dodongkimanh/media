// Minimal service worker: enables PWA installability + an offline fallback page.
// Deliberately does NOT cache API/Supabase requests or app data — this app is
// realtime/dynamic, so only the static app shell (icons, offline page) is cached.
const CACHE = 'kimanh-shell-v1'
const SHELL_URLS = ['/offline.html', '/icons/icon-192.png', '/icons/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  // Only handle same-origin navigation requests; let everything else
  // (Supabase API/auth/realtime, Next.js data fetches, cross-origin) pass through.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/offline.html'))
    )
  }
})
