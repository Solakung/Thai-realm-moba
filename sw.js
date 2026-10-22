/* Thai Realm — service worker: ให้ติดตั้งเป็นแอปได้ + เปิดออฟไลน์ได้ (โหมดเดี่ยว)
   ใช้ network-first: ออนไลน์จะได้ไฟล์ล่าสุดเสมอ (อัปเดตเกมไม่ต้องแก้ไฟล์นี้) ออฟไลน์ค่อยใช้ที่เก็บไว้ */
'use strict';
const CACHE = 'thai-realm-v1';
self.addEventListener('install', function (e) { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return;   // ออนไลน์ (WebSocket/โดเมนอื่น) ไม่ยุ่ง
  e.respondWith(fetch(r).then(function (res) {
    if (res && res.ok) { const cp = res.clone(); caches.open(CACHE).then(function (c) { c.put(r, cp); }); }
    return res;
  }).catch(function () { return caches.match(r).then(function (m) { return m || caches.match('./index.html'); }); }));
});
