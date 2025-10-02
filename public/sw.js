// Minimal, no-fetch SW (won't change network behavior)
self.addEventListener('install', () => {
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});
// No fetch handler: we don't intercept requests at all.
