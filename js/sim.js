/* Thai Realm — แกนเกม (ไม่แตะหน้าจอ ทำงานได้ทั้งในเบราว์เซอร์และ Node สำหรับรันบอททดสอบสมดุล)
   ตรรกะเดินที่ 20 ครั้งต่อวินาที (TR.CFG.dt) */
(function (G) {
  'use strict';
  const TR = G.TR;
  const CFG = TR.CFG;

  /* ---------- ตัวช่วย ---------- */
  function dist(a, b) { return hyp(a.x - b.x, a.y - b.y); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function norm(x, y) { const l = hyp(x, y); return l < 1e-6 ? [1, 0] : [x / l, y / l]; }
  // ฟังก์ชันคณิตศาสตร์ที่ผลตรงกันทุกเบราว์เซอร์/ทุกเครื่อง (ใช้แค่ + - * / และ sqrt ซึ่งมาตรฐาน IEEE กำหนดผลตายตัว)
  // Math.hypot/sin/cos/atan2 ไม่การันตีว่าตรงกันข้ามเอนจิน จึงห้ามใช้ในตรรกะเกมที่ต้องซิงก์ออนไลน์
  const hyp = function (x, y) { return Math.sqrt(x * x + y * y); };
  const PI = 3.141592653589793, HPI = PI / 2, TWO_PI = PI * 2;
  function dsin(x) {
    x = x - TWO_PI * Math.floor((x + PI) / TWO_PI);   // -PI..PI
    if (x > HPI) x = PI - x; else if (x < -HPI) x = -PI - x;
    const x2 = x * x;
    return x * (1 + x2 * (-1 / 6 + x2 * (1 / 120 + x2 * (-1 / 5040 + x2 * (1 / 362880 + x2 * (-1 / 39916800 + x2 / 6227020800))))));
  }
  function dcos(x) { return dsin(x + HPI); }
  function datan(x) {   // |x| <= 1 ผ่านสูตรลดช่วง แล้วใช้อนุกรมอันดับสูง
    let inv = false, neg = x < 0; if (neg) x = -x;
    if (x > 1) { x = 1 / x; inv = true; }
    // ลดช่วงอีกชั้น: atan(x) = 2*atan(x / (1 + sqrt(1 + x^2)))
    x = x / (1 + Math.sqrt(1 + x * x));
    const x2 = x * x;
    let r = x * (1 + x2 * (-1 / 3 + x2 * (1 / 5 + x2 * (-1 / 7 + x2 * (1 / 9 + x2 * (-1 / 11 + x2 * (1 / 13 + x2 * (-1 / 15))))))));
    r *= 2;
    if (inv) r = HPI - r;
    return neg ? -r : r;
  }
  function datan2(y, x) {
    if (x === 0 && y === 0) return 0;
    if (x > 0) return datan(y / x);
    if (x < 0) return y >= 0 ? datan(y / x) + PI : datan(y / x) - PI;
    return y > 0 ? HPI : -HPI;
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function findFx(u, type) {
    for (let i = 0; i < u.fx.length; i++) if (u.fx[i].type === type) return u.fx[i];
    return null;
  }
  function removeFx(u, e) { const i = u.fx.indexOf(e); if (i >= 0) u.fx.splice(i, 1); }
  function addFx(u, e) {
    if (e.tag) for (let i = u.fx.length - 1; i >= 0; i--) if (u.fx[i].tag === e.tag) u.fx.splice(i, 1);
    u.fx.push(e);
  }
  // เสียงเอฟเฟกต์ (ส่งให้ฝั่งแสดงผลเล่น เฉพาะตอนมีหน้าจอ)
  function sfx(g, name, x, y, own) { if (VIS && g.sfx.length < 60) g.sfx.push({ n: name, x: x, y: y, own: !!own }); }
  function later(g, delay, fn) { g.timers.push({ at: g.t + delay, fn: fn }); }
  function ring(g, x, y, r, c, dur) { g.fx.push({ k: 'ring', x: x, y: y, r: r, c: c, t0: g.t, dur: dur || 0.3 }); }
  function line(g, a, b, c, dur) { g.fx.push({ k: 'line', x1: a.x, y1: a.y, x2: b.x, y2: b.y, c: c, t0: g.t, dur: dur || 0.12 }); }
  const VIS = typeof window !== 'undefined';
  // ลายนิ้วมือสถานะเกม: ทุกเครื่องในห้องเดียวกันต้องได้ค่าเดียวกันที่ tick เดียวกัน ถ้าต่างกัน = เกมเพี้ยน
  function hash(g) {
    let h = 2166136261 >>> 0;
    const buf = new Float64Array(1), u32 = new Uint32Array(buf.buffer);
    function mix(v) { buf[0] = v; h = Math.imul(h ^ u32[0], 16777619) >>> 0; h = Math.imul(h ^ u32[1], 16777619) >>> 0; }
    for (const u of g.units) { mix(u.id); mix(u.x); mix(u.y); mix(u.hp); if (u.type === 'hero') { mix(u.gold); mix(u.xp); mix(u.level); mix(u.kills); mix(u.deaths); mix(u.items.length); } }
    mix(g.t); mix(g.score[0]); mix(g.score[1]); mix(g.wards.length); mix(g.projs.length);
    return h.toString(16);
  }
  // เอฟเฟกต์สกิลฝั่งภาพ (ใส่ในคิว g.fx เฉพาะในเบราว์เซอร์ ไม่กระทบสถานะเกม วาดโดย js/vfx.js)
  function vfx(g, o) { if (VIS && g.fx.length < 260) { o.t0 = g.t; if (!o.dur) o.dur = (TR.Vfx ? TR.Vfx.dur(o.h, o.s, o.k) : 0.8); g.fx.push(o); } }
  const NEG = { stun: 1, slow: 1, root: 1, blind: 1, taunt: 1 };

  /* ---------- สร้างเกม ---------- */
  function createGame(opts) {
    opts = opts || {};
    const g = {
      t: 0, tick: 0, units: [], projs: [], zones: [], timers: [], fx: [], events: [],
      rand: mulberry32(opts.seed == null ? (Date.now() & 0x7fffffff) : opts.seed),
      vrand: mulberry32(20241021),   // ตัวสุ่มสำหรับภาพเท่านั้น ห้ามกระทบสถานะเกม
      over: false, winner: -1, era: 0, warned: -1, nextWave: CFG.firstWave, waveNo: 0,
      cmds: [], cmdSeq: 0, byId: {}, tutorial: !!opts.tutorial, diff: TR.DIFFS[opts.diff] ? opts.diff : 'normal', wards: [], bans: { me: [], bot: [] }, score: [0, 0], sfx: [], idc: 1, player: null, opts: opts, aiThink: TR.AI ? TR.AI.think : null
    };
    // ป้อม
    g.towers = [[[], [], []], [[], [], []]];   // [ทีม][เลน][ชั้น]
    g.kings = [null, null];
    for (let team = 0; team < 2; team++) {
      for (let l = 0; l < CFG.lanes.length; l++) {
        for (let i = 0; i < CFG.laneTowers.length; i++) {
          const c = CFG.laneTowers[i];
          g.towers[team][l][i] = mkUnit(g, { type: 'tower', team: team, lane: l, idx: i, name: c.name, x: team === 0 ? c.x : CFG.W - c.x, y: CFG.lanes[l].y,
            hp: c.hp, maxHp: c.hp, radius: 16, range: CFG.towerRange, baseArmor: 0.3, cdAtk: 0, tgt: null });
        }
      }
      const k = CFG.king;
      g.kings[team] = mkUnit(g, { type: 'tower', king: true, team: team, lane: -1, idx: CFG.laneTowers.length, name: k.name, x: team === 0 ? k.x : CFG.W - k.x, y: CFG.baseY,
        hp: k.hp, maxHp: k.hp, radius: 20, range: CFG.towerRange, baseArmor: 0.3, cdAtk: 0, tgt: null });
    }
    // มอนป่า
    for (let side = 0; side < 2; side++) {
      CFG.camps.forEach(function (c, i) {
        const M = TR.MONSTERS[c.kind], x = side === 0 ? c.x : CFG.W - c.x;
        mkUnit(g, { type: 'monster', team: 2, kind: c.kind, camp: i, side: side, home: { x: x, y: c.y }, x: x, y: c.y,
          hp: M.hp, maxHp: M.hp, radius: M.radius, range: M.range, dmg: M.atk, as: M.as, speed: 80, baseArmor: 0.15,
          leash: false, aggroBy: null, aggroT: -99, respawnAt: 0 });
      });
    }
    // บอสกลางป่า (ยังไม่เกิดจนถึง spawnAt)
    { const B = TR.BOSS, M = TR.MONSTERS.boss;
      g.boss = mkUnit(g, { type: 'monster', team: 2, kind: 'boss', camp: -1, side: -1, home: { x: B.x, y: B.y }, x: B.x, y: B.y,
        hp: 0, maxHp: M.hp, radius: M.radius, range: M.range, dmg: M.atk, as: M.as, speed: 70, baseArmor: 0.25,
        leash: false, aggroBy: null, aggroT: -99, respawnAt: TR.OBJ.first, dead: true, slamAt: 0, obj: 0, warned: false }); g.objBuf = [{ minion: 0, tower: 0 }, { minion: 0, tower: 0 }]; }
    // ผู้เล่นจริง: opts.humans = [{uid, hero, team, name, emblem, spell, lane}] (ทุกเครื่องต้องส่งรายการเดียวกัน ลำดับเดียวกัน)
    // ไม่ส่งมา = โหมดเดี่ยวแบบเดิม (ผู้เล่น 1 คนทีม 0 ใช้ opts.playerXxx)
    const humans = [];
    if (opts.humans && opts.humans.length) {
      for (const hm of opts.humans) humans.push({ uid: hm.uid, hero: hm.hero, team: hm.team ? 1 : 0, name: hm.name || '', emblem: hm.emblem, spell: hm.spell, lane: hm.lane });
    } else if (opts.playerHero) {
      humans.push({ uid: -1, hero: opts.playerHero, team: 0, name: opts.playerName || '', emblem: opts.playerEmblem, spell: opts.playerSpell, lane: opts.playerLane });
    }
    // ดราฟต์ฮีโร่: ไม่ซ้ำกันทั้งสองทีม (ผู้เล่นเลือกซ้ำกัน = คนหลังถูกสุ่มให้ใหม่ เหมือนกันทุกเครื่อง)
    const pool = TR.HEROES.map(function (h) { return h.id; });
    const picks = [[], []], hOf = [[], []];
    // แบนในห้องออนไลน์: เซิร์ฟเวอร์ส่งรายการแบนของแต่ละทีมมา ทุกเครื่องตัดออกจากกองกลางเหมือนกัน (ฮีโร่ที่ถูกแบนใครก็ใช้ไม่ได้)
    if (opts.roomBans) for (let t = 0; t < 2; t++) (opts.roomBans[t] || []).slice(0, CFG.ban.n).forEach(function (id) { const i = pool.indexOf(id); if (i >= 0 && pool.length > 10) { pool.splice(i, 1); (t === 0 ? g.bans.me : g.bans.bot).push(id); } });
    for (const hm of humans) {
      if (picks[hm.team].length >= 5) continue;
      let id = hm.hero; if (pool.indexOf(id) < 0) id = null;
      if (id == null) id = pool[Math.floor(g.rand() * pool.length)];
      pool.splice(pool.indexOf(id), 1); picks[hm.team].push(id); hOf[hm.team].push(hm);
    }
    const single = humans.length === 1 && !(opts.humans && opts.humans.length);
    // แบนฮีโร่ (โหมดเดี่ยวเท่านั้น): ผู้เล่นแบน (opts.playerBans) แล้วบอทแบนตามลำดับใน TR.BOT_BANS ถ้าไม่พอก็สุ่ม
    if (single && opts.playerBans && opts.playerBans.length) {
      opts.playerBans.slice(0, CFG.ban.n).forEach(function (id) { const i = pool.indexOf(id); if (i >= 0 && pool.length > 9) { pool.splice(i, 1); g.bans.me.push(id); } });
      const want = TR.BOT_BANS.filter(function (id) { return pool.indexOf(id) >= 0; });
      while (g.bans.bot.length < CFG.ban.n && pool.length > 9) {
        const id = want.length ? want.shift() : pool[Math.floor(g.rand() * pool.length)];
        const i = pool.indexOf(id); if (i < 0) continue;
        pool.splice(i, 1); g.bans.bot.push(id);
      }
    }
    function pull() { return pool.splice(Math.floor(g.rand() * pool.length), 1)[0]; }
    for (let t = 0; t < 2; t++) while (picks[t].length < 5) picks[t].push(pull());
    // เลน: ผู้เล่นเลือกเอง (ซ้ำกันได้) บอทเติมเลนที่เหลือจากแผนเดิมของทีมนั้น
    g.hu = {}; g.uu = {};   // hu = ผู้เล่นที่ยังคุมตัวอยู่ · uu = ตัวของทุกคน (รวมคนที่หลุดไปแล้ว ไว้คืนตัวให้ตอนกลับเข้าเกม)
    for (let team = 0; team < 2; team++) {
      const pool0 = CFG.botLanes.slice();
      for (const hm of hOf[team]) { if (hm.lane != null) { const i = pool0.indexOf(hm.lane); if (i >= 0) pool0.splice(i, 1); } else pool0.shift(); }
      let bi = 0;
      for (let s = 0; s < 5; s++) {
        const id = picks[team][s], hm = s < hOf[team].length ? hOf[team][s] : null, isPlayer = !!hm;
        const em = isPlayer ? (hm.emblem || 'kro') : botEmblem(g, id);
        const laneSel = isPlayer ? (hm.lane == null ? CFG.botLanes[0] : hm.lane) : pool0[bi++ % pool0.length];
        const h = mkHero(g, TR.HERO_BY_ID[id], team, em, s, isPlayer, laneSel);
        h.spell = isPlayer ? (hm.spell || 'heal') : botSpellPick(g, h);
        if (team === 1 && !isPlayer) { const D = TR.DIFFS[g.diff]; h.dmgBase = D.dmg; h.diffGold = D.gold; h.diffThink = D.think; }
        if (isPlayer) {
          h.pname = hm.name; h.uid = hm.uid === -1 ? h.id : hm.uid; g.hu[h.uid] = h; g.uu[h.uid] = h;
          if (opts.tutorial) h.gold = 800;
        }
      }
    }
    // ตัวผู้เล่นของเครื่องนี้ (เฉพาะส่วนแสดงผล/ควบคุม ห้ามใช้ตัดสินสถานะเกม)
    g.player = opts.me != null ? (g.hu[opts.me] || null) : (humans.length ? g.hu[Object.keys(g.hu)[0]] : null);
    return g;
  }

  /* ---------- สัญญาณทีม (ปักหมุด/แชทด่วน) บอทเพื่อนตอบสนอง ---------- */
  function signal(g, team, type, x, y, from) {
    g.sig = g.sig || [null, null];
    const dur = TR.SIGNALS[type] ? TR.SIGNALS[type].dur : 15;
    g.sig[team] = { type: type, x: x, y: y, until: g.t + dur, from: from ? from.id : -1 };
    g.pings = g.pings || [];
    g.pings.push({ team: team, type: type, x: x, y: y, t: g.t, until: g.t + Math.min(dur, 6) });
    if (g.pings.length > 8) g.pings.shift();
    // บอทเพื่อนในทีมตอบกลับ 1 คน
    const ans = g.units.filter(function (u) { return u.type === 'hero' && u.team === team && !u.isPlayer && !u.dead; });
    if (ans.length && TR.SIGNALS[type] && TR.SIGNALS[type].reply) {
      const a = ans[Math.floor(g.rand() * ans.length)];
      g.events.push({ k: 'chat', team: team, who: a.def.name, text: TR.SIGNALS[type].reply });
    }
  }
  function sigFor(g, u) { const s = g.sig && g.sig[u.team]; return s && g.t < s.until ? s : null; }

  function botSpellPick(g, h) {
    if (h.ai.jungle) return 'punish';
    const pool = ['heal', 'flash', 'sprint', 'purify', 'barrier', 'conch'];
    return pool[Math.floor(g.rand() * pool.length)];
  }
  function botEmblem(g, heroId) {
    const fit = TR.FIT[heroId];
    let tot = 0; for (let i = 0; i < 4; i++) tot += fit[i];
    let r = g.rand() * tot;
    for (let i = 0; i < 4; i++) { r -= fit[i]; if (r <= 0) return TR.EMBLEM_ORDER[i]; }
    return TR.EMBLEM_ORDER[3];
  }

  function mkUnit(g, o) {
    const u = Object.assign({ id: g.idc++, x: 0, y: 0, dead: false, fx: [], face: [1, 0], atkCd: 0, radius: 8, flash: 0,
      baseArmor: 0, m: { speed: 1, armor: 0, dmg: 1, ls: 0, tower: 1, stun: false, root: false, slow: 0, blind: false, stealth: false, atkSpd: 1, mres: 0 } }, o);
    u.px = u.x; u.py = u.y;
    g.units.push(u); g.byId[u.id] = u;
    return u;
  }

  function spawnPos(team, slot) { return { x: team === 0 ? 100 : CFG.W - 100, y: CFG.baseY - 90 + slot * 45 }; }

  function mkHero(g, def, team, emblem, slot, isPlayer, laneSel) {
    const lane0 = laneSel == null ? CFG.botLanes[slot] : laneSel;
    const r = TR.ROLES[def.role];
    const sp = spawnPos(team, slot);
    const u = mkUnit(g, {
      type: 'hero', def: def, team: team, role: def.role, emblem: emblem, isPlayer: isPlayer, slot: slot,
      x: sp.x, y: sp.y, hp: 1, maxHp: 1, radius: r.radius, baseArmor: r.armor, baseMres: r.mres || 0, itmFx: {}, itemCd: {}, wardN: CFG.ward.max, wardCd: 0, wardNext: 0, dmgLog: [], recap: null,
      level: 1, xp: 0, gold: 0, era: 0, items: [], itm: zeroItm(), cd: [0, 0, 0], spell: 'heal', spCd: 0, sl: [0, 0, 0], atkHold: false, atkBuf: -99, atkType: null, lockT: null, prio: 'near', autoSkill: !isPlayer, atkMode: 'auto', recall: null, hurtT: -99, input: { dx: 0, dy: 0 }, kills: 0, deaths: 0, cs: 0,
      bush: -1, revealT: 0, hid: [false, false], streak: 0, mkN: 0, mkT: -99, lastHitTeam: -1, stDmg: 0, stTwr: 0, stTaken: 0, stHeal: 0, stTowers: 0, stMon: 0, assists: 0, recent: {}, greedCount: 0, greedReady: false, decoyCd: 0, untarget: 0, still: 0, lastHeroHit: -99, auraT: 0,
      respawnAt: 0, casting: null, dash: null, aiTarget: null, nextMul: 0, goldTotal: 0,
      ai: { next: 0, retreat: false, yOff: (slot - 2) * 14, lane: lane0 < 0 ? 1 : lane0, jungle: lane0 < 0, defend: false, chk: 0 }
    });
    recalc(g, u);
    u.hp = u.maxHp;
    return u;
  }

  /* ---------- ค่าสถานะ ---------- */
  /* ---------- ร้านค้า ---------- */
  function canShop(u) {
    if (u.type !== 'hero') return false;
    if (u.dead) return true;
    const sp = u.team === 0 ? 100 : CFG.W - 100;
    return hyp(u.x - sp, u.y - CFG.baseY) < CFG.shopRange;
  }
  function zeroItm() { const t = {}; TR.ITEM_STATS.forEach(function (k) { t[k] = 0; }); return t; }
  function sumItems(u) {
    const t = zeroItm();
    u.items.forEach(function (id) { const s = TR.ITEM_BY_ID[id].s; Object.keys(s).forEach(function (k) { t[k] += s[k]; }); });
    u.itm = t;
    const fx = {}; u.items.forEach(function (id) { if (TR.ITEM_FX[id]) fx[id] = true; }); u.itmFx = fx;
  }
  // ชิ้นของสายเดียวกันที่ถืออยู่ (ถ้ามี)
  function ownedInLine(u, line) {
    for (let i = 0; i < u.items.length; i++) if (TR.ITEM_BY_ID[u.items[i]].line === line) return TR.ITEM_BY_ID[u.items[i]];
    return null;
  }
  // ราคาจริงหลังหักชิ้นล่างของสายเดียวกัน (null = ซื้อไม่ได้)
  // ไอเทมประจำยุค: ชิ้นย่อยที่ถืออยู่และนับเป็นส่วนประกอบ
  function recipeParts(u, it) {
    const out = [];
    it.recipe.forEach(function (rid) { const r = TR.ITEM_BY_ID[rid], hv = ownedInLine(u, r.line); if (hv && hv.tier >= r.tier && out.indexOf(hv) < 0) out.push(hv); });
    return out;
  }
  function netCost(u, it) {
    if (it.recipe) {
      if ((u.era | 0) < it.era || u.items.indexOf(it.id) >= 0) return null;
      const parts = recipeParts(u, it);
      if (u.items.length - parts.length >= CFG.shopSlots) return null;
      let c = it.cost; parts.forEach(function (p) { c -= p.cost; });
      return Math.max(Math.round(it.cost * CFG.recipeFloor), c);
    }
    const have = ownedInLine(u, it.line);
    if (have && have.tier >= it.tier) return null;
    if (!have && u.items.length >= CFG.shopSlots) return null;
    return it.cost - (have ? have.cost : 0);
  }
  function buy(g, u, id) {
    const it = TR.ITEM_BY_ID[id];
    if (!it || !canShop(u)) return false;
    const c = netCost(u, it);
    if (c == null || u.gold < c) return false;
    if (it.recipe) {
      recipeParts(u, it).forEach(function (p) { u.items.splice(u.items.indexOf(p.id), 1); });
      u.gold -= c; u.items.push(id); sumItems(u); recalc(g, u); if (u === g.player) sfx(g, 'buy', u.x, u.y, true);
      return true;
    }
    const have = ownedInLine(u, it.line);
    if (have) u.items.splice(u.items.indexOf(have.id), 1);
    u.gold -= c; u.items.push(id); sumItems(u); recalc(g, u); if (u === g.player) sfx(g, 'buy', u.x, u.y, true);
    return true;
  }
  function sell(g, u, id) {
    const i = u.items.indexOf(id);
    if (i < 0 || !canShop(u)) return false;
    u.items.splice(i, 1); u.gold += Math.floor(TR.ITEM_BY_ID[id].cost * 0.7); sumItems(u); recalc(g, u);
    return true;
  }

  // บอท: เก็บทีละสายตามลำดับของบทบาท ถ้าเงินไม่พอจะเก็บเงินรอ (ไม่ซื้อสายอื่นแทรก)
  function botEraItem(u) {
    if (u.items.length < 1) return null;
    let n = 0; u.items.forEach(function (id) { if (TR.ITEM_BY_ID[id].recipe) n++; });
    if (n >= CFG.botEraItems) return null;
    for (let i = 0; i < TR.ERA_ITEMS.length; i++) {
      const it = TR.ERA_ITEMS[i];
      if (it.roles.indexOf(u.role) < 0) continue;
      const c = netCost(u, it);
      if (c != null && u.gold >= c) return it.id;
    }
    return null;
  }
  function botNextItem(u) {
    const ei = botEraItem(u); if (ei) return ei;
    const list = (u.ai && u.ai.jungle ? TR.ITEM_BUILD_JUNGLE : TR.ITEM_BUILD[u.role]) || TR.ITEM_BUILD.fighter;
    for (let i = 0; i < list.length; i++) {
      const have = ownedInLine(u, list[i]), tier = have ? have.tier : 0;
      if (tier >= 3) continue;
      if (!have && u.items.length >= CFG.shopSlots) continue;
      const it = TR.itemAt(list[i], tier + 1);
      return netCost(u, it) != null && u.gold >= netCost(u, it) ? it.id : null;
    }
    return null;
  }
  function wantShop(u) { return !!botNextItem(u); }
  function botShop(g, u) {
    if (u.isPlayer || !canShop(u)) return;
    for (let n = 0; n < 4; n++) { const id = botNextItem(u); if (!id || !buy(g, u, id)) break; }
  }

  function goldMul(u) { return (TR.EMBLEMS[u.emblem].goldMul || 1) * (1 + (u.itm ? u.itm.gold : 0)) * (u.def && u.def.passive && u.def.passive.id === 'mae' ? 1.12 : 1) * (u.diffGold || 1); }
  function recalc(g, u) {
    const r = TR.ROLES[u.role], em = TR.EMBLEMS[u.emblem];
    const lv = 1 + CFG.levelBonus * (u.level - 1);
    const pk = u.def.era === g.era ? CFG.peak : 1;
    u.peak = pk > 1;
    const hb = TR.HERO_BAL[u.def.id] || { hp: 1, dmg: 1 };
    const nm = r.hp * lv * (1 + u.itm.hp) * pk * (em.hpMul || 1) * hb.hp;
    if (nm !== u.maxHp) { const pct = u.maxHp > 0 ? u.hp / u.maxHp : 1; u.maxHp = nm; u.hp = Math.min(nm, pct * nm); }
    u.dmgBase = lv * (1 + u.itm.dmg) * pk * (em.dmgMul || 1) * hb.dmg;
    u.baseSpeed = r.speed;
  }

  // พลังติดตัวที่ปรับค่าสถานะ (เกราะ/ความเร็ว/ตีเร็ว)
  function heroPassiveStats(g, u, m) {
    const pid = u.def.passive && u.def.passive.id;
    if (pid === 'kwan' && u.hp < u.maxHp * 0.5) { m.armor += 0.1; m.speed *= 1.1; }
    else if (pid === 'muay' && u.pStack > 0 && u.pT > g.t) m.atkSpd *= 1 + 0.05 * u.pStack;
    else if (pid === 'win' && u.run > 0) m.speed *= 1 + Math.min(0.15, 0.03 * u.run);
    else if (pid === 'khunsuek' && u.still >= TR.PASSIVE.khunsuek.still) m.armor += TR.PASSIVE.khunsuek.armor;
    else if (pid === 'jaa' && u.hp < u.maxHp * TR.PASSIVE.jaa.hpBelow) m.ls += TR.PASSIVE.jaa.ls;
    // พ่อเมือง: เพื่อนใกล้ ๆ ได้เกราะ
    for (const y of g.units) {
      if (y.type !== 'hero' || y.dead || y.team !== u.team || y === u || !y.def.passive || y.def.passive.id !== 'yai') continue;
      if (hyp(y.x - u.x, y.y - u.y) <= 220) { m.armor += 0.05; break; }
    }
  }
  function aggregate(g, u) {
    const t = g.t;
    const m = { speed: 1, armor: 0, dmg: 1, ls: 0, tower: 1, stun: false, root: false, slow: 0, blind: false, stealth: false, atkSpd: 1, mres: 0 };
    let imm = false;
    for (let i = u.fx.length - 1; i >= 0; i--) {
      const e = u.fx[i];
      if (e.until <= t) { u.fx.splice(i, 1); continue; }
      switch (e.type) {
        case 'stun': m.stun = true; break;
        case 'root': m.root = true; break;
        case 'slow': if (e.pct > m.slow) m.slow = e.pct; break;
        case 'blind': m.blind = true; break;
        case 'buff':
          if (e.speedMul) m.speed *= e.speedMul;
          if (e.armorAdd) m.armor += e.armorAdd;
          if (e.mresAdd) m.mres += e.mresAdd;
          if (e.dmgMul) m.dmg *= e.dmgMul;
          if (e.lifesteal) m.ls += e.lifesteal;
          if (e.towerMul) m.tower *= e.towerMul;
          if (e.ccImmune) imm = true;
          if (e.stealth) m.stealth = true;
          if (e.atkSpd) m.atkSpd *= e.atkSpd;
          break;
      }
    }
    if (imm) { m.stun = false; m.root = false; m.slow = 0; }
    m.armor += u.baseArmor; m.mres += u.baseMres || 0;
    if (u.type === 'hero') {
      const em = TR.EMBLEMS[u.emblem];
      m.armor += (em.armorAdd || 0) + u.itm.armor; m.mres += u.itm.mres;
      heroPassiveStats(g, u, m);
      m.speed *= (em.speedMul || 1) * (1 + u.itm.speed);
      m.ls += u.itm.ls; m.atkSpd *= 1 + u.itm.atkSpd; m.tower *= 1 + u.itm.tower;
    }
    u.m = m;
  }

  function towerVuln(g, t) {
    if (t.king) {
      for (let l = 0; l < CFG.lanes.length; l++) if (g.towers[t.team][l][CFG.laneTowers.length - 1].dead) return true;
      return false;
    }
    if (t.idx === 0) return true;
    return g.towers[t.team][t.lane][t.idx - 1].dead;
  }

  /* ---------- พุ่มไม้: ซ่อนตัว ---------- */
  function bushAt(x, y) {
    const B = TR.BUSHES;
    for (let i = 0; i < B.length; i++) if ((x - B[i].x) * (x - B[i].x) + (y - B[i].y) * (y - B[i].y) <= B[i].r * B[i].r) return i;
    return -1;
  }
  // อัปเดตว่าฮีโร่คนไหนซ่อนอยู่จากทีมไหน (ทำทุกก้าวก่อนอัปเดตหน่วย)
  function updateVision(g) {
    const hs = [];
    for (const u of g.units) if (u.type === 'hero') { u.bush = u.dead ? -1 : bushAt(u.x, u.y); hs.push(u); }
    // วอร์ด: ศัตรูเดินทับแล้วพัง
    for (let i = g.wards.length - 1; i >= 0; i--) {
      const w = g.wards[i]; let gone = g.t >= w.until;
      if (!gone) for (const e of hs) if (!e.dead && e.team !== w.team && hyp(e.x - w.x, e.y - w.y) <= CFG.ward.sweep) { gone = true; sfx(g, 'ping', w.x, w.y, false); break; }
      if (gone) g.wards.splice(i, 1);
    }
    if (CFG.fog) {   // หมอกสงคราม: u.vis[t] = ทีม t มองเห็นหน่วยนี้ไหม (คำนวณจากระยะถึงตัวมองของทีม t เท่านั้น ใช้ + − × ล้วน)
      const V = CFG.vision, src = [[], []], wr2 = CFG.ward.r * CFG.ward.r;
      for (const u of g.units) {
        if (u.dead || (u.team !== 0 && u.team !== 1)) continue;
        const r = u.type === 'hero' ? V.hero : u.type === 'minion' ? V.minion : u.type === 'tower' ? (u.king ? V.king : V.tower) : 0;
        if (r) src[u.team].push(u.x, u.y, r * r);
      }
      for (const w of g.wards) src[w.team].push(w.x, w.y, wr2);
      g.visSrc = src;   // ให้ฝั่งแสดงผลวาดหมอก/ซ่อนของนอกวงมอง
      for (const u of g.units) {
        if (!u.vis) u.vis = [true, true];
        for (let t = 0; t < 2; t++) {
          if (u.team === t || u.type === 'tower') { u.vis[t] = true; continue; }
          const S = src[t]; let sn = false;
          for (let i = 0; i < S.length; i += 3) { const dx = S[i] - u.x, dy = S[i + 1] - u.y; if (dx * dx + dy * dy <= S[i + 2]) { sn = true; break; } }
          u.vis[t] = sn;
        }
      }
    }
    for (const u of hs) {
      u.hid[0] = u.hid[1] = false;
      if (u.bush < 0 || u.revealT > g.t) continue;
      for (let t = 0; t < 2; t++) {
        if (t === u.team) continue;
        let seen = false;
        for (const e of hs) {
          if (e.team !== t || e.dead) continue;
          if (e.bush === u.bush || hyp(e.x - u.x, e.y - u.y) <= CFG.bush.sight) { seen = true; break; }
        }
        if (!seen) for (const w of g.wards) if (w.team === t && hyp(w.x - u.x, w.y - u.y) <= CFG.ward.r) { seen = true; break; }
        u.hid[t] = !seen;
      }
    }
  }
  // มีมินเนียนฝั่งที่โจมตีอยู่ใกล้ป้อมพอ = บุกตามปกติ
  function towerHasCover(g, tw) {
    const R = CFG.backdoor.r, atk = 1 - tw.team;
    for (const m of g.units) if (m.type === 'minion' && m.team === atk && !m.dead && Math.abs(m.x - tw.x) < R && Math.abs(m.y - tw.y) < R && hyp(m.x - tw.x, m.y - tw.y) < R) return true;
    return false;
  }
  function canTarget(g, src, dst) {
    if (!dst || dst.dead || dst.team === src.team) return false;
    if (dst.type === 'tower' && !towerVuln(g, dst)) return false;
    if (dst.vis && dst.vis[src.team] === false) return false;   // อยู่ในหมอก
    if (dst.type === 'hero') {
      if (dst.untarget > g.t) return false;
      if (dst.hid[src.team]) return false;
      if (dst.m.stealth) {
        const mk = findFx(dst, 'mark');
        const revealed = (src.type === 'tower' && TR.ERAS[g.era].tower.reveal) || (mk && mk.team === src.team);
        if (!revealed) return false;
      }
    }
    return true;
  }

  function lockOf(g, u, range, heroOnly) {
    const L = u.lockT;
    if (!L || L.dead || !canTarget(g, u, L) || dist(u, L) > 520) { u.lockT = null; return null; }
    if (heroOnly && L.type !== 'hero') return null;
    return dist(u, L) - L.radius <= range ? L : null;
  }
  function pickEnemy(g, u, range, heroOnly, heroFirst) {
    if (u.isPlayer && u.lockT) { const L = lockOf(g, u, range, heroOnly); if (L) return L; }
    let best = null, bd = 1e9, bh = null, bhd = 1e9;
    for (let i = 0; i < g.units.length; i++) {
      const e = g.units[i];
      if (e.team === u.team || e.dead || !canTarget(g, u, e)) continue;
      const d = dist(u, e) - e.radius;
      if (d > range) continue;
      if (e.type === 'hero' && d < bhd) { bhd = d; bh = e; }
      if (d < bd) { bd = d; best = e; }
    }
    if (heroOnly) return bh;
    return heroFirst ? (bh || best) : best;
  }

  function enemiesIn(g, team, x, y, r, noTower) {
    const out = [];
    for (let i = 0; i < g.units.length; i++) {
      const e = g.units[i];
      if (e.team === team || e.dead) continue;
      if (noTower && e.type === 'tower') continue;
      if (e.type === 'tower' && !towerVuln(g, e)) continue;
      if (e.type === 'hero' && (e.untarget > g.t || e.m.stealth)) continue;
      if (hyp(e.x - x, e.y - y) - e.radius <= r) out.push(e);
    }
    return out;
  }

  function alliedHeroes(g, team, x, y, r) {
    const out = [];
    for (let i = 0; i < g.units.length; i++) {
      const e = g.units[i];
      if (e.type === 'hero' && e.team === team && !e.dead && hyp(e.x - x, e.y - y) <= r) out.push(e);
    }
    return out;
  }

  /* ---------- พลังติดตัวฮีโร่ + เอฟเฟกต์ไอเทม ---------- */
  function passiveDmg(g, src, dst, o) {
    let mul = 1;
    const pid = src.def.passive && src.def.passive.id;
    if (pid === 'nakdab' && o.basic) { src.pN = (src.pN || 0) + 1; if (src.pN >= 4) { src.pN = 0; mul *= 1.6; } }
    else if (pid === 'phran' && dst.m && (dst.m.slow > 0 || dst.m.root)) mul *= 1.15;
    else if (pid === 'pun' && o.basic) { src.pN = (src.pN || 0) + 1; if (src.pN >= TR.PASSIVE.pun.every) { src.pN = 0; mul *= TR.PASSIVE.pun.mul; } }
    else if (pid === 'seri' && src.bush >= 0) mul *= 1.25;
    else if (pid === 'spy' && dst.face) {
      const vx = src.x - dst.x, vy = src.y - dst.y, l = hyp(vx, vy) || 1;
      if ((vx * dst.face[0] + vy * dst.face[1]) / l < -0.3) mul *= 1.3;
    }
    if (o.basic && src.itmFx && src.itmFx.atk3 && dst.hp / dst.maxHp < 0.3) mul *= 1.25;
    if (o.basic && src.itmFx) {
      if (src.itmFx.e1a && dst.m && (dst.m.stun || dst.m.root || dst.m.slow > 0.05)) mul *= 1 + TR.ITEM_FX.e1a.amp;
      if (src.itmFx.e2a && src.bush >= 0) mul *= 1 + TR.ITEM_FX.e2a.amp;
    }
    return mul;
  }
  function onHitEffects(g, src, dst, d, o) {
    // ปราการสะท้อน
    if (dst.type === 'hero' && dst.itmFx && dst.itmFx.wall3 && o.basic && src.type !== 'tower' && !dst.dead)
      hit(g, dst, src, d * 0.1, { raw: true, noCounter: true, extra: true });
    if (src.type !== 'hero') return;
    const F = src.itmFx || {};
    const pid = src.def.passive && src.def.passive.id;
    if (o.basic) {
      if (o.basic && dst.type === 'hero') {
        if (F.e0a) healUnit(g, src, src.maxHp * TR.ITEM_FX.e0a.heal);
        if (F.e3c) for (let ci = 0; ci < 3; ci++) src.cd[ci] = Math.max(0, src.cd[ci] - TR.ITEM_FX.e3c.cd);
      }
      if (F.spd3 && dst.type !== 'tower') addFx(dst, { type: 'slow', tag: 'spd3' + src.id, pct: 0.15, until: g.t + 1.5 });
      if (F.pen3 && dst.type === 'hero') {
        const tag = 'shred' + src.id; let cur = null;
        for (const e of dst.fx) if (e.tag === tag) cur = e;
        const n = Math.min(5, (cur ? cur.n : 0) + 1);
        addFx(dst, { type: 'buff', tag: tag, n: n, armorAdd: -0.03 * n, until: g.t + 4 });
      }
      if (F.cdr3 && src.sbT > g.t) { src.sbT = 0; hit(g, src, dst, 80, { raw: true, mag: true, extra: true }); }
      if (F.siege3 && dst.type === 'minion') {
        for (const e of g.units) if (e !== dst && e.type === 'minion' && e.team === dst.team && !e.dead && hyp(e.x - dst.x, e.y - dst.y) < 90) hit(g, src, e, d * 0.4, { raw: true, extra: true });
      }
      if (pid === 'traffic' && dst.type !== 'tower') addFx(dst, { type: 'slow', tag: 'tfslow' + src.id, pct: TR.PASSIVE.traffic.slow, until: g.t + TR.PASSIVE.traffic.dur });
      if (pid === 'press' && dst.type !== 'tower') { src.pB = (src.pB || 0) + 1; if (src.pB >= TR.PASSIVE.press.every) { src.pB = 0; addFx(dst, { type: 'blind', tag: 'prblind', until: g.t + TR.PASSIVE.press.blind }); ring(g, dst.x, dst.y, 16, '#fffde7', 0.25); } }
      if (pid === 'muay') { src.pStack = Math.min(5, (src.pT > g.t ? src.pStack : 0) + 1); src.pT = g.t + 3; }
    }
    if (o.skill) {
      if (F.mpen3 && dst.type !== 'tower') addFx(dst, { type: 'slow', tag: 'mpen3' + src.id, pct: 0.12, until: g.t + 1 });
      if (pid === 'chang' && dst.type === 'hero') {
        if (src.shT && g.t - src.shT < 5) src.shN++; else src.shN = 1;
        src.shT = g.t;
        if (src.shN >= 3) {
          src.shN = 0;
          hit(g, src, dst, Math.min(260, dst.maxHp * 0.05), { raw: true, mag: true, extra: true });
          addFx(dst, { type: 'stun', until: g.t + 0.4 });
          ring(g, dst.x, dst.y, 30, '#80d8ff', 0.3);
        }
      }
    }
  }

  /* ---------- ความเสียหาย ---------- */
  function hit(g, src, dst, base, o) {
    o = o || {};
    if (!dst || dst.dead) return 0;
    if (dst.type === 'tower' && !towerVuln(g, dst)) return 0;
    let d = base;
    if (!o.raw && src) {
      d *= (src.dmgBase || 1) * (src.m ? src.m.dmg : 1) * (o.mul || 1);
      if (src.type === 'hero') d *= passiveDmg(g, src, dst, o);
      if (src.type === 'minion' && g.objBuf && g.objBuf[src.team].minion > g.t) d *= TR.OBJ.list[1].minion.dmg;
      else if (src.type === 'tower' && g.objBuf && g.objBuf[src.team].tower > g.t) d *= TR.OBJ.list[2].tower.dmg;
      if (src.type === 'hero' && src.emblem === 'kro' && dst.hp / dst.maxHp < 0.4) d *= 1.1;
      if (dst.type === 'tower') {
        d *= (src.m ? src.m.tower : 1) * (src.type === 'minion' ? (src.cannon ? CFG.cannon.towerMul : 0.4) : 1);
        if (src.type === 'hero' && !towerHasCover(g, dst)) d *= CFG.backdoor.dmgMul;   // กันบุกหลังป้อม: ไม่มีมินเนียนช่วยดัน ตีป้อมได้ไม่เจ็บ
      }
      if (src.itm) {
        if (dst.type === 'monster' && src.itm.jungle) d *= 1 + src.itm.jungle;
        if (o.basic && src.itm.crit > 0 && g.rand() < src.itm.crit) d *= CFG.critMul + (src.itmFx && src.itmFx.crit3 ? 0.3 : 0);
      }
      const mk = findFx(dst, 'mark');
      if (mk && src.team === mk.team) d *= 1 + mk.mul;
    }
    const ctr = findFx(dst, 'counter');
    if (ctr && !o.noCounter && src && src.type !== 'tower' && dist(src, dst) < 80) {
      d *= 1 - ctr.reduce;
      removeFx(dst, ctr);
      ring(g, dst.x, dst.y, 26, '#ffd54f', 0.25);
      hit(g, dst, src, ctr.dmg, { noCounter: true });
    }
    const mag = !!(src && src.type === 'hero' && (o.mag != null ? o.mag : (o.skill ? src.def.skillMag : (o.basic ? src.def.basicMag : false))));
    d *= 1 - clamp(mag ? dst.m.mres - (src.itm ? src.itm.mpen : 0) : dst.m.armor - (src && src.itm ? src.itm.pen : 0), -0.5, 0.85);
    const lk = findFx(dst, 'link');
    if (lk && lk.by && !lk.by.dead && lk.by !== dst) {
      const sh = d * lk.share; d -= sh;
      applyDirect(g, lk.by, sh, src);
    }
    d = absorb(dst, d, g.t);
    if (d <= 0) return 0;
    dst.hp -= d;
    dst.flash = g.t + 0.08;
    if (dst.itmFx && dst.itmFx.e2b && dst.type === 'hero' && dst.hp > 0 && dst.hp / dst.maxHp < TR.ITEM_FX.e2b.below && (dst.itemCd.e2b || 0) <= g.t) {
      dst.itemCd.e2b = g.t + TR.ITEM_FX.e2b.cd; addFx(dst, { type: 'shield', tag: 'it_e2b', amt: dst.maxHp * TR.ITEM_FX.e2b.shield, until: g.t + 3 });
    }
    if (dst.type === 'hero') { dst.hurtT = g.t; dst.stTaken += d; if (dst.isPlayer) logDmg(g, dst, src, d, mag); }
    if (src && src.type === 'hero') {
      if (dst.type === 'hero') { src.stDmg += d; dst.recent[src.id] = { u: src, t: g.t }; } else if (dst.type === 'tower') src.stTwr += d;
    }
    if (VIS && src && src.type === 'hero' && (o.skill || o.basic) && g.t - (dst.impT || 0) > 0.1) { dst.impT = g.t; vfx(g, { k: 'imp', h: src.def.id, s: o.skill ? (src.vSlot | 0) : -1, x: dst.x, y: dst.y, r: dst.radius, dx: dst.x - src.x, dy: dst.y - src.y }); }
    if (VIS && (dst.type === 'hero' || dst.type === 'tower' || (src && src.isPlayer)) && g.fx.length < 150) g.fx.push({ k: 'dmg', x: dst.x + (g.vrand() - 0.5) * 8, y: dst.y - 22, v: Math.round(d), c: mag ? '#b388ff' : (dst.type === 'hero' ? (dst.team === 0 ? '#ff8a80' : '#fff59d') : '#ffffff'), t0: g.t, dur: 0.8, big: dst.type === 'hero' || (src && src.isPlayer) });
    if (VIS && dst.type === 'hero' && g.fx.length < 200) {   // จอสั่น/หน่วงเฟรมตอนโดนหรือโจมตีหนัก (ภาพล้วน ไม่กระทบการจำลอง)
      const heavy = CFG.juice.heavyFrac;
      if (dst.isPlayer && d >= dst.maxHp * heavy) { g.fx.push({ k: 'shake', amp: CFG.juice.hurtShake, t0: g.t, dur: 0.28 }); g.fx.push({ k: 'flash', c: '#d32f2f', a: 0.28, t0: g.t, dur: 0.3 }); }
      else if (src && src.isPlayer && d >= dst.maxHp * heavy) { g.fx.push({ k: 'shake', amp: CFG.juice.hitShake, t0: g.t, dur: 0.2 }); g.fx.push({ k: 'stop', ms: CFG.juice.hitStopMs, t0: g.t, dur: 0.1 }); }
    }
    if (src) {
      if (src.m && src.m.ls > 0 && !src.dead) { const b4 = src.hp; src.hp = Math.min(src.maxHp, src.hp + d * src.m.ls); if (src.type === 'hero') src.stHeal += src.hp - b4; }
      if (src.type === 'hero') src.revealT = g.t + CFG.bush.reveal;
      if (src.type === 'hero' && dst.type === 'hero') { src.lastHeroHit = g.t; src.lastHitTeam = dst.team; }
      if (src.type === 'hero') { const st = findFxStealth(src); if (st && !o.keepStealth) removeFx(src, st); }
    }
    dst.lastAttacker = src; if (dst.type === 'tower') dst.lastHurt = g.t;
    if (dst.type === 'tower' && src && src.team !== dst.team && (dst.team === 0 || dst.team === 1) && g.t - (dst.alertT || -99) > CFG.alertGap) {   // เตือนป้อม/ฐานถูกโจมตี
      dst.alertT = g.t; g.alertPts = (g.alertPts || []).filter(function (a) { return a.until > g.t; });
      g.alertPts.push({ x: dst.x, y: dst.y, team: dst.team, king: !!dst.king, until: g.t + 6 });
      g.events.push({ k: 'alert', team: dst.team, king: !!dst.king, name: dst.name, x: dst.x, y: dst.y });
    }
    if (VIS && o.basic && src) sfx(g, src.type === 'tower' ? 'shot' : (src.type === 'minion' ? 'minion' : (dst.type === 'hero' ? 'hitHero' : 'hit')), dst.x, dst.y, (src === g.player || dst === g.player));
    if (src && !o.extra && dst.hp > 0) onHitEffects(g, src, dst, d, o);
    if (dst.type === 'monster' && src) { dst.aggroBy = src; dst.aggroT = g.t; }
    if (dst.hp <= 0) kill(g, dst, src, o);
    return d;
  }
  function findFxStealth(u) {
    for (let i = 0; i < u.fx.length; i++) if (u.fx[i].type === 'buff' && u.fx[i].stealth) return u.fx[i];
    return null;
  }
  function absorb(u, d, t) {
    for (let i = 0; i < u.fx.length && d > 0; i++) {
      const e = u.fx[i];
      if (e.type === 'shield' && e.until > t && e.amt > 0) { const a = Math.min(e.amt, d); e.amt -= a; d -= a; }
    }
    return d;
  }
  function applyDirect(g, u, d, src) {
    if (u.dead) return;
    d = absorb(u, d, g.t);
    if (d <= 0) return;
    u.hp -= d;
    if (u.hp <= 0) kill(g, u, src, {});
  }
  function healUnit(g, u, amt) {
    if (u.dead || amt <= 0) return;
    const b4 = u.hp; u.hp = Math.min(u.maxHp, u.hp + amt);
    if (u.type === 'hero') u.stHeal += u.hp - b4;
  }

  // ประกาศ: ฆ่าคนแรก / ฆ่าต่อเนื่องในช่วงสั้น (Double...) / สตรีค / หยุดสตรีค / ทีมแตก
  const MK_TXT = ['', '', 'ฆ่าสองศพ!', 'ฆ่าสามศพ ไม่หยุด!', 'สี่ศพรวด!', 'ห้าศพ! ล้างทีม!'];
  const ST_TXT = { 3: 'ฆ่าต่อเนื่อง 3 ศพ', 4: 'ฆ่าต่อเนื่อง 4 ศพ โหดมาก', 5: 'ฆ่าต่อเนื่อง 5 ศพ คลั่งแล้ว', 6: 'ฆ่าต่อเนื่อง 6 ศพ เหนือมนุษย์', 7: 'ฆ่าต่อเนื่อง 7 ศพ ตำนาน' };
  function announceKill(g, killer, victim) {
    const ev = function (kind, text, sub, n) { g.events.push({ k: 'announce', kind: kind, team: killer.team, text: text, sub: sub, n: n || 0 }); };
    killer.streak++;
    killer.mkN = g.t - killer.mkT <= CFG.multiKillWin ? killer.mkN + 1 : 1; killer.mkT = g.t;
    const sub = killer.def.name + ' ปราบ ' + victim.def.name;
    if (!g.firstBlood) { g.firstBlood = true; ev('first', 'ฆ่าคนแรก!', sub); return; }
    if (victim.streak >= 3) ev('shutdown', 'หยุดสตรีค!', killer.def.name + ' หยุดสตรีค ' + victim.streak + ' ศพของ ' + victim.def.name, victim.streak);
    let aceAll = true;
    for (const e of g.units) if (e.type === 'hero' && e.team === victim.team && !e.dead && e !== victim) { aceAll = false; break; }
    if (aceAll) { ev('ace', 'ทีมแตก!', 'ศัตรูตายหมดทั้งทีม · ' + sub); return; }
    if (killer.mkN >= 2) ev('multi', MK_TXT[Math.min(5, killer.mkN)], sub, killer.mkN);
    else if (killer.streak >= 3) ev('streak', ST_TXT[Math.min(7, killer.streak)], sub, killer.streak);
  }

  /* ---------- ยอมแพ้ (โหวตทีม) ---------- */
  function surrenderState(g, team) {
    let down = 0, lost = 0, kd = g.score[team] - g.score[1 - team];
    for (const u of g.units) if (u.type === 'tower' && u.dead && !u.king) { if (u.team === team) lost++; else down++; }
    return { lost: lost, down: down, kd: kd };
  }
  function botWantsSurrender(g, team) {
    const st = surrenderState(g, team);
    return (st.lost - st.down >= 2 && st.kd <= -6) || (st.lost >= 4 && st.kd <= -3) || (st.lost - st.down >= 3);
  }
  // โหวตยอมแพ้: เริ่มโหวตโดยผู้เล่นคนหนึ่ง (=1 เสียง) บอทเพื่อนโหวตตามสถานการณ์ ถ้ามีเพื่อนที่เป็นคนจริง ต้องกดยอมแพ้ตามภายใน CFG.surrender.vote วินาที
  // ต้องผ่านกี่โหวตดู CFG.surrender.need
  function callSurrender(g, team, u) {
    const C = CFG.surrender;
    if (g.over) return { ok: false, msg: 'จบเกมแล้ว' };
    if (g.t < C.after) return { ok: false, msg: 'ยอมแพ้ได้หลังนาทีที่ ' + Math.floor(C.after / 60) };
    g.sv = g.sv || [null, null];
    let v = g.sv[team];
    if (v && g.t < v.until) {   // มีโหวตเปิดอยู่: เพิ่มเสียงของคนนี้
      if (u && v.who.indexOf(u.id) >= 0) return { ok: false, msg: 'คุณโหวตไปแล้ว' };
      if (u) v.who.push(u.id);
      return finishVote(g, team, v);
    }
    g.surCd = g.surCd || [0, 0];
    if (g.t < g.surCd[team]) return { ok: false, msg: 'โหวตใหม่ได้อีก ' + Math.ceil(g.surCd[team] - g.t) + ' วินาที' };
    let bots = 0; const want = botWantsSurrender(g, team);
    for (const x of g.units) if (x.type === 'hero' && x.team === team && !x.isPlayer) { if (want || (x.dead && g.rand() < 0.3)) bots++; }
    v = g.sv[team] = { who: u ? [u.id] : [], bots: bots, until: g.t + C.vote };
    g.surCd[team] = g.t + C.cooldown;
    const humansLeft = g.units.some(function (x) { return x.type === 'hero' && x.team === team && x.isPlayer && v.who.indexOf(x.id) < 0 && !x.dead; });
    if (humansLeft && v.who.length + v.bots < C.need) { g.events.push({ k: 'chat', team: team, who: u ? (u.pname || u.def.name) : 'ทีม', text: 'เสนอยอมแพ้ — กดยอมแพ้ตามเพื่อโหวต (' + (v.who.length + v.bots) + '/' + C.need + ')' }); return { ok: true, passed: false, yes: v.who.length + v.bots, msg: 'เปิดโหวตแล้ว รอเพื่อนร่วมทีม (' + (v.who.length + v.bots) + '/' + C.need + ')' }; }
    return finishVote(g, team, v);
  }
  function finishVote(g, team, v) {
    const C = CFG.surrender, yes = v.who.length + v.bots;
    if (yes >= C.need) {
      g.over = true; g.winner = 1 - team; g.surrendered = team; g.sv[team] = null;
      g.events.push({ k: 'over', winner: g.winner }); return { ok: true, passed: true, yes: yes, msg: 'ทีมยอมแพ้ (' + yes + '/5 โหวต)' };
    }
    return { ok: true, passed: false, yes: yes, msg: 'โหวต ' + yes + '/' + C.need };
  }

  function addGold(u, n) { u.gold += n; u.goldTotal += n; }
  // เหรียญทองลอย + เสียงกริ๊ง (เห็นเฉพาะทองของผู้เล่นเอง เป็นภาพล้วน ไม่กระทบตรรกะ)
  function goldPop(g, u, n, x, y, big) {
    if (!VIS || !g.player || u !== g.player || n < 1) return;
    if (g.fx.length < 150) g.fx.push({ k: 'gold', x: x + (g.vrand() - 0.5) * 6, y: y - 20, v: Math.round(n), big: !!big, t0: g.t, dur: big ? 1.1 : 0.85 });
    sfx(g, 'coin', x, y, true);
  }
  function addXp(g, u, n) {
    if (u.level >= CFG.maxLevel) return;
    u.xp += n;
    while (u.level < CFG.maxLevel && u.xp >= 90 + 40 * u.level) {
      u.xp -= 90 + 40 * u.level;
      u.level++; if (u === g.player) sfx(g, 'levelup', u.x, u.y, true);
      if (VIS && u.type === 'hero' && g.fx.length < 200) g.fx.push({ k: 'lvl', x: u.x, y: u.y, lv: u.level, me: u === g.player, c: u.team === 0 ? '#80d8ff' : '#ff8a80', t0: g.t, dur: 1.1 });
    }
  }

  function kill(g, dst, src, o) {
    if (dst.dead) return;
    if (dst.type === 'hero' && dst.itmFx && dst.itmFx.life3 && (dst.itemCd.life3 || 0) <= g.t) {
      dst.itemCd.life3 = g.t + 180; dst.hp = dst.maxHp * 0.25; dst.untarget = g.t + 1.5;
      ring(g, dst.x, dst.y, 44, '#fff59d', 0.6); return;
    }
    dst.dead = true; dst.hp = 0; dst.dieT = g.t;
    if (VIS) g.fx.push({ k: 'burst', x: dst.x, y: dst.y, c: dst.type === 'tower' ? '#bcaaa4' : (dst.team === 0 ? '#64b5f6' : '#ef5350'), n: dst.type === 'minion' ? 6 : (dst.type === 'hero' ? 14 : 24), t0: g.t, dur: 0.8 });
    if (dst.type === 'hero') {
      sfx(g, 'die', dst.x, dst.y, dst === g.player);
      if (VIS) {
        const kl = src && src.type === 'hero' ? src : null;
        g.fx.push({ k: 'kill', x: dst.x, y: dst.y, c: kl ? (kl.team === 0 ? '#80d8ff' : '#ff8a80') : '#ffffff', big: !!(kl && kl.isPlayer), t0: g.t, dur: 0.9 });
        if (dst.isPlayer) { g.fx.push({ k: 'shake', amp: CFG.juice.deathShake, t0: g.t, dur: 0.5 }); g.fx.push({ k: 'stop', ms: CFG.juice.deathStopMs, t0: g.t, dur: 0.15 }); g.fx.push({ k: 'flash', c: '#b71c1c', a: 0.5, t0: g.t, dur: 0.9, gray: true }); }
        else if (kl && kl.isPlayer) { g.fx.push({ k: 'shake', amp: CFG.juice.killShake, t0: g.t, dur: 0.35 }); g.fx.push({ k: 'stop', ms: CFG.juice.killStopMs, t0: g.t, dur: 0.12 }); g.fx.push({ k: 'flash', c: '#ffd54f', a: 0.22, t0: g.t, dur: 0.35 }); }
      }
      if (dst.isPlayer) makeRecap(g, dst, src);
      if (src && src.type === 'hero' && src.def.passive && src.def.passive.id === 'yamada') { src.cd[0] = 0; ring(g, src.x, src.y, 22, '#ff8a80', 0.3); }
      dst.deaths++; dst.recent = {}; dst.streak = 0; dst.mkN = 0;
      dst.respawnAt = g.t + CFG.respawnBase + CFG.respawnPerLevel * dst.level;
      dst.fx = []; dst.dash = null; dst.casting = null;
      const killer = src && src.type === 'hero' ? src : (src && src.lastHeroOwner) || null;
      if (killer && killer.team !== dst.team) {
        killer.kills++; g.score[killer.team]++;
        announceKill(g, killer, dst);
        for (const id in dst.recent) { const r = dst.recent[id]; if (r.u !== killer && r.u.team === killer.team && g.t - r.t <= 10) r.u.assists++; }
        addGold(killer, 300); addXp(g, killer, 150); goldPop(g, killer, 300, dst.x, dst.y, true);
        if (killer.itmFx && killer.itmFx.vamp3) healUnit(g, killer, killer.maxHp * 0.12);
        for (const a of alliedHeroes(g, killer.team, dst.x, dst.y, 260)) if (a !== killer) { addGold(a, 60); addXp(g, a, 60); goldPop(g, a, 60, dst.x, dst.y, false); }
      } else if ((dst.team === 0 || dst.team === 1) && !(src && src.type === 'monster')) { g.score[1 - dst.team]++; }
      g.events.push({ k: 'kill', killer: killer ? killer.def.name : (src && src.type === 'monster' ? TR.MONSTERS[src.kind].name : (src && src.type === 'tower' ? 'ป้อม' : 'มินเนียน')),
        kteam: src ? src.team : 1 - dst.team, victim: dst.def.name, vteam: dst.team });
    } else if (dst.type === 'minion') {
      dst.dieT = g.t;
      for (const a of alliedHeroes(g, 1 - dst.team, dst.x, dst.y, 260)) addXp(g, a, 14);
      if (src && src.type === 'hero') {
        const gm = goldMul(src), gv = 20 * gm + (src.itmFx && src.itmFx.gold3 ? 8 : 0) + CFG.gold.lastHit;
        addGold(src, gv); goldPop(g, src, gv, dst.x, dst.y, false);
        // เพื่อนที่อยู่ใกล้ได้ทองแบ่ง (ไม่ต้องปลิดเอง) — ให้คนยืนเลนด้วยกันไม่เสียเปล่า
        for (const a of alliedHeroes(g, src.team, dst.x, dst.y, CFG.gold.shareR)) if (a !== src) { addGold(a, CFG.gold.share); goldPop(g, a, CFG.gold.share, dst.x, dst.y, false); }
        src.cs++;
        if (src.itmFx && src.itmFx.e0c) healUnit(g, src, src.maxHp * TR.ITEM_FX.e0c.heal);
        if (o && o.basic && src.emblem === 'lob') { src.greedCount++; if (src.greedCount >= 3) { src.greedCount = 0; src.greedReady = true; } }
      }
    } else if (dst.type === 'monster') {
      const M = TR.MONSTERS[dst.kind];
      dst.respawnAt = g.t + (dst.kind === 'boss' ? TR.OBJ.respawn : M.respawn);
      if (dst.kind === 'boss') {
        dst.warned = false;
        const OB = TR.OBJ.list[dst.obj | 0];
        const who = src && src.type === 'hero' ? src.team : (dst.aggroBy && dst.aggroBy.team != null ? dst.aggroBy.team : -1);
        if (who === 0 || who === 1) {
          const until = g.t + OB.dur;
          for (const a of g.units) {
            if (a.type !== 'hero' || a.team !== who || a.dead) continue;
            addGold(a, OB.gold); addXp(g, a, OB.xp); goldPop(g, a, OB.gold, dst.x, dst.y, true);
            addFx(a, { type: 'buff', tag: 'jb_boss', until: until, dmgMul: OB.buff.dmgMul, armorAdd: OB.buff.armorAdd || 0 });
            if (OB.buff.hot) addFx(a, { type: 'hot', tag: 'jb_bhot', until: until, perSec: OB.buff.hot });
          }
          if (OB.minion) g.objBuf[who].minion = g.t + OB.minion.dur;
          if (OB.tower) g.objBuf[who].tower = g.t + OB.tower.dur;
          g.events.push({ k: 'boss', state: 'dead', team: who, obj: dst.obj | 0 });
        }
      } else if (src && src.type === 'hero') {
        src.stMon++;
        { const mg = M.gold * goldMul(src) + (src.itmFx && src.itmFx.jungle3 ? 40 : 0); addGold(src, mg); goldPop(g, src, mg, dst.x, dst.y, true); } addXp(g, src, M.xp);
        if (src.itmFx && src.itmFx.jungle3) healUnit(g, src, src.maxHp * 0.12);
        for (const a of alliedHeroes(g, src.team, dst.x, dst.y, 240)) if (a !== src) addXp(g, a, 30);
        const until = g.t + CFG.buffDur;
        if (M.buff === 'dmg') addFx(src, { type: 'buff', tag: 'jb_dmg', until: until, dmgMul: 1.12 });
        else if (M.buff === 'spd') { addFx(src, { type: 'buff', tag: 'jb_spd', until: until, speedMul: 1.1 }); addFx(src, { type: 'hot', tag: 'jb_hot', until: until, perSec: 40 }); }
        if (M.buff) g.events.push({ k: 'jungle', killer: src.def.name, kteam: src.team, name: M.name, text: M.buffText });
      }
    } else if (dst.type === 'tower') {
      if (src && src.type === 'hero') src.stTowers++;
      for (const a of alliedHeroes(g, 1 - dst.team, dst.x, dst.y, 450)) { addGold(a, 150); goldPop(g, a, 150, dst.x, dst.y, true); }
      g.events.push({ k: 'tower', team: dst.team, name: dst.name });
      if (dst.king) { g.over = true; g.winner = 1 - dst.team; g.events.push({ k: 'over', winner: g.winner }); }
    }
  }

  /* ---------- สเปลเสริม และกลับพระนคร ---------- */
  const SPELL_NEG = ['stun', 'slow', 'root', 'blind', 'taunt'];
  function inBaseOf(u) { return hyp(u.x - (u.team === 0 ? 100 : CFG.W - 100), u.y - CFG.baseY) < CFG.shopRange; }
  function cancelRecall(g, u) { if (u.recall) { u.recall = null; if (VIS) g.fx.push({ k: 'ring', x: u.x, y: u.y, r: 16, c: '#9e9e9e', t0: g.t, dur: 0.25 }); } }
  function startRecall(g, u) {
    if (g.over || u.dead || u.recall || u.casting || u.dash || u.m.stun || inBaseOf(u)) return false;
    u.recall = { start: g.t, end: g.t + TR.RECALL.time }; sfx(g, 'recall', u.x, u.y, u === g.player);
    u.input.dx = 0; u.input.dy = 0;
    return true;
  }
  function updateRecall(g, u) {
    const r = u.recall; if (!r) return;
    if (u.m.stun || u.casting || u.dash || u.hurtT >= r.start || (u.isPlayer && (u.input.dx || u.input.dy))) { cancelRecall(g, u); return; }
    if (g.t >= r.end) {
      u.recall = null;
      const sp = spawnPos(u.team, u.slot);
      ring(g, u.x, u.y, 30, '#80d8ff', 0.5); if (VIS) vfx(g, { k: 'rcend', h: u.def.id, s: 0, x: u.x, y: u.y });
      u.x = sp.x; u.y = sp.y; u.px = u.x; u.py = u.y;
      ring(g, u.x, u.y, 36, '#80d8ff', 0.6); if (VIS) vfx(g, { k: 'rcend', h: u.def.id, s: 1, x: u.x, y: u.y });
    }
  }
  function canSpell(g, u) { return !g.over && !u.dead && u.spCd <= 0 && !u.casting && !u.dash && !(u.m.stun && u.spell !== 'purify'); }
  /* ---------- ตะเกียงส่องทาง (วอร์ด) ---------- */
  function placeWard(g, u) {
    if (g.over || u.dead || u.wardN <= 0) return false;
    let mine = 0; for (const w of g.wards) if (w.team === u.team) { mine++; if (hyp(w.x - u.x, w.y - u.y) < 120) return false; }
    if (mine >= 6) { for (let i = 0; i < g.wards.length; i++) if (g.wards[i].team === u.team) { g.wards.splice(i, 1); break; } }
    u.wardN--; if (u.wardCd <= 0) u.wardCd = CFG.ward.regen;
    g.wards.push({ team: u.team, x: u.x, y: u.y, until: g.t + CFG.ward.dur, by: u.id });
    ring(g, u.x, u.y, 40, '#ffe082', 0.5); sfx(g, 'ping', u.x, u.y, u === g.player);
    return true;
  }
  // บอทปักตะเกียงที่พุ่มใกล้ตัว
  function botWard(g, u) {
    if (u.wardN <= 0 || g.t < u.wardNext) return;
    u.wardNext = g.t + 8;
    for (const b of TR.BUSHES) {
      if (hyp(b.x - u.x, b.y - u.y) > 170) continue;
      let dup = false; for (const w of g.wards) if (w.team === u.team && hyp(w.x - b.x, w.y - b.y) < 330) dup = true;
      if (!dup) { placeWard(g, u); return; }
    }
  }
  // สรุปความตาย: รวมดาเมจที่ได้รับ 10 วินาทีสุดท้ายแยกตามต้นทาง
  function logDmg(g, dst, src, d, mag) {
    const L = dst.dmgLog, n = !src ? 'อื่น ๆ' : (src.type === 'hero' ? src.def.name : (src.type === 'tower' ? 'ป้อม' : (src.type === 'monster' ? 'มอนป่า' : 'ลูกกระจ๊อก')));
    L.push({ n: n, d: d, m: mag, t: g.t, hero: !!(src && src.type === 'hero') });
    while (L.length && g.t - L[0].t > 10) L.shift();
    if (L.length > 60) L.shift();
  }
  function makeRecap(g, dst, src) {
    const by = {}; let tot = 0, mg = 0;
    dst.dmgLog.forEach(function (e) { if (g.t - e.t > 10) return; const r = by[e.n] || (by[e.n] = { n: e.n, d: 0, hero: e.hero }); r.d += e.d; tot += e.d; if (e.m) mg += e.d; });
    const rows = Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return b.d - a.d; });
    dst.recap = { t: g.t, total: Math.round(tot), magPct: tot ? Math.round(100 * mg / tot) : 0, rows: rows.slice(0, 6).map(function (r) { return { n: r.n, d: Math.round(r.d), hero: r.hero }; }), by: src && src.type === 'hero' ? src.def.name : (rows[0] ? rows[0].n : '-') };
  }

  /* ---------- คำสั่งผู้เล่น (ช่องทางเดียวที่ผู้เล่นเปลี่ยนสถานะเกมได้) ----------
     ออฟไลน์: เรียก exec ทันที · ออนไลน์: ทุกเครื่องเรียก submit ด้วยจังหวะ (tick) เดียวกัน แล้ว step จะ exec ตามลำดับที่ตรงกันทุกเครื่อง
     คำสั่งมาจากเครือข่ายได้ จึงตรวจค่าให้เข้มทุกจุด (ห้ามเชื่อค่าที่ส่งมา) */
  const num = function (v, lo, hi, d) { v = +v; return v === v ? Math.max(lo, Math.min(hi, v)) : d; };
  function exec(g, u, c) {
    if (!u || u.type !== 'hero' || !c || typeof c.k !== 'string') return false;
    switch (c.k) {
      case 'in': u.input.dx = num(c.dx, -2, 2, 0); u.input.dy = num(c.dy, -2, 2, 0); return true;
      case 'cast': { const sl = c.slot | 0; if (sl < 0 || sl > 2) return false; let aim = null; if (c.aim) aim = { dx: num(c.aim.dx, -1, 1, 0), dy: num(c.aim.dy, -1, 1, 0), k: num(c.aim.k, 0.15, 1, 1) }; return castSkill(g, u, sl, aim); }
      case 'spell': return castSpell(g, u);
      case 'recall': if (u.recall) { cancelRecall(g, u); return true; } return startRecall(g, u);
      case 'buy': return typeof c.id === 'string' ? buy(g, u, c.id) : false;
      case 'sell': return typeof c.id === 'string' ? sell(g, u, c.id) : false;
      case 'up': return upgradeSkill(g, u, c.i | 0);
      case 'item': return typeof c.id === 'string' ? useItem(g, u, c.id) : false;
      case 'ward': return placeWard(g, u);
      case 'atk':
        if (c.on) { u.atkType = c.type === 'minion' || c.type === 'tower' ? c.type : null; u.atkHold = true; u.atkBuf = g.t + 0.45; } else { u.atkHold = false; u.atkType = null; }
        return true;
      case 'lock': { const t = c.id == null ? null : g.byId[c.id | 0]; u.lockT = t && t.team !== u.team && !t.dead ? (u.lockT === t ? null : t) : null; return true; }
      case 'set':
        if (c.atkMode === 'button' || c.atkMode === 'auto') u.atkMode = c.atkMode;
        if (c.prio === 'near' || c.prio === 'lowhp' || c.prio === 'hero') u.prio = c.prio;
        if (c.autoSkill != null) u.autoSkill = !!c.autoSkill;
        return true;
      case 'sig': if (!TR.SIGNALS[c.type]) return false; signal(g, u.team, c.type, num(c.x, 0, CFG.W, 0), num(c.y, 0, CFG.H, 0), u); return true;
      case 'sur': { const r = callSurrender(g, u.team, u); u.surMsg = r.msg; return r.ok; }
      case 'take': return retake(g, u);      // เซิร์ฟเวอร์เท่านั้นที่ส่ง: เจ้าของกลับเข้าเกม รับตัวคืนจากบอท
      case 'drop': return dropToBot(g, u);   // เซิร์ฟเวอร์เท่านั้นที่ส่ง: ผู้เล่นหลุด บอทเข้าคุมตัวต่อ
    }
    return false;
  }
  function dropToBot(g, u) {
    if (!u.isPlayer) return false;
    u.isPlayer = false; u.autoSkill = true; u.input.dx = 0; u.input.dy = 0; u.atkHold = false; u.lockT = null; u.atkMode = 'auto';
    delete g.hu[u.uid]; if (u.pname) u.pname += ' (บอท)';
    g.events.push({ k: 'chat', team: u.team, who: u.pname || u.def.name, text: 'หลุดจากเกม บอทเข้าคุมตัวแทน' });
    return true;
  }
  function retake(g, u) {
    if (u.isPlayer || !u.uid) return false;
    u.isPlayer = true; u.autoSkill = false; u.input.dx = 0; u.input.dy = 0; u.atkHold = false; u.lockT = null;
    g.hu[u.uid] = u; if (u.pname) u.pname = u.pname.replace(/ \(บอท\)$/, '');
    g.events.push({ k: 'chat', team: u.team, who: u.pname || u.def.name, text: 'กลับเข้าเกมแล้ว' });
    return true;
  }
  // ส่งคำสั่งเข้าคิว จะถูกใช้เมื่อเกมเดินถึงจังหวะ tick (ค่าเริ่มต้น = จังหวะถัดไป)
  function submit(g, uid, c, tick) { g.cmds.push({ tick: tick == null ? g.tick + 1 : tick, uid: uid, seq: g.cmdSeq++, c: c }); }
  function runCmds(g) {
    if (!g.cmds.length) return;
    const due = [], keep = [];
    for (const x of g.cmds) (x.tick <= g.tick ? due : keep).push(x);
    g.cmds = keep;
    due.sort(function (a, b) { return a.tick - b.tick || a.uid - b.uid || a.seq - b.seq; });
    for (const x of due) exec(g, x.c && x.c.k === 'take' ? g.uu[x.uid] : g.hu[x.uid], x.c);
  }

  /* ---------- ไอเทมใช้งาน ---------- */
  const ACTIVE_IDS = ['def3', 'regen3', 'move3', 'ward3', 'e0b', 'e1b', 'e2c', 'e3a', 'e3b'];
  function itemActives(u) { return ACTIVE_IDS.filter(function (id) { return u.itmFx && u.itmFx[id]; }); }
  function itemCdLeft(g, u, id) { return Math.max(0, (u.itemCd[id] || 0) - g.t); }
  function useItem(g, u, id) {
    if (g.over || u.dead || !u.itmFx || !u.itmFx[id] || itemCdLeft(g, u, id) > 0) return false;
    if (u.m.stun && id !== 'ward3' && id !== 'e1b') return false;
    const F = TR.ITEM_FX[id];
    switch (id) {
      case 'def3': addFx(u, { type: 'shield', tag: 'it_def3', amt: u.maxHp * 0.18, until: g.t + 3 }); ring(g, u.x, u.y, 36, '#ffd54f', 0.5); break;
      case 'regen3': addFx(u, { type: 'hot', tag: 'it_regen3', perSec: u.maxHp * 0.35 / 4, until: g.t + 4 }); ring(g, u.x, u.y, 30, '#81c784', 0.5); break;
      case 'move3':
        for (let i = u.fx.length - 1; i >= 0; i--) if (u.fx[i].type === 'slow' || u.fx[i].type === 'root') u.fx.splice(i, 1);
        addFx(u, { type: 'buff', tag: 'it_move3', speedMul: 1.45, until: g.t + 3 }); ring(g, u.x, u.y, 30, '#80d8ff', 0.4); break;
      case 'ward3':
        for (let i = u.fx.length - 1; i >= 0; i--) if (SPELL_NEG.indexOf(u.fx[i].type) >= 0) u.fx.splice(i, 1);
        addFx(u, { type: 'buff', tag: 'it_ward3', mresAdd: 0.5, until: g.t + 2.5 }); ring(g, u.x, u.y, 30, '#b388ff', 0.5); break;
      case 'e0b':
        for (const e of g.units) if (e.type === 'hero' && e.team !== u.team && !e.dead && hyp(e.x - u.x, e.y - u.y) <= F.r) addFx(e, { type: 'slow', tag: 'it_e0b' + u.id, pct: F.slow, until: g.t + F.dur });
        ring(g, u.x, u.y, F.r, '#ffd54f', 0.5); break;
      case 'e1b':
        for (let i = u.fx.length - 1; i >= 0; i--) if (SPELL_NEG.indexOf(u.fx[i].type) >= 0) u.fx.splice(i, 1);
        addFx(u, { type: 'shield', tag: 'it_e1b', amt: u.maxHp * F.shield, until: g.t + F.dur }); ring(g, u.x, u.y, 38, '#ffb74d', 0.5); break;
      case 'e2c':
        for (const a of alliedHeroes(g, u.team, u.x, u.y, F.r)) addFx(a, { type: 'buff', tag: 'it_e2c', speedMul: F.speed, until: g.t + F.dur });
        ring(g, u.x, u.y, F.r, '#aed581', 0.5); break;
      case 'e3a': addFx(u, { type: 'buff', tag: 'it_e3a', atkSpd: F.atkSpd, until: g.t + F.dur }); ring(g, u.x, u.y, 30, '#4fc3f7', 0.4); break;
      case 'e3b': addFx(u, { type: 'hot', tag: 'it_e3b', perSec: u.maxHp * F.heal / F.dur, until: g.t + F.dur }); ring(g, u.x, u.y, 30, '#ef5350', 0.5); break;
    }
    u.itemCd[id] = g.t + F.cd; sfx(g, 'item', u.x, u.y, u === g.player);
    return true;
  }
  // บอทใช้ไอเทมตามสถานการณ์ง่าย ๆ
  function botItems(g, u) {
    if (u.dead) return;
    const hp = u.hp / u.maxHp, hurt = g.t - u.hurtT < 2;
    if (u.itmFx.def3 && hurt && hp < 0.55) useItem(g, u, 'def3');
    if (u.itmFx.regen3 && hp < 0.5) useItem(g, u, 'regen3');
    if (u.itmFx.move3 && ((hurt && hp < 0.35) || u.m.slow > 0.2 || u.m.root)) useItem(g, u, 'move3');
    if (u.itmFx.ward3 && (u.m.stun || u.m.root || (u.m.slow > 0.3 && hurt))) useItem(g, u, 'ward3');
    if (u.itmFx.e1b && ((hurt && hp < 0.5) || u.m.stun)) useItem(g, u, 'e1b');
    if (u.itmFx.e3b && hp < 0.4) useItem(g, u, 'e3b');
    if (u.itmFx.e0b || u.itmFx.e2c || u.itmFx.e3a) {
      let foes = 0; for (const e of g.units) if (e.type === 'hero' && e.team !== u.team && !e.dead && hyp(e.x - u.x, e.y - u.y) <= 150) foes++;
      if (foes) { if (u.itmFx.e0b) useItem(g, u, 'e0b'); if (u.itmFx.e2c && hurt) useItem(g, u, 'e2c'); if (u.itmFx.e3a) useItem(g, u, 'e3a'); }
    }
  }
  function castSpell(g, u) {
    if (!canSpell(g, u)) return false;
    const sp = TR.SPELL_BY_ID[u.spell]; if (!sp) return false;
    switch (sp.id) {
      case 'heal':
        healUnit(g, u, u.maxHp * sp.self);
        for (const a of alliedHeroes(g, u.team, u.x, u.y, sp.r)) if (a !== u) healUnit(g, a, a.maxHp * sp.ally);
        ring(g, u.x, u.y, sp.r, '#81c784', 0.5); break;
      case 'punish': {
        let best = null, bd = sp.r;
        for (const e of g.units) {
          if (e.dead || e.team === u.team || (e.type !== 'monster' && e.type !== 'minion')) continue;
          const d = hyp(e.x - u.x, e.y - u.y) - e.radius;
          if (d < bd) { bd = d; best = e; }
        }
        if (!best) return false;
        line(g, u, best, '#fff176', 0.25);
        hit(g, u, best, sp.dmg + sp.perLv * u.level, { raw: true, spell: true });
        ring(g, best.x, best.y, 22, '#fff176', 0.35); break; }
      case 'flash': {
        const f = norm(u.face[0], u.face[1]);
        ring(g, u.x, u.y, 18, '#b39ddb', 0.3);
        u.x = clamp(u.x + f[0] * sp.dist, 20, CFG.W - 20); u.y = clamp(u.y + f[1] * sp.dist, 50, CFG.H - 50);
        u.px = u.x; u.py = u.y;
        ring(g, u.x, u.y, 18, '#b39ddb', 0.3); break; }
      case 'sprint': addFx(u, { type: 'buff', tag: 'sp_sprint', until: g.t + sp.dur, speedMul: sp.mul }); ring(g, u.x, u.y, 20, '#80cbc4', 0.4); break;
      case 'purify':
        for (let i = u.fx.length - 1; i >= 0; i--) if (SPELL_NEG.indexOf(u.fx[i].type) >= 0) u.fx.splice(i, 1);
        addFx(u, { type: 'buff', tag: 'sp_purify', until: g.t + sp.dur, ccImmune: true }); ring(g, u.x, u.y, 24, '#f48fb1', 0.5); break;
      case 'barrier': addFx(u, { type: 'shield', tag: 'sp_barrier', until: g.t + sp.dur, amt: u.maxHp * sp.pct + sp.flat }); ring(g, u.x, u.y, 22, '#ffd54f', 0.5); break;
      case 'conch':
        for (const e of enemiesIn(g, u.team, u.x, u.y, sp.r, true)) if (e.type === 'hero' || e.type === 'minion' || e.type === 'monster') addFx(e, { type: 'stun', until: g.t + sp.dur });
        ring(g, u.x, u.y, sp.r, '#fff59d', 0.5); break;
    }
    u.spCd = sp.cd;
    cancelRecall(g, u);
    return true;
  }
  // บอทใช้สเปลตามสถานการณ์
  function botSpell(g, u) {
    if (u.dead || u.spCd > 0 || u.recall) return;
    const hpR = u.hp / u.maxHp;
    const foes = enemiesIn(g, u.team, u.x, u.y, 260, true).filter(function (e) { return e.type === 'hero'; });
    switch (u.spell) {
      case 'heal': if (hpR < 0.4 && foes.length) castSpell(g, u); break;
      case 'punish': { const sp = TR.SPELL_BY_ID.punish, need = sp.dmg + sp.perLv * u.level;
        for (const e of g.units) if (e.type === 'monster' && !e.dead && e.team !== u.team && e.hp <= need && hyp(e.x - u.x, e.y - u.y) < sp.r) { castSpell(g, u); break; } break; }
      case 'flash': if (hpR < 0.3 && foes.length) { u.face = norm(u.x - foes[0].x, u.y - foes[0].y); castSpell(g, u); } break;
      case 'sprint': if ((u.ai.retreat || hpR < 0.4) && foes.length) castSpell(g, u); break;
      case 'purify': if (u.fx.some(function (e) { return SPELL_NEG.indexOf(e.type) >= 0 && (e.type === 'stun' || e.type === 'root'); })) castSpell(g, u); break;
      case 'barrier': if (hpR < 0.5 && foes.length) castSpell(g, u); break;
      case 'conch': if (foes.filter(function (e) { return hyp(e.x - u.x, e.y - u.y) < 115; }).length >= 2) castSpell(g, u); break;
    }
    // ถอยกลับบ้านด้วยการร่ายกลับพระนคร: เลือดน้อย ไกลฐาน และไม่มีศัตรูใกล้
    if (!u.recall && hpR < 0.3 && !foes.length && !inBaseOf(u)) {
      const hx = u.team === 0 ? 100 : CFG.W - 100;
      if (Math.abs(u.x - hx) > 700) startRecall(g, u);
    }
  }

  /* ---------- สกิล ---------- */
  function canCast(g, u, slot) {
    return !g.over && !u.dead && u.sl[slot] > 0 && u.cd[slot] <= 0 && !u.m.stun && !u.casting && !u.dash;
  }

  function dirToward(u, e) { return norm(e.x - u.x, e.y - u.y); }

  /* ---------- เลเวลสกิล: สกิล 1-2 สูงสุดเลเวล 4, อัลติสูงสุด 3 (ปลดที่ฮีโร่เลเวล 4/7/10) ---------- */
  function skillPts(u) { return u.level - u.sl[0] - u.sl[1] - u.sl[2]; }
  function canUpgrade(u, i) {
    if (skillPts(u) <= 0) return false;
    if (i < 2) return u.sl[i] < CFG.skillMax;
    return u.sl[2] < 3 && u.level >= CFG.ultLevels[u.sl[2]];
  }
  function upgradeSkill(g, u, i) { if (!canUpgrade(u, i)) return false; u.sl[i]++; if (u.isPlayer) ring(g, u.x, u.y, 20, '#ffe082', 0.4); return true; }
  function autoSkill(u) {
    while (skillPts(u) > 0) {
      let pick = -1;
      if (canUpgrade(u, 2)) pick = 2;
      else {
        const a = canUpgrade(u, 0), b = canUpgrade(u, 1);
        if (a && b) pick = u.sl[0] <= u.sl[1] ? 0 : 1; else if (a) pick = 0; else if (b) pick = 1;
      }
      if (pick < 0) break;
      u.sl[pick]++;
    }
  }
  function skillMul(u, slot) { const l = u.sl[slot]; return slot < 2 ? CFG.skillBase + CFG.skillStep * l : CFG.ultBase + CFG.ultStep * l; }
  // ชนิดการเล็งของสกิล (ใช้กับ UI): line = ยิง/พุ่งเป็นเส้น, point = วางพื้นที่, target = เล็งทิศเพื่อเลือกเป้า, self = ใช้กับตัวเอง
  function skillAim(sk) {
    let type = 'self', range = 0, r = 0;
    for (const f of sk.fx) {
      if (f.k === 'shot' || f.k === 'cone') { type = 'line'; range = Math.max(range, f.range); r = Math.max(r, f.w || 6); if (f.k === 'cone') r = f.range * Math.sin((f.spread || 30) * Math.PI / 360); }
      else if (f.k === 'dash') { type = 'line'; range = Math.max(range, f.dist); r = f.w || 12; }
      else if (f.k === 'blast' || f.k === 'zone' || f.k === 'trap') { if (type !== 'line') { type = 'point'; range = Math.max(range, f.nearSelf ? 0 : f.range); r = Math.max(r, f.r); } }
      else if (f.k === 'strike' || f.k === 'combo' || f.k === 'chain') { if (type === 'self') { type = 'target'; range = Math.max(range, f.range); } }
      else if (f.k === 'nova') { r = Math.max(r, f.r); }
    }
    if (type === 'point' && range === 0) type = 'self';
    return { type: type, range: range, r: r };
  }
  // เล็งแบบกำหนดเอง: aim = { dx, dy (ทิศในโลก), k (0..1 สัดส่วนระยะ) }
  function aimOf(ctx) { return ctx && ctx.aim ? ctx.aim : null; }
  function pickTgt(g, u, range, ctx) {
    const a = aimOf(ctx);
    if (!a) return pickEnemy(g, u, range, false, true);
    let best = null, bs = 1e9;
    for (const e of g.units) {
      if (e.team === u.team || e.dead || !canTarget(g, u, e) || e.type === 'tower') continue;
      const d = dist(u, e) - e.radius; if (d > range) continue;
      const v = norm(e.x - u.x, e.y - u.y), cos = v[0] * a.dx + v[1] * a.dy;
      if (cos < 0.6) continue;
      const sc = (1 - cos) * 220 + d * 0.5 - (e.type === 'hero' ? 60 : 0);
      if (sc < bs) { bs = sc; best = e; }
    }
    return best || pickEnemy(g, u, range, false, true);
  }

  function castSkill(g, u, slot, aim) {
    if (!canCast(g, u, slot)) return false;
    const sk = u.def.skills[slot];
    if (aim) { const n = norm(aim.dx, aim.dy); aim = { dx: n[0], dy: n[1], k: clamp(aim.k == null ? 1 : aim.k, 0.15, 1) }; }
    // เช็กว่ามีเป้าสำหรับสกิลที่ต้องมีเป้า ก่อนเสียคูลดาวน์
    for (const fx of sk.fx) {
      if (fx.k === 'strike' && !pickEnemy(g, u, fx.range + 20, false, true)) return false;
      if (fx.k === 'combo' && !pickEnemy(g, u, fx.range + 20, false, true)) return false;
      if (fx.k === 'chain' && !pickEnemy(g, u, fx.range, false, true)) return false;
      if (fx.k === 'mark' && enemiesIn(g, u.team, u.x, u.y, fx.range, true).filter(function (e) { return e.type === 'hero'; }).length === 0) return false;
      if (fx.k === 'link' && alliedHeroes(g, u.team, u.x, u.y, fx.range).filter(function (a) { return a !== u; }).length === 0) return false;
      if (fx.k === 'heal' && fx.hpBelow && !lowestAlly(g, u, fx.r, fx.hpBelow)) return false;
    }
    const ctx = { mul: skillMul(u, slot), slot: slot, aim: aim || null };
    u.revealT = g.t + CFG.bush.reveal;
    if (aim) u.face = [aim.dx, aim.dy];
    if (u.nextMul) { ctx.mul *= u.nextMul; u.nextMul = 0; }
    if (u.greedReady) { ctx.mul *= 1.08; u.greedReady = false; }
    if (u.def.passive && u.def.passive.id === 'mothamma') { u.pC = (u.pC || 0) + 1; if (u.pC >= 3) { u.pC = 0; ctx.mul *= 1.3; ring(g, u.x, u.y, 24, '#ffd54f', 0.3); } }
    if (u.def.passive && u.def.passive.id === 'nopphamat') { const P = TR.PASSIVE.nopphamat; addFx(u, { type: 'shield', tag: 'nopsh', amt: u.maxHp * P.shield, until: g.t + P.dur }); }
    if (u.itmFx && u.itmFx.cdr3) u.sbT = g.t + 4;
    if (u.itmFx && u.itmFx.e1c) healUnit(g, u, u.maxHp * TR.ITEM_FX.e1c.heal);
    cancelRecall(g, u);
    u.cd[slot] = sk.cd * (1 - CFG.skillCd * (u.sl[slot] - 1)) * (1 - Math.min(CFG.cdrCap, u.itm ? u.itm.cdr : 0));
    u.lastCast = g.t;
    const st = findFxStealth(u);
    ring(g, u.x, u.y, 14, u.def.colors.accent, 0.2);
    sfx(g, 'sk:' + u.def.id + ':' + slot, u.x, u.y, u === g.player);
    u.vSlot = slot;
    if (VIS) { let rr = 0; for (const f of sk.fx) rr = Math.max(rr, f.r || f.range || 0); vfx(g, { k: 'sk', h: u.def.id, s: slot, u: u, x: u.x, y: u.y, dx: u.face[0], dy: u.face[1], r: rr }); }
    for (const fx of sk.fx) doEffect(g, u, fx, ctx, sk);
    if (st && !sk.fx.some(function (f) { return f.stealth; })) removeFx(u, st);
    return true;
  }

  function lowestAlly(g, u, r, below) {
    let best = null, br = 2;
    for (const a of alliedHeroes(g, u.team, u.x, u.y, r)) {
      const p = a.hp / a.maxHp;
      if (below && p >= below) continue;
      if (p < br) { br = p; best = a; }
    }
    return best;
  }

  function aimPoint(g, u, range, fallback, ctx) {
    const a = aimOf(ctx);
    if (a) return { x: u.x + a.dx * range * a.k, y: u.y + a.dy * range * a.k, tgt: null };
    const e = pickEnemy(g, u, range + 20, false, true);
    if (e) {
      const d = hyp(e.x - u.x, e.y - u.y);
      const k = d > range ? range / d : 1;
      return { x: u.x + (e.x - u.x) * k, y: u.y + (e.y - u.y) * k, tgt: e };
    }
    const f = fallback == null ? 0.6 : fallback;
    return { x: u.x + u.face[0] * range * f, y: u.y + u.face[1] * range * f, tgt: null };
  }

  function doEffect(g, u, fx, ctx, sk) {
    switch (fx.k) {
      case 'dash': {
        const rep = fx.repeat || 1;
        for (let i = 0; i < rep; i++) {
          if (i === 0) dashOnce(g, u, fx, ctx);
          else later(g, i * (fx.gap || 0.3), function () { dashOnce(g, u, fx, ctx); });
        }
        break;
      }
      case 'nova': {
        for (const e of enemiesIn(g, u.team, u.x, u.y, fx.r, false)) {
          hit(g, u, e, fx.dmg, { skill: true, mul: ctx.mul });
          if (fx.stun) addFx(e, { type: 'stun', until: g.t + fx.stun });
          if (fx.slow) addFx(e, { type: 'slow', pct: fx.slow[0], until: g.t + fx.slow[1] });
        }
        ring(g, u.x, u.y, fx.r, '#ffd54f', 0.35);
        break;
      }
      case 'shot': {
        const e = ctx.aim ? null : pickEnemy(g, u, fx.range, false, true);
        const dir = ctx.aim ? [ctx.aim.dx, ctx.aim.dy] : (e ? dirToward(u, e) : u.face);
        let mul = ctx.mul;
        if (fx.stillMul && u.still >= 0.4) mul *= fx.stillMul;
        spawnProj(g, u, dir, fx, mul);
        break;
      }
      case 'cone': {
        const e = ctx.aim ? null : pickEnemy(g, u, fx.range, false, true);
        const dir = ctx.aim ? [ctx.aim.dx, ctx.aim.dy] : (e ? dirToward(u, e) : u.face);
        const base = datan2(dir[1], dir[0]);
        for (let i = 0; i < fx.n; i++) {
          const a = base + ((i - (fx.n - 1) / 2) / Math.max(1, fx.n - 1)) * (fx.spread * Math.PI / 180);
          spawnProj(g, u, [dcos(a), dsin(a)], { range: fx.range, speed: fx.speed, w: 4, dmg: fx.dmg }, ctx.mul);
        }
        break;
      }
      case 'blast': {
        const p = aimPoint(g, u, fx.range, 0.7, ctx);
        g.zones.push({ kind: 'blast', team: u.team, owner: u, x: p.x, y: p.y, r: fx.r, at: g.t + fx.delay, until: g.t + fx.delay + 0.1,
          dmg: fx.dmg, mul: ctx.mul, slow: fx.slow, stun: fx.stun, c: '#ff7043', h: u.def.id, s: ctx.slot });
        break;
      }
      case 'zone': {
        let p;
        if (fx.nearSelf) p = { x: u.x + u.face[0] * fx.range, y: u.y + u.face[1] * fx.range };
        else p = aimPoint(g, u, fx.range, 0.7, ctx);
        const z = { kind: 'zone', team: u.team, owner: u, x: p.x, y: p.y, r: fx.r, until: g.t + fx.dur, next: g.t + 0.05, tick: fx.tick,
          dmg: fx.dmg || 0, mul: ctx.mul, slow: fx.slow, heal: fx.heal, healAllies: fx.healAllies, single: fx.single, turret: fx.turret,
          blind: fx.blind, channel: fx.channel, c: fx.heal ? '#66bb6a' : (fx.dmg ? '#ab47bc' : '#4fc3f7'), h: u.def.id, s: ctx.slot };
        g.zones.push(z);
        if (fx.channel) { u.casting = { until: g.t + fx.dur }; }
        break;
      }
      case 'trap': {
        const mine = g.zones.filter(function (z) { return z.kind === 'trap' && z.owner === u; });
        while (mine.length >= fx.max) { const o = mine.shift(); o.done = true; }
        const p = aimPoint(g, u, fx.range, 0.8, ctx);
        g.zones.push({ kind: 'trap', team: u.team, owner: u, x: p.x, y: p.y, r: fx.r, until: g.t + fx.life, dmg: fx.dmg, mul: ctx.mul, root: fx.root, c: '#8d6e63', h: u.def.id, s: ctx.slot });
        if (fx.selfSlow) addFx(u, { type: 'slow', pct: fx.selfSlow, until: g.t + 0.8 });
        break;
      }
      case 'buff': {
        const tg = fx.who === 'allies' ? alliedHeroes(g, u.team, u.x, u.y, fx.r) : [u];
        for (const a of tg) {
          if (fx.cleanse) cleanse(a);
          const b = { type: 'buff', tag: 'sk' + u.id + '_' + ctx.slot, until: g.t + fx.dur };
          ['speedMul', 'armorAdd', 'dmgMul', 'lifesteal', 'ccImmune', 'towerMul', 'stealth'].forEach(function (k) { if (fx[k]) b[k] = fx[k]; });
          if (a !== u || fx.who === 'allies') b.tag = 'sk' + u.id + '_' + ctx.slot + '_' + a.id;
          addFx(a, b);
          vfx(g, { k: 'aura', h: u.def.id, s: ctx.slot, u: a, self: a === u, dur: fx.dur });
          if (fx.shield) addFx(a, { type: 'shield', tag: 'shield' + u.id + '_' + ctx.slot, amt: fx.shield * (u.dmgBase > 1 ? 1 : 1), until: g.t + fx.dur });
          if (a !== u) ring(g, a.x, a.y, 12, '#fff59d', 0.25);
        }
        if (fx.nextSkillMul) u.nextMul = fx.nextSkillMul;
        if (fx.r) ring(g, u.x, u.y, fx.r, '#fff59d', 0.3);
        break;
      }
      case 'heal': {
        let tg = [];
        if (fx.who === 'lowest') { const a = lowestAlly(g, u, fx.r, fx.hpBelow); if (a) tg = [a]; }
        else if (fx.who === 'all') tg = alliedHeroes(g, u.team, u.x, u.y, fx.r);
        else tg = [u];
        for (const a of tg) {
          const amt = (fx.flat || 0) + (fx.pct || 0) * a.maxHp;
          if (fx.cleanse) cleanse(a);
          if (fx.hot) addFx(a, { type: 'hot', tag: 'hot' + u.id + '_' + ctx.slot, until: g.t + fx.hot, perSec: amt / fx.hot });
          else healUnit(g, a, amt);
          ring(g, a.x, a.y, 10, '#66bb6a', 0.3);
          vfx(g, { k: 'imp', h: u.def.id, s: ctx.slot, ally: true, x: a.x, y: a.y, r: a.radius });
          if (fx.hot) vfx(g, { k: 'aura', h: u.def.id, s: ctx.slot, u: a, self: a === u, dur: fx.hot });
          if (a !== u && fx.flat) vfx(g, { k: 'throw', h: u.def.id, s: ctx.slot, x1: u.x, y1: u.y, x2: a.x, y2: a.y, dur: 0.3 });
        }
        break;
      }
      case 'taunt': {
        for (const e of enemiesIn(g, u.team, u.x, u.y, fx.r, true)) addFx(e, { type: 'taunt', tag: 'taunt', until: g.t + fx.dur, by: u });
        if (fx.tower) addFx(u, { type: 'towerTaunt', until: g.t + fx.dur });
        ring(g, u.x, u.y, fx.r, '#ffb300', 0.35);
        break;
      }
      case 'chain': {
        let cur = pickTgt(g, u, fx.range, ctx);
        const seen = [];
        let from = u;
        for (let i = 0; i < fx.n && cur; i++) {
          seen.push(cur);
          line(g, from, cur, '#fff176', 0.15);
          vfx(g, { k: 'bolt', h: u.def.id, s: u.vSlot | 0, x1: from.x, y1: from.y, x2: cur.x, y2: cur.y, dur: 0.28 });
          hit(g, u, cur, fx.dmg, { skill: true, mul: ctx.mul });
          from = cur;
          let nx = null, nd = fx.jump;
          for (const e of g.units) {
            if (e.dead || e.team === u.team || seen.indexOf(e) >= 0 || !canTarget(g, u, e) || e.type === 'tower') continue;
            const d = dist(cur, e); if (d < nd) { nd = d; nx = e; }
          }
          cur = nx;
        }
        break;
      }
      case 'combo': {
        const tgt = pickTgt(g, u, fx.range + 20, ctx);
        if (!tgt) break;
        if (fx.root) { u.casting = { until: g.t + fx.n * fx.gap + 0.05 }; }
        for (let i = 0; i < fx.n; i++) {
          later(g, i * fx.gap, (function (i) {
            return function () {
              if (u.dead || tgt.dead) return;
              if (fx.breakStun && u.m.stun) return;
              if (dist(u, tgt) > fx.range + 28) return;
              hit(g, u, tgt, fx.dmg * (1 + (fx.ramp || 0) * i), { skill: true, mul: ctx.mul });
              ring(g, tgt.x, tgt.y, 7, '#ffffff', 0.12);
              if (fx.mark && i === fx.n - 1) addFx(tgt, { type: 'combomark', until: g.t + 4 });
            };
          })(i));
        }
        break;
      }
      case 'strike': {
        const e = pickTgt(g, u, fx.range + 20, ctx);
        if (!e) break;
        if (fx.dashTo && dist(u, e) > 26) {
          const d = dirToward(u, e);
          const ox = u.x, oy = u.y;
          u.x = e.x - d[0] * (e.radius + u.radius + 4); u.y = e.y - d[1] * (e.radius + u.radius + 4);
          u.px = u.x; u.py = u.y;
          vfx(g, { k: 'dash', h: u.def.id, s: u.vSlot | 0, u: u, x1: ox, y1: oy, x2: u.x, y2: u.y, dur: 0.45, jump: true });
        }
        let m = ctx.mul;
        if (fx.backMul) { const v = norm(u.x - e.x, u.y - e.y); if (e.face[0] * v[0] + e.face[1] * v[1] < -0.2) m *= fx.backMul; }
        if (fx.execBelow && e.hp / e.maxHp < fx.execBelow) m *= fx.execMul;
        hit(g, u, e, fx.dmg, { skill: true, mul: m });
        ring(g, e.x, e.y, 10, '#ff5252', 0.2);
        if (fx.markedStun) { const mk = findFx(e, 'combomark'); if (mk) { removeFx(e, mk); addFx(e, { type: 'stun', until: g.t + fx.markedStun }); } }
        if (fx.resetOnKill && e.dead) { u.cd[0] = 0; u.cd[1] = 0; }
        break;
      }
      case 'mark': {
        for (const e of enemiesIn(g, u.team, u.x, u.y, fx.range, true)) {
          if (e.type === 'hero') addFx(e, { type: 'mark', tag: 'mark' + u.team, team: u.team, mul: fx.mul, until: g.t + fx.dur });
        }
        ring(g, u.x, u.y, fx.range, '#cfd8dc', 0.4);
        break;
      }
      case 'link': {
        let best = null, bd = 1e9;
        for (const a of alliedHeroes(g, u.team, u.x, u.y, fx.range)) if (a !== u) { const d = dist(u, a); if (d < bd) { bd = d; best = a; } }
        if (best) { addFx(best, { type: 'link', tag: 'link' + u.id, by: u, share: fx.share, until: g.t + fx.dur }); line(g, u, best, '#ffd54f', 0.4); vfx(g, { k: 'link', h: u.def.id, s: ctx.slot, a: u, b: best, dur: fx.dur }); }
        break;
      }
      case 'counter': {
        addFx(u, { type: 'counter', tag: 'counter', until: g.t + fx.dur, dmg: fx.dmg, reduce: fx.reduce });
        vfx(g, { k: 'aura', h: u.def.id, s: ctx.slot, u: u, self: true, dur: fx.dur });
        break;
      }
    }
  }

  function cleanse(u) {
    for (let i = u.fx.length - 1; i >= 0; i--) if (NEG[u.fx[i].type]) u.fx.splice(i, 1);
  }

  function dashOnce(g, u, fx, ctx) {
    if (u.dead || u.m.stun) return;
    let dir = u.face, dd = fx.dist;
    if (fx.away) {
      const e = pickEnemy(g, u, 200, false, true);
      dir = e ? norm(u.x - e.x, u.y - e.y) : [-u.face[0], -u.face[1]];
    } else if (fx.toTarget && ctx.aim) {
      dir = [ctx.aim.dx, ctx.aim.dy]; dd = fx.dist * ctx.aim.k;
    } else if (fx.toTarget) {
      const e = pickEnemy(g, u, fx.range || 170, !!fx.onlyHero, true);
      if (e) {
        dir = dirToward(u, e);
        if (fx.stop != null) dd = Math.max(0, Math.min(fx.dist, dist(u, e) - e.radius - fx.stop));
      } else if (fx.onlyHero) return;
    }
    if (ctx.aim && !fx.away && !fx.toTarget) { dir = [ctx.aim.dx, ctx.aim.dy]; dd = fx.dist * Math.max(0.25, ctx.aim.k); }   // พุ่งตามระยะที่ลากเล็ง (สั้นสุด 25%)
    if (dd < 2) {
      const e = pickEnemy(g, u, (fx.stop || 24) + 14, !!fx.onlyHero, true);
      if (e && fx.dmg) hit(g, u, e, fx.dmg, { skill: true, mul: ctx.mul });
      return;
    }
    u.face = dir;
    u.dash = { dx: dir[0], dy: dir[1], remain: dd, speed: 380, fx: fx, mul: ctx.mul, hits: [] };
    vfx(g, { k: 'dash', h: u.def.id, s: u.vSlot | 0, u: u, x1: u.x, y1: u.y, x2: u.x + dir[0] * dd, y2: u.y + dir[1] * dd, dur: dd / 380 + 0.35 });
  }

  function stepDash(g, u, dt) {
    const d = u.dash;
    const s = Math.min(d.remain, d.speed * dt);
    u.x = clamp(u.x + d.dx * s, 20, CFG.W - 20);
    u.y = clamp(u.y + d.dy * s, 50, CFG.H - 50);
    d.remain -= s;
    const w = (d.fx.w || 12);
    for (const e of g.units) {
      if (e.dead || e.team === u.team || e.type === 'tower' || d.hits.indexOf(e) >= 0 || !canTarget(g, u, e)) continue;
      if (hyp(e.x - u.x, e.y - u.y) <= u.radius + e.radius + w) {
        d.hits.push(e);
        if (d.fx.dmg) hit(g, u, e, d.fx.dmg, { skill: true, mul: d.mul });
        if (d.fx.push) { e.x = clamp(e.x + d.dx * d.fx.push, 20, CFG.W - 20); e.y = clamp(e.y + d.dy * d.fx.push, 50, CFG.H - 50); }
      }
    }
    if (d.remain <= 0.5) u.dash = null;
  }

  function spawnProj(g, u, dir, fx, mul) {
    g.projs.push({ team: u.team, src: u, x: u.x, y: u.y, vx: dir[0] * fx.speed, vy: dir[1] * fx.speed, left: fx.range, w: fx.w || 5,
      dmg: fx.dmg, mul: mul, rootedMul: fx.rootedMul, c: u.def.colors.accent, hit: [], skill: true, h: u.def.id, s: u.vSlot | 0 });
    vfx(g, { k: 'muz', h: u.def.id, s: u.vSlot | 0, x: u.x, y: u.y, dx: dir[0], dy: dir[1] });
  }

  /* ---------- อัปเดตหนึ่งรอบ ---------- */
  function step(g) {
    if (g.over) return;
    const dt = CFG.dt;
    for (const u of g.units) { u.px = u.x; u.py = u.y; }
    g.t += dt; g.tick++;
    runCmds(g);

    // ยุค
    const ne = Math.min(TR.ERAS.length - 1, Math.floor(g.t / CFG.eraLen));
    if (ne !== g.era) { g.era = ne; for (const hu of g.units) if (hu.type === 'hero') hu.era = ne; g.events.push({ k: 'era', era: ne });
      const bo = g.boss; if (bo && bo.obj !== ne) {   // เปลี่ยนยุค: เป้าหมายยุคเก่าหายไป อีกตัวของยุคใหม่เกิดตามหลัง
        if (!bo.dead) { bo.dead = true; bo.hp = 0; bo.dieT = g.t; bo.tgt = null; g.events.push({ k: 'boss', state: 'gone', obj: bo.obj }); }
        bo.respawnAt = g.t + TR.OBJ.swap; bo.warned = true;
      } }
    const toNext = (g.era + 1) * CFG.eraLen - g.t;
    if (g.era < TR.ERAS.length - 1 && toNext <= CFG.eraWarn && g.warned !== g.era) { g.warned = g.era; g.events.push({ k: 'warn', era: g.era + 1 }); }

    // ตัวจับเวลา
    for (let i = g.timers.length - 1; i >= 0; i--) {
      const tm = g.timers[i];
      if (g.t >= tm.at) { g.timers.splice(i, 1); tm.fn(); }
    }

    updateVision(g);
    // มินเนียน
    if (g.t >= g.nextWave) { spawnWave(g); g.nextWave += CFG.waveEvery; }

    for (const u of g.units) {
      if (u.type === 'hero') updateHero(g, u, dt);
    }
    for (const u of g.units) {
      if (u.type === 'minion') updateMinion(g, u, dt);
      else if (u.type === 'tower') updateTower(g, u, dt);
      else if (u.type === 'monster') updateMonster(g, u, dt);
    }
    updateProjs(g, dt);
    updateZones(g, dt);
    separate(g);

    // ล้างศพมินเนียน
    for (let i = g.units.length - 1; i >= 0; i--) {
      const u = g.units[i];
      if (u.type === 'minion' && u.dead && g.t - u.dieT > 0.4) g.units.splice(i, 1);
    }
    for (let i = g.fx.length - 1; i >= 0; i--) if (g.t - g.fx[i].t0 > g.fx[i].dur) g.fx.splice(i, 1);
  }

  function spawnWave(g) {
    g.waveNo++;
    const late = g.waveNo >= 8;
    const nm = 3 + (late ? 1 : 0), nr = 1 + (late ? 1 : 0);
    const sc = 1 + 0.03 * g.waveNo;
    const cannon = g.waveNo % CFG.cannon.every === 0;
    for (let team = 0; team < 2; team++) {
      const x0 = team === 0 ? 230 : CFG.W - 230, dir = team === 0 ? 1 : -1;
      for (let l = 0; l < CFG.lanes.length; l++) {
        if (cannon) mkUnit(g, { type: 'minion', team: team, lane: l, inLane: l === 1, ranged: true, cannon: true, x: x0 - dir * 20, y: CFG.baseY + (g.rand() - 0.5) * 40,
          hp: CFG.cannon.hp * sc, maxHp: CFG.cannon.hp * sc, dmg: CFG.cannon.dmg * sc, as: 0.6, range: CFG.cannon.range, speed: 44, radius: 9, baseArmor: 0.2 });
        // ป้อมศัตรูในเลนนี้พังหมดแล้ว = ได้มินเนียนยักษ์เพิ่ม (ช่วยดันเข้าราชธานี)
        const open = g.towers[1 - team][l].every(function (t) { return t.dead; });
        const sup = open ? CFG.siege.superMul : 1, ext = open ? CFG.siege.superExtra : 0;
        for (let i = 0; i < nm + nr + ext; i++) {
          const ranged = i >= nm && i < nm + nr, big = i >= nm + nr;
          // เกิดที่ฐาน แล้วเดินออกไปเข้าเลนตามทางโค้ง (เลนกลางตรงเข้าเลย)
          mkUnit(g, { type: 'minion', team: team, lane: l, inLane: l === 1, ranged: ranged, x: x0 + dir * i * 12, y: CFG.baseY + (g.rand() - 0.5) * 40,
            hp: (ranged ? 220 : 320) * sc * (open ? sup : 1), maxHp: (ranged ? 220 : 320) * sc * (open ? sup : 1), dmg: (ranged ? 28 : 22) * sc * (open ? sup : 1), as: 1, range: ranged ? 70 : 18,
            speed: 48, radius: big ? 8 : 6, baseArmor: 0.1, big: big });
        }
      }
    }
  }

  function updateHero(g, u, dt) {
    if (u.dead) {
      botShop(g, u);
      if (g.t >= u.respawnAt) {
        const sp = spawnPos(u.team, u.slot);
        u.dead = false; u.x = sp.x; u.y = sp.y; u.px = u.x; u.py = u.y;
        recalc(g, u); u.hp = u.maxHp; u.dash = null; u.casting = null;
      }
      return;
    }
    aggregate(g, u);
    if (!u.isPlayer && (g.tick & 15) === 0) botShop(g, u);
    for (let i = 0; i < 3; i++) if (u.cd[i] > 0) u.cd[i] -= dt;
    if (u.spCd > 0) u.spCd -= dt;
    if (u.atkCd > 0) u.atkCd -= dt;
    updateRecall(g, u);
    if (u.autoSkill) autoSkill(u);
    if (!u.isPlayer && (g.tick & 7) === 3) botSpell(g, u);
    u.goldTotal += 0; addGold(u, 1.2 * dt);
    recalc(g, u);

    // ฟื้นเลือด
    const em = TR.EMBLEMS[u.emblem];
    const sp = u.team === 0 ? 100 : CFG.W - 100;
    const inBase = hyp(u.x - sp, u.y - CFG.baseY) < 230;
    u.hp = Math.min(u.maxHp, u.hp + u.maxHp * ((inBase ? 0.08 : 0.004 * (em.regenMul || 1)) + u.itm.regen) * dt);
    for (const e of u.fx) if (e.type === 'hot') u.hp = Math.min(u.maxHp, u.hp + e.perSec * dt);

    // พลังติดตัวฮีโร่
    const pid = u.def.passive && u.def.passive.id;
    if (pid === 'mae') addGold(u, 2 * dt);
    else if (pid === 'mohya') {
      u.pAura = (u.pAura || 0) - dt;
      if (u.pAura <= 0) { u.pAura = 0.5; for (const a of alliedHeroes(g, u.team, u.x, u.y, 180)) healUnit(g, a, a.maxHp * 0.008 * 0.5); }
    } else if (pid === 'nurse') {
      u.pAura = (u.pAura || 0) - dt;
      if (u.pAura <= 0) { const P = TR.PASSIVE.nurse; u.pAura = 0.5; for (const a of alliedHeroes(g, u.team, u.x, u.y, P.r)) if (a.hp < a.maxHp * P.hpBelow) healUnit(g, a, a.maxHp * P.pct * 0.5); }
    } else if (pid === 'win') {
      if (u.input.dx || u.input.dy) u.run = Math.min(5, (u.run || 0) + dt); else u.run = 0;
    }
    if (u.wardN < CFG.ward.max && u.wardCd > 0) { u.wardCd -= dt; if (u.wardCd <= 0) { u.wardN++; u.wardCd = u.wardN < CFG.ward.max ? CFG.ward.regen : 0; } }
    if (!u.isPlayer && (g.tick & 7) === 5) { botItems(g, u); botWard(g, u); }
    // พลังแฝง: หลง = ภาพลวง
    if (u.decoyCd > 0) u.decoyCd -= dt;
    if (u.emblem === 'long' && u.decoyCd <= 0 && u.hp / u.maxHp < 0.3) {
      u.decoyCd = 60; u.untarget = g.t + 2;
      g.fx.push({ k: 'decoy', x: u.x, y: u.y, def: u.def, c: u.def.colors.body, t0: g.t, dur: 2 });
    }
    // พลังแฝง: ศรัทธา = บัฟเมื่อเพื่อนอยู่ใกล้
    if (u.emblem === 'sat') {
      u.auraT -= dt;
      if (u.auraT <= 0) {
        u.auraT = 0.5;
        const near = alliedHeroes(g, u.team, u.x, u.y, 120).filter(function (a) { return a !== u; });
        if (near.length) {
          const b = { type: 'buff', tag: 'faith', until: g.t + 0.7, dmgMul: 1.04, speedMul: 1.03 };
          addFx(u, Object.assign({}, b));
          for (const a of near) addFx(a, Object.assign({}, b, { tag: 'faith' + u.id }));
        }
      }
    }

    if (u.casting && (g.t >= u.casting.until || u.m.stun)) u.casting = null;
    if (u.dead) return;

    // ความคิดบอท
    if (!u.isPlayer && g.aiThink && !(g.tutorial && u.team === 1)) g.aiThink(g, u);
    else if (g.tutorial && u.team === 1) { u.input.dx = 0; u.input.dy = 0; }

    // เคลื่อนที่
    let moved = false;
    if (u.dash) { stepDash(g, u, dt); moved = true; }
    else if (!u.m.stun && !u.m.root && !u.casting) {
      const ix = u.input.dx, iy = u.input.dy, l = hyp(ix, iy);
      if (l > 0.01) {
        const nx = ix / l, ny = iy / l;
        const spd = u.baseSpeed * u.m.speed * (1 - u.m.slow);
        u.x = clamp(u.x + nx * spd * dt, 20, CFG.W - 20);
        u.y = clamp(u.y + ny * spd * dt, 50, CFG.H - 50);
        u.face = [nx, ny];
        moved = true;
      }
    }
    u.still = moved ? 0 : u.still + dt;

    // ตีปกติ
    if (!u.m.stun && !u.casting && !u.dash) autoAttack(g, u);
  }

  // เลือกเป้าตีปกติของผู้เล่น: ล็อกเป้า > ปุ่มสั่งตีลูกกระจ๊อก/ป้อม > ลำดับเป้าหมายตามตั้งค่า (prio)
  function pickBasic(g, u, range) {
    const L = lockOf(g, u, range, false); if (L) return L;
    const list = [];
    for (const e of g.units) {
      if (e.team === u.team || e.dead || !canTarget(g, u, e)) continue;
      const d = dist(u, e) - e.radius; if (d > range) continue;
      if (u.atkType === 'minion' && e.type !== 'minion' && e.type !== 'monster') continue;
      if (u.atkType === 'tower' && e.type !== 'tower') continue;
      list.push({ e: e, d: d });
    }
    if (!list.length) return null;
    let pool = list;
    if (!u.atkType) { const hs = list.filter(function (x) { return x.e.type === 'hero'; }); if (hs.length && u.prio !== 'near') pool = hs; else if (!hs.length) { const ms = list.filter(function (x) { return x.e.type !== 'tower'; }); if (ms.length) pool = ms; } }
    let best = null, bs = 1e9;
    for (const x of pool) {
      const sc = (u.prio === 'lowhp' || u.atkType === 'minion') ? x.e.hp : x.d;
      if (sc < bs) { bs = sc; best = x.e; }
    }
    return best.e || best;
  }
  function autoAttack(g, u) {
    const r = TR.ROLES[u.role], rg = TR.atkRange(u.def);
    const range = rg * (u.m.blind ? 0.6 : 1);
    let tgt = null;
    const tn = findFx(u, 'taunt');
    if (tn && tn.by && !tn.by.dead) { if (dist(u, tn.by) - tn.by.radius <= range) tgt = tn.by; else return; }
    if (!tgt && u.aiTarget && canTarget(g, u, u.aiTarget) && dist(u, u.aiTarget) - u.aiTarget.radius <= range) tgt = u.aiTarget;
    if (!tgt && u.isPlayer) tgt = pickBasic(g, u, range);
    else if (!tgt) {
      let bh = null, bhd = 1e9, bm = null, bmd = 1e9, bt = null, btd = 1e9;
      for (const e of g.units) {
        if (e.team === u.team || e.dead || !canTarget(g, u, e)) continue;
        const d = dist(u, e) - e.radius;
        if (d > range) continue;
        if (e.type === 'hero') { if (d < bhd) { bhd = d; bh = e; } }
        else if (e.type === 'minion' || e.type === 'monster') { if (d < bmd) { bmd = d; bm = e; } }
        else if (d < btd) { btd = d; bt = e; }
      }
      tgt = bh || bm || bt;
    }
    if (!tgt || u.atkCd > 0) return;
    if (u.isPlayer && u.atkMode === 'button' && !u.atkHold && u.atkBuf < g.t) return;
    u.atkCd = 1 / (r.as * u.m.atkSpd);
    u.lastAtk = g.t;
    if (VIS) sfx(g, 'at:' + u.def.id, u.x, u.y, u === g.player);
    u.face = dirToward(u, tgt);
    const st = findFxStealth(u); if (st) removeFx(u, st);
    if (rg > 60) {
      g.projs.push({ team: u.team, src: u, x: u.x, y: u.y, tgt: tgt, speed: 230, dmg: r.atk, mul: 1, basic: true, c: u.def.colors.accent, w: 3, hit: [] });
    } else {
      hit(g, u, tgt, r.atk, { basic: true });
    }
  }

  function updateMinion(g, u, dt) {
    if (u.dead) return;
    aggregate(g, u);
    if (u.m.stun) return;
    if (u.atkCd > 0) u.atkCd -= dt;
    let tgt = null;
    const tn = findFx(u, 'taunt');
    if (tn && tn.by && !tn.by.dead && dist(u, tn.by) < 220) tgt = tn.by;
    if (!tgt) {
      const aggro = u.ranged ? 110 : 80;
      let bd = 1e9;
      for (const e of g.units) {
        if (e.team === u.team || e.dead || !canTarget(g, u, e)) continue;
        const d = dist(u, e) - e.radius;
        if (d < aggro && d < bd) { bd = d; tgt = e; }
      }
    }
    if (tgt) {
      const d = dist(u, tgt) - tgt.radius;
      if (d <= u.range) {
        if (u.atkCd <= 0) {
          u.atkCd = 1 / u.as;
          u.lastAtk = g.t; u.face = dirToward(u, tgt);
          hit(g, u, tgt, u.dmg, { basic: true });
          if (u.ranged) line(g, u, tgt, u.team === 0 ? '#90caf9' : '#ef9a9a', 0.08);
        }
      } else if (!u.m.root) moveToward(u, tgt.x, tgt.y, dt);
    } else if (!u.m.root) {
      if (!u.inLane) {
        const wx = u.team === 0 ? CFG.laneEntry : CFG.W - CFG.laneEntry;
        if (u.team === 0 ? u.x >= wx - 20 : u.x <= wx + 20) u.inLane = true;
        else { moveToward(u, wx, CFG.lanes[u.lane].y, dt); return; }
      }
      // เดินตามเลนไปจนใกล้ฐานศัตรู แล้วค่อยเลี้ยวเข้าราชธานี
      const nearBase = u.team === 0 ? u.x > CFG.W - 420 : u.x < 420;
      if (nearBase) moveToward(u, u.team === 0 ? CFG.W - CFG.king.x : CFG.king.x, CFG.baseY, dt);
      else moveToward(u, u.team === 0 ? CFG.W - 380 : 380, CFG.lanes[u.lane].y, dt);
    }
  }

  function updateMonster(g, u, dt) {
    if (u.dead) {
      if (g.t >= u.respawnAt) {
        const M = TR.MONSTERS[u.kind], sc = 1 + 0.8 * Math.min(1, g.t / 1500);
        u.dead = false; u.maxHp = M.hp * sc; u.hp = u.maxHp; u.dmg = M.atk * sc;
        u.x = u.px = u.home.x; u.y = u.py = u.home.y; u.fx = []; u.tgt = null; u.leash = false; u.aggroBy = null; u.dieT = null; u.spawnT = g.t; u.slamAt = g.t + 6;
        if (u.kind === 'boss') {
          const OB = TR.OBJ.list[g.era];
          u.obj = g.era; u.warned = false; u.maxHp = M.hp * sc * OB.hp; u.hp = u.maxHp; u.dmg = M.atk * sc * OB.atk;
          g.events.push({ k: 'boss', state: 'spawn', obj: u.obj });
        }
      } else if (u.kind === 'boss' && !u.warned && g.t >= u.respawnAt - TR.OBJ.warn) {
        u.warned = true; g.events.push({ k: 'boss', state: 'warn', obj: g.era, at: u.respawnAt });
      }
      return;
    }
    aggregate(g, u);
    if (u.atkCd > 0) u.atkCd -= dt;
    if (u.m.stun) return;
    const hd = hyp(u.x - u.home.x, u.y - u.home.y);
    if (u.leash) {   // กลับค่ายและฟื้นเลือดเร็ว
      u.tgt = null;
      u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.15 * dt);
      if (hd < 8) u.leash = false; else if (!u.m.root) moveNav(u, u.home.x, u.home.y, dt);
      return;
    }
    let tgt = u.tgt;
    if (tgt && (tgt.dead || !canTarget(g, u, tgt) || dist(u, tgt) > 330)) tgt = null;
    if (!tgt) {
      // โดนตีเมื่อไม่นานมานี้ หรือมีฮีโร่เดินเข้าใกล้ค่ายมาก
      if (u.aggroBy && !u.aggroBy.dead && g.t - u.aggroT < 5 && canTarget(g, u, u.aggroBy)) tgt = u.aggroBy;
      else for (const e of g.units) {
        if (e.type !== 'hero' || e.dead || !canTarget(g, u, e)) continue;
        if (hyp(e.x - u.home.x, e.y - u.home.y) < 55) { tgt = e; break; }
      }
    }
    u.tgt = tgt;
    if (!tgt) { if (hd > 6 && !u.m.root) moveNav(u, u.home.x, u.home.y, dt); else u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.03 * dt); return; }
    if (hd > 270) { u.leash = true; u.tgt = null; return; }
    const d = dist(u, tgt) - tgt.radius;
    u.face = dirToward(u, tgt);
    if (u.kind === 'boss' && g.t >= u.slamAt && d < u.range + 30) {
      u.slamAt = g.t + 7; u.lastAtk = g.t; ring(g, u.x, u.y, 78, '#ffb74d', 0.5);
      for (const e of enemiesIn(g, 2, u.x, u.y, 78, true)) hit(g, u, e, u.dmg * 0.9, { skill: true });
    }
    if (d <= u.range) {
      if (u.atkCd <= 0) { u.atkCd = 1 / u.as; u.lastAtk = g.t; hit(g, u, tgt, u.dmg, { basic: true }); }
    } else if (!u.m.root) moveNav(u, tgt.x, tgt.y, dt);
  }

  function shortcutMul(u) {   // ทางลัดข้ามเลน: ใกล้เส้นทางลัดความเร็วเพิ่ม
    const SC = TR.SHORTCUT, A = SC.all;
    if (u.x < 800 || u.x > CFG.W - 800 || u.y < 300 || u.y > CFG.H - 300) return 1;
    for (let i = 0; i < A.length; i++) {
      const a = A[i], dx = a[2] - a[0], dy = a[3] - a[1], l2 = dx * dx + dy * dy;
      const t = clamp(((u.x - a[0]) * dx + (u.y - a[1]) * dy) / l2, 0, 1), ex = u.x - (a[0] + dx * t), ey = u.y - (a[1] + dy * t);
      if (ex * ex + ey * ey < SC.w * SC.w) return 1 + SC.speed;
    }
    return 1;
  }
  function moveToward(u, tx, ty, dt) {
    const dx = tx - u.x, dy = ty - u.y, l = hyp(dx, dy);
    if (l < 1) return;
    const spd = (u.speed || u.baseSpeed) * u.m.speed * (1 - u.m.slow) * (u.type === 'hero' ? shortcutMul(u) : 1);
    const s = Math.min(l, spd * dt);
    u.x += dx / l * s; u.y += dy / l * s;
    u.face = [dx / l, dy / l];
  }

  function updateTower(g, u, dt) {
    if (u.dead) return;
    aggregate(g, u);
    if (u.cdAtk > 0) u.cdAtk -= dt;
    if (u.hp < u.maxHp && g.tick % 10 === 0 && !towerHasCover(g, u) && !(u.lastHurt > g.t - 4)) u.hp = Math.min(u.maxHp, u.hp + u.maxHp * CFG.backdoor.regen * 0.5);
    const beh = TR.ERAS[g.era].tower;
    let tgt = u.tgt;
    if (tgt && (tgt.dead || !canTarget(g, u, tgt) || dist(u, tgt) - tgt.radius > u.range)) tgt = null;
    const pri = chooseTowerTarget(g, u, true);   // ผู้ที่ตีฮีโร่ฝั่งป้อม (หรือตัวยั่วป้อม) มาก่อนเสมอ แม้ป้อมล็อกเป้าอื่นอยู่
    if (pri) tgt = pri; else if (!beh.focus || !tgt) tgt = chooseTowerTarget(g, u);
    u.tgt = tgt;
    if (tgt && u.cdAtk <= 0) {
      u.cdAtk = beh.rate;
      const col = u.team === 0 ? '#90caf9' : '#ef9a9a';
      line(g, u, tgt, beh.splash ? '#ffcc80' : col, beh.focus ? 0.05 : 0.12);
      if (beh.splash) {
        ring(g, tgt.x, tgt.y, beh.splash, '#ff8a65', 0.25);
        for (const e of enemiesIn(g, u.team, tgt.x, tgt.y, beh.splash, true)) hit(g, u, e, beh.dmg, { raw: true });
      } else hit(g, u, tgt, beh.dmg, { raw: true });
    }
  }

  function chooseTowerTarget(g, u, onlyPri) {
    let taunter = null, aggro = null, ab = 1e9, minion = null, md = 1e9, hero = null, hd = 1e9;
    for (const e of g.units) {
      if (e.team === u.team || e.dead || !canTarget(g, u, e)) continue;
      const d = dist(u, e) - e.radius;
      if (d > u.range) continue;
      if (e.type === 'hero') {
        if (findFx(e, 'towerTaunt')) taunter = e;
        if (e.lastHeroHit > g.t - CFG.towerAggro && e.lastHitTeam === u.team && d < ab) { ab = d; aggro = e; }
        if (d < hd) { hd = d; hero = e; }
      } else if (e.type === 'minion' && d < md) { md = d; minion = e; }
    }
    return onlyPri ? (taunter || aggro) : (taunter || aggro || minion || hero);
  }

  function updateProjs(g, dt) {
    for (let i = g.projs.length - 1; i >= 0; i--) {
      const p = g.projs[i];
      if (p.tgt) {
        if (p.tgt.dead) { g.projs.splice(i, 1); continue; }
        const dx = p.tgt.x - p.x, dy = p.tgt.y - p.y, l = hyp(dx, dy);
        const s = p.speed * dt;
        if (l <= s + p.tgt.radius) {
          hit(g, p.src, p.tgt, p.dmg, { basic: true, mul: p.mul });
          g.projs.splice(i, 1); continue;
        }
        p.x += dx / l * s; p.y += dy / l * s;
        continue;
      }
      const sx = p.vx * dt, sy = p.vy * dt;
      p.x += sx; p.y += sy; p.left -= hyp(sx, sy);
      let gone = p.left <= 0;
      if (!gone) {
        for (const e of g.units) {
          if (e.dead || e.team === p.team || p.hit.indexOf(e) >= 0 || !canTarget(g, p.src, e)) continue;
          if (hyp(e.x - p.x, e.y - p.y) <= e.radius + p.w) {
            let m = p.mul;
            if (p.rootedMul && findFx(e, 'root')) m *= p.rootedMul;
            hit(g, p.src, e, p.dmg, { skill: true, mul: m });
            p.hit.push(e);
            gone = true; break;
          }
        }
      }
      if (gone) g.projs.splice(i, 1);
    }
  }

  function updateZones(g, dt) {
    for (let i = g.zones.length - 1; i >= 0; i--) {
      const z = g.zones[i];
      if (z.done) { g.zones.splice(i, 1); continue; }
      if (z.kind === 'blast') {
        if (g.t >= z.at) {
          for (const e of enemiesIn(g, z.team, z.x, z.y, z.r, false)) {
            hit(g, z.owner, e, z.dmg, { skill: true, mul: z.mul });
            if (z.stun) addFx(e, { type: 'stun', until: g.t + z.stun });
          }
          ring(g, z.x, z.y, z.r, '#ff7043', 0.3);
          vfx(g, { k: 'boom', h: z.h, s: z.s, x: z.x, y: z.y, r: z.r });
          g.zones.splice(i, 1);
        }
        continue;
      }
      if (z.kind === 'trap') {
        if (g.t >= z.until) { g.zones.splice(i, 1); continue; }
        const en = enemiesIn(g, z.team, z.x, z.y, z.r, true);
        if (en.length) {
          const e = en[0];
          hit(g, z.owner, e, z.dmg, { skill: true, mul: z.mul });
          addFx(e, { type: 'root', until: g.t + z.root });
          ring(g, z.x, z.y, 18, '#a1887f', 0.3);
          vfx(g, { k: 'boom', h: z.h, s: z.s, x: z.x, y: z.y, r: z.r + 6 });
          g.zones.splice(i, 1);
        }
        continue;
      }
      // zone
      const ended = g.t >= z.until || (z.channel && (z.owner.dead || z.owner.m.stun));
      if (ended) { if (z.channel && z.owner.casting) z.owner.casting = null; g.zones.splice(i, 1); continue; }
      if (g.t >= z.next) {
        z.next += z.tick;
        if (z.turret || z.single) {
          let best = null, bd = 1e9;
          for (const e of enemiesIn(g, z.team, z.x, z.y, z.r, true)) { const d = hyp(e.x - z.x, e.y - z.y); if (d < bd) { bd = d; best = e; } }
          if (best) { line(g, z, best, '#fff176', 0.1); vfx(g, { k: 'bolt', h: z.h, s: z.s, x1: z.x, y1: z.y - 12, x2: best.x, y2: best.y, dur: 0.22 }); hit(g, z.owner, best, z.dmg, { skill: true, mul: z.mul }); }
        } else {
          for (const e of enemiesIn(g, z.team, z.x, z.y, z.r, true)) {
            if (z.dmg) hit(g, z.owner, e, z.dmg, { skill: true, mul: z.mul });
            if (z.slow) addFx(e, { type: 'slow', pct: z.slow, until: g.t + z.tick + 0.15 });
            if (z.blind) addFx(e, { type: 'blind', until: g.t + z.tick + 0.15 });
          }
        }
        if (z.heal) for (const a of alliedHeroes(g, z.team, z.x, z.y, z.r)) healUnit(g, a, z.heal);
      }
    }
  }


  /* ---------- กำแพงและการนำทาง ---------- */
  const WALLS = TR.WALLS || [], WP = TR.WAYPOINTS || [];
  function segClear(x1, y1, x2, y2, r) {
    for (let i = 0; i < WALLS.length; i++) {
      const w = WALLS[i];
      let t0 = 0, t1 = 1;
      const dx = x2 - x1, dy = y2 - y1;
      const mins = [w.x1 - r, w.y1 - r], maxs = [w.x2 + r, w.y2 + r], p = [x1, y1], d = [dx, dy];
      let hit = true;
      for (let a = 0; a < 2; a++) {
        if (Math.abs(d[a]) < 1e-9) { if (p[a] < mins[a] || p[a] > maxs[a]) { hit = false; break; } }
        else {
          let ta = (mins[a] - p[a]) / d[a], tb = (maxs[a] - p[a]) / d[a];
          if (ta > tb) { const q = ta; ta = tb; tb = q; }
          if (ta > t0) t0 = ta; if (tb < t1) t1 = tb;
          if (t0 > t1) { hit = false; break; }
        }
      }
      if (hit) return false;
    }
    return true;
  }
  // กราฟระหว่างจุดนำทาง (คำนวณครั้งเดียว) + เส้นทางสั้นสุดแบบ Floyd–Warshall
  const NW = WP.length, D = [], NEXT = [];
  for (let i = 0; i < NW; i++) { D.push(new Array(NW).fill(1e9)); NEXT.push(new Array(NW).fill(-1)); }
  for (let i = 0; i < NW; i++) {
    D[i][i] = 0; NEXT[i][i] = i;
    for (let j = 0; j < NW; j++) if (i !== j && segClear(WP[i].x, WP[i].y, WP[j].x, WP[j].y, 10)) { D[i][j] = hyp(WP[i].x - WP[j].x, WP[i].y - WP[j].y); NEXT[i][j] = j; }
  }
  for (let k = 0; k < NW; k++) for (let i = 0; i < NW; i++) for (let j = 0; j < NW; j++) if (D[i][k] + D[k][j] < D[i][j]) { D[i][j] = D[i][k] + D[k][j]; NEXT[i][j] = NEXT[i][k]; }

  // จุดที่ควรเดินไปต่อ (ตรงไปได้ก็ไปเลย ไม่ได้ก็อ้อมผ่านช่องกำแพง)
  function navPoint(u, tx, ty) {
    const r = (u.radius || 8) + 2;
    if (segClear(u.x, u.y, tx, ty, r)) return { x: tx, y: ty };
    let best = 1e18, bi = -1, bj = -1;
    const vis = [], visT = [];
    for (let i = 0; i < NW; i++) { vis[i] = segClear(u.x, u.y, WP[i].x, WP[i].y, r); visT[i] = segClear(WP[i].x, WP[i].y, tx, ty, r); }
    for (let i = 0; i < NW; i++) {
      if (!vis[i]) continue;
      const di = hyp(u.x - WP[i].x, u.y - WP[i].y);
      for (let j = 0; j < NW; j++) {
        if (!visT[j] || D[i][j] >= 1e9) continue;
        const c = di + D[i][j] + hyp(WP[j].x - tx, WP[j].y - ty);
        if (c < best) { best = c; bi = i; bj = j; }
      }
    }
    if (bi < 0) return { x: tx, y: ty };
    if (hyp(u.x - WP[bi].x, u.y - WP[bi].y) < 14) {
      if (bi === bj) return { x: tx, y: ty };
      const n = NEXT[bi][bj];
      return { x: WP[n].x, y: WP[n].y };
    }
    return { x: WP[bi].x, y: WP[bi].y };
  }
  function moveNav(u, tx, ty, dt) { const p = navPoint(u, tx, ty); moveToward(u, p.x, p.y, dt); }
  function pushOutWalls(u) {
    for (let i = 0; i < WALLS.length; i++) {
      const w = WALLS[i];
      if (u.x < w.x1 - 40 || u.x > w.x2 + 40 || u.y < w.y1 - 40 || u.y > w.y2 + 40) continue;
      const r = u.radius;
      const cx = clamp(u.x, w.x1, w.x2), cy = clamp(u.y, w.y1, w.y2);
      let dx = u.x - cx, dy = u.y - cy, d2 = dx * dx + dy * dy;
      if (d2 >= r * r) continue;
      if (d2 < 1e-6) { // ศูนย์กลางอยู่ในกำแพง: ดันออกทางใกล้สุด
        const l = u.x - w.x1, rr = w.x2 - u.x, t = u.y - w.y1, b = w.y2 - u.y, m = Math.min(l, rr, t, b);
        if (m === t) u.y = w.y1 - r; else if (m === b) u.y = w.y2 + r; else if (m === l) u.x = w.x1 - r; else u.x = w.x2 + r;
      } else { const d = Math.sqrt(d2); u.x = cx + dx / d * r; u.y = cy + dy / d * r; }
    }
  }

  function separate(g) {
    const us = g.units;
    for (let i = 0; i < us.length; i++) {
      const a = us[i];
      if (a.dead) continue;
      for (let j = i + 1; j < us.length; j++) {
        const b = us[j];
        if (b.dead) continue;
        const dx = b.x - a.x;
        if (dx > 40 || dx < -40) continue;
        const dy = b.y - a.y;
        const min = a.radius + b.radius;
        const d2 = dx * dx + dy * dy;
        if (d2 >= min * min) continue;
        const d = Math.sqrt(d2) || 0.01;
        const push = (min - d);
        const nx = dx / d, ny = dy / d;
        if (a.type === 'tower') { b.x += nx * push; b.y += ny * push; }
        else if (b.type === 'tower') { a.x -= nx * push; a.y -= ny * push; }
        else if (a.dash || b.dash) continue;
        else {
          const wa = a.type === 'hero' ? 0.3 : 0.5, wb = b.type === 'hero' ? 0.3 : 0.5;
          const s = wa + wb;
          a.x -= nx * push * (wb / s) * 0.5; a.y -= ny * push * (wb / s) * 0.5;
          b.x += nx * push * (wa / s) * 0.5; b.y += ny * push * (wa / s) * 0.5;
        }
      }
      if (a.type !== 'tower') { a.x = clamp(a.x, 14, CFG.W - 14); a.y = clamp(a.y, 40, CFG.H - 40); pushOutWalls(a); }
    }
  }

  TR.Sim = {
    hyp: hyp, dsin: dsin, dcos: dcos, datan2: datan2,
    navPoint: navPoint,
    createGame: createGame, hash: hash, dropToBot: dropToBot, retake: retake, exec: exec, submit: submit, placeWard: placeWard, useItem: useItem, itemActives: itemActives, itemCdLeft: itemCdLeft, hit: hit, kill: kill, signal: signal, sigFor: sigFor, callSurrender: callSurrender, botWantsSurrender: botWantsSurrender, bushAt: bushAt, step: step, upgradeSkill: upgradeSkill, canUpgrade: canUpgrade, skillPts: skillPts, skillAim: skillAim, skillMul: skillMul, castSpell: castSpell, startRecall: startRecall, cancelRecall: cancelRecall, castSkill: castSkill, canCast: canCast,
    pickEnemy: pickEnemy, enemiesIn: enemiesIn, alliedHeroes: alliedHeroes, canTarget: canTarget,
    towerVuln: towerVuln, buy: buy, sell: sell, canShop: canShop, netCost: netCost, ownedInLine: ownedInLine, wantShop: wantShop, dist: dist, norm: norm, findFx: findFx, lowestAlly: lowestAlly, recalc: recalc
  };
})(typeof window !== 'undefined' ? window : globalThis);
