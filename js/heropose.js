/* Thai Realm — ท่าทางเฉพาะตัวของฮีโร่ทั้ง 12 บนเวทีเลือกตัว และท่านิ่งในเกม
   แต่ละตัวมี: idle = ท่ายืนนิ่งของตัวเอง · life(P,t) = ท่าขยับเล็ก ๆ ตอนยืนนิ่ง · keep = ท่าจากชุดสไตล์ที่เข้ากับตัวนี้ · sig() = ท่าประจำตัว
   คีย์ท่า: <ข้อต่อ>.rx/ry/rz เรเดียน (A = แขน/ขาข้างอาวุธ, B = อีกข้าง, el = ศอก, wr = ข้อมือ, hp = สะโพก, kn = เข่า) */
(function (G) {
  'use strict';
  const TR = G.TR, S = TR.S3D, tl = S.tl, merge = S.merge, KI = S.KI, TAU = S.TAU, CROUCH = S.CROUCH, LUNGE = S.LUNGE, H = S.HERO;
  const add = function (P, k, v) { P[KI[k]] += v; };
  // ท่าแบบฟังก์ชันตามเวลา (แกว่ง/วน) เมื่อจบจะกลับท่านิ่งเอง
  const fnAct = function (dur, f, extra) { const B = S.arr(); return Object.assign({ dur: dur, fn: function (t) { const P = Float32Array.from(B); f(P, t); return P; }, noTrail: true }, extra || {}); };   // B = ท่านิ่งของฮีโร่ตัวนี้ (ถูกเรียกตอนสร้างชุดท่า)

  H.nakdab = {   // นักดาบอาสา: เท้าสะเอวข้างหนึ่ง ดาบห้อยต่ำ มั่นใจแบบทหารหาญ
    idle: { 'torso.ry': -0.3, 'torso.rx': 0.05, 'head.ry': 0.3, 'shA.rx': -0.2, 'shA.rz': 0.25, 'elA.rx': -0.7, 'wrA.rx': 0.4, 'shB.rx': -0.1, 'shB.rz': -0.95, 'elB.rx': -1.7, 'hpA.rz': 0.22, 'hpB.rz': -0.22, 'hpA.rx': -0.2, 'knA.rx': 0.25, 'hpB.rx': 0.1, 'knB.rx': 0.2 },
    life: function (P, t) { add(P, 'wrA.rx', Math.sin(t * 1.5) * 0.06); add(P, 'head.ry', Math.sin(t * 0.7) * 0.06); },
    keep: ['slash', 'guard'],
    sig: function () {
      const up = { 'shA.rx': -2.95, 'shA.rz': 0.35, 'elA.rx': -0.25, 'wrA.rx': 0.15, 'torso.rx': -0.15, 'torso.ry': 0, 'head.ry': 0, 'head.rx': -0.2, 'shB.rx': -0.2, 'shB.rz': -0.4, 'elB.rx': -0.6 };
      return { salute: tl(2.6, [[0, {}], [0.5, up, 'o'], [1.0, up], [1.2, merge(LUNGE, { 'shA.rx': -1.1, 'shA.rz': 0.1, 'elA.rx': -0.15, 'wrA.rx': -0.4, 'torso.rx': 0.35, 'torso.ry': -0.4, 'head.rx': 0.15, 'head.ry': 0.3, 'shB.rx': 0.4, 'shB.rz': -0.7, 'elB.rx': -0.5 }), 'o'], [2.0, merge(LUNGE, { 'shA.rx': -1.1, 'shA.rz': 0.1, 'elA.rx': -0.15, 'wrA.rx': -0.4, 'torso.rx': 0.3, 'torso.ry': -0.4 })], [2.6, {}]], { trail: [1.0, 1.4], fx: [{ t: 1.25, k: 'sparks' }] }) };
    }
  };
  H.phran = {   // พรานป่า: ย่อลาดตระเวน ธนูห้อยข้างตัว ตามองหาเหยื่อ
    idle: { 'torso.ry': 0.35, 'torso.rx': 0.08, 'head.ry': -0.35, 'shA.rx': -0.35, 'shA.rz': 0.15, 'elA.rx': -0.25, 'wrA.rx': 0, 'shB.rx': -0.2, 'shB.rz': -0.3, 'elB.rx': -0.3, 'hpA.rx': -0.3, 'knA.rx': 0.35, 'hpA.rz': 0.25, 'hpB.rx': 0.2, 'knB.rx': 0.2, 'hpB.rz': -0.25 },
    life: function (P, t) { add(P, 'head.ry', Math.sin(t * 0.9) * 0.28); add(P, 'torso.ry', Math.sin(t * 0.9) * 0.06); },
    keep: ['shoot'],
    sig: function () {
      const look = { 'shB.rx': -2.25, 'shB.rz': -0.2, 'elB.rx': -2.1, 'torso.ry': 0.2, 'shA.rx': -0.35, 'shA.rz': 0.15, 'elA.rx': -0.25, 'wrA.rx': 0 };
      return { scout: tl(2.6, [[0, {}], [0.4, merge(look, { 'head.ry': -0.5 }), 'o'], [1.0, merge(look, { 'head.ry': 0.45 })], [1.7, merge(look, { 'head.ry': -0.6 })], [2.6, {}]], { noTrail: true }) };
    }
  };
  H.mohya = {   // หมอยาสมุนไพร: โน้มตัวอ่อนโยน กอดหม้อยา/ไม้เท้าไว้ใกล้ตัว
    idle: { 'torso.rx': 0.12, 'torso.ry': -0.05, 'head.rx': 0.12, 'head.ry': 0.1, 'shA.rx': -0.95, 'shA.rz': 0.12, 'elA.rx': -1.2, 'wrA.rx': 0.1, 'shB.rx': -1.0, 'shB.rz': -0.05, 'elB.rx': -1.4, 'hpA.rx': -0.05, 'knA.rx': 0.1, 'hpA.rz': 0.08, 'hpB.rx': 0.05, 'knB.rx': 0.12, 'hpB.rz': -0.08 },
    life: function (P, t) { add(P, 'shB.rx', Math.sin(t * 2.5) * 0.05); add(P, 'head.rx', Math.sin(t * 1.1) * 0.05); },
    keep: ['cast'],
    sig: function () {
      return { brew: fnAct(2.8, function (P, t) { const a = t * 5.5; P[KI['torso.rx']] = 0.3; P[KI['head.rx']] = 0.35; P[KI['head.ry']] = 0; P[KI['shA.rx']] = -1.2; P[KI['elA.rx']] = -0.7; P[KI['shB.rx']] = -1.25 + Math.sin(a) * 0.16; P[KI['shB.rz']] = -0.1 + Math.cos(a) * 0.16; P[KI['elB.rx']] = -0.9; }, { fx: [{ t: 1.0, k: 'cast' }, { t: 2.0, k: 'sparks' }] }) };
    }
  };
  H.kwan = {   // ควาญช้างศึก: ยืนกว้างอกผาย ตะขอช้างพาดบ่า
    idle: { 'torso.rx': -0.1, 'torso.ry': -0.1, 'head.rx': -0.1, 'head.ry': 0.1, 'shA.rx': -2.1, 'shA.rz': 0.55, 'elA.rx': -2.0, 'wrA.rx': 0.2, 'shB.rx': -0.1, 'shB.rz': -0.7, 'elB.rx': -0.6, 'hpA.rx': -0.25, 'hpA.rz': 0.32, 'knA.rx': 0.35, 'hpB.rx': -0.25, 'hpB.rz': -0.32, 'knB.rx': 0.35 },
    life: function (P, t) { add(P, 'torso.rx', Math.sin(t * 1.6) * 0.025); },
    keep: ['guard', 'flex'],
    sig: function () {
      const wide = { 'torso.rx': -0.28, 'torso.ry': 0, 'head.rx': -0.4, 'head.ry': 0, 'shA.rx': -0.3, 'shA.rz': 1.35, 'elA.rx': -0.2, 'shB.rx': -0.3, 'shB.rz': -1.35, 'elB.rx': -0.2, 'hpA.rz': 0.35, 'hpB.rz': -0.35, 'hpA.rx': -0.3, 'hpB.rx': -0.3, 'knA.rx': 0.5, 'knB.rx': 0.5 };
      return { stomp: tl(3.0, [[0, {}], [0.5, { 'hpB.rx': -1.55, 'knB.rx': 1.4, 'shA.rx': -2.4, 'shA.rz': 0.7, 'elA.rx': -0.5, 'shB.rx': -2.4, 'shB.rz': -0.7, 'elB.rx': -0.5, 'torso.rx': -0.15 }, 'o'], [0.85, merge(CROUCH, { 'torso.rx': 0.3, 'shA.rx': -0.4, 'shA.rz': 0.5, 'elA.rx': -0.4, 'shB.rx': -0.4, 'shB.rz': -0.5, 'elB.rx': -0.4, 'head.rx': 0.2 }), 'i'], [1.3, wide, 'o'], [2.4, wide], [3.0, {}]], { fx: [{ t: 0.85, k: 'land' }, { t: 1.3, k: 'ring' }], noTrail: true }) };
    }
  };
  H.mothamma = {   // หมอธรรม: ฝ่ามือหงายเรียกพลัง อีกมือถือไม้
    idle: { 'torso.ry': -0.1, 'head.rx': -0.12, 'head.ry': 0.05, 'shA.rx': -0.9, 'shA.rz': 0.1, 'elA.rx': -0.9, 'wrA.rx': 0.1, 'shB.rx': -1.7, 'shB.rz': -0.45, 'elB.rx': -0.5, 'hpA.rz': 0.1, 'hpB.rz': -0.1, 'knA.rx': 0.15, 'knB.rx': 0.2 },
    life: function (P, t) { add(P, 'shB.rx', Math.sin(t * 2) * 0.07); add(P, 'elB.rx', Math.sin(t * 2 + 1) * 0.08); },
    keep: ['cast'],
    sig: function () {
      return { chant: fnAct(3.2, function (P, t) { const sw = Math.sin(t * 2.2); P[KI['torso.rx']] = -0.2; P[KI['torso.ry']] = sw * 0.12; P[KI['head.rx']] = -0.4; P[KI['shA.rx']] = -2.5 + sw * 0.15; P[KI['shA.rz']] = 0.45; P[KI['elA.rx']] = -0.5; P[KI['wrA.rx']] = 0.2; P[KI['shB.rx']] = -2.3 - sw * 0.15; P[KI['shB.rz']] = -0.55; P[KI['elB.rx']] = -0.4; P[KI['root.y']] = 1.5 + Math.sin(t * 3) * 1.2; }, { fx: [{ t: 0.8, k: 'cast' }, { t: 1.8, k: 'ring' }, { t: 2.4, k: 'cast' }], orbit: [0.3, 2.9] }) };
    }
  };
  H.muay = {   // นักมวยคาดเชือก: ตั้งการ์ดมวยไทย เด้งเท้าตลอด
    idle: { 'torso.ry': 0.5, 'torso.rx': 0.12, 'head.rx': 0.1, 'head.ry': -0.4, 'shA.rx': -1.25, 'shA.rz': 0.05, 'elA.rx': -2.25, 'wrA.rx': 0, 'shB.rx': -1.15, 'shB.rz': -0.15, 'elB.rx': -2.3, 'hpA.rx': -0.35, 'knA.rx': 0.55, 'hpA.rz': 0.25, 'hpB.rx': 0.3, 'knB.rx': 0.45, 'hpB.rz': -0.25 },
    life: function (P, t) { add(P, 'root.y', Math.abs(Math.sin(t * 6)) * 0.9); add(P, 'shA.rx', Math.sin(t * 6 + 1) * 0.06); add(P, 'shB.rx', Math.sin(t * 6) * 0.06); },
    keep: ['combo'],
    sig: function () {
      const wai = { 'shA.rx': -1.3, 'shA.rz': -0.4, 'elA.rx': -1.95, 'wrA.rx': 0, 'shB.rx': -1.3, 'shB.rz': 0.4, 'elB.rx': -1.95, 'torso.rx': 0.25, 'torso.ry': 0, 'head.rx': 0.4, 'head.ry': 0 };
      return { wai: tl(3.0, [[0, {}], [0.5, wai, 'o'], [1.1, merge(CROUCH, wai, { 'torso.rx': 0.4, 'head.rx': 0.5 })], [1.7, merge(CROUCH, { 'shA.rx': -0.5, 'shA.rz': 1.1, 'elA.rx': -0.4, 'shB.rx': -0.5, 'shB.rz': -1.1, 'elB.rx': -0.4, 'torso.rx': 0.1, 'head.rx': -0.1, 'head.ry': 0, 'torso.ry': 0 }), 'o'], [2.2, { 'shA.rx': -0.2, 'shA.rz': 1.25, 'elA.rx': -0.25, 'shB.rx': -0.2, 'shB.rz': -1.25, 'elB.rx': -0.25, 'torso.rx': -0.18, 'head.rx': -0.2, 'torso.ry': 0, 'head.ry': 0, 'hpA.rz': 0.3, 'hpB.rz': -0.3, 'hpA.rx': -0.1, 'hpB.rx': -0.1, 'knA.rx': 0.2, 'knB.rx': 0.2 }, 'o'], [3.0, {}]], { fx: [{ t: 2.2, k: 'ring' }], noTrail: true }) };
    }
  };
  H.seri = {   // เสรีไทย: ปืนพาดอก ท่าซุ่มระวังภัย
    idle: { 'torso.ry': 0.35, 'head.ry': -0.2, 'shA.rx': -0.95, 'shA.rz': -0.1, 'elA.rx': -1.45, 'wrA.rx': 1.2, 'shB.rx': -1.2, 'shB.rz': -0.45, 'elB.rx': -1.1, 'hpA.rx': -0.15, 'knA.rx': 0.25, 'hpA.rz': 0.2, 'hpB.rx': 0.1, 'knB.rx': 0.2, 'hpB.rz': -0.2 },
    life: function (P, t) { add(P, 'head.ry', Math.sin(t * 0.8) * 0.2); },
    keep: ['shoot'],
    sig: function () {
      return { reload: fnAct(2.4, function (P, t) { const w = Math.sin(t * 9) * 0.1; P[KI['torso.ry']] = 0.35; P[KI['head.ry']] = -0.1; P[KI['head.rx']] = 0.3; P[KI['shA.rx']] = -1.0; P[KI['elA.rx']] = -1.3; P[KI['wrA.rx']] = 1.3; P[KI['shB.rx']] = -1.3 + (t > 0.5 && t < 1.4 ? w : 0); P[KI['shB.rz']] = -0.2; P[KI['elB.rx']] = -1.2 + (t > 0.5 && t < 1.4 ? w : 0); if (t > 1.5 && t < 1.7) P[KI['shB.rx']] -= 0.25; }, { fx: [{ t: 1.6, k: 'sparks' }] }) };
    }
  };
  H.yai = {   // ผู้ใหญ่บ้านพิทักษ์: ประสานมือไขว้หลัง ยืนมั่นอกผาย
    idle: { 'torso.rx': -0.12, 'torso.ry': -0.05, 'head.rx': -0.1, 'head.ry': 0.05, 'shA.rx': 0.45, 'shA.rz': 0.12, 'elA.rx': -0.9, 'wrA.rx': 0, 'shB.rx': 0.45, 'shB.rz': -0.12, 'elB.rx': -0.9, 'hpA.rx': -0.1, 'hpA.rz': 0.22, 'knA.rx': 0.12, 'hpB.rx': -0.1, 'hpB.rz': -0.22, 'knB.rx': 0.12 },
    life: function (P, t) { add(P, 'head.ry', Math.sin(t * 0.6) * 0.15); add(P, 'torso.rx', Math.sin(t * 1.4) * 0.02); },
    keep: ['guard'],
    sig: function () {
      const pt = { 'shA.rx': -2.7, 'shA.rz': 0.35, 'elA.rx': -0.15, 'wrA.rx': 0, 'torso.rx': -0.2, 'torso.ry': 0.1, 'head.rx': -0.2, 'head.ry': 0, 'shB.rx': -0.1, 'shB.rz': -1.0, 'elB.rx': -1.7 };
      return { declare: tl(2.8, [[0, {}], [0.55, pt, 'o'], [0.75, merge(pt, { 'shA.rx': -2.55, 'torso.rx': -0.1 })], [1.0, pt], [2.2, pt], [2.8, {}]], { fx: [{ t: 0.6, k: 'ring' }, { t: 1.2, k: 'ring' }], noTrail: true }) };
    }
  };
  H.spy = {   // สายลับเงา: ย่อต่ำ มีดสั้นกลับด้าน สายตากวาด
    idle: { 'torso.rx': 0.32, 'torso.ry': 0.3, 'head.rx': -0.15, 'head.ry': -0.3, 'shA.rx': -1.45, 'shA.rz': 0.2, 'elA.rx': -1.9, 'wrA.rx': 0.3, 'shB.rx': -0.7, 'shB.rz': -0.35, 'elB.rx': -1.4, 'hpA.rx': -0.55, 'knA.rx': 0.95, 'hpA.rz': 0.3, 'hpB.rx': 0.1, 'knB.rx': 0.8, 'hpB.rz': -0.28 },
    life: function (P, t) { add(P, 'head.ry', Math.sin(t * 1.3) * 0.3); add(P, 'wrA.rx', Math.sin(t * 2.4) * 0.12); },
    keep: ['slash', 'spin'],
    sig: function () {
      return { flourish: fnAct(2.2, function (P, t) { const k = Math.min(1, t / 0.4); P[KI['torso.rx']] = 0.25; P[KI['torso.ry']] = 0.1; P[KI['head.ry']] = 0; P[KI['shA.rx']] = -1.4; P[KI['shA.rz']] = 0.25; P[KI['elA.rx']] = -1.2; P[KI['wrA.rx']] = Math.sin(t * 13) * 1.3 * k; P[KI['shB.rx']] = -1.2; P[KI['shB.rz']] = -0.3; P[KI['elB.rx']] = -1.2; if (t > 1.3) { P[KI['shA.rx']] = -1.6; P[KI['elA.rx']] = -0.1; P[KI['wrA.rx']] = 0.2; P[KI['torso.rx']] = 0.4; } }, { fx: [{ t: 1.3, k: 'hit' }, { t: 1.4, k: 'sparks' }], trail: [0.2, 1.2] }) };
    }
  };
  H.mae = {   // แม่ค้าริมทาง: ถือทัพพีกับชามไว้ตรงหน้า ยิ้มต้อนรับ ยืนเอียงสะโพก
    idle: { 'torso.rx': 0.06, 'head.rx': 0.08, 'head.ry': 0.08, 'shA.rx': -1.15, 'shA.rz': 0.05, 'elA.rx': -0.95, 'wrA.rx': 0.2, 'shB.rx': -1.1, 'shB.rz': -0.1, 'elB.rx': -1.0, 'hpA.rz': 0.28, 'hpA.rx': -0.1, 'knA.rx': 0.12, 'hpB.rz': -0.05, 'hpB.rx': 0.05, 'knB.rx': 0.1 },
    life: function (P, t) { add(P, 'shA.rx', Math.sin(t * 3.2) * 0.07); add(P, 'wrA.rx', Math.sin(t * 3.2 + 1) * 0.15); add(P, 'head.rx', Math.sin(t * 1.2) * 0.04); },
    keep: ['slash'],
    sig: function () {
      return { serve: fnAct(2.6, function (P, t) { const k = Math.min(1, t / 0.6), d = t > 1.6 ? Math.min(1, (t - 1.6) / 0.4) : 0; P[KI['torso.rx']] = 0.1 + 0.25 * d; P[KI['head.rx']] = 0.1 + 0.3 * d; P[KI['shA.rx']] = -1.15 - 0.4 * k; P[KI['elA.rx']] = -0.95 + 0.7 * k; P[KI['shA.rz']] = 0.05; P[KI['shB.rx']] = -1.1 - 0.45 * k; P[KI['elB.rx']] = -1.0 + 0.8 * k; P[KI['shB.rz']] = -0.1; }, { fx: [{ t: 0.7, k: 'cast' }] }) };
    }
  };
  H.win = {   // วินมอเตอร์ไซค์: โน้มตัวบิดคันเร่ง พร้อมพุ่ง
    idle: { 'torso.rx': 0.3, 'torso.ry': -0.05, 'head.rx': -0.15, 'head.ry': 0.1, 'shA.rx': -1.45, 'shA.rz': 0.22, 'elA.rx': -0.5, 'wrA.rx': 0.4, 'shB.rx': -1.45, 'shB.rz': -0.22, 'elB.rx': -0.5, 'hpA.rx': -0.7, 'knA.rx': 0.9, 'hpA.rz': 0.2, 'hpB.rx': -0.7, 'knB.rx': 0.9, 'hpB.rz': -0.2 },
    life: function (P, t) { add(P, 'wrA.rx', Math.max(0, Math.sin(t * 3)) * 0.6); add(P, 'root.y', Math.sin(t * 45) * 0.12); },
    keep: ['slash', 'spin', 'run'],
    sig: function () {
      return { rev: fnAct(2.6, function (P, t) { const tw = (t % 0.75) < 0.4 ? Math.sin(((t % 0.75) / 0.4) * Math.PI) : 0; P[KI['torso.rx']] = 0.35 + 0.1 * tw; P[KI['wrA.rx']] = 0.2 + tw * 1.1; P[KI['shA.rx']] = -1.5; P[KI['shB.rx']] = -1.5; P[KI['root.y']] = Math.sin(t * 50) * (0.25 + tw * 0.5); P[KI['head.ry']] = 0; if (t > 2.0) { P[KI['torso.rx']] = 0.5; P[KI['hpA.rx']] = -0.9; P[KI['hpB.rx']] = -0.9; } }, { fx: [{ t: 0.4, k: 'sparks' }, { t: 1.15, k: 'sparks' }, { t: 1.9, k: 'sparks' }, { t: 2.1, k: 'land' }] }) };
    }
  };
  H.chang = {   // ช่างไฟนักประดิษฐ์: ก้มซ่อมอุปกรณ์ในมือ ตาจับจ้อง
    idle: { 'torso.rx': 0.12, 'torso.ry': -0.15, 'head.rx': 0.1, 'head.ry': 0.2, 'shA.rx': -1.2, 'shA.rz': 0.15, 'elA.rx': -1.5, 'wrA.rx': 0.6, 'shB.rx': -1.05, 'shB.rz': -0.05, 'elB.rx': -1.7, 'hpA.rz': 0.15, 'hpB.rz': -0.15, 'knA.rx': 0.2, 'knB.rx': 0.25 },
    life: function (P, t) { add(P, 'shB.rx', Math.sin(t * 6) * 0.05); add(P, 'wrA.rx', Math.sin(t * 3) * 0.12); add(P, 'head.ry', Math.sin(t * 0.8) * 0.1); },
    keep: ['cast'],
    sig: function () {
      return { zap: fnAct(2.6, function (P, t) { const j = t > 0.9 && t < 1.7 ? Math.sin(t * 60) * 0.04 : 0; P[KI['torso.rx']] = 0.1 - (t > 0.9 ? 0.1 : 0); P[KI['head.ry']] = 0; P[KI['head.rx']] = t > 0.9 ? -0.1 : 0.2; const e = Math.min(1, t / 0.7); P[KI['shA.rx']] = -1.2 - 0.35 * e + j; P[KI['elA.rx']] = -1.5 + 1.3 * e; P[KI['wrA.rx']] = 0.6 + 0.4 * e; P[KI['shB.rx']] = -1.05; P[KI['elB.rx']] = -1.7 + 1.0 * e; P[KI['hpA.rx']] = -0.3 * e; P[KI['knA.rx']] = 0.2 + 0.3 * e; }, { fx: [{ t: 0.9, k: 'sparks' }, { t: 1.1, k: 'sparks' }, { t: 1.3, k: 'cast' }] }) };
    }
  };

  /* ---------- ท่าตีและท่าร่ายสกิลในเกม (รายฮีโร่) ----------
     แต่ละตัวเลือก "ท่าตี" 1 แบบ และ "ท่าร่ายสกิล" ของสกิล 1/2/3 ต่างกัน จากชุดท่าพื้นฐานด้านล่าง แล้วใส่ท่าถือ/จังหวะประจำตัวทับ
     ใช้ผ่าน TR.S3D.HERO[id].game() → { gatk, gc0, gc1, gc2 } (เรียกตอน BASE เป็นท่านิ่งของฮีโร่ตัวนั้นแล้ว) */
  const ARCH = {
    thrust:   [{ 'shA.rx': -0.5, 'elA.rx': -1.5, 'torso.ry': 0.45, 'torso.rx': 0.05, 'hpA.rx': 0.2, 'hpB.rx': -0.4 }, merge(LUNGE, { 'shA.rx': -1.55, 'elA.rx': -0.1, 'wrA.rx': -0.2, 'torso.ry': -0.35, 'torso.rx': 0.25, 'shB.rz': -0.9 })],
    overhead: [{ 'shA.rx': -3.0, 'elA.rx': -0.5, 'shB.rx': -2.2, 'elB.rx': -0.8, 'torso.rx': -0.3, 'head.rx': -0.2 }, merge(CROUCH, { 'shA.rx': -0.5, 'elA.rx': -0.2, 'shB.rx': -0.4, 'elB.rx': -0.3, 'torso.rx': 0.55, 'head.rx': 0.3 })],
    sweep:    [{ 'shA.rz': 1.5, 'shA.rx': -0.2, 'elA.rx': -0.2, 'torso.ry': 0.8, 'hpA.rz': 0.3 }, merge(LUNGE, { 'shA.rz': 1.3, 'shA.rx': -1.2, 'elA.rx': -0.1, 'torso.ry': -0.9, 'torso.rx': 0.1 })],
    raise:    [{ 'shA.rx': -0.9, 'shB.rx': -0.9, 'elA.rx': -1.6, 'elB.rx': -1.6, 'torso.rx': 0.12, 'head.rx': 0.1 }, { 'shA.rx': -2.9, 'shB.rx': -2.9, 'shA.rz': 0.25, 'shB.rz': -0.25, 'elA.rx': -0.2, 'elB.rx': -0.2, 'torso.rx': -0.3, 'head.rx': -0.35, 'hpA.rx': -0.1, 'hpB.rx': -0.1 }],
    push:     [{ 'shA.rx': -0.7, 'shB.rx': -0.7, 'elA.rx': -1.9, 'elB.rx': -1.9, 'torso.rx': -0.1, 'hpA.rx': 0.2 }, merge(LUNGE, { 'shA.rx': -1.55, 'shB.rx': -1.55, 'elA.rx': -0.05, 'elB.rx': -0.05, 'wrA.rx': -0.3, 'wrB.rx': -0.3, 'torso.rx': 0.28 })],
    slam:     [{ 'shA.rx': -2.7, 'shB.rx': -2.7, 'elA.rx': -0.9, 'elB.rx': -0.9, 'torso.rx': -0.35, 'head.rx': -0.25 }, merge(CROUCH, { 'shA.rx': -0.35, 'shB.rx': -0.35, 'elA.rx': -0.1, 'elB.rx': -0.1, 'torso.rx': 0.75, 'head.rx': 0.4 })],
    throw:    [{ 'shB.rx': -2.7, 'elB.rx': -1.0, 'shA.rx': -0.5, 'elA.rx': -0.5, 'torso.ry': 0.6, 'torso.rx': -0.2, 'hpA.rx': 0.25 }, merge(LUNGE, { 'shB.rx': -0.5, 'elB.rx': -0.15, 'wrB.rx': 0.5, 'torso.ry': -0.55, 'torso.rx': 0.4, 'shA.rx': 0.3 })],
    jab:      [{ 'shA.rx': -1.0, 'elA.rx': -2.1, 'shB.rx': -1.0, 'elB.rx': -2.1, 'torso.ry': 0.35, 'torso.rx': 0.05, 'hpA.rx': 0.1 }, merge(LUNGE, { 'shA.rx': -1.55, 'elA.rx': -0.05, 'shB.rx': -1.0, 'elB.rx': -2.1, 'torso.ry': -0.5, 'torso.rx': 0.12, 'head.ry': 0.2 })],
    knee:     [{ 'shA.rx': -1.1, 'elA.rx': -2.0, 'shB.rx': -1.1, 'elB.rx': -2.0, 'torso.rx': -0.15, 'hpB.rx': 0.1 }, { 'shA.rx': -1.0, 'elA.rx': -1.7, 'shB.rx': -1.0, 'elB.rx': -1.7, 'torso.rx': 0.25, 'hpA.rx': -1.9, 'knA.rx': 1.6, 'hpB.rx': 0.15 }],
    shoot:    [{ 'shA.rx': -1.45, 'elA.rx': -0.1, 'shB.rx': -1.2, 'elB.rx': -1.2, 'torso.ry': 0.3, 'head.ry': -0.2, 'hpA.rx': 0.15 }, { 'shA.rx': -1.5, 'elA.rx': -0.05, 'shB.rx': -1.35, 'elB.rx': -0.4, 'torso.ry': 0.25, 'torso.rx': -0.05, 'head.ry': -0.2 }],
    crouch:   [{ 'torso.rx': 0.5, 'head.rx': 0.2, 'shA.rx': -0.4, 'shB.rx': -0.4, 'elA.rx': -0.8, 'elB.rx': -0.8, 'hpA.rx': -0.8, 'knA.rx': 1.3, 'hpB.rx': -0.8, 'knB.rx': 1.3 }, merge(LUNGE, { 'torso.rx': 0.4, 'shA.rx': -0.9, 'shB.rx': 0.5, 'elA.rx': -0.2, 'root.rx': 0.2 })]
  };
  const sw = function (a, b, d) { return tl(d || 1, [[0, {}], [0.3, ARCH[a][0], 'o'], [0.55, ARCH[a][1], 'o'], [1, {}]], { noTrail: false }); };
  const spinAct = function (dir) { const B = S.arr(); return { dur: 1, noTrail: false, fn: function (t) { const P = Float32Array.from(B), k = Math.min(1, t / 0.75), e = k * k * (3 - 2 * k); P[KI['root.ry']] = dir * e * TAU; P[KI['shA.rz']] = 1.35; P[KI['shB.rz']] = -1.35; P[KI['shA.rx']] = -0.2; P[KI['shB.rx']] = -0.2; P[KI['elA.rx']] = -0.15; P[KI['elB.rx']] = -0.15; P[KI['hpA.rx']] = -0.35; P[KI['knA.rx']] = 0.5; return P; } }; };
  // [ท่าตี, ท่าสกิล 1, 2, 3]  (spin / - = ใช้ชุดท่าของสไตล์เดิม)
  const PLAN = {
    nakdab:   ['-',      'thrust', 'sweep',  'overhead'],
    phran:    ['-',      'shoot',  'crouch', 'raise'],
    mohya:    ['push',   'push',   'raise',  'throw'],
    kwan:     ['overhead', 'slam', 'sweep',  'raise'],
    mothamma: ['push',   'raise',  'push',   'slam'],
    muay:     ['jab',    'knee',   'spin',   'slam'],
    seri:     ['-',      'throw',  'shoot',  'raise'],
    yai:      ['sweep',  'slam',   'push',   'raise'],
    spy:      ['thrust', 'throw',  'sweep',  'spin'],
    mae:      ['throw',  'throw',  'push',   'raise'],
    win:      ['sweep',  'spin',   'thrust', 'slam'],
    chang:    ['push',   'raise',  'throw',  'slam']
  };
  Object.keys(PLAN).forEach(function (id) {
    H[id].game = function () {
      const pl = PLAN[id], out = {}, mk = function (n, i) { return n === '-' ? null : (n === 'spin' ? spinAct(i % 2 ? 1 : -1) : sw(n)); };
      const a = mk(pl[0], 0); if (a) out.gatk = a;
      for (let i = 1; i < 4; i++) out['gc' + (i - 1)] = mk(pl[i], i);
      return out;
    };
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
