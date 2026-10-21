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
      s.act = S.actsFor(modelFor(def).style, def.id).enter;
      if (Sg.yaw === undefined) { Sg.yaw = 0; Sg.vy = 0; Sg.idle = 0; Sg.zoom = 1; Sg.drag = false; }
      Sg.entrySpin = (Sg.side || 1) * TAU * 0.9;
    }
    return s;
  }
  function pickAct(s, def) {
    const M = modelFor(def), acts = S.actsFor(M.style, def.id), names = Object.keys(acts).filter(function (n) { return n !== 'enter' && n !== s.last; });
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

  /* ---------- แกนกลางเรนเดอร์ (ใช้ร่วมกันทั้งเวทีเลือกตัวและในสนามรบ) ---------- */
  function mkCam(pitch, camD, f, cx, cy) {
    const SP = Math.sin(pitch), CP = Math.cos(pitch);
    return { SP: SP, CP: CP, D: camD, f: f, cx: cx, cy: cy, camY: camD * SP, camZ: camD * CP };
  }
  function pjx(cam, x, y, z) { // x,y,z ในกรอบหลังหมุน → [sx, sy, depth, scale]
    const zc = cam.D - y * cam.SP - z * cam.CP, yc = y * cam.CP - z * cam.SP, k = cam.f / zc;
    return [cam.cx + x * k, cam.cy - yc * k, zc, k];
  }
  // คำนวณเมทริกซ์ข้อต่อ: rotOf(i) → [rx,ry,rz] ของข้อต่อ i (รวม base แล้ว)
  function nodeMats(M, rotOf) {
    const n = M.T.length, N = new Array(n), par = M.parent || S.PARENT;
    for (let i = 0; i < n; i++) {
      const L = mLocal(M.T[i][0], rotM.apply(null, rotOf(i)));
      N[i] = par[i] < 0 ? L : mMul(N[par[i]], L);
    }
    return N;
  }
  function lowestY(M, N, onlyFeet) {
    let minY = 1e9;
    const list = onlyFeet ? M.feet : null;
    const each = function (part) { const m = N[part.n], v = part.m.v; for (let i = 0; i < v.length; i++) { const p = v[i], y = m[4] * p[0] + m[5] * p[1] + m[6] * p[2] + m[7]; if (y < minY) minY = y; } };
    if (list) list.forEach(function (pi) { each(M.parts[pi]); }); else M.parts.forEach(each);
    return minY;
  }
  function shade(n) {
    const l = Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]);
    return 0.56 + 0.62 * l + 0.1 * n[1];
  }
  // รวบรวมหน้าของโมเดล (ตัดหน้าหลัง ฉาย คำนวณแสง) ลง faces
  // เมทริกซ์ของชิ้นส่วน: ล้อ (part.wh = จุดเพลา) หมุนรอบแกน x ตามมุม ang
  function partMat(p, F, ang) {
    if (!p.wh) return F[p.n];
    return S.mMul(F[p.n], S.mLocal(p.wh, S.rotM(ang, 0, 0)));
  }
  function gather(faces, mesh, m, rgb, em, cam, flash) {
    const tv = mesh.v.map(function (p) { return [m[0] * p[0] + m[1] * p[1] + m[2] * p[2] + m[3], m[4] * p[0] + m[5] * p[1] + m[6] * p[2] + m[7], m[8] * p[0] + m[9] * p[1] + m[10] * p[2] + m[11]]; });
    const pv = new Array(tv.length);
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
      if (nx * (0 - gx) + ny * (cam.camY - gy) + nz * (cam.camZ - gz) <= 0) continue;
      const b = em ? 1.18 : shade([nx, ny * cam.CP - nz * cam.SP, ny * cam.SP + nz * cam.CP]);
      const pts = [];
      let zs = 0;
      for (let i = 0; i < len; i++) { const vi = fc[i]; if (!pv[vi]) pv[vi] = pjx(cam, tv[vi][0], tv[vi][1], tv[vi][2]); pts.push(pv[vi]); zs += pv[vi][2]; }
      faces.push({ pts: pts, z: zs / len, b: b, rgb: rgb, fl: flash });
    }
  }
  function paintFaces(c, faces, ow, alpha, amb) {
    faces.sort(function (a, b) { return b.z - a.z; });
    c.save(); c.globalAlpha = alpha; c.lineJoin = 'round'; c.lineCap = 'round';
    c.strokeStyle = 'rgba(18,10,8,0.95)'; c.lineWidth = ow * 2;
    c.beginPath();
    faces.forEach(function (fc) { const p = fc.pts; c.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) c.lineTo(p[i][0], p[i][1]); c.closePath(); });
    c.stroke();
    const A0 = amb || [40, 30, 80];
    faces.forEach(function (fc) {
      const b = fc.b, r = fc.rgb;
      let R, G2, B;
      if (b <= 1) { R = r[0] * b + A0[0] * (1 - b) * 0.18; G2 = r[1] * b + A0[1] * (1 - b) * 0.18; B = r[2] * b + A0[2] * (1 - b) * 0.22; }
      else { const w = Math.min(1, (b - 1) * 1.6); R = r[0] + (255 - r[0]) * w; G2 = r[1] + (255 - r[1]) * w; B = r[2] + (255 - r[2]) * w; }
      if (fc.fl) { R += (255 - R) * 0.75; G2 += (255 - G2) * 0.75; B += (255 - B) * 0.75; }
      const p = fc.pts;
      c.beginPath(); c.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) c.lineTo(p[i][0], p[i][1]); c.closePath();
      c.fillStyle = 'rgb(' + (R | 0) + ',' + (G2 | 0) + ',' + (B | 0) + ')'; c.fill();
      c.strokeStyle = 'rgba(10,6,4,0.16)'; c.lineWidth = Math.max(0.5, ow * 0.4); c.stroke();
    });
    c.restore();
  }
  function paintGlows(c, M, F, cam, now, alpha) {
    c.save(); c.globalCompositeOperation = 'lighter';
    M.parts.forEach(function (p) {
      if (!p.glow) return;
      let sx = 0, sy = 0, sz = 0; const m = F[p.n], k = p.m.v.length;
      p.m.v.forEach(function (v) { sx += v[0]; sy += v[1]; sz += v[2]; });
      sx /= k; sy /= k; sz /= k;
      const q = pjx(cam, m[0] * sx + m[1] * sy + m[2] * sz + m[3], m[4] * sx + m[5] * sy + m[6] * sz + m[7], m[8] * sx + m[9] * sy + m[10] * sz + m[11]);
      const rad = p.glow * q[3] * (1 + Math.sin(now * 5) * 0.12);
      const g = c.createRadialGradient(q[0], q[1], 0, q[0], q[1], rad); g.addColorStop(0, p.gc ? p.gc[0] : 'rgba(255,245,170,.85)'); g.addColorStop(0.35, p.gc ? p.gc[1] : 'rgba(255,220,120,.35)'); g.addColorStop(1, 'rgba(255,200,80,0)');
      c.globalAlpha = alpha; c.fillStyle = g; c.beginPath(); c.arc(q[0], q[1], rad, 0, TAU); c.fill();
    });
    c.restore();
  }


  /* ---------- ในสนามรบ ---------- */
  const LEG = [], UPPER = [];
  S.KEYS.forEach(function (k, i) { if (/^(hp|kn)[AB]\./.test(k)) LEG.push(i); else if (k !== 'root.y') UPPER.push(i); });
  const IDLEP = S.arr(), TMPP = new Float32Array(S.KEYS.length), RUNP = new Float32Array(S.KEYS.length), POSEP = new Float32Array(S.KEYS.length);
  const ATK = { melee: ['slash', 0.3, 0.65], staff: ['swing', 0.3, 0.65], bow: ['shoot', 1.0, 0.5], gun: ['shoot', 1.15, 0.45], fist: ['combo', 0.25, 0.6] };
  function sstep(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
  function overlay(out, act, t, w, legW) {
    S.evalAct(act, t, TMPP);
    for (let i = 0; i < UPPER.length; i++) { const j = UPPER[i]; out[j] += (TMPP[j] - out[j]) * w; }
    for (let i = 0; i < LEG.length; i++) { const j = LEG[i]; out[j] += (TMPP[j] - out[j]) * legW; }
    out[KI['root.y']] += TMPP[KI['root.y']] * w;
  }
  // สร้างท่าจากสถานะเกม: mv 0..1.3 (เดิน), ph เฟสก้าว (เรเดียน), atkP/castP 0..1 ขณะกำลังทำ (นอกช่วง = ≥1), dead 0..1
  const RCA = { nakdab: 'salute', phran: 'scout', mohya: 'brew', kwan: 'stomp', mothamma: 'chant', muay: 'wai', seri: 'reload', yai: 'declare', spy: 'flourish', mae: 'serve', win: 'rev', chang: 'zap', nopphamat: 'lantern', khunsuek: 'hold', pun: 'reload', yamada: 'draw', jaa: 'thrustup', nurse: 'aid', traffic: 'stop', press: 'snap' };   // ท่ากลับพระนคร = ท่าประจำตัวหน้าเลือกตัว
  function gamePose(M, st, out) {
    const HG = S.HERO[M.id] && S.HERO[M.id].game ? S.actsFor(M.style, M.id) : null, acts = S.actsFor(M.style);
    out.set(M.rest || S.arrFor(M.id));
    const rt = st.rt || 0;
    const breathe = Math.sin(rt * 2.2 + (st.id || 0)) * 0.5 + 0.5;
    out[KI['torso.rx']] += breathe * 0.025; out[KI['head.rx']] += Math.sin(rt * 1.3 + (st.id || 0)) * 0.025;
    const mv = clamp(st.mv, 0, 1.3);
    const HL = S.HERO[M.id]; if (HL && HL.life && mv <= 0.03 && !M.rest) HL.life(out, rt + (st.id || 0));   // ท่านิ่งมีชีวิตเฉพาะตัว
    if (mv > 0.03 && M.rest) {
      const k = Math.min(1, mv) * 0.7, sw = Math.sin(st.ph);
      out[KI['shA.rx']] += sw * k; out[KI['hpB.rx']] += sw * k; out[KI['shB.rx']] -= sw * k; out[KI['hpA.rx']] -= sw * k;
    } else if (mv > 0.03 && M.bike) {   // ขี่รถ: ขานั่งงออยู่กับที่ โน้มตัวไปข้างหน้าตามความเร็ว
      out[KI['torso.rx']] += Math.min(1, mv) * 0.14; out[KI['head.rx']] -= Math.min(1, mv) * 0.1; out[KI['root.y']] += Math.sin(st.ph * 2) * 0.12 * Math.min(1, mv);
    } else if (mv > 0.03) {
      RUNP.set(S.runPoseAt(st.ph));
      const k = Math.min(1, mv);
      for (let i = 0; i < out.length; i++) out[i] += (RUNP[i] - out[i]) * k;
      if (mv > 1) out[KI['root.rx']] += 0.25 * (mv - 1) / 0.3;
    }
    const legKeep = 1 - clamp(mv * 1.6, 0, 1);
    if (HG && st.rcT >= 0 && RCA[M.id] && HG[RCA[M.id]]) {   // กำลังกลับพระนคร: ทำท่าประจำตัวเป็นลูป
      const ra = HG[RCA[M.id]], w = sstep(st.rcT / 0.35);
      overlay(out, ra, st.rcT % ra.dur, w, w * 0.8);
    } else if (HG && st.atkP >= 0 && st.atkP < 1 && HG.gatk) {
      const w = sstep(st.atkP / 0.12) * sstep((1 - st.atkP) / 0.2);
      overlay(out, HG.gatk, st.atkP * HG.gatk.dur, w, w * legKeep);
    } else if (HG && st.castP >= 0 && st.castP < 1 && HG['gc' + ((st.castS | 0) % 3)]) {
      const ca = HG['gc' + ((st.castS | 0) % 3)], w = sstep(st.castP / 0.12) * sstep((1 - st.castP) / 0.25);
      overlay(out, ca, st.castP * ca.dur, w, w * legKeep);
    } else if (st.atkP >= 0 && st.atkP < 1 && ATK[M.style]) {
      const a = ATK[M.style], w = sstep(st.atkP / 0.15) * sstep((1 - st.atkP) / 0.2);
      if (acts[a[0]]) overlay(out, acts[a[0]], a[1] + st.atkP * a[2], w, w * legKeep);
    } else if (st.castP >= 0 && st.castP < 1 && acts.cast) {
      const w = sstep(st.castP / 0.15) * sstep((1 - st.castP) / 0.25);
      overlay(out, acts.cast, 0.3 + st.castP * 0.9, w, w * legKeep);
    }
    if (M.anim) { M.anim(out, st, rt); return out; }
    if (st.dead > 0) {
      const k = ease(clamp(st.dead * 2.5, 0, 1));
      out[KI['root.rx']] = -1.5 * k; out[KI['shA.rz']] += 0.9 * k; out[KI['shB.rz']] -= 0.9 * k; out[KI['hpA.rz']] += 0.25 * k; out[KI['hpB.rz']] -= 0.25 * k;
    }
    return out;
  }
  const MODEL_KEY = {};
  /* วาดโมเดลหนึ่งตัวลงบนแคนวาสตามพิกัดที่ transform ปัจจุบันกำหนด (หน่วยโลก)
     o: { x, y (จุดเท้า), facing (เรเดียน 0 = หันหากล้อง), pitch, scale, alpha, flash, amb } */
  function drawFigure(c, M, st, o) {
    const rt = st.rt || 0;
    const P = gamePose(M, st, POSEP);
    P[KI['root.ry']] += o.facing || 0;
    const N = nodeMats(M, heroRot(M, P));
    const dead = st.dead > 0;
    const lift = -lowestY(M, N, !dead) + (dead ? 0 : P[KI['root.y']]);
    const Y = [1, 0, 0, 0, 0, 1, 0, lift, 0, 0, 1, 0];
    const F = N.map(function (m) { return mMul(Y, m); });
    const D = 600, f = D * o.scale * M.scale, cam = mkCam(o.pitch, D, f, o.x, o.y);
    const A = o.alpha === undefined ? 1 : o.alpha;
    c.save(); c.globalAlpha = A * 0.32 * (1 - clamp(lift / 40, 0, 0.6));
    c.fillStyle = '#000'; c.beginPath(); c.ellipse(o.x, o.y, f / D * 7.2 * M.scale0, f / D * 7.2 * M.scale0 * cam.SP, 0, 0, TAU); c.fill(); c.restore();
    const faces = [];
    const wang = -(st.ph || 0) * 1.5;
    M.parts.forEach(function (p) { gather(faces, p.m, partMat(p, F, wang), p.c, p.em, cam, !!o.flash); });
    paintFaces(c, faces, Math.max(0.22, f / D * 0.26), A, o.amb);
    if (M.hasGlow) paintGlows(c, M, F, cam, rt, A);
    return lift;
  }

  /* ---------- เวทีเลือกตัว ---------- */
  function heroRot(M, P) {
    return function (i) {
      const nm = S.NAMES[i];
      if (i === 0) return [P[KI['root.rx']], P[KI['root.ry']], P[KI['root.rz']]];
      if (nm === 'ftA' || nm === 'ftB') { const k = nm === 'ftA' ? 'A' : 'B'; return [-(P[KI['hp' + k + '.rx']] + P[KI['kn' + k + '.rx']]) - P[KI['root.rx']] * 0.9, 0, -P[KI['hp' + k + '.rz']]]; }
      const base = M.T[i][1] || [0, 0, 0];
      return [P[KI[nm + '.rx']] + base[0], P[KI[nm + '.ry']] + base[1], P[KI[nm + '.rz']] + base[2]];
    };
  }

  function draw(c, o) {
    const Sg = o.S, def = o.def, M = modelFor(def), s = st3(Sg, def), acts = S.actsFor(M.style, def.id);
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
      if (s.act.fn) { const w = clamp(Math.min(s.actT, s.act.dur - s.actT) / 0.25, 0, 1), I = S.arrFor(def.id); for (let j = 0; j < P.length; j++) P[j] = I[j] + (P[j] - I[j]) * w; }
    } else P.set(S.arrFor(def.id));
    const breathe = Math.sin(now * 2.2) * 0.5 + 0.5;
    if (!s.act || s.actT > s.act.dur - 0.25) { const HL = S.HERO[def.id]; if (HL && HL.life) HL.life(P, now); P[KI['torso.rx']] += breathe * 0.025; P[KI['shA.rx']] -= breathe * 0.03; P[KI['shB.rx']] -= breathe * 0.03; P[KI['head.rx']] += Math.sin(now * 1.3) * 0.025; }

    const N = nodeMats(M, heroRot(M, P));
    const lift = -lowestY(M, N, true) + P[KI['root.y']];
    const Y = [cyw, 0, syw, 0, 0, 1, 0, lift, -syw, 0, cyw, 0];
    const F = N.map(function (m) { return mMul(Y, m); });
    const Hm = N.map(function (m) { const q = m.slice(); q[7] += lift; return q; });

    const f = o.sc * CAM_D * zoom * M.scale * 0.93, cx = o.cx, cy = o.cy;
    const cam = mkCam(PITCH, CAM_D, f, cx, cy);
    const pj = function (x, y, z) { return pjx(cam, x, y, z); };
    const pjW = function (p) { return pj(p[0] * cyw + p[2] * syw, p[1], -p[0] * syw + p[2] * cyw); };
    const A = (o.alpha === undefined ? 1 : o.alpha);
    const SPv = cam.SP;

    /* --- เงาพื้น --- */
    const air = clamp(lift / 22, 0, 1);
    c.save();
    c.globalAlpha = (1 - air * 0.5) * 0.4 * A;
    c.fillStyle = '#000'; c.beginPath(); c.ellipse(cx, cy, f * 0.075 * (1 - air * 0.3), f * 0.075 * SPv * (1 - air * 0.3), 0, 0, TAU); c.fill();
    c.restore();

    /* --- หน้าทั้งหมด --- */
    const faces = [], stones = [];
    const wang = M.bike ? (s.name === 'rev' ? now * 14 : 0) : 0;
    M.parts.forEach(function (p) { gather(faces, p.m, partMat(p, F, wang), p.c, p.em, cam, false); });
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * TAU + 0.4, r = 25 + (i % 2) * 3, bob = Math.sin(now * 1.4 + i * 1.7) * 1.2;
      const pos = [Math.cos(a) * r, 3.4 + (i % 2) * 1.6 + bob, Math.sin(a) * r];
      const m = mMul(Y, mLocal(pos, rotM(0, now * 0.6 + i, 0)));
      gather(faces, i % 2 ? S.gem(1.5, 5.4, 4) : S.gem(1.1, 3.8, 5), m, S.H(i % 2 ? acc : '#ffffff'), true, cam, false);
      stones.push(pjW(pos));
    }
    paintFaces(c, faces, Math.max(1.1, f * 0.0062), A, o.amb);

    /* --- เอฟเฟกต์ --- */
    if (!force) {
      if (s.act && s.act.fx) s.act.fx.forEach(function (e, i) {
        if (!s.fxDone[i] && s.actT >= e.t) { s.fxDone[i] = true; fx(s, e.k, Hm, M, acc, yaw); }
      });
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
    stones.forEach(function (q) { const rad = f * 0.028; const g = c.createRadialGradient(q[0], q[1], 0, q[0], q[1], rad); g.addColorStop(0, acc + '99'); g.addColorStop(1, acc + '00'); c.globalAlpha = 0.5 * A; c.fillStyle = g; c.beginPath(); c.arc(q[0], q[1], rad, 0, TAU); c.fill(); });
    c.restore();
    paintGlows(c, M, F, cam, now, A);
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let i = s.rings.length - 1; i >= 0; i--) {
      const r = s.rings[i], k = (now - r.t) / r.dur;
      if (k >= 1) { s.rings.splice(i, 1); continue; }
      const R = r.r * (0.2 + 0.8 * (1 - Math.pow(1 - k, 2)));
      c.globalAlpha = (1 - k) * 0.9; c.strokeStyle = r.col; c.lineWidth = Math.max(1.5, f * 0.012 * (1 - k)); c.beginPath();
      for (let j = 0; j <= 40; j++) { const a = j / 40 * TAU, q = pj(Math.cos(a) * R, 0.2, Math.sin(a) * R); if (j) c.lineTo(q[0], q[1]); else c.moveTo(q[0], q[1]); }
      c.stroke();
    }
    for (let i = s.parts.length - 1; i >= 0; i--) {
      const p = s.parts[i]; p.l -= dt; if (p.l <= 0) { s.parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vy -= p.g * dt;
      const q = pjW([p.x, p.y, p.z]), a = clamp(p.l / p.max, 0, 1);
      c.globalAlpha = a * A; c.fillStyle = p.col; c.beginPath(); c.arc(q[0], q[1], Math.max(0.8, p.s * q[3]), 0, TAU); c.fill();
    }
    c.restore();
    if (!force && s.act && s.act.orbit && s.actT > s.act.orbit[0] && s.actT < s.act.orbit[1] && Math.random() < dt * 40) {
      const m = Hm[S.IDX.wrA], t = mApply(m, M.tip), an = Math.random() * TAU;
      s.parts.push({ x: t[0] + Math.cos(an) * 3, y: t[1] + Math.sin(an) * 3, z: t[2] + Math.sin(an * 2) * 3, vx: Math.cos(an) * 5, vy: 7 + Math.random() * 8, vz: Math.sin(an) * 5, g: 0, l: 0.7, max: 0.7, s: 0.5, col: Math.random() < 0.5 ? '#fff6b0' : acc });
    }
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

  TR.Stage3D = { draw: draw, drawFigure: drawFigure, gamePose: gamePose, modelFor: modelFor, mkCam: mkCam, nodeMats: nodeMats, gather: gather, paintFaces: paintFaces, paintGlows: paintGlows, lowestY: lowestY, dragStart: API.dragStart, dragMove: API.dragMove, dragEnd: API.dragEnd, zoomBy: API.zoomBy, resetView: API.resetView, ok: true, _model: modelFor };
})(typeof globalThis !== 'undefined' ? globalThis : this);
