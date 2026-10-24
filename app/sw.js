// Keeps the arcade page and every game, so the installed app plays offline (scores and 2-player
// games need the server). Network first: online you always get the latest game files; the saved
// copy is only used when the server can't be reached.
// server.py fills in the game list, so a new game in GAMES is saved without editing this file.
const GAMES = /*GAMES*/[];
const CACHE = "arcade-1";
const PAGES = ["/", ...GAMES.map((g) => `/${g}/`)];
const WAIT_MS = 6000;  // weak signal: give up on the server after this and use the saved copy

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll([...PAGES, "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"])));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Fetch every game again, so the offline copies stay as new as the last visit to the arcade page.
async function refreshGames(cache) {
  await Promise.all(GAMES.map((g) => fetch(`/${g}/`).then((r) => r.ok && cache.put(`/${g}/`, r)).catch(() => {})));
}

async function networkFirst(e, key) {
  const cache = await caches.open(CACHE);
  try {
    const r = await Promise.race([fetch(e.request),
      new Promise((_, no) => setTimeout(() => no(new Error("timed out")), WAIT_MS))]);
    if (r.ok) {
      await cache.put(key, r.clone());
      if (key === "/") e.waitUntil(refreshGames(cache));
    }
    return r;
  } catch (err) {
    const saved = await cache.match(key);
    if (saved) return saved;
    throw err;
  }
}

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  if (url.pathname.startsWith("/scores/") || url.pathname.startsWith("/ws/")) return;  // live only
  if (e.request.mode === "navigate") return e.respondWith(networkFirst(e, url.pathname));
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request)));
});
