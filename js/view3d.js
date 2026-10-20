/* Thai Realm — ตัวเรนเดอร์เวที 3D (ส่วนที่ 3/3)
   วาดฮีโร่ low-poly ลงใน Canvas 2D ของเวทีเลือกตัว: ฉายภาพแบบเพอร์สเปกทีฟ ตัดหน้าหลัง เรียงหน้า ระบายแฟลตเชด
   จัดการท่าทาง (เข้าฉาก → สุ่มท่าต่อเนื่อง) เอฟเฟกต์ (เงาฟันดาบ คลื่นพื้น ประกาย) และการหมุนกล้องด้วยการลาก */
(function (G) {
  'use strict';
  const TR = G.TR, S = TR.S3D;
  const mMul = S.mMul, rotM = S.rotM, mLocal = S.mLocal, mApply = S.mApply, KI = S.KI, TAU = S.TAU, clamp = S.clamp, ease = S.ease;
  const CAM_D = 150, PITCH = 0.263, SP = Math.sin(PITCH), CP = Math.cos(PITCH);
  const LIGHT = (function () { const l = [-0.5, 0.66, 0.58], n = Math.hypot(l[0], l[1], l[2]); return [l[0] / n, l[1] / n, l[2] / n]; })();
  const MODELS = {};

  function modelFor(def) { return MODELS[def.id] || (MODELS[def.id] = S.build(def)); }

  /* ---------- สถานะต่อเวที ---------- */
  function st3(Sg, def) {
    let s = Sg.s3;
    if (!s || s.id !== def.id || s.t0 !== Sg.t0) {
      s = Sg.s3 = { id: def.id, t0: Sg.t0, act: null, actT: 0, name: 'enter', next: 0, last: 'enter', parts: [], rings: [], trail: [], fxDone: {}, pose: new Float32Array(S.KEYS.length), now: 0 };
      s.act = S.actsFor(modelFor(def).style).enter;
      if (Sg.yaw === undefined) { Sg.yaw = 0; Sg.vy = 0; Sg.idle = 0; Sg.zoom = 1; Sg.drag = false; }
      Sg.entrySpin = (Sg.side || 1) * TAU * 0.9;
    }
    return s;
  }
  function pickAct(s, def) {
    const M = modelFor(def), acts = S.actsFor(M.style), names = Object.keys(acts).filter(function (n) { return n !== 'enter' && n !== s.last; });
    const n = names[Math.floor(Math.random() * names.length)];
    s.name = n; s.act = acts[n]; s.actT = 0; s.fxDone = {}; s.last = n;
  }

  /* ---------- อินพุตหมุนกล้อง ---------- */
  const API = {
    dragStart: function (Sg) { Sg.drag = true; Sg.vy = 0; Sg.idle = 0; Sg.lastMove = performance.now(); Sg.touched = true; },
    dragMove: function (Sg, dx) {
      const now = performance.now(), dt = Math.max(0.008, (now - (Sg.lastMove || now)) / 1000); Sg.lastMove = now;
      const d = dx * 0.0115; Sg.yaw = (Sg.yaw || 0) + d; Sg.vy = Sg.vy * 0.55 + (d / dt) * 0.45; Sg.idle = 0;
    },
    dragEnd: function (Sg) { Sg.drag = false; Sg.vy = clamp(Sg.vy || 0, -9, 9); Sg.idle = 0; },
    zoomBy: function (Sg, k) { Sg.zoom = clamp((Sg.zoom || 1) * k, 0.7, 1.7); Sg.idle = 0; },
    resetView: function (Sg) { Sg.resetting = true; Sg.zoomTarget = 1; },
    ok: true
  };

  /* ---------- วาด ---------- */
  function shade(face, n, M) {
    // n = เวกเตอร์ปกติในกรอบกล้อง (x ขวา, y ขึ้น, z เข้าหากล้อง)
    const l = Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]);
    return 0.56 + 0.62 * l + 0.1 * n[1];
  }

  function draw(c, o) {
    const Sg = o.S, def = o.def, M = modelFor(def), s = st3(Sg, def), acts = S.actsFor(M.style);
    const now = o.now, dt = clamp(o.dt || 0.016, 0.001, 0.05), acc = o.acc || def.colors.accent;
    const force = o.force;
    /* --- อัปเดตกล้อง --- */
    if (!force) {
      if (!Sg.drag) {
        Sg.yaw += Sg.vy * dt; Sg.vy *= Math.exp(-3.2 * dt); Sg.idle += dt;
        if (Sg.idle > 2.4 && Math.abs(Sg.vy) < 0.4) { const tgt = Math.round(Sg.yaw / TAU) * TAU; Sg.yaw += (tgt - Sg.yaw) * (1 - Math.exp(-1.6 * dt)); }
      }
      if (Sg.resetting) { const tgt = Math.round(Sg.yaw / TAU) * TAU; Sg.yaw += (tgt - Sg.yaw) * (1 - Math.exp(-6 * dt)); Sg.zoom += ((Sg.zoomTarget || 1) - Sg.zoom) * (1 - Math.exp(-6 * dt)); Sg.vy = 0; if (Math.abs(tgt - Sg.yaw) < 0.01 && Math.abs(Sg.zoom - 1) < 0.01) Sg.resetting = false; }
    }
    const since = now - Sg.t0;
    const entry = force ? 0 : Math.pow(1 - clamp(since / 0.85, 0, 1), 2) * (Sg.entrySpin || 0);
    const yaw = force && force.yaw !== undefined ? force.yaw : (Sg.yaw || 0) + entry;
    const zoom = force && force.zoom ? force.zoom : (Sg.zoom || 1);
    const cyw = Math.cos(yaw), syw = Math.sin(yaw);

    /* --- เลือกท่า --- */
    if (force) { s.act = acts[force.act] || null; s.actT = force.t || 0; s.fxDone = {}; }
    else {
      s.actT += dt;
      if (s.act && s.actT >= s.act.dur) { s.idleUntil = now + (s.name === 'enter' ? 0.5 : 0.7 + Math.random() * 1.0); s.name = 'idle'; s.act = null; }
      if (!s.act && now >= (s.idleUntil || 0)) pickAct(s, def);
    }
    const P = s.pose;
    if (s.act) {
      S.evalAct(s.act, Math.min(s.actT, s.act.dur), P);
      if (s.act.fn) { const w = clamp(Math.min(s.actT, s.act.dur - s.actT) / 0.25, 0, 1), I = S.arr(); for (let j = 0; j < P.length; j++) P[j] = I[j] + (P[j] - I[j]) * w; }
    } else P.set(S.arr());
    const breathe = Math.sin(now * 2.2) * 0.5 + 0.5;
    if (!s.act || s.actT > s.act.dur - 0.25) { P[KI['torso.rx']] += breathe * 0.025; P[KI['shA.rx']] -= breathe * 0.03; P[KI['shB.rx']] -= breathe * 0.03; P[KI['head.rx']] += Math.sin(now * 1.3) * 0.025; }

    /* --- เมทริกซ์ข้อต่อ (root อยู่ที่ origin ก่อน แล้วค่อยวางบนพื้น) --- */
    const N = new Array(15);
    for (let i = 0; i < 15; i++) {
      let r;
      const nm = S.NAMES[i];
      if (i === 0) r = rotM(P[KI['root.rx']], P[KI['root.ry']], P[KI['root.rz']]);
      else if (nm === 'ftA' || nm === 'ftB') {
        const k = nm === 'ftA' ? 'A' : 'B';
        r = rotM(-(P[KI['hp' + k + '.rx']] + P[KI['kn' + k + '.rx']]) - P[KI['root.rx']] * 0.9, 0, -P[KI['hp' + k + '.rz']]);
      } else {
        const base = M.T[i][1] || [0, 0, 0];
        r = rotM(P[KI[nm + '.rx']] + base[0], P[KI[nm + '.ry']] + base[1], P[KI[nm + '.rz']] + base[2]);
      }
      const L = mLocal(M.T[i][0], r);
      N[i] = i === 0 ? L : mMul(N[S.PARENT[i]], L);
    }
    // ยึดเท้าให้แตะพื้น
    let minY = 1e9;
    M.feet.forEach(function (pi) { const part = M.parts[pi], m = N[part.n]; part.m.v.forEach(function (p) { const y = m[4] * p[0] + m[5] * p[1] + m[6] * p[2] + m[7]; if (y < minY) minY = y; }); });
    const lift = -minY + P[KI['root.y']] + (force ? 0 : 0);
    // ใส่ yaw + ยก root ขึ้นพื้น
    const Y = [cyw, 0, syw, 0, 0, 1, 0, lift, -syw, 0, cyw, 0];
    const F = N.map(function (m) { return mMul(Y, m); });
    // ตำแหน่งในกรอบฮีโร่ (ไม่รวม yaw) สำหรับเส้นเงาฟัน
    const Hm = N.map(function (m) { const q = m.slice(); q[7] += lift; return q; });

    /* --- ฉาย --- */
    const f = o.sc * CAM_D * zoom * M.scale * 0.93, cx = o.cx, cy = o.cy;
    const camY = CAM_D * SP, camZ = CAM_D * CP;
    function pj(x, y, z) { // x,y,z ในกรอบหลังหมุน yaw
      const zc = CAM_D - y * SP - z * CP, yc = y * CP - z * SP, k = f / zc;
      return [cx + x * k, cy - yc * k, zc, k];
    }
    function pjW(p) { return pj(p[0] * cyw + p[2] * syw, p[1], -p[0] * syw + p[2] * cyw); } // จากกรอบฮีโร่

    /* --- เงาพื้น --- */
    const air = clamp(lift / 22, 0, 1);
    c.save();
    c.globalAlpha = (1 - air * 0.5) * 0.4 * (o.alpha === undefined ? 1 : o.alpha);
    c.fillStyle = '#000'; c.beginPath(); c.ellipse(cx, cy, f * 0.075 * (1 - air * 0.3), f * 0.075 * SP * (1 - air * 0.3), 0, 0, TAU); c.fill();
    c.restore();

    /* --- เก็บหน้าทั้งหมด --- */
    const faces = [];
    function addMesh(mesh, m, rgb, em) {
      const tv = mesh.v.map(function (p) { return [m[0] * p[0] + m[1] * p[1] + m[2] * p[2] + m[3], m[4] * p[0] + m[5] * p[1] + m[6] * p[2] + m[7], m[8] * p[0] + m[9] * p[1] + m[10] * p[2] + m[11]]; });
      for (let fi = 0; fi < mesh.f.length; fi++) {
        const fc = mesh.f[fi], len = fc.length;
        let nx = 0, ny = 0, nz = 0, gx = 0, gy = 0, gz = 0;
        for (let i = 0; i < len; i++) {
          const a = tv[fc[i]], b = tv[fc[(i + 1) % len]];
          nx += (a[1] - b[1]) * (a[2] + b[2]); ny += (a[2] - b[2]) * (a[0] + b[0]); nz += (a[0] - b[0]) * (a[1] + b[1]);
          gx += a[0]; gy += a[1]; gz += a[2];
        }
        gx /= len; gy /= len; gz /= len;
        const nl = Math.hypot(nx, ny, nz); if (nl < 1e-6) continue;
        nx /= nl; ny /= nl; nz /= nl;
        if (nx * (0 - gx) + ny * (camY - gy) + nz * (camZ - gz) <= 0) continue; // หันหลังให้กล้อง
        const nc = [nx, ny * CP - nz * SP, ny * SP + nz * CP];
        const b = em ? 1.18 : shade(fc, nc, M);
        const pts = [];
        for (let i = 0; i < len; i++) { const v = tv[fc[i]]; pts.push(pj(v[0], v[1], v[2])); }
        let zs = 0; for (let i = 0; i < len; i++) zs += pts[i][2]; zs /= len;
        faces.push({ pts: pts, z: zs, b: b, rgb: rgb });
      }
    }
    M.parts.forEach(function (p) { addMesh(p.m, F[p.n], p.c, p.em); });
    // หินเรืองแสงลอยรอบเวที (หมุนไปพร้อมกล้อง ช่วยให้เห็นว่ากำลังหมุน)
    const stones = [];
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * TAU + 0.4, r = 25 + (i % 2) * 3, bob = Math.sin(now * 1.4 + i * 1.7) * 1.2;
      const m = mMul(Y, mLocal([Math.cos(a) * r, 3.4 + (i % 2) * 1.6 + bob, Math.sin(a) * r], rotM(0, now * 0.6 + i, 0)));
      addMesh(i % 2 ? S.gem(1.5, 5.4, 4) : S.gem(1.1, 3.8, 5), m, S.H(i % 2 ? acc : '#ffffff'), true);
      stones.push(pjW([Math.cos(a) * r, 3.4 + (i % 2) * 1.6 + bob, Math.sin(a) * r]));
    }
    faces.sort(function (a, b) { return b.z - a.z; });

    /* --- วาดหน้า: ผ่านที่ 1 เส้นขอบหนา (ได้เงาขอบนอก) ผ่านที่ 2 สีแฟลตเชด --- */
    const A = (o.alpha === undefined ? 1 : o.alpha);
    c.save(); c.globalAlpha = A; c.lineJoin = 'round'; c.lineCap = 'round';
    const ow = Math.max(1.1, f * 0.0062);
    c.strokeStyle = 'rgba(18,10,8,0.95)'; c.lineWidth = ow * 2;
    c.beginPath();
    faces.forEach(function (fc) { const p = fc.pts; c.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) c.lineTo(p[i][0], p[i][1]); c.closePath(); });
    c.stroke();
    faces.forEach(function (fc) {
      const b = fc.b, r = fc.rgb;
      let R, G2, B;
      if (b <= 1) { R = r[0] * b; G2 = r[1] * b; B = r[2] * b; R += (o.amb ? o.amb[0] : 40) * (1 - b) * 0.18; G2 += (o.amb ? o.amb[1] : 30) * (1 - b) * 0.18; B += (o.amb ? o.amb[2] : 80) * (1 - b) * 0.22; }
      else { const w = Math.min(1, (b - 1) * 1.6); R = r[0] + (255 - r[0]) * w; G2 = r[1] + (255 - r[1]) * w; B = r[2] + (255 - r[2]) * w; }
      const col = 'rgb(' + (R | 0) + ',' + (G2 | 0) + ',' + (B | 0) + ')';
      const p = fc.pts;
      c.beginPath(); c.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) c.lineTo(p[i][0], p[i][1]); c.closePath();
      c.fillStyle = col; c.fill();
      c.strokeStyle = 'rgba(10,6,4,0.16)'; c.lineWidth = Math.max(0.6, ow * 0.4); c.stroke();
    });
    c.restore();

    /* --- เอฟเฟกต์ --- */
    if (!force) {
      // สัญญาณเหตุการณ์ในท่า
      if (s.act && s.act.fx) s.act.fx.forEach(function (e, i) {
        if (!s.fxDone[i] && s.actT >= e.t) { s.fxDone[i] = true; fx(s, e.k, Hm, M, acc, yaw); }
      });
      // ร่องรอยฟัน
      const tr = s.act && s.act.trail && !s.act.noTrail && s.actT >= s.act.trail[0] && s.actT <= s.act.trail[1];
      if (tr) { const m = Hm[S.IDX.wrA]; s.trail.push({ a: mApply(m, M.tip), b: mApply(m, M.tipBase), t: now }); }
      while (s.trail.length && now - s.trail[0].t > 0.32) s.trail.shift();
    }
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let i = 1; i < s.trail.length; i++) {
      const A0 = s.trail[i - 1], B0 = s.trail[i], age = 1 - (now - B0.t) / 0.32;
      if (age <= 0) continue;
      const p1 = pjW(A0.a), p2 = pjW(B0.a), p3 = pjW(B0.b), p4 = pjW(A0.b);
      c.globalAlpha = clamp(age, 0, 1) * 0.8 * A; c.fillStyle = acc;
      c.beginPath(); c.moveTo(p1[0], p1[1]); c.lineTo(p2[0], p2[1]); c.lineTo(p3[0], p3[1]); c.lineTo(p4[0], p4[1]); c.closePath(); c.fill();
      c.globalAlpha = clamp(age, 0, 1) * 0.9 * A; c.strokeStyle = '#ffffff'; c.lineWidth = Math.max(1, f * 0.006 * age); c.beginPath(); c.moveTo(p1[0], p1[1]); c.lineTo(p2[0], p2[1]); c.stroke();
    }
    // แสงเรืองของชิ้นที่เรือง และหินรอบเวที
    M.parts.forEach(function (p) {
      if (!p.glow) return;
      let sx = 0, sy = 0, sz = 0; const m = F[p.n];
      p.m.v.forEach(function (v) { sx += v[0]; sy += v[1]; sz += v[2]; }); const k = p.m.v.length;
      const q = pj(m[0] * sx / k + m[1] * sy / k + m[2] * sz / k + m[3], m[4] * sx / k + m[5] * sy / k + m[6] * sz / k + m[7], m[8] * sx / k + m[9] * sy / k + m[10] * sz / k + m[11]);
      const rad = p.glow * q[3] * (1 + Math.sin(now * 5) * 0.12);
      const g = c.createRadialGradient(q[0], q[1], 0, q[0], q[1], rad); g.addColorStop(0, 'rgba(255,245,170,.85)'); g.addColorStop(0.35, 'rgba(255,220,120,.35)'); g.addColorStop(1, 'rgba(255,200,80,0)');
      c.globalAlpha = A; c.fillStyle = g; c.beginPath(); c.arc(q[0], q[1], rad, 0, TAU); c.fill();
    });
    stones.forEach(function (q, i) { const rad = f * 0.028; const g = c.createRadialGradient(q[0], q[1], 0, q[0], q[1], rad); g.addColorStop(0, acc + '99'); g.addColorStop(1, acc + '00'); c.globalAlpha = 0.5 * A; c.fillStyle = g; c.beginPath(); c.arc(q[0], q[1], rad, 0, TAU); c.fill(); });
    // คลื่นพื้น
    for (let i = s.rings.length - 1; i >= 0; i--) {
      const r = s.rings[i], k = (now - r.t) / r.dur;
      if (k >= 1) { s.rings.splice(i, 1); continue; }
      const R = r.r * (0.2 + 0.8 * (1 - Math.pow(1 - k, 2)));
      c.globalAlpha = (1 - k) * 0.9; c.strokeStyle = r.col; c.lineWidth = Math.max(1.5, f * 0.012 * (1 - k)); c.beginPath();
      for (let j = 0; j <= 40; j++) { const a = j / 40 * TAU, q = pj(Math.cos(a) * R, 0.2, Math.sin(a) * R); if (j) c.lineTo(q[0], q[1]); else c.moveTo(q[0], q[1]); }
      c.stroke();
    }
    // ประกายอนุภาค
    for (let i = s.parts.length - 1; i >= 0; i--) {
      const p = s.parts[i]; p.l -= dt; if (p.l <= 0) { s.parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vy -= p.g * dt;
      const q = pjW([p.x, p.y, p.z]), a = clamp(p.l / p.max, 0, 1);
      c.globalAlpha = a * A; c.fillStyle = p.col; c.beginPath(); c.arc(q[0], q[1], Math.max(0.8, p.s * q[3]), 0, TAU); c.fill();
    }
    if (!force && s.act && s.act.orbit && s.actT > s.act.orbit[0] && s.actT < s.act.orbit[1] && Math.random() < dt * 40) {
      const m = Hm[S.IDX.wrA], t = mApply(m, M.tip), an = Math.random() * TAU;
      s.parts.push({ x: t[0] + Math.cos(an) * 3, y: t[1] + Math.sin(an) * 3, z: t[2] + Math.sin(an * 2) * 3, vx: Math.cos(an) * 5, vy: 7 + Math.random() * 8, vz: Math.sin(an) * 5, g: 0, l: 0.7, max: 0.7, s: 0.5, col: Math.random() < 0.5 ? '#fff6b0' : acc });
    }
    c.restore();
    return { lift: lift };
  }

  function fx(s, kind, Hm, M, acc, yaw) {
    const now = s.now = performance.now() / 1000;
    const wr = mApply(Hm[S.IDX.wrA], M.tip), foot = [0, 0, 0];
    if (kind === 'land' || kind === 'ring') s.rings.push({ t: now, dur: 0.65, r: kind === 'land' ? 34 : 26, col: acc });
    if (kind === 'cast') { s.rings.push({ t: now, dur: 0.8, r: 40, col: acc }); s.rings.push({ t: now + 0.08, dur: 0.8, r: 28, col: '#ffffff' }); burst(s, wr, 18, acc, 26); }
    if (kind === 'land') burst(s, [0, 1, 0], 16, acc, 22, true);
    if (kind === 'sparks') burst(s, wr, 12, acc, 20);
    if (kind === 'hit') burst(s, wr, 8, '#ffffff', 16);
    if (kind === 'shot') { burst(s, wr, 8, '#fff6b0', 14); s.rings.push({ t: now, dur: 0.4, r: 16, col: '#fff6b0' }); }
  }
  function burst(s, at, n, col, sp, flat) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, e = flat ? 0.1 : Math.random() * 1.6 - 0.4, v = sp * (0.4 + Math.random() * 0.7);
      s.parts.push({ x: at[0], y: at[1], z: at[2], vx: Math.cos(a) * v * Math.cos(e), vy: Math.sin(e) * v + (flat ? 8 : 6), vz: Math.sin(a) * v * Math.cos(e), g: 40, l: 0.5 + Math.random() * 0.5, max: 1, s: 0.7 + Math.random() * 0.8, col: Math.random() < 0.4 ? '#ffffff' : col });
    }
  }

  TR.Stage3D = { draw: draw, dragStart: API.dragStart, dragMove: API.dragMove, dragEnd: API.dragEnd, zoomBy: API.zoomBy, resetView: API.resetView, ok: true, _model: modelFor };
})(typeof globalThis !== 'undefined' ? globalThis : this);
