// Simple Service Worker to enable PWA installation - v3
self.addEventListener('install', (event) => {
  self.skipWaiting();
});
self.addEventListener('fetch', (event) => {
  // Required for PWA installation
});
