/* Thai Realm — สมองบอท (ตามเลน ตีมินเนียน ใช้สกิล ถอยเมื่อเลือดต่ำ ไม่ดำน้ำป้อมถ้าไม่มีมินเนียนนำ) */
(function (G) {
  'use strict';
  const TR = G.TR, S = TR.Sim, CFG = TR.CFG;

  // ป้อมศัตรูชั้นหน้าสุดที่โจมตีได้ในเลนนั้น (เลนโล่งแล้ว = ราชธานี ถ้าเปิดอยู่)
  function frontTower(g, team, lane) {
    const en = 1 - team;
    for (let i = 0; i < CFG.laneTowers.length; i++) { const t = g.towers[en][lane][i]; if (!t.dead) return t; }
    const k = g.kings[en];
    return S.towerVuln(g, k) ? k : null;
  }

  function allyMinionsNear(g, team, x, y, r) {
    let n = 0;
    for (const m of g.units) if (m.type === 'minion' && m.team === team && !m.dead && Math.hypot(m.x - x, m.y - y) <= r) n++;
    return n;
  }

  function think(g, u) {
    const ai = u.ai;
    if (g.t < ai.next) return;
    ai.next = g.t + 0.15 + (u.id % 5) * 0.01;

    const dir = u.team === 0 ? 1 : -1;
    const role = TR.ROLES[u.role];
    const rng = role.range;
    const ranged = rng > 60;
    const hpR = u.hp / u.maxHp;
    const homeX = u.team === 0 ? 100 : CFG.W - 100;
    const lane = ai.lane, laneY = CFG.lanes[lane].y + ai.yOff;
    const ft = frontTower(g, u.team, lane);
    const minionsAtTower = ft ? allyMinionsNear(g, u.team, ft.x, ft.y, 110) : 0;
    let enemyDead = 0;
    for (const e of g.units) if (e.type === 'hero' && e.team !== u.team && e.dead) enemyDead++;
    // ศัตรูตายอย่างน้อย 2 คน = จังหวะบุกป้อมแม้มินเนียนไม่อยู่
    const groupN = S.alliedHeroes(g, u.team, u.x, u.y, 300).length;
    const towerOk = minionsAtTower >= 2 || (enemyDead >= 1 && u.hp / u.maxHp > 0.5) || (groupN >= 3 && u.hp / u.maxHp > 0.6);

    // ป้องกันฐาน: ศัตรูเข้าใกล้ราชธานีของเรา
    const myKing = g.kings[u.team];
    if (g.t >= ai.chk) {
      ai.chk = g.t + 1.5;
      let thr = 0;
      for (const e of g.units) if (e.type === 'hero' && e.team !== u.team && !e.dead && Math.hypot(e.x - myKing.x, e.y - myKing.y) < 520) thr++;
      ai.defend = thr > 0 && !myKing.dead;
    }

    // ข้อมูลรอบตัว
    let eh = null, ehd = 1e9, ehCount = 0, nm = null, nmd = 1e9, minions = 0;
    for (const e of g.units) {
      if (e.team === u.team || e.dead || e.type === 'tower') continue;
      if (e.type === 'monster' && !ai.jungle) continue;
      if (!S.canTarget(g, u, e)) continue;
      const d = S.dist(u, e) - e.radius;
      if (e.type === 'hero') {
        if (d < 260) ehCount++;
        if (d < ehd) { ehd = d; eh = e; }
      } else if (d < 200) { minions++; if (d < nmd) { nmd = d; nm = e; } }
    }
    const allies = S.alliedHeroes(g, u.team, u.x, u.y, 260).filter(function (a) { return a !== u; });

    // สายป่า: เลือกค่ายมอนที่ใกล้ที่สุดฝั่งเรา (ชอบค่ายบัฟตอนเลือดดี)
    let jm = null;
    if (ai.jungle) {
      let bs = 1e9;
      for (const e of g.units) {
        if (e.type !== 'monster' || e.dead || e.side !== u.team) continue;
        const sc = S.dist(u, e) - (TR.MONSTERS[e.kind].buff && hpR > 0.6 ? 220 : 0);
        if (sc < bs) { bs = sc; jm = e; }
      }
      // ไม่มีค่ายเหลือ = ไปเล่นเลนกลางระหว่างรอมอนเกิดใหม่
    }

    // เลือดน้อย → ถอย
    if (ai.retreat) { if (hpR > 0.7) ai.retreat = false; }
    else if (hpR < 0.3) ai.retreat = true;

    if (jm && !(eh && ehd < 220)) { eh = jm; ehd = S.dist(u, jm) - jm.radius; }
    const ctx = { eh: eh, ehd: ehd, ehCount: ehCount, minions: minions, nmd: nmd, allies: allies.length, hpR: hpR };

    // ใช้สกิล
    for (let s = 2; s >= 0; s--) {
      if (!S.canCast(g, u, s)) continue;
      if (shouldCast(g, u, u.def.skills[s], ctx)) { if (S.castSkill(g, u, s)) break; }
    }

    if (ai.retreat) {
      u.aiTarget = null;
      u.input.dx = homeX - u.x; u.input.dy = CFG.baseY - u.y;
      return;
    }

    // เลือกเป้า
    let tgt = null;
    const tn = S.findFx(u, 'taunt');
    if (tn && tn.by && !tn.by.dead) tgt = tn.by;
    if (!tgt && eh && ehd <= (ranged ? rng + 70 : 230)) {
      // ไม่ไล่เข้าใต้ป้อมถ้าไม่มีมินเนียนนำ (ยกเว้นเป้าเลือดน้อยมาก)
      const t2 = ft && Math.hypot(eh.x - ft.x, eh.y - ft.y) < CFG.towerRange + 20;
      const safe = !t2 || towerOk || eh.hp / eh.maxHp < 0.25;
      // แอสซาซินไม่พุ่งเดี่ยว: เข้าเมื่อเป้าเลือดไม่เต็ม หรือมีเพื่อนอยู่ใกล้
      const assassinOk = u.role !== 'assassin' || eh.hp / eh.maxHp < 0.65 || allies.length >= 2;
      if (safe && assassinOk) tgt = eh;
    }
    if (!tgt && jm && !(eh && ehd < 220 && eh !== jm)) tgt = jm;
    if (!tgt && nm && nmd <= (ranged ? rng + 40 : 90)) tgt = nm;
    if (!tgt && ft && towerOk && S.dist(u, ft) - ft.radius <= (ranged ? rng + 60 : 120)) tgt = ft;
    u.aiTarget = tgt;

    let tx, ty;
    if (tgt) {
      const d = S.dist(u, tgt) - tgt.radius;
      const want = ranged ? rng * 0.85 : Math.max(10, rng * 0.6);
      if (d > want + 6) { tx = tgt.x; ty = tgt.y; }
      else if (ranged && d < 55 && tgt.type === 'hero') { tx = u.x - (tgt.x - u.x); ty = u.y - (tgt.y - u.y); }
      else { tx = u.x; ty = u.y; }
    } else {
      // เดินตามคลื่นมินเนียนไปหาป้อมศัตรู
      let lead = null;
      for (const m of g.units) {
        if (m.type !== 'minion' || m.team !== u.team || m.dead) continue;
        if (m.lane !== lane) continue;
        if (!lead || (m.x - lead.x) * dir > 0) lead = m;
      }
      const behind = u.role === 'tank' ? -20 : (ranged ? 70 : 35);
      let wx = lead ? lead.x - dir * behind : (u.team === 0 ? 420 : CFG.W - 420);
      let wy = laneY;
      if (ai.defend) { wx = myKing.x + dir * 240; wy = CFG.baseY; }
      if (ft && !towerOk && !ai.defend) {
        const stop = ft.x - dir * (CFG.towerRange + 30);
        if ((wx - stop) * dir > 0) wx = stop;
      }
      tx = wx; ty = wy;
    }
    u.input.dx = tx - u.x; u.input.dy = ty - u.y;
    if (Math.abs(u.input.dx) < 3 && Math.abs(u.input.dy) < 3) { u.input.dx = 0; u.input.dy = 0; }
  }

  function shouldCast(g, u, sk, c) {
    const R = sk.aiRange || 100;
    const aoe = sk.fx.some(function (f) { return f.k === 'blast' || f.k === 'nova' || f.k === 'zone' || f.k === 'cone'; });
    const isHeal = sk.fx.some(function (f) { return f.k === 'heal'; });
    switch (sk.ai) {
      case 'enemy':
        if (c.eh && c.ehd <= R) return true;
        return aoe && c.minions >= 3 && c.nmd <= R * 0.8 && !isHeal;
      case 'fight': return !!(c.eh && c.ehd <= R);
      case 'ult':
        if (!c.eh || c.ehd > R) return false;
        return c.ehCount >= 2 || c.eh.hp / c.eh.maxHp < 0.5 || c.hpR < 0.5;
      case 'lowAlly': return !!S.lowestAlly(g, u, R, 0.65);
      case 'lowAllyCrit': return !!S.lowestAlly(g, u, R, 0.25);
      case 'allies': {
        if (isHeal || sk.fx.some(function (f) { return f.zone || f.healAllies; })) return !!S.lowestAlly(g, u, R, 0.8);
        return c.allies >= 1 && !!c.eh && c.ehd <= 260;
      }
      case 'taunt': return !!(c.eh && c.ehd <= R + 10 && c.allies >= 1);
      case 'escape': return c.hpR < 0.5 && !!c.eh && c.ehd < 110;
    }
    return false;
  }

  TR.AI = { think: think };
})(typeof window !== 'undefined' ? window : globalThis);
