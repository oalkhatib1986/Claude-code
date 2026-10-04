// Minimal service worker for ATHL3TE. Its ONLY job is to make the app
// installable as a real home-screen app (a WebAPK) on Android, which launches
// with no browser bars — the bolted-tablet kiosk. It deliberately does NOT
// cache anything: caching would risk serving a stale build and fight the app's
// own self-update (version.txt check). Every request goes straight to the
// network; the empty fetch handler exists only to satisfy the install check.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => { /* network-only: browser default fetch */ });
