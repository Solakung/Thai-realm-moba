/* Thai Realm — ตารางข้อมูลทั้งหมด (ปรับสมดุลที่ไฟล์นี้ ไม่ต้องแก้โค้ด)
   ตัวเลขทุกตัวเป็นค่าตั้งต้นสำหรับทดสอบ ยังไม่ผ่านการรันบอทหรือผู้เล่นจริงจนกว่าจะมีบันทึกใน CHANGELOG */
(function (G) {
  'use strict';
  const TR = (G.TR = G.TR || {});

  TR.VERSION = '0.1.0';

  TR.CFG = {
    dt: 0.05,          // ตรรกะเกม 20 ครั้งต่อวินาที
    W: 3200,           // ความกว้างแมพ
    H: 480,            // ความสูงแมพ
    laneY: 240,
    eraLen: 300,       // เปลี่ยนยุคทุก 5 นาที
    eraWarn: 10,       // แจ้งเตือนก่อนเปลี่ยนยุค (วินาที) — ข้อเสนอที่ยังไม่ได้ตัดสินใจ
    maxTime: 1800,     // เพดานเวลาแมตช์สำหรับเครื่องมือบอท
    peak: 1.12,        // ยุครุ่งเรือง: ดาเมจและเลือด +12%
    waveEvery: 25,
    firstWave: 6,
    respawnBase: 6,
    respawnPerLevel: 1.6,
    maxLevel: 10,
    levelBonus: 0.07,  // ต่อเลเวล: เลือดและดาเมจ
    goldPerTier: 600,  // ทุก 600 ทอง = 1 ขั้น (ยังไม่มีร้านค้า — ใช้ขั้นนี้แทนไอเทมชั่วคราว)
    tierBonus: 0.04,
    maxTier: 10,
    towers: [
      // ด่านหน้า → ค่ายกลาง → ราชธานี (ต้องพังตามลำดับ เลือดคงที่ทุกยุค)
      { name: 'ด่านหน้า', x: 1100, hp: 2000 },
      { name: 'ค่ายกลาง', x: 700, hp: 2500 },
      { name: 'ราชธานี', x: 260, hp: 3200 }
    ],
    towerRange: 150
  };

  TR.ERAS = [
    { id: 0, name: 'สุโขทัย', short: 'ค่ายไม้',
      tower: { name: 'ค่ายไม้', dmg: 130, rate: 1.6 },
      note: 'ป้อมยิงช้า แรงต่ำ เหมาะบุกเร็ว',
      ground: '#6f9d4a', ground2: '#659243', lane: '#a8946a', lane2: '#9b8860', prop: 'tree' },
    { id: 1, name: 'อยุธยา', short: 'กำแพงอิฐ+ปืนใหญ่',
      tower: { name: 'ปืนใหญ่', dmg: 220, rate: 2.4, splash: 45 },
      note: 'ป้อมแรงมากใส่กลุ่มคน เข้าทีละคน',
      ground: '#8a8f55', ground2: '#7f8450', lane: '#b49b78', lane2: '#a78f6c', prop: 'pagoda' },
    { id: 2, name: 'ยุคสงคราม', short: 'ป้อมปืนกล',
      tower: { name: 'ปืนกล', dmg: 32, rate: 0.35, focus: true },
      note: 'ป้อมยิงรัวใส่เป้าเดียว ให้แทงค์นำ',
      ground: '#7b7d63', ground2: '#707258', lane: '#8d8672', lane2: '#827b68', prop: 'sandbag' },
    { id: 3, name: 'ปัจจุบัน', short: 'ป้อมไฟฟ้า+กล้องวงจรปิด',
      tower: { name: 'ป้อมไฟฟ้า', dmg: 100, rate: 1.1, reveal: true },
      note: 'ป้อมเห็นคนซุ่ม ไม่พึ่งการซุ่ม',
      ground: '#7c8794', ground2: '#727d8a', lane: '#5e6672', lane2: '#555d68', prop: 'building' }
  ];

  // ค่าตั้งต้นของบทบาท (งบพลังรวมเท่ากัน: ได้ด้านหนึ่งเสียอีกด้าน)
  TR.ROLES = {
    tank:     { name: 'แทงค์',    hp: 3600, atk: 78,  as: 0.9,  range: 30,  speed: 66, armor: 0.35, radius: 9 },
    fighter:  { name: 'นักสู้',   hp: 2800, atk: 108, as: 1.0,  range: 32,  speed: 74, armor: 0.25, radius: 8 },
    mage:     { name: 'เมจ',      hp: 1800, atk: 90,  as: 0.8,  range: 130, speed: 70, armor: 0.10, radius: 7 },
    marksman: { name: 'มือปืน',   hp: 1800, atk: 95,  as: 1.1,  range: 160, speed: 68, armor: 0.10, radius: 7 },
    assassin: { name: 'แอสซาซิน', hp: 2000, atk: 100, as: 1.0,  range: 30,  speed: 88, armor: 0.12, radius: 7 },
    support:  { name: 'ซัพพอร์ต', hp: 2300, atk: 55,  as: 1.0,  range: 110, speed: 74, armor: 0.15, radius: 8 }
  };

  // ชุดใจ: ค่าสถานะพื้นฐาน + ราคาที่ต้องจ่าย (พลังแฝงอยู่ใน sim.js)
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

  // ความเหมาะของฮีโร่กับชุดใจ [โลภ, โกรธ, หลง, ศรัทธา] — 1=แย่ 2=กลาง 3=ดี 4=ดีมาก (ตามเอกสารออกแบบ)
  TR.FIT = {
    nakdab: [2, 4, 1, 3], phran: [4, 2, 3, 1], mohya: [1, 1, 2, 4],
    kwan: [1, 2, 3, 4], mothamma: [4, 3, 1, 2], muay: [1, 4, 2, 3],
    seri: [2, 3, 4, 1], yai: [1, 1, 2, 4], spy: [2, 3, 4, 1],
    mae: [1, 1, 2, 4], win: [2, 4, 3, 1], chang: [4, 2, 1, 2]
  };
  TR.FIT_LABEL = ['', 'แย่', 'กลาง', 'ดี', 'ดีมาก'];

  /* ฮีโร่: สกิลเขียนเป็นรายการ "เอฟเฟกต์" (fx) ที่ sim.js รู้จัก
     ai = คำใบ้ให้บอทว่าเมื่อไหร่ควรใช้ (enemy / lowAlly / lowAllyCrit / fight / allies / taunt / escape / ult) */
  TR.HEROES = [
    // ---------- สุโขทัย ----------
    { id: 'nakdab', name: 'นักดาบอาสา', era: 0, role: 'fighter',
      strength: 'ประชิดตัวดี มีสกิลตอบโต้', weakness: 'ไม่มีสกิลหนี',
      colors: { body: '#c0392b', accent: '#f1c40f', hair: '#4e342e' },
      skills: [
        { name: 'ฟันสวนกลับ', cd: 8, ai: 'fight', aiRange: 60,
          desc: 'ตั้งท่ารับ 1 วินาที ถ้าถูกตีจะลดดาเมจครึ่งหนึ่งและสวนกลับ',
          fx: [{ k: 'counter', dur: 1, dmg: 170, reduce: 0.5 }] },
        { name: 'ก้าวประชิด', cd: 7, ai: 'enemy', aiRange: 130,
          desc: 'พุ่งสั้น ๆ เข้าหาศัตรู (ใช้บุก ไม่ใช่หนี)',
          fx: [{ k: 'dash', dist: 110, dmg: 80, toTarget: true, stop: 22, range: 140, w: 14 }] },
        { name: 'ศึกสุดท้าย', cd: 55, ai: 'ult', aiRange: 90,
          desc: 'ดูดเลือด 30% กันการคุม ดาเมจเพิ่ม 5 วินาที',
          fx: [{ k: 'buff', who: 'self', dur: 5, lifesteal: 0.3, ccImmune: true, dmgMul: 1.1 }] }
      ] },
    { id: 'phran', name: 'พรานป่า', era: 0, role: 'marksman',
      strength: 'ยิงไกล วางกับดักคุมเลน', weakness: 'ประชิดแล้วเปราะ ช้าลงตอนวางกับดัก',
      colors: { body: '#2e7d32', accent: '#a1887f', hair: '#3e2723' },
      skills: [
        { name: 'ยิงธนู', cd: 4, ai: 'enemy', aiRange: 190,
          desc: 'ยิงไกลเป้าเดียว ดาเมจเพิ่มถ้าเป้าติดกับดัก',
          fx: [{ k: 'shot', range: 210, speed: 260, w: 5, dmg: 135, rootedMul: 1.4 }] },
        { name: 'กับดักหนาม', cd: 12, ai: 'enemy', aiRange: 120,
          desc: 'วางได้ 2 อัน ล็อกเป้าที่เหยียบ ขณะวางจะช้าลง',
          fx: [{ k: 'trap', range: 70, r: 16, dmg: 60, root: 1.2, max: 2, life: 25, selfSlow: 0.4 }] },
        { name: 'ฝนศรป่า', cd: 40, ai: 'ult', aiRange: 160,
          desc: 'ยิงลูกศรกระจายเป็นกรวยด้านหน้า',
          fx: [{ k: 'cone', range: 170, n: 7, spread: 50, dmg: 95, speed: 240 }] }
      ] },
    { id: 'mohya', name: 'หมอยาสมุนไพร', era: 0, role: 'support',
      strength: 'ฮีลต่อเนื่อง ล้างสถานะลบ', weakness: 'แทบไม่มีดาเมจ ต้องอยู่ใกล้เป้าหมาย',
      colors: { body: '#7cb342', accent: '#fff8e1', hair: '#5d4037' },
      skills: [
        { name: 'ยาต้มประคอง', cd: 6, ai: 'lowAlly', aiRange: 140,
          desc: 'ฮีลต่อเนื่องเพื่อน 1 คน 3 วินาที',
          fx: [{ k: 'heal', who: 'lowest', r: 140, pct: 0.18, hot: 3 }] },
        { name: 'ถอนพิษ', cd: 14, ai: 'allies', aiRange: 110,
          desc: 'ล้างสถานะลบของเพื่อนในระยะ และให้ต้านทานสั้น ๆ',
          fx: [{ k: 'buff', who: 'allies', r: 110, dur: 3, armorAdd: 0.15, cleanse: true }] },
        { name: 'ยาชูกำลัง', cd: 70, ai: 'lowAllyCrit', aiRange: 200,
          desc: 'เพื่อนที่เลือดต่ำกว่า 25% ในระยะ ฟื้นเลือดทันที (ครั้งละ 1 คน)',
          fx: [{ k: 'heal', who: 'lowest', r: 200, pct: 0.5, hpBelow: 0.25 }] }
      ] },
    // ---------- อยุธยา ----------
    { id: 'kwan', name: 'ควาญช้างศึก', era: 1, role: 'tank',
      strength: 'ทนมาก พังป้อมไว', weakness: 'ช้า โดนยิงไกลทุบ',
      colors: { body: '#8d6e63', accent: '#ffb300', hair: '#37474f' },
      skills: [
        { name: 'ช้างกระแทก', cd: 9, ai: 'enemy', aiRange: 140,
          desc: 'พุ่งตรง ผลักศัตรูตามแนวทาง',
          fx: [{ k: 'dash', dist: 130, dmg: 90, toTarget: true, range: 150, push: 40, w: 18 }] },
        { name: 'เกราะหนัง', cd: 12, ai: 'fight', aiRange: 90,
          desc: 'โล่ 3 วินาที ลดดาเมจรับแต่ช้าลง',
          fx: [{ k: 'buff', who: 'self', dur: 3, shield: 450, speedMul: 0.8, armorAdd: 0.15 }] },
        { name: 'ช้างศึกคลั่ง', cd: 60, ai: 'ult', aiRange: 90,
          desc: 'ดาเมจพื้นที่ใหญ่ และ 6 วินาทีที่ทำดาเมจป้อมเพิ่ม',
          fx: [{ k: 'nova', r: 100, dmg: 260, stun: 0.6 }, { k: 'buff', who: 'self', dur: 6, towerMul: 1.6 }] }
      ] },
    { id: 'mothamma', name: 'หมอธรรม', era: 1, role: 'mage',
      strength: 'ดาเมจกลุ่ม คุมพื้นที่', weakness: 'เลือดน้อย โดนประชิดแล้วจบ',
      colors: { body: '#6a1b9a', accent: '#ffeb3b', hair: '#212121' },
      skills: [
        { name: 'ยันต์ไฟ', cd: 6, ai: 'enemy', aiRange: 160,
          desc: 'ระเบิดพื้นที่กลม ดาเมจเวทกลุ่ม ร่ายช้า',
          fx: [{ k: 'blast', range: 170, r: 42, delay: 0.6, dmg: 170 }] },
        { name: 'กำแพงคาถา', cd: 13, ai: 'enemy', aiRange: 120,
          desc: 'วางพื้นที่หน่วงศัตรู 3 วินาที',
          fx: [{ k: 'zone', range: 120, r: 50, dur: 3, tick: 0.25, slow: 0.4 }] },
        { name: 'ฝนคาถา', cd: 50, ai: 'ult', aiRange: 140,
          desc: 'ร่ายต่อเนื่อง 3 วินาทีในพื้นที่ใหญ่ ต้องยืนนิ่ง ถูกคุมแล้วขาด',
          fx: [{ k: 'zone', range: 140, r: 70, dur: 3, tick: 0.5, dmg: 100, channel: true }] }
      ] },
    { id: 'muay', name: 'นักมวยคาดเชือก', era: 1, role: 'fighter',
      strength: 'คอมโบต่อเนื่อง ติดมึน', weakness: 'ระยะสั้นมาก ถูกคุมแล้วคอมโบขาด',
      colors: { body: '#ef6c00', accent: '#ffffff', hair: '#212121' },
      skills: [
        { name: 'หมัดชุด', cd: 6, ai: 'enemy', aiRange: 42,
          desc: '3 หมัดต่อเนื่อง ยิ่งโดนติดยิ่งแรง',
          fx: [{ k: 'combo', n: 3, dmg: 60, gap: 0.18, range: 42, ramp: 0.25, mark: true }] },
        { name: 'เข่าลอย', cd: 8, ai: 'enemy', aiRange: 70,
          desc: 'ถ้าเป้าถูกหมัดชุดครบ จะติดมึนสั้น ๆ',
          fx: [{ k: 'strike', range: 60, dmg: 110, markedStun: 0.8, dashTo: true }] },
        { name: 'คอมโบมงคล', cd: 50, ai: 'ult', aiRange: 60,
          desc: 'ท่ารวบ 4 ครั้งใส่เป้าเดียว ดาเมจรวมสูง แต่ถูกคุมแล้วขาด',
          fx: [{ k: 'combo', n: 4, dmg: 130, gap: 0.22, range: 48, root: true, breakStun: true }] }
      ] },
    // ---------- ยุคสงคราม ----------
    { id: 'seri', name: 'เสรีไทย', era: 2, role: 'marksman',
      strength: 'ยิงไกล ซุ่มในพุ่ม', weakness: 'ถูกตอบโต้ได้ถ้าโดนจับตำแหน่ง',
      colors: { body: '#33691e', accent: '#cfd8dc', hair: '#455a64' },
      skills: [
        { name: 'ยิงเล็ง', cd: 4, ai: 'enemy', aiRange: 210,
          desc: 'กระสุนไกล ดาเมจสูงขึ้นถ้าไม่ได้เคลื่อนที่',
          fx: [{ k: 'shot', range: 230, speed: 340, w: 4, dmg: 145, stillMul: 1.35 }] },
        { name: 'ซุ่มพราง', cd: 14, ai: 'enemy', aiRange: 220,
          desc: 'ซ่อนตัว 1 วินาที สกิลถัดไปแรงขึ้น (ไม่ใช่ล่องหนทั้งแมพ)',
          fx: [{ k: 'buff', who: 'self', dur: 1.2, stealth: true, nextSkillMul: 1.3 }] },
        { name: 'ส่งพิกัด', cd: 55, ai: 'ult', aiRange: 300,
          desc: '4 วินาที มาร์กศัตรูทั้งเลน เพื่อนตีเป้าที่มาร์กได้ดาเมจ +10%',
          fx: [{ k: 'mark', range: 300, dur: 4, mul: 0.1 }] }
      ] },
    { id: 'yai', name: 'ผู้ใหญ่บ้านพิทักษ์', era: 2, role: 'tank',
      strength: 'ล่อเป้า แบ่งดาเมจแทนเพื่อน', weakness: 'ดาเมจต่ำ ต้องมีเพื่อนอยู่ใกล้',
      colors: { body: '#5d4037', accent: '#ffd54f', hair: '#8d6e63' },
      skills: [
        { name: 'ร้องประกาศ', cd: 10, ai: 'taunt', aiRange: 110,
          desc: 'ดึงความสนใจของศัตรูและป้อมในระยะ',
          fx: [{ k: 'taunt', r: 110, dur: 1.5, tower: true }] },
        { name: 'โล่ผูกพัน', cd: 12, ai: 'allies', aiRange: 150,
          desc: 'ผูกกับเพื่อนที่ใกล้ที่สุด แบ่งรับดาเมจแทน 30%',
          fx: [{ k: 'link', range: 150, share: 0.3, dur: 4 }] },
        { name: 'ผนึกกำลังชาวบ้าน', cd: 60, ai: 'allies', aiRange: 150,
          desc: '5 วินาที เพิ่มเกราะให้ทีมที่อยู่ใกล้',
          fx: [{ k: 'buff', who: 'allies', r: 150, dur: 5, armorAdd: 0.2 }] }
      ] },
    { id: 'spy', name: 'สายลับเงา', era: 2, role: 'assassin',
      strength: 'เก็บเป้าเดียวที่เลือดน้อย', weakness: 'เปราะมาก โดนคุมแล้วจบ',
      colors: { body: '#263238', accent: '#b71c1c', hair: '#000000' },
      skills: [
        { name: 'มีดสั้นลับ', cd: 5, ai: 'enemy', aiRange: 80,
          desc: 'ดาเมจเพิ่มเมื่อตีจากด้านหลังเป้า',
          fx: [{ k: 'strike', range: 55, dmg: 130, backMul: 1.4, dashTo: true }] },
        { name: 'ตะขอลวด', cd: 9, ai: 'enemy', aiRange: 160,
          desc: 'ดึงตัวเองเข้าหาศัตรู',
          fx: [{ k: 'dash', dist: 150, dmg: 0, toTarget: true, stop: 30, range: 170, onlyHero: true, w: 12 }] },
        { name: 'ภารกิจลับ', cd: 45, ai: 'ult', aiRange: 150,
          desc: 'ล็อกเป้า 1 คน ดาเมจสูงถ้าเป้าเลือดต่ำกว่า 40% ฆ่าได้แล้วรีเซ็ตสกิล 1-2',
          fx: [{ k: 'strike', range: 160, dmg: 230, execBelow: 0.4, execMul: 1.8, resetOnKill: true, dashTo: true }] }
      ] },
    // ---------- ปัจจุบัน ----------
    { id: 'mae', name: 'แม่ค้าริมทาง', era: 3, role: 'support',
      strength: 'ฮีลและบัฟให้ทีม', weakness: 'ดาเมจต่ำ โดนจับก่อนเสมอ',
      colors: { body: '#ec407a', accent: '#fff59d', hair: '#4e342e' },
      skills: [
        { name: 'ข้าวห่อร้อน', cd: 5, ai: 'lowAlly', aiRange: 150,
          desc: 'โยนฮีลเล็กน้อยให้เพื่อน 1 คน',
          fx: [{ k: 'heal', who: 'lowest', r: 150, flat: 200 }] },
        { name: 'หม้อก๋วยเตี๋ยว', cd: 12, ai: 'allies', aiRange: 90,
          desc: 'วางพื้นที่ เพื่อนในพื้นที่ฟื้นเลือดต่อเนื่อง',
          fx: [{ k: 'zone', range: 40, r: 50, dur: 5, tick: 0.5, heal: 35, healAllies: true, nearSelf: true }] },
        { name: 'มื้อกลางวันของทีม', cd: 60, ai: 'lowAlly', aiRange: 130,
          desc: 'ฮีลคนใกล้ 5 วินาที และล้างสถานะลบ',
          fx: [{ k: 'heal', who: 'all', r: 130, pct: 0.22, hot: 5, cleanse: true }] }
      ] },
    { id: 'win', name: 'วินมอเตอร์ไซค์', era: 3, role: 'assassin',
      strength: 'เร็ว ชนแล้วถอยไว', weakness: 'เลือดต่ำ ดาเมจต่อครั้งน้อย',
      colors: { body: '#ff7043', accent: '#212121', hair: '#212121' },
      skills: [
        { name: 'บิดเร่ง', cd: 7, ai: 'enemy', aiRange: 160,
          desc: 'พุ่งตรงไกล ชนศัตรูเบา ๆ ระหว่างทาง',
          fx: [{ k: 'dash', dist: 150, dmg: 100, toTarget: true, range: 170, w: 16 }] },
        { name: 'เลี้ยวหนี', cd: 10, ai: 'escape', aiRange: 140,
          desc: 'เปลี่ยนทิศแล้วได้ความเร็วเพิ่มชั่วคราว',
          fx: [{ k: 'dash', dist: 55, dmg: 0, away: true }, { k: 'buff', who: 'self', dur: 2.5, speedMul: 1.35 }] },
        { name: 'ส่งด่วน', cd: 45, ai: 'ult', aiRange: 130,
          desc: 'พุ่ง 3 ครั้งต่อเนื่อง ผ่านศัตรูได้หลายคน',
          fx: [{ k: 'dash', dist: 110, dmg: 130, toTarget: true, range: 140, repeat: 3, gap: 0.3, w: 16 }] }
      ] },
    { id: 'chang', name: 'ช่างไฟนักประดิษฐ์', era: 3, role: 'mage',
      strength: 'ดาเมจลูกโซ่ วางอุปกรณ์ล่วงหน้า', weakness: 'อุปกรณ์ถูกทำลายได้ เลือดต่ำ',
      colors: { body: '#fdd835', accent: '#455a64', hair: '#263238' },
      skills: [
        { name: 'ประกายไฟ', cd: 5, ai: 'enemy', aiRange: 140,
          desc: 'ไฟฟ้ากระโดดต่อกัน 3 เป้า',
          fx: [{ k: 'chain', range: 150, n: 3, dmg: 125, jump: 70 }] },
        { name: 'หม้อแปลงตั้งพื้น', cd: 14, ai: 'enemy', aiRange: 120,
          desc: 'วางอุปกรณ์ 8 วินาที ยิงศัตรูที่เข้าใกล้',
          fx: [{ k: 'zone', range: 80, r: 70, dur: 8, tick: 0.6, dmg: 45, single: true, turret: true }] },
        { name: 'ไฟดับทั้งซอย', cd: 55, ai: 'ult', aiRange: 150,
          desc: 'พื้นที่ใหญ่ ศัตรูเห็นไม่ชัดและช้าลง 3 วินาที',
          fx: [{ k: 'zone', range: 150, r: 90, dur: 3, tick: 0.25, slow: 0.35, dmg: 8, blind: true }] }
      ] }
  ];

  TR.HERO_BY_ID = {};
  TR.HEROES.forEach(function (h) { TR.HERO_BY_ID[h.id] = h; });

  /* ประวัติอัปเดต — กล่องข้อความอัปเดตในเกมอ่านจากที่นี่
     ทุกครั้งที่อัปเดตเกม: เพิ่มรายการใหม่ไว้บนสุด และแก้ TR.VERSION ให้ตรงกัน
     ผู้เล่นที่ยังไม่เคยเห็นเวอร์ชันนั้นจะเห็นกล่องอัปเดตขึ้นเองตอนเปิดเกม */
  TR.CHANGELOG = [
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
