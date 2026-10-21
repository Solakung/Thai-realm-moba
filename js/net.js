/* ตั้งค่าและตัวช่วยเครือข่ายฝั่งเบราว์เซอร์ (ตัวส่งต่อคำสั่งออนไลน์จะมาเพิ่มในไฟล์นี้)
   url = ที่อยู่เซิร์ฟเวอร์ออนไลน์ (เว้นว่าง = ยังไม่เปิดออนไลน์) เช่น 'https://thai-realm-relay.onrender.com' */
(function (root) {
  'use strict';
  const TR = root.TR = root.TR || {};
  TR.NET = { url: 'https://thai-realm-moba.onrender.com', wakeEvery: 8 * 60 * 1000 };
  let lastWake = 0;
  TR.Net = {
    configured: function () { return !!TR.NET.url; },
    // ปลุกเซิร์ฟเวอร์ฟรีที่หลับอยู่ (ส่งแล้วไม่ต้องรอผล) เรียกตอนผู้เล่นเข้าหน้าปก/เมนู
    wake: function () {
      if (!TR.Net.configured() || Date.now() - lastWake < TR.NET.wakeEvery) return;
      lastWake = Date.now();
      try { fetch(TR.NET.url.replace(/\/$/, '') + '/ping', { mode: 'no-cors', cache: 'no-store' }).catch(function () { /* ไม่เป็นไร */ }); } catch (e) { /* ไม่เป็นไร */ }
    }
  };
})(window);
