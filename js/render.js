/* Thai Realm — ตัววาดภาพ v2
   วาดเป็นเวกเตอร์เรียบ ความละเอียดตามหน้าจอจริง (คูณ devicePixelRatio) หน่วยในโค้ดคือ "หน่วยโลก" เหมือนตรรกะเกม
   ตัวละครเป็นโครงกระดูกง่าย ๆ (ขา แขน ลำตัว หัว อาวุธ) ขยับด้วยคลื่นไซน์ จึงลื่นที่ 60 เฟรมและไม่ซ้ำเฟรมเดิม
   ตรรกะเดินที่ 20 ครั้งต่อวินาที ภาพสอดแทรกตำแหน่งและเวลาให้ต่อเนื่อง */
(function (G) {
  'use strict';
  const TR = G.TR, CFG = TR.CFG;
  const VIEW_H = 360;                       // ความสูงที่มองเห็นเป็นหน่วยโลก (กว้างขยายตามอัตราส่วนจอ)
  const view = { w: 640, h: VIEW_H, z: 2, cw: 1280, ch: 720 };
  const TEAM = ['#4c8dff', '#ff5a4f'], TEAM_DARK = ['#1f4fbf', '#b3261e'], TEAM_LIGHT = ['#b7d3ff', '#ffc2bd'];
  const OUT = 'rgba(28,18,12,0.85)';
  const TAU = Math.PI * 2;

  /* ---------- ตัวช่วยสี/รูปทรง ---------- */
  const mixCache = new Map();
  function rgb(h) {
    if (h[0] === '#') { if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3]; return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
    return [128, 128, 128];
  }
  function mix(a, b, k) {
    const key = a + b + k;
    let r = mixCache.get(key);
    if (r) return r;
    const A = rgb(a), B = rgb(b);
    r = '#' + [0, 1, 2].map(function (i) { return ('0' + Math.round(A[i] + (B[i] - A[i]) * k).toString(16)).slice(-2); }).join('');
    mixCache.set(key, r);
    return r;
  }
  function dark(h, k) { return mix(h, '#000000', k == null ? 0.35 : k); }
  function lite(h, k) { return mix(h, '#ffffff', k == null ? 0.3 : k); }
  function hash(n) { n = Math.imul(n ^ 61, 2654435761) >>> 0; n = Math.imul(n ^ (n >>> 15), 2246822519) >>> 0; return (n >>> 0) / 4294967296; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function ease(t) { return t < 0 ? 0 : t > 1 ? 1 : 1 - Math.pow(1 - t, 3); }

  function rr(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function fillRR(c, x, y, w, h, r, col, ol) { rr(c, x, y, w, h, r); c.fillStyle = col; c.fill(); if (ol) { c.strokeStyle = OUT; c.lineWidth = 0.7; c.stroke(); } }
  function circ(c, x, y, r, col, ol) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = col; c.fill(); if (ol) { c.strokeStyle = OUT; c.lineWidth = 0.7; c.stroke(); } }
  function ell(c, x, y, rx, ry, col, a) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); if (a != null) c.globalAlpha = a; c.fillStyle = col; c.fill(); if (a != null) c.globalAlpha = 1; }
  function cap(c, x1, y1, x2, y2, w, col) {
    c.lineCap = 'round';
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2);
    c.strokeStyle = OUT; c.lineWidth = w + 1; c.stroke();
    c.strokeStyle = col; c.lineWidth = w; c.stroke();
  }
  function poly(c, pts, col, ol) {
    c.beginPath(); c.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
    c.closePath(); c.fillStyle = col; c.fill(); if (ol) { c.strokeStyle = OUT; c.lineWidth = 0.7; c.lineJoin = 'round'; c.stroke(); }
  }

  /* ================= ฮีโร่และมินเนียน (โครงกระดูก) ================= */
  const SKIN = '#f1caa0', SKIN_D = '#d9a877';
  const ROLE_SC = { tank: 1.2, fighter: 1.05, mage: 0.98, marksman: 1.0, assassin: 0.96, support: 1.0, minion: 0.66 };
  const BODY_W = { tank: 1.3, fighter: 1.08, mage: 0.95, marksman: 0.95, assassin: 0.88, support: 1.0, minion: 1.0 };
  const HERO_SC = 0.95;

  // อาวุธ: วาดในกรอบมือ แกน +x คือทิศที่แขนชี้ต่อไป
  const WEAPON = {
    nakdab: function (c, K) { cap(c, -2.5, 0, 3, 0, 1.7, K('#6d4c41')); fillRR(c, 2.6, -3.2, 1.9, 6.4, 0.7, K('#f1c40f'), true); poly(c, [4.5, -1.3, 17, -0.9, 19.5, 0, 17, 0.9, 4.5, 1.3], K('#e9eef2'), true); c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 0.4; c.beginPath(); c.moveTo(5, -0.3); c.lineTo(17, -0.2); c.stroke(); },
    phran: function (c, K) { c.lineCap = 'round'; c.strokeStyle = OUT; c.lineWidth = 2.4; c.beginPath(); c.arc(6, 0, 9, -1.15, 1.15); c.stroke(); c.strokeStyle = K('#8d6e63'); c.lineWidth = 1.5; c.stroke(); c.strokeStyle = 'rgba(240,240,230,.9)'; c.lineWidth = 0.5; c.beginPath(); c.moveTo(6 + 9 * Math.cos(-1.15), 9 * Math.sin(-1.15)); c.lineTo(6 + 9 * Math.cos(1.15), 9 * Math.sin(1.15)); c.stroke(); },
    mohya: function (c, K) { cap(c, -5, 0, 13, 0, 1.5, K('#8d6e63')); circ(c, 13.5, 0, 2.2, K('#7cb342'), true); poly(c, [13, -2, 17, -5, 16, -0.5], K('#9ccc65'), true); circ(c, 1, 2.8, 2.1, K('#d7a85a'), true); },
    kwan: function (c, K) { cap(c, -6, 0, 17, 0, 1.9, K('#5d4037')); c.lineCap = 'round'; c.strokeStyle = OUT; c.lineWidth = 2.6; c.beginPath(); c.arc(17, 3.2, 3.2, -1.6, 1.4); c.stroke(); c.strokeStyle = K('#cfd8dc'); c.lineWidth = 1.5; c.stroke(); },
    mothamma: function (c, K) { cap(c, -6, 0, 16, 0, 1.6, K('#4e342e')); circ(c, 17.2, 0, 3.2, K('#ffeb3b'), true); circ(c, 17.2, 0, 1.4, '#ffffff'); poly(c, [12, 0.8, 14, 6, 11, 5], K('#ce93d8'), true); },
    muay: function (c, K) { circ(c, 1.2, 0, 3, K('#d32f2f'), true); fillRR(c, -2, -2.6, 2.2, 5.2, 0.6, K('#ffffff'), true); },
    seri: function (c, K) { fillRR(c, -5, -1.6, 7, 3.4, 1.2, K('#8d6e63'), true); fillRR(c, 1, -1.1, 17, 2.1, 0.6, K('#455a64'), true); fillRR(c, 14, -2.1, 1.6, 1.4, 0.4, K('#263238')); },
    yai: function (c, K) { cap(c, -6, 0, 14, 0, 2.1, K('#6d4c41')); circ(c, 15, 0, 3.4, K('#8d6e63'), true); circ(c, 15, 0, 1.2, K('#ffd54f')); },
    spy: function (c, K) { poly(c, [0, -1.1, 10, -0.7, 12, 0, 10, 0.7, 0, 1.1], K('#cfd8dc'), true); fillRR(c, -2.5, -1.4, 3, 2.8, 0.8, K('#b71c1c'), true); },
    mae: function (c, K) { cap(c, 0, 0, 7, 0, 1.4, K('#5d4037')); circ(c, 11.5, 0, 5, K('#37474f'), true); circ(c, 11.5, 0, 3.7, K('#546e7a')); },
    win: function (c, K) { cap(c, -3, 0, 11, 0, 1.8, K('#90a4ae')); circ(c, 12.3, 0, 2.6, K('#78909c'), true); circ(c, 12.3, 0, 1, '#263238'); },
    chang: function (c, K) { cap(c, -4, 0, 12, 0, 1.7, K('#455a64')); fillRR(c, 11, -2.6, 5, 5.2, 1, K('#fdd835'), true); c.strokeStyle = '#fff59d'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(16, -1); c.lineTo(19, -3); c.lineTo(18, 0); c.lineTo(21, -1); c.stroke(); },
    minionM: function (c, K, col) { poly(c, [0, -1, 9, -0.8, 11, 0, 9, 0.8, 0, 1], K('#dfe6ea'), true); fillRR(c, -2, -1.5, 2.6, 3, 0.6, K('#795548'), true); },
    minionR: function (c, K) { c.lineCap = 'round'; c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.arc(4, 0, 6.5, -1.1, 1.1); c.stroke(); c.strokeStyle = K('#a1887f'); c.lineWidth = 1.2; c.stroke(); }
  };
  // หัว (ศูนย์กลางหัวอยู่ที่ 0,0 ในกรอบนี้ รัศมี 5)
  const HEAD = {
    nakdab: function (c, K, col) { hairCap(c, K, col.hair); fillRR(c, -5, -2.4, 10, 1.8, 0.6, K('#e53935'), true); poly(c, [-4.6, -1.8, -9, 0.5, -8, 1.8, -4.4, -0.4], K('#e53935'), true); },
    phran: function (c, K, col) { hairCap(c, K, col.hair); poly(c, [-9, -1.5, 0, -9.5, 9, -1.5, 5, -2.8, -5, -2.8], K('#c9a65a'), true); c.strokeStyle = 'rgba(80,50,10,.5)'; c.lineWidth = 0.4; c.beginPath(); c.moveTo(-5, -3); c.lineTo(0, -9); c.lineTo(5, -3); c.stroke(); },
    mohya: function (c, K, col) { hairCap(c, K, col.hair); circ(c, -1, -5.8, 2.3, K(col.hair), true); fillRR(c, -5, -2.7, 10, 1.7, 0.6, K('#9ccc65'), true); poly(c, [3, -5.5, 6, -9, 7, -5.5], K('#7cb342'), true); },
    kwan: function (c, K, col) { c.beginPath(); c.arc(0, -0.8, 5.6, Math.PI * 1.02, TAU * 1.0); c.closePath(); c.fillStyle = K('#ffb300'); c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.7; c.stroke(); c.strokeStyle = K('#e65100'); c.lineWidth = 0.6; c.beginPath(); c.moveTo(-5, -2); c.lineTo(4, -5.4); c.moveTo(-4, -0.6); c.lineTo(5.4, -3.4); c.stroke(); },
    mothamma: function (c, K, col) { hairCap(c, K, col.hair); poly(c, [-6, -2, -3, -4.4, -2.2, -11, 2.2, -11, 3, -4.4, 6, -2], K('#6a1b9a'), true); fillRR(c, -3.2, -6.5, 6.4, 1.2, 0.4, K('#ffeb3b')); },
    muay: function (c, K, col) { hairCap(c, K, col.hair); c.strokeStyle = OUT; c.lineWidth = 2.6; c.beginPath(); c.ellipse(0, -2.8, 5, 2.1, 0, Math.PI, TAU); c.stroke(); c.strokeStyle = K('#ffffff'); c.lineWidth = 1.8; c.stroke(); c.strokeStyle = K('#ef5350'); c.lineWidth = 0.7; c.stroke(); },
    seri: function (c, K, col) { c.beginPath(); c.arc(0, -0.6, 5.9, Math.PI, TAU); c.closePath(); c.fillStyle = K('#546e7a'); c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.7; c.stroke(); fillRR(c, -6.7, -1.2, 13.4, 1.4, 0.6, K('#455a64'), true); circ(c, 0, -4.2, 1, K('#ffd54f')); },
    yai: function (c, K, col) { hairCap(c, K, col.hair); fillRR(c, -5.4, -4.6, 10.8, 3.3, 1.4, K('#3e2723'), true); fillRR(c, -5.4, -2.4, 11.8, 1.2, 0.5, K('#ffd54f'), true); },
    spy: function (c, K, col) { hairCap(c, K, '#000000'); fillRR(c, -8, -3.1, 16, 1.5, 0.7, K('#1a1a1a'), true); fillRR(c, -4.5, -8, 9, 5.2, 1.6, K('#212121'), true); fillRR(c, -4.5, -4.2, 9, 1.2, 0.3, K('#b71c1c')); fillRR(c, -5, 1.3, 10, 3.6, 1.4, K('#263238'), true); },
    mae: function (c, K, col) { hairCap(c, K, col.hair); circ(c, -1, -6.2, 2.6, K(col.hair), true); fillRR(c, -5, -2.9, 10, 2, 0.8, K('#f48fb1'), true); circ(c, 4, -4.4, 1.2, K('#fff59d')); circ(c, 4, -4.4, 0.5, K('#ec407a')); },
    win: function (c, K, col) { c.beginPath(); c.arc(0, 0.2, 6.2, Math.PI * 0.95, TAU * 1.0); c.lineTo(5.6, 1.6); c.lineTo(-5.8, 1.6); c.closePath(); c.fillStyle = K('#ff7043'); c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.7; c.stroke(); fillRR(c, 0.8, -1.3, 5.6, 2.6, 1, K('#263238'), true); },
    chang: function (c, K, col) { hairCap(c, K, col.hair); c.beginPath(); c.arc(0, -1.2, 5.9, Math.PI, TAU); c.closePath(); c.fillStyle = K('#fdd835'); c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.7; c.stroke(); fillRR(c, -6.6, -1.4, 13.2, 1.4, 0.6, K('#f9a825'), true); circ(c, 4.4, -3.6, 1.2, K('#fffde7')); },
    minionM: function (c, K, col) { c.beginPath(); c.arc(0, -0.6, 5.7, Math.PI, TAU); c.closePath(); c.fillStyle = K(col.body); c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.7; c.stroke(); fillRR(c, -6, -1.1, 12, 1.4, 0.5, K(dark(col.body, 0.3)), true); },
    minionR: function (c, K, col) { hairCap(c, K, '#3e2723'); fillRR(c, -5.2, -3.1, 10.4, 1.9, 0.8, K(col.body), true); }
  };
  function hairCap(c, K, hair) {
    c.beginPath(); c.arc(0, -0.4, 5.4, Math.PI * 0.98, TAU * 1.0); c.lineTo(5, -1.2); c.quadraticCurveTo(0, -3.2, -5, -1.2); c.closePath();
    c.fillStyle = K(hair); c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.6; c.stroke();
  }
  // ลำตัวพิเศษ (ทับลำตัวพื้นฐาน)
  const BODY = {
    mohya: function (c, K, col, bw) { fillRR(c, -bw / 2 - 0.3, -3, bw + 0.6, 7.5, 1.5, K('#a5d66b'), true); fillRR(c, -1.5, -14, 3, 11, 0.5, K('#fff8e1')); },
    kwan: function (c, K, col, bw) { fillRR(c, -bw / 2 - 2.4, -15, 5.4, 4.4, 2, K('#ffb300'), true); fillRR(c, bw / 2 - 3, -15, 5.4, 4.4, 2, K('#ffb300'), true); fillRR(c, -bw / 2, -9.5, bw, 2.2, 0.5, K('#6d4c41')); },
    mothamma: function (c, K, col, bw) { poly(c, [-bw / 2, -2, bw / 2, -2, bw / 2 + 2.4, 5.5, -bw / 2 - 2.4, 5.5], K('#7b1fa2'), true); fillRR(c, -bw / 2, -9.8, bw, 1.6, 0.5, K('#ffeb3b')); },
    muay: function (c, K, col, bw) { fillRR(c, -bw / 2, -1.2, bw, 3.2, 1, K('#ffffff'), true); c.strokeStyle = K('#d32f2f'); c.lineWidth = 0.7; c.beginPath(); c.moveTo(-bw / 2, 0.4); c.lineTo(bw / 2, 0.4); c.stroke(); },
    seri: function (c, K, col, bw) { fillRR(c, -bw / 2, -14, bw, 2.6, 1, K('#cfd8dc'), true); fillRR(c, -bw / 2 - 0.5, -3.3, bw + 1, 1.8, 0.5, K('#5d4037'), true); },
    yai: function (c, K, col, bw) { c.strokeStyle = K('#ffd54f'); c.lineWidth = 1.1; c.beginPath(); c.arc(0, -13, 3.6, 0.2, Math.PI - 0.2); c.stroke(); fillRR(c, -1.3, -12, 2.6, 7, 0.8, K('#efebe9'), true); },
    spy: function (c, K, col, bw) { fillRR(c, -bw / 2, -14, bw, 3, 1.2, K('#b71c1c'), true); poly(c, [-bw / 2 - 1, -3, bw / 2 + 1, -3, bw / 2 + 2.6, 6, -bw / 2 - 2.6, 6], K('#1e272c'), true); },
    mae: function (c, K, col, bw) { fillRR(c, -bw / 2 + 0.6, -9, bw - 1.2, 11, 2, K('#fff59d'), true); fillRR(c, -bw / 2, -3, bw, 6, 1.5, K('#f06292'), true); },
    win: function (c, K, col, bw) { fillRR(c, -bw / 2, -11, bw, 8.6, 1.5, K('#ffab91'), true); c.fillStyle = K('#212121'); c.font = 'bold 4.6px sans-serif'; c.textAlign = 'center'; c.fillText('7', 0, -5.2); },
    chang: function (c, K, col, bw) { fillRR(c, -bw / 2, -14, bw, 15, 3, K('#fdd835'), true); fillRR(c, -bw / 2 - 0.4, -4.8, bw + 0.8, 2, 0.5, K('#455a64'), true); fillRR(c, 1, -10, 3.2, 3.2, 0.6, K('#455a64'), true); },
    minionM: function (c, K, col, bw) { fillRR(c, -bw / 2, -3.6, bw, 1.6, 0.4, K(dark(col.body, 0.3))); },
    minionR: function (c, K, col, bw) { fillRR(c, -bw / 2, -3.6, bw, 1.6, 0.4, K(dark(col.body, 0.3))); }
  };

  const IDENT = function (h) { return h; };
  const FLASHK = function (h) { return mix(h, '#ffffff', 0.78); };

  /* P = { id (สำหรับแอนิเมชัน), key (รหัสฮีโร่หรือ minionM/minionR), colors, role, vf, mv, ph, rt, atkP, castP, flash } */
  function rig(c, P) {
    const K = P.flash ? FLASHK : IDENT;
    const col = P.colors, role = P.role, bw = 10.4 * BODY_W[role];
    const mv = P.mv, ph = P.ph, rt = P.rt;
    const bob = -Math.abs(Math.sin(ph)) * 1.5 * mv + Math.sin(rt * 2.4 + P.id) * 0.38 * (1 - mv);
    const hipY = -9 + bob;
    const ap = P.atkP, atking = ap >= 0 && ap < 1;
    const swing = Math.sin(ph) * 0.8 * mv;
    const pants = K(dark(col.body, 0.45)), boot = K('#3b2a20');

    c.save();
    c.scale(P.vf, 1);
    // เงา
    ell(c, 0, 0.6, 8.2 * BODY_W[role] + 1, 2.6, 'rgba(0,0,0,0.28)');
    // ขา (ขาหลังก่อน)
    for (let s = 0; s < 2; s++) {
      const a = s === 0 ? -swing : swing;
      const lx = (s === 0 ? -1.9 : 1.9);
      const lift = Math.max(0, (s === 0 ? -Math.cos(ph) : Math.cos(ph))) * 1.6 * mv;
      const fx = lx + Math.sin(a) * 8.3, fy = Math.min(0, hipY + Math.cos(a) * 8.3 - lift);
      cap(c, lx, hipY, fx, fy, 3.4, pants);
      ell(c, fx + 1.2, fy, 2.7, 1.5, boot);
    }
    // ลำตัว + หัว + แขน หมุนเอียงรอบสะโพก
    let lean = 0.1 * mv;
    if (atking) lean += -0.14 + 0.4 * Math.sin(ap * Math.PI) * (ap < 0.5 ? -0.2 : 1);
    if (P.castP >= 0 && P.castP < 1) lean += -0.1 * Math.sin(P.castP * Math.PI);
    c.translate(0, hipY);
    c.rotate(lean);

    // แขนหลัง
    const backA = 0.2 - swing * 1.1;
    arm(c, K, col, -1.4, -12.3, backA, 0.35, null, P, true);
    // ลำตัว
    fillRR(c, -bw / 2, -14.5, bw, 15.4, 3.6, K(col.body), true);
    fillRR(c, -bw / 2 + 0.7, -13.8, bw - 1.4, 5.2, 2.6, K(lite(col.body, 0.18)));
    fillRR(c, -bw / 2, -1.2, bw, 2.1, 0.8, K(col.accent));
    const bx = BODY[P.key]; if (bx) bx(c, K, col, bw);
    // หัว
    const hx = 1.2, hy = -19.8;
    c.save(); c.translate(hx, hy);
    circ(c, 0, 0, 5.1, K(SKIN), true);
    ell(c, -1.6, 1.8, 2.6, 1.6, K(SKIN_D), 0.25);
    const hd = HEAD[P.key]; if (hd) hd(c, K, col);
    // หน้า
    circ(c, 2.5, 0.2, 0.85, '#1b1b1b'); circ(c, 2.8, -0.1, 0.25, '#fff');
    c.strokeStyle = 'rgba(60,30,20,.7)'; c.lineWidth = 0.45; c.beginPath(); c.moveTo(1.4, -1.5); c.lineTo(3.8, -1.2); c.stroke();
    if (atking) { c.beginPath(); c.arc(3.4, 2.6, 0.9, 0, Math.PI); c.stroke(); }
    c.restore();
    // แขนหน้า + อาวุธ
    let fa = 0.55 + swing * 1.0;
    let bend = 0.45;
    const casting = P.castP >= 0 && P.castP < 1;
    if (atking) { const e = ease(ap * 2.2); fa = ap < 0.28 ? -1.9 + (ap / 0.28) * -0.4 : -2.3 + e * 3.6 * Math.min(1, (ap - 0.28) / 0.35 + 0.01); if (ap > 0.7) fa = 1.3 - (ap - 0.7) / 0.3 * 0.75; bend = 0.15; }
    else if (casting) { fa = -1.5 - Math.sin(P.castP * Math.PI) * 0.5; bend = -0.1; }
    arm(c, K, col, 1.8, -12.3, fa, bend, WEAPON[P.key], P, false);
    c.restore();
    c.restore();
  }

  function arm(c, K, col, sx, sy, a1, bend, weapon, P, isBack) {
    const L1 = 5.0, L2 = 4.8;
    const ex = sx + Math.sin(a1) * L1, ey = sy + Math.cos(a1) * L1;
    const a2 = a1 + bend;
    const hx = ex + Math.sin(a2) * L2, hy = ey + Math.cos(a2) * L2;
    const slv = K(isBack ? dark(col.body, 0.18) : col.body);
    cap(c, sx, sy, ex, ey, 2.7, slv);
    const handCol = K(P.key === 'muay' ? '#d32f2f' : SKIN);
    cap(c, ex, ey, hx, hy, 2.3, K(isBack ? SKIN_D : SKIN));
    if (!isBack) {
      circ(c, hx, hy, 1.7, handCol, true);
      if (weapon) {
        c.save(); c.translate(hx, hy);
        let wa = Math.PI / 2 - a2 - 0.95;
        if (P.key === 'seri' || P.key === 'phran') wa = Math.PI / 2 - a2 - 1.45 + (P.atkP >= 0 && P.atkP < 1 ? -0.1 : 0);
        c.rotate(wa);
        weapon(c, K, col);
        c.restore();
        if (P.castP >= 0 && P.castP < 1) { const k = Math.sin(P.castP * Math.PI); c.globalAlpha = 0.65 * k; circ(c, hx + 3, hy - 3, 4.2 * k + 1, col.accent); c.globalAlpha = 1; }
      }
    }
  }

  /* ================= สถานะภาพ (ต่อเฟรม) ================= */
  const RS = { g: null, cam: { x: 0, y: 0, init: false }, parts: [], vf: {}, ph: {}, mv: {}, last: 0, fire: {}, dust: {}, eraPrev: 0, eraFade: 1, eraSeen: 0, rt: 0, fxSeen: new WeakSet() };
  const tileCache = {};

  function resetState(g) {
    RS.g = g; RS.cam.init = false; RS.parts.length = 0; RS.vf = {}; RS.ph = {}; RS.mv = {}; RS.fire = {}; RS.dust = {}; RS.eraSeen = g.era; RS.eraPrev = g.era; RS.eraFade = 1; RS.fxSeen = new WeakSet();
  }

  function resize(canvas, cssW, cssH) {
    const dpr = Math.min(G.devicePixelRatio || 1, 2);
    let cw = Math.max(320, Math.round(cssW * dpr)), ch = Math.max(180, Math.round(cssH * dpr));
    const maxPix = 2.6e6;
    if (cw * ch > maxPix) { const k = Math.sqrt(maxPix / (cw * ch)); cw = Math.round(cw * k); ch = Math.round(ch * k); }
    canvas.width = cw; canvas.height = ch;
    view.cw = cw; view.ch = ch; view.z = ch / VIEW_H; view.w = cw / view.z; view.h = VIEW_H;
    for (const k in tileCache) delete tileCache[k];
    return view;
  }

  /* ---------- ลายพื้นและถนน (วาดครั้งเดียวต่อยุค แล้วแคช) ---------- */
  const TILE = 256;
  function seeded(seed) { let s = seed >>> 0; return function () { s = (Math.imul(s ^ (s >>> 15), 2246822519) + 0x6D2B79F5) >>> 0; return (s >>> 0) / 4294967296; }; }
  function wrapped(t, x, y, r, fn) {
    for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
      const px = x + ox * TILE, py = y + oy * TILE;
      if (px < -r || px > TILE + r || py < -r || py > TILE + r) continue;
      fn(px, py);
    }
  }
  function groundTile(era) {
    const key = 'g' + era;
    if (tileCache[key]) return tileCache[key];
    const z = view.z, cv = document.createElement('canvas');
    cv.width = Math.ceil(TILE * z); cv.height = Math.ceil(TILE * z);
    const c = cv.getContext('2d'); c.scale(z, z);
    const E = TR.ERAS[era], rnd = seeded(1000 + era * 77);
    c.fillStyle = E.ground; c.fillRect(0, 0, TILE, TILE);
    // ปื้นสีนุ่ม ๆ
    for (let i = 0; i < 46; i++) {
      const x = rnd() * TILE, y = rnd() * TILE, r = 10 + rnd() * 26, a = 0.18 + rnd() * 0.22;
      const col = rnd() < 0.5 ? E.ground2 : lite(E.ground, 0.07);
      wrapped(TILE, x, y, r, function (px, py) { ell(c, px, py, r, r * (0.55 + rnd() * 0.3), col, a); });
    }
    if (era === 3) { // คอนกรีต: ช่องแผ่น + รอยร้าว
      c.strokeStyle = 'rgba(30,40,50,.22)'; c.lineWidth = 0.8;
      for (let i = 0; i <= TILE; i += 64) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, TILE); c.moveTo(0, i); c.lineTo(TILE, i); c.stroke(); }
      for (let i = 0; i < 9; i++) {
        let x = rnd() * TILE, y = rnd() * TILE; c.beginPath(); c.moveTo(x, y);
        for (let k = 0; k < 4; k++) { x += (rnd() - 0.5) * 16; y += (rnd() - 0.5) * 16; c.lineTo(x, y); }
        c.strokeStyle = 'rgba(30,40,50,.28)'; c.lineWidth = 0.6; c.stroke();
      }
    } else {
      // หญ้า/ดิน
      for (let i = 0; i < 220; i++) {
        const x = rnd() * TILE, y = rnd() * TILE, h = 2 + rnd() * 3.2;
        const col = era === 2 ? (rnd() < 0.5 ? '#8c8c6c' : '#6d6f55') : (rnd() < 0.55 ? lite(E.ground, 0.16) : dark(E.ground, 0.16));
        c.strokeStyle = col; c.lineWidth = 0.55; c.globalAlpha = 0.65;
        wrapped(TILE, x, y, 6, function (px, py) { c.beginPath(); c.moveTo(px, py); c.lineTo(px - 1, py - h); c.moveTo(px, py); c.lineTo(px + 1.2, py - h * 0.8); c.stroke(); });
      }
      c.globalAlpha = 1;
      if (era === 0 || era === 1) for (let i = 0; i < 16; i++) {
        const x = rnd() * TILE, y = rnd() * TILE, fc = ['#fff59d', '#f8bbd0', '#ffffff', '#ffcc80'][i % 4];
        wrapped(TILE, x, y, 3, function (px, py) { circ(c, px, py, 0.9, fc); circ(c, px, py, 0.35, '#e0a82e'); });
      }
      if (era === 2) for (let i = 0; i < 26; i++) { // หลุมโคลน/กรวด
        const x = rnd() * TILE, y = rnd() * TILE;
        wrapped(TILE, x, y, 8, function (px, py) { ell(c, px, py, 3 + rnd() * 4, 1.5 + rnd() * 1.5, 'rgba(60,45,30,.35)'); ell(c, px - 1, py - 0.7, 1.4, 0.7, '#a39f86'); });
      }
    }
    tileCache[key] = cv;
    return cv;
  }
  const ROAD_H = 128;
  function roadTile(era) {
    const key = 'r' + era;
    if (tileCache[key]) return tileCache[key];
    const z = view.z, cv = document.createElement('canvas');
    cv.width = Math.ceil(TILE * z); cv.height = Math.ceil(ROAD_H * z);
    const c = cv.getContext('2d'); c.scale(z, z);
    const E = TR.ERAS[era], rnd = seeded(5000 + era * 31);
    c.fillStyle = E.lane; c.fillRect(0, 0, TILE, ROAD_H);
    for (let i = 0; i < 40; i++) {
      const x = rnd() * TILE, y = 6 + rnd() * (ROAD_H - 12), r = 8 + rnd() * 18;
      for (let ox = -1; ox <= 1; ox++) ell(c, x + ox * TILE, y, r, r * 0.4, rnd() < 0.5 ? E.lane2 : lite(E.lane, 0.08), 0.35);
    }
    for (let i = 0; i < 90; i++) { // เม็ดกรวด
      const x = rnd() * TILE, y = 5 + rnd() * (ROAD_H - 10);
      for (let ox = -1; ox <= 1; ox++) ell(c, x + ox * TILE, y, 0.8 + rnd() * 1.2, 0.5 + rnd() * 0.7, rnd() < 0.5 ? dark(E.lane, 0.2) : lite(E.lane, 0.2), 0.7);
    }
    if (era === 3) { // ถนนลาดยาง: เส้นประกลาง
      c.fillStyle = 'rgba(255,255,255,.5)';
      for (let x = 20; x < TILE; x += 64) c.fillRect(x, ROAD_H / 2 - 0.7, 28, 1.4);
    } else { // รอยล้อเกวียน
      c.strokeStyle = 'rgba(70,50,30,.18)'; c.lineWidth = 2;
      for (const yy of [ROAD_H * 0.38, ROAD_H * 0.62]) { c.beginPath(); c.moveTo(0, yy); c.bezierCurveTo(TILE * 0.3, yy - 2, TILE * 0.6, yy + 2, TILE, yy); c.stroke(); }
    }
    // ขอบถนน
    const edge = c.createLinearGradient(0, 0, 0, 7); edge.addColorStop(0, 'rgba(0,0,0,.28)'); edge.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = edge; c.fillRect(0, 0, TILE, 7);
    c.save(); c.translate(0, ROAD_H); c.scale(1, -1); c.fillStyle = edge; c.fillRect(0, 0, TILE, 7); c.restore();
    tileCache[key] = cv;
    return cv;
  }

  /* ---------- ของประดับ ---------- */
  function drawProp(c, kind, x, y, hv, t) {
    const sway = Math.sin(t * 1.3 + hv * 20) * 0.9;
    switch (kind) {
      case 'tree':
        ell(c, x, y + 1, 9, 3, 'rgba(0,0,0,.2)');
        fillRR(c, x - 1.6, y - 11, 3.2, 12, 1, '#6d4c41', true);
        circ(c, x - 6 + sway * 0.4, y - 15, 7, '#357a2e', true); circ(c, x + 6 + sway * 0.4, y - 15, 7, '#3b862f', true);
        circ(c, x + sway, y - 21, 8.5, '#47993a', true); circ(c, x - 2 + sway, y - 23, 4, '#63b050');
        break;
      case 'pagoda':
        ell(c, x, y + 1, 10, 3, 'rgba(0,0,0,.2)');
        fillRR(c, x - 7, y - 5, 14, 5, 1, '#e8d9b0', true);
        poly(c, [x - 5, y - 5, x + 5, y - 5, x + 3.5, y - 14, x - 3.5, y - 14], '#f1e6c4', true);
        poly(c, [x - 3.5, y - 14, x + 3.5, y - 14, x + 2, y - 22, x - 2, y - 22], '#eadcb2', true);
        poly(c, [x - 2, y - 22, x + 2, y - 22, x, y - 33], '#e0b84a', true);
        c.strokeStyle = 'rgba(160,120,40,.5)'; c.lineWidth = 0.5; c.beginPath(); c.moveTo(x - 4, y - 9); c.lineTo(x + 4, y - 9); c.moveTo(x - 2.8, y - 17); c.lineTo(x + 2.8, y - 17); c.stroke();
        break;
      case 'sandbag':
        ell(c, x, y + 1, 12, 3, 'rgba(0,0,0,.22)');
        for (let i = 0; i < 3; i++) fillRR(c, x - 10 + i * 6.7, y - 4.5, 7, 4.5, 2, i % 2 ? '#a8956a' : '#9c8a5f', true);
        for (let i = 0; i < 2; i++) fillRR(c, x - 6.5 + i * 6.7, y - 9, 7, 4.5, 2, '#b3a074', true);
        c.strokeStyle = '#5d4037'; c.lineWidth = 1; c.beginPath(); c.moveTo(x + 13, y); c.lineTo(x + 13, y - 11); c.stroke();
        c.strokeStyle = 'rgba(40,40,40,.8)'; c.lineWidth = 0.5; c.beginPath(); c.moveTo(x + 13, y - 10); c.lineTo(x + 20, y - 8); c.lineTo(x + 24, y - 11); c.stroke();
        break;
      case 'building': {
        const hh = 20 + Math.floor(hv * 18);
        ell(c, x, y + 1, 13, 3.4, 'rgba(0,0,0,.22)');
        fillRR(c, x - 10, y - hh, 20, hh, 1.6, '#7a8695', true); fillRR(c, x - 10, y - hh, 20, 3, 1, '#5d6875');
        for (let wy = y - hh + 6; wy < y - 5; wy += 6.5) for (let wx = x - 7; wx < x + 6; wx += 6.5) fillRR(c, wx, wy, 3.8, 3.8, 0.6, hv > 0.5 ? '#ffe082' : '#37474f');
        break;
      }
      case 'lamp':
        ell(c, x, y + 1, 4, 1.4, 'rgba(0,0,0,.25)');
        cap(c, x, y, x, y - 17, 1.4, '#546e7a'); cap(c, x, y - 17, x + 4, y - 18, 1.2, '#546e7a'); circ(c, x + 4.5, y - 17.5, 1.7, '#fff59d');
        c.globalAlpha = 0.18; circ(c, x + 4.5, y - 17.5, 6, '#fff59d'); c.globalAlpha = 1;
        break;
      case 'rock':
        ell(c, x, y + 1, 8, 2.4, 'rgba(0,0,0,.2)'); poly(c, [x - 7, y, x - 4, y - 7, x + 2, y - 9, x + 7, y - 3, x + 6, y], '#8d8f8a', true); poly(c, [x - 4, y - 7, x + 2, y - 9, x, y - 4], '#a8aaa4');
        break;
    }
  }
  function propKind(era, hv, k) {
    if (era === 3) return hv < 0.35 ? 'tree' : (k % 3 === 0 ? 'lamp' : 'building');
    if (era === 2) return hv < 0.4 ? 'tree' : (hv < 0.62 ? 'rock' : 'sandbag');
    if (era === 1) return hv < 0.6 ? 'tree' : 'pagoda';
    return hv < 0.85 ? 'tree' : 'rock';
  }

  function drawGroundLayer(c, g, camX, camY, era, alpha, rt) {
    c.globalAlpha = alpha;
    const tile = groundTile(era), x0 = Math.floor(camX / TILE) * TILE, y0 = Math.floor(camY / TILE) * TILE;
    for (let x = x0; x < camX + view.w + 1; x += TILE) for (let y = y0; y < camY + view.h + 1; y += TILE) c.drawImage(tile, x, y, TILE + 0.6, TILE + 0.6);
    // ทางโค้งจากฐานไปเลนบน/ล่าง
    const E = TR.ERAS[era];
    c.lineCap = 'round';
    for (let team = 0; team < 2; team++) {
      const dir = team === 0 ? 1 : -1, bx = team === 0 ? 100 : CFG.W - 100, lx = team === 0 ? CFG.laneEntry : CFG.W - CFG.laneEntry;
      if (Math.abs(bx - (camX + view.w / 2)) > view.w / 2 + 700) continue;
      for (const l of [0, 2]) {
        const ly = CFG.lanes[l].y;
        for (let pass = 0; pass < 2; pass++) {
          c.beginPath(); c.moveTo(bx + dir * 40, CFG.baseY); c.bezierCurveTo(bx + dir * 300, CFG.baseY, lx - dir * 160, ly, lx, ly);
          c.strokeStyle = pass === 0 ? dark(E.lane, 0.22) : E.lane; c.lineWidth = pass === 0 ? 66 : 58; c.stroke();
        }
      }
    }
    // ถนนเลน
    const rt0 = roadTile(era);
    for (const L of CFG.lanes) {
      const top = L.y - ROAD_H / 2;
      if (top > camY + view.h || top + ROAD_H < camY) continue;
      for (let x = x0; x < camX + view.w + 1; x += TILE) c.drawImage(rt0, x, top, TILE + 0.6, ROAD_H);
    }
    // ของประดับ (ข้างทาง/ป่าระหว่างเลน)
    const CELL = 70;
    for (let cx = Math.floor(camX / CELL) - 1; cx < (camX + view.w) / CELL + 1; cx++) {
      for (let cy = Math.floor(camY / CELL) - 1; cy < (camY + view.h) / CELL + 2; cy++) {
        const hv = hash(cx * 73856093 ^ cy * 19349663 ^ 777);
        if (hv < 0.5) continue;
        const px = cx * CELL + hash(cx * 31 + cy * 7) * CELL, py = cy * CELL + hash(cx * 11 + cy * 53) * CELL;
        let bad = false;
        for (const L of CFG.lanes) if (Math.abs(py - L.y) < 74) bad = true;
        if ((px < 300 || px > CFG.W - 300) && Math.abs(py - CFG.baseY) < 330) bad = true;
        if (bad || py < 20 || py > CFG.H - 10 || px < 10 || px > CFG.W - 10) continue;
        drawProp(c, propKind(era, hv * 2 - 1 + (hv * 7 % 1) * 0.0, cx + cy), px, py, hash(cx + cy * 131), rt);
      }
    }
    c.globalAlpha = 1;
  }

  function drawBases(c, g, rt) {
    for (let team = 0; team < 2; team++) {
      const bx = team === 0 ? 100 : CFG.W - 100, by = CFG.baseY;
      const grad = c.createRadialGradient(bx, by, 10, bx, by, 150);
      grad.addColorStop(0, TEAM[team] + '66'); grad.addColorStop(0.6, TEAM[team] + '22'); grad.addColorStop(1, TEAM[team] + '00');
      c.fillStyle = grad; c.beginPath(); c.arc(bx, by, 150, 0, TAU); c.fill();
      c.strokeStyle = TEAM[team]; c.globalAlpha = 0.55; c.lineWidth = 1.4;
      c.setLineDash([10, 8]); c.lineDashOffset = -rt * 8 * (team ? -1 : 1);
      c.beginPath(); c.arc(bx, by, 118, 0, TAU); c.stroke();
      c.setLineDash([3, 7]); c.lineDashOffset = rt * 10 * (team ? -1 : 1);
      c.beginPath(); c.arc(bx, by, 96, 0, TAU); c.stroke();
      c.setLineDash([]); c.globalAlpha = 1;
    }
  }

  /* ================= ป้อม ================= */
  function drawTower(c, g, u, x, y, rt) {
    const era = g.era, tc = TEAM[u.team], td = TEAM_DARK[u.team], tl = TEAM_LIGHT[u.team], king = !!u.king;
    const k = king ? 1.35 : 1;
    c.save(); c.translate(x, y); c.scale(k, k);
    if (u.dead) {
      ell(c, 0, 1, 20, 6, 'rgba(0,0,0,.3)');
      poly(c, [-17, 1, -13, -6, -6, -9, 2, -5, 9, -8, 17, 0], '#7d746a', true); poly(c, [-9, -6, -2, -12, 5, -7, 2, 0], '#6b6258', true); poly(c, [4, -8, 10, -10, 13, -2, 7, -1], '#8b8176', true);
      if (hash(u.id) > 0.4) { c.globalAlpha = 0.25 + 0.15 * Math.sin(rt * 2 + u.id); circ(c, 2 + Math.sin(rt + u.id) * 3, -14 - (rt * 4 + u.id) % 8, 4, '#555'); c.globalAlpha = 1; }
      c.restore(); return;
    }
    const hit = u.flash > g.t;
    const K = hit ? FLASHK : IDENT;
    const aim = u.tgt && !u.tgt.dead ? Math.atan2(u.tgt.y - u.y, u.tgt.x - u.x) : (u.team === 0 ? 0 : Math.PI);
    ell(c, 0, 1.5, 22, 6.5, 'rgba(0,0,0,.3)');
    // วงฐานสีทีม
    c.globalAlpha = 0.5; ell(c, 0, 0.5, 19, 5.2, tc); c.globalAlpha = 1; ell(c, 0, 0.5, 15, 3.8, K(dark('#8a8a80', 0.2)));
    const fireT = RS.fire[u.id] || -9, since = rt - fireT;
    switch (era) {
      case 0: { // ค่ายไม้ยกพื้น
        for (const lx of [-11, -4, 4, 11]) cap(c, lx, 0, lx * 0.8, -20, 3.4, K('#6d4c41'));
        fillRR(c, -15, -23, 30, 5.5, 1.5, K('#8d6e63'), true);
        for (let i = -13; i < 14; i += 5) { c.strokeStyle = 'rgba(40,25,15,.4)'; c.lineWidth = 0.5; c.beginPath(); c.moveTo(i, -23); c.lineTo(i, -17.5); c.stroke(); }
        fillRR(c, -13, -33, 26, 10, 1.5, K('#a1887f'), true);
        poly(c, [-18, -33, 0, -50, 18, -33], K('#c9a14a'), true);
        c.strokeStyle = 'rgba(90,60,20,.55)'; c.lineWidth = 0.6; for (let i = -12; i <= 12; i += 4) { c.beginPath(); c.moveTo(i * 0.95, -33.6 + Math.abs(i) * 0.2); c.lineTo(i * 0.3, -48 + Math.abs(i) * 0.25); c.stroke(); }
        break; }
      case 1: { // กำแพงอิฐ + ปืนใหญ่
        fillRR(c, -15, -32, 30, 32, 1.6, K('#b0714f'), true);
        for (let yy = -30; yy < 0; yy += 5.5) { c.strokeStyle = 'rgba(80,40,25,.35)'; c.lineWidth = 0.5; c.beginPath(); c.moveTo(-15, yy); c.lineTo(15, yy); c.stroke(); for (let xx = -13 + ((yy / 5.5) & 1 ? 3.5 : 0); xx < 15; xx += 7) { c.beginPath(); c.moveTo(xx, yy); c.lineTo(xx, yy + 5.5); c.stroke(); } }
        for (let i = -15; i < 15; i += 8) fillRR(c, i, -37, 5.5, 6, 1, K('#b0714f'), true);
        fillRR(c, -4, -22, 8, 13, 4, K('#5b3a2a'), true);
        // ปืนใหญ่หมุนตามเป้า
        c.save(); c.translate(0, -39); c.rotate(clamp(Math.cos(aim) >= 0 ? aim : Math.PI - aim, -0.6, 0.6) * (Math.cos(aim) >= 0 ? 1 : -1)); if (Math.cos(aim) < 0) c.scale(-1, 1);
        const recoil = since < 0.2 ? (0.2 - since) * 18 : 0;
        fillRR(c, -6 - recoil, -3, 20, 6, 3, K('#37474f'), true); fillRR(c, 11 - recoil, -3.6, 4, 7.2, 1.5, K('#263238'), true); circ(c, -5 - recoil, 0, 3.4, K('#455a64'), true);
        c.restore();
        break; }
      case 2: { // บังเกอร์ + ปืนกล
        fillRR(c, -16, -17, 32, 17, 2.5, K('#8a8574'), true); fillRR(c, -16, -17, 32, 4, 2, K('#9c9784'));
        fillRR(c, -11, -13, 22, 3.4, 1, K('#2b2b2b'));
        for (let i = -15; i < 15; i += 7) fillRR(c, i, -5, 6.4, 5, 2, K('#a8956a'), true);
        fillRR(c, -9, -28, 18, 11, 3, K('#6e6b5e'), true);
        c.save(); c.translate(0, -23); c.rotate(aim); fillRR(c, -2, -1.6, 15, 3.2, 1, K('#212121'), true); fillRR(c, 2, -3, 5, 6, 1.2, K('#37474f'), true);
        if (since < 0.1) { c.fillStyle = '#ffeb3b'; poly(c, [15, 0, 21, -2.5, 19, 0, 21, 2.5], '#ffeb3b'); circ(c, 16, 0, 2, '#fff8e1'); }
        c.restore();
        break; }
      default: { // ป้อมไฟฟ้า + กล้องวงจรปิด
        fillRR(c, -12, -9, 24, 9, 2, K('#78909c'), true);
        fillRR(c, -7, -42, 14, 34, 3, K('#9eb1ba'), true); fillRR(c, -7, -42, 4, 34, 2, K('#c3d0d6'));
        for (let i = 0; i < 3; i++) fillRR(c, -4.4, -34 + i * 9, 8.8, 2.2, 0.8, K('#4dd0e1'));
        const pulse = 0.5 + 0.5 * Math.sin(rt * 6);
        circ(c, 0, -46, 5.2, K('#263238'), true); circ(c, 0, -46, 2.7, since < 0.3 ? '#e1f5fe' : '#4dd0e1');
        c.globalAlpha = (since < 0.3 ? 0.5 : 0.18 + pulse * 0.08); circ(c, 0, -46, 9, '#4dd0e1'); c.globalAlpha = 1;
        // กล้อง
        c.save(); c.translate(7, -30); c.rotate(Math.sin(rt * 0.8 + u.id) * 0.5); fillRR(c, -1, -2, 7, 4, 1, K('#37474f'), true); circ(c, 5, 0, 1.2, Math.floor(rt * 2) % 2 ? '#ff1744' : '#7f0000'); c.restore();
        if (u.tgt && !u.tgt.dead && since < 0.25) { /* ลำแสงวาดใน fx */ }
        break; }
    }
    // ธงสีทีม โบกสะบัด
    const top = [-50, -39, -39, -48][era] - (king ? 4 : 0);
    cap(c, 0, top + 14, 0, top, 1.3, K('#4e342e'));
    const wv = Math.sin(rt * 4 + u.id) * 1.6;
    c.beginPath(); c.moveTo(0.4, top); c.bezierCurveTo(4, top - 1.5 + wv, 8, top + 1.5 - wv, 12, top + 0.5 + wv); c.lineTo(12, top + 6.5 + wv); c.bezierCurveTo(8, top + 7.5 - wv, 4, top + 4.5 + wv, 0.4, top + 6.5); c.closePath();
    c.fillStyle = K(tc); c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.6; c.stroke();
    if (king) { // มงกุฎทองบนราชธานี
      c.globalAlpha = 0.28 + 0.12 * Math.sin(rt * 2); circ(c, 0, top - 4, 12, '#ffe082'); c.globalAlpha = 1;
      poly(c, [-6, top - 2, -6, top - 8, -3, top - 4.5, 0, top - 10, 3, top - 4.5, 6, top - 8, 6, top - 2], '#ffd54f', true);
    }
    // ขอบสีทีมที่ฐาน
    fillRR(c, -17, -1.5, 34, 2.4, 1, K(td));
    if (!TR.Sim.towerVuln(g, u)) { // ยังพังไม่ได้: โดมคุ้มกัน
      c.globalAlpha = 0.16 + 0.07 * Math.sin(rt * 3); circ(c, 0, -20, 30, '#ffffff'); c.globalAlpha = 0.5; c.strokeStyle = '#ffffff'; c.lineWidth = 0.9; c.beginPath(); c.arc(0, -20, 30, 0, TAU); c.stroke(); c.globalAlpha = 1;
    }
    c.restore();
  }

  /* ================= แถบเลือด/ป้ายเหนือหัว ================= */
  function hpBar(c, x, y, w, ratio, team, big, shield) {
    const h = big ? 3.6 : 2.4;
    fillRR(c, x - w / 2 - 0.7, y - 0.7, w + 1.4, h + 1.4, 1.6, 'rgba(10,12,16,.85)');
    const fw = Math.max(0, (w) * clamp(ratio, 0, 1));
    if (fw > 0) {
      fillRR(c, x - w / 2, y, fw, h, 1.2, TEAM[team]);
      fillRR(c, x - w / 2, y, fw, h * 0.45, 1.0, 'rgba(255,255,255,.35)');
    }
    if (shield > 0) fillRR(c, x - w / 2, y - 1.4, Math.min(w, w * shield), 1.1, 0.5, 'rgba(255,255,255,.95)');
  }

  /* ================= หน่วยทั้งหมด ================= */
  function unitAnim(u, g, dt, alpha) {
    const id = u.id;
    const spd = Math.hypot(u.x - u.px, u.y - u.py) / CFG.dt;
    const prevMv = RS.mv[id] == null ? 0 : RS.mv[id];
    const target = clamp(spd / 55, 0, 1.25);
    const mv = prevMv + (target - prevMv) * Math.min(1, dt * 12);
    RS.mv[id] = mv;
    RS.ph[id] = (RS.ph[id] || 0) + dt * (3.2 + spd * 0.115) * (mv > 0.04 ? 1 : 0.2);
    let tv = RS.vf[id] == null ? (u.face[0] >= 0 ? 1 : -1) : RS.vf[id];
    const want = u.face[0] > 0.12 ? 1 : (u.face[0] < -0.12 ? -1 : (tv >= 0 ? 1 : -1));
    tv += (want - tv) * Math.min(1, dt * 16);
    RS.vf[id] = tv;
    return { mv: mv, ph: RS.ph[id], vf: Math.abs(tv) < 0.18 ? (tv < 0 ? -0.18 : 0.18) : tv };
  }

  function spawnPart(x, y, vx, vy, life, size, col, kind) { if (RS.parts.length < 400) RS.parts.push({ x: x, y: y, vx: vx, vy: vy, life: life, max: life, size: size, c: col, kind: kind || 'dot' }); }

  function drawStatus(c, g, u, x, y, rt, h) {
    for (const e of u.fx) {
      if (e.until <= g.t) continue;
      switch (e.type) {
        case 'stun':
          for (let i = 0; i < 3; i++) { const a = rt * 5 + i * TAU / 3; poly(c, [x + Math.cos(a) * 7, y - h - 3 + Math.sin(a) * 2 - 2, x + Math.cos(a) * 7 + 1.6, y - h - 3 + Math.sin(a) * 2, x + Math.cos(a) * 7, y - h - 3 + Math.sin(a) * 2 + 2, x + Math.cos(a) * 7 - 1.6, y - h - 3 + Math.sin(a) * 2], '#fff176'); }
          break;
        case 'root': c.strokeStyle = '#4e8b34'; c.lineWidth = 1.5; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(x + i * 5, y + 1); c.quadraticCurveTo(x + i * 6 + 2, y - 5, x + i * 3, y - 9); c.stroke(); } break;
        case 'slow': c.strokeStyle = 'rgba(100,200,255,.8)'; c.lineWidth = 0.9; c.beginPath(); c.ellipse(x, y + 1, 9 + Math.sin(rt * 6) * 1, 3, 0, 0, TAU); c.stroke(); break;
        case 'shield': if (e.amt > 0) { c.globalAlpha = 0.28; circ(c, x, y - h * 0.5, h * 0.62, '#b3e5fc'); c.globalAlpha = 0.7; c.strokeStyle = '#e1f5fe'; c.lineWidth = 0.8; c.beginPath(); c.arc(x, y - h * 0.5, h * 0.62, 0, TAU); c.stroke(); c.globalAlpha = 1; } break;
        case 'taunt': c.fillStyle = '#ff5252'; c.font = 'bold 8px sans-serif'; c.textAlign = 'center'; c.fillText('!', x, y - h - 4); break;
        case 'mark': c.strokeStyle = '#ffeb3b'; c.lineWidth = 0.9; c.beginPath(); c.arc(x, y - h - 6, 3.4, 0, TAU); c.moveTo(x - 5, y - h - 6); c.lineTo(x + 5, y - h - 6); c.moveTo(x, y - h - 11); c.lineTo(x, y - h - 1); c.stroke(); break;
        case 'blind': c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(x - 3.5, y - h + 2, 7, 1.6); break;
        case 'hot': if (Math.random() < 0.08) spawnPart(x + (Math.random() - 0.5) * 10, y - 4, 0, -14, 0.8, 1.6, '#81c784', 'plus'); break;
        case 'buff': if (e.dmgMul || e.speedMul || e.armorAdd) { if (Math.random() < 0.06) spawnPart(x + (Math.random() - 0.5) * 12, y - 2, 0, -18, 0.7, 1.2, e.armorAdd ? '#90caf9' : '#ffe082', 'dot'); } break;
      }
    }
  }

  function drawUnits(c, g, alpha, dt, rt, camX, camY) {
    const pl = g.player;
    const list = [];
    for (const u of g.units) {
      const ix = u.px + (u.x - u.px) * alpha, iy = u.py + (u.y - u.py) * alpha;
      if (ix < camX - 70 || ix > camX + view.w + 70 || iy < camY - 80 || iy > camY + view.h + 70) continue;
      if (u.dead) {
        const age = g.t - (u.dieT == null ? -99 : u.dieT);
        if (u.type === 'tower') { list.push({ u: u, x: ix, y: iy }); continue; }
        if (age > (u.type === 'hero' ? 0.9 : 0.4)) continue;
      }
      list.push({ u: u, x: ix, y: iy });
    }
    list.sort(function (a, b) { return a.y - b.y; });

    for (const it of list) {
      const u = it.u, x = it.x, y = it.y;
      if (u.type === 'tower') {
        // จับจังหวะยิง: cdAtk เพิ่มขึ้น = เพิ่งยิง
        const prev = RS.fire['p' + u.id] || 0;
        if (u.cdAtk > prev + 0.05) { RS.fire[u.id] = rt; if (g.era === 1 && u.tgt) for (let i = 0; i < 5; i++) spawnPart(x + (u.team === 0 ? 14 : -14), y - 40, (Math.random() - 0.3) * 14 * (u.team ? -1 : 1), -6 - Math.random() * 8, 0.7, 2.4 + Math.random() * 2, '#cfcfcf', 'smoke'); }
        RS.fire['p' + u.id] = u.cdAtk;
        drawTower(c, g, u, x, y, rt);
        if (!u.dead) {
          const th = u.king ? 76 : 62;
          hpBar(c, x, y - th, u.king ? 40 : 30, u.hp / u.maxHp, u.team, true);
          if (!u.king) { c.fillStyle = 'rgba(255,255,255,.85)'; c.font = '600 5px sans-serif'; c.textAlign = 'center'; c.fillText(u.name, x, y - th - 3); }
        }
        continue;
      }
      const an = unitAnim(u, g, dt, alpha);
      if (u.type === 'minion') {
        const age = u.dead ? (g.t - u.dieT) / 0.4 : 0;
        const ap = u.lastAtk != null ? (rt - u.lastAtk) / 0.3 : 9;
        c.save(); c.translate(x, y);
        if (u.dead) { c.globalAlpha = 1 - age; c.rotate(an.vf * age * 0.9); c.translate(0, age * 2); }
        c.scale(0.72, 0.72);
        rig(c, { id: u.id, key: u.ranged ? 'minionR' : 'minionM', colors: { body: TEAM[u.team], accent: TEAM_LIGHT[u.team], hair: '#3e2723' }, role: 'minion', vf: an.vf, mv: an.mv, ph: an.ph, rt: rt, atkP: ap, castP: 9, flash: u.flash > g.t });
        c.restore();
        if (!u.dead && u.hp < u.maxHp) hpBar(c, x, y - 17, 11, u.hp / u.maxHp, u.team, false);
        continue;
      }
      // ฮีโร่
      const sc = ROLE_SC[u.role] * HERO_SC;
      const own = pl && u.team === pl.team;
      const stealth = u.m && u.m.stealth;
      const age = u.dead ? (g.t - u.dieT) / 0.9 : 0;
      c.save(); c.translate(x, y);
      if (u.untarget > g.t) c.globalAlpha = 0.35; else if (stealth) c.globalAlpha = own ? 0.45 : 0.1;
      if (u.dead) { c.globalAlpha = Math.max(0, 1 - age); c.rotate(an.vf * Math.min(1, age * 3) * 1.4); c.translate(0, Math.min(1, age * 3) * 6); }
      if (u.dash) { c.globalAlpha *= 0.9; }
      const sz = sc;
      c.scale(sz, sz);
      const ap = u.lastAtk != null ? (rt - u.lastAtk) / 0.32 : 9;
      const cp = u.lastCast != null ? (rt - u.lastCast) / 0.45 : 9;
      rig(c, { id: u.id, key: u.def.id, colors: u.def.colors, role: u.role, vf: an.vf, mv: u.dash ? 1.3 : an.mv, ph: an.ph, rt: rt, atkP: ap, castP: cp, flash: u.flash > g.t });
      c.restore();
      if (!u.dead) {
        // ฝุ่นเท้า/เงาพุ่ง
        if (an.mv > 0.5) { const last = RS.dust[u.id] || 0; if (rt - last > 0.16) { RS.dust[u.id] = rt; spawnPart(x - u.face[0] * 3, y, -u.face[0] * 6 + (Math.random() - 0.5) * 6, -3 - Math.random() * 3, 0.45, 1.6, 'rgba(200,190,160,.7)', 'dust'); } }
        if (u.dash) spawnPart(x, y - 8, 0, 0, 0.3, 4.5, u.def.colors.accent, 'ghost');
        const hh = 32 * sc / HERO_SC * 0.9;
        drawStatus(c, g, u, x, y, rt, hh);
        if (u.casting) { c.globalAlpha = 0.5; c.strokeStyle = u.def.colors.accent; c.lineWidth = 1; c.beginPath(); c.ellipse(x, y, 11 + Math.sin(rt * 14), 4, 0, 0, TAU); c.stroke(); c.globalAlpha = 1; }
        let sh = 0; for (const e of u.fx) if (e.type === 'shield' && e.amt > 0 && e.until > g.t) sh += e.amt;
        const by = y - hh - 5;
        hpBar(c, x + 2, by, 26, u.hp / u.maxHp, u.team, true, sh / u.maxHp);
        // ป้ายเลเวล
        circ(c, x - 13, by + 1.8, 4.4, 'rgba(10,12,16,.92)'); c.strokeStyle = TEAM[u.team]; c.lineWidth = 0.8; c.beginPath(); c.arc(x - 13, by + 1.8, 4.4, 0, TAU); c.stroke();
        c.fillStyle = '#fff'; c.font = 'bold 5.4px sans-serif'; c.textAlign = 'center'; c.fillText(String(u.level), x - 13, by + 3.8);
        if (u === pl) { const bounce = Math.sin(rt * 5) * 1.5; poly(c, [x - 3.6, by - 8 + bounce, x + 3.6, by - 8 + bounce, x, by - 2.6 + bounce], '#ffeb3b', true); }
      }
    }
  }

  /* ================= เอฟเฟกต์สกิล/อนุภาค ================= */
  function drawZones(c, g, rt) {
    for (const z of g.zones) {
      if (z.kind === 'blast') {
        const k = clamp(1 - (z.at - g.t) / 0.6, 0, 1);
        c.globalAlpha = 0.12 + 0.2 * k; circ(c, z.x, z.y, z.r, z.c); c.globalAlpha = 0.85; c.strokeStyle = z.c; c.lineWidth = 1.2; c.beginPath(); c.arc(z.x, z.y, z.r, 0, TAU); c.stroke();
        c.beginPath(); c.arc(z.x, z.y, z.r * k, 0, TAU); c.globalAlpha = 0.6; c.stroke(); c.globalAlpha = 1;
      } else if (z.kind === 'trap') {
        ell(c, z.x, z.y + 1, 7, 2.6, 'rgba(0,0,0,.3)');
        for (let i = -1; i <= 1; i++) poly(c, [z.x + i * 3 - 1.4, z.y, z.x + i * 3 + 1.4, z.y, z.x + i * 3, z.y - 5.5], '#b0a089', true);
        fillRR(c, z.x - 5, z.y - 1.4, 10, 2.2, 1, '#6d4c41', true);
      } else {
        const pulse = 0.5 + 0.5 * Math.sin(rt * 3 + z.x);
        c.globalAlpha = 0.14 + pulse * 0.06; circ(c, z.x, z.y, z.r, z.c);
        c.globalAlpha = 0.7; c.strokeStyle = z.c; c.lineWidth = 1.2; c.setLineDash([6, 5]); c.lineDashOffset = -rt * 10; c.beginPath(); c.arc(z.x, z.y, z.r, 0, TAU); c.stroke();
        c.setLineDash([2, 6]); c.lineDashOffset = rt * 14; c.beginPath(); c.arc(z.x, z.y, z.r * 0.62, 0, TAU); c.stroke(); c.setLineDash([]); c.globalAlpha = 1;
        if (z.turret) { fillRR(c, z.x - 5, z.y - 9, 10, 9, 2, '#455a64', true); fillRR(c, z.x - 2.5, z.y - 13, 5, 4, 1, '#fdd835', true); }
        if (z.heal && z.healAllies) { fillRR(c, z.x - 6, z.y - 8, 12, 8, 2, '#8d6e63', true); fillRR(c, z.x - 5, z.y - 11, 10, 3, 1.4, '#fff59d', true); }
        if (z.heal && Math.random() < 0.1) spawnPart(z.x + (Math.random() - 0.5) * z.r, z.y + (Math.random() - 0.5) * z.r * 0.6, 0, -12, 0.8, 1.5, '#a5d6a7', 'plus');
      }
    }
  }

  function drawProjs(c, g) {
    for (const p of g.projs) {
      let dx, dy;
      if (p.tgt) { dx = p.tgt.x - p.x; dy = p.tgt.y - p.y; } else { dx = p.vx; dy = p.vy; }
      const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const tail = p.basic ? 9 : 16, r = p.basic ? 1.9 : 3.2, py = p.y - 9;
      const grad = c.createLinearGradient(p.x, py, p.x - dx * tail, py - dy * tail);
      grad.addColorStop(0, p.c); grad.addColorStop(1, 'rgba(255,255,255,0)');
      c.strokeStyle = grad; c.lineWidth = r * 1.5; c.lineCap = 'round';
      c.beginPath(); c.moveTo(p.x, py); c.lineTo(p.x - dx * tail, py - dy * tail); c.stroke();
      c.globalAlpha = 0.35; circ(c, p.x, py, r * 2.2, p.c); c.globalAlpha = 1;
      circ(c, p.x, py, r, p.c); circ(c, p.x, py, r * 0.5, '#ffffff');
    }
  }

  function drawFx(c, g, rt) {
    for (const f of g.fx) {
      const k = clamp((g.t - f.t0) / f.dur, 0, 1), a = 1 - k;
      if (f.k === 'ring') {
        const r = f.r * (0.55 + 0.45 * ease(k));
        c.globalAlpha = a * 0.25; circ(c, f.x, f.y, r, f.c); c.globalAlpha = a * 0.95; c.strokeStyle = f.c; c.lineWidth = 1.6 * a + 0.4; c.beginPath(); c.arc(f.x, f.y, r, 0, TAU); c.stroke(); c.globalAlpha = 1;
      } else if (f.k === 'line') {
        c.lineCap = 'round'; c.globalAlpha = a * 0.4; c.strokeStyle = f.c; c.lineWidth = 4; c.beginPath(); c.moveTo(f.x1, f.y1 - 10); c.lineTo(f.x2, f.y2 - 10); c.stroke();
        c.globalAlpha = a; c.strokeStyle = '#ffffff'; c.lineWidth = 1.2; c.stroke(); c.globalAlpha = 1;
      } else if (f.k === 'decoy') {
        c.save(); c.translate(f.x, f.y); c.globalAlpha = 0.45 * a + 0.1; c.scale(HERO_SC, HERO_SC);
        rig(c, { id: 99, key: f.def.id, colors: f.def.colors, role: f.def.role, vf: 1, mv: 0, ph: 0, rt: rt, atkP: 9, castP: 9, flash: false });
        c.restore(); c.globalAlpha = 1;
      } else if (f.k === 'burst') {
        if (!RS.fxSeen.has(f)) { RS.fxSeen.add(f); for (let i = 0; i < f.n; i++) { const an = Math.random() * TAU, sp = 18 + Math.random() * 40; spawnPart(f.x, f.y - 8, Math.cos(an) * sp, Math.sin(an) * sp - 12, 0.5 + Math.random() * 0.4, 1.4 + Math.random() * 2, f.c, 'dot'); } }
      } else if (f.k === 'dmg') {
        const yy = f.y - 14 * ease(k), sc = f.big ? 1 : 0.8;
        c.globalAlpha = k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1; c.font = '800 ' + (f.big ? 8.5 : 6.5) * (1 + (1 - ease(k * 3)) * 0.4) + 'px sans-serif'; c.textAlign = 'center';
        c.lineWidth = 1.8; c.strokeStyle = 'rgba(20,10,5,.9)'; c.lineJoin = 'round'; c.strokeText(String(f.v), f.x, yy); c.fillStyle = f.c; c.fillText(String(f.v), f.x, yy); c.globalAlpha = 1;
      }
    }
  }

  function updateParts(c, dt) {
    for (let i = RS.parts.length - 1; i >= 0; i--) {
      const p = RS.parts[i];
      p.life -= dt;
      if (p.life <= 0) { RS.parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.kind === 'dot' || p.kind === 'dust') { p.vy += 40 * dt; p.vx *= 0.96; }
      const k = p.life / p.max;
      c.globalAlpha = Math.min(1, k * 1.4);
      if (p.kind === 'plus') { c.fillStyle = p.c; c.fillRect(p.x - p.size, p.y - p.size * 0.3, p.size * 2, p.size * 0.6); c.fillRect(p.x - p.size * 0.3, p.y - p.size, p.size * 0.6, p.size * 2); }
      else if (p.kind === 'smoke') { circ(c, p.x, p.y, p.size * (1.6 - k * 0.6), p.c); }
      else if (p.kind === 'ghost') { c.globalAlpha = k * 0.35; circ(c, p.x, p.y, p.size * k + 1, p.c); }
      else circ(c, p.x, p.y, Math.max(0.3, p.size * (0.4 + k * 0.6)), p.c);
    }
    c.globalAlpha = 1;
  }

  /* ================= วาดทั้งเฟรม ================= */
  function draw(c, g, alpha) {
    if (RS.g !== g) resetState(g);
    const now = performance.now();
    let dt = (now - RS.last) / 1000; RS.last = now; dt = clamp(dt, 0.001, 0.05);
    const rt = g.t + alpha * CFG.dt;
    const z = view.z;

    // กล้องนุ่ม ๆ ตามผู้เล่น
    const pl = g.player;
    let tx = CFG.W / 2, ty = CFG.H / 2;
    if (pl) { tx = pl.px + (pl.x - pl.px) * alpha; ty = pl.py + (pl.y - pl.py) * alpha; }
    const cam = RS.cam;
    if (!cam.init) { cam.x = tx; cam.y = ty; cam.init = true; }
    else { const f = 1 - Math.exp(-dt * 9); cam.x += (tx - cam.x) * f; cam.y += (ty - cam.y) * f; }
    let camX = clamp(cam.x - view.w / 2, 0, Math.max(0, CFG.W - view.w)), camY = clamp(cam.y - view.h / 2, 0, Math.max(0, CFG.H - view.h));
    camX = Math.round(camX * z) / z; camY = Math.round(camY * z) / z;

    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, view.cw, view.ch);
    c.setTransform(z, 0, 0, z, 0, 0);
    c.translate(-camX, -camY);

    // เปลี่ยนยุคแบบเฟดต่อเนื่อง
    if (g.era !== RS.eraSeen) { RS.eraPrev = RS.eraSeen; RS.eraSeen = g.era; RS.eraFade = 0; }
    if (RS.eraFade < 1) RS.eraFade = Math.min(1, RS.eraFade + dt / 2.2);
    if (RS.eraFade < 1) { drawGroundLayer(c, g, camX, camY, RS.eraPrev, 1, rt); drawGroundLayer(c, g, camX, camY, g.era, RS.eraFade, rt); }
    else drawGroundLayer(c, g, camX, camY, g.era, 1, rt);
    drawBases(c, g, rt);
    drawZones(c, g, rt);
    drawUnits(c, g, alpha, dt, rt, camX, camY);
    drawProjs(c, g);
    drawFx(c, g, rt);
    updateParts(c, dt);

    // แสงบรรยากาศตามยุค
    c.setTransform(z, 0, 0, z, 0, 0);
    const tint = ['rgba(255,214,140,0.07)', 'rgba(255,170,90,0.08)', 'rgba(70,80,100,0.12)', 'rgba(120,160,220,0.05)'][g.era];
    c.fillStyle = tint; c.fillRect(0, 0, view.w, view.h);
    const vg = c.createRadialGradient(view.w / 2, view.h / 2, view.h * 0.55, view.w / 2, view.h / 2, view.h * 1.1);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.28)');
    c.fillStyle = vg; c.fillRect(0, 0, view.w, view.h);
    return { camX: camX, camY: camY, vw: view.w, vh: view.h };
  }

  /* ================= มินิแมพ ================= */
  function drawMinimap(c, g, w, h, cam) {
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#0e141b'; c.fillRect(0, 0, w, h);
    const sx = w / CFG.W, sy = h / CFG.H;
    const E = TR.ERAS[g.era];
    c.fillStyle = '#16212c'; c.fillRect(0, 0, w, h);
    c.strokeStyle = E.lane; c.globalAlpha = 0.85; c.lineWidth = Math.max(2, h * 0.07); c.lineCap = 'round';
    for (const L of CFG.lanes) { c.beginPath(); c.moveTo(180 * sx, L.y * sy); c.lineTo((CFG.W - 180) * sx, L.y * sy); c.stroke(); }
    for (const bx of [100, CFG.W - 100]) for (const l of [0, 2]) { c.beginPath(); c.moveTo(bx * sx, CFG.baseY * sy); c.quadraticCurveTo((bx + (bx < 500 ? 200 : -200)) * sx, CFG.baseY * sy, (bx < 500 ? CFG.laneEntry : CFG.W - CFG.laneEntry) * sx, CFG.lanes[l].y * sy); c.stroke(); }
    c.globalAlpha = 1;
    for (const u of g.units) {
      if (u.dead) continue;
      const x = u.x * sx, y = u.y * sy;
      if (u.type === 'tower') { c.fillStyle = TEAM[u.team]; const s = u.king ? 7 : 4.6; c.fillRect(x - s / 2, y - s / 2, s, s); c.strokeStyle = '#000'; c.lineWidth = 0.6; c.strokeRect(x - s / 2, y - s / 2, s, s); }
      else if (u.type === 'minion') { c.fillStyle = TEAM[u.team]; c.globalAlpha = 0.8; c.fillRect(x - 0.7, y - 0.7, 1.5, 1.5); c.globalAlpha = 1; }
      else if (u.type === 'hero') {
        if (u.m.stealth && g.player && u.team !== g.player.team) continue;
        const me = u === g.player;
        c.fillStyle = me ? '#ffeb3b' : TEAM[u.team]; c.beginPath(); c.arc(x, y, me ? 3.4 : 2.7, 0, TAU); c.fill(); c.strokeStyle = '#000'; c.lineWidth = 0.7; c.stroke();
      }
    }
    if (cam) { c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1; c.strokeRect(cam.camX * sx, cam.camY * sy, cam.vw * sx, cam.vh * sy); }
  }

  /* ไอคอนฮีโร่ในเมนู (ท่ายืนนิ่ง หายใจเบา ๆ) */
  function drawHeroIcon(c, def, w, h, rt) {
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, w, h);
    const k = h / 46;
    c.setTransform(k, 0, 0, k, w / 2, h - 4 * k);
    c.scale(1.05, 1.05);
    rig(c, { id: 3, key: def.id, colors: def.colors, role: def.role, vf: 1, mv: 0, ph: 0, rt: rt || 0, atkP: 9, castP: 9, flash: false });
    c.setTransform(1, 0, 0, 1, 0, 0);
  }

  TR.Render = { _rig: rig, view: view, resize: resize, draw: draw, drawMinimap: drawMinimap, drawHeroIcon: drawHeroIcon, TEAM: TEAM };
})(typeof window !== 'undefined' ? window : globalThis);
