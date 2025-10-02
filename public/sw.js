// Minimal, no-fetch SW (won't change network behavior)
self.addEventListener('install', (e) => {
  // activate immediately
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  // control existing pages
  e.waitUntil(self.clients.claim());
});
// No fetch handler: we don't intercept requests at all.
