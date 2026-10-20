/* Thai Realm — ไอคอนสกิลแบบ low-poly (วาดด้วยโค้ด ไม่ใช้ไฟล์ภาพ)
   แต่ละสกิลมีรหัสลวดลาย (icon) ใน TR.HEROES[].skills[] วาดเป็นหน้าหลายเหลี่ยมแบ่งเฉดแสงให้เข้ากับธีมโมเดล 3D
   ใช้ผ่าน TR.SkillIcon.url(def, slot) → data URL (แคชไว้) ไม่ยุ่งกับ DOM ของเกม */
(function (G) {
  'use strict';
  const TR = G.TR;
  const TAU = Math.PI * 2, LIGHT = -2.2; // ทิศแสงบนซ้าย (เรเดียน)

  function rgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function mix(a, b, t) { const A = rgb(a), B = rgb(b); return 'rgb(' + Math.round(A[0] + (B[0] - A[0]) * t) + ',' + Math.round(A[1] + (B[1] - A[1]) * t) + ',' + Math.round(A[2] + (B[2] - A[2]) * t) + ')'; }
  function shade(h, k) { const A = rgb(h); return 'rgb(' + Math.min(255, Math.round(A[0] * k)) + ',' + Math.min(255, Math.round(A[1] * k)) + ',' + Math.min(255, Math.round(A[2] * k)) + ')'; }

  /* หน้าหลายเหลี่ยม: แบ่งเป็นสามเหลี่ยมจากจุดศูนย์กลาง แต่ละหน้ารับแสงต่างกัน */
  function poly(c, pts, col, o) {
    o = o || {};
    let cx = 0, cy = 0; pts.forEach(function (p) { cx += p[0]; cy += p[1]; }); cx /= pts.length; cy /= pts.length;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const mx = (a[0] + b[0]) / 2 - cx, my = (a[1] + b[1]) / 2 - cy;
      const ang = Math.atan2(my, mx), k = 0.72 + 0.5 * Math.max(0, Math.cos(ang - LIGHT)) * (o.flat ? 0.3 : 1);
      c.beginPath(); c.moveTo(cx, cy); c.lineTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.closePath();
      c.fillStyle = shade(col, k); c.fill();
    }
    c.beginPath(); pts.forEach(function (p, i) { if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }); c.closePath();
    c.lineWidth = o.lw || 2.2; c.lineJoin = 'round'; c.strokeStyle = o.line || 'rgba(15,10,8,.85)'; c.stroke();
  }
  function ngon(cx, cy, r, n, rot, sy) { const o = []; for (let i = 0; i < n; i++) { const a = rot + i / n * TAU; o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * (sy || 1)]); } return o; }
  function star(cx, cy, r1, r2, n, rot) { const o = []; for (let i = 0; i < n * 2; i++) { const a = (rot || -Math.PI / 2) + i / (n * 2) * TAU, r = i % 2 ? r2 : r1; o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return o; }
  function rect(x, y, w, h, rot) { const cx = x + w / 2, cy = y + h / 2, ca = Math.cos(rot || 0), sa = Math.sin(rot || 0); return [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(function (p) { return [cx + p[0] * ca - p[1] * sa, cy + p[0] * sa + p[1] * ca]; }); }
  function bar(x1, y1, x2, y2, w) { const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1, nx = -dy / l * w / 2, ny = dx / l * w / 2; return [[x1 + nx, y1 + ny], [x2 + nx, y2 + ny], [x2 - nx, y2 - ny], [x1 - nx, y1 - ny]]; }
  function arrowHead(x, y, ang, len, w) { const ca = Math.cos(ang), sa = Math.sin(ang); return [[x + ca * len, y + sa * len], [x - sa * w, y + ca * w], [x + sa * w, y - ca * w]]; }
  function glow(c, x, y, r, col, a) { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(255,255,255,0)'); c.globalAlpha = a == null ? 0.55 : a; c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.globalAlpha = 1; }
  function drop(cx, cy, r) { const o = []; for (let i = 0; i <= 8; i++) { const a = Math.PI * 0.15 + i / 8 * (TAU - Math.PI * 0.3); o.push([cx + Math.cos(a + Math.PI / 2) * r, cy + r * 0.55 + Math.sin(a + Math.PI / 2) * r]); } o.unshift([cx, cy - r * 1.7]); return o; }
  function flame(cx, cy, s) { return [[cx, cy - 22 * s], [cx + 9 * s, cy - 8 * s], [cx + 16 * s, cy + 2 * s], [cx + 11 * s, cy + 16 * s], [cx, cy + 22 * s], [cx - 11 * s, cy + 16 * s], [cx - 16 * s, cy + 2 * s], [cx - 7 * s, cy - 6 * s]]; }
  function bolt(cx, cy, s) { return [[cx + 6 * s, cy - 24 * s], [cx - 12 * s, cy + 3 * s], [cx - 1 * s, cy + 3 * s], [cx - 7 * s, cy + 24 * s], [cx + 13 * s, cy - 6 * s], [cx + 2 * s, cy - 6 * s]]; }
  function shield(cx, cy, s) { return [[cx - 17 * s, cy - 16 * s], [cx, cy - 22 * s], [cx + 17 * s, cy - 16 * s], [cx + 15 * s, cy + 6 * s], [cx, cy + 22 * s], [cx - 15 * s, cy + 6 * s]]; }
  function fistShape(c, x, y, s, col) {
    poly(c, rect(x - 13 * s, y - 6 * s, 26 * s, 20 * s, 0), col);
    for (let i = 0; i < 4; i++) poly(c, rect(x - 13 * s + i * 6.6 * s, y - 14 * s, 6.2 * s, 10 * s, 0), mix(col, '#ffffff', 0.12));
    poly(c, rect(x - 18 * s, y - 3 * s, 7 * s, 13 * s, -0.4), mix(col, '#000000', 0.12));
  }
  function pot(c, x, y, s, col, liquid) {
    poly(c, [[x - 18 * s, y - 6 * s], [x + 18 * s, y - 6 * s], [x + 13 * s, y + 16 * s], [x - 13 * s, y + 16 * s]], col);
    poly(c, ngon(x, y - 6 * s, 18 * s, 10, 0, 0.32), liquid || '#ffb74d');
    poly(c, rect(x - 24 * s, y - 4 * s, 7 * s, 4 * s, 0), mix(col, '#000', 0.2)); poly(c, rect(x + 17 * s, y - 4 * s, 7 * s, 4 * s, 0), mix(col, '#000', 0.2));
  }
  function swordShape(c, x1, y1, x2, y2, w, blade, hilt) {
    const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l, nx = -uy, ny = ux;
    poly(c, [[x1 + ux * l * 0.25 + nx * w, y1 + uy * l * 0.25 + ny * w], [x2, y2], [x1 + ux * l * 0.25 - nx * w, y1 + uy * l * 0.25 - ny * w], [x1 + ux * l * 0.18, y1 + uy * l * 0.18]], blade || '#dfe8ee');
    poly(c, bar(x1 + ux * l * 0.2 - nx * w * 2.2, y1 + uy * l * 0.2 - ny * w * 2.2, x1 + ux * l * 0.2 + nx * w * 2.2, y1 + uy * l * 0.2 + ny * w * 2.2, w * 0.9), hilt || '#ffca28');
    poly(c, bar(x1, y1, x1 + ux * l * 0.2, y1 + uy * l * 0.2, w * 0.8), '#5d4037');
  }
  function burstRays(c, x, y, r1, r2, n, col, rot) { poly(c, star(x, y, r2, r1, n, rot || 0), col, { lw: 1.6 }); }

  const ICONS = {
    parry: function (c, a) { poly(c, shield(50, 50, 1.5), '#90a4ae'); poly(c, shield(50, 50, 1.0), '#cfd8dc', { lw: 1.4 }); swordShape(c, 28, 76, 72, 24, 3.2); burstRays(c, 68, 30, 5, 13, 6, '#fff59d'); },
    lunge: function (c, a) { swordShape(c, 22, 80, 78, 28, 4); poly(c, bar(10, 88, 32, 70, 4), a, { flat: 1, lw: 1 }); poly(c, bar(6, 76, 24, 62, 3), mix(a, '#fff', 0.4), { flat: 1, lw: 1 }); poly(c, bar(18, 92, 38, 78, 3), mix(a, '#fff', 0.4), { flat: 1, lw: 1 }); },
    bloodrage: function (c, a) { glow(c, 50, 50, 44, '#ff1744'); poly(c, drop(50, 42, 17), '#e53935'); poly(c, [[34, 70], [50, 56], [66, 70], [50, 62]], '#b71c1c'); poly(c, star(50, 56, 12, 5, 8, 0), '#ffeb3b', { lw: 1 }); },
    arrow: function (c, a) { poly(c, bar(18, 82, 70, 30, 3.2), '#a1887f'); poly(c, arrowHead(82, 18, -0.785, 16, 8), '#cfd8dc'); poly(c, [[14, 80], [24, 70], [20, 90]], '#e0e0e0', { lw: 1 }); poly(c, [[24, 90], [30, 76], [14, 82]], '#bdbdbd', { lw: 1 }); },
    spikes: function (c, a) { poly(c, ngon(50, 76, 34, 10, 0, 0.34), '#8d6e63'); for (let i = 0; i < 5; i++) { const x = 24 + i * 13, h = 30 + (i % 2) * 14; poly(c, [[x - 6, 76], [x, 76 - h], [x + 6, 76]], '#cfd8dc', { lw: 1.4 }); } poly(c, bar(14, 80, 86, 80, 6), '#6d4c41', { flat: 1 }); },
    arrowrain: function (c, a) { for (let i = 0; i < 4; i++) { const x = 22 + i * 18; poly(c, bar(x - 6, 20, x + 6, 66, 3), '#a1887f', { flat: 1, lw: 1.2 }); poly(c, arrowHead(x + 8, 74, 1.9, 13, 6), '#cfd8dc', { lw: 1.4 }); } glow(c, 50, 82, 30, a, 0.35); },
    herbpot: function (c, a) { pot(c, 50, 58, 1.3, '#8d6e63', '#7cb342'); for (let i = 0; i < 3; i++) poly(c, [[50 + (i - 1) * 9, 38], [50 + (i - 1) * 9 + 7, 22 - i % 2 * 5], [50 + (i - 1) * 9 + 11, 34]], '#9ccc65', { lw: 1.4 }); glow(c, 50, 30, 20, '#c5e1a5', 0.4); },
    purge: function (c, a) { poly(c, drop(50, 40, 20), '#80cbc4'); poly(c, bar(30, 30, 70, 74, 7), '#e53935', { flat: 1 }); poly(c, bar(70, 30, 30, 74, 7), '#e53935', { flat: 1 }); glow(c, 50, 50, 40, '#b2ebf2', 0.3); },
    lifeburst: function (c, a) { glow(c, 50, 50, 46, '#69f0ae'); poly(c, star(50, 50, 40, 22, 8, 0.2), '#43a047'); poly(c, [[44, 28], [56, 28], [56, 44], [72, 44], [72, 56], [56, 56], [56, 72], [44, 72], [44, 56], [28, 56], [28, 44], [44, 44]], '#e8f5e9'); },
    ramtusk: function (c, a) { poly(c, [[14, 66], [44, 28], [74, 30], [62, 54], [34, 74]], '#9e9e9e'); poly(c, [[44, 46], [88, 30], [70, 56], [52, 60]], '#fff8e1'); poly(c, [[44, 56], [90, 66], [66, 72], [50, 68]], '#fff8e1'); poly(c, bar(8, 88, 30, 72, 4), a, { flat: 1, lw: 1 }); poly(c, bar(4, 76, 20, 64, 3), mix(a, '#fff', 0.4), { flat: 1, lw: 1 }); },
    hide: function (c, a) { poly(c, shield(50, 50, 1.6), '#8d6e63'); poly(c, shield(50, 50, 1.1), '#a1887f', { lw: 1.4 }); for (let i = 0; i < 3; i++) poly(c, ngon(40 + i * 10, 44 + (i % 2) * 8, 3.2, 6, 0), '#d7ccc8', { lw: 1 }); poly(c, bar(36, 66, 64, 66, 3), '#5d4037', { flat: 1 }); },
    stomp: function (c, a) { poly(c, ngon(50, 70, 40, 12, 0, 0.36), '#8d6e63'); poly(c, ngon(50, 70, 26, 12, 0, 0.36), '#6d4c41', { lw: 1.2 }); poly(c, [[34, 22], [66, 22], [70, 54], [30, 54]], '#9e9e9e'); poly(c, [[26, 54], [74, 54], [78, 66], [22, 66]], '#757575'); burstRays(c, 50, 70, 24, 44, 10, 'rgba(255,224,130,.9)', 0.1); },
    fireseal: function (c, a) { poly(c, ngon(50, 50, 40, 8, 0.4), '#4e342e'); poly(c, star(50, 50, 32, 14, 6, 0.3), '#ff7043', { lw: 1.4 }); poly(c, flame(50, 50, 1.0), '#ffca28'); poly(c, flame(50, 54, 0.55), '#fff8e1', { lw: 1 }); },
    wallrune: function (c, a) { for (let i = 0; i < 3; i++) poly(c, [[24 + i * 18, 76], [24 + i * 18, 32 + i % 2 * 6], [33 + i * 18, 24 + i % 2 * 6], [42 + i * 18, 32 + i % 2 * 6], [42 + i * 18, 76]], '#4fc3f7'); poly(c, bar(18, 80, 82, 80, 6), '#0277bd', { flat: 1 }); glow(c, 50, 50, 40, '#81d4fa', 0.4); poly(c, star(50, 52, 8, 3.5, 4, 0.8), '#e1f5fe', { lw: 1 }); },
    spellrain: function (c, a) { poly(c, ngon(38, 30, 22, 8, 0, 0.7), '#7e57c2'); poly(c, ngon(62, 26, 18, 8, 0, 0.7), '#9575cd'); for (let i = 0; i < 4; i++) { const x = 26 + i * 16; poly(c, bar(x - 2, 52, x + 6, 66 + (i % 2) * 8, 3.4), '#ce93d8', { flat: 1, lw: 1 }); poly(c, gemSmall(x + 7, 74 + (i % 2) * 8), '#fff176', { lw: 1 }); } },
    fists: function (c, a) { fistShape(c, 38, 56, 1.0, '#f1caa0'); fistShape(c, 64, 46, 0.85, '#e0b080'); burstRays(c, 76, 30, 3, 9, 6, '#fff59d'); },
    knee: function (c, a) { poly(c, bar(24, 86, 46, 46, 14), '#f1caa0'); poly(c, bar(46, 46, 74, 30, 12), '#e0b080'); poly(c, ngon(44, 48, 9, 8, 0), '#f5d3ac'); burstRays(c, 74, 26, 5, 15, 8, '#fff59d'); poly(c, bar(10, 56, 30, 56, 3), a, { flat: 1, lw: 1 }); },
    combostar: function (c, a) { glow(c, 50, 50, 46, '#ffd54f'); poly(c, star(50, 50, 40, 17, 5), '#ffb300'); fistShape(c, 50, 52, 0.62, '#ffe0b2'); },
    sniper: function (c, a) { poly(c, ngon(50, 50, 38, 12, 0), 'rgba(0,0,0,0.0)', { lw: 3, line: '#b0bec5' }); poly(c, bar(50, 6, 50, 34, 4), '#eceff1', { flat: 1 }); poly(c, bar(50, 66, 50, 94, 4), '#eceff1', { flat: 1 }); poly(c, bar(6, 50, 34, 50, 4), '#eceff1', { flat: 1 }); poly(c, bar(66, 50, 94, 50, 4), '#eceff1', { flat: 1 }); poly(c, ngon(50, 50, 7, 8, 0), '#ff5252'); },
    camo: function (c, a) { poly(c, ngon(50, 50, 38, 10, 0.2), '#556b2f'); poly(c, ngon(38, 40, 14, 6, 0), '#6b8e23', { lw: 1 }); poly(c, ngon(60, 58, 16, 6, 1), '#3b4a21', { lw: 1 }); poly(c, ngon(62, 34, 9, 6, 0.4), '#8f9779', { lw: 1 }); poly(c, [[28, 56], [50, 40], [72, 56], [50, 64]], '#212121', { lw: 1.2 }); poly(c, ngon(50, 52, 5, 6, 0), '#ffeb3b', { lw: 1 }); },
    crosshair: function (c, a) { poly(c, ngon(50, 54, 30, 12, 0), 'rgba(0,0,0,0)', { lw: 3, line: '#ff5252' }); poly(c, bar(50, 14, 50, 36, 4), '#ff5252', { flat: 1 }); poly(c, bar(50, 72, 50, 94, 4), '#ff5252', { flat: 1 }); poly(c, bar(10, 54, 32, 54, 4), '#ff5252', { flat: 1 }); poly(c, bar(68, 54, 90, 54, 4), '#ff5252', { flat: 1 }); poly(c, star(50, 54, 9, 3.5, 4, 0.78), '#ffeb3b', { lw: 1 }); },
    horn: function (c, a) { poly(c, [[16, 40], [58, 24], [72, 22], [72, 78], [58, 76], [16, 60]], '#ffb300'); poly(c, [[16, 40], [16, 60], [8, 54], [8, 46]], '#8d6e63'); for (let i = 0; i < 3; i++) poly(c, ngon(80 + i * 6, 50, 7 + i * 5, 6, 0, 1.6), 'rgba(0,0,0,0)', { lw: 2.2, line: '#fff59d' }); },
    linkshield: function (c, a) { poly(c, shield(36, 56, 1.0), '#42a5f5'); poly(c, shield(66, 46, 1.0), '#ffb74d'); poly(c, ngon(50, 52, 9, 8, 0), '#eceff1'); poly(c, bar(40, 52, 60, 52, 4), '#fff59d', { flat: 1 }); },
    unity: function (c, a) { for (let i = 0; i < 3; i++) { const an = -Math.PI / 2 + i * TAU / 3, x = 50 + Math.cos(an) * 22, y = 54 + Math.sin(an) * 22; poly(c, shield(x, y, 0.55), ['#42a5f5', '#66bb6a', '#ffb74d'][i], { lw: 1.6 }); } poly(c, star(50, 54, 12, 6, 6, 0), '#fff59d', { lw: 1.4 }); glow(c, 50, 54, 40, '#fff59d', 0.3); },
    dagger: function (c, a) { swordShape(c, 22, 82, 76, 24, 3.4, '#cfd8dc', '#b71c1c'); poly(c, ngon(22, 82, 5, 8, 0), '#5d4037', { lw: 1.2 }); burstRays(c, 76, 24, 3, 11, 6, '#ff5252'); },
    hook: function (c, a) { poly(c, [[46, 14], [66, 22], [74, 44], [62, 62], [42, 66], [32, 52], [44, 52], [50, 56], [60, 52], [64, 44], [56, 32], [44, 28]], '#cfd8dc'); poly(c, ngon(46, 16, 8, 8, 0), 'rgba(0,0,0,0)', { lw: 3, line: '#90a4ae' }); for (let i = 0; i < 4; i++) poly(c, ngon(22 + i * 6, 84 - i * 9, 4, 6, 0.3), '#78909c', { lw: 1.2 }); },
    execute: function (c, a) { poly(c, ngon(50, 50, 36, 10, 0.1), '#212121'); poly(c, [[30, 40], [50, 28], [70, 40], [66, 62], [50, 74], [34, 62]], '#eceff1'); poly(c, [[38, 46], [46, 46], [44, 56], [38, 54]], '#212121', { lw: 1 }); poly(c, [[54, 46], [62, 46], [62, 54], [56, 56]], '#212121', { lw: 1 }); poly(c, bar(42, 66, 58, 66, 4), '#212121', { flat: 1 }); burstRays(c, 76, 24, 4, 14, 8, '#ff1744'); },
    riceball: function (c, a) { poly(c, [[50, 24], [76, 66], [24, 66]], '#fafafa'); poly(c, [[36, 52], [64, 52], [70, 66], [30, 66]], '#263238'); poly(c, ngon(50, 70, 28, 8, 0, 0.3), '#e0e0e0', { lw: 1.2 }); glow(c, 50, 30, 22, '#fff59d', 0.4); },
    noodlepot: function (c, a) { pot(c, 50, 60, 1.25, '#78909c', '#ffe082'); for (let i = 0; i < 3; i++) poly(c, bar(36 + i * 14, 44, 40 + i * 14, 24 - i % 2 * 6, 3), 'rgba(255,255,255,.65)', { flat: 1, lw: 0.8 }); glow(c, 50, 36, 26, '#ffe0b2', 0.35); },
    feast: function (c, a) { poly(c, ngon(50, 66, 38, 14, 0, 0.4), '#8d6e63'); poly(c, ngon(50, 62, 32, 14, 0, 0.4), '#d7ccc8', { lw: 1.2 }); poly(c, ngon(36, 54, 11, 8, 0), '#ef5350'); poly(c, ngon(62, 56, 11, 8, 0), '#ffee58'); poly(c, ngon(50, 42, 12, 8, 0), '#66bb6a'); poly(c, [[44, 20], [56, 20], [56, 28], [64, 28], [64, 36], [56, 36], [56, 44], [44, 44], [44, 36], [36, 36], [36, 28], [44, 28]].map(function (p) { return [p[0] * 0.8 + 10, p[1] * 0.8 + 2]; }), '#e8f5e9', { lw: 1.2 }); },
    throttle: function (c, a) { poly(c, ngon(34, 66, 20, 10, 0), '#37474f'); poly(c, ngon(34, 66, 11, 10, 0), '#90a4ae', { lw: 1.2 }); poly(c, ngon(74, 66, 14, 10, 0), '#37474f'); poly(c, bar(34, 66, 62, 44, 6), '#ff7043', { flat: 1 }); poly(c, bar(62, 44, 76, 38, 4), '#cfd8dc', { flat: 1 }); for (let i = 0; i < 3; i++) poly(c, bar(4, 40 + i * 10, 22 + (i % 2) * 6, 40 + i * 10, 3), a, { flat: 1, lw: 1 }); },
    swerve: function (c, a) { poly(c, [[16, 70], [30, 40], [46, 52], [62, 26], [84, 22], [74, 40], [66, 46], [50, 74], [38, 62], [28, 82]], '#29b6f6'); poly(c, arrowHead(80, 24, -0.6, 14, 8), '#e1f5fe'); glow(c, 50, 50, 40, '#80d8ff', 0.3); },
    rush: function (c, a) { for (let i = 0; i < 3; i++) { const o = i * 22; poly(c, [[10 + o * 0.6, 62 - i * 14], [38 + o * 0.6, 40 - i * 14], [32 + o * 0.6, 56 - i * 14], [52 + o * 0.6, 56 - i * 14], [28 + o * 0.6, 74 - i * 14], [34 + o * 0.6, 62 - i * 14]], ['#ffa726', '#ff7043', '#ef5350'][i], { lw: 1.6 }); } burstRays(c, 82, 20, 4, 12, 6, '#fff59d'); },
    sparks: function (c, a) { poly(c, bolt(36, 46, 1.1), '#fff176'); poly(c, bolt(66, 54, 0.8), '#4dd0e1'); poly(c, ngon(78, 22, 6, 6, 0), '#e1f5fe', { lw: 1 }); poly(c, ngon(18, 78, 5, 6, 0), '#e1f5fe', { lw: 1 }); glow(c, 50, 50, 44, '#81d4fa', 0.3); },
    transformer: function (c, a) { poly(c, [[26, 30], [74, 30], [74, 76], [26, 76]], '#78909c'); poly(c, [[30, 36], [70, 36], [70, 70], [30, 70]], '#546e7a', { lw: 1.2 }); poly(c, bolt(50, 54, 0.9), '#ffee58'); poly(c, ngon(34, 22, 4, 6, 0), '#eceff1'); poly(c, ngon(66, 22, 4, 6, 0), '#eceff1'); poly(c, bar(34, 26, 34, 30, 3), '#cfd8dc', { flat: 1 }); poly(c, bar(66, 26, 66, 30, 3), '#cfd8dc', { flat: 1 }); glow(c, 50, 54, 34, '#4dd0e1', 0.3); },
    blackout: function (c, a) { poly(c, ngon(50, 46, 38, 12, 0), '#263238'); poly(c, [[40, 20], [60, 20], [64, 40], [56, 46], [56, 56], [44, 56], [44, 46], [36, 40]], '#37474f', { lw: 1.4 }); poly(c, bar(42, 60, 58, 60, 4), '#78909c', { flat: 1 }); poly(c, bolt(70, 66, 0.8), '#fff176'); poly(c, bar(34, 16, 66, 70, 5), 'rgba(255,82,82,.9)', { flat: 1, lw: 1 }); }
  };
  function gemSmall(x, y) { return [[x, y - 6], [x + 4, y], [x, y + 6], [x - 4, y]]; }


  // ไอคอนปุ่มสั่งตี / กลับพระนคร / สเปล (ใช้พื้นหลังวงเดียวกับไอคอนสกิล)
  function rotAbout(pts, cx, cy, ang) { const ca = Math.cos(ang), sa = Math.sin(ang); return pts.map(function (p) { const x = p[0] - cx, y = p[1] - cy; return [cx + x * ca - y * sa, cy + x * sa + y * ca]; }); }
  Object.assign(ICONS, {
    atkminion: function (c) { swordShape(c, 22, 86, 78, 30, 3.4); poly(c, [[28, 62], [30, 42], [50, 28], [70, 42], [72, 62]], '#8d6e63'); poly(c, [[44, 28], [50, 14], [56, 28]], '#ef5350', { lw: 1 }); poly(c, bar(22, 64, 78, 64, 9), '#bcaaa4'); poly(c, rect(42, 66, 16, 12), '#5d4037', { flat: 1 }); },
    atktower: function (c) { poly(c, rect(32, 54, 36, 32), '#90a4ae'); poly(c, rect(44, 66, 12, 20), '#37474f', { flat: 1 }); poly(c, [[20, 54], [50, 22], [80, 54]], '#ffb300'); poly(c, [[44, 22], [50, 10], [56, 22]], '#ef5350', { lw: 1 }); swordShape(c, 20, 90, 82, 36, 3); },
    recall: function (c) { glow(c, 50, 50, 46, '#4fc3f7'); poly(c, ngon(50, 82, 34, 14, 0, 0.24), '#4fc3f7', { flat: 1, lw: 1 }); poly(c, rect(36, 56, 28, 22), '#ffe0b2'); poly(c, [[24, 58], [50, 42], [76, 58]], '#ffb300'); poly(c, [[30, 46], [50, 32], [70, 46]], '#ffa000'); poly(c, [[38, 34], [50, 20], [62, 34]], '#ff8f00'); },
    sp_heal: function (c) { pot(c, 50, 60, 1.2, '#a1887f', '#66bb6a'); poly(c, rect(46, 12, 8, 24), '#e8f5e9', { lw: 1 }); poly(c, rect(38, 20, 24, 8), '#e8f5e9', { lw: 1 }); },
    sp_punish: function (c) { glow(c, 50, 50, 44, '#ffca28'); burstRays(c, 50, 50, 14, 38, 8, '#ff7043'); poly(c, bolt(50, 50, 1.5), '#fff176'); },
    sp_flash: function (c) { poly(c, bar(14, 36, 66, 36, 6), '#80deea', { flat: 1 }); poly(c, bar(26, 52, 80, 52, 7), '#4dd0e1', { flat: 1 }); poly(c, bar(12, 68, 58, 68, 6), '#80deea', { flat: 1 }); poly(c, arrowHead(90, 52, 0, 16, 12), '#e0f7fa'); },
    sp_sprint: function (c) { poly(c, ngon(50, 30, 30, 8, 0.2, 0.34), '#b2dfdb'); poly(c, ngon(54, 50, 24, 8, 0.2, 0.34), '#80cbc4'); poly(c, ngon(48, 68, 18, 8, 0.2, 0.34), '#4db6ac'); poly(c, ngon(52, 82, 10, 8, 0.2, 0.34), '#26a69a'); },
    sp_purify: function (c) { [-64, -32, 0, 32, 64].forEach(function (d, i) { poly(c, rotAbout([[50, 76], [39, 50], [50, 22], [61, 50]], 50, 76, d * Math.PI / 180), i === 2 ? '#fce4ec' : '#f8bbd0', { lw: 1.2 }); }); poly(c, ngon(50, 76, 8, 6, 0, 1), '#ffd54f', { lw: 1 }); },
    sp_barrier: function (c) { glow(c, 50, 50, 44, '#4dd0e1'); poly(c, shield(50, 50, 1.8), '#00acc1'); poly(c, shield(50, 50, 1.2), '#b2ebf2', { lw: 1.4 }); poly(c, star(50, 50, 10, 4, 4, 0), '#fff', { lw: 1 }); },
    sp_conch: function (c) { poly(c, ngon(44, 56, 28, 7, 0.4, 0.9), '#ffe0b2'); poly(c, ngon(44, 56, 16, 6, 0, 0.9), '#ffcc80', { lw: 1 }); poly(c, [[60, 58], [88, 44], [86, 74]], '#ffe0b2'); burstRays(c, 86, 30, 4, 11, 5, '#fff59d'); }
  });
  const MOTIF_COL = {
    atkminion: ['#ffb74d', '#6d4c41'], atktower: ['#ffcc80', '#455a64'], recall: ['#4fc3f7', '#0d3c61'],
    sp_heal: ['#81c784', '#1b5e20'], sp_punish: ['#ffca28', '#8c2f00'], sp_flash: ['#4dd0e1', '#004d60'], sp_sprint: ['#80cbc4', '#004d40'],
    sp_purify: ['#f48fb1', '#6a1b4d'], sp_barrier: ['#4dd0e1', '#01579b'], sp_conch: ['#ffcc80', '#6d4c41']
  };
  const mcache = {};
  function urlMotif(motif, size) {
    size = size || 96; const key = motif + '_' + size;
    if (mcache[key] !== undefined) return mcache[key];
    if (typeof document === 'undefined') return '';
    const col = MOTIF_COL[motif] || ['#ffd54f', '#5c6bc0'];
    const cv = document.createElement('canvas'); cv.width = cv.height = size;
    try { draw(cv.getContext('2d'), motif, size, { accent: col[0], body: col[1] }, false); mcache[key] = cv.toDataURL('image/png'); } catch (e) { mcache[key] = ''; }
    return mcache[key];
  }

  // วาดไอคอนลงแคนวาสขนาด size (พื้นหลังวงกลม + ลวดลาย + ขอบสีฮีโร่)
  function draw(c, motif, size, colors, isUlt) {
    const acc = (colors && colors.accent) || '#ffd54f', body = (colors && colors.body) || '#5c6bc0';
    c.save(); c.clearRect(0, 0, size, size); c.scale(size / 100, size / 100);
    // พื้นหลังหน้าหลายเหลี่ยม
    const bg = ngon(50, 50, 49, 16, 0.2);
    poly(c, bg, mix(body, '#10131a', 0.62), { lw: 0.01 });
    c.save(); c.beginPath(); bg.forEach(function (p, i) { if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }); c.closePath(); c.clip();
    const g = c.createRadialGradient(36, 30, 4, 50, 50, 62); g.addColorStop(0, mix(acc, '#ffffff', 0.25)); g.addColorStop(0.55, mix(acc, '#10131a', 0.6)); g.addColorStop(1, 'rgba(8,10,16,.95)');
    c.globalAlpha = 0.62; c.fillStyle = g; c.fillRect(0, 0, 100, 100); c.globalAlpha = 1;
    const fn = ICONS[motif];
    if (fn) { c.translate(0, 0); fn(c, acc); }
    c.restore();
    c.lineWidth = isUlt ? 5 : 4; c.strokeStyle = isUlt ? '#ff7043' : acc;
    c.beginPath(); bg.forEach(function (p, i) { if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }); c.closePath(); c.stroke();
    c.restore();
  }

  const cache = {};
  function url(def, slot, size) {
    size = size || 96;
    const key = def.id + slot + '_' + size;
    if (cache[key]) return cache[key];
    if (typeof document === 'undefined') return '';
    const cv = document.createElement('canvas'); cv.width = cv.height = size;
    try { draw(cv.getContext('2d'), def.skills[slot].icon, size, def.colors, slot === 2); cache[key] = cv.toDataURL('image/png'); } catch (e) { cache[key] = ''; }
    return cache[key];
  }
  TR.SkillIcon = { draw: draw, url: url, urlMotif: urlMotif, motifs: Object.keys(ICONS) };
})(typeof globalThis !== 'undefined' ? globalThis : this);
