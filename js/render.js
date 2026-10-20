/* Thai Realm — ตัววาดภาพ (พิกเซลที่วาดด้วยโค้ด ความละเอียดภายใน 640×360 แล้วขยายเป็นจำนวนเต็ม)
   วาดที่ 60 เฟรม สอดแทรกตำแหน่งระหว่างรอบตรรกะ 20 ครั้งต่อวินาที */
(function (G) {
  'use strict';
  const TR = G.TR, CFG = TR.CFG;
  const VW = 640, VH = 360;
  const TEAM = ['#3b82f6', '#ef4444'];
  const TEAM_DARK = ['#1d4ed8', '#b91c1c'];

  function R(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); }
  function hash(n) { n = Math.imul(n ^ 61, 2654435761) >>> 0; n = Math.imul(n ^ (n >>> 15), 2246822519) >>> 0; return (n >>> 0) / 4294967296; }

  function pxCircle(c, cx, cy, r, col, alpha, fill) {
    cx = Math.round(cx); cy = Math.round(cy); r = Math.round(r);
    c.globalAlpha = alpha; c.fillStyle = col;
    for (let dy = -r; dy <= r; dy++) {
      const half = Math.floor(Math.sqrt(r * r - dy * dy));
      if (fill) c.fillRect(cx - half, cy + dy, half * 2 + 1, 1);
      else {
        const inner = Math.floor(Math.sqrt(Math.max(0, (r - 1) * (r - 1) - dy * dy)));
        if (Math.abs(dy) >= r - 1 || inner === 0) c.fillRect(cx - half, cy + dy, half * 2 + 1, 1);
        else { c.fillRect(cx - half, cy + dy, half - inner + 1, 1); c.fillRect(cx + inner, cy + dy, half - inner + 1, 1); }
      }
    }
    c.globalAlpha = 1;
  }
  function pxLine(c, x1, y1, x2, y2, col, alpha) {
    const n = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / 2));
    c.globalAlpha = alpha; c.fillStyle = col;
    for (let i = 0; i <= n; i++) c.fillRect(Math.round(x1 + (x2 - x1) * i / n), Math.round(y1 + (y2 - y1) * i / n), 2, 2);
    c.globalAlpha = 1;
  }

  /* ---------- ฉากและของประดับตามยุค ---------- */
  function drawProp(c, kind, x, y, h) {
    switch (kind) {
      case 'tree':
        R(c, x - 1, y - 6, 3, 7, '#5d4037');
        R(c, x - 6, y - 16, 13, 10, '#3f7d32'); R(c, x - 4, y - 20, 9, 5, '#4c9140'); R(c, x - 6, y - 10, 13, 2, '#356b2a');
        break;
      case 'pagoda':
        R(c, x - 5, y - 8, 11, 8, '#c9a66b'); R(c, x - 7, y - 11, 15, 3, '#b3412c');
        R(c, x - 4, y - 18, 9, 7, '#d9b77a'); R(c, x - 6, y - 21, 13, 3, '#b3412c'); R(c, x - 1, y - 28, 3, 7, '#e0b84a');
        break;
      case 'sandbag':
        R(c, x - 8, y - 4, 16, 4, '#9c8a5f'); R(c, x - 6, y - 8, 12, 4, '#a89667'); R(c, x - 4, y - 12, 8, 4, '#9c8a5f');
        R(c, x + 10, y - 12, 2, 12, '#5d4037');
        break;
      case 'building': {
        const hh = 18 + Math.floor(h * 20);
        R(c, x - 9, y - hh, 18, hh, '#6e7885'); R(c, x - 9, y - hh, 18, 2, '#58626e');
        for (let wy = y - hh + 4; wy < y - 4; wy += 6) for (let wx = x - 6; wx < x + 6; wx += 6) R(c, wx, wy, 3, 3, h > 0.5 ? '#ffe082' : '#37474f');
        break;
      }
    }
  }

  function drawGround(c, g, camX, camY) {
    const era = TR.ERAS[g.era];
    R(c, 0, 0, VW, VH, era.ground);
    // ลายพื้น
    const x0 = Math.floor(camX / 32) * 32, y0 = Math.floor(camY / 32) * 32;
    c.fillStyle = era.ground2;
    for (let gx = x0; gx < camX + VW + 32; gx += 32) {
      for (let gy = y0; gy < camY + VH + 32; gy += 32) {
        if ((gx / 32 + gy / 32) % 2 === 0) c.fillRect(gx - camX, gy - camY, 32, 32);
        const hv = hash(gx * 31 + gy * 17 + g.era);
        if (hv > 0.82) R(c, gx - camX + (hv * 40 | 0) % 28, gy - camY + (hv * 97 | 0) % 28, 2, 2, era.lane2);
      }
    }
    // ถนนเลน
    const ly = CFG.laneY - camY;
    R(c, 0, ly - 70, VW, 140, era.lane);
    R(c, 0, ly - 70, VW, 3, era.lane2); R(c, 0, ly + 67, VW, 3, era.lane2);
    for (let gx = Math.floor(camX / 24) * 24; gx < camX + VW + 24; gx += 24) {
      const hv = hash(gx + 7 * g.era);
      if (hv > 0.5) R(c, gx - camX, ly - 20 + (hv * 100 % 40), 8, 1, era.lane2);
    }
    // ของประดับริมถนน
    for (let col = Math.floor(camX / 56) - 1; col < (camX + VW) / 56 + 1; col++) {
      for (let k = 0; k < 4; k++) {
        const hv = hash(col * 13 + k * 101);
        if (hv < 0.45) continue;
        const px = col * 56 + hv * 50 - camX;
        const top = k < 2;
        const py = top ? (30 + hash(col * 7 + k) * 70) : (CFG.H - 20 - hash(col * 5 + k) * 70);
        drawProp(c, era.prop, px, py - camY, hv);
      }
    }
    // ลานฐาน
    for (let team = 0; team < 2; team++) {
      const bx = (team === 0 ? 100 : CFG.W - 100) - camX;
      if (bx > -90 && bx < VW + 90) { pxCircle(c, bx, CFG.laneY - camY, 70, TEAM[team], 0.12, true); pxCircle(c, bx, CFG.laneY - camY, 70, TEAM[team], 0.35, false); }
    }
  }

  /* ---------- ฮีโร่ มินเนียน ป้อม ---------- */
  function drawHeroSprite(c, def, team, sx, sy, face, t, moving, flash, scale) {
    const col = def.colors, tank = def.role === 'tank';
    const bw = tank ? 12 : 10;
    const h = Math.round(bw / 2);
    R(c, sx - h - 1, sy - 1, bw + 2, 3, 'rgba(0,0,0,0.28)');
    const f = moving ? (Math.floor(t * 8) % 2) : 0;
    R(c, sx - 4, sy - 6 + (f ? 0 : 1), 3, 6 - (f ? 0 : 1), '#3e2f23');
    R(c, sx + 1, sy - 6 + (f ? 1 : 0), 3, 6 - (f ? 1 : 0), '#3e2f23');
    R(c, sx - h, sy - 14, bw, 9, flash ? '#ffffff' : col.body);
    R(c, sx - h, sy - 8, bw, 1, col.accent);
    if (tank) { R(c, sx - h - 2, sy - 13, 2, 7, col.accent); R(c, sx + h, sy - 13, 2, 7, col.accent); }
    R(c, sx - 4, sy - 21, 8, 7, flash ? '#ffffff' : '#f0c9a0');
    R(c, sx - 4, sy - 21, 8, 3, col.hair);
    const ex = face[0] > 0.3 ? 1 : face[0] < -0.3 ? -2 : -1;
    R(c, sx + ex, sy - 17, 1, 2, '#222'); R(c, sx + ex + 2, sy - 17, 1, 2, '#222');
    switch (def.id) {
      case 'nakdab': R(c, sx - 4, sy - 19, 8, 1, '#e53935'); break;
      case 'phran': R(c, sx - 5, sy - 22, 10, 4, '#2e7d32'); break;
      case 'mohya': R(c, sx - 1, sy - 24, 3, 3, '#8bc34a'); R(c, sx - 4, sy - 22, 8, 1, '#8bc34a'); break;
      case 'kwan': R(c, sx - 5, sy - 23, 10, 3, '#ffb300'); break;
      case 'mothamma': R(c, sx - 7, sy - 22, 14, 2, '#6a1b9a'); R(c, sx - 4, sy - 26, 8, 4, '#7b1fa2'); break;
      case 'muay': R(c, sx - 8, sy - 12, 2, 3, '#fff'); R(c, sx + 6, sy - 12, 2, 3, '#fff'); R(c, sx - 4, sy - 20, 8, 1, '#fff'); break;
      case 'seri': R(c, sx - 5, sy - 23, 10, 4, '#78909c'); break;
      case 'yai': R(c, sx - 8, sy - 22, 16, 2, '#d7b56d'); R(c, sx - 3, sy - 25, 6, 3, '#d7b56d'); break;
      case 'spy': R(c, sx - 4, sy - 18, 8, 2, '#111'); break;
      case 'mae': R(c, sx - 5, sy - 22, 10, 2, '#f48fb1'); R(c, sx - 3, sy - 24, 6, 2, '#f48fb1'); R(c, sx - 1, sy - 26, 2, 2, '#f48fb1'); break;
      case 'win': R(c, sx - 5, sy - 23, 10, 5, '#ff7043'); R(c, sx - 4, sy - 19, 8, 1, '#212121'); break;
      case 'chang': R(c, sx - 5, sy - 23, 10, 3, '#fdd835'); R(c, sx - 6, sy - 21, 12, 1, '#fdd835'); break;
    }
    // อาวุธ
    const wx = sx + Math.round(face[0] * 8), wy = sy - 10 + Math.round(face[1] * 4);
    R(c, wx - 1, wy - 1, 3, 3, col.accent);
  }

  function drawMinion(c, u, sx, sy, t, moving) {
    const col = TEAM[u.team], dk = TEAM_DARK[u.team];
    R(c, sx - 5, sy - 1, 10, 2, 'rgba(0,0,0,0.25)');
    const f = moving ? Math.floor(t * 6) % 2 : 0;
    R(c, sx - 3, sy - 4 + f, 2, 4 - f, dk); R(c, sx + 1, sy - 4 + (1 - f), 2, 4 - (1 - f), dk);
    R(c, sx - 4, sy - 10, 8, 7, u.flash > t ? '#fff' : col);
    R(c, sx - 3, sy - 14, 6, 5, '#f0c9a0');
    R(c, sx - 3, sy - 14, 6, 2, dk);
    if (u.ranged) R(c, sx + (u.team === 0 ? 4 : -6), sy - 11, 2, 7, '#8d6e63');
    else R(c, sx + (u.team === 0 ? 4 : -6), sy - 9, 2, 5, '#cfd8dc');
  }

  function drawTower(c, g, u, sx, sy) {
    const era = g.era, tc = TEAM[u.team], td = TEAM_DARK[u.team], king = u.idx === CFG.towers.length - 1;
    if (u.dead) {
      R(c, sx - 14, sy - 4, 28, 5, '#6b6258'); R(c, sx - 8, sy - 9, 10, 6, '#7d746a'); R(c, sx + 2, sy - 7, 9, 4, '#5a5249');
      return;
    }
    const wide = king ? 18 : 14;
    const vuln = TR.Sim.towerVuln(g, u);
    R(c, sx - wide - 2, sy - 1, wide * 2 + 4, 4, 'rgba(0,0,0,0.3)');
    switch (era) {
      case 0: // ค่ายไม้
        R(c, sx - wide, sy - 12, wide * 2, 12, '#6d4c41');
        for (let i = -wide + 2; i < wide; i += 5) R(c, sx + i, sy - 14, 3, 14, '#5d4037');
        R(c, sx - wide - 2, sy - 22, wide * 2 + 4, 8, '#8d6e63'); R(c, sx - wide - 2, sy - 22, wide * 2 + 4, 2, '#a1887f');
        R(c, sx - 1, sy - 34 - (king ? 6 : 0), 2, 14 + (king ? 6 : 0), '#4e342e'); R(c, sx + 1, sy - 34 - (king ? 6 : 0), 9, 6, tc);
        break;
      case 1: // กำแพงอิฐ + ปืนใหญ่
        R(c, sx - wide, sy - 26, wide * 2, 26, '#a1664a');
        for (let yy = sy - 26; yy < sy; yy += 5) { R(c, sx - wide, yy, wide * 2, 1, '#7d4a37'); for (let xx = -wide + (((yy - sy) / 5) & 1 ? 3 : 0); xx < wide; xx += 7) R(c, sx + xx, yy, 1, 5, '#7d4a37'); }
        for (let i = -wide; i < wide; i += 6) R(c, sx + i, sy - 30, 4, 4, '#a1664a');
        R(c, sx + 4, sy - 22, 14, 5, '#37474f'); R(c, sx + 14, sy - 23, 5, 7, '#263238');
        R(c, sx - 1, sy - 40 - (king ? 6 : 0), 2, 12 + (king ? 6 : 0), '#4e342e'); R(c, sx + 1, sy - 40 - (king ? 6 : 0), 9, 6, tc);
        break;
      case 2: // ป้อมปืนกล
        R(c, sx - wide, sy - 16, wide * 2, 16, '#7a7669'); R(c, sx - wide, sy - 16, wide * 2, 3, '#8d8979');
        R(c, sx - wide + 3, sy - 12, wide * 2 - 6, 3, '#2b2b2b');
        for (let i = -wide - 3; i < wide + 3; i += 6) R(c, sx + i, sy - 4, 5, 4, '#9c8a5f');
        if (u.tgt && !u.tgt.dead) { const a = Math.atan2(u.tgt.y - u.y, u.tgt.x - u.x); R(c, sx + Math.cos(a) * 10, sy - 18 + Math.sin(a) * 4, 7, 2, '#212121'); }
        else R(c, sx + 6, sy - 18, 7, 2, '#212121');
        R(c, sx - 1, sy - 30 - (king ? 6 : 0), 2, 14 + (king ? 6 : 0), '#455a64'); R(c, sx + 1, sy - 30 - (king ? 6 : 0), 8, 5, tc);
        break;
      default: // ป้อมไฟฟ้า + กล้องวงจรปิด
        R(c, sx - wide + 2, sy - 8, wide * 2 - 4, 8, '#78909c');
        R(c, sx - 7, sy - 34 - (king ? 6 : 0), 14, 28 + (king ? 6 : 0), '#90a4ae'); R(c, sx - 7, sy - 34 - (king ? 6 : 0), 3, 28 + (king ? 6 : 0), '#b0bec5');
        R(c, sx - 5, sy - 38 - (king ? 6 : 0), 10, 5, '#263238');
        R(c, sx + 2, sy - 37 - (king ? 6 : 0), 2, 2, Math.floor(g.t * 2) % 2 ? '#ff1744' : '#7f0000');
        R(c, sx - 1, sy - 48 - (king ? 6 : 0), 2, 10, '#546e7a'); R(c, sx + 1, sy - 48 - (king ? 6 : 0), 7, 4, tc);
    }
    R(c, sx - wide, sy - 1, wide * 2, 2, td);
    if (!vuln) { c.globalAlpha = 0.45; pxCircle(c, sx, sy - 14, 16, '#ffffff', 0.35, false); c.globalAlpha = 1; }
  }

  function hpBar(c, sx, sy, w, ratio, team, big) {
    const h = big ? 3 : 2;
    R(c, sx - w / 2, sy, w, h + 2, '#111');
    R(c, sx - w / 2 + 1, sy + 1, Math.max(0, Math.round((w - 2) * ratio)), h, TEAM[team]);
  }

  /* ---------- วาดทั้งเฟรม ---------- */
  function draw(c, g, alpha) {
    c.imageSmoothingEnabled = false;
    const pl = g.player;
    let cx = CFG.W / 2, cy = CFG.H / 2;
    if (pl) { cx = pl.px + (pl.x - pl.px) * alpha; cy = pl.py + (pl.y - pl.py) * alpha; }
    const camX = Math.round(Math.max(0, Math.min(CFG.W - VW, cx - VW / 2)));
    const camY = Math.round(Math.max(0, Math.min(CFG.H - VH, cy - VH / 2)));
    drawGround(c, g, camX, camY);

    // โซนพื้น
    for (const z of g.zones) {
      const sx = z.x - camX, sy = z.y - camY;
      if (sx < -100 || sx > VW + 100) continue;
      if (z.kind === 'blast') {
        const k = Math.max(0, Math.min(1, 1 - (z.at - g.t) / 0.6));
        pxCircle(c, sx, sy, z.r, z.c, 0.12 + 0.2 * k, true); pxCircle(c, sx, sy, z.r, z.c, 0.7, false);
      } else if (z.kind === 'trap') {
        R(c, sx - 5, sy - 1, 10, 3, '#6d4c41'); R(c, sx - 3, sy - 4, 2, 3, '#a1887f'); R(c, sx + 1, sy - 4, 2, 3, '#a1887f');
      } else {
        pxCircle(c, sx, sy, z.r, z.c, 0.14, true); pxCircle(c, sx, sy, z.r, z.c, 0.6, false);
        if (z.turret) { R(c, sx - 4, sy - 8, 8, 8, '#455a64'); R(c, sx - 2, sy - 11, 4, 3, '#fdd835'); }
        if (z.heal && z.healAllies) { R(c, sx - 5, sy - 7, 10, 7, '#8d6e63'); R(c, sx - 4, sy - 9, 8, 2, '#fff59d'); }
      }
    }

    // เรียงตามแกน y
    const list = g.units.slice().sort(function (a, b) { return (a.py + (a.y - a.py) * alpha) - (b.py + (b.y - b.py) * alpha); });
    for (const u of list) {
      const ix = u.px + (u.x - u.px) * alpha, iy = u.py + (u.y - u.py) * alpha;
      const sx = Math.round(ix - camX), sy = Math.round(iy - camY);
      if (sx < -60 || sx > VW + 60) continue;
      const moving = Math.abs(u.x - u.px) + Math.abs(u.y - u.py) > 0.05;
      if (u.type === 'tower') {
        drawTower(c, g, u, sx, sy);
        if (!u.dead) { hpBar(c, sx, sy - (u.idx === 2 ? 56 : 46), u.idx === 2 ? 36 : 28, u.hp / u.maxHp, u.team, true); }
      } else if (u.type === 'minion') {
        if (u.dead) continue;
        drawMinion(c, u, sx, sy, g.t, moving);
        if (u.hp < u.maxHp) hpBar(c, sx, sy - 18, 10, u.hp / u.maxHp, u.team, false);
      } else if (u.type === 'hero') {
        if (u.dead) continue;
        const stealth = u.m.stealth, own = pl && u.team === pl.team;
        if (u.untarget > g.t) c.globalAlpha = 0.35;
        else if (stealth) c.globalAlpha = own ? 0.45 : 0.1;
        drawHeroSprite(c, u.def, u.team, sx, sy, u.face, g.t, moving, u.flash > g.t, 1);
        c.globalAlpha = 1;
        // ธง/วงทีมใต้เท้า
        R(c, sx - 6, sy + 2, 12, 1, TEAM[u.team]);
        hpBar(c, sx, sy - 31, 22, u.hp / u.maxHp, u.team, true);
        // เลเวล
        R(c, sx - 14, sy - 31, 9, 6, '#111'); c.fillStyle = '#fff'; c.font = '6px monospace'; c.fillText(String(u.level), sx - 12, sy - 26);
        if (u === pl) { R(c, sx - 1, sy - 38, 3, 3, '#ffeb3b'); R(c, sx - 2, sy - 40, 5, 1, '#ffeb3b'); }
        // สถานะ
        const eStun = u.m.stun, eSlow = u.m.slow > 0, eRoot = u.m.root;
        if (eStun) { R(c, sx - 4, sy - 36, 2, 2, '#fff176'); R(c, sx + 2, sy - 36, 2, 2, '#fff176'); }
        else if (eRoot) R(c, sx - 5, sy + 1, 10, 2, '#8d6e63');
        else if (eSlow) R(c, sx - 5, sy + 1, 10, 1, '#4fc3f7');
        if (u.casting) pxCircle(c, sx, sy - 2, 10, '#ce93d8', 0.5, false);
        if (u.dash) R(c, sx - u.face[0] * 10 - 2, sy - 8 - u.face[1] * 6, 5, 3, 'rgba(255,255,255,0.5)');
      }
    }

    // ลูกกระสุน
    for (const p of g.projs) {
      const sx = Math.round(p.x - camX), sy = Math.round(p.y - camY);
      if (sx < -10 || sx > VW + 10) continue;
      if (p.basic) R(c, sx - 1, sy - 8, 3, 3, p.c);
      else { R(c, sx - 2, sy - 8, 5, 5, p.c); R(c, sx - 1, sy - 7, 3, 3, '#fff'); }
    }
    // เอฟเฟกต์
    for (const f of g.fx) {
      const k = (g.t - f.t0) / f.dur, a = Math.max(0, 1 - k);
      if (f.k === 'ring') pxCircle(c, f.x - camX, f.y - camY, f.r * (0.6 + 0.4 * k), f.c, a * 0.8, false);
      else if (f.k === 'line') pxLine(c, f.x1 - camX, f.y1 - camY - 8, f.x2 - camX, f.y2 - camY - 8, f.c, a);
      else if (f.k === 'decoy') { c.globalAlpha = 0.4; drawHeroSprite(c, { id: '', role: 'x', colors: { body: f.c, accent: '#fff', hair: '#222' } }, 0, Math.round(f.x - camX), Math.round(f.y - camY), [1, 0], g.t, false, false, 1); c.globalAlpha = 1; }
    }
    return { camX: camX, camY: camY };
  }

  function drawMinimap(c, g, w, h, cam) {
    c.fillStyle = '#10161d'; c.fillRect(0, 0, w, h);
    const sx = w / CFG.W, sy = h / CFG.H;
    c.fillStyle = '#243142'; c.fillRect(0, h * 0.28, w, h * 0.44);
    for (const u of g.units) {
      if (u.dead) continue;
      const x = u.x * sx, y = u.y * sy;
      if (u.type === 'tower') { c.fillStyle = TEAM[u.team]; c.fillRect(x - 3, y - 3, 6, 6); }
      else if (u.type === 'minion') { c.fillStyle = TEAM[u.team]; c.fillRect(x, y, 1, 1); }
      else if (u.type === 'hero') {
        if (u.m.stealth && g.player && u.team !== g.player.team) continue;
        c.fillStyle = u === g.player ? '#ffeb3b' : TEAM[u.team]; c.fillRect(x - 2, y - 2, 4, 4);
      }
    }
    if (cam) { c.strokeStyle = 'rgba(255,255,255,0.5)'; c.strokeRect(cam.camX * sx, cam.camY * sy, VW * sx, VH * sy); }
  }

  function drawHeroIcon(c, def, w, h) {
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, w, h);
    drawHeroSprite(c, def, 0, Math.round(w / 2), h - 6, [1, 0], 0, false, false, 1);
  }

  TR.Render = { VW: VW, VH: VH, draw: draw, drawMinimap: drawMinimap, drawHeroIcon: drawHeroIcon, TEAM: TEAM };
})(typeof window !== 'undefined' ? window : globalThis);
