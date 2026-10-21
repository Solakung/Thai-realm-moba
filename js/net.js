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

  /* ---------- ช่องทางออนไลน์ (WebSocket ไปยังตัวส่งต่อใน server/) ----------
     ส่งเฉพาะคำสั่ง รับหมายเลขจังหวะกลาง 'u' จากเซิร์ฟเวอร์ ส่วนเกมรันที่เครื่องเราเอง
     handlers: { open, joined, roster, start, u, desync, err, close } */
  let ws = null, hd = {}, known = 0;
  function wsUrl() { return TR.NET.url.replace(/^http/, 'ws').replace(/\/$/, ''); }
  TR.Online = {
    known: function () { return known; },
    isOpen: function () { return !!ws && ws.readyState === 1; },
    open: function (handlers, known0) {
      TR.Online.close(); hd = handlers; known = known0 || 0;
      let sock, dead = setTimeout(function () { if (ws === sock && sock.readyState !== 1) { try { sock.close(); } catch (e) { /* ไม่เป็นไร */ } } }, 90000);
      try { sock = ws = new WebSocket(wsUrl()); } catch (e) { clearTimeout(dead); if (hd.close) hd.close('connect'); return; }
      sock.onopen = function () { clearTimeout(dead); if (hd.open) hd.open(); };
      sock.onmessage = function (e) {
        let m; try { m = JSON.parse(e.data); } catch (x) { return; }
        if (!m || typeof m.t !== 'string') return;
        if (m.t === 'u' && typeof m.n === 'number') { if (hd.u) hd.u(m); known = m.n; return; }   // ส่งคำสั่งเข้าเกมก่อน แล้วค่อยขยับ known
        if (hd[m.t]) hd[m.t](m);
      };
      sock.onclose = function () { clearTimeout(dead); if (ws === sock) { ws = null; if (hd.close) hd.close('closed'); } };
      sock.onerror = function () { /* onclose จะตามมา */ };
    },
    send: function (o) { if (ws && ws.readyState === 1) { ws.send(JSON.stringify(o)); return true; } return false; },
    close: function () { const s = ws; ws = null; if (s) { try { s.close(); } catch (e) { /* ไม่เป็นไร */ } } }
  };
})(window);
