const CACHE_NAME = 'angel-agent-v1';
// 需要快取的檔案列表
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  // 如果你有 icon 檔案，也要在這裡列出
];

// 安裝事件：快取核心檔案
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// 攔截請求事件：優先使用快取，若無則發送網路請求
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 如果快取中有該資源，則回傳快取
        if (response) {
          return response;
        }
        // 否則發送網路請求
        return fetch(event.request);
      }
    )
  );
});
