/* Thai Realm — แกนเกม (ไม่แตะหน้าจอ ทำงานได้ทั้งในเบราว์เซอร์และ Node สำหรับรันบอททดสอบสมดุล)
   ตรรกะเดินที่ 20 ครั้งต่อวินาที (TR.CFG.dt) */
(function (G) {
  'use strict';
  const TR = G.TR;
  const CFG = TR.CFG;

  /* ---------- ตัวช่วย ---------- */
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function norm(x, y) { const l = Math.hypot(x, y); return l < 1e-6 ? [1, 0] : [x / l, y / l]; }
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
  function later(g, delay, fn) { g.timers.push({ at: g.t + delay, fn: fn }); }
  function ring(g, x, y, r, c, dur) { g.fx.push({ k: 'ring', x: x, y: y, r: r, c: c, t0: g.t, dur: dur || 0.3 }); }
  function line(g, a, b, c, dur) { g.fx.push({ k: 'line', x1: a.x, y1: a.y, x2: b.x, y2: b.y, c: c, t0: g.t, dur: dur || 0.12 }); }
  const VIS = typeof window !== 'undefined';
  const NEG = { stun: 1, slow: 1, root: 1, blind: 1, taunt: 1 };

  /* ---------- สร้างเกม ---------- */
  function createGame(opts) {
    opts = opts || {};
    const g = {
      t: 0, tick: 0, units: [], projs: [], zones: [], timers: [], fx: [], events: [],
      rand: mulberry32(opts.seed == null ? (Date.now() & 0x7fffffff) : opts.seed),
      over: false, winner: -1, era: 0, warned: -1, nextWave: CFG.firstWave, waveNo: 0,
      score: [0, 0], idc: 1, player: null, opts: opts, aiThink: TR.AI ? TR.AI.think : null
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
    // ดราฟต์ฮีโร่: ไม่ซ้ำกันทั้งสองทีม
    const pool = TR.HEROES.map(function (h) { return h.id; });
    const picks = [[], []];
    if (opts.playerHero) { pool.splice(pool.indexOf(opts.playerHero), 1); picks[0].push(opts.playerHero); }
    function pull() { return pool.splice(Math.floor(g.rand() * pool.length), 1)[0]; }
    while (picks[0].length < 5) picks[0].push(pull());
    while (picks[1].length < 5) picks[1].push(pull());
    for (let team = 0; team < 2; team++) {
      for (let s = 0; s < 5; s++) {
        const id = picks[team][s];
        const isPlayer = !!(opts.playerHero && team === 0 && s === 0);
        const em = isPlayer ? (opts.playerEmblem || 'kro') : botEmblem(g, id);
        const h = mkHero(g, TR.HERO_BY_ID[id], team, em, s, isPlayer);
        if (isPlayer) g.player = h;
      }
    }
    return g;
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
      baseArmor: 0, m: { speed: 1, armor: 0, dmg: 1, ls: 0, tower: 1, stun: false, root: false, slow: 0, blind: false, stealth: false, atkSpd: 1 } }, o);
    u.px = u.x; u.py = u.y;
    g.units.push(u);
    return u;
  }

  function spawnPos(team, slot) { return { x: team === 0 ? 100 : CFG.W - 100, y: CFG.baseY - 90 + slot * 45 }; }

  function mkHero(g, def, team, emblem, slot, isPlayer) {
    const r = TR.ROLES[def.role];
    const sp = spawnPos(team, slot);
    const u = mkUnit(g, {
      type: 'hero', def: def, team: team, role: def.role, emblem: emblem, isPlayer: isPlayer, slot: slot,
      x: sp.x, y: sp.y, hp: 1, maxHp: 1, radius: r.radius, baseArmor: r.armor,
      level: 1, xp: 0, gold: 0, tier: 0, cd: [0, 0, 0], input: { dx: 0, dy: 0 }, kills: 0, deaths: 0, cs: 0,
      greedCount: 0, greedReady: false, decoyCd: 0, untarget: 0, still: 0, lastHeroHit: -99, auraT: 0,
      respawnAt: 0, casting: null, dash: null, aiTarget: null, nextMul: 0, goldTotal: 0,
      ai: { next: 0, retreat: false, yOff: (slot - 2) * 14, lane: CFG.botLanes[slot], home: CFG.botLanes[slot], defend: false, chk: 0 }
    });
    recalc(g, u);
    u.hp = u.maxHp;
    return u;
  }

  /* ---------- ค่าสถานะ ---------- */
  function recalc(g, u) {
    const r = TR.ROLES[u.role], em = TR.EMBLEMS[u.emblem];
    const lv = 1 + CFG.levelBonus * (u.level - 1);
    const gl = 1 + CFG.tierBonus * u.tier;
    const pk = u.def.era === g.era ? CFG.peak : 1;
    u.peak = pk > 1;
    const nm = r.hp * lv * gl * pk * (em.hpMul || 1);
    if (nm !== u.maxHp) { const pct = u.maxHp > 0 ? u.hp / u.maxHp : 1; u.maxHp = nm; u.hp = Math.min(nm, pct * nm); }
    u.dmgBase = lv * gl * pk * (em.dmgMul || 1);
    u.baseSpeed = r.speed;
  }

  function aggregate(g, u) {
    const t = g.t;
    const m = { speed: 1, armor: 0, dmg: 1, ls: 0, tower: 1, stun: false, root: false, slow: 0, blind: false, stealth: false, atkSpd: 1 };
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
    m.armor += u.baseArmor;
    if (u.type === 'hero') {
      const em = TR.EMBLEMS[u.emblem];
      m.armor += em.armorAdd || 0;
      m.speed *= em.speedMul || 1;
    }
    u.m = m;
  }

  function towerVuln(g, t) {
    if (t.king) {
      for (let l = 0; l < CFG.lanes.length; l++) if (g.towers[t.team][l][1].dead) return true;
      return false;
    }
    if (t.idx === 0) return true;
    return g.towers[t.team][t.lane][t.idx - 1].dead;
  }

  function canTarget(g, src, dst) {
    if (!dst || dst.dead || dst.team === src.team) return false;
    if (dst.type === 'tower' && !towerVuln(g, dst)) return false;
    if (dst.type === 'hero') {
      if (dst.untarget > g.t) return false;
      if (dst.m.stealth) {
        const mk = findFx(dst, 'mark');
        const revealed = (src.type === 'tower' && TR.ERAS[g.era].tower.reveal) || (mk && mk.team === src.team);
        if (!revealed) return false;
      }
    }
    return true;
  }

  function pickEnemy(g, u, range, heroOnly, heroFirst) {
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
      if (Math.hypot(e.x - x, e.y - y) - e.radius <= r) out.push(e);
    }
    return out;
  }

  function alliedHeroes(g, team, x, y, r) {
    const out = [];
    for (let i = 0; i < g.units.length; i++) {
      const e = g.units[i];
      if (e.type === 'hero' && e.team === team && !e.dead && Math.hypot(e.x - x, e.y - y) <= r) out.push(e);
    }
    return out;
  }

  /* ---------- ความเสียหาย ---------- */
  function hit(g, src, dst, base, o) {
    o = o || {};
    if (!dst || dst.dead) return 0;
    if (dst.type === 'tower' && !towerVuln(g, dst)) return 0;
    let d = base;
    if (!o.raw && src) {
      d *= (src.dmgBase || 1) * (src.m ? src.m.dmg : 1) * (o.mul || 1);
      if (src.type === 'hero' && src.emblem === 'kro' && dst.hp / dst.maxHp < 0.4) d *= 1.1;
      if (dst.type === 'tower') d *= (src.m ? src.m.tower : 1) * (src.type === 'minion' ? 0.4 : 1);
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
    d *= 1 - clamp(dst.m.armor, -0.5, 0.85);
    const lk = findFx(dst, 'link');
    if (lk && lk.by && !lk.by.dead && lk.by !== dst) {
      const sh = d * lk.share; d -= sh;
      applyDirect(g, lk.by, sh, src);
    }
    d = absorb(dst, d, g.t);
    if (d <= 0) return 0;
    dst.hp -= d;
    dst.flash = g.t + 0.08;
    if (VIS && (dst.type !== 'minion' || (src && src.isPlayer)) && g.fx.length < 150) g.fx.push({ k: 'dmg', x: dst.x + (g.rand() - 0.5) * 8, y: dst.y - 22, v: Math.round(d), c: dst.type === 'hero' ? (dst.team === 0 ? '#ff8a80' : '#fff59d') : '#ffffff', t0: g.t, dur: 0.8, big: dst.type === 'hero' || (src && src.isPlayer) });
    if (src) {
      if (src.m && src.m.ls > 0 && !src.dead) src.hp = Math.min(src.maxHp, src.hp + d * src.m.ls);
      if (src.type === 'hero' && dst.type === 'hero') src.lastHeroHit = g.t;
      if (src.type === 'hero') { const st = findFxStealth(src); if (st && !o.keepStealth) removeFx(src, st); }
    }
    dst.lastAttacker = src;
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
    u.hp = Math.min(u.maxHp, u.hp + amt);
  }

  function addGold(u, n) { u.gold += n; u.goldTotal += n; }
  function addXp(g, u, n) {
    if (u.level >= CFG.maxLevel) return;
    u.xp += n;
    while (u.level < CFG.maxLevel && u.xp >= 90 + 40 * u.level) {
      u.xp -= 90 + 40 * u.level;
      u.level++;
    }
  }

  function kill(g, dst, src, o) {
    if (dst.dead) return;
    dst.dead = true; dst.hp = 0; dst.dieT = g.t;
    if (VIS) g.fx.push({ k: 'burst', x: dst.x, y: dst.y, c: dst.type === 'tower' ? '#bcaaa4' : (dst.team === 0 ? '#64b5f6' : '#ef5350'), n: dst.type === 'minion' ? 6 : (dst.type === 'hero' ? 14 : 24), t0: g.t, dur: 0.8 });
    if (dst.type === 'hero') {
      dst.deaths++;
      dst.respawnAt = g.t + CFG.respawnBase + CFG.respawnPerLevel * dst.level;
      dst.fx = []; dst.dash = null; dst.casting = null;
      const killer = src && src.type === 'hero' ? src : (src && src.lastHeroOwner) || null;
      if (killer && killer.team !== dst.team) {
        killer.kills++; g.score[killer.team]++;
        addGold(killer, 300); addXp(g, killer, 150);
        for (const a of alliedHeroes(g, killer.team, dst.x, dst.y, 260)) if (a !== killer) { addGold(a, 60); addXp(g, a, 60); }
      } else if (dst.team === 0 || dst.team === 1) { g.score[1 - dst.team]++; }
      g.events.push({ k: 'kill', killer: killer ? killer.def.name : (src && src.type === 'tower' ? 'ป้อม' : 'มินเนียน'),
        kteam: src ? src.team : 1 - dst.team, victim: dst.def.name, vteam: dst.team });
    } else if (dst.type === 'minion') {
      dst.dieT = g.t;
      for (const a of alliedHeroes(g, 1 - dst.team, dst.x, dst.y, 260)) addXp(g, a, 14);
      if (src && src.type === 'hero') {
        const gm = TR.EMBLEMS[src.emblem].goldMul || 1;
        addGold(src, 20 * gm);
        src.cs++;
        if (o && o.basic && src.emblem === 'lob') { src.greedCount++; if (src.greedCount >= 3) { src.greedCount = 0; src.greedReady = true; } }
      }
    } else if (dst.type === 'tower') {
      for (const a of alliedHeroes(g, 1 - dst.team, dst.x, dst.y, 450)) addGold(a, 150);
      g.events.push({ k: 'tower', team: dst.team, name: dst.name });
      if (dst.king) { g.over = true; g.winner = 1 - dst.team; g.events.push({ k: 'over', winner: g.winner }); }
    }
  }

  /* ---------- สกิล ---------- */
  function canCast(g, u, slot) {
    return !g.over && !u.dead && u.cd[slot] <= 0 && !u.m.stun && !u.casting && !u.dash;
  }

  function dirToward(u, e) { return norm(e.x - u.x, e.y - u.y); }

  function castSkill(g, u, slot) {
    if (!canCast(g, u, slot)) return false;
    const sk = u.def.skills[slot];
    // เช็กว่ามีเป้าสำหรับสกิลที่ต้องมีเป้า ก่อนเสียคูลดาวน์
    for (const fx of sk.fx) {
      if (fx.k === 'strike' && !pickEnemy(g, u, fx.range + 20, false, true)) return false;
      if (fx.k === 'combo' && !pickEnemy(g, u, fx.range + 20, false, true)) return false;
      if (fx.k === 'chain' && !pickEnemy(g, u, fx.range, false, true)) return false;
      if (fx.k === 'mark' && enemiesIn(g, u.team, u.x, u.y, fx.range, true).filter(function (e) { return e.type === 'hero'; }).length === 0) return false;
      if (fx.k === 'link' && alliedHeroes(g, u.team, u.x, u.y, fx.range).filter(function (a) { return a !== u; }).length === 0) return false;
      if (fx.k === 'heal' && fx.hpBelow && !lowestAlly(g, u, fx.r, fx.hpBelow)) return false;
    }
    const ctx = { mul: 1, slot: slot };
    if (u.nextMul) { ctx.mul *= u.nextMul; u.nextMul = 0; }
    if (u.greedReady) { ctx.mul *= 1.08; u.greedReady = false; }
    u.cd[slot] = sk.cd;
    u.lastCast = g.t;
    const st = findFxStealth(u);
    ring(g, u.x, u.y, 14, u.def.colors.accent, 0.2);
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

  function aimPoint(g, u, range, fallback) {
    const e = pickEnemy(g, u, range + 20, false, true);
    if (e) {
      const d = Math.hypot(e.x - u.x, e.y - u.y);
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
        const e = pickEnemy(g, u, fx.range, false, true);
        const dir = e ? dirToward(u, e) : u.face;
        let mul = ctx.mul;
        if (fx.stillMul && u.still >= 0.4) mul *= fx.stillMul;
        spawnProj(g, u, dir, fx, mul);
        break;
      }
      case 'cone': {
        const e = pickEnemy(g, u, fx.range, false, true);
        const dir = e ? dirToward(u, e) : u.face;
        const base = Math.atan2(dir[1], dir[0]);
        for (let i = 0; i < fx.n; i++) {
          const a = base + ((i - (fx.n - 1) / 2) / Math.max(1, fx.n - 1)) * (fx.spread * Math.PI / 180);
          spawnProj(g, u, [Math.cos(a), Math.sin(a)], { range: fx.range, speed: fx.speed, w: 4, dmg: fx.dmg }, ctx.mul);
        }
        break;
      }
      case 'blast': {
        const p = aimPoint(g, u, fx.range, 0.7);
        g.zones.push({ kind: 'blast', team: u.team, owner: u, x: p.x, y: p.y, r: fx.r, at: g.t + fx.delay, until: g.t + fx.delay + 0.1,
          dmg: fx.dmg, mul: ctx.mul, slow: fx.slow, stun: fx.stun, c: '#ff7043' });
        break;
      }
      case 'zone': {
        let p;
        if (fx.nearSelf) p = { x: u.x + u.face[0] * fx.range, y: u.y + u.face[1] * fx.range };
        else p = aimPoint(g, u, fx.range, 0.7);
        const z = { kind: 'zone', team: u.team, owner: u, x: p.x, y: p.y, r: fx.r, until: g.t + fx.dur, next: g.t + 0.05, tick: fx.tick,
          dmg: fx.dmg || 0, mul: ctx.mul, slow: fx.slow, heal: fx.heal, healAllies: fx.healAllies, single: fx.single, turret: fx.turret,
          blind: fx.blind, channel: fx.channel, c: fx.heal ? '#66bb6a' : (fx.dmg ? '#ab47bc' : '#4fc3f7') };
        g.zones.push(z);
        if (fx.channel) { u.casting = { until: g.t + fx.dur }; }
        break;
      }
      case 'trap': {
        const mine = g.zones.filter(function (z) { return z.kind === 'trap' && z.owner === u; });
        while (mine.length >= fx.max) { const o = mine.shift(); o.done = true; }
        const p = aimPoint(g, u, fx.range, 0.8);
        g.zones.push({ kind: 'trap', team: u.team, owner: u, x: p.x, y: p.y, r: fx.r, until: g.t + fx.life, dmg: fx.dmg, mul: ctx.mul, root: fx.root, c: '#8d6e63' });
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
        let cur = pickEnemy(g, u, fx.range, false, true);
        const seen = [];
        let from = u;
        for (let i = 0; i < fx.n && cur; i++) {
          seen.push(cur);
          line(g, from, cur, '#fff176', 0.15);
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
        const tgt = pickEnemy(g, u, fx.range + 20, false, true);
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
        const e = pickEnemy(g, u, fx.range + 20, false, true);
        if (!e) break;
        if (fx.dashTo && dist(u, e) > 26) {
          const d = dirToward(u, e);
          u.x = e.x - d[0] * (e.radius + u.radius + 4); u.y = e.y - d[1] * (e.radius + u.radius + 4);
          u.px = u.x; u.py = u.y;
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
        if (best) { addFx(best, { type: 'link', tag: 'link' + u.id, by: u, share: fx.share, until: g.t + fx.dur }); line(g, u, best, '#ffd54f', 0.4); }
        break;
      }
      case 'counter': {
        addFx(u, { type: 'counter', tag: 'counter', until: g.t + fx.dur, dmg: fx.dmg, reduce: fx.reduce });
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
    } else if (fx.toTarget) {
      const e = pickEnemy(g, u, fx.range || 170, !!fx.onlyHero, true);
      if (e) {
        dir = dirToward(u, e);
        if (fx.stop != null) dd = Math.max(0, Math.min(fx.dist, dist(u, e) - e.radius - fx.stop));
      } else if (fx.onlyHero) return;
    }
    if (dd < 2) {
      const e = pickEnemy(g, u, (fx.stop || 24) + 14, !!fx.onlyHero, true);
      if (e && fx.dmg) hit(g, u, e, fx.dmg, { skill: true, mul: ctx.mul });
      return;
    }
    u.face = dir;
    u.dash = { dx: dir[0], dy: dir[1], remain: dd, speed: 380, fx: fx, mul: ctx.mul, hits: [] };
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
      if (Math.hypot(e.x - u.x, e.y - u.y) <= u.radius + e.radius + w) {
        d.hits.push(e);
        if (d.fx.dmg) hit(g, u, e, d.fx.dmg, { skill: true, mul: d.mul });
        if (d.fx.push) { e.x = clamp(e.x + d.dx * d.fx.push, 20, CFG.W - 20); e.y = clamp(e.y + d.dy * d.fx.push, 50, CFG.H - 50); }
      }
    }
    if (d.remain <= 0.5) u.dash = null;
  }

  function spawnProj(g, u, dir, fx, mul) {
    g.projs.push({ team: u.team, src: u, x: u.x, y: u.y, vx: dir[0] * fx.speed, vy: dir[1] * fx.speed, left: fx.range, w: fx.w || 5,
      dmg: fx.dmg, mul: mul, rootedMul: fx.rootedMul, c: u.def.colors.accent, hit: [], skill: true });
  }

  /* ---------- อัปเดตหนึ่งรอบ ---------- */
  function step(g) {
    if (g.over) return;
    const dt = CFG.dt;
    for (const u of g.units) { u.px = u.x; u.py = u.y; }
    g.t += dt; g.tick++;

    // ยุค
    const ne = Math.min(TR.ERAS.length - 1, Math.floor(g.t / CFG.eraLen));
    if (ne !== g.era) { g.era = ne; g.events.push({ k: 'era', era: ne }); }
    const toNext = (g.era + 1) * CFG.eraLen - g.t;
    if (g.era < TR.ERAS.length - 1 && toNext <= CFG.eraWarn && g.warned !== g.era) { g.warned = g.era; g.events.push({ k: 'warn', era: g.era + 1 }); }

    // ตัวจับเวลา
    for (let i = g.timers.length - 1; i >= 0; i--) {
      const tm = g.timers[i];
      if (g.t >= tm.at) { g.timers.splice(i, 1); tm.fn(); }
    }

    // มินเนียน
    if (g.t >= g.nextWave) { spawnWave(g); g.nextWave += CFG.waveEvery; }

    for (const u of g.units) {
      if (u.type === 'hero') updateHero(g, u, dt);
    }
    for (const u of g.units) {
      if (u.type === 'minion') updateMinion(g, u, dt);
      else if (u.type === 'tower') updateTower(g, u, dt);
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
    for (let team = 0; team < 2; team++) {
      const x0 = team === 0 ? 230 : CFG.W - 230, dir = team === 0 ? 1 : -1;
      for (let l = 0; l < CFG.lanes.length; l++) {
        for (let i = 0; i < nm + nr; i++) {
          const ranged = i >= nm;
          // เกิดที่ฐาน แล้วเดินออกไปเข้าเลนตามทางโค้ง (เลนกลางตรงเข้าเลย)
          mkUnit(g, { type: 'minion', team: team, lane: l, inLane: l === 1, ranged: ranged, x: x0 + dir * i * 12, y: CFG.baseY + (g.rand() - 0.5) * 40,
            hp: (ranged ? 220 : 320) * sc, maxHp: (ranged ? 220 : 320) * sc, dmg: (ranged ? 28 : 22) * sc, as: 1, range: ranged ? 70 : 18,
            speed: 48, radius: 6, baseArmor: 0.1 });
        }
      }
    }
  }

  function updateHero(g, u, dt) {
    if (u.dead) {
      if (g.t >= u.respawnAt) {
        const sp = spawnPos(u.team, u.slot);
        u.dead = false; u.x = sp.x; u.y = sp.y; u.px = u.x; u.py = u.y;
        recalc(g, u); u.hp = u.maxHp; u.dash = null; u.casting = null;
      }
      return;
    }
    aggregate(g, u);
    for (let i = 0; i < 3; i++) if (u.cd[i] > 0) u.cd[i] -= dt;
    if (u.atkCd > 0) u.atkCd -= dt;
    u.goldTotal += 0; addGold(u, 1.2 * dt);
    u.tier = Math.min(CFG.maxTier, Math.floor(u.gold / CFG.goldPerTier));
    recalc(g, u);

    // ฟื้นเลือด
    const em = TR.EMBLEMS[u.emblem];
    const sp = u.team === 0 ? 100 : CFG.W - 100;
    const inBase = Math.hypot(u.x - sp, u.y - CFG.baseY) < 230;
    u.hp = Math.min(u.maxHp, u.hp + u.maxHp * (inBase ? 0.08 : 0.004 * (em.regenMul || 1)) * dt);
    for (const e of u.fx) if (e.type === 'hot') u.hp = Math.min(u.maxHp, u.hp + e.perSec * dt);

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
    if (!u.isPlayer && g.aiThink) g.aiThink(g, u);

    // เคลื่อนที่
    let moved = false;
    if (u.dash) { stepDash(g, u, dt); moved = true; }
    else if (!u.m.stun && !u.m.root && !u.casting) {
      const ix = u.input.dx, iy = u.input.dy, l = Math.hypot(ix, iy);
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

  function autoAttack(g, u) {
    const r = TR.ROLES[u.role];
    const range = r.range * (u.m.blind ? 0.6 : 1);
    let tgt = null;
    const tn = findFx(u, 'taunt');
    if (tn && tn.by && !tn.by.dead) { if (dist(u, tn.by) - tn.by.radius <= range) tgt = tn.by; else return; }
    if (!tgt && u.aiTarget && canTarget(g, u, u.aiTarget) && dist(u, u.aiTarget) - u.aiTarget.radius <= range) tgt = u.aiTarget;
    if (!tgt) {
      let bh = null, bhd = 1e9, bm = null, bmd = 1e9, bt = null, btd = 1e9;
      for (const e of g.units) {
        if (e.team === u.team || e.dead || !canTarget(g, u, e)) continue;
        const d = dist(u, e) - e.radius;
        if (d > range) continue;
        if (e.type === 'hero') { if (d < bhd) { bhd = d; bh = e; } }
        else if (e.type === 'minion') { if (d < bmd) { bmd = d; bm = e; } }
        else if (d < btd) { btd = d; bt = e; }
      }
      tgt = bh || bm || bt;
    }
    if (!tgt || u.atkCd > 0) return;
    u.atkCd = 1 / (r.as * u.m.atkSpd);
    u.lastAtk = g.t;
    u.face = dirToward(u, tgt);
    const st = findFxStealth(u); if (st) removeFx(u, st);
    if (r.range > 60) {
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

  function moveToward(u, tx, ty, dt) {
    const dx = tx - u.x, dy = ty - u.y, l = Math.hypot(dx, dy);
    if (l < 1) return;
    const spd = (u.speed || u.baseSpeed) * u.m.speed * (1 - u.m.slow);
    const s = Math.min(l, spd * dt);
    u.x += dx / l * s; u.y += dy / l * s;
    u.face = [dx / l, dy / l];
  }

  function updateTower(g, u, dt) {
    if (u.dead) return;
    aggregate(g, u);
    if (u.cdAtk > 0) u.cdAtk -= dt;
    const beh = TR.ERAS[g.era].tower;
    let tgt = u.tgt;
    if (tgt && (tgt.dead || !canTarget(g, u, tgt) || dist(u, tgt) - tgt.radius > u.range)) tgt = null;
    if (!beh.focus || !tgt) tgt = chooseTowerTarget(g, u);
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

  function chooseTowerTarget(g, u) {
    let taunter = null, aggro = null, ab = 1e9, minion = null, md = 1e9, hero = null, hd = 1e9;
    for (const e of g.units) {
      if (e.team === u.team || e.dead || !canTarget(g, u, e)) continue;
      const d = dist(u, e) - e.radius;
      if (d > u.range) continue;
      if (e.type === 'hero') {
        if (findFx(e, 'towerTaunt')) taunter = e;
        if (e.lastHeroHit > g.t - 2.5 && d < ab) { ab = d; aggro = e; }
        if (d < hd) { hd = d; hero = e; }
      } else if (e.type === 'minion' && d < md) { md = d; minion = e; }
    }
    return taunter || aggro || minion || hero;
  }

  function updateProjs(g, dt) {
    for (let i = g.projs.length - 1; i >= 0; i--) {
      const p = g.projs[i];
      if (p.tgt) {
        if (p.tgt.dead) { g.projs.splice(i, 1); continue; }
        const dx = p.tgt.x - p.x, dy = p.tgt.y - p.y, l = Math.hypot(dx, dy);
        const s = p.speed * dt;
        if (l <= s + p.tgt.radius) {
          hit(g, p.src, p.tgt, p.dmg, { basic: true, mul: p.mul });
          g.projs.splice(i, 1); continue;
        }
        p.x += dx / l * s; p.y += dy / l * s;
        continue;
      }
      const sx = p.vx * dt, sy = p.vy * dt;
      p.x += sx; p.y += sy; p.left -= Math.hypot(sx, sy);
      let gone = p.left <= 0;
      if (!gone) {
        for (const e of g.units) {
          if (e.dead || e.team === p.team || p.hit.indexOf(e) >= 0 || !canTarget(g, p.src, e)) continue;
          if (Math.hypot(e.x - p.x, e.y - p.y) <= e.radius + p.w) {
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
          for (const e of enemiesIn(g, z.team, z.x, z.y, z.r, true)) { const d = Math.hypot(e.x - z.x, e.y - z.y); if (d < bd) { bd = d; best = e; } }
          if (best) { line(g, z, best, '#fff176', 0.1); hit(g, z.owner, best, z.dmg, { skill: true, mul: z.mul }); }
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
      if (a.type !== 'tower') { a.x = clamp(a.x, 14, CFG.W - 14); a.y = clamp(a.y, 40, CFG.H - 40); }
    }
  }

  TR.Sim = {
    createGame: createGame, step: step, castSkill: castSkill, canCast: canCast,
    pickEnemy: pickEnemy, enemiesIn: enemiesIn, alliedHeroes: alliedHeroes, canTarget: canTarget,
    towerVuln: towerVuln, dist: dist, norm: norm, findFx: findFx, lowestAlly: lowestAlly, recalc: recalc
  };
})(typeof window !== 'undefined' ? window : globalThis);
