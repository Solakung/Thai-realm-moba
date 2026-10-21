/* Thai Realm — เอฟเฟกต์สกิลของฮีโร่ทั้ง 12 (เฉพาะส่วนภาพ ไม่กระทบกติกาเกม)
   sim.js ใส่รายการเอฟเฟกต์ลง g.fx เฉพาะในเบราว์เซอร์ (vfx()) แล้ว render.js เรียกไฟล์นี้วาดทีละรายการ
   ชนิดรายการ: sk = ตอนกดสกิล · imp = ตอนโดนเป้า · muz = ปากกระบอก/ปล่อยลูกศร · boom = ระเบิดพื้นที่ · dash = พุ่ง · bolt = ฟ้าผ่า · aura = ออร่าติดตัว · link = โซ่ผูก · throw = โยนของ
   คีย์เอฟเฟกต์ของสกิลคือ 'ไอดีฮีโร่:ลำดับสกิล(0-2)' ถ้าไม่มีสไตล์เฉพาะจะใช้ของพื้นฐานตามฮีโร่ */
(function (G) {
  'use strict';
  const TR = G.TR, TAU = Math.PI * 2;
  let H = null;   // ตัวช่วยจาก render.js: GT, UP, spawn
  const clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  const ease = function (k) { return k * k * (3 - 2 * k); };
  const hex = function (c) { return c.length === 7 ? c : '#ffffff'; };

  /* ---------- ชุดวาดพื้นฐาน (หน่วยโลก; ใช้กับ GT = พื้น, UP = ตั้งตรง) ---------- */
  function glow(c, x, y, r, col, a) { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, hex(col)); g.addColorStop(1, hex(col) + '00'); c.globalAlpha = a; c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.globalAlpha = 1; }
  function streak(c, x1, y1, x2, y2, w, col, a) {
    c.lineCap = 'round'; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2);
    c.globalAlpha = a * 0.5; c.strokeStyle = col; c.lineWidth = w * 2.4; c.stroke();
    c.globalAlpha = a; c.strokeStyle = '#ffffff'; c.lineWidth = w * 0.6; c.stroke(); c.globalAlpha = 1;
  }
  function ringS(c, x, y, r, col, w, a) { c.globalAlpha = clamp(a, 0, 1); c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.arc(x, y, Math.max(0.1, r), 0, TAU); c.stroke(); c.globalAlpha = 1; }
  function disc(c, x, y, r, col, a) { c.globalAlpha = clamp(a, 0, 1); c.fillStyle = col; c.beginPath(); c.arc(x, y, Math.max(0.1, r), 0, TAU); c.fill(); c.globalAlpha = 1; }
  function star(c, x, y, r, n, col, a, rot, inner) {
    c.globalAlpha = clamp(a, 0, 1); c.fillStyle = col; c.beginPath();
    for (let i = 0; i < n * 2; i++) { const an = rot + i * Math.PI / n, rr = i % 2 ? r * (inner || 0.38) : r; c[i ? 'lineTo' : 'moveTo'](x + Math.cos(an) * rr, y + Math.sin(an) * rr); }
    c.closePath(); c.fill(); c.globalAlpha = 1;
  }
  function rays(c, x, y, r1, r2, n, col, rot, a, w) {
    c.globalAlpha = clamp(a, 0, 1); c.strokeStyle = col; c.lineWidth = w || 1; c.lineCap = 'round'; c.beginPath();
    for (let i = 0; i < n; i++) { const an = rot + i / n * TAU; c.moveTo(x + Math.cos(an) * r1, y + Math.sin(an) * r1); c.lineTo(x + Math.cos(an) * r2, y + Math.sin(an) * r2); }
    c.stroke(); c.globalAlpha = 1;
  }
  function crescent(c, x, y, ang, r, span, th, col, a) {   // รอยฟัน/คลื่นเสียงรูปจันทร์เสี้ยว
    c.globalAlpha = clamp(a, 0, 1); c.fillStyle = col; c.beginPath();
    c.arc(x, y, r, ang - span / 2, ang + span / 2);
    c.arc(x - Math.cos(ang) * th * 0.7, y - Math.sin(ang) * th * 0.7, r - th * 0.15, ang + span / 2, ang - span / 2, true);
    c.closePath(); c.fill(); c.globalAlpha = 1;
  }
  function jag(c, x1, y1, x2, y2, col, w, a, seed, amp) {   // ฟ้าผ่า
    const n = 7, dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
    c.lineJoin = 'round'; c.lineCap = 'round';
    for (let pass = 0; pass < 2; pass++) {
      c.beginPath(); c.moveTo(x1, y1);
      for (let i = 1; i < n; i++) { const t = i / n, o = Math.sin(seed * 12.9898 + i * 78.233) * (amp || 5) * (1 - Math.abs(t - 0.5) * 1.2); c.lineTo(x1 + dx * t + nx * o, y1 + dy * t + ny * o); }
      c.lineTo(x2, y2);
      c.globalAlpha = a * (pass ? 1 : 0.5); c.strokeStyle = pass ? '#ffffff' : col; c.lineWidth = pass ? w * 0.5 : w * 2; c.stroke();
    }
    c.globalAlpha = 1;
  }
  function glyph(c, x, y, r, rot, col, a, pts) {   // วงเวทมนตร์
    c.globalAlpha = clamp(a, 0, 1); c.strokeStyle = col; c.lineWidth = Math.max(0.8, r * 0.035);
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke();
    c.beginPath(); c.arc(x, y, r * 0.82, 0, TAU); c.stroke();
    const n = pts || 6; c.beginPath();
    for (let i = 0; i <= n; i++) { const an = rot + (i * 2 % n) / n * TAU; c[i ? 'lineTo' : 'moveTo'](x + Math.cos(an) * r * 0.82, y + Math.sin(an) * r * 0.82); }
    c.stroke();
    c.setLineDash([r * 0.05, r * 0.12]); c.lineDashOffset = -rot * r; c.beginPath(); c.arc(x, y, r * 0.58, 0, TAU); c.stroke(); c.setLineDash([]);
    c.globalAlpha = 1;
  }
  const sp = function (x, y, vx, vy, life, size, col, kind) { if (H) H.spawn(x, y, vx, vy, life, size, col, kind); };
  function puffs(x, y, n, col, spd, life, size, up) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = spd * (0.3 + Math.random() * 0.8); sp(x, y, Math.cos(a) * v, Math.sin(a) * v * 0.6 - (up || 0), life * (0.6 + Math.random() * 0.6), size * (0.7 + Math.random() * 0.7), col, 'dust'); } }
  function dots(x, y, n, col, spd, life, size, up) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = spd * (0.3 + Math.random() * 0.9); sp(x, y, Math.cos(a) * v, Math.sin(a) * v - (up || 0), life * (0.6 + Math.random() * 0.6), size * (0.6 + Math.random() * 0.8), col, 'dot'); } }
  const once = function (f, fn) { if (!f._o) { f._o = true; fn(); } };
  const ang = function (f) { return Math.atan2(f.dy || 0, f.dx || 1); };
  const side = function (f) { return (f.dx || 0) >= 0 ? 0 : Math.PI; };

  /* ---------- ท่าตอนกดสกิล (sk) แยกตามชนิด ---------- */
  const CAST = {
    parry: function (c, f, k) {
      H.GT(c); ringS(c, f.x, f.y, 18 + 14 * ease(k), '#ffd54f', 1.6, 1 - k);
      H.UP(c, f.y); c.globalCompositeOperation = 'lighter';
      crescent(c, f.x + Math.cos(side(f)) * 9, f.y - 12, side(f), 15, 2.2, 7, '#ffe082', (1 - k) * 0.95);
      glow(c, f.x + Math.cos(side(f)) * 12, f.y - 12, 12, '#fff3c4', (1 - k) * 0.8);
      once(f, function () { dots(f.x, f.y - 12, 8, '#ffe082', 40, 0.4, 1.6, 6); });
    },
    flare: function (c, f, k, c1, c2) {
      H.GT(c); ringS(c, f.x, f.y, 10 + 16 * ease(k), c1, 1.4, 1 - k);
      H.UP(c, f.y); c.globalCompositeOperation = 'lighter';
      glow(c, f.x, f.y - 10, 18 * (1 - k * 0.4), c1, (1 - k) * 0.8); rays(c, f.x, f.y - 10, 6, 14 + 12 * k, 8, c2 || '#ffffff', k * 2, (1 - k) * 0.9, 1.2);
    },
    rage: function (c, f, k) {
      H.GT(c); c.globalCompositeOperation = 'lighter';
      glyph(c, f.x, f.y, 24 + 6 * k, k * 4, '#ff5252', 1 - k * 0.7, 6); ringS(c, f.x, f.y, 12 + 30 * ease(k), '#ff8a80', 2, 1 - k);
      H.UP(c, f.y); glow(c, f.x, f.y - 10, 22, '#ff1744', (1 - k) * 0.55);
      once(f, function () { dots(f.x, f.y - 6, 18, '#ff5252', 50, 0.8, 1.8, 28); });
    },
    dust: function (c, f, k) {
      H.GT(c); ringS(c, f.x, f.y, 8 + 22 * ease(k), '#c8b79a', 2, (1 - k) * 0.8);
      once(f, function () { puffs(f.x, f.y - 2, 9, '#bfae92', 34, 0.6, 3, 4); });
    },
    fan: function (c, f, k) {   // ฝนศรป่า: เส้นลมแฉกออกด้านหน้า
      H.GT(c); c.globalCompositeOperation = 'lighter'; const a0 = ang(f);
      for (let i = -3; i <= 3; i++) { const a = a0 + i * 0.13, r1 = 14, r2 = 14 + 70 * ease(k); streak(c, f.x + Math.cos(a) * r1, f.y + Math.sin(a) * r1, f.x + Math.cos(a) * r2, f.y + Math.sin(a) * r2, 1, '#c8e6c9', (1 - k) * 0.8); }
      ringS(c, f.x, f.y, 10 + 16 * k, '#a5d6a7', 1.2, 1 - k);
    },
    leaves: function (c, f, k) {
      H.GT(c); ringS(c, f.x, f.y, 8 + 18 * ease(k), '#a5d6a7', 1.4, 1 - k);
      once(f, function () { for (let i = 0; i < 6; i++) sp(f.x + (Math.random() - 0.5) * 14, f.y - 4, (Math.random() - 0.5) * 16, -22 - Math.random() * 14, 0.9, 1.7, '#81c784', 'plus'); });
    },
    purge: function (c, f, k) {
      const r = (f.r || 110) * ease(k); H.GT(c); c.globalCompositeOperation = 'lighter';
      glow(c, f.x, f.y, r, '#c8facc', (1 - k) * 0.25); ringS(c, f.x, f.y, r, '#e8f5e9', 3.2 * (1 - k) + 0.6, 1 - k * 0.6); ringS(c, f.x, f.y, r * 0.7, '#a5d6a7', 1.6, (1 - k) * 0.8);
      once(f, function () { for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; sp(f.x + Math.cos(a) * 30, f.y + Math.sin(a) * 18, Math.cos(a) * 20, Math.sin(a) * 10 - 18, 0.9, 1.7, '#c8e6c9', 'plus'); } });
    },
    dome: function (c, f, k) {   // ตั้งเกราะ: คลื่นเกราะทองน้ำตาล
      H.GT(c); c.globalCompositeOperation = 'lighter'; ringS(c, f.x, f.y, 10 + 20 * ease(k), '#ffcc80', 2.4, 1 - k);
      once(f, function () { puffs(f.x, f.y - 2, 6, '#a1887f', 24, 0.5, 2.6, 4); });
    },
    quake: function (c, f, k) {   // ช้างศึกคลั่ง: คลื่นกระแทก รอยแตกร้าว
      const r = (f.r || 100) * ease(Math.min(1, k * 1.6)); H.GT(c);
      c.fillStyle = '#3e2723'; c.globalAlpha = (1 - k) * 0.45; c.beginPath(); c.arc(f.x, f.y, r * 0.7, 0, TAU); c.fill(); c.globalAlpha = 1;
      c.strokeStyle = '#1b0f0a'; c.lineWidth = 1.4; c.globalAlpha = 1 - k * 0.8;
      for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + 0.3; c.beginPath(); c.moveTo(f.x, f.y); let x = f.x, y = f.y; for (let j = 1; j <= 4; j++) { const rr = r * j / 4, aa = a + Math.sin(i * 7 + j * 3) * 0.12; x = f.x + Math.cos(aa) * rr; y = f.y + Math.sin(aa) * rr; c.lineTo(x, y); } c.stroke(); }
      c.globalAlpha = 1; c.globalCompositeOperation = 'lighter'; ringS(c, f.x, f.y, r, '#ffd54f', 3.4 * (1 - k) + 0.8, 1 - k); ringS(c, f.x, f.y, r * 0.8, '#ffffff', 1.4, (1 - k) * 0.8);
      once(f, function () { puffs(f.x, f.y - 2, 22, '#a89478', 60, 0.9, 4, 10); for (let i = 0; i < 10; i++) { const a = Math.random() * TAU; sp(f.x + Math.cos(a) * 14, f.y - 2, Math.cos(a) * 50, -50 - Math.random() * 40, 0.8, 2.2, '#6d4c41', 'dot'); } });
    },
    glyph: function (c, f, k, col, big) {
      H.GT(c); c.globalCompositeOperation = 'lighter'; const r = big ? 34 : 24;
      glyph(c, f.x, f.y, r * (0.7 + 0.3 * ease(Math.min(1, k * 2))), k * 5, col, (1 - k) * 0.95, big ? 8 : 6);
      H.UP(c, f.y); glow(c, f.x, f.y - 12, 16, col, (1 - k) * 0.55);
    },
    star: function (c, f, k) {
      H.GT(c); c.globalCompositeOperation = 'lighter'; ringS(c, f.x, f.y, 12 + 26 * ease(k), '#ffe082', 2, 1 - k);
      H.UP(c, f.y); star(c, f.x, f.y - 12, 22 * (1 - k * 0.3), 5, '#ffd54f', (1 - k) * 0.9, k * 2); glow(c, f.x, f.y - 12, 22, '#ffffff', (1 - k) * 0.5);
    },
    ghost: function (c, f, k) {
      H.GT(c); c.globalCompositeOperation = 'lighter'; ringS(c, f.x, f.y, 12 + 20 * ease(k), '#aed581', 1.6, (1 - k) * 0.9); ringS(c, f.x, f.y, 6 + 10 * k, '#dcedc8', 1, (1 - k));
      H.UP(c, f.y); for (let i = 0; i < 5; i++) { const y = f.y - 22 + i * 5, w = 10 + Math.sin(k * 9 + i) * 4; streak(c, f.x - w, y, f.x + w, y, 0.6, '#c5e1a5', (1 - k) * 0.7); }
    },
    radar: function (c, f, k) {   // ส่งพิกัด: เรดาร์กวาดทั้งวง
      const R = f.r || 300; H.GT(c); c.globalCompositeOperation = 'lighter';
      ringS(c, f.x, f.y, R * ease(Math.min(1, k * 2.2)), '#cfd8dc', 1.6, 1 - k * 0.7); ringS(c, f.x, f.y, R * 0.5 * ease(Math.min(1, k * 2.2)), '#90a4ae', 1, 1 - k);
      const a = k * TAU * 2; c.globalAlpha = (1 - k) * 0.5; c.fillStyle = '#b2ff59'; c.beginPath(); c.moveTo(f.x, f.y); c.arc(f.x, f.y, R * 0.55, a - 0.6, a); c.closePath(); c.fill(); c.globalAlpha = 1;
      H.UP(c, f.y); star(c, f.x, f.y - 14, 8, 4, '#eceff1', 1 - k, k * 4, 0.2);
    },
    horn: function (c, f, k) {   // ร้องประกาศ: คลื่นเสียง
      H.GT(c); c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) { const kk = clamp(k * 1.5 - i * 0.18, 0, 1); if (kk > 0) ringS(c, f.x, f.y, (f.r || 110) * ease(kk), '#ffb300', 3 * (1 - kk) + 0.6, 1 - kk); }
      H.UP(c, f.y); for (let i = 0; i < 3; i++) crescent(c, f.x + Math.cos(side(f)) * (10 + i * 7 + k * 14), f.y - 14, side(f), 8 + i * 4, 1.5, 3, '#ffe082', (1 - k) * (0.9 - i * 0.2));
      once(f, function () { dots(f.x, f.y - 14, 8, '#ffd54f', 40, 0.5, 1.5, 4); });
    },
    banner: function (c, f, k) {   // ผนึกกำลังชาวบ้าน
      const r = (f.r || 150) * ease(Math.min(1, k * 1.8)); H.GT(c); c.globalCompositeOperation = 'lighter';
      glow(c, f.x, f.y, r, '#ffd54f', (1 - k) * 0.22); ringS(c, f.x, f.y, r, '#ffe082', 3 * (1 - k) + 0.8, 1 - k * 0.6); glyph(c, f.x, f.y, r * 0.5, k * 2, '#ffd54f', (1 - k) * 0.9, 8);
      once(f, function () { for (let i = 0; i < 18; i++) { const a = Math.random() * TAU, d = Math.random() * r * 0.9; sp(f.x + Math.cos(a) * d, f.y + Math.sin(a) * d * 0.6, 0, -24 - Math.random() * 22, 1.1, 1.6, '#fff59d', 'dot'); } });
    },
    smoke: function (c, f, k) {
      H.GT(c); ringS(c, f.x, f.y, 6 + 14 * ease(k), '#90a4ae', 1.4, (1 - k) * 0.7);
      once(f, function () { puffs(f.x, f.y - 6, 12, '#78909c', 28, 0.7, 3, 6); });
    },
    shadow: function (c, f, k) {
      H.GT(c); c.globalAlpha = (1 - k) * 0.55; c.fillStyle = '#000'; c.beginPath(); c.arc(f.x, f.y, 26 * ease(Math.min(1, k * 2)), 0, TAU); c.fill(); c.globalAlpha = 1;
      c.globalCompositeOperation = 'lighter'; ringS(c, f.x, f.y, 14 + 18 * k, '#d50000', 1.8, 1 - k);
      once(f, function () { puffs(f.x, f.y - 6, 10, '#263238', 30, 0.7, 3, 6); });
    },
    steam: function (c, f, k) {
      H.GT(c); ringS(c, f.x, f.y, 8 + 14 * ease(k), '#fff8e1', 1.4, (1 - k) * 0.8);
      once(f, function () { for (let i = 0; i < 7; i++) sp(f.x + (Math.random() - 0.5) * 12, f.y - 6, (Math.random() - 0.5) * 10, -18 - Math.random() * 12, 0.9, 2.8, '#fffde7', 'dust'); });
    },
    feast: function (c, f, k) {
      const r = (f.r || 130) * ease(Math.min(1, k * 1.8)); H.GT(c); c.globalCompositeOperation = 'lighter';
      glow(c, f.x, f.y, r, '#ffb74d', (1 - k) * 0.25); ringS(c, f.x, f.y, r, '#fff59d', 3 * (1 - k) + 0.8, 1 - k * 0.6); ringS(c, f.x, f.y, r * 0.6, '#f48fb1', 1.6, (1 - k) * 0.8);
      once(f, function () { const cols = ['#ffcc80', '#fff59d', '#f48fb1', '#ffab91', '#ffffff']; for (let i = 0; i < 24; i++) { const a = Math.random() * TAU, d = Math.random() * r * 0.8; sp(f.x + Math.cos(a) * d, f.y + Math.sin(a) * d * 0.6, 0, -20 - Math.random() * 26, 1.2, 1.7, cols[i % 5], 'dot'); } });
    },
    exhaust: function (c, f, k) {
      H.UP(c, f.y); c.globalCompositeOperation = 'lighter'; const bx = f.x - Math.cos(side(f)) * 10;
      glow(c, bx, f.y - 6, 16 * (1 - k * 0.5), '#ff9100', (1 - k) * 0.9); glow(c, bx, f.y - 6, 8, '#fff59d', (1 - k) * 0.9);
      once(f, function () { dots(bx, f.y - 6, 10, '#ffab40', 60, 0.45, 1.6, 4); puffs(bx, f.y - 4, 5, '#9e9e9e', 20, 0.6, 2.6, 4); });
    },
    skid: function (c, f, k) {
      H.GT(c); c.strokeStyle = '#212121'; c.globalAlpha = (1 - k) * 0.7; c.lineWidth = 2.2; c.lineCap = 'round'; const a = ang(f) + Math.PI;
      c.beginPath(); c.arc(f.x + Math.cos(a) * 18, f.y + Math.sin(a) * 18, 18, a + 1.5, a + 3.4); c.stroke(); c.globalAlpha = 1;
      once(f, function () { puffs(f.x, f.y - 2, 9, '#bdbdbd', 36, 0.7, 3, 4); dots(f.x, f.y - 3, 8, '#ffcc80', 60, 0.4, 1.4, 6); });
    },
    zapflare: function (c, f, k) {
      H.UP(c, f.y); c.globalCompositeOperation = 'lighter'; glow(c, f.x, f.y - 10, 16, '#fff176', (1 - k) * 0.7);
      for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + Math.floor(k * 14) * 0.7; jag(c, f.x, f.y - 10, f.x + Math.cos(a) * 18, f.y - 10 + Math.sin(a) * 18, '#fff176', 0.8, 1 - k, i + f.t0, 3); }
    },
    blackout: function (c, f, k) {
      const r = (f.r || 150) * ease(Math.min(1, k * 1.5)); H.GT(c);
      c.globalAlpha = (1 - k) * 0.35; c.fillStyle = '#000'; c.beginPath(); c.arc(f.x, f.y, r, 0, TAU); c.fill(); c.globalAlpha = 1;
      c.globalCompositeOperation = 'lighter'; ringS(c, f.x, f.y, r, '#fff176', 2.4 * (1 - k) + 0.6, 1 - k);
      H.UP(c, f.y); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; jag(c, f.x, f.y - 12, f.x + Math.cos(a) * 34, f.y - 12 + Math.sin(a) * 22, '#fff176', 0.9, (1 - k), i * 3 + Math.floor(k * 10), 4); }
    }
  };
  // สกิล → ชนิดท่าตอนกด (+ สี)
  const CAST_OF = {
    'nakdab:0': ['parry'], 'nakdab:1': ['flare', '#ffd54f', '#ffffff'], 'nakdab:2': ['rage'],
    'phran:0': [], 'phran:1': ['dust'], 'phran:2': ['fan'],
    'mohya:0': ['leaves'], 'mohya:1': ['purge'], 'mohya:2': ['leaves'],
    'kwan:0': ['dust'], 'kwan:1': ['dome'], 'kwan:2': ['quake'],
    'mothamma:0': ['glyph', '#ff7043'], 'mothamma:1': ['glyph', '#b388ff'], 'mothamma:2': ['glyph', '#ffeb3b', true],
    'muay:0': ['flare', '#ffb74d', '#ffffff'], 'muay:1': ['flare', '#ffb74d', '#ffffff'], 'muay:2': ['star'],
    'seri:0': [], 'seri:1': ['ghost'], 'seri:2': ['radar'],
    'yai:0': ['horn'], 'yai:1': ['flare', '#ffd54f', '#fff59d'], 'yai:2': ['banner'],
    'spy:0': ['smoke'], 'spy:1': ['flare', '#b0bec5', '#ffffff'], 'spy:2': ['shadow'],
    'mae:0': ['steam'], 'mae:1': ['steam'], 'mae:2': ['feast'],
    'win:0': ['exhaust'], 'win:1': ['skid'], 'win:2': ['exhaust'],
    'chang:0': ['zapflare'], 'chang:1': ['zapflare'], 'chang:2': ['blackout']
  };

  /* ---------- ตอนโดนเป้า (imp) ---------- */
  const IMP = {
    spark: function (c, f, k, col, sc) {
      sc = (sc || 1) * 1.3; H.UP(c, f.y); c.globalCompositeOperation = 'lighter'; const y = f.y - 10;
      glow(c, f.x, y, 12 * sc, col, (1 - k) * 0.8); star(c, f.x, y, 9 * sc * (1 - k * 0.4), 4, '#ffffff', (1 - k), k * 1.5, 0.25);
      once(f, function () { dots(f.x, y, Math.round(4 * sc), col, 36 * sc, 0.35, 1.3, 6); });
    },
    slashx: function (c, f, k, col) {
      H.UP(c, f.y); c.globalCompositeOperation = 'lighter'; const y = f.y - 10, e = ease(Math.min(1, k * 2.5)), L = 15 * e;
      streak(c, f.x - L, y - L * 0.8, f.x + L, y + L * 0.8, 1.2, col, 1 - k); streak(c, f.x + L, y - L * 0.8, f.x - L, y + L * 0.8, 1.2, '#ffffff', (1 - k) * 0.9);
      glow(c, f.x, y, 12, col, (1 - k) * 0.6); once(f, function () { dots(f.x, y, 6, col, 40, 0.4, 1.3, 6); });
    },
    pow: function (c, f, k, col, sc) {
      sc = (sc || 1) * 1.3; H.UP(c, f.y); c.globalCompositeOperation = 'lighter'; const y = f.y - 10;
      star(c, f.x, y, 17 * sc * (0.5 + 0.5 * ease(Math.min(1, k * 4))), 8, col, (1 - k) * 0.95, f.t0 * 3, 0.45); star(c, f.x, y, 9 * sc, 8, '#ffffff', (1 - k), f.t0 * 3 + 0.4, 0.4);
      rays(c, f.x, y, 10 * sc, 22 * sc * (0.6 + k), 10, '#ffffff', f.t0, (1 - k) * 0.8, 1);
      once(f, function () { dots(f.x, y, 7, col, 50, 0.4, 1.4, 5); });
    },
    arrowhit: function (c, f, k, col) {
      H.UP(c, f.y); c.globalCompositeOperation = 'lighter'; const y = f.y - 10;
      glow(c, f.x, y, 10, col, (1 - k) * 0.7); star(c, f.x, y, 7, 4, '#ffffff', (1 - k), 0, 0.3);
      once(f, function () { for (let i = 0; i < 6; i++) { const a = Math.random() * TAU; sp(f.x, y, Math.cos(a) * 40, Math.sin(a) * 40 - 10, 0.4, 1.2, '#8d6e63', 'dot'); } });
    },
    heal: function (c, f, k, col, col2) {   // ใบไม้/ประกายฮีลลอยวนขึ้น
      H.GT(c); c.globalCompositeOperation = 'lighter'; ringS(c, f.x, f.y, 6 + 12 * ease(k), col, 1.6, 1 - k);
      H.UP(c, f.y); const y = f.y - 4 - 16 * k; glow(c, f.x, y, 12, col, (1 - k) * 0.4);
      for (let i = 0; i < 4; i++) { const a = k * 6 + i * TAU / 4; disc(c, f.x + Math.cos(a) * 8, f.y - 4 - 24 * ((k + i * 0.25) % 1), 1.5, col2 || '#ffffff', (1 - k)); }
      once(f, function () { for (let i = 0; i < 5; i++) sp(f.x + (Math.random() - 0.5) * 12, f.y - 4, (Math.random() - 0.5) * 12, -20 - Math.random() * 12, 0.9, 1.7, col, 'plus'); });
    },
    pillar: function (c, f, k, col) {   // ฮีลก้อนใหญ่: เสาแสง
      H.GT(c); c.globalCompositeOperation = 'lighter'; ringS(c, f.x, f.y, 8 + 22 * ease(k), col, 2.2, 1 - k);
      H.UP(c, f.y); const w = 8 * (1 - k * 0.5), g = c.createLinearGradient(0, f.y - 70, 0, f.y); g.addColorStop(0, hex(col) + '00'); g.addColorStop(1, hex(col)); c.globalAlpha = (1 - k) * 0.85; c.fillStyle = g; c.fillRect(f.x - w, f.y - 70, w * 2, 70); c.globalAlpha = 1;
      glow(c, f.x, f.y - 8, 16, '#ffffff', (1 - k) * 0.6);
      once(f, function () { for (let i = 0; i < 10; i++) sp(f.x + (Math.random() - 0.5) * 14, f.y - 4, (Math.random() - 0.5) * 12, -26 - Math.random() * 20, 1.0, 1.7, i % 2 ? '#ffffff' : col, 'plus'); });
    },
    shock: function (c, f, k, col) {
      H.GT(c); c.globalCompositeOperation = 'lighter'; ringS(c, f.x, f.y, 6 + 24 * ease(k), col, 2.4 * (1 - k) + 0.5, 1 - k);
      H.UP(c, f.y); glow(c, f.x, f.y - 8, 14, '#ffffff', (1 - k) * 0.6);
      once(f, function () { puffs(f.x, f.y - 2, 7, '#b8a58c', 34, 0.5, 2.6, 6); });
    },
    zap: function (c, f, k) {
      H.UP(c, f.y); c.globalCompositeOperation = 'lighter'; const y = f.y - 10;
      glow(c, f.x, y, 13, '#fff176', (1 - k) * 0.7);
      for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + k * 3; jag(c, f.x, y, f.x + Math.cos(a) * 14, y + Math.sin(a) * 14, '#fff176', 0.8, 1 - k, i + f.t0, 3); }
    },
    cross: function (c, f, k) {   // ภารกิจลับ: กากบาทแดง
      H.UP(c, f.y); c.globalCompositeOperation = 'lighter'; const y = f.y - 10, e = ease(Math.min(1, k * 3)), L = 22 * e;
      streak(c, f.x - L, y - L, f.x + L, y + L, 1.8, '#d50000', 1 - k); streak(c, f.x + L, y - L, f.x - L, y + L, 1.8, '#ff1744', 1 - k);
      glow(c, f.x, y, 20, '#d50000', (1 - k) * 0.7);
      once(f, function () { dots(f.x, y, 12, '#ff1744', 60, 0.5, 1.6, 4); });
    }
  };
  const IMP_OF = {   // 'ฮีโร่:สกิล' → [ชนิด, สี, ขนาด]; สกิล -1 = ตีปกติ
    'nakdab:0': ['slashx', '#ffd54f'], 'nakdab:1': ['slashx', '#ffd54f'], 'nakdab:2': ['slashx', '#ff5252'],
    'phran:0': ['arrowhit', '#a5d6a7'], 'phran:1': ['arrowhit', '#81c784'], 'phran:2': ['arrowhit', '#a5d6a7'],
    'mohya:0': ['heal', '#81c784', '#e8f5e9'], 'mohya:1': ['heal', '#c8e6c9', '#ffffff'], 'mohya:2': ['pillar', '#a5d6a7'],
    'kwan:0': ['shock', '#ffb300'], 'kwan:1': ['shock', '#ffcc80'], 'kwan:2': ['shock', '#ffd54f'],
    'mothamma:0': ['spark', '#ff7043', 1.3], 'mothamma:1': ['spark', '#b388ff'], 'mothamma:2': ['spark', '#ffeb3b'],
    'muay:0': ['pow', '#ffb74d'], 'muay:1': ['pow', '#ff9800', 1.2], 'muay:2': ['pow', '#ffd54f', 1.4],
    'seri:0': ['arrowhit', '#eceff1'], 'seri:1': ['spark', '#aed581'], 'seri:2': ['spark', '#eceff1'],
    'yai:0': ['shock', '#ffb300'], 'yai:1': ['spark', '#ffd54f'], 'yai:2': ['spark', '#ffd54f'],
    'spy:0': ['slashx', '#ff5252'], 'spy:1': ['spark', '#b0bec5'], 'spy:2': ['cross'],
    'mae:0': ['heal', '#ffcc80', '#fff8e1'], 'mae:1': ['heal', '#ffcc80', '#fff8e1'], 'mae:2': ['heal', '#f48fb1', '#fff59d'],
    'win:0': ['spark', '#ff9100', 1.2], 'win:1': ['spark', '#ff9100'], 'win:2': ['spark', '#ff6d00', 1.3],
    'chang:0': ['zap'], 'chang:1': ['zap'], 'chang:2': ['zap']
  };
  const BASIC = { nakdab: '#ffd54f', phran: '#a5d6a7', mohya: '#c5e1a5', kwan: '#ffb300', mothamma: '#ce93d8', muay: '#ffb74d', seri: '#eceff1', yai: '#ffd54f', spy: '#ef9a9a', mae: '#ffcc80', win: '#ff9100', chang: '#fff176' };

  /* ---------- ลูกกระสุน ---------- */
  function proj(c, p, dx, dy, py, g) {
    if (!p.h) return false;
    const key = p.h + ':' + p.s, a = Math.atan2(dy, dx);
    c.save();
    if (key === 'phran:0' || key === 'phran:2') {
      const L = key === 'phran:0' ? 24 : 17, cx = Math.cos(a), cy = Math.sin(a);
      c.globalCompositeOperation = 'lighter'; streak(c, p.x - cx * L * 1.6, py - cy * L * 1.6, p.x - cx * L, py - cy * L, 0.6, '#c8e6c9', 0.4);
      c.globalCompositeOperation = 'source-over'; c.lineCap = 'round'; c.strokeStyle = '#6d4c41'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(p.x - cx * L, py - cy * L); c.lineTo(p.x, py); c.stroke();
      c.fillStyle = '#cfd8dc'; c.beginPath(); c.moveTo(p.x + cx * 4, py + cy * 4); c.lineTo(p.x - cy * 2.2, py + cx * 2.2); c.lineTo(p.x + cy * 2.2, py - cx * 2.2); c.closePath(); c.fill();
      c.strokeStyle = '#a5d6a7'; c.lineWidth = 1.2; c.beginPath(); for (const s of [-1, 1]) { c.moveTo(p.x - cx * L, py - cy * L); c.lineTo(p.x - cx * (L - 5) - cy * 2.2 * s, py - cy * (L - 5) + cx * 2.2 * s); } c.stroke();
      c.restore(); return true;
    }
    if (key === 'seri:0') {
      const L = 54, cx = Math.cos(a), cy = Math.sin(a);
      c.globalCompositeOperation = 'lighter'; streak(c, p.x - cx * L, py - cy * L, p.x, py, 1.1, '#fff59d', 0.95); glow(c, p.x, py, 7, '#ffffff', 0.8);
      c.restore(); return true;
    }
    c.restore(); return false;
  }

  /* ---------- พื้นที่ (คืนค่า 'replace' = วาดแทนของเดิม) ---------- */
  function zone(c, z, g, rt) {
    if (!z.h) return false;
    const key = z.h + ':' + z.s;
    c.save();
    let res = false;
    if (key === 'mothamma:0') {   // ยันต์ไฟ: วงยันต์กำลังชาร์จ
      const k = clamp(1 - (z.at - g.t) / 0.6, 0, 1); c.globalCompositeOperation = 'lighter';
      c.globalAlpha = 0.1 + 0.25 * k; c.fillStyle = '#ff7043'; c.beginPath(); c.arc(z.x, z.y, z.r, 0, TAU); c.fill(); c.globalAlpha = 1;
      glyph(c, z.x, z.y, z.r, rt * 2.5, '#ffab40', 0.9, 6); glyph(c, z.x, z.y, z.r * 0.5 * (1 - k * 0.3), -rt * 3, '#ffffff', 0.7, 5); ringS(c, z.x, z.y, z.r * k, '#ff7043', 1.6, 0.8);
      H.UP(c, z.y); glow(c, z.x, z.y - 8 * k, 6 + 14 * k, '#ff7043', 0.5 * k);
      res = 'replace';
    } else if (key === 'mothamma:1') {   // กำแพงคาถา: กำแพงแสงม่วงเป็นวง
      const fade = clamp((z.until - g.t) / 0.5, 0, 1); c.globalCompositeOperation = 'lighter';
      c.globalAlpha = 0.12 * fade; c.fillStyle = '#7c4dff'; c.beginPath(); c.arc(z.x, z.y, z.r, 0, TAU); c.fill(); c.globalAlpha = 1;
      glyph(c, z.x, z.y, z.r, rt * 1.2, '#b388ff', 0.85 * fade, 6);
      H.UP(c, z.y); const n = 14;
      for (let i = 0; i < n; i++) { const a = i / n * TAU + rt * 0.5, h = 9 + 5 * Math.sin(rt * 4 + i * 1.7); streak(c, z.x + Math.cos(a) * z.r * 0.95, z.y + Math.sin(a) * z.r * 0.95 * 0.55, z.x + Math.cos(a) * z.r * 0.95, z.y + Math.sin(a) * z.r * 0.95 * 0.55 - h, 0.8, '#b388ff', 0.8 * fade); }
      res = 'replace';
    } else if (key === 'mothamma:2') {   // ฝนคาถา: ยันต์ใหญ่ ยันต์ร่วงลงมาเป็นสาย
      const fade = clamp((z.until - g.t) / 0.4, 0, 1); c.globalCompositeOperation = 'lighter';
      c.globalAlpha = (0.12 + 0.05 * Math.sin(rt * 6)) * fade; c.fillStyle = '#ffeb3b'; c.beginPath(); c.arc(z.x, z.y, z.r, 0, TAU); c.fill(); c.globalAlpha = 1;
      glyph(c, z.x, z.y, z.r, rt * 1.6, '#ffeb3b', 0.9 * fade, 8); glyph(c, z.x, z.y, z.r * 0.55, -rt * 2.2, '#ff8a65', 0.8 * fade, 6);
      H.UP(c, z.y); c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 16; i++) {
        const ph = (rt * 1.7 + i * 0.37) % 1, sx = z.x + Math.sin(i * 12.9898) * z.r * 0.85, sy = z.y + Math.sin(i * 78.233) * z.r * 0.5, h = 60 * (1 - ph);
        c.globalAlpha = (1 - ph) * 0.9 * fade; c.fillStyle = i % 3 ? '#fff59d' : '#ff8a65'; c.fillRect(sx - 1.4, sy - h - 5, 2.8, 6);
        if (ph > 0.9) { glow(c, sx, sy, 6, '#ffeb3b', 0.6 * fade); }
      }
      c.globalAlpha = 1; res = 'replace';
    } else if (key === 'chang:2') {   // ไฟดับทั้งซอย: มืดสนิท มีไฟกะพริบ
      const fade = clamp((z.until - g.t) / 0.4, 0, 1), a0 = clamp((g.t - (z.until - 3)) / 0.3, 0, 1);
      const gr = c.createRadialGradient(z.x, z.y, z.r * 0.15, z.x, z.y, z.r); gr.addColorStop(0, 'rgba(0,0,0,0.62)'); gr.addColorStop(0.8, 'rgba(0,0,12,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      c.globalAlpha = fade * a0; c.fillStyle = gr; c.beginPath(); c.arc(z.x, z.y, z.r, 0, TAU); c.fill(); c.globalAlpha = 1;
      c.globalCompositeOperation = 'lighter'; ringS(c, z.x, z.y, z.r, '#fff176', 1.2, 0.5 * fade);
      H.UP(c, z.y);
      for (let i = 0; i < 7; i++) { const on = Math.sin(rt * (5 + i) + i * 3) > 0.55; if (!on) continue; const a = i / 7 * TAU + 0.5, r = z.r * (0.3 + 0.55 * ((i * 37) % 10) / 10); jag(c, z.x + Math.cos(a) * r, z.y + Math.sin(a) * r * 0.55 - 14, z.x + Math.cos(a) * r + 6, z.y + Math.sin(a) * r * 0.55 - 6, '#fff176', 0.7, 0.9 * fade, i + Math.floor(rt * 20), 2.5); }
      res = 'replace';
    } else if (key === 'chang:1') {   // หม้อแปลง: ประกายไฟวิ่งรอบอุปกรณ์ (วาดทับของเดิม)
      H.UP(c, z.y); c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 2; i++) { const a = rt * 3 + i * Math.PI; jag(c, z.x, z.y - 13, z.x + Math.cos(a) * 11, z.y - 6 + Math.sin(a) * 3, '#fff176', 0.7, 0.8, Math.floor(rt * 18) + i, 2.2); }
      glow(c, z.x, z.y - 13, 7 + 2 * Math.sin(rt * 9), '#fff176', 0.45);
    } else if (key === 'mae:1') {   // หม้อก๋วยเตี๋ยว: ไอน้ำ
      c.globalCompositeOperation = 'lighter'; ringS(c, z.x, z.y, z.r * (0.6 + 0.08 * Math.sin(rt * 3)), '#ffcc80', 1.2, 0.5);
      if (Math.random() < 0.28) sp(z.x + (Math.random() - 0.5) * 8, z.y - 10, (Math.random() - 0.5) * 6, -18, 1.0, 2.6, '#fffde7', 'dust');
    } else if (key === 'phran:1') {   // กับดักหนาม: วงเตือนแดงจาง ๆ
      c.globalCompositeOperation = 'lighter'; ringS(c, z.x, z.y, z.r, '#ef5350', 0.9, 0.35 + 0.25 * Math.sin(rt * 5));
    }
    c.restore();
    return res;
  }

  /* ---------- ออร่าติดตัว ---------- */
  function aura(c, f, g, k, rt) {
    const u = f.u; if (!u || u.dead) return;
    const key = f.h + ':' + f.s, x = u.x, y = u.y, fade = clamp(Math.min(k * 8, (1 - k) * 8), 0, 1);
    c.save();
    if (key === 'nakdab:2') {   // ศึกสุดท้าย: ออร่าแดงลุกโชน
      H.GT(c); c.globalCompositeOperation = 'lighter'; glyph(c, x, y, 18 + 2 * Math.sin(rt * 9), rt * 3, '#ff5252', 0.7 * fade, 6);
      H.UP(c, y); glow(c, x, y - 10, 22 + 3 * Math.sin(rt * 11), '#ff1744', 0.35 * fade);
      if (Math.random() < 0.5) sp(x + (Math.random() - 0.5) * 12, y - 2, (Math.random() - 0.5) * 8, -34 - Math.random() * 16, 0.6, 1.7, Math.random() < 0.5 ? '#ff5252' : '#ffab40', 'dot');
    } else if (key === 'nakdab:0') {   // ท่ารับ: รัศมีทองหน้าตัว
      H.UP(c, y); c.globalCompositeOperation = 'lighter'; const sd = (u.face && u.face[0] < 0) ? Math.PI : 0;
      crescent(c, x + Math.cos(sd) * 10, y - 12, sd, 14 + 1.5 * Math.sin(rt * 14), 2.0, 6, '#ffe082', 0.55 * fade); glow(c, x, y - 11, 16, '#ffd54f', 0.25 * fade);
    } else if (key === 'kwan:1') {   // เกราะหนัง: โดมหกเหลี่ยมทองน้ำตาล
      H.UP(c, y); c.globalCompositeOperation = 'lighter'; const R = 19 + 0.8 * Math.sin(rt * 4);
      c.globalAlpha = 0.14 * fade; c.fillStyle = '#ffb300'; c.beginPath(); c.ellipse(x, y - 10, R, R * 1.05, 0, 0, TAU); c.fill();
      ringS(c, x, y - 10, R, '#ffcc80', 1.4, 0.8 * fade);
      c.strokeStyle = '#ffe0b2'; c.globalAlpha = 0.45 * fade; c.lineWidth = 0.7; c.beginPath();
      for (let i = 0; i < 6; i++) { const a = rt * 0.6 + i / 6 * TAU; c.moveTo(x, y - 10); c.lineTo(x + Math.cos(a) * R, y - 10 + Math.sin(a) * R); }
      c.stroke(); c.globalAlpha = 1;
    } else if (key === 'seri:1') {   // ซุ่มพราง: ตัวเลือนเป็นเส้นเขียว
      H.UP(c, y); c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) { const yy = y - 4 - ((rt * 18 + i * 7) % 26); streak(c, x - 9, yy, x + 9, yy, 0.5, '#c5e1a5', 0.5 * fade); }
    } else if (key === 'yai:2') {   // ผนึกกำลัง: ออร่าทองของเพื่อนทุกคน
      H.GT(c); c.globalCompositeOperation = 'lighter'; ringS(c, x, y, 16 + 1.5 * Math.sin(rt * 5), '#ffd54f', 1.4, 0.7 * fade);
      H.UP(c, y); glow(c, x, y - 10, 18, '#ffd54f', 0.2 * fade);
      if (Math.random() < 0.18) sp(x + (Math.random() - 0.5) * 12, y - 2, 0, -22, 0.8, 1.4, '#fff59d', 'dot');
    } else if (key === 'mohya:0' || key === 'mae:2' || key === 'mohya:1') {   // ฮีลต่อเนื่อง: ใบ/ประกายลอยขึ้น
      const col = f.h === 'mae' ? '#f48fb1' : '#81c784';
      H.GT(c); c.globalCompositeOperation = 'lighter'; ringS(c, x, y, 13 + 1.2 * Math.sin(rt * 6), col, 1.2, 0.6 * fade);
      if (Math.random() < 0.22) sp(x + (Math.random() - 0.5) * 12, y - 4, 0, -22, 0.9, 1.6, col, 'plus');
    } else if (key === 'win:1') {   // เลี้ยวหนี: เส้นความเร็ว
      H.UP(c, y); c.globalCompositeOperation = 'lighter'; const sd = (u.face && u.face[0] < 0) ? 1 : -1;
      for (let i = 0; i < 3; i++) { const yy = y - 4 - i * 5; streak(c, x + sd * 8, yy, x + sd * (20 + 8 * Math.sin(rt * 20 + i)), yy, 0.5, '#80deea', 0.6 * fade); }
    } else {
      H.GT(c); c.globalCompositeOperation = 'lighter'; ringS(c, x, y, 14, '#fff59d', 1, 0.4 * fade);
    }
    c.restore();
  }

  /* ---------- พุ่ง/วาร์ป ---------- */
  function dash(c, f, g, k, rt) {
    const u = f.u, key = f.h + ':' + f.s;
    const cx = f.jump || !u ? f.x2 : u.x, cy = f.jump || !u ? f.y2 : u.y;
    c.save(); H.UP(c, (f.y1 + cy) / 2); c.globalCompositeOperation = 'lighter';
    const a = 1 - k, y1 = f.y1 - 8, y2 = cy - 8;
    const dx = f.x2 - f.x1, dy = f.y2 - f.y1, l = Math.hypot(dx, dy) || 1, nx = dx / l, ny = dy / l;
    if (key === 'spy:1') {   // ตะขอลวด: เชือก + หัวตะขอ
      const hx = f.x2, hy = f.y2 - 8, rk = clamp(k * 1.6, 0, 1);
      c.strokeStyle = '#cfd8dc'; c.lineWidth = 0.9; c.globalAlpha = a; c.beginPath(); c.moveTo(cx, y2); c.lineTo(hx, hy); c.stroke();
      c.fillStyle = '#eceff1'; c.beginPath(); c.moveTo(hx + nx * 3, hy + ny * 3); c.lineTo(hx - ny * 3 - nx * 2, hy + nx * 3 - ny * 2); c.lineTo(hx + ny * 3 - nx * 2, hy - nx * 3 - ny * 2); c.closePath(); c.fill(); c.globalAlpha = 1;
      glow(c, hx, hy, 6, '#ffffff', a * 0.5 * (1 - rk));
    } else if (key === 'spy:0' || key === 'spy:2') {   // วาร์ปเงา: เงาเส้นแดงดำ
      streak(c, f.x1, y1, cx, y2, 1.6, key === 'spy:2' ? '#d50000' : '#90a4ae', a);
      glow(c, f.x1, y1, 12 * a, '#263238', 0.7 * a);
      once(f, function () { puffs(f.x1, f.y1 - 6, 8, '#37474f', 26, 0.6, 3, 5); });
    } else if (key === 'kwan:0') {   // ช้างกระแทก: ฝุ่นตลบ + ประกายงา
      streak(c, f.x1, y1, cx, y2, 2.2, '#ffe0b2', a * 0.7);
      if (u && Math.random() < 0.8) sp(cx - nx * 6 + (Math.random() - 0.5) * 8, cy + 2, -nx * 12, -10 - Math.random() * 10, 0.7, 3.4, '#b8a58c', 'dust');
    } else if (key === 'win:0' || key === 'win:2') {   // บิดเร่ง/ส่งด่วน: ไฟท้าย นีออน
      streak(c, f.x1, y1, cx, y2, 1.8, key === 'win:2' ? '#ff6d00' : '#ffab40', a); streak(c, f.x1, y1 - 2, cx, y2 - 2, 0.8, '#80deea', a * 0.8);
      if (u && Math.random() < 0.7) sp(cx - nx * 5, cy - 4, -nx * 30 + (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, 0.35, 1.5, '#ffab40', 'dot');
    } else if (key === 'nakdab:1' || key === 'muay:1') {
      const col = f.h === 'nakdab' ? '#ffd54f' : '#ff9800';
      streak(c, f.x1, y1, cx, y2, 1.8, col, a);
      for (let i = 1; i <= 2; i++) { const t = i / 3; glow(c, f.x1 + (cx - f.x1) * t, y1 + (y2 - y1) * t, 7, col, a * 0.35); }
    } else {
      streak(c, f.x1, y1, cx, y2, 1.6, '#ffffff', a * 0.8);
    }
    c.restore();
  }

  /* ---------- ฟ้าผ่า / โซ่ / โยนของ ---------- */
  function bolt(c, f, k, rt) {
    c.save(); H.UP(c, (f.y1 + f.y2) / 2); c.globalCompositeOperation = 'lighter';
    const seed = f.t0 * 5 + Math.floor(k * 9);
    jag(c, f.x1, f.y1 - 10, f.x2, f.y2 - 10, '#ffee58', 1.6, 1 - k, seed, 7); jag(c, f.x1, f.y1 - 10, f.x2, f.y2 - 10, '#80d8ff', 0.8, (1 - k) * 0.7, seed + 3, 9);
    glow(c, f.x2, f.y2 - 10, 11, '#fff59d', (1 - k) * 0.8);
    c.restore();
  }
  function link(c, f, g, k, rt) {
    const a = f.a, b = f.b; if (!a || !b || a.dead || b.dead) return;
    c.save(); H.UP(c, (a.y + b.y) / 2); c.globalCompositeOperation = 'lighter';
    const fade = clamp(Math.min(k * 10, (1 - k) * 6), 0, 1), n = 9, dx = b.x - a.x, dy = b.y - a.y;
    for (let i = 0; i < n; i++) { const t = i / (n - 1), w = Math.sin(rt * 6 + i) * 2; disc(c, a.x + dx * t, a.y + dy * t - 10 + w - Math.sin(t * Math.PI) * 4, i % 2 ? 1.3 : 1.8, i % 2 ? '#ffe082' : '#ffffff', 0.85 * fade); }
    glow(c, a.x, a.y - 10, 10, '#ffd54f', 0.35 * fade); glow(c, b.x, b.y - 10, 10, '#ffd54f', 0.35 * fade);
    c.restore();
  }
  function thr(c, f, k, rt) {
    c.save(); H.UP(c, f.y2); const e = ease(k), x = f.x1 + (f.x2 - f.x1) * e, y = f.y1 + (f.y2 - f.y1) * e - 12 - Math.sin(k * Math.PI) * 22;
    c.globalCompositeOperation = 'source-over'; disc(c, x, y, 3.4, '#fff8e1', 1); disc(c, x - 0.8, y - 1, 1.6, '#ffffff', 0.9); ringS(c, x, y, 3.4, '#8d6e63', 0.7, 1);
    c.globalCompositeOperation = 'lighter'; glow(c, x, y, 8, '#ffcc80', 0.35);
    if (Math.random() < 0.5) sp(x, y, 0, -8, 0.4, 1.4, '#ffffff', 'dust');
    c.restore();
  }
  function boom(c, f, k) {
    const key = f.h + ':' + f.s, R = f.r || 40;
    c.save();
    if (key === 'mothamma:0') {   // ยันต์ไฟระเบิด: เสาไฟ
      H.GT(c); c.globalCompositeOperation = 'lighter'; ringS(c, f.x, f.y, R * ease(Math.min(1, k * 2)), '#ff7043', 3 * (1 - k) + 0.6, 1 - k); glow(c, f.x, f.y, R, '#ff7043', (1 - k) * 0.5);
      H.UP(c, f.y); const h = 70 * ease(Math.min(1, k * 2.5)), w = R * 0.55 * (1 - k * 0.5), g = c.createLinearGradient(0, f.y - h, 0, f.y); g.addColorStop(0, '#ffeb3b00'); g.addColorStop(0.5, '#ff9800'); g.addColorStop(1, '#ff3d00');
      c.globalAlpha = (1 - k) * 0.9; c.fillStyle = g; c.beginPath(); c.moveTo(f.x - w, f.y); c.quadraticCurveTo(f.x - w * 0.6, f.y - h * 0.6, f.x, f.y - h); c.quadraticCurveTo(f.x + w * 0.6, f.y - h * 0.6, f.x + w, f.y); c.closePath(); c.fill(); c.globalAlpha = 1;
      once(f, function () { dots(f.x, f.y - 6, 22, '#ffab40', 70, 0.7, 2, 40); puffs(f.x, f.y - 4, 8, '#4e342e', 30, 0.8, 3.4, 20); });
    } else {   // กับดักหนาม: หนามพุ่ง
      H.GT(c); ringS(c, f.x, f.y, R * ease(Math.min(1, k * 2)), '#81c784', 2, 1 - k);
      H.UP(c, f.y); c.globalCompositeOperation = 'source-over'; c.fillStyle = '#a1887f'; c.globalAlpha = 1 - k * 0.8;
      for (let i = -3; i <= 3; i++) { const hh = (8 + Math.abs(i) * -1 + 6) * ease(Math.min(1, k * 4)); c.beginPath(); c.moveTo(f.x + i * 4 - 1.6, f.y); c.lineTo(f.x + i * 4 + 1.6, f.y); c.lineTo(f.x + i * 4 + (i % 2) * 1, f.y - hh); c.closePath(); c.fill(); }
      c.globalAlpha = 1; once(f, function () { dots(f.x, f.y - 4, 10, '#a5d6a7', 40, 0.4, 1.4, 14); });
    }
    c.restore();
  }
  function muz(c, f, k) {
    c.save(); H.UP(c, f.y); c.globalCompositeOperation = 'lighter';
    const sd = f.dx >= 0 ? 1 : -1, bx = f.x + sd * 9, by = f.y - 10;
    if (f.h === 'seri') { glow(c, bx, by, 14 * (1 - k * 0.4), '#fff59d', (1 - k) * 0.9); star(c, bx + sd * 6, by, 9 * (1 - k), 4, '#ffffff', 1 - k, 0, 0.2); once(f, function () { puffs(bx, by, 4, '#cfd8dc', 16, 0.5, 2, 3); }); }
    else { crescent(c, bx + sd * 4, by, sd > 0 ? 0 : Math.PI, 11, 1.6, 4, '#c8e6c9', (1 - k) * 0.8); glow(c, bx, by, 9, '#e8f5e9', (1 - k) * 0.5); }
    c.restore();
  }


  /* ---------- กลับพระนครแบบเฉพาะตัวฮีโร่ (วาดทุกเฟรมตอนร่ายค้าง) + ตอนหายตัว/ปรากฏตัว (rcend) ---------- */
  const RC = {   // ฮีโร่ → [ธีม, สีหลัก, สีรอง]
    nakdab: ['banner', '#ffd54f', '#ff8f00'], phran: ['orbit', '#81c784', '#33691e'], mohya: ['orbit', '#f8bbd0', '#aed581'], kwan: ['stomp', '#ffb300', '#8d6e63'],
    mothamma: ['glyph', '#ce93d8', '#7b1fa2'], muay: ['lotus', '#ffb74d', '#ef6c00'], seri: ['flag', '#ffffff', '#1565c0'], yai: ['bell', '#ffd54f', '#8d6e63'],
    spy: ['smoke', '#b0bec5', '#263238'], mae: ['steam', '#fff3e0', '#f06292'], win: ['exhaust', '#ff7043', '#78909c'], chang: ['electric', '#fff176', '#fbc02d']
  };
  const RCT = {};
  const due = function (id, dt) { const n = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000; if (!RCT[id] || n - RCT[id] > dt) { RCT[id] = n; return true; } return false; };
  function recall(c, u, x, y, rt, pr, K) {
    const m = RC[u.def.id] || ['banner', '#80d8ff', '#0277bd'], th = m[0], c1 = m[1], c2 = m[2], id = 'rc' + u.id, e = clamp(pr, 0, 1);
    c.save(); c.globalCompositeOperation = 'lighter';
    // เสาแสงสีของฮีโร่ + วงพื้นหมุน
    const gr = c.createLinearGradient(0, y - 90, 0, y); gr.addColorStop(0, hex(c1) + '00'); gr.addColorStop(1, hex(c1) + '88');
    c.globalAlpha = 0.35 + 0.5 * e; c.fillStyle = gr; c.fillRect(x - 8 - e * 4, y - 90, 16 + e * 8, 90);
    c.save(); c.translate(x, y); c.scale(1, K); ringS(c, 0, 0, 14 + 6 * e, c1, 1.6, 0.9); glyph(c, 0, 0, 20, rt * 1.5, c2, 0.5 + 0.4 * e, 6); c.restore();
    const orb = function (n, r, col, sz, h0) { for (let i = 0; i < n; i++) { const a = rt * 3 + i * TAU / n, hh = ((i / n + rt * 0.45) % 1) * 46; c.globalAlpha = 0.9; c.fillStyle = col; c.beginPath(); c.ellipse(x + Math.cos(a) * r, y - (h0 || 6) - hh + Math.sin(a) * r * 0.35 * K, sz, sz * 0.6, a, 0, TAU); c.fill(); } };
    if (th === 'banner') { rays(c, x, y - 30, 10, 20 + 8 * e, 10, c1, rt, 0.7, 1.4); if (due(id, 0.08)) dots(x, y - 4, 2, c1, 20, 0.9, 1.8, 40); }
    else if (th === 'orbit') { orb(7, 16, c1, 2.4); if (due(id, 0.1)) dots(x, y - 4, 1, c2, 12, 1, 2, 30); }
    else if (th === 'stomp') { const pul = (rt * 2) % 1; c.save(); c.translate(x, y); c.scale(1, K); ringS(c, 0, 0, 10 + pul * 26, c1, 2.2, 1 - pul); for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + 0.3; c.globalAlpha = 0.7; c.strokeStyle = c2; c.lineWidth = 1.4; c.beginPath(); c.moveTo(Math.cos(a) * 8, Math.sin(a) * 8); c.lineTo(Math.cos(a) * (14 + pul * 10), Math.sin(a) * (14 + pul * 10)); c.stroke(); } c.restore(); if (due(id, 0.16)) puffs(x, y, 3, '#a1887f', 24, 0.8, 3, 6); }
    else if (th === 'glyph') { c.save(); c.translate(x, y); c.scale(1, K); glyph(c, 0, 0, 30, -rt * 2, c1, 0.9, 5); glyph(c, 0, 0, 20, rt * 2.6, '#ffffff', 0.5, 3); c.restore(); orb(4, 12, c1, 2, 12); }
    else if (th === 'lotus') { const pul = (rt * 1.2) % 1; c.save(); c.translate(x, y); c.scale(1, K); for (let i = 0; i < 2; i++) { const q = (pul + i * 0.5) % 1; ringS(c, 0, 0, 8 + q * 28, c1, 2, 1 - q); } c.restore(); glow(c, x, y - 14, 18 + 4 * Math.sin(rt * 5), c1, 0.45); }
    else if (th === 'flag') { for (let i = 0; i < 3; i++) { c.globalAlpha = 0.55 + 0.25 * e; c.fillStyle = i === 1 ? c2 : '#ffffff'; c.fillRect(x - 12 + i * 8, y - 70 - 14 * Math.sin(rt * 4 + i), 8, 70); } c.fillStyle = '#d32f2f'; c.globalAlpha = 0.5; c.fillRect(x - 12, y - 70, 8, 70); c.fillRect(x + 4, y - 70, 8, 70); if (due(id, 0.12)) dots(x, y - 6, 2, '#ffffff', 22, 0.8, 1.6, 36); }
    else if (th === 'bell') { const pul = (rt * 1.5) % 1; for (let i = 0; i < 3; i++) { const q = (pul + i / 3) % 1; c.save(); c.translate(x, y - 16); ringS(c, 0, 0, 8 + q * 34, c1, 1.6, (1 - q) * 0.8); c.restore(); } if (due(id, 0.3)) dots(x, y - 20, 3, c1, 26, 0.8, 1.8, 14); }
    else if (th === 'smoke') { c.globalCompositeOperation = 'source-over'; if (due(id, 0.05)) puffs(x, y - 6, 3, c2, 26, 0.9, 4.2, 22); if (due(id, 0.2)) dots(x, y - 20, 1, '#ff1744', 8, 0.6, 1.6, 10); }
    else if (th === 'steam') { c.globalCompositeOperation = 'source-over'; if (due(id, 0.07)) puffs(x, y - 8, 3, '#ffffff', 16, 1.1, 3.8, 34); if (due(id, 0.4)) dots(x, y - 24, 1, c2, 10, 1.2, 2.6, 30); }
    else if (th === 'exhaust') { const sd = u.face && u.face[0] < 0 ? 1 : -1; if (due(id, 0.04)) { puffs(x + sd * 12, y - 6, 2, '#90a4ae', 30, 0.7, 3.4, 6); dots(x + sd * 14, y - 5, 2, '#ffab40', 40, 0.3, 1.5, 4); } c.save(); c.translate(x, y); c.scale(1, K); ringS(c, 0, 0, 12 + 3 * Math.sin(rt * 40), c1, 1.4, 0.7); c.restore(); }
    else if (th === 'electric') { if (due(id, 0.06)) { const a = Math.random() * TAU; jag(c, x + Math.cos(a) * 6, y - 20 + Math.sin(a) * 6, x + Math.cos(a) * 24, y - 20 + Math.sin(a) * 18, c1, 1.4, 0.9, Math.floor(rt * 20), 5); dots(x, y - 20, 2, c1, 40, 0.3, 1.4, 4); } glow(c, x, y - 20, 16, c1, 0.25 + 0.2 * Math.sin(rt * 30)); }
    c.restore();
  }
  function rcend(c, f, k) {
    const m = RC[f.h] || ['banner', '#80d8ff', '#0277bd'];
    c.save(); H.GT(c); c.globalCompositeOperation = 'lighter';
    ringS(c, f.x, f.y, 10 + 34 * ease(k), m[1], 3 * (1 - k) + 0.5, 1 - k); ringS(c, f.x, f.y, 6 + 22 * ease(k), m[2], 2, 1 - k);
    H.UP(c, f.y); const gr = c.createLinearGradient(0, f.y - 110, 0, f.y); gr.addColorStop(0, hex(m[1]) + '00'); gr.addColorStop(1, hex(m[1]) + 'cc');
    c.globalAlpha = (1 - k) * (f.s ? 0.9 : 0.8); c.fillStyle = gr; const w = (f.s ? 16 * (1 - k) : 16 * k + 3); c.fillRect(f.x - w, f.y - 110, w * 2, 110);
    rays(c, f.x, f.y - 20, 8, 30 * ease(k) + 10, 12, m[1], k * 3, 1 - k, 1.6);
    once(f, function () { dots(f.x, f.y - 8, 18, m[1], 70, 0.8, 2, 40); puffs(f.x, f.y - 2, 5, m[2], 36, 0.7, 3.4, 10); });
    c.restore();
  }

  /* ---------- ตัวเข้าถึงจาก render.js ---------- */
  const DUR = { 'sk:nakdab:0': 0.5, 'sk:nakdab:2': 0.9, 'sk:kwan:2': 1.1, 'sk:mothamma:0': 0.8, 'sk:mothamma:1': 0.9, 'sk:mothamma:2': 1.1, 'sk:muay:2': 0.7, 'sk:seri:2': 1.2, 'sk:yai:0': 0.9, 'sk:yai:2': 1.3, 'sk:mae:2': 1.2, 'sk:chang:2': 0.9, 'sk:mohya:1': 0.9,
    imp: 0.45, boom: 0.7, muz: 0.22, dash: 0.5, link: 4, rcend: 0.9, throw: 0.3, bolt: 0.28, aura: 3, sk: 0.7 };
  function dur(h, s, kind) { return DUR[kind + ':' + h + ':' + s] || DUR[kind] || 0.7; }

  function draw(c, g, f, k, rt) {
    if (!H) return;
    c.save();
    c.globalCompositeOperation = 'source-over';
    try {
      if (f.k === 'sk') {
        const m = CAST_OF[f.h + ':' + f.s]; if (m && m[0] && CAST[m[0]]) CAST[m[0]](c, f, k, m[1], m[2]);
      } else if (f.k === 'imp') {
        const m = f.s >= 0 ? IMP_OF[f.h + ':' + f.s] : null;
        if (!m) IMP.spark(c, f, k, BASIC[f.h] || '#ffffff', 0.7);
        else if (f.ally && !/^(heal|pillar)$/.test(m[0])) IMP.heal(c, f, k, '#a5d6a7', '#ffffff');
        else IMP[m[0]](c, f, k, m[1], m[2]);
      } else if (f.k === 'muz') muz(c, f, k);
      else if (f.k === 'boom') boom(c, f, k);
      else if (f.k === 'dash') dash(c, f, g, k, rt);
      else if (f.k === 'bolt') bolt(c, f, k, rt);
      else if (f.k === 'aura') aura(c, f, g, k, rt);
      else if (f.k === 'link') link(c, f, g, k, rt);
      else if (f.k === 'throw') thr(c, f, k, rt);
      else if (f.k === 'rcend') rcend(c, f, k);
    } catch (e) { if (typeof console !== 'undefined' && !f._err) { f._err = true; console.error('vfx', f.k, f.h, f.s, e); } }
    c.restore();
  }

  TR.Vfx = { bind: function (h) { H = h; }, recall: recall, draw: draw, proj: proj, zone: zone, dur: dur, KINDS: { sk: 1, imp: 1, muz: 1, boom: 1, dash: 1, bolt: 1, aura: 1, link: 1, throw: 1, rcend: 1 } };
})(typeof globalThis !== 'undefined' ? globalThis : this);
