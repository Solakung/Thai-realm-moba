/* Thai Realm — โมเดล 3D low-poly ของมินเนียน มอนสเตอร์ป่า และบอสยักษ์วัดแจ้ง
   ใช้โครงกระดูก 15 ข้อต่อชุดเดียวกับฮีโร่ (stage3d.js) แต่บางตัวปรับตำแหน่งข้อต่อใหม่ให้เป็นสัตว์สี่ขา/งู/ผี
   M.rest = ท่านิ่งตั้งต้น (แทนท่าเตรียมสู้ของมนุษย์)  M.anim(out, st, rt) = ท่าเฉพาะตัวที่ทับหลังสุด
   ใช้ผ่าน TR.Units3D.model(kind, team) → โมเดลที่ drawFigure ใช้ได้เลย */
(function (G) {
  'use strict';
  const TR = G.TR, S = TR.S3D;
  const box = S.box, frustum = S.frustum, prism = S.prism, sphere = S.sphere, gem = S.gem, scl = S.scl, place = S.place, shHex = S.shHex, H = S.H, IDX = S.IDX, KI = S.KI;
  const SKIN = '#f1caa0';

  function newModel(id, style, scale) {
    const M = { id: id, parts: [], style: style, scale: scale || 1, scale0: 1, tip: [0, 12, 0], tipBase: [0, 4, 0], feet: [], hasGlow: false };
    M.P = function (n, mesh, color, o) { const p = { n: IDX[n], m: mesh, c: H(color), cc: color, em: !!(o && o.em), glow: (o && o.glow) || 0 }; if (o && o.gc) p.gc = o.gc; M.parts.push(p); return M.parts.length - 1; };
    M.at = function (mesh, x, y, z, rx, ry, rz) { return place(mesh, [x, y, z], [rx || 0, ry || 0, rz || 0]); };
    return M;
  }
  function humanT(bw) {
    const lw = 0.9 + 0.1 * bw, HX = 4.6 * bw + 1.0, LX = 2.2 * lw + 0.2, BASE = [1.5708, 0, 0];
    return [
      [[0, 0, 0]], [[0, 0.8, 0]], [[0, 10.3, 0]],
      [[HX, 8.7, 0]], [[0, -5.6, 0]], [[0, -5.0, 0], BASE],
      [[-HX, 8.7, 0]], [[0, -5.6, 0]], [[0, -5.0, 0], BASE],
      [[LX, -0.6, 0]], [[0, -7.2, 0]], [[0, -7.4, 0]],
      [[-LX, -0.6, 0]], [[0, -7.2, 0]], [[0, -7.4, 0]]
    ];
  }
  // ร่างมนุษย์แบบเบา (ชิ้นน้อย) ใช้กับมินเนียนและบอส
  function lean(M, o) {
    const bw = o.bw || 1, lw = 0.9 + 0.1 * bw, P = M.P, at = M.at;
    M.T = humanT(bw); M.bw = bw;
    P('root', at(box(7.6 * bw, 3.4, 4.6), 0, -0.2, 0), o.pants);
    P('torso', at(frustum(9.6 * bw, 5.4, 7.2 * bw, 4.6, 9.8), 0, 4.9, 0), o.torso);
    P('head', at(scl(sphere(4.3, 8, 4), 1, 1.08, 1.02), 0, 4.6, 0), o.skin || SKIN);
    P('head', at(box(0.8, 1.1, 0.5), 1.55, 4.7, 4.2), o.eye || '#2b1b14'); P('head', at(box(0.8, 1.1, 0.5), -1.55, 4.7, 4.2), o.eye || '#2b1b14');
    ['A', 'B'].forEach(function (s) {
      P('sh' + s, at(box(2.8, 5.8, 2.8), 0, -2.7, 0), o.sleeve || o.torso);
      P('el' + s, at(box(2.4, 5.2, 2.4), 0, -2.5, 0), o.fore || o.skin || SKIN);
      P('wr' + s, at(box(2.5, 2.4, 2.5), 0, 0, 1.0), o.skin || SKIN);
      P('hp' + s, at(box(3.5 * lw, 7.4, 3.7 * lw), 0, -3.5, 0), o.pants);
      M.feet.push(P('ft' + s, at(box(3.0, 1.9, 5.6), 0, -0.1, 1.3), o.boots || '#3b2a20'));
    });
    P('root', at(box(7.8 * bw, 1.0, 4.9), 0, 1.3, 0), shHex(o.pants, 0.7));
  }

  /* ---------- มินเนียน ---------- */
  function minion(ranged, team) {
    const body = team === 0 ? '#2f7de1' : '#e04646', light = team === 0 ? '#8ec3ff' : '#ff9a9a';
    const M = newModel('minion' + (ranged ? 'R' : 'M') + team, ranged ? 'bow' : 'melee', 1);
    lean(M, { bw: 1, pants: shHex(body, 0.5), torso: body, boots: '#3b2a20' });
    const P = M.P, at = M.at;
    if (!ranged) {
      P('head', at(scl(sphere(4.7, 7, 3), 1, 0.8, 1.04), 0, 6.0, 0), '#cfd8dc'); P('head', at(prism(0, 1.0, 2.6, 5), 0, 10.4, 0), light);
      P('elB', at(box(1.2, 8, 7), 1.6, -2.4, 1.2), body); P('elB', at(box(1.4, 3, 3), 2.4, -2.4, 1.2), light);
      P('wrA', at(box(0.9, 3.0, 0.9), 0, 0, 0), '#5d4037'); P('wrA', at(box(1.4, 9.5, 0.4), 0, 6.5, 0), '#e9eef2');
      M.tip = [0, 12, 0]; M.tipBase = [0, 4, 0];
    } else {
      P('head', at(scl(sphere(4.8, 7, 3), 1, 0.78, 1.06), 0, 5.7, -0.4), '#3e2723'); P('head', at(prism(0, 5.0, 3.6, 6), 0, 8.9, -0.4), light);
      P('torso', at(box(1.6, 8, 1.8), -2.0, 5.5, -3.8, 0.2, 0, 0.3), '#6d4c41');
      P('wrA', at(box(0.9, 4.0, 0.9), 0, 0, 0), '#8d6e63'); P('wrA', at(box(0.7, 6, 0.7), 0, 4.6, -0.8, -0.3, 0, 0), '#a1887f'); P('wrA', at(box(0.7, 6, 0.7), 0, -4.6, -0.8, 0.3, 0, 0), '#a1887f');
      P('wrA', at(box(0.14, 17, 0.14), 0, 0, -2.4), '#f1ebd8');
      M.tip = [0, 9, -2]; M.tipBase = [0, 0, 0];
    }
    return M;
  }

  /* ---------- บอส ยักษ์วัดแจ้ง ---------- */
  function boss() {
    const M = newModel('boss', 'melee', 2.15);
    lean(M, { bw: 1.55, pants: '#7a1f12', torso: '#2f7d4f', skin: '#3f9c63', sleeve: '#3f9c63', fore: '#3f9c63', eye: '#ffeb3b', boots: '#4e342e' });
    const P = M.P, at = M.at, bw = 1.55;
    P('head', at(box(1.1, 2.4, 1.0), 2.2, 1.6, 4.2), '#ffffff'); P('head', at(box(1.1, 2.4, 1.0), -2.2, 1.6, 4.2), '#ffffff');       // เขี้ยว
    P('head', at(gem(0.9, 3.0, 4), 4.3, 7.4, 1.2, 0, 0, -0.6), '#fff3c4'); P('head', at(gem(0.9, 3.0, 4), -4.3, 7.4, 1.2, 0, 0, 0.6), '#fff3c4'); // เขา
    P('head', at(prism(0, 5.2, 5.4, 8), 0, 9.6, 0), '#ffca28'); P('head', at(prism(5.6, 5.6, 0.9, 8), 0, 7.0, 0), '#e6a800');            // มงกุฎ
    P('head', at(box(6.0, 0.8, 0.8), 0, 5.0, 4.4), '#212121');                                                                         // คิ้ว
    P('torso', at(box(10.2 * bw, 1.6, 6.2), 0, 1.2, 0), '#ffca28');
    P('torso', at(box(2.0, 11, 6.4), 3, 5.5, 0, 0, 0, 0.6), '#c62828');
    both(M, 'shA', 'shB', function () { return scl(sphere(3.7, 7, 4), 1.2, 0.9, 1.1); }, '#ffca28', 0.2, 0.3, 0);
    P('root', at(frustum(9 * bw, 5.2, 11 * bw, 6, 5.0), 0, -3.2, 0), '#b71c1c');
    // กระบองใหญ่
    P('wrA', at(box(1.2, 4.0, 1.2), 0, 0, 0), '#4e342e'); P('wrA', at(prism(1.2, 1.2, 12, 6), 0, 8, 0), '#6d4c41');
    P('wrA', at(prism(3.6, 2.6, 8, 7), 0, 18, 0), '#795548'); P('wrA', at(sphere(2.2, 6, 3), 0, 22.4, 0), '#8d6e63');
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; P('wrA', at(gem(0.7, 2.4, 4), Math.cos(a) * 3.4, 18 + (i % 2) * 2, Math.sin(a) * 3.4, Math.sin(a) * 1.0, 0, -Math.cos(a) * 1.0), '#cfd8dc'); }
    M.tip = [0, 21, 0]; M.tipBase = [0, 8, 0];
    return M;
  }
  function both(M, a, b, mk, color, x, y, z) { M.P(a, M.at(mk(), x, y, z), color); M.P(b, M.at(mk(), -x, y, z), color); }

  /* ---------- สัตว์/ผี: ท่าเฉพาะ ---------- */
  function zeros() { return new Float32Array(S.KEYS.length); }
  function setRest(M, f) { const r = zeros(); if (f) f(r); M.rest = r; }
  function K(out, k, v) { out[KI[k]] += v; }

  function croc() {
    const M = newModel('croc', 'beast', 1.0);
    const P = M.P, at = M.at, g = '#5f8a3c', g2 = '#46692c', belly = '#d8c98c';
    M.T = [
      [[0, 0, 0]], [[0, 0, 0]], [[0, 5.0, 8.5]],
      [[4.6, 5, 3]], [[0, 0, 0]], [[0, 0, 0]], [[-4.6, 5, 3]], [[0, 0, 0]], [[0, 0, 0]],
      [[4.6, 5, -7]], [[0, 0, 0]], [[0, 0, 0]], [[-4.6, 5, -7]], [[0, 0, 0]], [[0, 0, 0]]
    ];
    P('root', at(box(9.5, 5.4, 15), 0, 5.2, -2), g); P('root', at(box(7, 0.8, 14), 0, 2.4, -2), belly);
    for (let i = 0; i < 5; i++) P('root', at(box(2.0, 1.6, 2.0), 0, 8.4, -8 + i * 3.4), g2);      // สันหลัง
    P('root', at(frustum(7, 4.2, 5, 3.4, 9), 0, 4.8, -14.5, 1.5708, 0, 0), g); P('root', at(frustum(4.6, 3.2, 3, 2.4, 8), 0, 4.4, -21.5, 1.5708, 0, 0), g2); // หาง
    P('torso', at(box(9, 5, 4), 0, 5.2, 4.4), g);
    P('head', at(box(6.8, 3.2, 9), 0, 0.2, 4.2), g); P('head', at(box(5.4, 1.6, 9.6), 0, -1.8, 4.6), belly);
    P('head', at(box(5.8, 1.5, 3.2), 0, 1.0, 9.4), g2);
    for (let i = 0; i < 4; i++) { P('head', at(box(0.6, 1.2, 0.6), 2.5, -0.6, 2.5 + i * 2.4), '#ffffff'); P('head', at(box(0.6, 1.2, 0.6), -2.5, -0.6, 2.5 + i * 2.4), '#ffffff'); }
    P('head', at(box(1.8, 1.8, 1.8), 2.6, 2.4, 1.0), '#ffd54f'); P('head', at(box(1.8, 1.8, 1.8), -2.6, 2.4, 1.0), '#ffd54f');
    P('head', at(box(0.6, 1.0, 0.6), 2.6, 2.4, 1.9), '#111'); P('head', at(box(0.6, 1.0, 0.6), -2.6, 2.4, 1.9), '#111');
    ['shA', 'shB', 'hpA', 'hpB'].forEach(function (n) { const i = M.P(n, at(box(3.2, 5.0, 3.6), 0, -2.5, 0), g2); M.feet.push(i); P(n, at(box(3.6, 0.8, 4.8), 0, -5.0, 0.6), g); });
    setRest(M);
    M.anim = function (o, st, rt) {
      const a = st.atkP; if (a >= 0 && a < 1) { const k = Math.sin(a * Math.PI); K(o, 'head.rx', -0.5 * k); K(o, 'torso.rx', 0.12 * k); o[KI['root.y']] += 2.5 * k; }
      K(o, 'torso.ry', Math.sin(rt * 1.6 + st.id) * 0.06);
      if (st.dead > 0) { const k = Math.min(1, st.dead * 2.5); o[KI['root.rx']] = 0; o[KI['root.rz']] = 2.9 * k; }
    };
    return M;
  }

  function elephant() {   // ช้างเผือก
    const M = newModel('elephant', 'beast', 1.0);
    const P = M.P, at = M.at, g = '#f1ece2', g2 = '#d8cfbd', gold = '#ffca28';
    M.T = [
      [[0, 0, 0]], [[0, 0, 0]], [[0, 7.0, 9]],
      [[4.6, 7, 4]], [[0, 0, 0]], [[0, 0, 0]], [[-4.6, 7, 4]], [[0, 0, 0]], [[0, 0, 0]],
      [[4.6, 7, -6]], [[0, 0, 0]], [[0, 0, 0]], [[-4.6, 7, -6]], [[0, 0, 0]], [[0, 0, 0]]
    ];
    P('root', at(box(11, 8.5, 17), 0, 8.5, -1), g); P('root', at(box(11.6, 1.4, 12), 0, 12.9, -1), '#c62828'); P('root', at(box(11.8, 0.8, 12.4), 0, 12.3, -1), gold);   // ผ้าคลุมหลัง
    P('root', at(box(1.2, 5, 1.2), 0, 7.5, -10), g2);                                                                                                                      // หาง
    P('torso', at(box(10, 8, 5), 0, 8.2, 6), g);
    P('head', at(box(7.4, 7, 6.4), 0, 0.5, 3.6), g); P('head', at(frustum(3.4, 3.0, 2.4, 2.0, 8), 0, -3.6, 7.6, 0.5, 0, 0), g);          // หัว+งวง
    P('head', at(box(2.0, 2.0, 2.0), 0, -7.6, 10.2), g2);
    P('head', at(box(0.9, 0.9, 6), 2.6, -2.2, 8.0, 0.35, 0, 0), '#fff8e1'); P('head', at(box(0.9, 0.9, 6), -2.6, -2.2, 8.0, 0.35, 0, 0), '#fff8e1'); // งา
    P('head', at(box(0.6, 5.2, 5.2), 4.4, 0.8, 1.6, 0, 0, 0.5), g2); P('head', at(box(0.6, 5.2, 5.2), -4.4, 0.8, 1.6, 0, 0, -0.5), g2);           // หู
    P('head', at(box(1.0, 1.0, 1.0), 2.5, 1.4, 6.6), '#c62828'); P('head', at(box(1.0, 1.0, 1.0), -2.5, 1.4, 6.6), '#c62828');
    P('head', at(box(7.6, 1.2, 1.2), 0, -1.0, 1.0), gold);
    ['shA', 'shB', 'hpA', 'hpB'].forEach(function (n) { const i = M.P(n, at(box(4.2, 7.0, 4.2), 0, -3.5, 0), g); M.feet.push(i); P(n, at(box(4.6, 1.0, 5.0), 0, -7.0, 0.4), g2); });
    setRest(M);
    M.anim = function (o, st, rt) {
      const a = st.atkP; if (a >= 0 && a < 1) { const k = Math.sin(a * Math.PI); K(o, 'head.rx', -0.55 * k); o[KI['root.y']] += 2.2 * k; }
      K(o, 'head.rx', Math.sin(rt * 1.8 + st.id) * 0.06); K(o, 'torso.ry', Math.sin(rt * 1.2 + st.id) * 0.05);
      if (st.dead > 0) { const k = Math.min(1, st.dead * 2.5); o[KI['root.rx']] = 0; o[KI['root.rz']] = 2.9 * k; }
    };
    return M;
  }
  function cannon() {   // ฐานปืนใหญ่ร้าง
    const M = newModel('cannon', 'beast', 1.0);
    const P = M.P, at = M.at, w = '#6d4c41', w2 = '#4e342e', iron = '#37474f';
    M.T = [
      [[0, 0, 0]], [[0, 0, 0]], [[0, 12, 0]],
      [[0, 0, 0]], [[0, 0, 0]], [[0, 0, 0]], [[0, 0, 0]], [[0, 0, 0]], [[0, 0, 0]],
      [[0, 0, 0]], [[0, 0, 0]], [[0, 0, 0]], [[0, 0, 0]], [[0, 0, 0]], [[0, 0, 0]]
    ];
    P('root', at(box(16, 2.4, 16), 0, 1.2, 0), '#8d8d84'); P('root', at(box(14, 2.4, 14), 0, 3.6, 0), '#a1a198');            // ฐานหิน
    P('root', at(box(11, 2.2, 8), 0, 6.2, 0), w);
    for (let i = 0; i < 2; i++) { const x = i ? 5.2 : -5.2; P('root', at(box(1.6, 8, 8), x, 7.5, 0), w2); P('root', at(box(1.8, 6.5, 6.5), x * 1.12, 6.2, 0), '#3e2723'); P('root', at(box(2.0, 1.4, 1.4), x * 1.12, 6.2, 0), '#ffca28'); } // ล้อ
    P('torso', at(box(5.4, 5.4, 15), 0, 10, 0), iron); P('torso', at(box(6.6, 6.6, 3.0), 0, 10, -6.4), '#263238'); P('torso', at(box(6.0, 6.0, 1.6), 0, 10, 7.0), '#455a64'); // ลำกล้อง
    P('torso', at(box(2.4, 2.4, 0.6), 0, 10, 8.0), '#111');
    P('head', at(box(3, 3, 3), 0, 4.0, -9), '#ff6f00'); P('head', at(box(1.4, 1.4, 1.4), 0, 6.4, -9.2), '#ffd54f');                  // ไฟปากชนวน
    for (let i = 0; i < 4; i++) P('root', at(box(3.2, 3.2, 3.2), -9 + (i % 2) * 18, 3.2, 8 + (i >> 1) * 4), '#2e2e2e');                  // ลูกปืนกองข้าง
    ['shA', 'shB', 'hpA', 'hpB'].forEach(function (n) { M.feet.push(M.P(n, at(box(0.2, 0.2, 0.2), 0, 0, 0), '#555')); });   // ขาเทียม (ให้ระบบวาดถือว่ามีเท้า)
    setRest(M);
    M.anim = function (o, st, rt) {
      const a = st.atkP; if (a >= 0 && a < 1) { const k = Math.sin(a * Math.PI); K(o, 'torso.rx', -0.25 * k); o[KI['root.z']] -= 2 * k; }
      if (st.dead > 0) { o[KI['root.y']] -= Math.min(1, st.dead) * 4; }
    };
    return M;
  }
  function snake(nm, pal) {
    const M = newModel(nm || 'snake', 'beast', 1.0);
    const P = M.P, at = M.at, g = pal ? pal[0] : '#d9a400', g2 = pal ? pal[1] : '#3b2a10', g3 = pal ? pal[2] : '#f5d36a';
    M.T = [
      [[0, 0, 0]], [[0, 2.5, 0]], [[0, 11, 0]],
      [[0, 0, 0]], [[0, 0, 0]], [[0, 0, 0]], [[0, 0, 0]], [[0, 0, 0]], [[0, 0, 0]],
      [[0, 0, 0]], [[0, 0, 0]], [[0, 0, 0]], [[0, 0, 0]], [[0, 0, 0]], [[0, 0, 0]]
    ];
    for (let i = 0; i < 3; i++) { // ขดตัวเป็นวง
      const r = 8 - i * 1.6, y = 1.8 + i * 3.0;
      for (let j = 0; j < 8; j++) { const a = j / 8 * Math.PI * 2 + i * 0.5; M.feet.push(P('root', at(box(5, 3.2, 5), Math.cos(a) * r, y, Math.sin(a) * r, 0, -a, 0), (j + i) % 2 ? g : g2)); }
    }
    P('root', at(box(4.6, 3.0, 12), 3, 1.5, -12, 0, 0.35, 0), g); P('root', at(box(3.4, 2.4, 10), 4.5, 1.2, -21, 0, 0.1, 0), g2);   // หาง
    P('torso', at(frustum(5.2, 4.4, 6.2, 5.0, 9), 0, 4.5, 0), g); P('torso', at(box(4.0, 8, 1.0), 0, 4.5, 2.6), g3);
    P('torso', at(box(5.4, 1.4, 5.0), 0, 2.0, 0), g2); P('torso', at(box(5.0, 1.4, 4.6), 0, 6.0, 0), g2);
    P('head', at(box(5.2, 4.2, 6.4), 0, 0.5, 2.0), g); P('head', at(box(3.2, 3, 3.6), 0, -0.4, 6.0), g);
    P('head', at(box(14, 10, 0.8), 0, 0.8, -1.2), g); P('head', at(box(11, 7.6, 0.6), 0, 0.8, -1.7), g2);                           // แผ่แม่เบี้ย
    P('head', at(box(1.1, 1.4, 1.1), 2.2, 1.6, 4.6), '#ff1744'); P('head', at(box(1.1, 1.4, 1.1), -2.2, 1.6, 4.6), '#ff1744');
    P('head', at(box(0.5, 2.6, 0.5), 0.9, -2.4, 7.6), '#ffffff'); P('head', at(box(0.5, 2.6, 0.5), -0.9, -2.4, 7.6), '#ffffff');
    P('head', at(box(0.4, 0.4, 3.0), 0, -1.6, 8.8), '#d81b60');
    setRest(M);
    M.anim = function (o, st, rt) {
      const sw = Math.sin(rt * 2.0 + st.id) * 0.18; K(o, 'torso.rz', sw); K(o, 'head.rz', -sw * 1.3); K(o, 'torso.ry', Math.sin(rt * 1.3 + st.id) * 0.25);
      const a = st.atkP; if (a >= 0 && a < 1) { const k = Math.sin(a * Math.PI); K(o, 'torso.rx', 0.95 * k); K(o, 'head.rx', 0.3 * k); }
      if (st.dead > 0) { const k = Math.min(1, st.dead * 2.5); o[KI['torso.rx']] = -1.2 * k; o[KI['head.rx']] = -0.6 * k; }
    };
    return M;
  }

  function krasue() {
    const M = newModel('krasue', 'beast', 1.0);
    const P = M.P, at = M.at;
    M.T = [
      [[0, 0, 0]], [[0, 16, 0]], [[0, 0, 0]],
      [[0, 0, 0]], [[0, 0, 0]], [[0, 0, 0]], [[0, 0, 0]], [[0, 0, 0]], [[0, 0, 0]],
      [[1.6, 13, 0]], [[0, -4.4, 0]], [[0, -4.4, 0]], [[-1.6, 13, 0]], [[0, -4.4, 0]], [[0, -4.4, 0]]
    ];
    P('head', at(scl(sphere(5.6, 9, 5), 1, 1.1, 1.05), 0, 0, 0), '#e8d9c8', { glow: 11, gc: ['rgba(200,235,255,.22)', 'rgba(160,210,255,.1)'] });
    P('head', at(scl(sphere(6.0, 9, 4), 1.02, 0.75, 1.1), 0, 2.4, -1.2), '#1c1416');
    for (let i = 0; i < 7; i++) { const a = (i - 3) * 0.42; P('head', at(box(1.4, 1.2, 9 + (i % 2) * 3), Math.sin(a) * 5.0, 0.6 - Math.abs(i - 3) * 0.6, -6 - (i % 2) * 1.5, 0.35, a * 0.4, 0), '#1c1416'); }
    P('head', at(box(1.6, 1.6, 1.0), 2.2, 1.0, 5.2), '#ff3d00', { em: true, glow: 4, gc: ['rgba(255,110,60,.9)', 'rgba(255,60,30,.35)'] });
    P('head', at(box(1.6, 1.6, 1.0), -2.2, 1.0, 5.2), '#ff3d00', { em: true, glow: 4, gc: ['rgba(255,110,60,.9)', 'rgba(255,60,30,.35)'] });
    P('head', at(box(3.4, 0.9, 0.9), 0, -2.6, 5.0), '#7a0d0d');
    P('head', at(box(0.6, 1.3, 0.6), 1.3, -3.2, 5.0), '#ffffff'); P('head', at(box(0.6, 1.3, 0.6), -1.3, -3.2, 5.0), '#ffffff');
    P('torso', at(box(5.0, 2.6, 4.4), 0, -6.4, 0), '#e8d9c8');                                    // คอ
    ['A', 'B'].forEach(function (s, i) {
      const k = i ? -1 : 1;
      P('hp' + s, at(sphere(1.7, 6, 3), 0, -0.4, 0), '#c62828'); P('kn' + s, at(sphere(1.5, 6, 3), 0, -0.4, 0), '#e57373');
      M.feet.push(P('ft' + s, at(sphere(1.3, 6, 3), 0, -0.4, 0), '#b71c1c'));
      P('hp' + s, at(box(1.0, 3.2, 1.0), 0, -2.2, 0), '#ef9a9a'); P('kn' + s, at(box(0.9, 3.2, 0.9), 0, -2.2, 0), '#ef9a9a');
    });
    setRest(M);
    M.anim = function (o, st, rt) {
      o[KI['root.y']] += 10 + Math.sin(rt * 2.4 + st.id) * 1.6;
      K(o, 'hpA.rx', Math.sin(rt * 3 + st.id) * 0.4 - 0.15); K(o, 'knA.rx', Math.sin(rt * 3 - 0.8 + st.id) * 0.5); K(o, 'hpB.rx', Math.sin(rt * 3 + 2 + st.id) * 0.4 - 0.15); K(o, 'knB.rx', Math.sin(rt * 3 + 1.2 + st.id) * 0.5);
      K(o, 'hpA.rz', Math.sin(rt * 2.4) * 0.25 + 0.2); K(o, 'hpB.rz', Math.sin(rt * 2.4 + 2) * 0.25 - 0.2);
      K(o, 'head.rz', Math.sin(rt * 1.7 + st.id) * 0.1);
      const a = st.atkP; if (a >= 0 && a < 1) { const k = Math.sin(a * Math.PI); K(o, 'root.rx', 0.4 * k); o[KI['root.y']] -= 3 * k; }
      if (st.dead > 0) { const k = Math.min(1, st.dead * 2.5); o[KI['root.rx']] = 0; o[KI['root.y']] = 10 * (1 - k); K(o, 'head.rz', 1.2 * k); }
    };
    return M;
  }

  function krahang() {
    const M = newModel('krahang', 'beast', 1.0);
    const P = M.P, at = M.at, fur = '#4b3a32', fur2 = '#2e221d', wing = '#c9a66b';
    M.T = [
      [[0, 0, 0]], [[0, 0.8, 0]], [[0, 10.3, 0]],
      [[5.4, 8.5, -1]], [[0, 0, 0]], [[0, 0, 0]], [[-5.4, 8.5, -1]], [[0, 0, 0]], [[0, 0, 0]],
      [[2.0, -0.6, 0]], [[0, -6.2, 0]], [[0, -6, 0]], [[-2.0, -0.6, 0]], [[0, -6.2, 0]], [[0, -6, 0]]
    ];
    P('root', at(box(7.2, 3.8, 4.8), 0, -0.2, 0), fur2);
    P('torso', at(frustum(9.2, 5.4, 7.0, 4.6, 9.8), 0, 4.9, 0), fur);
    P('torso', at(box(7.0, 4.6, 0.6), 0, 5.0, 2.8), '#8d6e63');
    P('head', at(scl(sphere(4.2, 8, 4), 1, 1.05, 1.0), 0, 4.6, 0), '#6d4c41');
    P('head', at(box(3.6, 2.4, 1.6), 0, 3.2, 3.8), '#a1887f');
    P('head', at(box(1.1, 1.1, 0.6), 1.5, 5.2, 3.9), '#ff1744', { em: true, glow: 2.6, gc: ['rgba(255,80,80,.8)', 'rgba(255,40,40,.3)'] });
    P('head', at(box(1.1, 1.1, 0.6), -1.5, 5.2, 3.9), '#ff1744', { em: true, glow: 2.6, gc: ['rgba(255,80,80,.8)', 'rgba(255,40,40,.3)'] });
    P('head', at(gem(1.0, 3.2, 4), 2.6, 9.6, 0, 0, 0, -0.3), fur2); P('head', at(gem(1.0, 3.2, 4), -2.6, 9.6, 0, 0, 0, 0.3), fur2);   // หู
    P('head', at(box(0.6, 1.5, 0.6), 0.9, 1.9, 4.6), '#ffffff'); P('head', at(box(0.6, 1.5, 0.6), -0.9, 1.9, 4.6), '#ffffff');
    // ปีกกระด้ง (แกนปีกชี้ออกด้านข้างแล้วเอียงขึ้น) : โหนด shA = ขวา (+x) shB = ซ้าย (-x)
    P('shA', at(prism(9.5, 9.5, 0.8, 9), 9.0, 2.0, -1.2, 0, 0, 0.18), wing); P('shA', at(prism(7.0, 7.0, 0.9, 9), 9.0, 2.0, -1.2, 0, 0, 0.18), '#a17f44'); P('shA', at(box(9, 0.9, 1.0), 4.5, 0.6, -1.2), fur2);
    P('shB', at(prism(9.5, 9.5, 0.8, 9), -9.0, 2.0, -1.2, 0, 0, -0.18), wing); P('shB', at(prism(7.0, 7.0, 0.9, 9), -9.0, 2.0, -1.2, 0, 0, -0.18), '#a17f44'); P('shB', at(box(9, 0.9, 1.0), -4.5, 0.6, -1.2), fur2);
    ['A', 'B'].forEach(function (s) { P('hp' + s, at(box(2.4, 6.2, 2.4), 0, -3.0, 0), fur2); M.feet.push(P('kn' + s, at(box(2.0, 6.0, 2.0), 0, -3.0, 0), fur)); P('ft' + s, at(box(2.6, 1.0, 3.8), 0, 0, 1.0), '#8d6e63'); });
    setRest(M);
    M.anim = function (o, st, rt) {
      const f = Math.sin(rt * 9 + st.id); o[KI['root.y']] += 9 + Math.sin(rt * 2.2 + st.id) * 1.2;
      K(o, 'shA.rz', f * 0.55); K(o, 'shB.rz', -f * 0.55); K(o, 'torso.rx', 0.12); K(o, 'hpA.rx', 0.35); K(o, 'hpB.rx', 0.25);
      const a = st.atkP; if (a >= 0 && a < 1) { const k = Math.sin(a * Math.PI); K(o, 'root.rx', 0.5 * k); K(o, 'hpA.rx', -0.6 * k); K(o, 'hpB.rx', -0.6 * k); }
      if (st.dead > 0) { const k = Math.min(1, st.dead * 2.5); o[KI['root.rx']] = 0; o[KI['root.y']] = 9 * (1 - k); K(o, 'root.rz', 1.4 * k); }
    };
    return M;
  }


  /* ---------- ป้อมตามยุค (ราชธานีใช้แบบเดียวกัน เพิ่มมงกุฎ) ----------
     root = ฐาน, torso = ตัวป้อม, head = ป้อมปืน/อาวุธที่หมุนตามเป้า (st.aim), shA = เสาธงโบก
     anim: st.atkP = ท่าสะบัดตอนยิง, st.collapse = กำลังพังทลาย 0..1 (จมลงพื้นพร้อมเอียงสั่น) */
  function tower(era, team, king) {
    const M = newModel('tower' + era + team + (king ? 'k' : ''), 'beast', 1.0);
    const P = M.P, at = M.at, tc = team === 0 ? '#4c8dff' : '#ff5a4f', td = team === 0 ? '#1f4fbf' : '#b3261e';
    const T0 = [[0, 0, 0]];
    M.T = []; for (let i = 0; i < 15; i++) M.T.push(T0);
    let H = 30, top = 40;
    P('root', at(prism(19, 21, 2.4, 14), 0, 1.2, 0), '#8a8a80'); P('root', at(prism(21.5, 21.5, 1.0, 14), 0, 0.4, 0), td);
    const fl = function (i) { M.feet.push(i); return i; };
    fl(M.parts.length - 2);
    if (era === 0) {                                              // ค่ายไม้ยกพื้น
      H = 30; top = 46;
      [[-9, -9], [9, -9], [-9, 9], [9, 9]].forEach(function (q) { P('torso', at(prism(1.7, 2.1, 24, 6), q[0], 13.5, q[1]), '#6d4c41'); });
      P('torso', at(box(7, 1.2, 1.0), 0, 8, 9.2, 0, 0, 0.5), '#8d6e63'); P('torso', at(box(7, 1.2, 1.0), 0, 8, -9.2, 0, 0, -0.5), '#8d6e63');
      P('torso', at(box(25, 2.4, 25), 0, 26, 0), '#8d6e63');
      P('torso', at(box(19, 9, 19), 0, 32, 0), '#a1887f');
      P('torso', at(prism(0, 17, 12, 4), 0, 43, 0, 0, 0.785, 0), '#c9a14a'); P('torso', at(prism(0, 13, 6, 4), 0, 46, 0, 0, 0.785, 0), '#b8923f');
      P('head', at(box(3.2, 3.2, 10), 0, 3, 5.5), '#5d4037'); P('head', at(box(11, 1.0, 1.0), 0, 3.2, 8.5), '#8d6e63'); P('head', at(box(0.3, 0.3, 11), 0, 3.4, 9), '#efe6c9');
      H = 29;
    } else if (era === 1) {                                       // กำแพงอิฐ + ปืนใหญ่
      H = 31; top = 40;
      P('torso', at(prism(10, 12.5, 30, 12), 0, 16, 0), '#b0714f');
      for (let i = 0; i < 4; i++) P('torso', at(box(22, 0.5, 22), 0, 5 + i * 7, 0), '#9b5f40');
      P('torso', at(prism(12.5, 12.5, 2.6, 12), 0, 30.5, 0), '#8f573a');
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; P('torso', at(box(4.4, 4.5, 3.0), Math.cos(a) * 11.2, 34.2, Math.sin(a) * 11.2, 0, -a + Math.PI / 2, 0), '#b0714f'); }
      P('torso', at(box(6, 10, 1.0), 0, 8, 12.6), '#5b3a2a');
      P('head', at(prism(2.2, 2.2, 14, 8), 0, 3.5, 5.5, 1.5708, 0, 0), '#37474f'); P('head', at(prism(2.8, 2.8, 3, 8), 0, 3.5, 12.5, 1.5708, 0, 0), '#263238');
      P('head', at(sphere(3.4, 7, 4), 0, 3.5, -1.5), '#455a64'); P('head', at(prism(2.6, 2.6, 1.4, 10), 4.4, 1.6, 0, 0, 0, 1.5708), '#5d4037'); P('head', at(prism(2.6, 2.6, 1.4, 10), -4.4, 1.6, 0, 0, 0, 1.5708), '#5d4037');
    } else if (era === 2) {                                       // บังเกอร์ + ปืนกล
      H = 24; top = 38;
      P('torso', at(box(30, 12, 30), 0, 8, 0), '#8a8574'); P('torso', at(box(31, 2.4, 31), 0, 14.4, 0), '#9c9784');
      P('torso', at(box(22, 2.6, 1.2), 0, 11, 15.4), '#2b2b2b');
      for (let i = -3; i <= 3; i++) { P('torso', at(box(3.6, 3.0, 4.4), i * 4.4, 3.2, 16.8), '#a8956a'); P('torso', at(box(3.6, 3.0, 4.4), i * 4.4, 3.2, -16.8), '#a8956a'); }
      P('torso', at(box(17, 8, 17), 0, 19.5, 0), '#6e6b5e'); P('torso', at(box(18, 1.2, 18), 0, 24, 0), '#7c796b');
      P('head', at(box(1.6, 1.6, 15), 0, 3, 8), '#212121'); P('head', at(box(5.4, 5, 6), 0, 3, 2), '#37474f'); P('head', at(box(8, 7, 1.0), 0, 4, 11), '#4b5254');
      H = 25;
    } else {                                                      // ป้อมไฟฟ้า + กล้องวงจรปิด
      H = 44; top = 52;
      P('torso', at(box(22, 8, 22), 0, 5, 0), '#78909c'); P('torso', at(frustum(8, 8, 14, 14, 34), 0, 24, 0), '#9eb1ba'); P('torso', at(box(3, 34, 3), 6.5, 24, 6.5), '#c3d0d6');
      for (let i = 0; i < 3; i++) P('torso', at(box(14.6, 1.8, 14.6), 0, 14 + i * 9, 0), '#4dd0e1', { em: true });
      P('torso', at(box(12, 2, 12), 0, 41, 0), '#546e7a');
      P('head', at(sphere(4.4, 8, 4), 0, 3, 0), '#263238'); P('head', at(sphere(2.6, 7, 4), 0, 3, 3.4), '#4dd0e1', { em: true, glow: 9, gc: ['rgba(120,230,255,.7)', 'rgba(80,200,255,.25)'] });
      P('head', at(box(1.4, 1.4, 8), 5, 3, 3), '#37474f'); P('head', at(box(3, 2, 3), 5, 3, 7), '#37474f');
    }
    // เสาธงสีทีมบนยอด
    P('shA', at(prism(0.5, 0.5, 14, 5), 0, 7, 0), '#4e342e'); P('shA', at(box(11, 6, 0.5), 5.6, 11, 0), tc); P('shA', at(box(4, 2.6, 0.5), 12.8, 12.7, 0), shHex(tc, 0.8));
    M.T[3] = [[0, top + (king ? 6 : 0) - 12, 0]];
    M.T[2] = [[0, H, 0]];
    if (king) {
      P('shA', at(prism(6.5, 8, 2.2, 8), 0, 5.2, 0), '#ffca28'); P('shA', at(prism(9.5, 9.5, 0.9, 8), 0, 3.6, 0), '#e6a800');
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; P('shA', at(gem(1.2, 4.2, 4), Math.cos(a) * 7, 8.2, Math.sin(a) * 7), '#fff59d', { em: true }); }
    }
    M.hasAim = true; M.towerH = top;
    setRest(M);
    M.anim = function (o, st, rt) {
      o[KI['head.ry']] = (st.aim || 0);
      const a = st.atkP; if (a >= 0 && a < 1) { const k = Math.sin(a * Math.PI) * (1 - a); o[KI['head.rx']] -= 0.22 * k; o[KI['torso.rx']] -= 0.015 * k; }
      o[KI['shA.rz']] = Math.sin(rt * 3.2 + st.id) * 0.16 - 0.05;
      if (st.collapse > 0) { const k = Math.min(1, st.collapse), sh = Math.sin(rt * 40) * (1 - k) * 0.03;
        o[KI['root.y']] = -top * 1.05 * k * k; o[KI['torso.rx']] = 0.28 * k + sh; o[KI['torso.rz']] = (st.id % 2 ? 1 : -1) * 0.2 * k + sh; o[KI['head.rx']] = 0.5 * k; o[KI['head.rz']] = 0.4 * k; o[KI['shA.rz']] = 1.3 * k; }
    };
    return M;
  }

  const TAU = S.TAU;
  const CACHE = {};
  function model(kind, team) {
    const key = kind + (team === undefined ? '' : (Array.isArray(team) ? team.join('_') : team));
    if (CACHE[key]) return CACHE[key];
    let M;
    if (kind === 'minionM') M = minion(false, team); else if (kind === 'minionR') M = minion(true, team);
    else if (kind === 'boss') M = boss(); else if (kind === 'croc') M = croc(); else if (kind === 'snake') M = snake(); else if (kind === 'cannon') M = cannon(); else if (kind === 'elephant') M = elephant(); else if (kind === 'naga') M = snake('naga', ['#00acc1', '#0d3c4a', '#b2ebf2']);
    else if (kind === 'tower') M = tower(team[0], team[1], team[2]);
    else if (kind === 'krasue') M = krasue(); else if (kind === 'krahang') M = krahang();
    else return null;
    M.hasGlow = M.parts.some(function (p) { return p.glow; });
    M.P = M.at = null;
    return (CACHE[key] = M);
  }
  TR.Units3D = { model: model, kinds: ['tower', 'minionM', 'minionR', 'boss', 'croc', 'snake', 'elephant', 'naga', 'cannon', 'krasue', 'krahang'] };
})(typeof globalThis !== 'undefined' ? globalThis : this);
