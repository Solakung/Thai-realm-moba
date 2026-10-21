/* Thai Realm — เอนจิน 3D low-poly (ส่วนที่ 1/3: เมทริกซ์ ตัวสร้างทรง โครงกระดูก ท่าทาง)
   ส่วนที่ 2 = js/heroes3d.js (โมเดลฮีโร่ 12 ตัว) ส่วนที่ 3 = js/view3d.js (ตัวเรนเดอร์และการหมุนด้วยการลาก)
   เวที 3D low-poly หน้าเลือกฮีโร่
   เรนเดอร์ 3D เองบน Canvas 2D (ไม่พึ่งไลบรารีภายนอก): โมเดลสร้างจากรูปทรงพื้นฐาน (กล่อง ปริซึม ทรงกลมหยาบ)
   ระบายแบบแฟลตเชด + ขอบเส้น เรียงหน้าแบบจิตรกร ขยับด้วยโครงกระดูก 15 ข้อต่อ ท่าทางเป็นคีย์เฟรม
   ลากเมาส์/นิ้วเพื่อหมุนรอบตัวละคร (ล้อเมาส์/บีบนิ้วเพื่อซูม ดับเบิลคลิกเพื่อกลับด้านหน้า) */
(function (G) {
  'use strict';
  const TR = G.TR;
  const PI = Math.PI, TAU = PI * 2;
  const clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  const ease = function (k) { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
  const easeO = function (k) { k = clamp(k, 0, 1); return 1 - Math.pow(1 - k, 3); };

  /* ---------- เมทริกซ์ 3x4 ---------- */
  function mMul(a, b) {
    const o = new Array(12);
    for (let r = 0; r < 3; r++) {
      const a0 = a[r * 4], a1 = a[r * 4 + 1], a2 = a[r * 4 + 2];
      o[r * 4] = a0 * b[0] + a1 * b[4] + a2 * b[8];
      o[r * 4 + 1] = a0 * b[1] + a1 * b[5] + a2 * b[9];
      o[r * 4 + 2] = a0 * b[2] + a1 * b[6] + a2 * b[10];
      o[r * 4 + 3] = a0 * b[3] + a1 * b[7] + a2 * b[11] + a[r * 4 + 3];
    }
    return o;
  }
  function rotM(rx, ry, rz) { // Ry * Rx * Rz
    const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
    const a = [cz, -sz, 0, cx * sz, cx * cz, -sx, sx * sz, sx * cz, cx];
    return [cy * a[0] + sy * a[6], cy * a[1] + sy * a[7], cy * a[2] + sy * a[8], a[3], a[4], a[5], -sy * a[0] + cy * a[6], -sy * a[1] + cy * a[7], -sy * a[2] + cy * a[8]];
  }
  function mLocal(t, r) { return [r[0], r[1], r[2], t[0], r[3], r[4], r[5], t[1], r[6], r[7], r[8], t[2]]; }
  function mApply(m, p) { return [m[0] * p[0] + m[1] * p[1] + m[2] * p[2] + m[3], m[4] * p[0] + m[5] * p[1] + m[6] * p[2] + m[7], m[8] * p[0] + m[9] * p[1] + m[10] * p[2] + m[11]]; }

  /* ---------- สี ---------- */
  const rgbCache = {};
  function H(hex) {
    if (rgbCache[hex]) return rgbCache[hex];
    let h = hex.charAt(0) === '#' ? hex.slice(1) : hex;
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const v = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    return (rgbCache[hex] = v);
  }
  function sh(hex, f) { const c = H(hex); return 'rgb(' + Math.round(c[0] * f) + ',' + Math.round(c[1] * f) + ',' + Math.round(c[2] * f) + ')'; }
  function shHex(hex, f) { const c = H(hex).map(function (x) { return clamp(Math.round(x * f), 0, 255); }); return '#' + c.map(function (x) { return (x < 16 ? '0' : '') + x.toString(16); }).join(''); }

  /* ---------- ตัวสร้างทรง (หันหน้าที่ปลายแกนอย่างอัตโนมัติ) ---------- */
  function orient(v, f) {
    let cx = 0, cy = 0, cz = 0;
    v.forEach(function (p) { cx += p[0]; cy += p[1]; cz += p[2]; });
    cx /= v.length; cy /= v.length; cz /= v.length;
    return { v: v, f: f.map(function (face) {
      let nx = 0, ny = 0, nz = 0, fx = 0, fy = 0, fz = 0;
      for (let i = 0; i < face.length; i++) {
        const a = v[face[i]], b = v[face[(i + 1) % face.length]];
        nx += (a[1] - b[1]) * (a[2] + b[2]); ny += (a[2] - b[2]) * (a[0] + b[0]); nz += (a[0] - b[0]) * (a[1] + b[1]);
        fx += a[0]; fy += a[1]; fz += a[2];
      }
      fx = fx / face.length - cx; fy = fy / face.length - cy; fz = fz / face.length - cz;
      return nx * fx + ny * fy + nz * fz < 0 ? face.slice().reverse() : face;
    }) };
  }
  function frustum(wt, dt, wb, db, h) {
    const y1 = h / 2, y0 = -h / 2;
    return orient([[-wt / 2, y1, -dt / 2], [wt / 2, y1, -dt / 2], [wt / 2, y1, dt / 2], [-wt / 2, y1, dt / 2], [-wb / 2, y0, -db / 2], [wb / 2, y0, -db / 2], [wb / 2, y0, db / 2], [-wb / 2, y0, db / 2]],
      [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]]);
  }
  function box(w, h, d) { return frustum(w, d, w, d, h); }
  function prism(rt, rb, h, n) {
    n = n || 6;
    const v = [], f = [];
    if (rt > 0) {
      for (let i = 0; i < n; i++) { const a = (i + 0.5) / n * TAU; v.push([Math.cos(a) * rt, h / 2, Math.sin(a) * rt]); }
      for (let i = 0; i < n; i++) { const a = (i + 0.5) / n * TAU; v.push([Math.cos(a) * rb, -h / 2, Math.sin(a) * rb]); }
      const top = [], bot = [];
      for (let i = 0; i < n; i++) { top.push(i); bot.push(n + i); f.push([i, (i + 1) % n, n + (i + 1) % n, n + i]); }
      f.push(top, bot);
    } else {
      for (let i = 0; i < n; i++) { const a = (i + 0.5) / n * TAU; v.push([Math.cos(a) * rb, -h / 2, Math.sin(a) * rb]); }
      v.push([0, h / 2, 0]);
      const bot = [];
      for (let i = 0; i < n; i++) { bot.push(i); f.push([i, (i + 1) % n, n]); }
      f.push(bot);
    }
    return orient(v, f);
  }
  function sphere(r, n, rings) {
    n = n || 7; rings = rings || 4;
    const v = [[0, r, 0]], f = [];
    for (let j = 1; j < rings; j++) {
      const lat = PI * j / rings;
      for (let i = 0; i < n; i++) { const a = i / n * TAU; v.push([Math.cos(a) * Math.sin(lat) * r, Math.cos(lat) * r, Math.sin(a) * Math.sin(lat) * r]); }
    }
    v.push([0, -r, 0]);
    const last = v.length - 1;
    for (let i = 0; i < n; i++) f.push([0, 1 + i, 1 + (i + 1) % n]);
    for (let j = 0; j < rings - 2; j++) for (let i = 0; i < n; i++) { const a = 1 + j * n; f.push([a + i, a + n + i, a + n + (i + 1) % n, a + (i + 1) % n]); }
    const b = 1 + (rings - 2) * n;
    for (let i = 0; i < n; i++) f.push([last, b + (i + 1) % n, b + i]);
    return orient(v, f);
  }
  function gem(r, h, n) { // ทรงเพชร: ปลายแหลมบนล่าง
    n = n || 4;
    const v = [[0, h / 2, 0], [0, -h / 2, 0]], f = [];
    for (let i = 0; i < n; i++) { const a = (i + 0.5) / n * TAU; v.push([Math.cos(a) * r, 0, Math.sin(a) * r]); }
    for (let i = 0; i < n; i++) { f.push([0, 2 + i, 2 + (i + 1) % n]); f.push([1, 2 + (i + 1) % n, 2 + i]); }
    return orient(v, f);
  }
  function scl(m, x, y, z) { return { v: m.v.map(function (p) { return [p[0] * x, p[1] * y, p[2] * z]; }), f: m.f }; }
  function place(m, off, rot) {
    const R = rotM(rot[0], rot[1], rot[2]);
    return { v: m.v.map(function (p) { return [R[0] * p[0] + R[1] * p[1] + R[2] * p[2] + off[0], R[3] * p[0] + R[4] * p[1] + R[5] * p[2] + off[1], R[6] * p[0] + R[7] * p[1] + R[8] * p[2] + off[2]]; }), f: m.f };
  }

  /* ---------- โครงกระดูก / ท่า ---------- */
  const NAMES = ['root', 'torso', 'head', 'shA', 'elA', 'wrA', 'shB', 'elB', 'wrB', 'hpA', 'knA', 'ftA', 'hpB', 'knB', 'ftB'];
  const IDX = {}; NAMES.forEach(function (n, i) { IDX[n] = i; });
  const PARENT = [-1, 0, 1, 1, 3, 4, 1, 6, 7, 0, 9, 10, 0, 12, 13];
  const POSE_NODES = ['torso', 'head', 'shA', 'elA', 'wrA', 'shB', 'elB', 'wrB', 'hpA', 'knA', 'hpB', 'knB'];
  const KEYS = ['root.y', 'root.rx', 'root.ry', 'root.rz'];
  POSE_NODES.forEach(function (n) { KEYS.push(n + '.rx', n + '.ry', n + '.rz'); });
  const KI = {}; KEYS.forEach(function (k, i) { KI[k] = i; });
  const IDLE = {
    'torso.ry': -0.18, 'torso.rx': 0.04, 'head.ry': 0.18,
    'shA.rx': -0.55, 'shA.rz': 0.32, 'elA.rx': -1.25, 'wrA.rx': 0.2,
    'shB.rx': -0.15, 'shB.rz': -0.32, 'elB.rx': -0.55,
    'hpA.rx': -0.12, 'hpA.rz': 0.14, 'knA.rx': 0.22, 'hpB.rx': 0.14, 'hpB.rz': -0.14, 'knB.rx': 0.3
  };
  let BASE = IDLE;   // ท่านิ่งฐานที่ใช้ตอนสร้างท่า (เปลี่ยนตามฮีโร่ตอนสร้างชุดท่าของตัวนั้น)
  function arr(o) {
    const a = new Float32Array(KEYS.length);
    Object.keys(BASE).forEach(function (k) { a[KI[k]] = BASE[k]; });
    if (o) Object.keys(o).forEach(function (k) { if (KI[k] === undefined) throw new Error('pose key ' + k); a[KI[k]] = o[k]; });
    return a;
  }
  function merge() { const o = {}; for (let i = 0; i < arguments.length; i++) Object.assign(o, arguments[i]); return o; }

  function tl(dur, list, extra) {
    const keys = list.map(function (k) { return { t: k[0], p: arr(k[1]), e: k[2] }; });
    return Object.assign({ dur: dur, keys: keys }, extra || {});
  }
  function evalAct(act, t, out) {
    if (act.fn) { const a = act.fn(t); out.set(a); return; }
    const ks = act.keys;
    if (t <= ks[0].t) { out.set(ks[0].p); return; }
    for (let i = 0; i < ks.length - 1; i++) {
      if (t < ks[i + 1].t) {
        const k = (t - ks[i].t) / (ks[i + 1].t - ks[i].t), e = ks[i + 1].e;
        const kk = e === 'o' ? easeO(k) : e === 'i' ? k * k : ease(k);
        const a = ks[i].p, b = ks[i + 1].p;
        for (let j = 0; j < out.length; j++) out[j] = a[j] + (b[j] - a[j]) * kk;
        return;
      }
    }
    out.set(ks[ks.length - 1].p);
  }

  const CROUCH = { 'hpA.rx': -0.75, 'knA.rx': 1.2, 'hpA.rz': 0.28, 'hpB.rx': -0.75, 'knB.rx': 1.2, 'hpB.rz': -0.28 };
  const LUNGE = { 'hpA.rx': -0.95, 'knA.rx': 0.95, 'hpA.rz': 0.2, 'hpB.rx': 0.55, 'knB.rx': 0.15, 'hpB.rz': -0.2 };
  function runPose(t) { return runPoseAt(t * 11); }
  function runPoseAt(ph) {
    const s = Math.sin(ph), c = Math.cos(ph);
    return arr({
      'root.y': Math.abs(Math.sin(ph)) * 1.4, 'root.rx': 0.14, 'root.ry': 0, 'torso.ry': -s * 0.25, 'torso.rx': 0.1, 'head.ry': s * 0.1,
      'hpA.rx': s * 0.95 - 0.1, 'knA.rx': 0.5 + Math.max(0, -c) * 1.1, 'hpA.rz': 0.08,
      'hpB.rx': -s * 0.95 - 0.1, 'knB.rx': 0.5 + Math.max(0, c) * 1.1, 'hpB.rz': -0.08,
      'shA.rx': -1.1 + s * 0.9, 'shA.rz': 0.15, 'elA.rx': -1.3, 'wrA.rx': 0.2,
      'shB.rx': -1.1 - s * 0.9, 'shB.rz': -0.15, 'elB.rx': -1.3
    });
  }
  function buildActs(style) {
    const A = {};
    const wristStaff = style === 'staff' ? 0.0 : 0.2;
    A.enter = tl(1.6, [
      [0, { 'root.y': 55, 'root.rx': 0.25, 'torso.rx': 0.2, 'shA.rx': -0.3, 'shA.rz': 1.0, 'elA.rx': -0.3, 'shB.rx': -0.3, 'shB.rz': -1.0, 'elB.rx': -0.3, 'hpA.rx': -0.8, 'knA.rx': 0.9, 'hpB.rx': -0.5, 'knB.rx': 1.0, 'torso.ry': 0, 'head.ry': 0 }],
      [0.62, { 'root.y': 0, 'root.rx': 0.2, 'torso.rx': 0.2, 'shA.rx': -0.1, 'shA.rz': 1.2, 'elA.rx': -0.2, 'shB.rx': -0.1, 'shB.rz': -1.2, 'elB.rx': -0.2, 'hpA.rx': -0.6, 'knA.rx': 0.8, 'hpB.rx': -0.6, 'knB.rx': 0.8, 'torso.ry': 0, 'head.ry': 0 }, 'i'],
      [0.8, merge(CROUCH, { 'root.rx': 0.3, 'torso.rx': 0.45, 'head.rx': 0.3, 'head.ry': 0, 'torso.ry': 0, 'shA.rx': 0.2, 'shA.rz': 0.3, 'elA.rx': -0.5, 'shB.rx': 0.2, 'shB.rz': -0.3, 'elB.rx': -0.5 }), 'o'],
      [1.2, merge(CROUCH, { 'hpA.rx': -0.45, 'knA.rx': 0.8, 'hpB.rx': -0.45, 'knB.rx': 0.8, 'torso.rx': 0.1, 'head.rx': -0.1, 'torso.ry': 0.1, 'shA.rx': -1.3, 'shA.rz': 0.5, 'elA.rx': -1.0, 'shB.rx': -0.9, 'shB.rz': -0.6, 'elB.rx': -0.9 })],
      [1.6, {}]
    ], { fx: [{ t: 0.62, k: 'land' }], noTrail: true });

    const melee = function (wrist) {
      return tl(1.5, [
        [0, {}],
        [0.3, merge({ 'torso.ry': 0.85, 'torso.rx': -0.12, 'head.ry': -0.7, 'shA.rx': -2.7, 'shA.rz': 0.5, 'elA.rx': -1.9, 'wrA.rx': 0.5 + wrist, 'shB.rx': -0.9, 'shB.rz': -0.9, 'elB.rx': -0.6, 'root.ry': 0.25, 'hpA.rx': 0.1, 'knA.rx': 0.6, 'hpB.rx': 0.45, 'knB.rx': 0.8 })],
        [0.52, merge(LUNGE, { 'torso.ry': -0.85, 'torso.rx': 0.32, 'head.ry': 0.7, 'root.ry': -0.3, 'root.rx': 0.12, 'shA.rx': -1.3, 'shA.rz': 0.12, 'elA.rx': -0.25, 'wrA.rx': -0.2 + wrist, 'shB.rx': 0.5, 'shB.rz': -0.7, 'elB.rx': -0.5 }), 'o'],
        [0.95, merge(LUNGE, { 'torso.ry': -0.7, 'torso.rx': 0.28, 'head.ry': 0.6, 'root.ry': -0.25, 'root.rx': 0.1, 'shA.rx': -1.35, 'shA.rz': 0.15, 'elA.rx': -0.3, 'wrA.rx': -0.15 + wrist, 'shB.rx': 0.4, 'shB.rz': -0.7, 'elB.rx': -0.5 })],
        [1.5, {}]
      ], { trail: [0.28, 0.85], fx: [{ t: 0.52, k: 'sparks' }] });
    };
    const spin = function (wrist) {
      return tl(1.7, [
        [0, {}],
        [0.25, merge(CROUCH, { 'shA.rz': 1.3, 'shA.rx': -0.3, 'elA.rx': -0.3, 'wrA.rx': wrist, 'shB.rz': -1.3, 'shB.rx': -0.3, 'elB.rx': -0.3, 'torso.ry': 0.4, 'torso.rx': 0.2, 'root.ry': 0.5 })],
        [0.8, merge({ 'root.y': 9, 'root.ry': -TAU, 'shA.rz': 1.45, 'shA.rx': -0.1, 'elA.rx': -0.1, 'wrA.rx': wrist, 'shB.rz': -1.45, 'shB.rx': -0.1, 'elB.rx': -0.1, 'torso.ry': 0, 'torso.rx': 0.1, 'head.ry': 0, 'hpA.rx': -0.3, 'knA.rx': 0.9, 'hpB.rx': -0.1, 'knB.rx': 1.2 }), 'o'],
        [1.05, merge(CROUCH, { 'root.ry': -TAU, 'torso.rx': 0.25, 'shA.rx': -1.3, 'shA.rz': 0.2, 'elA.rx': -0.3, 'wrA.rx': wrist - 0.1, 'shB.rx': 0.3, 'shB.rz': -0.7, 'elB.rx': -0.6, 'torso.ry': 0.1, 'head.ry': 0 })],
        [1.7, { 'root.ry': -TAU }]
      ], { trail: [0.3, 0.95], fx: [{ t: 1.0, k: 'ring' }] });
    };
    const guard = tl(1.9, [
      [0, {}],
      [0.3, merge(CROUCH, { 'hpA.rz': 0.4, 'hpB.rz': -0.4, 'torso.rx': 0.28, 'torso.ry': 0, 'head.ry': 0, 'head.rx': 0.1, 'shA.rx': -1.2, 'shA.rz': -0.75, 'elA.rx': -2.25, 'wrA.rx': 0.2, 'shB.rx': -1.2, 'shB.rz': 0.75, 'elB.rx': -2.25 }), 'o'],
      [1.3, merge(CROUCH, { 'hpA.rz': 0.42, 'hpB.rz': -0.42, 'torso.rx': 0.3, 'torso.ry': 0, 'head.ry': 0, 'head.rx': 0.1, 'shA.rx': -1.25, 'shA.rz': -0.8, 'elA.rx': -2.3, 'wrA.rx': 0.2, 'shB.rx': -1.25, 'shB.rz': 0.8, 'elB.rx': -2.3 })],
      [1.9, {}]
    ], { fx: [{ t: 0.32, k: 'ring' }], noTrail: true });
    const flex = tl(2.2, [
      [0, {}],
      [0.45, { 'torso.rx': -0.14, 'torso.ry': 0, 'head.rx': -0.2, 'head.ry': 0, 'root.y': 2.5, 'shA.rx': -3.0, 'shA.rz': 0.35, 'elA.rx': -0.2, 'wrA.rx': 0.1, 'shB.rx': 0.2, 'shB.rz': -0.95, 'elB.rx': -1.9, 'hpA.rz': 0.3, 'hpB.rz': -0.3, 'hpA.rx': -0.1, 'hpB.rx': -0.1, 'knA.rx': 0.2, 'knB.rx': 0.2 }, 'o'],
      [1.6, { 'torso.rx': -0.12, 'torso.ry': 0, 'head.rx': -0.18, 'head.ry': 0.1, 'shA.rx': -3.05, 'shA.rz': 0.3, 'elA.rx': -0.2, 'wrA.rx': 0.1, 'shB.rx': 0.2, 'shB.rz': -0.95, 'elB.rx': -1.9, 'hpA.rz': 0.3, 'hpB.rz': -0.3, 'hpA.rx': -0.1, 'hpB.rx': -0.1, 'knA.rx': 0.2, 'knB.rx': 0.2 }],
      [2.2, {}]
    ], { fx: [{ t: 0.45, k: 'sparks' }], noTrail: true });
    const run = { dur: 1.7, fn: runPose, noTrail: true };

    const aimBase = { 'torso.ry': 0.7, 'head.ry': -0.35, 'hpA.rx': -0.3, 'knA.rx': 0.5, 'hpA.rz': 0.28, 'hpB.rx': 0.25, 'knB.rx': 0.3, 'hpB.rz': -0.3 };
    const bow = tl(2.0, [
      [0, {}],
      [0.4, merge(aimBase, { 'shA.rx': -1.55, 'shA.rz': 0.02, 'elA.rx': -0.05, 'wrA.rx': 0, 'shB.rx': -1.1, 'shB.rz': -0.5, 'elB.rx': -1.8 }), 'o'],
      [1.1, merge(aimBase, { 'shA.rx': -1.56, 'shA.rz': 0.02, 'elA.rx': -0.05, 'wrA.rx': 0, 'shB.rx': -1.45, 'shB.rz': -0.12, 'elB.rx': -2.4, 'torso.rx': -0.05 })],
      [1.2, merge(aimBase, { 'shA.rx': -1.6, 'shA.rz': 0.04, 'elA.rx': -0.03, 'wrA.rx': 0, 'shB.rx': -1.3, 'shB.rz': -0.7, 'elB.rx': -0.35, 'torso.rx': -0.08 }), 'o'],
      [1.55, merge(aimBase, { 'shA.rx': -1.55, 'shB.rx': -1.3, 'shB.rz': -0.7, 'elB.rx': -0.35 })],
      [2.0, {}]
    ], { fx: [{ t: 1.15, k: 'shot' }], noTrail: true });
    const gunBase = { 'torso.ry': 0.5, 'head.ry': -0.3, 'hpA.rx': -0.3, 'knA.rx': 0.45, 'hpA.rz': 0.26, 'hpB.rx': 0.25, 'knB.rx': 0.3, 'hpB.rz': -0.28 };
    const gun = tl(2.0, [
      [0, {}],
      [0.4, merge(gunBase, { 'shA.rx': -1.0, 'shA.rz': 0.15, 'elA.rx': -1.2, 'wrA.rx': 1.45, 'shB.rx': -1.4, 'shB.rz': -0.1, 'elB.rx': -0.2 }), 'o'],
      [1.2, merge(gunBase, { 'shA.rx': -1.0, 'shA.rz': 0.15, 'elA.rx': -1.2, 'wrA.rx': 1.45, 'shB.rx': -1.4, 'shB.rz': -0.1, 'elB.rx': -0.2, 'head.ry': -0.5 })],
      [1.27, merge(gunBase, { 'shA.rx': -1.1, 'shA.rz': 0.15, 'elA.rx': -1.3, 'wrA.rx': 1.7, 'shB.rx': -1.5, 'shB.rz': -0.1, 'elB.rx': -0.25, 'torso.rx': -0.1, 'head.ry': -0.5 }), 'o'],
      [1.5, merge(gunBase, { 'shA.rx': -1.0, 'shA.rz': 0.15, 'elA.rx': -1.2, 'wrA.rx': 1.45, 'shB.rx': -1.4, 'shB.rz': -0.1, 'elB.rx': -0.2, 'head.ry': -0.5 })],
      [2.0, {}]
    ], { fx: [{ t: 1.2, k: 'shot' }], noTrail: true });

    const staffCast = tl(2.0, [
      [0, {}],
      [0.35, merge(CROUCH, { 'hpA.rx': -0.4, 'knA.rx': 0.9, 'hpB.rx': -0.4, 'knB.rx': 0.9, 'torso.rx': -0.2, 'torso.ry': 0, 'head.rx': -0.35, 'head.ry': 0, 'shA.rx': -2.65, 'shA.rz': 0.55, 'elA.rx': -0.8, 'wrA.rx': wristStaff, 'shB.rx': -2.4, 'shB.rz': -0.6, 'elB.rx': -0.7 })],
      [0.62, { 'root.y': 3, 'torso.rx': 0.32, 'torso.ry': 0, 'head.rx': 0.1, 'head.ry': 0, 'shA.rx': -1.45, 'shA.rz': 0.14, 'elA.rx': -0.15, 'wrA.rx': 0.9, 'shB.rx': -1.5, 'shB.rz': -0.2, 'elB.rx': -0.1, 'hpA.rx': -0.3, 'knA.rx': 0.2, 'hpB.rx': 0.2, 'knB.rx': 0.1, 'hpA.rz': 0.2, 'hpB.rz': -0.2 }, 'o'],
      [1.35, { 'root.y': 0, 'torso.rx': 0.25, 'torso.ry': 0, 'head.rx': 0.08, 'head.ry': 0, 'shA.rx': -1.5, 'shA.rz': 0.14, 'elA.rx': -0.18, 'wrA.rx': 0.85, 'shB.rx': -1.55, 'shB.rz': -0.2, 'elB.rx': -0.12, 'hpA.rx': -0.35, 'knA.rx': 0.4, 'hpB.rx': 0.15, 'knB.rx': 0.2, 'hpA.rz': 0.2, 'hpB.rz': -0.2 }],
      [2.0, {}]
    ], { fx: [{ t: 0.62, k: 'cast' }], noTrail: true, orbit: [0.35, 1.6] });

    const combo = tl(2.6, [
      [0, {}],
      [0.25, { 'torso.ry': 0.35, 'torso.rx': 0.12, 'head.ry': -0.2, 'shA.rx': -1.15, 'shA.rz': 0.2, 'elA.rx': -2.3, 'shB.rx': -1.15, 'shB.rz': -0.2, 'elB.rx': -2.3, 'hpA.rx': -0.2, 'knA.rx': 0.5, 'hpA.rz': 0.25, 'hpB.rx': 0.2, 'knB.rx': 0.5, 'hpB.rz': -0.25 }],
      [0.42, { 'torso.ry': -0.35, 'torso.rx': 0.2, 'head.ry': 0.2, 'shA.rx': -1.55, 'shA.rz': 0.1, 'elA.rx': -0.08, 'shB.rx': -1.15, 'shB.rz': -0.2, 'elB.rx': -2.3, 'hpA.rx': -0.45, 'knA.rx': 0.6, 'hpA.rz': 0.25, 'hpB.rx': 0.3, 'knB.rx': 0.4, 'hpB.rz': -0.25 }, 'o'],
      [0.62, { 'torso.ry': 0.35, 'torso.rx': 0.12, 'head.ry': -0.2, 'shA.rx': -1.15, 'shA.rz': 0.2, 'elA.rx': -2.3, 'shB.rx': -1.15, 'shB.rz': -0.2, 'elB.rx': -2.3, 'hpA.rx': -0.2, 'knA.rx': 0.5, 'hpA.rz': 0.25, 'hpB.rx': 0.2, 'knB.rx': 0.5, 'hpB.rz': -0.25 }],
      [0.82, { 'torso.ry': 0.8, 'torso.rx': 0.2, 'head.ry': -0.7, 'shA.rx': -1.15, 'shA.rz': 0.2, 'elA.rx': -2.3, 'shB.rx': -1.6, 'shB.rz': -0.05, 'elB.rx': -0.08, 'hpA.rx': -0.1, 'knA.rx': 0.6, 'hpA.rz': 0.25, 'hpB.rx': 0.4, 'knB.rx': 0.5, 'hpB.rz': -0.25, 'root.ry': 0.2 }, 'o'],
      [1.05, { 'torso.ry': 0.35, 'torso.rx': 0.12, 'head.ry': -0.2, 'shA.rx': -1.15, 'shA.rz': 0.2, 'elA.rx': -2.3, 'shB.rx': -1.15, 'shB.rz': -0.2, 'elB.rx': -2.3, 'hpA.rx': -0.2, 'knA.rx': 0.5, 'hpA.rz': 0.25, 'hpB.rx': 0.2, 'knB.rx': 0.5, 'hpB.rz': -0.25 }],
      [1.3, { 'torso.ry': 0, 'torso.rx': -0.2, 'head.ry': 0, 'head.rx': -0.1, 'shA.rx': -0.7, 'shA.rz': 0.5, 'elA.rx': -2.0, 'shB.rx': -0.7, 'shB.rz': -0.5, 'elB.rx': -2.0, 'hpA.rx': -0.1, 'knA.rx': 0.3, 'hpB.rx': -1.65, 'knB.rx': 1.5, 'hpB.rz': -0.1, 'root.y': 1.5 }, 'o'],
      [1.75, { 'torso.ry': 0, 'torso.rx': -0.18, 'head.ry': 0, 'shA.rx': -0.7, 'shA.rz': 0.5, 'elA.rx': -2.0, 'shB.rx': -0.7, 'shB.rz': -0.5, 'elB.rx': -2.0, 'hpA.rx': -0.1, 'knA.rx': 0.3, 'hpB.rx': -1.55, 'knB.rx': 1.4 }],
      [2.6, {}]
    ], { fx: [{ t: 0.42, k: 'hit' }, { t: 0.82, k: 'hit' }, { t: 1.3, k: 'ring' }], noTrail: true });

    A.cast = staffCast;
    if (style === 'melee') { A.slash = melee(0); A.spin = spin(0); A.guard = guard; A.flex = flex; A.run = run; }
    else if (style === 'bow') { A.shoot = bow; A.flex = flex; A.guard = guard; A.run = run; }
    else if (style === 'gun') { A.shoot = gun; A.flex = flex; A.guard = guard; A.run = run; }
    else if (style === 'staff') { A.cast = staffCast; A.swing = melee(0); A.flex = flex; A.run = run; }
    else { A.combo = combo; A.guard = guard; A.flex = flex; A.spin = spin(0); A.run = run; }
    return A;
  }
  const ACTS = {}, IDLES = {};
  // ท่านิ่งเฉพาะตัว (TR.S3D.HERO[id].idle ใน heropose.js) ทับท่านิ่งกลาง
  function idleBase(id) { const H = TR.S3D.HERO && TR.S3D.HERO[id]; return H && H.idle ? Object.assign({}, IDLE, H.idle) : IDLE; }
  function arrFor(id) { if (!IDLES[id]) { const b = BASE; BASE = idleBase(id); IDLES[id] = arr(); BASE = b; } return IDLES[id]; }
  // ชุดท่าของสไตล์ (ใช้ในเกม) หรือของฮีโร่ตัวนั้น (ใช้บนเวทีเลือกตัว: ท่านิ่งเฉพาะตัว + ท่าที่เข้ากับตัว + ท่าประจำตัว)
  function actsFor(style, id) {
    const key = id ? style + ':' + id : style;
    if (ACTS[key]) return ACTS[key];
    const b = BASE; BASE = id ? idleBase(id) : IDLE;
    let A = buildActs(style);
    const H = id && TR.S3D.HERO && TR.S3D.HERO[id];
    if (H) {
      const keep = {}; (H.keep || Object.keys(A)).forEach(function (n) { if (A[n]) keep[n] = A[n]; });
      if (A.enter) keep.enter = A.enter;
      if (A.cast && !keep.cast && style === 'staff') keep.cast = A.cast;
      A = keep;
      if (H.sig) { const extra = H.sig(); Object.keys(extra).forEach(function (n) { A[n] = extra[n]; }); }
    }
    BASE = b;
    return (ACTS[key] = A);
  }

  TR.S3D = { runPoseAt: runPoseAt, mMul: mMul, rotM: rotM, mLocal: mLocal, mApply: mApply, H: H, sh: sh, shHex: shHex, box: box, frustum: frustum, prism: prism, sphere: sphere, gem: gem, scl: scl, place: place,
    NAMES: NAMES, IDX: IDX, PARENT: PARENT, KEYS: KEYS, KI: KI, arr: arr, evalAct: evalAct, actsFor: actsFor, arrFor: arrFor, tl: tl, merge: merge, CROUCH: CROUCH, LUNGE: LUNGE, HERO: {}, clamp: clamp, ease: ease, easeO: easeO, TAU: TAU, PI: PI, rgbCache: rgbCache };
})(typeof globalThis !== 'undefined' ? globalThis : this);
