/* Thai Realm — ตารางข้อมูลทั้งหมด (ปรับสมดุลที่ไฟล์นี้ ไม่ต้องแก้โค้ด)
   ตัวเลขทุกตัวเป็นค่าตั้งต้นสำหรับทดสอบ ยังไม่ผ่านการรันบอทหรือผู้เล่นจริงจนกว่าจะมีบันทึกใน CHANGELOG */
(function (G) {
  'use strict';
  const TR = (G.TR = G.TR || {});

  TR.VERSION = '0.27.1';

  TR.CFG = {
    dt: 0.05,          // ตรรกะเกม 20 ครั้งต่อวินาที
    W: 3200,           // ความกว้างแมพ
    H: 1200,           // ความสูงแมพ (3 เลน)
    baseY: 600,        // แกน y ของฐาน/ราชธานี
    lanes: [
      { name: 'เลนบน', y: 240 },
      { name: 'เลนกลาง', y: 600 },
      { name: 'เลนล่าง', y: 960 }
    ],
    laneEntry: 560,    // x ที่ทางโค้งจากฐานไปบรรจบเลนบน/ล่าง
    botLanes: [1, 0, 0, 2, -1],  // ช่องฮีโร่ 0-4 ของบอทไปเลนไหน (0 = กลาง, -1 = ตีป่า)
    eraLen: 300,       // เปลี่ยนยุคทุก 5 นาที
    fog: true,   // หมอกสงคราม: ทีมเห็นเฉพาะรอบตัวฮีโร่/ลูกกระจ๊อก/ป้อม/ตะเกียง เป้าที่อยู่ในหมอกเล็ง/ตีไม่ได้ (สกิลพื้นที่ยังโดนได้)
    vision: { hero: 270, minion: 150, tower: 360, king: 420 },   // รัศมีมองเห็น (หน่วยโลก) · ตะเกียงใช้ CFG.ward.r
    ward: { max: 2, regen: 45, dur: 90, r: 380, sweep: 60 },   // ตะเกียงส่องทาง: จำนวนที่ถือได้ เวลาได้คืน 1 อัน อายุ รัศมีมองเห็น ระยะที่ศัตรูเดินทับแล้วพัง
    ban: { n: 1 },      // จำนวนฮีโร่ที่แต่ละฝ่ายแบน (ตอนนี้มี 20 ตัว ต้องเหลือพอลง 10 คน เพิ่มฮีโร่แล้วค่อยเพิ่มเลขนี้)
    eraWarn: 10,       // แจ้งเตือนก่อนเปลี่ยนยุค (วินาที) — ข้อเสนอที่ยังไม่ได้ตัดสินใจ
    maxTime: 1800,     // เพดานเวลาแมตช์สำหรับเครื่องมือบอท
    peak: 1.12,        // ยุครุ่งเรือง: ดาเมจและเลือด +12%
    gold: { share: 6, shareR: 260, lastHit: 3 },   // ทองจากลูกกระจ๊อก: เพื่อนที่ยืนใกล้ (shareR) ได้ share · คนปลิดได้โบนัส lastHit
    alertGap: 12,        // วินาทีขั้นต่ำระหว่างคำเตือนป้อม/ฐานถูกโจมตีของป้อมเดิม
    waveEvery: 25,
    firstWave: 4,
    respawnBase: 6,
    respawnPerLevel: 1.6,
    maxLevel: 10,
    levelBonus: 0.07,  // ต่อเลเวล: เลือดและดาเมจ
    juice: { heavyFrac: 0.2, hurtShake: 3.2, hitShake: 2.2, killShake: 4, deathShake: 7, hitStopMs: 45, killStopMs: 70, deathStopMs: 110 },   // เอฟเฟกต์ต่อสู้ (ภาพล้วน): ตีหนัก = โดน/ตีเกินกี่ส่วนของเลือดสูงสุด, แรงสั่นเป็นพิกเซลโลก, หน่วงเฟรมเป็น ms (ออฟไลน์เท่านั้น)
    recipeFloor: 0.2,   // ไอเทมประจำยุค: ราคาสุทธิหลังหักชิ้นย่อย ต่ำสุดคิดเป็นกี่ส่วนของราคาเต็ม
    botEraItems: 2,     // บอทซื้อไอเทมประจำยุคได้กี่ชิ้นต่อเกม
    shopSlots: 6,      // ช่องไอเทมต่อคน (ไอเทมแต่ละชิ้นซื้อได้ชิ้นเดียว)
    skillMax: 4,       // เลเวลสกิล 1-2 สูงสุด
    ultLevels: [4, 7, 10], // ฮีโร่เลเวลเท่านี้ถึงอัปอัลติเป็นเลเวล 1/2/3
    skillBase: 0.80, skillStep: 0.12, // ตัวคูณพลังสกิล = base + step × เลเวลสกิล
    ultBase: 0.75, ultStep: 0.15,
    skillCd: 0.04,     // ลดคูลดาวน์ต่อเลเวลสกิลที่เพิ่ม
    critMul: 1.6,      // ดาเมจคริติคอลจากไอเทม
    cdrCap: 0.4,       // ลดคูลดาวน์สกิลได้สูงสุด 40%
    towerAggro: 2.5,   // ป้อมหันไปตีศัตรูที่เพิ่งตีฮีโร่ฝั่งตัวเองภายในกี่วินาที (สำคัญกว่าเป้าที่ล็อกอยู่)
    shopRange: 230,    // ซื้อได้เมื่ออยู่ในระยะนี้จากฐาน หรือตอนตายรอเกิดใหม่
    laneTowers: [
      // ต่อเลน: ค่ายไม้ → ด่านหน้า → ค่ายกลาง ต้องพังตามลำดับ เลือดคงที่ทุกยุค (ค่ายไม้เป็นด่านนอกสุดใกล้กลางแมพ เลือดน้อย พังไว)
      { name: 'ค่ายไม้', x: 1380, hp: 680 },
      { name: 'ด่านหน้า', x: 1150, hp: 1050 },
      { name: 'ค่ายกลาง', x: 720, hp: 1300 }
    ],
    // ชื่อป้อมตามยุค [ชั้นนอก, ชั้นกลาง, ชั้นใน] (เลือดเท่าเดิม เปลี่ยนแค่ชื่อที่โชว์)
    towerNames: [['ค่ายไม้', 'ด่านหน้า', 'ค่ายกลาง'], ['ป้อมระเนียด', 'ป้อมปราการ', 'ป้อมหลวง'], ['ด่านลวดหนาม', 'บังเกอร์', 'ที่มั่นใหญ่'], ['ด่านตรวจ', 'ฐานปฏิบัติการ', 'ศูนย์บัญชาการ']],
    // ราชธานี: โจมตีได้เมื่อค่ายกลางของทีมนั้นพังอย่างน้อย 1 เลน พังแล้วจบเกม
    king: { name: 'ราชธานี', x: 240, hp: 1950 },
    towerRange: 150,
    bush: { sight: 95, reveal: 1.0 },            // พุ่มไม้: ศัตรูเห็นเมื่ออยู่พุ่มเดียวกัน/ใกล้ ≤ sight หรือหลังตี/ใช้สกิล reveal วินาที
    backdoor: { r: 650, dmgMul: 0.3, regen: 0.04 }, // ป้อมที่ไม่มีมินเนียนศัตรูอยู่ใกล้ (r) โดนฮีโร่ตีเบาลง และฟื้นเลือดเอง
    cannon: { every: 3, hp: 700, dmg: 62, range: 120, towerMul: 1.3 }, // ทุก ๆ every คลื่นมีมินเนียนปืนใหญ่เลนละตัว
    multiKillWin: 10,    // วินาทีที่ต่อเนื่องนับ Double/Triple...
    surrender: { after: 480, need: 3, cooldown: 120, vote: 20 },
    // บุกป้อมให้จบไว: พอค่ายกลางเลนไหนพัง บอทที่ไม่ใช่สายป่าจะรวมไปเลนนั้นเพื่อบุกราชธานี และเลนที่ป้อมศัตรูพังหมดจะมีมินเนียนยักษ์
    siege: { rallyStart: 240, groupMin: 2, superExtra: 3, superMul: 1.5 },
    buffDur: 80,       // บัฟจากมอนป่าอยู่นานกี่วินาที
    // ค่ายมอนป่าฝั่งซ้าย (ทีม 0) ฝั่งขวาสะท้อน x เป็น W - x
    camps: [
      { kind: 'croc',    x: 900,  y: 425 },
      { kind: 'snake',   x: 900,  y: 775 },
      { kind: 'krasue',  x: 1380, y: 425 },
      { kind: 'krahang', x: 1380, y: 775 }
    ]
  };

  /* กำแพงในป่า: สี่เหลี่ยม [x1,y1,x2,y2] วางเป็นแนวทางเดินป่าฝั่งบนและล่างของเลนกลาง มีช่องเปิดให้เดินเข้าออก
     ระบุเฉพาะมุมซ้ายบนแล้วสะท้อนอัตโนมัติเป็น 4 มุม  */
  (function () {
    const W = TR.CFG.W, H = TR.CFG.H;
    const base = [[560, 342, 920, 360], [1010, 342, 1480, 360], [560, 460, 1000, 478], [1100, 460, 1480, 478]];
    const pts = [[500, 425], [700, 425], [965, 320], [965, 380], [1050, 470], [1050, 530], [1200, 425], [1600, 351], [1600, 425], [1600, 499]];
    const walls = [], way = [], seen = {};
    [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(function (m) {
      base.forEach(function (r) {
        const x1 = m[0] ? W - r[2] : r[0], x2 = m[0] ? W - r[0] : r[2], y1 = m[1] ? H - r[3] : r[1], y2 = m[1] ? H - r[1] : r[3];
        if (!(m[0] && 0)) walls.push({ x1: x1, y1: y1, x2: x2, y2: y2 });
      });
      pts.forEach(function (p) {
        const x = m[0] ? W - p[0] : p[0], y = m[1] ? H - p[1] : p[1], k = x + ',' + y;
        if (!seen[k]) { seen[k] = 1; way.push({ x: x, y: y }); }
      });
    });
    TR.WALLS = walls; TR.WAYPOINTS = way;
  })();

  // ทางลัดข้ามเลน (ตามยุค): เส้นผ่านช่องกำแพงเชื่อมเลนบน/ล่าง ↔ เลนกลาง ฮีโร่ที่วิ่งอยู่บนทางได้ความเร็วเพิ่ม (สะท้อน 4 มุม)
  TR.SHORTCUT = {
    speed: 0.3, w: 34,
    seg: [[965, 351, 1050, 469]],
    eras: [{ name: 'ท่าน้ำ', color: '#4fc3f7' }, { name: 'คลองลัด', color: '#26c6da' }, { name: 'ทางรถไฟร้าง', color: '#bcaaa4' }, { name: 'ซอยลัด', color: '#ffb74d' }]
  };
  TR.SHORTCUT.all = (function () {
    const W = TR.CFG.W, H = TR.CFG.H, out = [];
    [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(function (m) { TR.SHORTCUT.seg.forEach(function (r) { out.push([m[0] ? W - r[0] : r[0], m[1] ? H - r[1] : r[1], m[0] ? W - r[2] : r[2], m[1] ? H - r[3] : r[3]]); }); });
    return out;
  })();

  // บอสกลางป่า: เกิดครั้งแรกที่ spawnAt วินาที ฆ่าแล้วทั้งทีมที่ฆ่าได้บัฟและทอง
  TR.BOSS = { x: 1600, y: 425, spawnAt: 120, teamGold: 150, teamXp: 220, buffDur: 90 };
  // เป้าหมายกลางแมพตามยุค (ใช้ยูนิต g.boss ตัวเดิม): first = เกิดครั้งแรก, respawn = เกิดใหม่หลังตาย, warn = ประกาศล่วงหน้า, swap = หน่วงหลังเปลี่ยนยุค
  // hp/atk = ตัวคูณของ TR.MONSTERS.boss, gold/xp = ให้ทั้งทีมที่ฆ่า, buff = บัฟฮีโร่ทั้งทีม, minion = มินเนียนทีมนั้นแรงขึ้น, tower = ป้อมทีมนั้นแรงขึ้น
  TR.OBJ = {
    first: 120, respawn: 150, warn: 30, swap: 20,
    list: [
      { name: 'ช้างเผือก',   sub: 'ช้างมงคลแห่งสุโขทัย', hp: 0.45, atk: 0.55, gold: 110, xp: 160, dur: 90, buff: { dmgMul: 1.05, armorAdd: 0.06, hot: 40 }, color: '#fff3d0' },
      { name: 'พญานาค',      sub: 'เจ้าแห่งลำน้ำอยุธยา',   hp: 0.7,  atk: 0.8,  gold: 130, xp: 190, dur: 80, buff: { dmgMul: 1.05, hot: 25 }, minion: { dmg: 1.4, dur: 80 }, color: '#4dd0e1' },
      { name: 'ฐานปืนใหญ่ร้าง', sub: 'ปืนใหญ่ยุคสงคราม',   hp: 0.85, atk: 1.0,  gold: 140, xp: 200, dur: 75, buff: { dmgMul: 1.06, armorAdd: 0.05 }, tower: { dmg: 1.5, dur: 75 }, color: '#ffb74d' },
      { name: 'ยักษ์วัดแจ้ง', sub: 'ยักษ์เฝ้าวัด',          hp: 1.0,  atk: 1.0,  gold: 150, xp: 220, dur: 90, buff: { dmgMul: 1.08, armorAdd: 0.08, hot: 25 }, color: '#e53935' }
    ]
  };

  // มอนป่า (กลาง) ไม่เข้าข้างทีมไหน ตีแล้วค่อยโต้ตอบ ไล่ไกลเกินค่ายจะกลับไปฟื้นเลือด
  TR.MONSTERS = {
    croc:    { name: 'จระเข้ยักษ์', hp: 1500, atk: 55, as: 0.9, range: 26, radius: 11, gold: 50,  xp: 55,  respawn: 55, buff: null },
    snake:   { name: 'งูจงอาง',     hp: 1300, atk: 65, as: 1.0, range: 28, radius: 10, gold: 50,  xp: 55,  respawn: 55, buff: null },
    krasue:  { name: 'กระสือ',      hp: 2400, atk: 80, as: 0.9, range: 36, radius: 11, gold: 90, xp: 90, respawn: 90, buff: 'dmg', buffText: 'ดาเมจ +12%' },
    boss:    { name: 'ยักษ์วัดแจ้ง', hp: 10000, atk: 140, as: 0.8, range: 46, radius: 20, gold: 0, xp: 0, respawn: 180, buff: 'boss' },
    krahang: { name: 'กระหัง',      hp: 2400, atk: 70, as: 1.0, range: 36, radius: 11, gold: 90, xp: 90, respawn: 90, buff: 'spd', buffText: 'วิ่งเร็ว +10% ฟื้นเลือด' }
  };

  TR.ERAS = [
    { id: 0, name: 'สุโขทัย', short: 'ค่ายไม้',
      tower: { name: 'ค่ายไม้', dmg: 90, pct: 0.075, dmgMinion: 130, rate: 1.6, ramp: 0.12, rampMax: 4 },
      note: 'ป้อมยิงช้า แต่เจ็บ (ฐาน+7.5% เลือด) ยิงต่อเนื่องแรงขึ้น',
      ground: '#6f9d4a', ground2: '#659243', lane: '#a8946a', lane2: '#9b8860', prop: 'tree' },
    { id: 1, name: 'อยุธยา', short: 'กำแพงอิฐ+ปืนใหญ่',
      tower: { name: 'ปืนใหญ่', dmg: 140, pct: 0.11, dmgMinion: 220, rate: 2.4, splash: 45, ramp: 0.15, rampMax: 3 },
      note: 'ปืนใหญ่ระเบิดหมู่ (ฐาน+11% เลือด) เข้าทีละคน',
      ground: '#8a8f55', ground2: '#7f8450', lane: '#b49b78', lane2: '#a78f6c', prop: 'pagoda' },
    { id: 2, name: 'ยุคสงคราม', short: 'ป้อมปืนกล',
      tower: { name: 'ปืนกล', dmg: 24, pct: 0.0125, dmgMinion: 32, rate: 0.35, focus: true, ramp: 0.02, rampMax: 15 },
      note: 'ปืนกลรัวใส่เป้าเดียว (+1.25% เลือดต่อนัด) ให้แทงค์นำ',
      ground: '#7b7d63', ground2: '#707258', lane: '#8d8672', lane2: '#827b68', prop: 'sandbag' },
    { id: 3, name: 'ปัจจุบัน', short: 'ป้อมไฟฟ้า+กล้องวงจรปิด',
      tower: { name: 'ป้อมไฟฟ้า', dmg: 60, pct: 0.05, dmgMinion: 100, rate: 1.1, reveal: true, ramp: 0.08, rampMax: 5 },
      note: 'ป้อมเห็นคนซุ่ม (ฐาน+5% เลือด) ไม่พึ่งการซุ่ม',
      ground: '#7c8794', ground2: '#727d8a', lane: '#5e6672', lane2: '#555d68', prop: 'building' }
  ];

  // ค่าตั้งต้นของบทบาท (งบพลังรวมเท่ากัน: ได้ด้านหนึ่งเสียอีกด้าน)
  TR.ROLES = {
    tank:     { name: 'แทงค์',    hp: 3600, atk: 78,  as: 0.9,  range: 30,  speed: 74, armor: 0.35, mres: 0.25, radius: 9 },
    fighter:  { name: 'นักสู้',   hp: 2800, atk: 108, as: 1.0,  range: 32,  speed: 83, armor: 0.25, mres: 0.18, radius: 8 },
    mage:     { name: 'เมจ',      hp: 1800, atk: 90,  as: 0.8,  range: 130, speed: 78, armor: 0.10, mres: 0.15, radius: 7 },
    marksman: { name: 'มือปืน',   hp: 1800, atk: 95,  as: 1.1,  range: 160, speed: 76, armor: 0.10, mres: 0.08, radius: 7 },
    assassin: { name: 'แอสซาซิน', hp: 2000, atk: 100, as: 1.0,  range: 30,  speed: 99, armor: 0.12, mres: 0.08, radius: 7 },
    support:  { name: 'ซัพพอร์ต', hp: 2300, atk: 55,  as: 1.0,  range: 110, speed: 83, armor: 0.15, mres: 0.15, radius: 8 }
  };

  // ระยะตีธรรมดารายฮีโร่ (หน่วยโลก) — ไม่มีในรายการ = ใช้ค่าของบทบาท (TR.ROLES[role].range)
  // ป้อมยิงไกล CFG.towerRange 150: นักยิงต้องไม่ไกลเกินป้อมมาก, สายประชิดต่างกันตามขนาดอาวุธ (>60 = ยิงกระสุน)
  TR.HERO_RANGE = { nakdab: 34, muay: 28, kwan: 40, yai: 32, spy: 28, win: 32, phran: 165, seri: 150, mothamma: 125, chang: 135, mohya: 105, mae: 92, nopphamat: 130, pun: 175, press: 155, nurse: 95 };
  TR.atkRange = function (def) { const v = TR.HERO_RANGE[def.id]; return v != null ? v : TR.ROLES[def.role].range; };

  // ตัวคูณปรับสมดุลรายฮีโร่ (จากผลรันบอทหลายรอบ) hp/dmg 1 = ปกติ
  TR.HERO_BAL = { chang: { hp: 0.92, dmg: 0.91 }, win: { hp: 1.06, dmg: 1.08 }, kwan: { hp: 0.9, dmg: 0.93 }, muay: { hp: 0.92, dmg: 0.93 }, mae: { hp: 1.06, dmg: 1.06 }, yai: { hp: 1.08, dmg: 1.08 }, press: { hp: 0.93, dmg: 0.92 }, yamada: { hp: 1.06, dmg: 1.08 }, nakdab: { hp: 1.06, dmg: 1.06 }, mohya: { hp: 0.95, dmg: 1 }, mothamma: { hp: 0.96, dmg: 0.97 } };
  // ตัวเลขพลังติดตัวของฮีโร่ชุดใหม่ (v0.22)
  TR.PASSIVE = {
    nopphamat: { shield: 0.07, dur: 2 }, khunsuek: { still: 1, armor: 0.12 },
    pun: { every: 3, mul: 1.5 }, press: { every: 4, blind: 1 },
    jaa: { hpBelow: 0.5, ls: 0.15 }, nurse: { r: 200, hpBelow: 0.35, pct: 0.015 },
    traffic: { slow: 0.1, dur: 1.5 }
  };

  // ชุดอารมณ์: ค่าสถานะพื้นฐาน + ราคาที่ต้องจ่าย (พลังแฝงอยู่ใน sim.js)
  TR.EMBLEMS = {
    lob:  { key: 'lob',  name: 'โลภ',   color: '#e0a82e', goldMul: 1.08, regenMul: 0.6,
            stat: 'ทองจากมินเนียน +8%', cost: 'เลือดฟื้นตัวลดลง',
            latent: 'ทุก 3 มินเนียนที่ปิดด้วยการตีปกติ สกิลถัดไปแรงขึ้น 8%' },
    kro:  { key: 'kro',  name: 'โกรธ',  color: '#d9432e', dmgMul: 1.06, armorAdd: -0.06,
            stat: 'ดาเมจ +6%', cost: 'เกราะ -6%',
            latent: 'ตีเป้าที่เลือดต่ำกว่า 40% ดาเมจเพิ่ม 10%' },
    long: { key: 'long', name: 'หลง',   color: '#8a5bd0', speedMul: 1.05, hpMul: 0.95,
            stat: 'ความเร็วเคลื่อนที่ +5%', cost: 'เลือดสูงสุด -5%',
            latent: 'เลือดต่ำกว่า 30% สร้างภาพลวง 2 วินาที ศัตรูและป้อมเลือกเป้าผิด (คูลดาวน์ 60 วินาที)' },
    sat:  { key: 'sat',  name: 'ศรัทธา', color: '#3fa7c8', armorAdd: 0.06, regenMul: 1.06, dmgMul: 0.95,
            stat: 'ต้านทานและเลือดฟื้น +6%', cost: 'ดาเมจ -5%',
            latent: 'อยู่ใกล้เพื่อน ทั้งคู่ได้บัฟเล็ก ๆ' }
  };
  TR.EMBLEM_ORDER = ['lob', 'kro', 'long', 'sat'];

  // ความเหมาะของฮีโร่กับชุดอารมณ์ [โลภ, โกรธ, หลง, ศรัทธา] — 1=แย่ 2=กลาง 3=ดี 4=ดีมาก (ตามเอกสารออกแบบ)
  TR.FIT = {
    nakdab: [2, 4, 1, 3], phran: [4, 2, 3, 1], mohya: [1, 1, 2, 4],
    kwan: [1, 2, 3, 4], mothamma: [4, 3, 1, 2], muay: [1, 4, 2, 3],
    seri: [2, 3, 4, 1], yai: [1, 1, 2, 4], spy: [2, 3, 4, 1],
    mae: [1, 1, 2, 4], win: [2, 4, 3, 1], chang: [4, 2, 1, 2],
    nopphamat: [4, 2, 2, 3], khunsuek: [1, 3, 2, 4], pun: [4, 3, 2, 1], yamada: [2, 4, 3, 1],
    jaa: [1, 4, 2, 3], nurse: [1, 1, 3, 4], traffic: [1, 2, 3, 4], press: [4, 2, 3, 1]
  };
  TR.FIT_LABEL = ['', 'แย่', 'กลาง', 'ดี', 'ดีมาก'];

  /* ฮีโร่: สกิลเขียนเป็นรายการ "เอฟเฟกต์" (fx) ที่ sim.js รู้จัก
     ai = คำใบ้ให้บอทว่าเมื่อไหร่ควรใช้ (enemy / lowAlly / lowAllyCrit / fight / allies / taunt / escape / ult) */
  TR.HEROES = [
    // ---------- สุโขทัย ----------
    { id: 'nakdab', name: 'นักดาบอาสา', era: 0, role: 'fighter',
      passive: { id: 'nakdab', name: 'ใจนักสู้', desc: 'ตีปกติครั้งที่ 4 ของทุกชุดแรงขึ้น 60%' }, skillMag: false, basicMag: false,
      strength: 'ประชิดตัวดี มีสกิลตอบโต้', weakness: 'ไม่มีสกิลหนี',
      colors: { body: '#c0392b', accent: '#f1c40f', hair: '#4e342e' },
      skills: [
        { name: 'ฟันสวนกลับ', icon: 'parry', cd: 8, ai: 'fight', aiRange: 60,
          desc: 'ตั้งท่ารับ 1 วินาที ถ้าถูกตีจะลดดาเมจครึ่งหนึ่งและสวนกลับ',
          fx: [{ k: 'counter', dur: 1, dmg: 170, reduce: 0.5 }] },
        { name: 'ก้าวประชิด', icon: 'lunge', cd: 7, ai: 'enemy', aiRange: 130,
          desc: 'พุ่งสั้น ๆ เข้าหาศัตรู (ใช้บุก ไม่ใช่หนี)',
          fx: [{ k: 'dash', dist: 110, dmg: 80, toTarget: true, stop: 22, range: 140, w: 14 }] },
        { name: 'ศึกสุดท้าย', icon: 'bloodrage', cd: 55, ai: 'ult', aiRange: 90,
          desc: 'ดูดเลือด 30% กันการคุม ดาเมจเพิ่ม 5 วินาที',
          fx: [{ k: 'buff', who: 'self', dur: 5, lifesteal: 0.3, ccImmune: true, dmgMul: 1.1 }] }
      ] },
    { id: 'phran', name: 'พรานป่า', era: 0, role: 'marksman',
      passive: { id: 'phran', name: 'ตาเหยี่ยวพราน', desc: 'ดาเมจใส่เป้าที่ถูกชะลอหรือถูกตรึงเพิ่ม 15%' }, skillMag: false, basicMag: false,
      strength: 'ยิงไกล วางกับดักคุมเลน', weakness: 'ประชิดแล้วเปราะ ช้าลงตอนวางกับดัก',
      colors: { body: '#2e7d32', accent: '#a1887f', hair: '#3e2723' },
      skills: [
        { name: 'ยิงธนู', icon: 'arrow', cd: 4, ai: 'enemy', aiRange: 190,
          desc: 'ยิงไกลเป้าเดียว ดาเมจเพิ่มถ้าเป้าติดกับดัก',
          fx: [{ k: 'shot', range: 210, speed: 260, w: 5, dmg: 135, rootedMul: 1.4 }] },
        { name: 'กับดักหนาม', icon: 'spikes', cd: 12, ai: 'enemy', aiRange: 120,
          desc: 'วางได้ 2 อัน ล็อกเป้าที่เหยียบ ขณะวางจะช้าลง',
          fx: [{ k: 'trap', range: 70, r: 16, dmg: 60, root: 1.2, max: 2, life: 25, selfSlow: 0.4 }] },
        { name: 'ฝนศรป่า', icon: 'arrowrain', cd: 40, ai: 'ult', aiRange: 160,
          desc: 'ยิงลูกศรกระจายเป็นกรวยด้านหน้า',
          fx: [{ k: 'cone', range: 170, n: 7, spread: 50, dmg: 95, speed: 240 }] }
      ] },
    { id: 'mohya', name: 'หมอยาสมุนไพร', era: 0, role: 'support',
      passive: { id: 'mohya', name: 'กลิ่นสมุนไพร', desc: 'เพื่อนในระยะ 180 ฟื้นเลือดช้า ๆ 0.8% ต่อวินาที' }, skillMag: true, basicMag: false,
      strength: 'ฮีลต่อเนื่อง ล้างสถานะลบ', weakness: 'แทบไม่มีดาเมจ ต้องอยู่ใกล้เป้าหมาย',
      colors: { body: '#7cb342', accent: '#fff8e1', hair: '#5d4037' },
      skills: [
        { name: 'ยาต้มประคอง', icon: 'herbpot', cd: 6, ai: 'lowAlly', aiRange: 140,
          desc: 'ฮีลต่อเนื่องเพื่อน 1 คน 3 วินาที',
          fx: [{ k: 'heal', who: 'lowest', r: 140, pct: 0.18, hot: 3 }] },
        { name: 'ถอนพิษ', icon: 'purge', cd: 14, ai: 'allies', aiRange: 110,
          desc: 'ล้างสถานะลบของเพื่อนในระยะ และให้ต้านทานสั้น ๆ',
          fx: [{ k: 'buff', who: 'allies', r: 110, dur: 3, armorAdd: 0.15, cleanse: true }] },
        { name: 'ยาชูกำลัง', icon: 'lifeburst', cd: 70, ai: 'lowAllyCrit', aiRange: 200,
          desc: 'เพื่อนที่เลือดต่ำกว่า 25% ในระยะ ฟื้นเลือดทันที (ครั้งละ 1 คน)',
          fx: [{ k: 'heal', who: 'lowest', r: 200, pct: 0.5, hpBelow: 0.25 }] }
      ] },
    { id: 'nopphamat', name: 'นางนพมาศ', era: 0, role: 'mage',
      passive: { id: 'nopphamat', name: 'โคมลอยคุ้มกาย', desc: 'ร่ายสกิลแล้วได้โล่ 7% ของเลือดสูงสุด นาน 2 วินาที' }, skillMag: true, basicMag: true,
      strength: 'ยิงไกล มีโล่ตอนร่าย', weakness: 'เลือดน้อย ดาเมจต่อครั้งไม่สูง',
      colors: { body: '#ec6f9a', accent: '#ffd54f', hair: '#3e2723' },
      skills: [
        { name: 'กระทงเพลิง', icon: 'lantern', cd: 5, ai: 'enemy', aiRange: 190,
          desc: 'ปล่อยกระทงไฟพุ่งตรงไปไกล ดาเมจเวทเป้าเดียว',
          fx: [{ k: 'shot', range: 220, speed: 210, w: 6, dmg: 135 }] },
        { name: 'ม่านดอกไม้', icon: 'blossom', cd: 11, ai: 'fight', aiRange: 120,
          desc: 'โล่กลีบดอกไม้รอบตัว 3 วินาที และวิ่งเร็วขึ้นเล็กน้อย',
          fx: [{ k: 'buff', who: 'self', dur: 3, shield: 260, speedMul: 1.12 }] },
        { name: 'สายน้ำลอยกระทง', icon: 'riverlight', cd: 48, ai: 'ult', aiRange: 150,
          desc: 'คลื่นแสงระเบิดพื้นที่ใหญ่ ดาเมจเวทและหน่วงศัตรู',
          fx: [{ k: 'blast', range: 160, r: 66, delay: 0.8, dmg: 250, slow: [0.4, 2] }] }
      ] },
    { id: 'khunsuek', name: 'ขุนศึกโล่หวาย', era: 0, role: 'tank',
      passive: { id: 'khunsuek', name: 'ยืนหยัดแนวหน้า', desc: 'ยืนนิ่งเกิน 1 วินาที ได้เกราะเพิ่ม 12%' }, skillMag: false, basicMag: false,
      strength: 'ตั้งรับเหนียว ดึงความสนใจศัตรู', weakness: 'ดาเมจต่ำ ไม่มีสกิลหนี',
      colors: { body: '#6d4c41', accent: '#cfa14a', hair: '#212121' },
      skills: [
        { name: 'โล่กระแทก', icon: 'shieldbash', cd: 8, ai: 'enemy', aiRange: 120,
          desc: 'พุ่งสั้นใส่ด้วยโล่ ผลักศัตรูออกไปเล็กน้อย',
          fx: [{ k: 'dash', dist: 90, dmg: 75, toTarget: true, stop: 22, range: 120, push: 30, w: 16 }] },
        { name: 'ตั้งโล่หวาย', icon: 'rattanwall', cd: 12, ai: 'fight', aiRange: 90,
          desc: 'ตั้งโล่ 2.5 วินาที รับดาเมจดีขึ้นแต่เดินช้าลง',
          fx: [{ k: 'buff', who: 'self', dur: 2.5, shield: 380, speedMul: 0.75, armorAdd: 0.2 }] },
        { name: 'ประกาศศึก', icon: 'warcry', cd: 55, ai: 'ult', aiRange: 100,
          desc: 'ศัตรูรอบตัวหันมาตีเรา 1.5 วินาที และเรารับดาเมจน้อยลง',
          fx: [{ k: 'taunt', r: 110, dur: 1.5 }, { k: 'buff', who: 'self', dur: 4, armorAdd: 0.25 }] }
      ] },
    // ---------- อยุธยา ----------
    { id: 'kwan', name: 'ควาญช้างศึก', era: 1, role: 'tank',
      passive: { id: 'kwan', name: 'ผิวหนาช้างศึก', desc: 'เลือดต่ำกว่าครึ่ง ได้เกราะเพิ่ม 10% และวิ่งเร็วขึ้น 10%' }, skillMag: false, basicMag: false,
      strength: 'ทนมาก พังป้อมไว', weakness: 'ช้า โดนยิงไกลทุบ',
      colors: { body: '#8d6e63', accent: '#ffb300', hair: '#37474f' },
      skills: [
        { name: 'ช้างกระแทก', icon: 'ramtusk', cd: 9, ai: 'enemy', aiRange: 140,
          desc: 'พุ่งตรง ผลักศัตรูตามแนวทาง',
          fx: [{ k: 'dash', dist: 130, dmg: 90, toTarget: true, range: 150, push: 40, w: 18 }] },
        { name: 'เกราะหนัง', icon: 'hide', cd: 12, ai: 'fight', aiRange: 90,
          desc: 'โล่ 3 วินาที ลดดาเมจรับแต่ช้าลง',
          fx: [{ k: 'buff', who: 'self', dur: 3, shield: 450, speedMul: 0.8, armorAdd: 0.15 }] },
        { name: 'ช้างศึกคลั่ง', icon: 'stomp', cd: 60, ai: 'ult', aiRange: 90,
          desc: 'ดาเมจพื้นที่ใหญ่ และ 6 วินาทีที่ทำดาเมจป้อมเพิ่ม',
          fx: [{ k: 'nova', r: 100, dmg: 260, stun: 0.6 }, { k: 'buff', who: 'self', dur: 6, towerMul: 1.6 }] }
      ] },
    { id: 'mothamma', name: 'หมอธรรม', era: 1, role: 'mage',
      passive: { id: 'mothamma', name: 'ธาตุยันต์สามชั้น', desc: 'ร่ายสกิลครบ 3 ครั้ง ครั้งถัดไปแรงขึ้น 30%' }, skillMag: true, basicMag: true,
      strength: 'ดาเมจกลุ่ม คุมพื้นที่', weakness: 'เลือดน้อย โดนประชิดแล้วจบ',
      colors: { body: '#6a1b9a', accent: '#ffeb3b', hair: '#212121' },
      skills: [
        { name: 'ยันต์ไฟ', icon: 'fireseal', cd: 6, ai: 'enemy', aiRange: 160,
          desc: 'ระเบิดพื้นที่กลม ดาเมจเวทกลุ่ม ร่ายช้า',
          fx: [{ k: 'blast', range: 170, r: 42, delay: 0.6, dmg: 170 }] },
        { name: 'กำแพงคาถา', icon: 'wallrune', cd: 13, ai: 'enemy', aiRange: 120,
          desc: 'วางพื้นที่หน่วงศัตรู 3 วินาที',
          fx: [{ k: 'zone', range: 120, r: 50, dur: 3, tick: 0.25, slow: 0.4 }] },
        { name: 'ฝนคาถา', icon: 'spellrain', cd: 50, ai: 'ult', aiRange: 140,
          desc: 'ร่ายต่อเนื่อง 3 วินาทีในพื้นที่ใหญ่ ต้องยืนนิ่ง ถูกคุมแล้วขาด',
          fx: [{ k: 'zone', range: 140, r: 70, dur: 3, tick: 0.5, dmg: 100, channel: true }] }
      ] },
    { id: 'muay', name: 'นักมวยคาดเชือก', era: 1, role: 'fighter',
      passive: { id: 'muay', name: 'หมัดไม่หยุด', desc: 'ตีโดนต่อเนื่องได้ตีเร็วขึ้นทีละ 5% (ซ้อนได้ 5 ชั้น)' }, skillMag: false, basicMag: false,
      strength: 'คอมโบต่อเนื่อง ติดมึน', weakness: 'ระยะสั้นมาก ถูกคุมแล้วคอมโบขาด',
      colors: { body: '#ef6c00', accent: '#ffffff', hair: '#212121' },
      skills: [
        { name: 'หมัดชุด', icon: 'fists', cd: 6, ai: 'enemy', aiRange: 42,
          desc: '3 หมัดต่อเนื่อง ยิ่งโดนติดยิ่งแรง',
          fx: [{ k: 'combo', n: 3, dmg: 60, gap: 0.18, range: 42, ramp: 0.25, mark: true }] },
        { name: 'เข่าลอย', icon: 'knee', cd: 8, ai: 'enemy', aiRange: 70,
          desc: 'ถ้าเป้าถูกหมัดชุดครบ จะติดมึนสั้น ๆ',
          fx: [{ k: 'strike', range: 60, dmg: 110, markedStun: 0.8, dashTo: true }] },
        { name: 'คอมโบมงคล', icon: 'combostar', cd: 50, ai: 'ult', aiRange: 60,
          desc: 'ท่ารวบ 4 ครั้งใส่เป้าเดียว ดาเมจรวมสูง แต่ถูกคุมแล้วขาด',
          fx: [{ k: 'combo', n: 4, dmg: 130, gap: 0.22, range: 48, root: true, breakStun: true }] }
      ] },
    { id: 'pun', name: 'พลปืนคาบชุด', era: 1, role: 'marksman',
      passive: { id: 'pun', name: 'ยิงเป็นชุด', desc: 'ตีปกติครั้งที่ 3 ของทุกชุดแรงขึ้น 50%' }, skillMag: false, basicMag: false,
      strength: 'ดาเมจไกล ยืนนิ่งยิงแรง', weakness: 'ชักช้า เลือดน้อย โดนประชิดแล้วเปราะ',
      colors: { body: '#37474f', accent: '#c62828', hair: '#3e2723' },
      skills: [
        { name: 'ยิงนัดเดียว', icon: 'musket', cd: 5, ai: 'enemy', aiRange: 210,
          desc: 'กระสุนไกลเป้าเดียว ถ้ายืนนิ่งก่อนยิงแรงขึ้น',
          fx: [{ k: 'shot', range: 240, speed: 380, w: 5, dmg: 150, stillMul: 1.3 }] },
        { name: 'ถอยตั้งแถว', icon: 'fallback', cd: 10, ai: 'escape', aiRange: 120,
          desc: 'ถอยหลังสั้น ๆ แล้ววิ่งเร็วขึ้นชั่วครู่',
          fx: [{ k: 'dash', dist: 70, dmg: 0, away: true }, { k: 'buff', who: 'self', dur: 1.5, speedMul: 1.2 }] },
        { name: 'ชุดยิงสลับแถว', icon: 'volley', cd: 42, ai: 'ult', aiRange: 180,
          desc: 'ยิงกระสุนกระจายเป็นกรวยแคบด้านหน้า',
          fx: [{ k: 'cone', range: 200, n: 5, spread: 24, dmg: 105, speed: 340 }] }
      ] },
    { id: 'yamada', name: 'ยามาดะอาสา', era: 1, role: 'assassin',
      passive: { id: 'yamada', name: 'ดาบไม่ลังเล', desc: 'สังหารศัตรูได้ รีเซ็ตคูลดาวน์สกิล 1 ทันที' }, skillMag: false, basicMag: false,
      strength: 'เก็บฮีโร่เลือดน้อยแล้วต่อเนื่อง', weakness: 'เปราะ ต้องเข้าประชิดทุกครั้ง',
      colors: { body: '#283593', accent: '#e53935', hair: '#111111' },
      skills: [
        { name: 'ฟันพุ่ง', icon: 'iaidash', cd: 7, ai: 'enemy', aiRange: 150,
          desc: 'พุ่งเข้าฟันศัตรูตามทางที่ผ่าน',
          fx: [{ k: 'dash', dist: 110, dmg: 110, toTarget: true, stop: 20, range: 150, w: 14 }] },
        { name: 'ใบมีดเงา', icon: 'shadowblade', cd: 6, ai: 'enemy', aiRange: 70,
          desc: 'ฟันแรงใส่เป้าเดียว แรงขึ้นถ้าฟันจากด้านหลัง',
          fx: [{ k: 'strike', range: 55, dmg: 120, backMul: 1.3, dashTo: true }] },
        { name: 'ดาบซามูไร', icon: 'katana', cd: 44, ai: 'ult', aiRange: 140,
          desc: 'ล็อกเป้าฟันเดียวจบ ดาเมจสูงมากถ้าเลือดต่ำกว่า 35%',
          fx: [{ k: 'strike', range: 150, dmg: 220, execBelow: 0.35, execMul: 1.6, dashTo: true }] }
      ] },
    // ---------- ยุคสงคราม ----------
    { id: 'seri', name: 'เสรีไทย', era: 2, role: 'marksman',
      passive: { id: 'seri', name: 'ยิงจากที่ซ่อน', desc: 'ตีและยิงสกิลขณะอยู่ในพุ่มไม้ ดาเมจเพิ่ม 25%' }, skillMag: false, basicMag: false,
      strength: 'ยิงไกล ซุ่มในพุ่ม', weakness: 'ถูกตอบโต้ได้ถ้าโดนจับตำแหน่ง',
      colors: { body: '#33691e', accent: '#cfd8dc', hair: '#455a64' },
      skills: [
        { name: 'ยิงเล็ง', icon: 'sniper', cd: 4, ai: 'enemy', aiRange: 210,
          desc: 'กระสุนไกล ดาเมจสูงขึ้นถ้าไม่ได้เคลื่อนที่',
          fx: [{ k: 'shot', range: 230, speed: 340, w: 4, dmg: 145, stillMul: 1.35 }] },
        { name: 'ซุ่มพราง', icon: 'camo', cd: 14, ai: 'enemy', aiRange: 220,
          desc: 'ซ่อนตัว 1 วินาที สกิลถัดไปแรงขึ้น (ไม่ใช่ล่องหนทั้งแมพ)',
          fx: [{ k: 'buff', who: 'self', dur: 1.2, stealth: true, nextSkillMul: 1.3 }] },
        { name: 'ส่งพิกัด', icon: 'crosshair', cd: 55, ai: 'ult', aiRange: 300,
          desc: '4 วินาที มาร์กศัตรูทั้งเลน เพื่อนตีเป้าที่มาร์กได้ดาเมจ +10%',
          fx: [{ k: 'mark', range: 300, dur: 4, mul: 0.1 }] }
      ] },
    { id: 'yai', name: 'ผู้ใหญ่บ้านพิทักษ์', era: 2, role: 'tank',
      passive: { id: 'yai', name: 'พ่อเมือง', desc: 'เพื่อนในระยะ 220 ได้เกราะเพิ่ม 5%' }, skillMag: false, basicMag: false,
      strength: 'ล่อเป้า แบ่งดาเมจแทนเพื่อน', weakness: 'ดาเมจต่ำ ต้องมีเพื่อนอยู่ใกล้',
      colors: { body: '#5d4037', accent: '#ffd54f', hair: '#8d6e63' },
      skills: [
        { name: 'ร้องประกาศ', icon: 'horn', cd: 10, ai: 'taunt', aiRange: 110,
          desc: 'ดึงความสนใจของศัตรูและป้อมในระยะ',
          fx: [{ k: 'taunt', r: 110, dur: 1.5, tower: true }] },
        { name: 'โล่ผูกพัน', icon: 'linkshield', cd: 12, ai: 'allies', aiRange: 150,
          desc: 'ผูกกับเพื่อนที่ใกล้ที่สุด แบ่งรับดาเมจแทน 30%',
          fx: [{ k: 'link', range: 150, share: 0.3, dur: 4 }] },
        { name: 'ผนึกกำลังชาวบ้าน', icon: 'unity', cd: 60, ai: 'allies', aiRange: 150,
          desc: '5 วินาที เพิ่มเกราะให้ทีมที่อยู่ใกล้',
          fx: [{ k: 'buff', who: 'allies', r: 150, dur: 5, armorAdd: 0.2 }] }
      ] },
    { id: 'spy', name: 'สายลับเงา', era: 2, role: 'assassin',
      passive: { id: 'spy', name: 'แทงข้างหลัง', desc: 'โจมตีเป้าที่หันหลังให้ ดาเมจเพิ่ม 30%' }, skillMag: false, basicMag: false,
      strength: 'เก็บเป้าเดียวที่เลือดน้อย', weakness: 'เปราะมาก โดนคุมแล้วจบ',
      colors: { body: '#263238', accent: '#b71c1c', hair: '#000000' },
      skills: [
        { name: 'มีดสั้นลับ', icon: 'dagger', cd: 5, ai: 'enemy', aiRange: 80,
          desc: 'ดาเมจเพิ่มเมื่อตีจากด้านหลังเป้า',
          fx: [{ k: 'strike', range: 55, dmg: 130, backMul: 1.4, dashTo: true }] },
        { name: 'ตะขอลวด', icon: 'hook', cd: 9, ai: 'enemy', aiRange: 160,
          desc: 'ดึงตัวเองเข้าหาศัตรู',
          fx: [{ k: 'dash', dist: 150, dmg: 0, toTarget: true, stop: 30, range: 170, onlyHero: true, w: 12 }] },
        { name: 'ภารกิจลับ', icon: 'execute', cd: 45, ai: 'ult', aiRange: 150,
          desc: 'ล็อกเป้า 1 คน ดาเมจสูงถ้าเป้าเลือดต่ำกว่า 40% ฆ่าได้แล้วรีเซ็ตสกิล 1-2',
          fx: [{ k: 'strike', range: 160, dmg: 230, execBelow: 0.4, execMul: 1.8, resetOnKill: true, dashTo: true }] }
      ] },
    { id: 'jaa', name: 'จ่าดาบปลายปืน', era: 2, role: 'fighter',
      passive: { id: 'jaa', name: 'ไม่ถอยแม้เหลือคนเดียว', desc: 'เลือดต่ำกว่าครึ่ง ดูดเลือด 15%' }, skillMag: false, basicMag: false,
      strength: 'ยิ่งเจ็บยิ่งอึด บุกแล้วพลิกเกมได้', weakness: 'ไม่มีสกิลคุมระยะไกล',
      colors: { body: '#556b2f', accent: '#d7ccc8', hair: '#3e2723' },
      skills: [
        { name: 'แทงปลายปืน', icon: 'bayonet', cd: 7, ai: 'enemy', aiRange: 130,
          desc: 'พุ่งแทงเข้าหาศัตรู',
          fx: [{ k: 'dash', dist: 100, dmg: 105, toTarget: true, stop: 22, range: 130, w: 14 }] },
        { name: 'ตั้งท่าป้อง', icon: 'guardstance', cd: 11, ai: 'fight', aiRange: 80,
          desc: 'ลดดาเมจที่รับและดูดเลือด 2.5 วินาที',
          fx: [{ k: 'buff', who: 'self', dur: 2.5, armorAdd: 0.25, lifesteal: 0.15 }] },
        { name: 'สั่งลุย', icon: 'charge', cd: 50, ai: 'ult', aiRange: 95,
          desc: 'ฟาดพื้นที่รอบตัวทำให้มึน และตีแรงขึ้น 5 วินาที',
          fx: [{ k: 'nova', r: 95, dmg: 200, stun: 0.5 }, { k: 'buff', who: 'self', dur: 5, dmgMul: 1.12 }] }
      ] },
    { id: 'nurse', name: 'พยาบาลสนาม', era: 2, role: 'support',
      passive: { id: 'nurse', name: 'ไม่ทิ้งผู้บาดเจ็บ', desc: 'เพื่อนในระยะ 200 ที่เลือดต่ำกว่า 35% ฟื้นเลือด 1.5% ต่อวินาที' }, skillMag: true, basicMag: false,
      strength: 'ช่วยคนเลือดต่ำ ล้างสถานะลบ', weakness: 'ดาเมจน้อยมาก ต้องอยู่ใกล้ทีม',
      colors: { body: '#e0e0e0', accent: '#d32f2f', hair: '#4e342e' },
      skills: [
        { name: 'ผ้าพันแผล', icon: 'bandage', cd: 6, ai: 'lowAlly', aiRange: 150,
          desc: 'ฮีลต่อเนื่องเพื่อนที่เลือดน้อยสุด 2 วินาที',
          fx: [{ k: 'heal', who: 'lowest', r: 150, pct: 0.14, hot: 2 }] },
        { name: 'เต็นท์พยาบาล', icon: 'fieldtent', cd: 13, ai: 'allies', aiRange: 90,
          desc: 'วางพื้นที่ เพื่อนที่ยืนอยู่ฟื้นเลือดต่อเนื่อง 4 วินาที',
          fx: [{ k: 'zone', range: 30, r: 55, dur: 4, tick: 0.5, heal: 30, healAllies: true, nearSelf: true }] },
        { name: 'ช่วยชีวิตฉุกเฉิน', icon: 'rescue', cd: 62, ai: 'lowAllyCrit', aiRange: 170,
          desc: 'ฟื้นเลือดทันทีให้เพื่อนที่เลือดต่ำกว่า 30% และล้างสถานะลบ',
          fx: [{ k: 'heal', who: 'lowest', r: 180, pct: 0.45, hpBelow: 0.3, cleanse: true }] }
      ] },
    // ---------- ปัจจุบัน ----------
    { id: 'mae', name: 'แม่ค้าริมทาง', era: 3, role: 'support',
      passive: { id: 'mae', name: 'ค้าขายคล่อง', desc: 'รายได้ทอง +12% และได้ทองเพิ่ม 2 ต่อวินาที' }, skillMag: true, basicMag: false,
      strength: 'ฮีลและบัฟให้ทีม', weakness: 'ดาเมจต่ำ โดนจับก่อนเสมอ',
      colors: { body: '#ec407a', accent: '#fff59d', hair: '#4e342e' },
      skills: [
        { name: 'ข้าวห่อร้อน', icon: 'riceball', cd: 5, ai: 'lowAlly', aiRange: 150,
          desc: 'โยนฮีลเล็กน้อยให้เพื่อน 1 คน',
          fx: [{ k: 'heal', who: 'lowest', r: 150, flat: 200 }] },
        { name: 'หม้อก๋วยเตี๋ยว', icon: 'noodlepot', cd: 12, ai: 'allies', aiRange: 90,
          desc: 'วางพื้นที่ เพื่อนในพื้นที่ฟื้นเลือดต่อเนื่อง',
          fx: [{ k: 'zone', range: 40, r: 50, dur: 5, tick: 0.5, heal: 35, healAllies: true, nearSelf: true }] },
        { name: 'มื้อกลางวันของทีม', icon: 'feast', cd: 60, ai: 'lowAlly', aiRange: 130,
          desc: 'ฮีลคนใกล้ 5 วินาที และล้างสถานะลบ',
          fx: [{ k: 'heal', who: 'all', r: 130, pct: 0.22, hot: 5, cleanse: true }] }
      ] },
    { id: 'win', name: 'วินมอเตอร์ไซค์', era: 3, role: 'assassin',
      passive: { id: 'win', name: 'ซิ่งไม่ลดเกียร์', desc: 'วิ่งต่อเนื่องได้ความเร็วเพิ่มสูงสุด 15%' }, skillMag: false, basicMag: false,
      strength: 'เร็ว ชนแล้วถอยไว', weakness: 'เลือดต่ำ ดาเมจต่อครั้งน้อย',
      colors: { body: '#ff7043', accent: '#212121', hair: '#212121' },
      skills: [
        { name: 'บิดเร่ง', icon: 'throttle', cd: 7, ai: 'enemy', aiRange: 160,
          desc: 'พุ่งตรงไกล ชนศัตรูเบา ๆ ระหว่างทาง',
          fx: [{ k: 'dash', dist: 150, dmg: 100, toTarget: true, range: 170, w: 16 }] },
        { name: 'เลี้ยวหนี', icon: 'swerve', cd: 10, ai: 'escape', aiRange: 140,
          desc: 'เปลี่ยนทิศแล้วได้ความเร็วเพิ่มชั่วคราว',
          fx: [{ k: 'dash', dist: 55, dmg: 0, away: true }, { k: 'buff', who: 'self', dur: 2.5, speedMul: 1.35 }] },
        { name: 'ส่งด่วน', icon: 'rush', cd: 45, ai: 'ult', aiRange: 130,
          desc: 'พุ่ง 3 ครั้งต่อเนื่อง ผ่านศัตรูได้หลายคน',
          fx: [{ k: 'dash', dist: 110, dmg: 130, toTarget: true, range: 140, repeat: 3, gap: 0.3, w: 16 }] }
      ] },
    { id: 'chang', name: 'ช่างไฟนักประดิษฐ์', era: 3, role: 'mage',
      passive: { id: 'chang', name: 'ไฟช็อตสะสม', desc: 'สกิลโดนเป้าเดิม 3 ครั้งใน 5 วินาที ระเบิดช็อตดาเมจเวทและมึน 0.4 วินาที' }, skillMag: true, basicMag: true,
      strength: 'ดาเมจลูกโซ่ วางอุปกรณ์ล่วงหน้า', weakness: 'อุปกรณ์ถูกทำลายได้ เลือดต่ำ',
      colors: { body: '#fdd835', accent: '#455a64', hair: '#263238' },
      skills: [
        { name: 'ประกายไฟ', icon: 'sparks', cd: 5, ai: 'enemy', aiRange: 140,
          desc: 'ไฟฟ้ากระโดดต่อกัน 3 เป้า',
          fx: [{ k: 'chain', range: 150, n: 3, dmg: 125, jump: 70 }] },
        { name: 'หม้อแปลงตั้งพื้น', icon: 'transformer', cd: 14, ai: 'enemy', aiRange: 120,
          desc: 'วางอุปกรณ์ 8 วินาที ยิงศัตรูที่เข้าใกล้',
          fx: [{ k: 'zone', range: 80, r: 70, dur: 8, tick: 0.6, dmg: 45, single: true, turret: true }] },
        { name: 'ไฟดับทั้งซอย', icon: 'blackout', cd: 55, ai: 'ult', aiRange: 150,
          desc: 'พื้นที่ใหญ่ ศัตรูเห็นไม่ชัดและช้าลง 3 วินาที',
          fx: [{ k: 'zone', range: 150, r: 90, dur: 3, tick: 0.25, slow: 0.35, dmg: 8, blind: true }] }
      ] },
    { id: 'traffic', name: 'ตำรวจจราจร', era: 3, role: 'tank',
      passive: { id: 'traffic', name: 'ใบสั่งชะลอ', desc: 'ตีปกติทำให้เป้าวิ่งช้าลง 10% นาน 1.5 วินาที' }, skillMag: false, basicMag: false,
      strength: 'คุมจังหวะ ชะลอศัตรูเป็นกลุ่ม', weakness: 'ดาเมจต่ำ พึ่งทีมช่วยปิดเกม',
      colors: { body: '#1565c0', accent: '#fff176', hair: '#212121' },
      skills: [
        { name: 'ยกมือหยุด', icon: 'stopsign', cd: 10, ai: 'enemy', aiRange: 90,
          desc: 'วางพื้นที่หน้าตัว หน่วงศัตรูที่เข้ามา 2 วินาที',
          fx: [{ k: 'zone', range: 60, r: 52, dur: 2, tick: 0.25, slow: 0.5, nearSelf: true }] },
        { name: 'กระบองจราจร', icon: 'baton', cd: 8, ai: 'enemy', aiRange: 120,
          desc: 'พุ่งสั้นฟาดกระบองใส่ ผลักศัตรูออกไป',
          fx: [{ k: 'dash', dist: 90, dmg: 85, toTarget: true, stop: 22, range: 120, push: 30, w: 16 }] },
        { name: 'ปิดถนน', icon: 'roadblock', cd: 52, ai: 'ult', aiRange: 110,
          desc: 'ระเบิดพื้นที่รอบตัว ศัตรูมึนสั้น ๆ และช้าลง',
          fx: [{ k: 'nova', r: 120, dmg: 190, stun: 0.5, slow: [0.45, 3] }] }
      ] },
    { id: 'press', name: 'ช่างภาพข่าว', era: 3, role: 'marksman',
      passive: { id: 'press', name: 'แฟลชสะกดตา', desc: 'ตีปกติครั้งที่ 4 ของทุกชุดทำให้เป้าตาพร่า 1 วินาที' }, skillMag: false, basicMag: false,
      strength: 'ทำให้ศัตรูพลาด ปักเป้าทำดาเมจไกล', weakness: 'เปราะ ต้องมีแนวหน้าคุม',
      colors: { body: '#455a64', accent: '#ffca28', hair: '#212121' },
      skills: [
        { name: 'แฟลชวาบ', icon: 'flashbulb', cd: 8, ai: 'enemy', aiRange: 160,
          desc: 'แสงแฟลชระเบิดวงเล็ก ศัตรูมึนสั้น ๆ',
          fx: [{ k: 'blast', range: 170, r: 36, delay: 0.25, dmg: 90, stun: 0.4 }] },
        { name: 'ซูมโฟกัส', icon: 'zoomlens', cd: 6, ai: 'enemy', aiRange: 240,
          desc: 'ยิงไกลมาก ถ้ายืนนิ่งก่อนยิงแรงขึ้น',
          fx: [{ k: 'shot', range: 280, speed: 420, w: 5, dmg: 165, stillMul: 1.25 }] },
        { name: 'ข่าวด่วน', icon: 'breaking', cd: 46, ai: 'ult', aiRange: 180,
          desc: 'เล็งเป้าฮีโร่ศัตรูรอบตัวให้รับดาเมจเพิ่ม และยิงกระสุนกระจายเป็นกรวย',
          fx: [{ k: 'mark', range: 220, mul: 1.12, dur: 5 }, { k: 'cone', range: 190, n: 6, spread: 40, dmg: 90, speed: 320 }] }
      ] },
  ];

  TR.HERO_BY_ID = {};
  TR.HEROES.forEach(function (h) { TR.HERO_BY_ID[h.id] = h; });


  /* สเปลเสริม (เลือก 1 อย่างก่อนเริ่มแมตช์ กด F หรือแตะปุ่ม) และการกลับพระนคร (กด C)
     ค่าทุกตัวแก้ที่นี่ ไม่ฝังในโค้ด */
  // พุ่มไม้ (ฝั่งซ้าย แล้วสะท้อนไปฝั่งขวาอัตโนมัติ) แถวทางเข้าป่าและข้างเลนกลาง
  // ระดับความยากของบอทฝั่งศัตรู (บอทเพื่อนเล่นระดับปกติเสมอ)
  TR.DIFFS = {
    easy:   { name: 'ง่าย',  think: 1.8, dmg: 0.88, gold: 0.85, note: 'บอทคิดช้า ตีเบากว่า ได้ทองน้อยกว่า' },
    normal: { name: 'ปกติ',  think: 1,   dmg: 1,    gold: 1,    note: 'ระดับที่ใช้ปรับสมดุล' },
    hard:   { name: 'ยาก',   think: 0.6, dmg: 1.08, gold: 1.15, note: 'บอทตอบสนองไว ตีแรงกว่า ได้ทองมากกว่า' }
  };
  // ลำดับฮีโร่ที่บอทอยากแบน (ใส่ id ฮีโร่) ว่างไว้ = บอทแบนแบบสุ่ม รอใส่หลังปรับสมดุล
  TR.BOT_BANS = [];
  TR.BUSHES = (function () {
    const W = 3200, H = 1200, L = [
      { x: 965, y: 395, r: 50 }, { x: 1180, y: 395, r: 44 }, { x: 965, y: 300, r: 40 }, { x: 1050, y: 455, r: 46 },
      { x: 965, y: 805, r: 50 }, { x: 1180, y: 805, r: 44 }, { x: 965, y: 900, r: 40 }, { x: 1050, y: 745, r: 46 }
    ], out = [];
    L.forEach(function (b) { out.push(b); out.push({ x: W - b.x, y: b.y, r: b.r }); });
    out.push({ x: 1600, y: 540, r: 46 }); out.push({ x: 1600, y: 660, r: 46 });
    out.forEach(function (b, i) { b.i = i; });
    return out;
  })();

  TR.SPELLS = [
    { id: 'heal',    name: 'ยาทิพย์',         icon: '🧪', cd: 100, desc: 'ฟื้นเลือดตัวเอง 25% และเพื่อนใกล้ ๆ 12%', self: 0.25, ally: 0.12, r: 140 },
    { id: 'punish',  name: 'ฟาดป่า',          icon: '⚡', cd: 45,  desc: 'ดาเมจแรงใส่มอนป่า/มินเนียนใกล้ตัว 700 (+40 ต่อเลเวล) เหมาะตีบอสและมอนบัฟ', dmg: 700, perLv: 40, r: 120 },
    { id: 'flash',   name: 'เหินฟ้า',         icon: '💨', cd: 100, desc: 'พุ่งไปข้างหน้าทันทีตามทิศที่หันอยู่', dist: 150 },
    { id: 'sprint',  name: 'ลมปราณ',          icon: '🌪️', cd: 70,  desc: 'วิ่งเร็วขึ้น 40% นาน 4 วินาที', mul: 1.4, dur: 4 },
    { id: 'purify',  name: 'ล้างอาถรรพ์',     icon: '🪷', cd: 80,  desc: 'ล้างสถานะเสียทั้งหมด และกันสถานะเสียต่อ 1.5 วินาที', dur: 1.5 },
    { id: 'barrier', name: 'ผ้ายันต์กำบัง',   icon: '🧿', cd: 90,  desc: 'โล่กันดาเมจ 15% ของเลือดสูงสุด (+120) นาน 2.5 วินาที', pct: 0.15, flat: 120, dur: 2.5 },
    { id: 'conch',   name: 'สังข์เสียงก้อง',  icon: '🐚', cd: 90,  desc: 'ศัตรูรอบตัวมึนงงสตัน 1 วินาที', r: 115, dur: 1 }
  ];
  // สัญญาณทีม: ปักหมุดที่จุดบนแมพหรือแชทด่วน บอทเพื่อนจะทำตามช่วงสั้น ๆ
  TR.SIGNALS = {
    go:      { icon: '⚔️', name: 'ไปบุกที่นี่', color: '#ffb300', dur: 20, reply: 'ไปเลย!' },
    group:   { icon: '🤝', name: 'รวมกันที่นี่', color: '#4dd0e1', dur: 18, reply: 'กำลังไปรวม' },
    danger:  { icon: '⚠️', name: 'ระวัง!', color: '#ef5350', dur: 8, reply: 'รับทราบ ระวังอยู่' },
    retreat: { icon: '🏃', name: 'ถอยก่อน', color: '#fdd835', dur: 12, reply: 'ถอยก่อนก็ได้' },
    defend:  { icon: '🛡️', name: 'ป้องกันฐาน', color: '#66bb6a', dur: 25, reply: 'กลับไปป้องกัน' }
  };
  TR.SPELL_BY_ID = {}; TR.SPELLS.forEach(function (sp) { TR.SPELL_BY_ID[sp.id] = sp; });
  TR.RECALL = { name: 'กลับพระนคร', icon: '🏯', time: 6 };   // ร่ายค้าง (วินาที) ถูกขัดเมื่อโดนตี โดนสตัน ขยับ หรือใช้สกิล

  /* ร้านค้าไอเทม — ค่าสมดุลทั้งหมดอยู่ตรงนี้
     14 สาย × 3 ชั้น (42 ชิ้น): ชั้นบนประกอบจากชั้นล่างของสายเดียวกัน (ถ้ามีชั้นล่างอยู่แล้ว หักราคาชิ้นนั้นออก และใช้ช่องเดิม)
     s: hp/dmg/atkSpd/speed/tower = เปอร์เซ็นต์เพิ่ม (0.1 = +10%), armor = ลดดาเมจที่ได้รับ (0.1 = ลด 10%), ls = ดูดเลือด, crit = โอกาสคริ (x1.6), pen = ทะลวงเกราะ, regen = ฟื้นเลือด/วินาที, cdr = ลดคูลดาวน์สกิล, jungle = ดาเมจใส่มอนป่า, gold = ทองที่ได้
     ค่าใน s เป็นค่าสะสมของชิ้นนั้น (ชั้นบนรวมของชั้นล่างไว้แล้ว) */
  TR.ITEM_LINES = [
    { id: 'atk', name: 'โจมตี', icon: '🗡️' },
    { id: 'spd', name: 'ตีเร็ว', icon: '🏹' },
    { id: 'crit', name: 'คมสังหาร', icon: '🎯' },
    { id: 'pen', name: 'ทะลวงเกราะ', icon: '🔱' },
    { id: 'vamp', name: 'ดูดเลือด', icon: '🦷' },
    { id: 'def', name: 'ป้องกัน', icon: '🛡️' },
    { id: 'wall', name: 'กำแพงเมือง', icon: '🧱' },
    { id: 'life', name: 'ชีวิต', icon: '📿' },
    { id: 'regen', name: 'ฟื้นฟู', icon: '🌿' },
    { id: 'move', name: 'เคลื่อนที่', icon: '👟' },
    { id: 'cdr', name: 'มนตรา', icon: '📜' },
    { id: 'siege', name: 'ทลายค่าย', icon: '🔨' },
    { id: 'jungle', name: 'ล่าป่า', icon: '🌲' },
    { id: 'gold', name: 'ทรัพย์', icon: '💰' },
    { id: 'mpen', name: 'ทะลวงเวท', icon: '🔮' },
    { id: 'ward', name: 'ต้านเวท', icon: '🧿' }
  ];
  TR.ITEMS = [
    { id: 'atk1', line: 'atk', tier: 1, name: 'ดาบเหล็กไหล', icon: '🗡️', cost: 450, s: { dmg: 0.07 } },
    { id: 'atk2', line: 'atk', tier: 2, name: 'ดาบทมิฬ', icon: '🗡️', cost: 1050, s: { dmg: 0.15 } },
    { id: 'atk3', line: 'atk', tier: 3, name: 'ดาบพิฆาตศึก', icon: '⚔️', cost: 1900, s: { dmg: 0.26 } },
    { id: 'spd1', line: 'spd', tier: 1, name: 'สายธนูเอ็นวัว', icon: '🏹', cost: 450, s: { atkSpd: 0.1 } },
    { id: 'spd2', line: 'spd', tier: 2, name: 'ธนูไม้ประดู่', icon: '🏹', cost: 1000, s: { atkSpd: 0.2, dmg: 0.03 } },
    { id: 'spd3', line: 'spd', tier: 3, name: 'ศรสุริยัน', icon: '☀️', cost: 1800, s: { atkSpd: 0.32, dmg: 0.06 } },
    { id: 'crit1', line: 'crit', tier: 1, name: 'มีดหมอพราน', icon: '🔪', cost: 450, s: { crit: 0.1 } },
    { id: 'crit2', line: 'crit', tier: 2, name: 'กฤชแทงใจ', icon: '🗡️', cost: 1050, s: { crit: 0.18, dmg: 0.04 } },
    { id: 'crit3', line: 'crit', tier: 3, name: 'กฤชมรณะ', icon: '🎯', cost: 1850, s: { crit: 0.28, dmg: 0.06 } },
    { id: 'pen1', line: 'pen', tier: 1, name: 'หอกซัดเจาะเกราะ', icon: '🔱', cost: 450, s: { pen: 0.05 } },
    { id: 'pen2', line: 'pen', tier: 2, name: 'ง้าวทะลวงเกราะ', icon: '🪓', cost: 1050, s: { pen: 0.1, dmg: 0.03 } },
    { id: 'pen3', line: 'pen', tier: 3, name: 'ตรีศูลทลายเกราะ', icon: '🔱', cost: 1850, s: { pen: 0.16, dmg: 0.06 } },
    { id: 'vamp1', line: 'vamp', tier: 1, name: 'เขี้ยวเสือ', icon: '🦷', cost: 450, s: { ls: 0.06, dmg: 0.02 } },
    { id: 'vamp2', line: 'vamp', tier: 2, name: 'เล็บกระทิงแดง', icon: '🩸', cost: 1000, s: { ls: 0.11, dmg: 0.04 } },
    { id: 'vamp3', line: 'vamp', tier: 3, name: 'เขี้ยวนาคา', icon: '🐉', cost: 1800, s: { ls: 0.17, dmg: 0.06 } },
    { id: 'def1', line: 'def', tier: 1, name: 'เกราะหนังช้าง', icon: '🛡️', cost: 450, s: { armor: 0.06, hp: 0.04 } },
    { id: 'def2', line: 'def', tier: 2, name: 'เกราะเกล็ดมังกร', icon: '🛡️', cost: 1050, s: { armor: 0.12, hp: 0.1 } },
    { id: 'def3', line: 'def', tier: 3, name: 'เกราะวชิรา', icon: '🔰', cost: 1900, s: { armor: 0.18, hp: 0.18 } },
    { id: 'wall1', line: 'wall', tier: 1, name: 'โล่ไม้สัก', icon: '🪵', cost: 450, s: { hp: 0.12, armor: 0.02 } },
    { id: 'wall2', line: 'wall', tier: 2, name: 'โล่เหล็กกล้า', icon: '🛡️', cost: 1000, s: { hp: 0.22, armor: 0.04 } },
    { id: 'wall3', line: 'wall', tier: 3, name: 'ปราการวัดพระแก้ว', icon: '🏯', cost: 1800, s: { hp: 0.34, armor: 0.06 } },
    { id: 'life1', line: 'life', tier: 1, name: 'ผ้ายันต์ใจเพชร', icon: '📿', cost: 450, s: { hp: 0.1 } },
    { id: 'life2', line: 'life', tier: 2, name: 'ตะกรุดดูดเลือด', icon: '🩸', cost: 1000, s: { hp: 0.14, ls: 0.06 } },
    { id: 'life3', line: 'life', tier: 3, name: 'ยันต์ราชสีห์', icon: '🦁', cost: 1850, s: { hp: 0.2, ls: 0.1 } },
    { id: 'regen1', line: 'regen', tier: 1, name: 'สมุนไพรบำรุง', icon: '🌿', cost: 450, s: { regen: 0.004, hp: 0.04 } },
    { id: 'regen2', line: 'regen', tier: 2, name: 'ยาหม้อใหญ่', icon: '🍵', cost: 1000, s: { regen: 0.008, hp: 0.08 } },
    { id: 'regen3', line: 'regen', tier: 3, name: 'น้ำอมฤต', icon: '💧', cost: 1800, s: { regen: 0.013, hp: 0.12 } },
    { id: 'move1', line: 'move', tier: 1, name: 'รองเท้าสายลม', icon: '👟', cost: 400, s: { speed: 0.06 } },
    { id: 'move2', line: 'move', tier: 2, name: 'รองเท้าพญาครุฑ', icon: '🥾', cost: 900, s: { speed: 0.1, hp: 0.05 } },
    { id: 'move3', line: 'move', tier: 3, name: 'ฉลองพระบาทเทพ', icon: '🪽', cost: 1500, s: { speed: 0.14, hp: 0.08, atkSpd: 0.05 } },
    { id: 'cdr1', line: 'cdr', tier: 1, name: 'คัมภีร์มนตรา', icon: '📜', cost: 450, s: { cdr: 0.08, dmg: 0.02 } },
    { id: 'cdr2', line: 'cdr', tier: 2, name: 'ตำราวิเศษ', icon: '📖', cost: 1050, s: { cdr: 0.14, dmg: 0.04 } },
    { id: 'cdr3', line: 'cdr', tier: 3, name: 'พระคัมภีร์ไตรเพท', icon: '📚', cost: 1850, s: { cdr: 0.2, dmg: 0.06 } },
    { id: 'siege1', line: 'siege', tier: 1, name: 'ค้อนทลายค่าย', icon: '🔨', cost: 450, s: { tower: 0.2 } },
    { id: 'siege2', line: 'siege', tier: 2, name: 'ขวานพังประตู', icon: '🪓', cost: 1000, s: { tower: 0.4, dmg: 0.04 } },
    { id: 'siege3', line: 'siege', tier: 3, name: 'ปืนใหญ่ทลายเมือง', icon: '💥', cost: 1800, s: { tower: 0.65, dmg: 0.08 } },
    { id: 'jungle1', line: 'jungle', tier: 1, name: 'มีดพรานป่า', icon: '🔪', cost: 450, s: { jungle: 0.25 } },
    { id: 'jungle2', line: 'jungle', tier: 2, name: 'ธนูล่าสัตว์', icon: '🏹', cost: 1000, s: { jungle: 0.5, speed: 0.03 } },
    { id: 'jungle3', line: 'jungle', tier: 3, name: 'เขี้ยวพญาเสือ', icon: '🐯', cost: 1750, s: { jungle: 0.8, dmg: 0.05 } },
    { id: 'gold1', line: 'gold', tier: 1, name: 'ถุงเงินพ่อค้า', icon: '👝', cost: 400, s: { gold: 0.05 } },
    { id: 'gold2', line: 'gold', tier: 2, name: 'ตะกร้าทองคำ', icon: '🧺', cost: 900, s: { gold: 0.1, hp: 0.04 } },
    { id: 'gold3', line: 'gold', tier: 3, name: 'ขุมทรัพย์เศรษฐี', icon: '🏺', cost: 1500, s: { gold: 0.16, hp: 0.08 } },
    { id: 'mpen1', line: 'mpen', tier: 1, name: 'ลูกแก้วเลือนราง', icon: '🔮', cost: 450, s: { mpen: 0.05, dmg: 0.02 } },
    { id: 'mpen2', line: 'mpen', tier: 2, name: 'ผลึกทะลวงมนตรา', icon: '💎', cost: 1050, s: { mpen: 0.1, dmg: 0.04 } },
    { id: 'mpen3', line: 'mpen', tier: 3, name: 'แก้วจินดามณี', icon: '🔮', cost: 1850, s: { mpen: 0.16, dmg: 0.07 } },
    { id: 'ward1', line: 'ward', tier: 1, name: 'ผ้าประเจียด', icon: '🧣', cost: 450, s: { mres: 0.06, hp: 0.04 } },
    { id: 'ward2', line: 'ward', tier: 2, name: 'ตะกรุดต้านเวท', icon: '🧿', cost: 1000, s: { mres: 0.12, hp: 0.08 } },
    { id: 'ward3', line: 'ward', tier: 3, name: 'พระเครื่องกันคุณไสย', icon: '📿', cost: 1800, s: { mres: 0.2, hp: 0.12 } }
  ];
  TR.ITEM_STATS = ['dmg', 'atkSpd', 'crit', 'pen', 'mpen', 'armor', 'mres', 'hp', 'ls', 'regen', 'speed', 'cdr', 'tower', 'jungle', 'gold'];

  // พลังแฝง (passive) และไอเทมใช้งาน (active) ของไอเทมชั้น 3 — sim.js อ่านจาก u.itmFx
  TR.ITEM_FX = {
    atk3:   { passive: 'พิฆาต', desc: 'ตีปกติใส่เป้าที่เลือดต่ำกว่า 30% ดาเมจเพิ่ม 25%' },
    spd3:   { passive: 'แสงสุริยัน', desc: 'ตีปกติโดน ชะลอเป้า 15% นาน 1.5 วินาที' },
    crit3:  { passive: 'คมกริบ', desc: 'ติดคริเพิ่มดาเมจคริอีก 30%' },
    pen3:   { passive: 'ฉีกเกราะ', desc: 'ตีปกติโดน ลดเกราะเป้า 3% ซ้อนได้ 5 ชั้น นาน 4 วินาที' },
    vamp3:  { passive: 'อิ่มเลือด', desc: 'ปราบฮีโร่ศัตรู ฟื้นเลือด 12% ของเลือดสูงสุด' },
    def3:   { active: 'ยันต์กันภัย', cd: 60, desc: 'กดใช้: เกราะกั้น 18% ของเลือดสูงสุด 3 วินาที', icon: '🔰' },
    wall3:  { passive: 'ปราการสะท้อน', desc: 'สะท้อน 10% ของดาเมจจากการตีปกติที่โดนกลับไปหาผู้ตี' },
    life3:  { passive: 'ชีวิตที่สอง', cd: 180, desc: 'โดนดาเมจตายครั้งแรก รอดด้วยเลือด 25% และอมตะ 1.5 วินาที (คูลดาวน์ 180 วินาที)' },
    regen3: { active: 'น้ำอมฤต', cd: 90, desc: 'กดใช้: ฟื้นเลือด 35% ของเลือดสูงสุดใน 4 วินาที', icon: '💧' },
    move3:  { active: 'เหินเวหา', cd: 60, desc: 'กดใช้: วิ่งเร็วขึ้น 45% นาน 3 วินาที และไม่ติดชะลอ', icon: '🪽' },
    cdr3:   { passive: 'คาถาแฝงดาบ', desc: 'ใช้สกิลแล้ว ตีปกติครั้งถัดไป (ภายใน 4 วินาที) เพิ่มดาเมจเวท 80' },
    siege3: { passive: 'ลูกปืนกระจาย', desc: 'ตีปกติใส่ลูกกระจ๊อก ระเบิดกระจาย 40% ให้ลูกกระจ๊อกรอบข้าง' },
    jungle3:{ passive: 'ล่าสดใหม่', desc: 'ปราบมอนป่า ฟื้นเลือด 12% และได้ทองเพิ่ม 40' },
    gold3:  { passive: 'เศรษฐีนุ่งขาว', desc: 'ปราบลูกกระจ๊อกได้ทองเพิ่ม 8' },
    mpen3:  { passive: 'ทลายมนตรา', desc: 'สกิลโดนศัตรู ชะลอ 12% นาน 1 วินาที' },
    ward3:  { active: 'ล้างคุณไสย', cd: 70, desc: 'กดใช้: ล้างสถานะคุม และลดดาเมจเวทที่ได้รับ 50% นาน 2.5 วินาที', icon: '🧿' }
  };
  TR.ITEM_BY_ID = {};
  TR.ITEMS.forEach(function (it) { TR.ITEM_BY_ID[it.id] = it; });
  /* ไอเทมประจำยุค: ปลดล็อกเมื่อเกมเข้ายุคนั้น ประกอบจากชิ้นย่อย (recipe) — ถือชิ้นย่อยอยู่จะหักราคาและชิ้นย่อยถูกใช้ไป
     recipe = ชิ้นย่อยที่นับ (ถือชิ้นสายเดียวกันที่ชั้นเท่ากันหรือสูงกว่าก็นับ) · roles = บทบาทที่บอทจะซื้อ
     พลังแฝง/ใช้งาน: ค่าตัวเลขอยู่ใน TR.ITEM_FX (ด้านล่าง) */
  TR.ERA_ITEMS = [
    { id: 'e0a', line: 'e0a', tier: 3, era: 0, name: 'ดาบพ่อขุนรามฯ', icon: '⚔️', cost: 2200, recipe: ['atk2', 'crit1'], roles: ['fighter', 'assassin', 'marksman'], s: { dmg: 0.17, crit: 0.1 } },
    { id: 'e0b', line: 'e0b', tier: 3, era: 0, name: 'ระฆังไล่ภัย', icon: '🔔', cost: 1900, recipe: ['move2', 'ward1'], roles: ['tank', 'support', 'mage'], s: { speed: 0.1, mres: 0.08, hp: 0.06 } },
    { id: 'e0c', line: 'e0c', tier: 3, era: 0, name: 'หม้อยาพ่อขุน', icon: '🍲', cost: 1900, recipe: ['regen2', 'life1'], roles: ['tank', 'fighter', 'support'], s: { hp: 0.16, regen: 0.01 } },
    { id: 'e1a', line: 'e1a', tier: 3, era: 1, name: 'หอกกุนไชย', icon: '🔱', cost: 2500, recipe: ['pen2', 'atk2'], roles: ['marksman', 'fighter', 'assassin'], s: { dmg: 0.12, pen: 0.12 } },
    { id: 'e1b', line: 'e1b', tier: 3, era: 1, name: 'เกราะพญาช้าง', icon: '🐘', cost: 2400, recipe: ['def2', 'wall2'], roles: ['tank', 'fighter'], s: { hp: 0.24, armor: 0.1 } },
    { id: 'e1c', line: 'e1c', tier: 3, era: 1, name: 'ตำราพิชัยสงคราม', icon: '📜', cost: 2100, recipe: ['cdr2', 'mpen1'], roles: ['mage', 'support', 'assassin'], s: { cdr: 0.15, dmg: 0.06, mpen: 0.08 } },
    { id: 'e2a', line: 'e2a', tier: 3, era: 2, name: 'ปืนไรเฟิลสนาม', icon: '🔫', cost: 2500, recipe: ['spd2', 'crit2'], roles: ['marksman', 'assassin'], s: { atkSpd: 0.2, crit: 0.14, dmg: 0.05 } },
    { id: 'e2b', line: 'e2b', tier: 3, era: 2, name: 'เสื้อเกราะกันกระสุน', icon: '🦺', cost: 2300, recipe: ['def2', 'regen2'], roles: ['tank', 'fighter'], s: { armor: 0.14, hp: 0.12 } },
    { id: 'e2c', line: 'e2c', tier: 3, era: 2, name: 'วิทยุสนาม', icon: '📻', cost: 1900, recipe: ['move2', 'cdr1'], roles: ['support', 'tank', 'assassin'], s: { speed: 0.1, cdr: 0.08, hp: 0.06 } },
    { id: 'e3a', line: 'e3a', tier: 3, era: 3, name: 'สมาร์ตโฟน', icon: '📱', cost: 2000, recipe: ['cdr2', 'gold1'], roles: ['marksman', 'mage', 'fighter'], s: { cdr: 0.12, gold: 0.08, dmg: 0.05 } },
    { id: 'e3b', line: 'e3b', tier: 3, era: 3, name: 'เครื่องกระตุกหัวใจ', icon: '🫀', cost: 2400, recipe: ['life2', 'regen2'], roles: ['tank', 'support', 'fighter'], s: { hp: 0.22, regen: 0.01 } },
    { id: 'e3c', line: 'e3c', tier: 3, era: 3, name: 'พาวเวอร์แบงก์', icon: '🔋', cost: 2300, recipe: ['spd2', 'mpen2'], roles: ['mage', 'marksman', 'assassin'], s: { atkSpd: 0.12, mpen: 0.1, dmg: 0.06 } }
  ];
  TR.ITEM_FX_ERA = {
    e0a: { passive: 'พ่อขุนผู้ยุติธรรม', heal: 0.015, desc: 'ตีปกติโดนฮีโร่ศัตรู ฟื้นเลือด 1.5% ของเลือดสูงสุด' },
    e0b: { active: 'เสียงระฆังสุโขทัย', cd: 75, r: 130, slow: 0.4, dur: 2, icon: '🔔', desc: 'กดใช้: ฮีโร่ศัตรูรอบตัว (ระยะ 130) ชะลอ 40% นาน 2 วินาที' },
    e0c: { passive: 'อาหารทิพย์', heal: 0.025, desc: 'ปราบลูกกระจ๊อก ฟื้นเลือด 2.5% ของเลือดสูงสุด' },
    e1a: { passive: 'ล่าเหยื่อติดกับ', amp: 0.2, desc: 'ตีปกติใส่เป้าที่ถูกชะลอ ตรึง หรือสตัน ดาเมจเพิ่ม 20%' },
    e1b: { active: 'ตั้งรับบนหลังช้าง', cd: 70, shield: 0.22, dur: 3, icon: '🐘', desc: 'กดใช้: ล้างสถานะเสีย และเกราะกั้น 22% ของเลือดสูงสุด 3 วินาที' },
    e1c: { passive: 'ยุทธวิธี', heal: 0.03, desc: 'ใช้สกิลแต่ละครั้ง ฟื้นเลือด 3% ของเลือดสูงสุด' },
    e2a: { passive: 'พลซุ่มยิง', amp: 0.2, desc: 'ตีปกติขณะอยู่ในพุ่มไม้ ดาเมจเพิ่ม 20%' },
    e2b: { passive: 'ผ้าพันแผลสนาม', cd: 60, below: 0.35, shield: 0.15, desc: 'เลือดต่ำกว่า 35% ได้เกราะ 15% ของเลือดสูงสุด 3 วินาที (คูลดาวน์ 60 วินาที)' },
    e2c: { active: 'เรียกระดมพล', cd: 80, r: 320, speed: 1.25, dur: 3, icon: '📻', desc: 'กดใช้: ตัวเองและเพื่อนในระยะ 320 วิ่งเร็วขึ้น 25% นาน 3 วินาที' },
    e3a: { active: 'บูสต์ 5G', cd: 85, atkSpd: 1.45, dur: 4, icon: '📱', desc: 'กดใช้: ตีเร็วขึ้น 45% นาน 4 วินาที' },
    e3b: { active: 'ปั๊มหัวใจ', cd: 120, heal: 0.5, dur: 3, icon: '🫀', desc: 'กดใช้: ฟื้นเลือด 50% ของเลือดสูงสุดใน 3 วินาที' },
    e3c: { passive: 'ไฟสถิต', cd: 0.3, desc: 'ตีปกติโดนฮีโร่ศัตรู ลดคูลดาวน์สกิลทุกอัน 0.3 วินาที' }
  };
  TR.ERA_ITEMS.forEach(function (it) { TR.ITEM_FX[it.id] = TR.ITEM_FX_ERA[it.id]; });
  TR.ERA_ITEMS.forEach(function (it) { TR.ITEM_BY_ID[it.id] = it; });
  TR.itemAt = function (line, tier) { for (let i = 0; i < TR.ITEMS.length; i++) if (TR.ITEMS[i].line === line && TR.ITEMS[i].tier === tier) return TR.ITEMS[i]; return null; };
  // คำอธิบายสร้างจากค่าใน s (ไม่ต้องเขียนซ้ำ)
  TR.itemDesc = function (it) {
    const L = { mpen: 'ทะลวงเวท', mres: 'ต้านเวท', dmg: 'ดาเมจ', atkSpd: 'ตีเร็ว', hp: 'เลือด', speed: 'วิ่งเร็ว', tower: 'ดาเมจใส่ป้อม', armor: 'ลดดาเมจรับ', ls: 'ดูดเลือด', crit: 'โอกาสคริติคอล', pen: 'ทะลวงเกราะ', regen: 'ฟื้นเลือด/วิ', cdr: 'ลดคูลดาวน์', jungle: 'ดาเมจใส่มอนป่า', gold: 'ทองที่ได้' }, out = [];
    TR.ITEM_STATS.forEach(function (k) { if (it.s[k]) out.push(L[k] + ' +' + (k === 'regen' ? (it.s[k] * 100).toFixed(1) : Math.round(it.s[k] * 100)) + '%'); });
    const fx = TR.ITEM_FX[it.id];
    if (it.recipe) out.push('🏯 ประจำยุค' + TR.ERAS[it.era].name + ' · ประกอบจาก ' + it.recipe.map(function (r) { return TR.ITEM_BY_ID[r].name; }).join(' + '));
    if (fx) out.push((fx.active ? '⚡ ใช้งาน ' + fx.active + ' (คูลดาวน์ ' + fx.cd + ' วิ)' : '✦ ' + fx.passive) + ': ' + fx.desc);
    return out.join(' · ');
  };
  // ลำดับสายที่บอทเก็บตามบทบาท (เก็บทีละสายจนครบชั้น 3 ถึงขยับไปสายถัดไป)
  TR.ITEM_BUILD = {
    tank:     ['def', 'wall', 'move', 'regen', 'cdr', 'ward', 'siege', 'life', 'atk', 'vamp', 'spd', 'crit', 'pen', 'mpen', 'jungle', 'gold'],
    fighter:  ['atk', 'vamp', 'siege', 'move', 'def', 'ward', 'crit', 'life', 'pen', 'spd', 'wall', 'cdr', 'regen', 'mpen', 'jungle', 'gold'],
    assassin: ['move', 'crit', 'siege', 'pen', 'atk', 'vamp', 'life', 'spd', 'def', 'ward', 'cdr', 'wall', 'regen', 'mpen', 'jungle', 'gold'],
    marksman: ['spd', 'crit', 'siege', 'move', 'pen', 'vamp', 'atk', 'life', 'def', 'ward', 'cdr', 'wall', 'regen', 'mpen', 'jungle', 'gold'],
    mage:     ['cdr', 'mpen', 'atk', 'move', 'life', 'ward', 'siege', 'def', 'regen', 'vamp', 'spd', 'crit', 'pen', 'wall', 'jungle', 'gold'],
    support:  ['move', 'regen', 'cdr', 'def', 'ward', 'life', 'siege', 'wall', 'atk', 'vamp', 'spd', 'crit', 'pen', 'mpen', 'jungle', 'gold']
  };
  TR.ITEM_BUILD_JUNGLE = ['jungle', 'move', 'atk', 'vamp', 'life', 'siege', 'def', 'ward', 'crit', 'pen', 'cdr', 'regen', 'wall', 'spd', 'mpen', 'gold'];

  /* ประวัติอัปเดต — กล่องข้อความอัปเดตในเกมอ่านจากที่นี่
     ทุกครั้งที่อัปเดตเกม: เพิ่มรายการใหม่ไว้บนสุด และแก้ TR.VERSION ให้ตรงกัน
     ผู้เล่นที่ยังไม่เคยเห็นเวอร์ชันนั้นจะเห็นกล่องอัปเดตขึ้นเองตอนเปิดเกม */
  TR.CHANGELOG = [
    {
      version: '0.27.1',
      date: '2026-10-22',
      title: 'ลดเลือดป้อมให้สมดุลกับดาเมจใหม่',
      items: [
        'ป้อมเจ็บขึ้นแล้ว จึงลดเลือดป้อมลงราว 15% (ค่ายไม้ 680 · ด่านหน้า 1050 · ค่ายกลาง 1300 · ราชธานี 1950) ให้ทีมที่รวมกลุ่มกันดันพังได้ ไม่ทำให้เกมยืดยาว',
        'ทดสอบด้วยบอท 24 แมตช์: เวลาเฉลี่ย 15.7 นาที ซ้ายชนะ 13 ขวาชนะ 11'
      ]
    },
    {
      version: '0.27.0',
      date: '2026-10-22',
      title: 'ป้อมน่ากลัวขึ้น: ดาเมจฐาน + % เลือดฮีโร่',
      items: [
        'ป้อมยิงใส่ฮีโร่ = ดาเมจฐาน + % ของเลือดสูงสุดฮีโร่ (ไม่สนเกราะเหมือนเดิม): สุโขทัย 90+7.5% · อยุธยา 140+11% (ระเบิดหมู่) · ยุคสงคราม 24+1.25%/นัด (ปืนกลรัว) · ปัจจุบัน 60+5% — ดาเมจต่อวินาทีใกล้เคียงกันทุกยุค แค่ต่างจังหวะยิง',
        'ยิงฮีโร่คนเดิมติดกันดาเมจเพิ่มขึ้นเรื่อย ๆ (ยืนใต้ป้อมนาน ๆ เสี่ยงตาย) เปลี่ยนเป้าหรือหยุด 3 วินาทีแล้วรีเซ็ต',
        'ใส่ลูกกระจ๊อกยังโดนดาเมจเท่าเดิม การดันเลนตามเวฟไม่ยากขึ้น แต่ดำน้ำป้อมโดยไม่มีมินเนียนเจ็บกว่าเดิมมาก',
        'แก้บัฟ "ฐานปืนใหญ่ร้าง" ที่ตั้งใจให้ป้อมแรงขึ้น 75 วินาที แต่ไม่เคยมีผลจริง ตอนนี้ใช้ได้แล้ว'
      ]
    },
    {
      version: '0.26.1',
      date: '2026-10-22',
      title: 'ปุ่มเต็มจอ',
      items: [
        'เพิ่มปุ่ม "⛶ เต็มจอ" ที่หน้าแรกและในเมนูหยุดเกม เปิดในเบราว์เซอร์แล้วกดได้เลย (พยายามล็อกแนวนอนให้ด้วย) · iPhone Safari ไม่รองรับ ให้ใช้ติดตั้งเป็นแอปแทน'
      ]
    },
    {
      version: '0.26.0',
      date: '2026-10-22',
      title: 'ติดตั้งเป็นแอปได้ (เต็มจอ)',
      items: [
        'ติดตั้งจาก Chrome ได้: เมนู ⋮ → "ติดตั้งแอป" / "เพิ่มไปยังหน้าจอหลัก" หรือกดปุ่ม "📲 ติดตั้งแอป" ที่หน้าแรกเมื่อขึ้นให้ ติดตั้งแล้วเปิดแบบเต็มจอ แนวนอน ไม่มีแถบเบราว์เซอร์',
        'มีไอคอนเกม และเปิดโหมดเดี่ยวได้แม้ไม่มีเน็ตหลังเคยเปิดครั้งแรก (ออนไลน์จะดึงไฟล์ล่าสุดทุกครั้ง)'
      ]
    },
    {
      version: '0.25.2',
      date: '2026-10-22',
      title: 'เปลี่ยนชื่อ "ชุดใจ" เป็น "ชุดอารมณ์"',
      items: [
        'ระบบ โลภ / โกรธ / หลง / ศรัทธา เปลี่ยนชื่อเรียกเป็น "ชุดอารมณ์" ทั้งหน้าเลือกตัว ห้องออนไลน์ และคู่มือ (ค่าสถานะและพลังแฝงเหมือนเดิม)'
      ]
    },
    {
      version: '0.25.1',
      date: '2026-10-22',
      title: 'ชื่อป้อมตามยุค + แก้ปืนใหญ่มองไม่เห็น + ป้อมพังไวขึ้น',
      items: [
        'ชื่อป้อมเปลี่ยนตามยุค: ค่ายไม้/ด่านหน้า/ค่ายกลาง → ป้อมระเนียด/ป้อมปราการ/ป้อมหลวง → ด่านลวดหนาม/บังเกอร์/ที่มั่นใหญ่ → ด่านตรวจ/ฐานปฏิบัติการ/ศูนย์บัญชาการ (เลือดเท่าเดิม)',
        'แก้ฐานปืนใหญ่ร้าง (ยุคสงคราม) ที่ไม่ขึ้นรูปในโหมด 3D',
        'ลดเลือดป้อมทุกชั้นและราชธานีลง เกมจบเร็วขึ้นเฉลี่ยราว 15 นาที'
      ]
    },
    {
      version: '0.25.0',
      date: '2026-10-22',
      title: 'ฟีลเกม MOBA ชุด 3: ป้อม 3 ชั้น ทางลัดข้ามเลน เปิดเกมเร็วขึ้น',
      items: [
        'เพิ่มป้อมด่านนอกสุดของทุกเลน "ค่ายไม้" (ใกล้กลางแมพ เลือดน้อยพังไว) ตอนนี้แต่ละเลนมีป้อม 3 ชั้น: ค่ายไม้ → ด่านหน้า → ค่ายกลาง ก่อนถึงราชธานี',
        'ทางลัดข้ามเลนตามยุค: ท่าน้ำ (สุโขทัย) · คลองลัด (อยุธยา) · ทางรถไฟร้าง (ยุคสงคราม) · ซอยลัด (ปัจจุบัน) ผ่านช่องกำแพงระหว่างเลนบน/ล่างกับเลนกลาง ฮีโร่วิ่งบนเส้นนี้เร็วขึ้น 30% เห็นเป็นเส้นสีบนพื้นและบนมินิแมพ',
        'คลื่นลูกกระจ๊อกแรกออกเร็วขึ้น (วินาทีที่ 4) การปะทะแรกมาไวกว่าเดิม',
        'เป้าหมายกลางแมพโผล่ที่ 2:00 (ชุด 2) รวมกับป้อมค่ายไม้ ทำให้ต้นเกมมีเรื่องให้สู้เร็วขึ้น'
      ]
    },
    {
      version: '0.24.0',
      date: '2026-10-22',
      title: 'ฟีลเกม MOBA ชุด 2: เป้าหมายกลางแมพที่วนซ้ำตามยุค',
      items: [
        'กลางแมพมีเป้าหมายเกิดซ้ำทุกยุค: ช้างเผือก (สุโขทัย) · พญานาค (อยุธยา) · ฐานปืนใหญ่ร้าง (ยุคสงคราม) · ยักษ์วัดแจ้ง (ปัจจุบัน)',
        'เกิดครั้งแรกที่ 2:00 ตายแล้วเกิดใหม่ทุก 2:30 · เปลี่ยนยุคแล้วตัวเก่าหายไป ตัวของยุคใหม่ตามมาใน 20 วิ',
        'ฆ่าได้ทั้งทีมได้ทอง/XP/บัฟ · พญานาค = มินเนียนทีมเราแรงขึ้น 80 วิ · ฐานปืนใหญ่ = ป้อมทีมเราแรงขึ้น 75 วิ',
        'ก่อนเกิด 30 วิมีประกาศเตือน และมินิแมพมีตัวนับเวลาถอยหลังตรงจุดเกิด · บอทรวมตัวไปตีเป้าหมายเหมือนเดิม'
      ]
    },
    {
      version: '0.23.0',
      date: '2026-10-22',
      title: 'ฟีลเกม MOBA ชุด 1: ทองลอย คำเตือนป้อม เสียงประกาศ',
      items: [
        'ปลิดลูกกระจ๊อก/มอนป่า/ป้อม/ฮีโร่แล้วมีเหรียญทอง +N ลอยขึ้นพร้อมเสียงกริ๊ง (เห็นเฉพาะทองของตัวเอง)',
        'ทองจากลูกกระจ๊อก: เพื่อนที่ยืนใกล้ได้ส่วนแบ่ง +6 และคนปลิดได้โบนัส +3 ตั้งค่าที่ CFG.gold',
        'ป้อมหรือฐานฝั่งเราถูกตี: แถบเตือนสีแดงบอกเลน + เสียงไซเรน + วงแดงกะพริบบนมินิแมพ (เตือนซ้ำได้ทุก 12 วินาที)',
        'เสียงผู้ประกาศ (ถ้าเครื่องมีเสียงไทย): เปิดเกม ป้อมพัง/ป้อมเราโดนทำลาย ราชธานีถูกโจมตี'
      ]
    },
    {
      version: '0.22.5',
      date: '2026-10-22',
      title: 'เลนกลางกว้างขึ้น + ฮีโร่วิ่งเร็วขึ้น',
      items: [
        'เลนกลางกว้างขึ้นจาก ~184 เป็น ~244 หน่วย (ขยับกำแพงป่าออกข้างละ 30) หลบสกิลด้านข้างได้ง่ายขึ้น ทางเดินป่าแคบลงเล็กน้อย',
        'ความเร็วเดินของฮีโร่ทุกบทบาทเพิ่มประมาณ 12% (เช่น นักสู้ 74→83, แอสซาซิน 88→99) เดินข้ามแมพไวขึ้น เกมกระชับขึ้น',
        'ค่าความเร็วแก้ได้ที่ TR.ROLES และตำแหน่งกำแพงที่ base ในส่วนกำแพงของ js/data.js'
      ]
    },
    {
      version: '0.22.4',
      date: '2026-10-21',
      title: 'ปรับสมดุลจากบอท 240 แมตช์',
      items: [
        'ลดแรง: ช่างภาพข่าว (ชนะ ~60%) · ช่างไฟนักประดิษฐ์ (~62%) · หมอยาสมุนไพร (~65%) · หมอธรรม (~58%)',
        'เสริมแรง: ยามาดะอาสา (~38%) · นักดาบอาสา (~38%) · ผู้ใหญ่บ้านพิทักษ์ (~40%)',
        'ฮีโร่ใหม่ที่เหลืออยู่ในช่าง 47-55% ไม่แตะ · ตัวเลขทั้งหมดอยู่ที่ TR.HERO_BAL ใน js/data.js'
      ]
    },
    {
      version: '0.22.3',
      date: '2026-10-21',
      title: 'มินิแมพอ่านง่ายแบบ AoV + ไอเทมแนะนำไม่รกจอ',
      items: [
        'มินิแมพใหญ่ขึ้นและยืดแนวตั้ง ถนนเลนหนาพร้อมเส้นกลาง ป้อมใหญ่ขึ้น ลูกกระจ๊อกเห็นชัด',
        'ไอคอนฮีโร่บนมินิแมพเป็นวงแหวนสีทีม พื้นสีฮีโร่ และตัวอักษรแรกของชื่อ (ตัวเราวงขาว) ดูออกว่าใครเป็นใคร',
        'ไอเทมแนะนำฝั่งซ้ายขึ้นเฉพาะชิ้นที่เงินพอซื้อตอนนี้ สูงสุด 2 ชิ้น ถ้ายังไม่พอจะไม่ขึ้นเลย',
        'ยังปรับขนาดมินิแมพได้ที่ตั้งค่า (เล็ก/กลาง/ใหญ่)'
      ]
    },
    {
      version: '0.22.2',
      date: '2026-10-21',
      title: 'แก้จุดบอดมือถือ 2 อย่าง',
      items: [
        'ปุ่มไอเทมแนะนำฝั่งซ้าย (ชิ้นที่ 2-4) แตะได้แล้ว ไม่ถูกพื้นที่จอยสติกแย่งการแตะ',
        'ลากเล็งสกิล: คำอธิบายสกิลขึ้นเฉพาะตอนกดค้างเฉย ๆ พอเริ่มลากจะซ่อนทันที ไม่บังการเล็ง'
      ]
    },
    {
      version: '0.22.1',
      date: '2026-10-21',
      title: 'ปรับสมดุลฮีโร่ใหม่รอบแรก',
      items: [
        'ช่างภาพข่าวชนะ ~73% ในบอท (K/D 6.6/2.6) → เลือด −5% ดาเมจ −6%',
        'ฮีโร่ใหม่ตัวอื่นอยู่ใกล้เกณฑ์ (ตัวอย่างเล็ก ~20 เกมต่อตัว) จึงยังไม่แตะ จะวัดซ้ำเมื่อมีข้อมูลมากขึ้น'
      ]
    },
    {
      version: '0.22.0',
      date: '2026-10-21',
      title: 'ฮีโร่ใหม่ 8 ตัว ยุคละ 2 (รวม 20 ตัว)',
      items: [
        'สุโขทัย: นางนพมาศ (เมจ ยิงกระทงไฟ ได้โล่ทุกครั้งที่ร่ายสกิล) · ขุนศึกโล่หวาย (แทงค์ ยืนนิ่งเกราะเพิ่ม ประกาศศึกดึงความสนใจ)',
        'อยุธยา: พลปืนคาบชุด (มือปืน ตีครั้งที่ 3 แรงขึ้น ยืนนิ่งยิงแรง) · ยามาดะอาสา (แอสซาซิน ฆ่าได้แล้วรีเซ็ตสกิล 1)',
        'ยุคสงคราม: จ่าดาบปลายปืน (นักสู้ เลือดต่ำดูดเลือด) · พยาบาลสนาม (ซัพพอร์ต ช่วยเพื่อนที่เลือดต่ำเป็นพิเศษ)',
        'ปัจจุบัน: ตำรวจจราจร (แทงค์ ตีปกติชะลอศัตรู) · ช่างภาพข่าว (มือปืน ตีครั้งที่ 4 ทำให้ตาพร่า)',
        'ทุกตัวมีโมเดล 3D ท่าทาง ภาพ 2D ไอคอนสกิล เอฟเฟกต์ และเสียงประจำตัวครบ · ตัวเลขพลังติดตัวอยู่ที่ TR.PASSIVE ใน js/data.js'
      ]
    },
    {
      version: '0.21.6',
      date: '2026-10-21',
      title: 'ปรับสมดุลหลังบอทเทียบรอบใหม่',
      items: [
        'ช่างไฟนักประดิษฐ์ ชนะ ~72% ในบอท → เลือด −6% ดาเมจ −7% · วินมอเตอร์ไซค์ ชนะ ~31% → เลือด +6% ดาเมจ +8% · ควาญช้างศึก ชนะ ~65% → เลือด −2% ดาเมจ −2% (ปรับน้อย เพราะบอท 40 แมตช์ยังคลาดเคลื่อนได้)',
        'ฮีโร่ที่เหลือและระยะตีรายฮีโร่อยู่ในเกณฑ์ (ยกเว้นสายลับเงา ~40% และแม่ค้าริมทาง ~44% ที่ยังติดตามต่อ)'
      ]
    },
    {
      version: '0.21.5',
      date: '2026-10-21',
      title: 'หมอกสงคราม + แก้บั๊กตีธรรมดาของสายยิง',
      items: [
        'หมอกสงคราม: เห็นเฉพาะรอบตัวฮีโร่ ลูกกระจ๊อก ป้อม และตะเกียงของทีมเรา พื้นที่นอกวงมืดลง ศัตรู/มอนป่า/กระสุนที่อยู่ในหมอกจะมองไม่เห็นทั้งบนจอและมินิแมพ และเล็ง/ตีไม่ได้ (สกิลพื้นที่ยังโดนได้) · ปักตะเกียงเพื่อส่องไปข้างหน้า',
        'รัศมีมอง (CFG.vision): ฮีโร่ 270 · ลูกกระจ๊อก 150 · ป้อม 360 · ป้อมหลัก 420 · ตะเกียง 380 · ปิดหมอกได้ที่ CFG.fog',
        'แก้บั๊กร้ายแรงที่มากับ v0.21.1: ฮีโร่ที่ตีธรรมดาแบบยิงไกล (นักยิง เมจ ซัพพอร์ต) ตีไม่เข้า/ตัวเลขดาเมจเป็น NaN และมอนป่าเลือดไม่ลด — ตอนนี้ตีปกติแล้ว'
      ]
    },
    {
      version: '0.21.4',
      date: '2026-10-21',
      title: 'วินมอเตอร์ไซค์มีรถใน 2D · เก็บกวาดถ้อยคำ',
      items: [
        'วินมอเตอร์ไซค์: โหมด 2D และไอคอนในหน้าเลือกฮีโร่/ห้องออนไลน์ มีมอเตอร์ไซค์แล้ว (เดิมมีแค่ใน 3D)',
        'ปรับถ้อยคำในบันทึกอัปเดตเก่า ไม่อ้างชื่อเกมอื่น'
      ]
    },
    {
      version: '0.21.3',
      date: '2026-10-21',
      title: 'แก้ตัวโชว์โมเดลบังปุ่มบนมือถือ',
      items: [
        'หน้าแรกบนมือถือ/จอแคบ: ตัวโชว์โมเดลฮีโร่ไม่ลอยค้างบนจอตอนเลื่อนลงอีกต่อไป เลื่อนผ่านไปตามหน้า ปุ่มเริ่มเกม/เลือกชุดใจ/เลน/สเปลไม่ถูกบัง (เดสก์ท็อปจอกว้างยังลอยค้างเหมือนเดิม)'
      ]
    },
    {
      version: '0.21.2',
      date: '2026-10-21',
      title: 'เล็งสกิลลากตามนิ้ว · ลดความหน่วงบนมือถือ · สลับกราฟิกกลางเกม · 2D มีชีวิตขึ้น',
      items: [
        'เล็งสกิลพื้นที่/พุ่ง: ระยะลากปรับตามระยะสกิลและซูมจอ (เดิมเป็นจอยสติกคงที่) ลากละเอียดขึ้น วางพื้นที่ใกล้ตัวได้ง่าย · ปล่อยใกล้ปุ่มหรือลากไกลมาก = ยกเลิก',
        'สกิลพุ่งตอนนี้พุ่งตามระยะที่ลากเล็งด้วย (เดิมพุ่งเต็มระยะเสมอ ยกเว้นพุ่งใส่เป้า) สั้นสุด 25%',
        'ความหน่วงบนมือถือ: ตัวหน่วงหลักคือความละเอียดภาพ จึงเพิ่มตั้งค่า "คุณภาพภาพ" (อัตโนมัติ/คมชัด/สมดุล/ประหยัด) · โหมดอัตโนมัติเริ่มที่ 1.5 เท่าบนจอสัมผัส แล้วลดความละเอียดเองก่อน ถ้ายังหนักจึงสลับ 2D',
        'สลับ 2D/3D กลางเกมได้แล้ว: ปุ่ม หยุดเกม → กราฟิก (เดิมสลับกลับได้เฉพาะที่เมนู) และหลังสลับเองระบบอัตโนมัติจะไม่สลับซ้ำ 90 วินาที',
        '2D: วงทีมใต้เท้า ตัวใหญ่ขึ้นเล็กน้อย ตัวยุบเด้งตอนโดนตี ตัวพุ่งเข้าหาตอนตี และเส้นฟันของสายประชิด'
      ]
    },
    {
      version: '0.21.1',
      date: '2026-10-21',
      title: 'ปรับระยะตีธรรมดารายฮีโร่',
      items: [
        'ระยะตีธรรมดาแยกเป็นรายฮีโร่แล้ว (เดิมใช้ตามบทบาท): สายประชิด 28–40 ตามขนาดอาวุธ (ควาญช้างไกลสุด นักมวย/สายลับสั้นสุด) · นักยิง พรานป่า 165 เสรีไทย 150 · เมจ หมอธรรม 125 ช่างไฟ 135 · ซัพพอร์ต หมอยา 105 แม่ค้า 92',
        'วงระยะโจมตีบนจอและบอทใช้ค่าเดียวกัน แก้ตัวเลขได้ที่ TR.HERO_RANGE ใน js/data.js'
      ]
    },
    {
      version: '0.21.0',
      date: '2026-10-21',
      title: 'ความมันตอนต่อสู้ · แชตออนไลน์ · แบนฮีโร่ในห้อง',
      items: [
        'เลเวลอัป: มีวงแสง เสาแสงพุ่งขึ้น ตัวอักษร LV ลอย และประกายทองรอบตัวฮีโร่ (ของเราเด่นกว่าตัวอื่น)',
        'ฆ่า/ตาย: ฮีโร่ล้มมีคลื่นกระแทก เส้นแสงกระจาย และเศษประกาย · ถ้าเราฆ่าจอแฟลชทอง · ถ้าเราตายจอแฟลชแดงและซีดขาวดำชั่วครู่',
        'จอสั่น: โดนแรง (เกิน 20% ของเลือดสูงสุดในครั้งเดียว) หรือเราตีแรงใส่ฮีโร่ศัตรู · ฆ่า/ตายสั่นแรงขึ้นตามลำดับ',
        'หน่วงเฟรมสั้น ๆ ตอนตีหนัก/ฆ่า/ตาย (โหมดเดี่ยวเท่านั้น — ออนไลน์ไม่หน่วงเพื่อไม่ให้เครื่องแต่ละคนเดินไม่ตรงกัน) ปรับแรง/ความยาวได้ที่ CFG.juice',
        'ออนไลน์ — แชตข้อความ: พิมพ์คุยกันได้ทั้งในห้องและระหว่างเกม (ส่งหาทีมหรือทุกคน) มีวลีด่วน 5 ข้อสำหรับมือถือ ข้อความขึ้นในฟีดมุมจอ',
        'ออนไลน์ — โหมดแบน: เจ้าของห้องเปิดโหมดแบนได้ ทีมละ 1 ตัว ใครในทีมกดแบนแทนทีมได้ (กดซ้ำเพื่อถอน) ตัวที่ถูกแบนใครก็เลือกไม่ได้ และใครที่ถือตัวนั้นอยู่จะถูกเปลี่ยนให้อัตโนมัติ · ทุกครั้งที่แบนเปลี่ยน ทุกคนต้องกดพร้อมใหม่',
        'เซิร์ฟเวอร์ออนไลน์เพิ่มคำสั่งแชต/แบน (Render จะอัปเดตเองหลังส่งขึ้น GitHub)'
      ]
    },
    {
      version: '0.20.0',
      date: '2026-10-21',
      title: 'ป้อมตีคนรังแกฮีโร่ · วงระยะโจมตี · กลับพระนครเฉพาะตัว · รายละเอียดสกิล',
      items: [
        'ป้อมหันไปตีศัตรูที่เพิ่งตีฮีโร่ฝั่งตัวเองทันที แม้ป้อมจะกำลังล็อกเป้าอื่น (เช่นลูกกระจ๊อก) อยู่ — แก้ปัญหาป้อมไม่สนว่าฮีโร่ถูกตี (ปรับเวลาได้ที่ CFG.towerAggro)',
        'กดโจมตีค้าง จะเห็นวงระยะตีปกติรอบตัวฮีโร่ (วงประสีขาว)',
        'กลับพระนครมีเอฟเฟกต์และท่าเฉพาะฮีโร่ครบ 12 ตัว เช่น นักดาบยืนตะเบ๊ะมีรังสีทอง, หมอธรรมวงยันต์หมุน, เสรีไทยเสาแสงสามสีธงชาติ, วินมอเตอร์ท่อไอเสียพ่นควัน, ช่างไฟฟ้าช็อตรอบตัว และมีแสงวาบตอนหายตัว/ปรากฏตัวที่ฐาน',
        'กดค้างปุ่มสกิล (หรือเอาเมาส์ชี้) จะขึ้นรายละเอียด: ชนิดดาเมจ (กายภาพ/เวทมนตร์) ตัวเลขดาเมจจริงตามพลังและเลเวลสกิลตอนนี้ (พร้อมค่าที่เลเวลสูงสุด) คูลดาวน์หลังลดจากไอเทม ระยะ รัศมี และเอฟเฟกต์คุม/ฟื้น/บัฟ'
      ]
    },
    {
      version: '0.19.1',
      date: '2026-10-21',
      title: 'แก้ข้อความหน้าตั้งค่า',
      items: ['ปรับถ้อยคำหน้าตั้งค่า โหมดตีปกติเหลือแค่ "กดปุ่มโจมตี" และ "ตีอัตโนมัติ"']
    },
    {
      version: '0.19.0',
      date: '2026-10-21',
      title: 'วินมอเตอร์ไซค์ได้มอเตอร์ไซค์แล้ว!',
      items: [
        'ฮีโร่วินมอเตอร์ไซค์นั่งบนมอเตอร์ไซค์จริง มีล้อหน้า-หลังที่หมุนตามความเร็ว แฮนด์ ไฟหน้า ไฟท้าย ท่อไอเสีย และบังโคลน ทั้งในสนามรบและหน้าเลือกตัว',
        'สกิลหมุนตัวกลายเป็นการดริฟต์รถหมุนรอบตัว ท่าประจำตัวหน้าเลือกตัวบิดคันเร่งแล้วล้อหมุน'
      ]
    },
    {
      version: '0.18.3',
      date: '2026-10-21',
      title: 'ย้ายเซิร์ฟเวอร์ออนไลน์ไปสิงคโปร์',
      items: ['เซิร์ฟเวอร์ห้องออนไลน์ย้ายไปอยู่สิงคโปร์ ใกล้ไทยขึ้น ความหน่วง (ping) ควรลดลงมาก ห้องเก่าที่สร้างไว้ก่อนหน้านี้ใช้ไม่ได้แล้ว ให้สร้างห้องใหม่']
    },
    {
      version: '0.18.2',
      date: '2026-10-21',
      title: 'แก้ลำดับบทสอนเล่น',
      items: ['บทสอน "กลับพระนคร" มาก่อน "ซื้อไอเทม" แล้ว (ซื้อของได้เฉพาะตอนอยู่ที่ฐาน จึงต้องสอนกลับฐานก่อน)']
    },
    {
      version: '0.18.1',
      date: '2026-10-21',
      title: 'ห้องออนไลน์ใช้เวที 3D',
      items: ['ตัวละครที่เลือกในห้องออนไลน์เป็นโมเดล 3D ที่หมุนได้ ลากเพื่อหมุน ล้อเมาส์/บีบนิ้วซูม ดับเบิลคลิกรีเซ็ต พร้อมท่าประจำตัวเหมือนหน้าเมนู']
    },
    {
      version: '0.18.0',
      date: '2026-10-21',
      title: 'ไอเทมประจำยุค 12 ชิ้น + ระบบประกอบจากชิ้นย่อย',
      items: [
        'ร้านมีหมวดใหม่ "ไอเทมประจำยุค" ยุคละ 3 ชิ้น (รวม 12 ชิ้น) ปลดล็อกเมื่อเกมเข้ายุคนั้น: สุโขทัย ดาบพ่อขุนรามฯ · ระฆังไล่ภัย · หม้อยาพ่อขุน / อยุธยา หอกกุนไชย · เกราะพญาช้าง · ตำราพิชัยสงคราม / ยุคสงคราม ปืนไรเฟิลสนาม · เสื้อเกราะกันกระสุน · วิทยุสนาม / ปัจจุบัน สมาร์ตโฟน · เครื่องกระตุกหัวใจ · พาวเวอร์แบงก์',
        'ประกอบจากชิ้นย่อย: ถือชิ้นย่อยตามสูตรอยู่ (เช่น ดาบพ่อขุนรามฯ = ดาบทมิฬ + มีดหมอพราน) จะหักราคาให้และชิ้นย่อยถูกใช้ไป ช่องไอเทมจึงไม่เต็มเร็ว',
        'มีไอเทมใช้งานใหม่ 5 ชิ้น (ระฆังชะลอศัตรู · ตั้งรับบนหลังช้าง · เรียกระดมพล · บูสต์ 5G · ปั๊มหัวใจ) กดด้วยปุ่ม G H T Y B N ตามลำดับที่ถือ และพลังแฝง 7 แบบ เช่น ซุ่มในพุ่มตีแรงขึ้น ผ้าพันแผลสนามให้โล่ตอนเลือดต่ำ ไฟสถิตลดคูลดาวน์ตอนตีโดน',
        'บอทซื้อไอเทมประจำยุคตามบทบาท (สูงสุด 2 ชิ้นต่อเกม)'
      ]
    },
    {
      version: '0.17.0',
      date: '2026-10-21',
      title: 'ท่าและเสียงเฉพาะตัวฮีโร่ · ห้องออนไลน์เต็มจอ · ตัวบอกความหน่วง',
      items: [
        'ท่าตีและท่าร่ายสกิลในเกมเป็นของแต่ละฮีโร่ ไม่ใช่ชุดตามอาวุธแล้ว: ตีปกติ 1 ท่า และสกิล 1/2/3 คนละท่า เช่น ควาญช้างฟาดตะขอข้ามหัวและกระแทกพื้น, นักมวยเข่าลอยและหมุนตัวเตะ, วินมอเตอร์หมุนตัวพุ่ง, แม่ค้าโยนข้าวห่อ',
        'เสียงเฉพาะตัวทุกฮีโร่: เสียงตีปกติ 1 แบบ และเสียงสกิล 3 แบบ ต่างกันหมด เช่น ดาบฟันและเหล็กกระทบ, ธนูดีดสาย, ปืนลั่น, ช้างร้อง, เครื่องยนต์เร่ง, ไฟฟ้าช็อต, ทัพพีกระทบกระทะ',
        'ห้องออนไลน์เต็มจอ: เลือกฮีโร่ ชุดใจ เลน สเปล ได้ในห้องเลย เห็นการ์ดฮีโร่ที่เพื่อนเลือกแล้ว และเห็นตัวเลือกของเพื่อนแบบสด ๆ ก่อนกดพร้อม',
        'ตัวบอกความหน่วง (ping) ในห้องและระหว่างเล่นออนไลน์: เขียว ต่ำกว่า 80 ms · เหลือง ต่ำกว่า 160 ms · แดง สูงกว่านั้น'
      ]
    },
    {
      version: '0.16.3',
      date: '2026-10-21',
      title: 'หลุดกลางเกมออนไลน์ กลับเข้าเกมได้',
      items: [
        'ถ้าเน็ตหลุดหรือรีเฟรชหน้าระหว่างเล่นออนไลน์ เกมจะลองต่อห้องเดิมให้เองอัตโนมัติ (ภายใน 5 นาที) แล้วตามเกมให้ทัน ตัวละครที่บอททำแทนอยู่จะกลับมาให้คุมเหมือนเดิม',
        'เปิดเกมใหม่หลังหลุด กดเข้าเกมแล้วจะกลับเข้าห้องเดิมเอง ถ้าเกมจบหรือกดออกเองจะไม่กลับ'
      ]
    },
    {
      version: '0.16.2',
      date: '2026-10-21',
      title: 'เอฟเฟกต์สกิลของฮีโร่ครบทั้ง 12 ตัว',
      items: [
        'ทุกสกิล (36 สกิล) มีเอฟเฟกต์เฉพาะตัว เช่น นักดาบตั้งรับมีรัศมีทอง ศึกสุดท้ายออร่าแดงลุกโชน, พรานป่าลูกศรมีหางลมและฝนศรแฉกเป็นพัด, หมอธรรมวงยันต์หมุนและเสาไฟระเบิด, ช้างศึกคลั่งพื้นแตกร้าวฝุ่นตลบ',
        'สายซัพพอร์ตมีเอฟเฟกต์ฮีลต่างกัน: ใบไม้ลอยของหมอยา, ข้าวห่อโยนเป็นวงโค้งและไอน้ำของแม่ค้า, เสาแสงตอนฮีลก้อนใหญ่',
        'ช่างไฟมีฟ้าผ่ากระโดดต่อกัน หม้อแปลงมีไฟช็อตวิ่ง และไฟดับทั้งซอยมืดสนิทมีไฟกะพริบ · สายลับมีตะขอลวด วาร์ปเงา และกากบาทแดงตอนจบเป้า · วินมอเตอร์ไซค์มีไฟท้ายกับรอยลื่นไถล',
        'โดนเป้าแล้วมีประกายต่างตามฮีโร่ (ฟันเป็นกากบาท หมัดเป็นดาวระเบิด ธนูมีเศษไม้ ฯลฯ) และตีปกติมีประกายสีประจำตัว'
      ]
    },
    {
      version: '0.16.1',
      date: '2026-10-21',
      title: 'ฮีโร่ทุกตัวมีท่าทางเป็นของตัวเอง',
      items: [
        'หน้าเลือกตัว: ฮีโร่ทั้ง 12 มีท่ายืนนิ่งของตัวเอง (นักดาบเท้าสะเอว, พรานป่าย่อลาดตระเวน, นักมวยตั้งการ์ดเด้งเท้า, ผู้ใหญ่บ้านไขว้มือหลัง ฯลฯ) และขยับเล็ก ๆ ตลอดเวลา',
        'มีท่าประจำตัวคนละท่า เช่น นักดาบชูดาบคำนับ, นักมวยไหว้ครู, ควาญช้างกระทืบเท้าคำราม, วินมอเตอร์ไซค์บิดคันเร่ง, ช่างไฟปล่อยประกายไฟ',
        'ท่ายืนนิ่งในเกมใช้ท่าเฉพาะตัวเดียวกัน'
      ]
    },
    {
      version: '0.16.0',
      date: '2026-10-21',
      title: 'เล่นออนไลน์กับเพื่อน (เวอร์ชันทดลอง)',
      items: [
        'ปุ่ม "🌐 เล่นออนไลน์กับเพื่อน" ที่หน้าเมนู: สร้างห้อง ได้รหัส 4 ตัว หรือกดคัดลอกลิงก์ส่งให้เพื่อนเข้าห้องได้เลย',
        'ในห้อง: เลือกทีม เลือกฮีโร่/ชุดใจ/เลน/สเปลที่หน้าเมนู กด "พร้อม" แล้วหัวห้องกดเริ่มเกม · ที่ว่างในทีม (ทีมละ 5) บอทเติมให้',
        'ทุกเครื่องรันเกมเอง ส่งแค่คำสั่งผ่านเซิร์ฟเวอร์ จึงลื่นและกินเน็ตน้อย · ถ้าเครื่องใครหลุด บอทจะเข้าคุมตัวต่อให้',
        'ยอมแพ้เป็นโหวตของเพื่อนร่วมทีมจริง (ต้องกดตามภายใน 20 วินาที) · เกมออนไลน์ไม่หยุดเมื่อกดหยุดเกม',
        'เซิร์ฟเวอร์ฟรีหลับเมื่อไม่มีคนใช้ การเชื่อมครั้งแรกอาจรอได้ถึง 1 นาที · ยังไม่มีระบบกลับเข้าเกมเมื่อหลุด และยังไม่มีโหมดแบนในออนไลน์'
      ]
    },
    {
      version: '0.15.3',
      date: '2026-10-21',
      title: 'เชื่อมเซิร์ฟเวอร์ออนไลน์',
      items: [
        'ตั้งที่อยู่เซิร์ฟเวอร์ออนไลน์แล้ว เกมจะปลุกเซิร์ฟเวอร์ให้ตื่นตั้งแต่เปิดหน้าปก เพื่อเตรียมรองรับการเล่นกับเพื่อน (ยังเล่นออนไลน์ไม่ได้ในเวอร์ชันนี้)'
      ]
    },
    {
      version: '0.15.2',
      date: '2026-10-21',
      title: 'เพลงประกอบหน้าปก',
      items: [
        'หน้าปกมีเสียงแล้ว: ลมหวีดไต่ขึ้นรับแสงแฟลร์ ระเบิดต่ำพร้อมฆ้อง เสียงเบสประสานค้าง และระฆังลอยเป็นระยะ จางหายเมื่อกดเริ่มเกม',
        'ถ้าเบราว์เซอร์ยังไม่อนุญาตเสียง จะขึ้นหน้าดำ "แตะเพื่อเข้าสู่เกม" ก่อน แล้วค่อยเริ่มฉากเปิดพร้อมเสียงให้ตรงจังหวะ'
      ]
    },
    {
      version: '0.15.1',
      date: '2026-10-21',
      title: 'หน้าปกใหม่แบบภาพยนตร์ และหน้าโหลดสไลด์ฮีโร่',
      items: [
        'หน้าปกเกมออกแบบใหม่: พื้นดำ โลโก้ทองค่อย ๆ ปรากฏพร้อมแสงแฟลร์พาดผ่าน ลำแสงหมุน ประกายทองลอย แล้วจึงขึ้นช่องตั้งชื่อและปุ่มแตะเพื่อเริ่ม พร้อมเสียงฆ้อง',
        'หน้าโหลดเปลี่ยนเป็นภาพฮีโร่โลว์โพลีทั้ง 12 ตัวสลับไปมา พร้อมชื่อ ยุค และพลังติดตัว',
        'ปรับให้ดูดีทั้งจอแนวนอนและแนวตั้ง'
      ]
    },
    {
      version: '0.15.0',
      date: '2026-10-21',
      title: 'หน้าปกเกม ตั้งชื่อผู้เล่น และหน้าโหลด',
      items: [
        'เปิดเกมมาเจอหน้าปก แตะเพื่อเริ่ม พร้อมตั้งชื่อของคุณ (จำชื่อไว้ในเครื่อง) ชื่อแสดงในเกม ตารางคะแนน และหน้าสรุปผล',
        'เพิ่มหน้าโหลดพร้อมเคล็ดลับการเล่น เตรียมไว้ใช้ตอนรอเชื่อมต่อเกมออนไลน์'
      ]
    },
    {
      version: '0.14.3',
      date: '2026-10-21',
      title: 'จัดระบบคำสั่งผู้เล่นให้เป็นช่องทางเดียว (เตรียมออนไลน์)',
      items: [
        'ทุกการกระทำของผู้เล่น (เดิน ตี สกิล ซื้อ/ขายของ กลับพระนคร ตะเกียง ไอเทม สัญญาณ ฯลฯ) ผ่านช่องทางคำสั่งเดียวกัน การเล่นออฟไลน์ไม่เปลี่ยน แต่ทำให้ส่งคำสั่งข้ามเครื่องได้ในขั้นต่อไป'
      ]
    },
    {
      version: '0.14.2',
      date: '2026-10-21',
      title: 'เตรียมระบบเกมให้พร้อมสำหรับเล่นออนไลน์',
      items: [
        'ปรับการคำนวณภายในให้ได้ผลตรงกันทุกเครื่องและทุกเบราว์เซอร์ (ผู้เล่นไม่เห็นความต่างในการเล่น) เป็นขั้นแรกของระบบเล่นออนไลน์ที่จะตามมา'
      ]
    },
    {
      version: '0.14.1',
      date: '2026-10-21',
      title: 'แก้โหมดสอนเล่น',
      items: [
        'โหมดสอนเล่นปิดซื้อไอเทมอัตโนมัติ เพื่อให้ผู้เล่นได้ลองเปิดร้านและซื้อเองจริงในบทเรียนข้อ 6'
      ]
    },
    {
      version: '0.14.0',
      date: '2026-10-21',
      title: 'ตารางคะแนน ความยากบอท แบนฮีโร่ ตะเกียงส่องทาง และสรุปความตาย',
      items: [
        'ตารางคะแนนระหว่างเล่น: กด Tab ค้าง (หรือปุ่ม 📋 บนมือถือ) ดูฆ่า/ตาย/ช่วย ลูกกระจ๊อก ทอง และไอเทมของทั้ง 10 คน',
        'ความยากบอทศัตรู 3 ระดับ (ง่าย/ปกติ/ยาก) เลือกในเมนู ปรับทั้งความไวในการคิด ดาเมจ และทองที่ได้ — บอทเพื่อนเล่นระดับปกติเสมอ',
        'โหมดแบนฮีโร่ (เปิดในเมนู): ผู้เล่นแบน 1 ตัว บอทแบนอีก 1 ตัว ตอนนี้ฮีโร่มี 12 ตัวจึงแบนได้ฝ่ายละ 1 (ปรับได้ใน data.js)',
        'ตะเกียงส่องทาง 🏮 (ปุ่ม N): วางได้ 2 อัน ได้คืนทีละอันทุก 45 วินาที ส่องรัศมีกว้างให้เห็นศัตรูที่ซ่อนในพุ่ม อยู่ 90 วินาที ศัตรูเดินทับแล้วพัง บอทวางเองด้วย',
        'สรุปความตาย: ตอนตายแสดงว่าใครทำดาเมจเท่าไหร่ใน 10 วินาทีสุดท้าย สัดส่วนเวท/กายภาพ พร้อมคำแนะนำว่าควรซื้อสายไหนเพิ่ม'
      ]
    },
    {
      version: '0.13.0',
      date: '2026-10-21',
      title: 'เสียงทั้งเกม โหมดสอนเล่น และสถิติสะสม',
      items: [
        'ระบบเสียงสร้างสดในเครื่อง (ไม่มีไฟล์เสียงให้โหลด): เสียงตี/สกิล/อัลติ/ตาย/ป้อมพัง/เลเวลอัป/ซื้อของ/ไอเทม เสียงเบาลงตามระยะ',
        'เพลงประจำยุค 4 แบบ (สุโขทัย อยุธยา สงคราม ปัจจุบัน) เปลี่ยนทำนองเองเมื่อเข้ายุคใหม่ พร้อมเสียงฆ้องเปลี่ยนยุค',
        'เสียงประกาศ ฆ่าคนแรก/ฆ่าต่อเนื่อง/ทีมแตก/เปลี่ยนยุค (ใช้เสียงพูดไทยของเบราว์เซอร์ถ้ามี ไม่มีก็ใช้เสียงเอฟเฟกต์) ปรับความดังหรือปิดได้ในปุ่ม 🎮 ตั้งค่า',
        'โหมดสอนเล่น: ศัตรูยืนเฉย มีบทเรียน 8 ขั้น เดิน ตี สกิล พุ่มไม้ ซื้อไอเทม กลับพระนคร โค่นป้อม',
        'สถิติสะสมข้ามเกม (ปุ่ม 📊 ในเมนู): จำนวนแมตช์ อัตราชนะ KDA ป้อมที่พัง และสถิติแยกตามฮีโร่ เก็บในเครื่องคุณ'
      ]
    },
    {
      version: '0.12.0',
      date: '2026-10-21',
      title: 'ดาเมจเวท พลังติดตัวฮีโร่ และไอเทมใช้งาน/พลังแฝง',
      items: [
        'แยกดาเมจกายภาพ/ดาเมจเวท: สกิลของเมจ ซัพพอร์ต และบางฮีโร่เป็นดาเมจเวท ลดด้วย "ต้านเวท" แทนเกราะ (ตัวเลขสีม่วง) แทงค์/นักสู้ต้านเวทกลาง ๆ มือปืนกับแอสซาซินต้านเวทต่ำ',
        'ไอเทมสายใหม่ 2 สาย: ทะลวงเวท (ลดต้านเวทเป้า) และต้านเวท (เกราะเวท) รวมเป็น 16 สาย 48 ชิ้น',
        'ฮีโร่ทั้ง 12 มี "พลังติดตัว" ของตัวเอง เช่น นักดาบตีที่ 4 แรงขึ้น, แม่ค้าได้ทองเพิ่ม, วินมอเตอร์ยิ่งวิ่งยิ่งเร็ว, ช่างไฟสะสมไฟช็อตแล้วสตัน ดูได้ในหน้าเลือกฮีโร่',
        'ไอเทมชั้น 3 ทุกสายมีเอฟเฟกต์พิเศษ: 4 ชิ้นเป็นปุ่มกดใช้ได้ (ยันต์กันภัย, น้ำอมฤต, เหินเวหา, ล้างคุณไสย — ปุ่ม G/H/T/Y) ที่เหลือเป็นพลังแฝง เช่น ชุบชีวิต ฉีกเกราะ สะท้อนดาเมจ ดูดเลือดตอนฆ่า',
        'บอทใช้ไอเทมกดใช้เองตามสถานการณ์ และคำอธิบายในร้านค้าบอกเอฟเฟกต์ครบ'
      ]
    },
    {
      version: '0.11.0',
      date: '2026-10-21',
      title: 'พุ่มไม้ ป้อมกันบุกหลัง มินเนียนปืนใหญ่ ประกาศฆ่า และยอมแพ้',
      items: [
        'พุ่มไม้ 18 จุดบนแมพ: ฮีโร่ที่ยืนในพุ่มศัตรูมองไม่เห็นและเล็งไม่ได้ จนกว่าศัตรูจะเข้าพุ่มเดียวกัน เข้าใกล้ หรือเขาตี/ใช้สกิล (เปิดเผยตัว 1 วินาที) มินิแมพก็ซ่อนเช่นกัน',
        'ป้อมตีคนที่ไปตีฮีโร่ฝั่งตัวเองก่อน (แก้ให้เฉพาะคนที่ตีฝั่งป้อมจริง) และกันบุกหลังป้อม: ถ้าไม่มีมินเนียนช่วยดัน ฮีโร่ตีป้อมได้เบาลง 70% และป้อมฟื้นเลือดเอง',
        'มินเนียนปืนใหญ่: ทุก 3 คลื่นมีเลนละตัว เลือดเยอะ ยิงไกล และทำดาเมจป้อมแรง',
        'ประกาศกลางจอ: ฆ่าคนแรก ฆ่าต่อเนื่อง 2-5 ศพในช่วงสั้น สตรีค 3+ ศพ หยุดสตรีค และทีมแตก',
        'ยอมแพ้: หลังนาทีที่ 8 กดในเมนูพักเพื่อโหวต บอทเพื่อนโหวตตามสถานการณ์ ต้องผ่าน 3 จาก 5'
      ]
    },
    {
      version: '0.10.0',
      date: '2026-10-21',
      title: 'สัญญาณทีม เลือกเลน สถิติท้ายเกม และบอทบุกเก่งขึ้น',
      items: [
        'สัญญาณทีม: ปุ่ม 💬 (หรือกด V) ส่ง ไปบุกที่นี่ / รวมกัน / ระวัง / ถอย / ป้องกันฐาน ไปที่จุดที่กล้องมองอยู่ มีหมุดบนจอและมินิแมพ บอทเพื่อนตอบแล้วทำตามช่วงสั้น ๆ',
        'เลือกเลนก่อนเริ่ม (บน / กลาง / ล่าง / ตีป่า) บอทเพื่อนเติมเลนที่เหลือให้',
        'สถิติท้ายเกมครบขึ้น: ฆ่า/ตาย/ช่วย ดาเมจใส่ฮีโร่ ดาเมจที่รับ ฟื้นฟู ดาเมจป้อม ป้อมที่ทำลาย มอนป่า ทอง และดาว MVP ของแต่ละทีม พร้อมสรุปรวมทีม',
        'บอทบุกจริงจังขึ้น: ค่ายกลางเลนไหนพัง ทุกคนรวมไปเลนนั้นเพื่อบุกราชธานี เลนที่ป้อมศัตรูพังหมดได้มินเนียนยักษ์เพิ่ม และไม่ถอยไปป้องกันฐานทั้งทีมเมื่อศัตรูมาแค่คนเดียว แมตช์บอทต่อบอทจบเร็วขึ้นจากเฉลี่ยราว 28 นาทีเหลือราว 21 นาที'
      ]
    },
    {
      version: '0.9.0',
      date: '2026-10-21',
      title: 'ดูสนามรบตอนตาย มินิแมพใหม่ เซ็ตไอเทมและซื้ออัตโนมัติ',
      items: [
        'ตอนตายลากจอเลื่อนดูสนามรบได้ แตะตัวฮีโร่เพื่อติดตาม หรือแตะมินิแมพเพื่อกระโดดไปดูจุดนั้น พอฟื้นกล้องกลับมาที่ตัวเอง',
        'มินิแมพใหม่: ฮีโร่เป็นวงสีทีมพร้อมสีประจำตัว ป้อมมีแถบเลือดและซากป้อมที่พังแล้ว มีบ่อน้ำทิพย์ มอนป่า/บอสชัดขึ้น ปรับขนาดได้ แตะหรือลากเพื่อแอบดูจุดอื่นตอนมีชีวิต (ปล่อยแล้วกลับมาที่ตัวเอง)',
        'จัดเซ็ตไอเทมของฉันได้ในร้านค้า (เพิ่ม/เอาออก/สั่งซื้อก่อน หรือใช้เซ็ตแนะนำตามสายฮีโร่) จำแยกตามฮีโร่',
        'ไอเทมแนะนำลอยที่ซ้ายจอ แสดงชิ้นถัดไปตามเซ็ต แตะเพื่อซื้อทันทีเมื่ออยู่ที่ฐาน ถ้าอยู่ไกลฐานระบบซื้อล่วงหน้าให้เมื่อกลับถึงฐานหรือตอนตาย (ปิดได้ในตั้งค่าการควบคุม)'
      ]
    },
    {
      version: '0.8.3',
      date: '2026-10-21',
      title: 'ปุ่มสั่งตีและสเปลเป็นไอคอนภาพ',
      items: [
        'ปุ่มตีลูกกระจ๊อก ตีป้อม กลับพระนคร และสเปลทั้ง 7 เปลี่ยนจากตัวอักษรเป็นไอคอนโพลีเต็มปุ่ม',
        'ย้ายปุ่มตีลูกกระจ๊อกกับตีป้อมมาชิดปุ่มโจมตี แถวล่างเรียง: ตีลูกกระจ๊อก, ตีป้อม, สเปล, กลับพระนคร'
      ]
    },
    {
      version: '0.8.2',
      date: '2026-10-21',
      title: 'จัดปุ่มแบบเกม MOBA มือถือ',
      items: [
        'ปุ่มสกิลเรียงโค้งกางกว้างขึ้นรอบปุ่มโจมตี',
        'ปุ่มกลับพระนครกับสเปลเรียงเป็นแถวนอนด้านล่าง'
      ]
    },
    {
      version: '0.8.1',
      date: '2026-10-21',
      title: 'จัดปุ่มบนมือถือให้โปร่งขึ้น',
      items: [
        'ปุ่มโจมตีและปุ่มสกิลบนมือถือจอแนวนอนใหญ่ขึ้นและเว้นระยะห่างมากขึ้น ไม่ทับกันและไม่ชนลูกศรอัปสกิล',
        'ซ่อนชื่อสกิลใต้ปุ่มบนจอเตี้ย (ดูจากไอคอนแทน) ให้หน้าจอไม่รก'
      ]
    },
    {
      version: '0.8.0',
      date: '2026-10-20',
      title: 'ระบบควบคุมใหม่: ปุ่มโจมตี เล็งสกิล เลเวลสกิล',
      items: [
        'เพิ่มปุ่มโจมตีปกติขนาดใหญ่ (Space/J) วางสกิลเรียงโค้งรอบปุ่มโจมตี กดค้างเพื่อตีต่อเนื่อง และมีปุ่มเล็กสั่งตีลูกกระจ๊อก (Z) กับตีป้อม (X)',
        'ลากนิ้วออกจากปุ่มสกิลเพื่อเล็งทิศหรือจุด ปล่อยเพื่อใช้ ลากไกลสุดเพื่อยกเลิก บนคอมใช้เมาส์เล็งได้ตอนกด Q/E/R',
        'แตะศัตรูเพื่อล็อกเป้า แตะซ้ำเพื่อปลด และตั้งลำดับเป้าตีปกติได้ (ใกล้สุด / เลือดน้อยสุด / ฮีโร่ก่อน)',
        'ระบบเลเวลสกิล: เลเวลขึ้นได้แต้มสกิล กดลูกศร ▲ บนปุ่มเพื่ออัป สกิลธรรมดาสูงสุด 4 ชั้น สกิลใหญ่ปลดที่เลเวล 4/7/10 และมีโหมดอัปอัตโนมัติ',
        'ปุ่มสกิลมีภาพโพลีเฉพาะของแต่ละสกิลครบ 36 สกิล',
        'เมนูตั้งค่าการควบคุม (ในเมนูหลักและเมนูพัก) จำค่าไว้ในเครื่อง ปรับโหมดตี ลำดับเป้า การเล็ง และขนาดปุ่มได้'
      ]
    },
    {
      version: '0.7.1',
      date: '2026-10-20',
      title: 'ป้อม 3D และปรับสมดุลเล็กน้อย',
      items: [
        'ป้อมและราชธานีเป็นโมเดล 3D ครบทั้ง 4 ยุค (ค่ายไม้ กำแพงอิฐ+ปืนใหญ่ บังเกอร์ปืนกล ป้อมไฟฟ้า) ป้อมปืนหมุนเล็งเป้า มีท่ากระตุกตอนยิง ธงโบก และตอนพังจะสั่น จมลงพร้อมฝุ่นก่อนเหลือซาก',
        'ปรับสมดุลเล็กน้อย: ควาญช้างศึกและนักมวยคาดเชือกอ่อนลง แม่ค้าริมทางและผู้ใหญ่บ้านพิทักษ์แข็งขึ้น',
        'บอทสายนักสู้ แอสซาซิน มือปืน ซื้อไอเทมทลายค่ายเร็วขึ้น'
      ]
    },
    {
      version: '0.7.0',
      date: '2026-10-20',
      title: 'สเปลเสริม กลับพระนคร และไอเทม 42 ชิ้น',
      items: [
        'เลือกสเปลเสริมก่อนเริ่มแมตช์ 1 จาก 7: ยาทิพย์ ฟาดป่า เหินฟ้า ลมปราณ ล้างอาถรรพ์ ผ้ายันต์กำบัง สังข์เสียงก้อง กดปุ่ม F หรือแตะปุ่มข้างสกิล บอทใช้สเปลเองด้วย',
        'กลับพระนคร (กด C หรือแตะปุ่ม 🏯): ยืนร่าย 6 วินาทีแล้วกลับฐาน ถ้าโดนตี โดนสตัน ขยับ หรือใช้สกิลจะถูกขัด บอทเลือดน้อยก็ใช้กลับบ้านเหมือนกัน',
        'น้ำพุทิพย์หน้าฐานของทั้งสองทีม ยืนใกล้ ๆ ฟื้นเลือดเร็ว',
        'ร้านค้าขยายจาก 18 เป็น 42 ชิ้น ใน 14 สาย: โจมตี ตีเร็ว คมสังหาร ทะลวงเกราะ ดูดเลือด ป้องกัน กำแพงเมือง ชีวิต ฟื้นฟู เคลื่อนที่ มนตรา ทลายค่าย ล่าป่า ทรัพย์ มีสเตตัสใหม่ เช่น โอกาสคริติคอล ทะลวงเกราะ ลดคูลดาวน์ ฟื้นเลือดต่อวินาที ดาเมจใส่มอนป่า ทองที่ได้เพิ่ม',
        'ปุ่มข้อมูลไอเทมในร้านค้าเลื่อนตามจอ ไม่ต้องเลื่อนลงไปหา'
      ]
    },
    {
      version: '0.6.0',
      date: '2026-10-20',
      title: 'มุมมองแบบ MOBA 3D และไอเทมเป็นสาย',
      items: [
        'ไอเทมแบ่งเป็น 6 สาย (โจมตี ตีเร็ว ป้องกัน ชีวิต เคลื่อนที่ ทลายค่าย) สายละ 3 ชั้น ชั้นบนต่อยอดจากชั้นล่าง หักราคาชิ้นที่มีอยู่และใช้ช่องเดิม (ร้านค้าเปลี่ยนเป็นตารางสาย × ชั้น แตะเพื่อดูรายละเอียดแล้วกดซื้อ)',
        'กล้องเอียงแบบเกม MOBA ทั่วไป: พื้นเอียงเป็นมุมเฉียง วงสกิลเป็นวงรีบนพื้น ตัวละคร ป้อม และต้นไม้ตั้งตรง การเล่นและการคำนวณไม่เปลี่ยน',
        'ฮีโร่ มินเนียน มอนป่า และบอสเป็นโมเดล 3D low-poly ในสนามรบ หันหน้าตามทิศที่เดิน มีท่าเดิน ตี ร่ายสกิล และล้มตาย',
        'ตั้งค่าภาพได้ในหน้าเมนู: 3D เอียง (ค่าเริ่มต้น) หรือ 2D คลาสสิก ถ้าเครื่องช้าเกมจะสลับไปใช้ตัวละคร 2D ให้เอง'
      ]
    },
    {
      version: '0.5.0',
      date: '2026-10-20',
      title: 'ร้านค้าไอเทม',
      items: [
        'เพิ่มร้านค้า: ทองที่หามาได้ใช้ซื้อไอเทมแทนระบบ "ขั้นทอง" อัตโนมัติเดิม ซื้อ/ขายได้เมื่ออยู่ที่ฐานหรือตอนตายรอเกิดใหม่ เปิดจากปุ่ม 🛒 หรือกดปุ่ม B (มีจุดสีส้มเมื่อมีเงินพอซื้อ)',
        'ไอเทม 18 ชิ้น แบ่งเป็น 6 สาย (โจมตี ตีเร็ว ป้องกัน ชีวิต เคลื่อนที่ ทลายค่าย) สายละ 3 ชั้น ชั้นบนต่อยอดจากชั้นล่าง หักราคาชิ้นที่มีอยู่และใช้ช่องเดิม ถือได้ 6 ช่อง ขายคืน 70%',
        'บอทซื้อไอเทมเองตามบทบาท และกลับฐานไปซื้อเมื่อมีเงินพอ',
        'ค่าไอเทมทั้งหมดอยู่ที่ TR.ITEMS ใน js/data.js ใช้ปรับสมดุลได้โดยไม่ต้องแก้โค้ด'
      ]
    },
    {
      version: '0.4.0',
      date: '2026-10-20',
      title: 'กำแพง ยักษ์วัดแจ้ง และหน้าเลือกตัว 3D',
      items: [
        'กำแพงและสิ่งกีดขวางบนแมพ 16 ชิ้น หน้าตาเปลี่ยนตามยุค (รั้วไม้ไผ่ กำแพงอิฐ กระสอบทราย+ลวดหนาม แผงคอนกรีต) ตัวละครและมอนเดินชนไม่ได้ บอทหาทางอ้อมเอง มีช่องแคบให้แทรกและซุ่มโจมตี',
        'บอสกลางแมพ "ยักษ์วัดแจ้ง" (เลือด 10,000) เกิดนาทีที่ 5 ทุบพื้นเป็นวงกว้างทุก 7 วินาที ใครสังหารได้ ทั้งทีมที่ยังมีชีวิตได้ทอง เลเวล และบัฟ 90 วินาที (ดาเมจ+8% เกราะเพิ่ม ฟื้นเลือด) เกิดใหม่หลัง 3 นาที บอทจะรวมกลุ่มมาล้มบอส',
        'หน้าเลือกตัวเป็น 3 มิติแบบ low-poly: ฮีโร่ทั้ง 12 ตัวมีโมเดลรูปทรงเหลี่ยมพร้อมชุดและอาวุธเฉพาะตัว ทำท่าเข้าฉาก (กระโดดลงมาหมุนตัว) แล้วสุ่มท่าเท่ ๆ ต่อเนื่อง เช่น ฟัน หมุนฟัน ยิง ร่ายเวท ตั้งการ์ด ชกต่อยเข่า โชว์พลัง วิ่งอยู่กับที่',
        'ลากบนเวทีเพื่อหมุนดูรอบตัวละคร (ปล่อยแล้วหมุนต่อเองแล้วค่อยกลับมาด้านหน้า) ล้อเมาส์หรือบีบสองนิ้วเพื่อซูม ดับเบิลคลิกเพื่อกลับด้านหน้า',
        'ระบบ 3D เขียนเองบน Canvas ไม่ใช้ไลบรารีภายนอก (ไม่ต้องใช้ WebGL) ถ้าเกิดข้อผิดพลาดจะกลับไปใช้ภาพ 2D เดิมอัตโนมัติ',
        'ข้อจำกัด: แมตช์บอทต่อบอทยังยาว (ราว 28 นาที) และสมดุลฮีโร่ยังไม่นิ่ง ยังไม่มีร้านค้าและเสียง'
      ]
    },
    {
      version: '0.3.0',
      date: '2026-10-20',
      title: 'มอนป่า หน้าเลือกตัวแบบเวที 3D และหน้า VS',
      items: [
        'มอนป่า 4 ชนิด ฝั่งละ 4 ค่าย: จระเข้ยักษ์ งูจงอาง (ตัวเล็ก ให้ทองและเลเวล) กระสือ (บัฟดาเมจ +12%) กระหัง (บัฟวิ่งเร็วและฟื้นเลือด) บัฟอยู่ 80 วินาที',
        'มอนไม่เข้าข้างทีมไหน ตีแล้วจะสู้กลับ ถ้าถูกลากไกลเกินค่ายจะกลับไปฟื้นเลือด และเกิดใหม่ตามเวลา (ตัวเล็ก 55 วิ ตัวบัฟ 90 วิ)',
        'บอทมี 1 ตัวต่อทีมที่ไปตีป่าแทนเล่นเลน (ช่องที่ 5 ของทีม) มอนป่าแสดงบนมินิแมพเป็นจุดส้ม/เหลือง',
        'หน้าเลือกตัวใหม่: เวทีฮีโร่ตัวใหญ่กลางหน้าจอ ฉากหลังเปลี่ยนตามยุคของฮีโร่ (วัดสุโขทัย ปรางค์อยุธยา สนามรบ เมืองกลางคืน) มีอนุภาคตามธีมยุค',
        'ฮีโร่ทำท่าเองเป็นระยะ (ฟัน ร่ายสกิล เดิน) ตอนเปลี่ยนตัวมีท่าเข้าฉาก แฟลชแสง และชื่อสไลด์เข้า',
        'หน้า VS ก่อนเริ่มแมตช์: โชว์ทีมสองฝั่ง 5 ต่อ 5 และฮีโร่ที่เราเล่น แตะเพื่อข้ามได้',
        'ข้อจำกัด: ยังไม่ได้ปรับสมดุลหลังเพิ่มมอนป่า แมตช์ยังยาวกว่าเป้า และยังไม่มีเสียง'
      ]
    },
    {
      version: '0.2.0',
      date: '2026-10-20',
      title: 'แมพ 3 เลน และภาพใหม่ที่ละเอียดและลื่นขึ้น',
      items: [
        'แมพ 3 เลน (บน กลาง ล่าง) แต่ละเลนมีป้อม 2 ชั้นต่อทีม และมีมินเนียนเดินคนละเลน มีทางโค้งจากฐานไปเลนบนและเลนล่าง',
        'ราชธานีจะโจมตีได้เมื่อค่ายกลางของทีมนั้นพังอย่างน้อย 1 เลน ราชธานีพังแล้วจบเกม',
        'บอทแยกไปเล่นคนละเลนและกลับมาป้องกันฐานเมื่อศัตรูเข้าใกล้ราชธานี',
        'ภาพใหม่: เปลี่ยนจากพิกเซลเป็นภาพเรียบความละเอียดตามหน้าจอจริง ตัวละครมีท่าเดิน ท่าฟัน ท่าร่ายสกิล และหันหน้านุ่มนวล',
        'เพิ่มเอฟเฟกต์: ฝุ่นเท้า ตัวเลขดาเมจ ควันปืนใหญ่ ลูกกระสุนมีหางแสง เฟดพื้นตอนเปลี่ยนยุค กล้องตามผู้เล่นแบบนุ่ม',
        'มินิแมพเห็นทั้ง 3 เลนชัดขึ้น ป้อมวาดใหม่ทุกยุค มีธงโบก และโดมป้องกันเมื่อยังพังไม่ได้',
        'ปรับให้เกมจบไวขึ้น: ลดเลือดป้อม เพิ่มความเร็วมินเนียน และให้บอทกล้าบุกป้อมมากขึ้น (ยังต้องทดสอบสมดุลเพิ่ม)'
      ]
    },
    {
      version: '0.1.0',
      date: '2026-10-20',
      title: 'ต้นแบบแรก: เล่น 5v5 กับบอทได้แล้ว',
      items: [
        'ฮีโร่ 12 ตัว ยุคละ 3 ตัว (สุโขทัย อยุธยา ยุคสงคราม ปัจจุบัน) บทบาทละ 2 ตัว',
        'ศึกข้ามยุค: แมพเปลี่ยนยุคทุก 5 นาที ป้อมเปลี่ยนพฤติกรรม และฮีโร่ของยุคนั้นแข็งขึ้น 12%',
        'ชุดใจ 4 ชุด: โลภ โกรธ หลง ศรัทธา ให้ค่าสถานะ ราคา และพลังแฝงแบบเอมเบลม',
        'แมพ 1 เลน ป้อม 3 ชั้นต่อทีม ต้องพังตามลำดับ ราชธานีพังแล้วจบเกม',
        'เล่น 1 คนกับบอท 9 ตัว ควบคุมได้ทั้งคีย์บอร์ดและมือถือ',
        'ข้อจำกัดที่ยังมี: ยังไม่มีร้านค้า (ทองให้ขั้นพลังอัตโนมัติแทน), ยังไม่มีเสียง, ตัวเลขสมดุลยังไม่ผ่านการทดสอบ',
        'ภาพเป็นพิกเซลที่วาดด้วยโค้ด ยังเป็นภาพชั่วคราวระหว่างรอสไปรต์จริง'
      ]
    }
  ];
})(typeof window !== 'undefined' ? window : globalThis);
