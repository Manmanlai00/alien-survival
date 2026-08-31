/* 异星生存 PWA Service Worker：缓存优先策略，首次在线访问后离线可玩 */
const CACHE = 'alien-survival-v1'
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './lib/vue.global.prod.js',
  './src/assets/main.css',
  './src/main.js',
]

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(CORE))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return
  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit) return hit
      return fetch(e.request)
        .then((res) => {
          if (res.ok && new URL(e.request.url).origin === location.origin) {
            const cl = res.clone()
            caches.open(CACHE).then((c) => c.put(e.request, cl))
          }
          return res
        })
        .catch(() => caches.match('./index.html'))
    })
  )
})
