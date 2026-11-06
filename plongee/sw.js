// Mode hors ligne : l'app est gardée en cache, la météo et les polices aussi.
const V = 'plongee-v3';
const SHELL = ['./', 'index.html', 'cloud.js', 'extras.js', 'supabase.js', 'manifest.webmanifest', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
const netFirst = async req => { const c = await caches.open(V);
  try { const r = await fetch(req); if (r.ok) c.put(req, r.clone()); return r; }
  catch { const m = await c.match(req, { ignoreSearch: req.mode === 'navigate' }); if (m) return m; if (req.mode === 'navigate') return c.match('index.html'); throw new Error('offline'); } };
const cacheFirst = async req => { const c = await caches.open(V); const m = await c.match(req); if (m) return m;
  const r = await fetch(req); if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; };
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.hostname.endsWith('supabase.co')) return;                       // données : gérées par l'app
  if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') { e.respondWith(cacheFirst(req)); return; }
  if (u.hostname === 'cdnjs.cloudflare.com') { e.respondWith(cacheFirst(req)); return; }   // bibliothèque de carte
  if (u.hostname === 'tile.openstreetmap.org') { e.respondWith(cacheFirst(req)); return; }   // fonds de carte : gardés pour le hors ligne
  if (u.hostname === 'api.open-meteo.com' || u.origin === location.origin) { e.respondWith(netFirst(req)); return; }
});
