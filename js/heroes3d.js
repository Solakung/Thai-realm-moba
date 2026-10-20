/* Thai Realm — โมเดล 3D low-poly ของฮีโร่ 12 ตัว (ส่วนที่ 2/3 ของเวที 3D)
   ทุกตัวใช้โครงร่างเดียวกัน (15 ข้อต่อ) แล้วต่อเครื่องแต่งกาย/อาวุธเฉพาะตัวจากรูปทรงพื้นฐาน
   แกนโมเดล: +y ขึ้น, +z คือด้านหน้าของตัวละคร, แขนข้างอาวุธอยู่ฝั่ง +x (ข้อมือ wrA มีแกน +y เป็นแกนอาวุธ) */
(function (G) {
  'use strict';
  const TR = G.TR, S = TR.S3D;
  const box = S.box, frustum = S.frustum, prism = S.prism, sphere = S.sphere, gem = S.gem, scl = S.scl, place = S.place, shHex = S.shHex, H = S.H, IDX = S.IDX;
  const SKIN = '#f1caa0';
  const ROLE_BW = { tank: 1.28, fighter: 1.05, mage: 0.94, marksman: 0.94, assassin: 0.86, support: 1.0 };
  const ROLE_SCALE = { tank: 1.08, fighter: 1.02, mage: 0.99, marksman: 1.0, assassin: 0.97, support: 0.99 };
  const STYLE = { nakdab: 'melee', phran: 'bow', mohya: 'staff', kwan: 'melee', mothamma: 'staff', muay: 'fist', seri: 'gun', yai: 'melee', spy: 'melee', mae: 'melee', win: 'melee', chang: 'staff' };

  function build(def) {
    const id = def.id, col = def.colors, role = def.role;
    const bw = ROLE_BW[role] || 1, lw = 0.9 + 0.1 * bw;
    const body = col.body, acc = col.accent, hair = col.hair;
    const M = { id: id, parts: [], bw: bw, style: STYLE[id] || 'melee', scale: ROLE_SCALE[role] || 1, tip: [0, 13, 0], tipBase: [0, 5, 0], feet: [] };
    const HX = 4.6 * bw + 1.0, LX = 2.2 * lw + 0.2, BASE = [1.5708, 0, 0];
    M.T = [
      [[0, 0, 0]], [[0, 0.8, 0]], [[0, 10.3, 0]],
      [[HX, 8.7, 0]], [[0, -5.6, 0]], [[0, -5.0, 0], BASE],
      [[-HX, 8.7, 0]], [[0, -5.6, 0]], [[0, -5.0, 0], BASE],
      [[LX, -0.6, 0]], [[0, -7.2, 0]], [[0, -7.4, 0]],
      [[-LX, -0.6, 0]], [[0, -7.2, 0]], [[0, -7.4, 0]]
    ];
    const P = function (n, mesh, color, o) { const p = { n: IDX[n], m: mesh, c: H(color), cc: color, em: !!(o && o.em), glow: (o && o.glow) || 0 }; M.parts.push(p); return p; };
    const at = function (mesh, x, y, z, rx, ry, rz) { return place(mesh, [x, y, z], [rx || 0, ry || 0, rz || 0]); };
    const both = function (nodeA, nodeB, mk, color, x, y, z, rx, ry, rz) { // วางคู่ซ้ายขวา (สะท้อนแกน x)
      P(nodeA, at(mk(), x, y, z, rx, ry, rz), color); P(nodeB, at(mk(), -x, y, z, rx, -(ry || 0), -(rz || 0)), color);
    };

    const cfg = { pants: shHex(body, 0.45), boots: '#3b2a20', sleeve: body, fore: SKIN, torso: body, shin: null, eyes: true };
    switch (id) {
      case 'nakdab': cfg.pants = '#4a2a22'; cfg.fore = '#e8d5b0'; break;
      case 'phran': cfg.pants = '#4e5a2e'; cfg.sleeve = '#3f6f35'; break;
      case 'mohya': cfg.pants = '#6d5a3a'; cfg.fore = '#a5d66b'; break;
      case 'kwan': cfg.pants = '#7a1f12'; cfg.boots = '#4e342e'; cfg.sleeve = '#7a1f12'; break;
      case 'mothamma': cfg.pants = '#4a148c'; cfg.sleeve = '#7b1fa2'; cfg.fore = '#7b1fa2'; break;
      case 'muay': cfg.pants = '#f5f5f5'; cfg.sleeve = SKIN; cfg.torso = SKIN; cfg.shin = SKIN; cfg.boots = SKIN; break;
      case 'seri': cfg.torso = '#6b705c'; cfg.sleeve = '#6b705c'; cfg.fore = '#6b705c'; cfg.pants = '#4f5442'; break;
      case 'yai': cfg.torso = '#6d4c41'; cfg.sleeve = '#6d4c41'; cfg.pants = '#2e2a28'; break;
      case 'spy': cfg.torso = '#1b1f23'; cfg.sleeve = '#1b1f23'; cfg.fore = '#1b1f23'; cfg.pants = '#14171a'; cfg.boots = '#0e0e0e'; break;
      case 'mae': cfg.torso = '#fff59d'; cfg.sleeve = '#fff59d'; cfg.pants = '#6d4c41'; break;
      case 'win': cfg.torso = '#37474f'; cfg.sleeve = '#37474f'; cfg.pants = '#263238'; cfg.boots = '#212121'; break;
      case 'chang': cfg.torso = '#fdd835'; cfg.sleeve = '#fdd835'; cfg.pants = '#455a64'; break;
    }

    /* ----- ร่างพื้นฐาน ----- */
    P('root', at(box(7.6 * bw, 3.4, 4.6), 0, -0.2, 0), cfg.pants);
    P('torso', at(frustum(9.6 * bw, 5.4, 7.2 * bw, 4.6, 9.8), 0, 4.9, 0), cfg.torso);
    P('head', at(box(2.2, 1.8, 2.2), 0, 0.2, 0), SKIN);
    P('head', at(scl(sphere(4.3, 8, 4), 1, 1.08, 1.02), 0, 4.6, 0), SKIN);
    P('head', at(scl(sphere(4.55, 8, 4), 1, 0.78, 1.02), 0, 6.1, -0.9), hair);
    if (cfg.eyes) both('head', 'head', function () { return box(0.8, 1.1, 0.5); }, '#2b1b14', 1.55, 4.7, 4.2);
    ['A', 'B'].forEach(function (s) {
      const k = s === 'A' ? 1 : -1;
      P('sh' + s, at(box(2.8, 5.8, 2.8), 0, -2.7, 0), cfg.sleeve);
      P('el' + s, at(box(2.4, 5.2, 2.4), 0, -2.5, 0), cfg.fore);
      P('wr' + s, at(box(2.5, 2.4, 2.5), 0, 0, 1.0), SKIN);
      P('hp' + s, at(box(3.5 * lw, 7.4, 3.7 * lw), 0, -3.5, 0), cfg.pants);
      P('kn' + s, at(frustum(3.1, 3.2, 2.5, 2.7, 7.4), 0, -3.6, 0), cfg.shin || cfg.pants);
      const ft = P('ft' + s, at(box(3.0, 1.9, 5.6), 0, -0.1, 1.3), cfg.boots); M.feet.push(M.parts.length - 1);
    });
    P('root', at(box(7.8 * bw, 1.0, 4.9), 0, 1.3, 0), shHex(cfg.pants, 0.7)); // เข็มขัด

    const staff = function (len, color, w) { return at(prism(w || 0.6, w || 0.6, len, 6), 0, len / 2 - 3, 0); };

    /* ----- เครื่องแต่งกายและอาวุธเฉพาะตัว ----- */
    switch (id) {
      case 'nakdab': {
        P('head', at(prism(4.7, 4.7, 1.2, 8), 0, 5.7, 0), '#e53935');                 // ผ้าคาดหัว
        P('head', at(box(1.1, 3.4, 0.7), 0.8, 4.4, -4.9, 0.25, 0, 0.1), '#e53935'); P('head', at(box(1.1, 3.0, 0.7), -1.0, 4.0, -4.7, 0.2, 0, -0.2), '#c62828');
        P('torso', at(box(10.0 * bw, 1.5, 5.8), 0, 1.0, 0), acc);                       // สายคาด
        P('torso', at(box(1.6, 11, 5.7), -1.4, 5.5, 0, 0, 0, -0.5), '#d4a017');
        both('shA', 'shB', function () { return box(3.1, 1.2, 3.1); }, acc, 0, -0.2, 0);
        P('wrA', at(box(0.9, 3.2, 0.9), 0, 0, 0), '#5d4037');
        P('wrA', at(box(3.8, 0.7, 1.5), 0, 1.9, 0), acc);
        P('wrA', at(box(1.5, 11, 0.45), 0, 8.1, 0), '#e9eef2');
        P('wrA', at(scl(prism(0, 0.95, 2.8, 4), 1, 1, 0.32), 0, 15.0, 0, 0, 0.78, 0), '#f5f8fa');
        M.tip = [0, 14.5, 0]; M.tipBase = [0, 4, 0];
        break; }
      case 'phran': {
        P('head', at(prism(0, 7.4, 4.2, 8), 0, 9.6, 0), '#c9a65a'); P('head', at(prism(7.8, 7.8, 0.5, 8), 0, 7.6, 0), '#b8923f');
        P('torso', at(prism(1.5, 1.5, 9, 6), -2.0, 5.2, -3.9, 0.25, 0, 0.35), '#6d4c41');   // กระบอกธนู
        for (let i = 0; i < 3; i++) P('torso', at(box(0.4, 2.6, 0.4), -3.3 + i * 0.9, 11.2 + i * 0.15, -4.2, 0.25, 0, 0.35), i === 1 ? acc : '#ececec');
        P('torso', at(box(1.2, 11, 5.7), 1.4, 5.5, 0, 0, 0, 0.5), '#8d6e63');             // สายสะพาย
        P('root', at(box(7.9 * bw, 1.6, 5.0), 0, 1.0, 0), '#6d4c41');
        // คันธนู (แกน +y คือแนวคัน ปลายโค้งเข้าหาผู้ยิง -z)
        P('wrA', at(box(0.9, 4.2, 0.9), 0, 0, 0), '#8d6e63');
        P('wrA', at(box(0.75, 6, 0.75), 0, 5, -0.8, -0.32, 0, 0), '#a1887f'); P('wrA', at(box(0.75, 6, 0.75), 0, -5, -0.8, 0.32, 0, 0), '#a1887f');
        P('wrA', at(box(0.55, 2.4, 0.55), 0, 8.6, -2.2, -0.55, 0, 0), '#6d4c41'); P('wrA', at(box(0.55, 2.4, 0.55), 0, -8.6, -2.2, 0.55, 0, 0), '#6d4c41');
        P('wrA', at(box(0.14, 19.5, 0.14), 0, 0, -2.6), '#f1ebd8');
        M.tip = [0, 9, -2]; M.tipBase = [0, 0, 0];
        break; }
      case 'mohya': {
        P('head', at(sphere(2.1, 6, 3), -1.2, 9.6, -2.6), hair);
        P('head', at(prism(4.7, 4.7, 1.1, 8), 0, 5.8, 0), '#9ccc65'); P('head', at(gem(1.0, 3.2, 4), 3.6, 8.2, 2.2, 0.1, 0, -0.5), '#7cb342'); P('head', at(gem(0.9, 2.8, 4), 4.6, 7.2, 1.0, 0, 0, -1.0), '#aed581');
        P('torso', at(box(7.4 * bw, 8.4, 0.6), 0, 4.2, 2.6), '#fff8e1');               // ผ้ากันเปื้อน
        P('torso', at(box(10 * bw, 1.4, 5.8), 0, 1.1, 0), '#a1887f');
        P('root', at(box(3.6, 3.2, 3.0), -4.6 * bw - 0.6, -0.3, 1.0), '#8d6e63');      // ตะกร้าสมุนไพร
        P('root', at(sphere(1.6, 6, 3), -4.6 * bw - 0.6, 1.7, 1.0), '#7cb342'); P('root', at(sphere(1.2, 6, 3), -5.4 * bw, 2.0, 1.6), '#9ccc65');
        P('wrA', staff(19, '#8d6e63', 0.55), '#8d6e63');
        P('wrA', at(gem(1.9, 5.2, 5), 0, 17.4, 0), '#9ccc65'); P('wrA', at(gem(1.4, 4.2, 4), 1.6, 15.8, 0.4, 0, 0, -0.9), '#7cb342'); P('wrA', at(gem(1.4, 4.2, 4), -1.6, 15.6, 0, 0, 0, 0.9), '#7cb342');
        P('wrA', at(sphere(1.6, 6, 3), 0, 12.6, 0), '#d7a85a');
        M.tip = [0, 18, 0]; M.tipBase = [0, 10, 0];
        break; }
      case 'kwan': {
        P('head', at(scl(sphere(5.0, 8, 4), 1, 0.86, 1.04), 0, 5.7, 0), '#ffb300'); P('head', at(prism(0, 1.1, 3.4, 6), 0, 10.1, 0), '#ffd54f');
        P('head', at(prism(5.5, 5.5, 0.6, 8), 0, 4.9, 0), '#e69500');
        both('shA', 'shB', function () { return scl(sphere(3.7, 7, 4), 1.15, 0.85, 1.1); }, '#ffb300', 0.4, 0.3, 0);
        P('torso', at(box(10 * bw, 1.6, 5.9), 0, 1.2, 0), '#5d4037'); P('torso', at(box(5 * bw, 5.4, 0.8), 0, 6.6, 2.6), '#e69500');
        P('torso', at(box(0.9, 5, 0.8), 0, 6.6, 3.1), '#ffd54f');
        P('root', at(frustum(8 * bw, 4.8, 10 * bw, 5.6, 4.5), 0, -3.0, 0), '#9b2f1e');   // ผ้านุ่ง
        P('wrA', staff(21, '#5d4037', 0.65), '#5d4037');
        P('wrA', at(box(0.8, 0.8, 3.6), 0, 17.4, 1.5), '#cfd8dc'); P('wrA', at(box(0.8, 3.2, 0.8), 0, 16.0, 3.2), '#cfd8dc'); P('wrA', at(box(1.4, 1.4, 1.4), 0, 16.8, 0), '#ffb300');
        M.tip = [0, 17, 3]; M.tipBase = [0, 8, 0];
        break; }
      case 'mothamma': {
        P('head', at(prism(0, 4.9, 8.6, 6), 0, 13.2, -0.2), '#6a1b9a'); P('head', at(prism(5.1, 5.1, 1.3, 8), 0, 9.6, 0), '#ffeb3b'); P('head', at(prism(6.8, 6.8, 0.5, 8), 0, 8.9, 0), '#4a148c');
        P('head', at(gem(0.9, 2.4, 4), 0, 9.6, 4.8), '#fff59d');
        P('root', at(frustum(8 * bw, 5.2, 12.5, 8.6, 9), 0, -3.6, 0), '#7b1fa2'); P('root', at(box(12.6, 0.9, 8.7), 0, -7.7, 0), '#ffeb3b');
        P('torso', at(box(10 * bw, 1.6, 5.8), 0, 1.3, 0), '#ffeb3b');
        P('torso', at(box(2.2, 8, 5.6), 0, 5.4, 0.1), '#4a148c');
        both('elA', 'elB', function () { return frustum(3.0, 3.0, 4.6, 4.4, 4.4); }, '#9c27b0', 0, -3.0, 0);
        P('wrA', staff(21, '#4e342e', 0.62), '#4e342e');
        P('wrA', at(sphere(2.5, 7, 4), 0, 19.2, 0), '#fff176', { em: true, glow: 7 });
        P('wrA', at(gem(0.9, 3.2, 4), 2.8, 19.2, 0, 0, 0, -0.5), '#ce93d8'); P('wrA', at(gem(0.9, 3.2, 4), -2.8, 19.2, 0, 0, 0, 0.5), '#ce93d8'); P('wrA', at(gem(0.9, 3.2, 4), 0, 19.2, 2.8, 0.5, 0, 0), '#ce93d8');
        M.tip = [0, 19.2, 0]; M.tipBase = [0, 12, 0];
        break; }
      case 'muay': {
        P('head', at(prism(4.7, 4.7, 1.0, 8), 0, 6.5, 0), '#ffffff'); P('head', at(prism(4.8, 4.8, 0.45, 8), 0, 6.5, 0), '#d32f2f');
        P('head', at(box(0.7, 3.2, 0.7), 4.5, 4.6, 0.6), '#ffffff'); P('head', at(box(0.7, 3.2, 0.7), -4.5, 4.6, 0.6), '#d32f2f');
        P('root', at(box(7.9 * bw, 1.7, 5.0), 0, 1.0, 0), '#d32f2f');
        P('root', at(frustum(7.8 * bw, 4.8, 9.2 * bw, 5.2, 3.2), 0, -2.4, 0), '#f5f5f5');
        both('shA', 'shB', function () { return prism(1.8, 1.8, 1.0, 6); }, '#d32f2f', 0, -1.2, 0);
        both('elA', 'elB', function () { return prism(1.6, 1.6, 1.2, 6); }, '#ffffff', 0, -4.6, 0);
        both('wrA', 'wrB', function () { return sphere(2.55, 7, 4); }, '#d32f2f', 0, 0.2, 1.7);
        P('torso', at(box(5.5 * bw, 0.7, 5.0), 0, 6.5, 0.1), '#ffffff', { });
        M.tip = [0, 0, 4]; M.tipBase = [0, 0, 1];
        break; }
      case 'seri': {
        P('head', at(scl(sphere(5.0, 8, 4), 1, 0.84, 1.06), 0, 5.8, 0), '#546e7a'); P('head', at(prism(5.9, 5.9, 0.5, 8), 0, 5.0, 0.4), '#455a64');
        P('torso', at(box(1.6, 11.4, 5.7), 1.2, 5.4, 0, 0, 0, 0.55), '#5d4037'); P('torso', at(box(1.6, 11.4, 5.7), -1.2, 5.4, 0, 0, 0, -0.55), '#5d4037');
        P('torso', at(box(7 * bw, 8, 2.5), 0, 5.2, -3.6), '#4b5238'); P('torso', at(box(2.2, 2.4, 1.0), 2.4, 1.2, 3.0), '#3e2723');
        P('root', at(box(7.9 * bw, 1.5, 5.0), 0, 1.0, 0), '#3e2723');
        P('wrA', at(box(1.2, 3.4, 2.0), 0, -2.8, 0), '#8d6e63'); P('wrA', at(box(1.5, 5.0, 1.8), 0, 0.6, 0), '#6d4c41');
        P('wrA', at(prism(0.5, 0.5, 14, 6), 0, 10.4, 0), '#37474f'); P('wrA', at(box(0.5, 0.7, 0.5), 0, 17.6, 0.5), '#212121'); P('wrA', at(box(1.1, 2.2, 1.1), 0, 5.2, 0.4), '#455a64');
        P('wrA', at(prism(0.9, 0.9, 5.0, 6), 0.1, 11.6, 1.5, 0, 0, 0), '#263238');
        M.tip = [0, 17.5, 0]; M.tipBase = [0, 8, 0];
        break; }
      case 'yai': {
        P('head', at(prism(4.9, 5.2, 3.2, 8), 0, 7.3, 0), '#3e2723'); P('head', at(prism(5.3, 5.3, 0.9, 8), 0, 6.2, 0), '#ffd54f'); P('head', at(prism(6.9, 6.9, 0.4, 8), 0, 5.6, 0.2), '#2a1a17');
        P('torso', at(scl(sphere(5.4, 8, 4), 1.05, 0.9, 0.85), 0, 2.4, 1.3), '#6d4c41');
        P('torso', at(box(1.8, 11, 5.8), 2.2, 5.5, 0, 0, 0, 0.6), '#efebe9');
        for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; P('torso', at(sphere(0.9, 5, 3), Math.cos(a) * 3.7, 9.5, Math.sin(a) * 2.6 + 0.4), i % 2 ? '#ffd54f' : '#ff8a65'); }
        P('torso', at(box(10.2 * bw, 1.6, 5.8), 0, 0.8, 0), '#ffd54f');
        P('wrA', at(prism(1.0, 0.8, 7, 6), 0, 0.5, 0), '#5d4037'); P('wrA', at(prism(1.9, 1.5, 6.5, 6), 0, 7.4, 0), '#6d4c41'); P('wrA', at(sphere(3.5, 7, 4), 0, 13.0, 0), '#8d6e63'); P('wrA', at(sphere(1.0, 5, 3), 0, 13.0, 3.1), '#ffd54f'); P('wrA', at(sphere(1.0, 5, 3), 3.1, 13.0, 0), '#ffd54f'); P('wrA', at(sphere(1.0, 5, 3), -3.1, 13.0, 0), '#ffd54f');
        M.tip = [0, 13, 0]; M.tipBase = [0, 6, 0];
        break; }
      case 'spy': {
        P('head', at(prism(8.7, 8.7, 0.5, 8), 0, 6.9, 0), '#16191c'); P('head', at(prism(4.5, 4.9, 3.6, 8), 0, 8.8, 0), '#1b1f23'); P('head', at(prism(4.95, 4.95, 0.9, 8), 0, 7.5, 0), '#b71c1c');
        P('head', at(box(7.6, 2.6, 2.0), 0, 2.5, 3.6), '#b71c1c');                         // ผ้าปิดหน้า
        P('torso', at(prism(4.6 * bw, 5.2 * bw, 1.8, 8), 0, 9.7, 0), '#b71c1c'); P('torso', at(box(1.8, 7, 0.7), -2.2, 6.2, -3.4, 0.35, 0, 0.12), '#b71c1c');
        P('torso', at(box(9.2 * bw, 11, 0.6), 0, 4.2, -3.3, 0.18, 0, 0), '#101316');          // ผ้าคลุมหลัง
        P('torso', at(box(1.0, 9, 0.5), 0, 5.2, 2.9, 0, 0, 0.45), '#455a64');
        P('root', at(box(7.9 * bw, 1.5, 5.0), 0, 1.0, 0), '#b71c1c');
        P('wrA', at(box(1.1, 2.8, 1.1), 0, 0, 0), '#212121'); P('wrA', at(box(3.0, 0.6, 1.2), 0, 1.6, 0), '#b71c1c'); P('wrA', at(box(1.1, 7.6, 0.4), 0, 5.8, 0), '#cfd8dc'); P('wrA', at(scl(prism(0, 0.8, 2.2, 4), 1, 1, 0.34), 0, 10.7, 0, 0, 0.78, 0), '#eceff1');
        M.tip = [0, 10.5, 0]; M.tipBase = [0, 3, 0];
        break; }
      case 'mae': {
        P('head', at(sphere(2.2, 6, 3), -1.0, 10.0, -2.2), hair);
        P('head', at(prism(4.7, 4.7, 1.1, 8), 0, 5.8, 0), '#f48fb1'); P('head', at(gem(1.3, 2.4, 5), 3.8, 6.6, 2.8, 0.4, 0, 0), '#fff59d'); P('head', at(sphere(0.9, 5, 3), 3.8, 6.6, 3.2), '#ef6c00');
        P('torso', at(box(8 * bw, 8.2, 0.6), 0, 4.2, 2.6), '#f06292'); P('torso', at(box(1.0, 5, 0.6), 2.0, 9.0, 2.5), '#f06292'); P('torso', at(box(1.0, 5, 0.6), -2.0, 9.0, 2.5), '#f06292');
        P('root', at(frustum(8 * bw, 5, 11.5, 7.6, 5.4), 0, -3.4, 0.2), '#f06292'); P('root', at(box(8.5, 0.8, 0.8), 0, -1.6, 3.0), '#fff59d');
        P('root', at(box(3.6, 3.2, 3.0), -4.6 * bw - 0.6, 0, 1.0), '#8d6e63');
        // กระทะ (ด้ามต่อออกจากมือ จานกระทะอยู่ปลาย)
        P('wrA', at(prism(0.7, 0.7, 7, 6), 0, 2.5, 0), '#5d4037'); P('wrA', at(prism(5.0, 4.6, 1.2, 8), 0, 10.2, 0, 1.5708, 0, 0), '#37474f'); P('wrA', at(prism(3.8, 3.8, 0.4, 8), 0, 10.2, 0.75, 1.5708, 0, 0), '#78909c');
        M.tip = [0, 11, 0]; M.tipBase = [0, 6, 0];
        break; }
      case 'win': {
        P('head', at(scl(sphere(5.1, 8, 4), 1.02, 0.98, 1.05), 0, 4.8, 0), '#ff7043'); P('head', at(box(6.4, 1.9, 0.8), 0, 4.5, 4.7), '#263238'); P('head', at(box(6.8, 0.6, 1.4), 0, 3.0, 4.2), '#bf360c');
        P('head', at(box(1.0, 4.4, 1.0), 0, 8.6, -1.0, 0.3, 0, 0), '#ffab91');
        P('torso', at(frustum(10.2 * bw, 5.8, 7.8 * bw, 5.0, 8.4), 0, 5.2, 0), '#ff7043'); P('torso', at(box(10.3 * bw, 0.9, 5.9), 0, 3.6, 0), '#cfd8dc'); P('torso', at(box(10.0 * bw, 0.9, 5.7), 0, 7.2, 0), '#cfd8dc');
        P('torso', at(box(4.2, 4.2, 0.4), 0, 6.0, 3.1), '#fff3e0');
        P('root', at(box(7.9 * bw, 1.5, 5.0), 0, 1.0, 0), '#212121');
        P('wrA', at(prism(0.85, 0.85, 7, 6), 0, 3.0, 0), '#90a4ae'); P('wrA', at(sphere(2.6, 7, 4), 0, 8.6, 0), '#78909c'); P('wrA', at(sphere(1.2, 6, 3), 0, 8.6, 2.2), '#263238'); P('wrA', at(box(3.2, 1.2, 1.2), 0, -0.5, 0), '#212121');
        M.tip = [0, 9, 0]; M.tipBase = [0, 4, 0];
        break; }
      case 'chang': {
        P('head', at(scl(sphere(5.2, 8, 4), 1, 0.82, 1.06), 0, 5.4, 0), '#fdd835'); P('head', at(prism(6.0, 6.0, 0.5, 8), 0, 4.8, 0.5), '#f9a825'); P('head', at(box(1.4, 5.8, 8.8), 0, 7.6, 0), '#f9a825');
        P('head', at(box(2.0, 1.6, 0.8), 0, 6.6, 5.3), '#fffde7', { em: true, glow: 3 });
        P('torso', at(box(10.2 * bw, 1.2, 5.8), 0, 2.4, 0), '#b0bec5'); P('torso', at(box(10.0 * bw, 1.2, 5.6), 0, 6.8, 0), '#b0bec5');
        P('root', at(box(8.8 * bw, 1.8, 5.5), 0, 0.9, 0), '#6d4c41'); P('root', at(box(2.2, 3.0, 1.6), 3.0, -1.0, 3.2), '#8d6e63'); P('root', at(box(2.2, 3.0, 1.6), -3.0, -1.0, 3.2), '#8d6e63'); P('root', at(box(0.8, 4.4, 0.8), 3.0, 1.2, 3.4), '#e53935');
        P('torso', at(box(7 * bw, 8, 2.4), 0, 5.2, -3.5), '#546e7a');
        P('wrA', at(prism(0.62, 0.62, 12, 6), 0, 5.0, 0), '#455a64'); P('wrA', at(box(2.8, 1.2, 1.2), 0, 11.8, 0), '#fdd835');
        P('wrA', at(gem(1.3, 4.0, 4), 0, 14.6, 0), '#fff176', { em: true, glow: 6 }); P('wrA', at(box(0.45, 7, 0.45), 1.7, 8.4, 1.0, 0, 0, 0.1), '#212121');
        M.tip = [0, 14.6, 0]; M.tipBase = [0, 8, 0];
        break; }
    }
    return M;
  }
  S.build = build;
})(typeof globalThis !== 'undefined' ? globalThis : this);
