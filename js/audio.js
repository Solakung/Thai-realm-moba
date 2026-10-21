/* เสียงทั้งหมดสร้างสดด้วย WebAudio (ไม่มีไฟล์เสียง) — เอฟเฟกต์ เพลงประจำยุค และเสียงประกาศ (speechSynthesis)
   ไฟล์นี้แตะเฉพาะฝั่งเบราว์เซอร์ ไม่ถูกใช้ใน Node */
(function (root) {
  'use strict';
  const TR = root.TR = root.TR || {};
  let ctx = null, master, bSfx, bMus, bVoice;
  let vol = { sfx: 1, music: 0.6, voice: true };
  let lastPlay = {};
  let musicOn = false, era = 0, nextT = 0, step = 0, timer = null, seed = 1;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return false;
    try {
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.9;
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6;
      master.connect(comp); comp.connect(ctx.destination);
      bSfx = ctx.createGain(); bMus = ctx.createGain(); bVoice = ctx.createGain();
      bSfx.connect(master); bMus.connect(master); bVoice.connect(master);
      applyVol();
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ctx = null; return false; }
    return true;
  }
  let noiseBuf = null;
  function applyVol() { if (!ctx) return; bSfx.gain.value = vol.sfx; bMus.gain.value = vol.music * 0.5; bVoice.gain.value = 1; }
  function setVol(v) { vol = { sfx: v.sfx, music: v.music, voice: !!v.voice }; applyVol(); if (!vol.voice && root.speechSynthesis) try { root.speechSynthesis.cancel(); } catch (e) { /* ไม่เป็นไร */ } }

  /* ---------- ตัวสร้างเสียงพื้นฐาน ---------- */
  function tone(o) {   // {f, f2, t, dur, type, v, bus, a, at}
    const t0 = (o.at != null ? o.at : ctx.currentTime), osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(o.f, t0);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t0 + o.dur);
    const a = o.a || 0.005, v = o.v == null ? 0.3 : o.v;
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(v, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    osc.connect(g); g.connect(o.bus || bSfx); osc.start(t0); osc.stop(t0 + o.dur + 0.05);
  }
  function noise(o) {  // {dur, v, f, q, type, f2, at}
    const t0 = (o.at != null ? o.at : ctx.currentTime), src = ctx.createBufferSource(), flt = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noiseBuf; src.loop = true;
    flt.type = o.type || 'bandpass'; flt.frequency.setValueAtTime(o.f || 1000, t0); flt.Q.value = o.q || 1;
    if (o.f2) flt.frequency.exponentialRampToValueAtTime(o.f2, t0 + o.dur);
    g.gain.setValueAtTime(o.v == null ? 0.3 : o.v, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    src.connect(flt); flt.connect(g); g.connect(o.bus || bSfx); src.start(t0); src.stop(t0 + o.dur + 0.05);
  }
  const FREQ = function (semi) { return 440 * Math.pow(2, (semi - 9) / 12); };   // semi: 0 = C4

  /* ---------- เอฟเฟกต์เสียง ---------- */
  const SFX = {
    hit: function (v) { noise({ dur: 0.06, f: 1400, q: 0.8, v: 0.22 * v }); tone({ f: 190, f2: 90, dur: 0.07, type: 'triangle', v: 0.18 * v }); },
    hitHero: function (v) { noise({ dur: 0.09, f: 900, q: 0.7, v: 0.3 * v }); tone({ f: 150, f2: 60, dur: 0.12, type: 'triangle', v: 0.28 * v }); },
    shoot: function (v) { tone({ f: 900, f2: 380, dur: 0.09, type: 'square', v: 0.07 * v }); },
    cast: function (v) { tone({ f: 330, f2: 990, dur: 0.18, type: 'sawtooth', v: 0.08 * v }); noise({ dur: 0.15, f: 2500, f2: 800, q: 1.5, v: 0.1 * v }); },
    ult: function (v) { tone({ f: 120, f2: 520, dur: 0.5, type: 'sawtooth', v: 0.14 * v }); tone({ f: 240, f2: 1040, dur: 0.5, type: 'triangle', v: 0.12 * v }); noise({ dur: 0.45, f: 3000, f2: 400, v: 0.14 * v }); },
    die: function (v) { tone({ f: 420, f2: 70, dur: 0.6, type: 'sawtooth', v: 0.2 * v }); noise({ dur: 0.4, f: 600, f2: 150, v: 0.2 * v }); },
    minion: function (v) { noise({ dur: 0.05, f: 700, v: 0.1 * v }); },
    tower: function (v) { noise({ dur: 1.1, f: 400, f2: 60, type: 'lowpass', v: 0.7 * v }); tone({ f: 90, f2: 30, dur: 1, type: 'sine', v: 0.5 * v }); },
    shot: function (v) { tone({ f: 260, f2: 120, dur: 0.15, type: 'square', v: 0.1 * v }); noise({ dur: 0.1, f: 1800, v: 0.12 * v }); },
    levelup: function () { [0, 4, 7, 12].forEach(function (s, i) { tone({ f: FREQ(12 + s), dur: 0.22, type: 'triangle', v: 0.18, at: ctx.currentTime + i * 0.07 }); }); },
    buy: function () { tone({ f: FREQ(19), dur: 0.1, type: 'square', v: 0.1 }); tone({ f: FREQ(24), dur: 0.22, type: 'square', v: 0.1, at: ctx.currentTime + 0.09 }); },
    item: function () { tone({ f: FREQ(14), f2: FREQ(26), dur: 0.3, type: 'triangle', v: 0.2 }); noise({ dur: 0.25, f: 4000, type: 'highpass', v: 0.08 }); },
    heal: function () { tone({ f: FREQ(16), dur: 0.3, type: 'sine', v: 0.14 }); tone({ f: FREQ(23), dur: 0.35, type: 'sine', v: 0.1, at: ctx.currentTime + 0.1 }); },
    recall: function () { tone({ f: 700, f2: 1400, dur: 0.5, type: 'sine', v: 0.14 }); },
    ui: function () { tone({ f: 620, dur: 0.05, type: 'square', v: 0.07 }); },
    ping: function () { tone({ f: 880, dur: 0.12, type: 'triangle', v: 0.18 }); tone({ f: 1175, dur: 0.18, type: 'triangle', v: 0.15, at: ctx.currentTime + 0.1 }); },
    warn: function () { for (let i = 0; i < 2; i++) tone({ f: 520, dur: 0.18, type: 'square', v: 0.12, at: ctx.currentTime + i * 0.25 }); },
    gong: function () { [1, 2.76, 5.4, 8.9].forEach(function (m, i) { tone({ f: 110 * m, dur: 2.2 / (1 + i * 0.5), type: 'sine', v: 0.22 / (1 + i * 0.6), a: 0.01 }); }); },
    boss: function () { tone({ f: 70, f2: 45, dur: 1.4, type: 'sawtooth', v: 0.28 }); tone({ f: 73, f2: 40, dur: 1.4, type: 'square', v: 0.14 }); noise({ dur: 1.2, f: 300, f2: 80, type: 'lowpass', v: 0.4 }); },
    first: function () { [0, 7, 12, 16].forEach(function (s, i) { tone({ f: FREQ(12 + s), dur: 0.5, type: 'sawtooth', v: 0.1, at: ctx.currentTime + i * 0.08 }); }); },
    multi: function () { [0, 4, 7, 12, 16, 19].forEach(function (s, i) { tone({ f: FREQ(12 + s), dur: 0.45, type: 'sawtooth', v: 0.11, at: ctx.currentTime + i * 0.06 }); }); },
    ace: function () { SFX.multi(); SFX.gong(); },
    win: function () { [0, 4, 7, 12, 16, 19, 24].forEach(function (s, i) { tone({ f: FREQ(12 + s), dur: 0.6, type: 'triangle', v: 0.16, at: ctx.currentTime + i * 0.12 }); }); },
    lose: function () { [7, 3, 0, -5].forEach(function (s, i) { tone({ f: FREQ(12 + s), dur: 0.8, type: 'sine', v: 0.18, at: ctx.currentTime + i * 0.3 }); }); }
  };
  // ความถี่สูงสุดที่เล่นซ้ำได้ (วินาทีขั้นต่ำระหว่างเสียงชนิดเดียวกัน)

  /* ---------- เสียงรายฮีโร่: เสียงตีปกติ 1 แบบ + เสียงสกิล 1/2/3 ต่างกันทุกตัว (ประกอบจากชิ้นเสียงพื้นฐาน) ---------- */
  const P = {   // ชิ้นเสียงพื้นฐาน (v = ความดัง)
    slash: function (v, f) { noise({ dur: 0.12, f: f || 2600, f2: 700, q: 1.2, type: 'bandpass', v: 0.2 * v }); tone({ f: 520, f2: 180, dur: 0.1, type: 'triangle', v: 0.07 * v }); },
    clang: function (v, f) { f = f || 880; [1, 2.76, 5.4].forEach(function (m, i) { tone({ f: f * m, dur: 0.35 / (1 + i * 0.6), type: 'sine', v: 0.11 * v / (1 + i * 0.5), a: 0.002 }); }); noise({ dur: 0.04, f: 5000, type: 'highpass', v: 0.1 * v }); },
    thud: function (v, f) { tone({ f: f || 150, f2: 45, dur: 0.18, type: 'sine', v: 0.4 * v }); noise({ dur: 0.08, f: 500, type: 'lowpass', v: 0.2 * v }); },
    boom: function (v) { tone({ f: 85, f2: 30, dur: 0.7, type: 'sine', v: 0.45 * v }); noise({ dur: 0.6, f: 700, f2: 90, type: 'lowpass', v: 0.4 * v }); },
    twang: function (v, f) { tone({ f: f || 640, f2: (f || 640) * 0.5, dur: 0.14, type: 'triangle', v: 0.14 * v }); noise({ dur: 0.07, f: 3000, f2: 1500, q: 2, v: 0.08 * v }); },
    gun: function (v) { noise({ dur: 0.14, f: 1800, f2: 300, type: 'lowpass', v: 0.34 * v }); tone({ f: 160, f2: 60, dur: 0.12, type: 'square', v: 0.14 * v }); },
    sparkle: function (v, s0) { s0 = s0 == null ? 19 : s0; [0, 4, 7, 12].forEach(function (s, i) { tone({ f: FREQ(s0 + s), dur: 0.28, type: 'sine', v: 0.09 * v, at: ctx.currentTime + i * 0.06 }); }); },
    zap: function (v) { for (let i = 0; i < 5; i++) tone({ f: 500 + (i * 397) % 1300, f2: 200, dur: 0.05, type: 'square', v: 0.06 * v, at: ctx.currentTime + i * 0.035 }); noise({ dur: 0.2, f: 4000, type: 'highpass', v: 0.1 * v }); },
    whoosh: function (v, f) { noise({ dur: 0.35, f: f || 500, f2: (f || 500) * 5, q: 0.8, v: 0.22 * v }); },
    pour: function (v) { noise({ dur: 0.45, f: 1300, f2: 2400, q: 3, v: 0.16 * v }); tone({ f: 900, f2: 1500, dur: 0.4, type: 'sine', v: 0.05 * v }); },
    chant: function (v, s0) { s0 = s0 == null ? 0 : s0; [0, 7].forEach(function (s, i) { tone({ f: FREQ(s0 + s), f2: FREQ(s0 + s + (i ? 1 : -1)), dur: 0.7, type: 'triangle', v: 0.09 * v, a: 0.12 }); }); },
    sizzle: function (v) { noise({ dur: 0.5, f: 3500, f2: 6500, type: 'highpass', q: 0.7, v: 0.2 * v }); noise({ dur: 0.3, f: 300, f2: 120, type: 'lowpass', v: 0.2 * v }); },
    roar: function (v) { tone({ f: 190, f2: 520, dur: 0.45, type: 'sawtooth', v: 0.16 * v, a: 0.04 }); tone({ f: 200, f2: 330, dur: 0.5, type: 'square', v: 0.07 * v, a: 0.05 }); },
    punch: function (v) { noise({ dur: 0.05, f: 1200, q: 0.8, v: 0.28 * v }); tone({ f: 130, f2: 55, dur: 0.1, type: 'triangle', v: 0.3 * v }); },
    engine: function (v, up) { tone({ f: up ? 70 : 110, f2: up ? 320 : 150, dur: 0.5, type: 'sawtooth', v: 0.14 * v, a: 0.06 }); noise({ dur: 0.45, f: 400, f2: 900, type: 'lowpass', v: 0.12 * v }); },
    horn: function (v) { tone({ f: 420, dur: 0.22, type: 'square', v: 0.12 * v }); tone({ f: 530, dur: 0.22, type: 'square', v: 0.1 * v }); },
    poof: function (v) { noise({ dur: 0.3, f: 900, f2: 200, type: 'lowpass', v: 0.3 * v }); },
    buzz: function (v) { tone({ f: 100, dur: 0.5, type: 'sawtooth', v: 0.12 * v, a: 0.03 }); tone({ f: 200, f2: 210, dur: 0.5, type: 'square', v: 0.06 * v }); noise({ dur: 0.45, f: 3000, type: 'highpass', v: 0.07 * v }); },
    conch: function (v) { tone({ f: 196, f2: 262, dur: 0.9, type: 'sawtooth', v: 0.12 * v, a: 0.1 }); tone({ f: 392, dur: 0.9, type: 'sine', v: 0.06 * v, a: 0.1 }); },
    dark: function (v) { tone({ f: 600, f2: 60, dur: 0.7, type: 'sawtooth', v: 0.14 * v }); noise({ dur: 0.5, f: 2000, f2: 150, type: 'lowpass', v: 0.2 * v }); }
  };
  const later = function (ms, fn) { setTimeout(function () { try { fn(); } catch (e) { /* ไม่เป็นไร */ } }, ms); };
  const HS = {   // [ตีปกติ, สกิล 1, สกิล 2, สกิล 3]
    nakdab:   [function (v) { P.slash(v); }, function (v) { P.whoosh(v, 600); P.clang(v, 700); }, function (v) { P.slash(v, 2000); later(110, function () { P.slash(v, 3000); }); }, function (v) { P.roar(v); P.clang(v, 520); later(180, function () { P.boom(v * 0.7); }); }],
    phran:    [function (v) { P.twang(v); }, function (v) { P.twang(v, 760); later(90, function () { P.twang(v, 700); }); }, function (v) { P.clang(v * 0.7, 1500); P.thud(v * 0.5, 220); }, function (v) { for (let i = 0; i < 5; i++) later(i * 70, function () { P.twang(v * 0.8, 600 + i * 60); }); }],
    mohya:    [function (v) { P.sparkle(v * 0.5, 24); }, function (v) { P.pour(v); }, function (v) { P.sparkle(v, 19); }, function (v) { P.chant(v, 0); later(250, function () { P.sparkle(v, 24); }); }],
    kwan:     [function (v) { P.thud(v, 120); }, function (v) { P.roar(v); }, function (v) { P.thud(v, 90); later(120, function () { P.boom(v * 0.8); }); }, function (v) { P.roar(v); later(260, function () { P.boom(v); }); }],
    mothamma: [function (v) { P.zap(v * 0.5); }, function (v) { P.chant(v, 2); }, function (v) { P.sizzle(v); P.whoosh(v, 400); }, function (v) { P.chant(v, -2); later(300, function () { P.boom(v); }); }],
    muay:     [function (v) { P.punch(v); }, function (v) { P.punch(v); later(80, function () { P.punch(v); }); }, function (v) { P.whoosh(v, 700); later(150, function () { P.punch(v); }); }, function (v) { P.roar(v * 0.8); later(150, function () { P.punch(v * 1.2); P.thud(v, 100); }); }],
    seri:     [function (v) { P.gun(v * 0.8); }, function (v) { P.clang(v * 0.4, 2400); P.whoosh(v * 0.6, 900); }, function (v) { P.gun(v); }, function (v) { for (let i = 0; i < 4; i++) later(i * 90, function () { P.gun(v * 0.8); }); }],
    yai:      [function (v) { P.thud(v, 180); }, function (v) { P.boom(v * 0.7); }, function (v) { P.clang(v, 330); }, function (v) { P.conch(v); later(300, function () { P.clang(v, 260); }); }],
    spy:      [function (v) { P.slash(v * 0.6, 4000); }, function (v) { P.whoosh(v * 0.7, 1200); later(160, function () { P.clang(v * 0.4, 2800); }); }, function (v) { P.poof(v); }, function (v) { for (let i = 0; i < 3; i++) later(i * 90, function () { P.slash(v, 3500 - i * 500); }); }],
    mae:      [function (v) { P.clang(v * 0.4, 1800); }, function (v) { P.sizzle(v * 0.8); }, function (v) { P.clang(v * 0.9, 600); P.thud(v * 0.4, 200); }, function (v) { P.sizzle(v); later(200, function () { P.sparkle(v * 0.8, 21); }); }],
    win:      [function (v) { P.engine(v * 0.5, true); P.thud(v * 0.5, 160); }, function (v) { P.engine(v, true); }, function (v) { P.horn(v); later(120, function () { P.horn(v); }); }, function (v) { P.engine(v, true); later(300, function () { P.boom(v * 0.8); }); }],
    chang:    [function (v) { P.zap(v * 0.6); }, function (v) { P.zap(v); later(120, function () { P.zap(v * 0.8); }); }, function (v) { P.buzz(v); }, function (v) { P.dark(v); later(350, function () { P.boom(v); }); }]
  };
  // เสียงเฉพาะตัว: 'at:<hero>' = ตีปกติ, 'sk:<hero>:<0-2>' = สกิล
  function heroSfx(name, v) {
    const q = name.split(':'), t = HS[q[1]]; if (!t) return false;
    const f = t[q[0] === 'at' ? 0 : 1 + (q[2] | 0)]; if (!f) return false;
    f(v == null ? 1 : v); return true;
  }
  const GAP = { hit: 0.05, hitHero: 0.07, shoot: 0.08, cast: 0.05, minion: 0.12, shot: 0.12, die: 0.1 };
  function play(name, v) {
    if (!ctx || vol.sfx <= 0) return;
    const hero = name.charCodeAt(2) === 58 && (name.charCodeAt(0) === 97 || name.charCodeAt(0) === 115);   // 'at:' / 'sk:'
    if (!hero && !SFX[name]) return;
    const now = ctx.currentTime, gap = hero ? 0.06 : (GAP[name] || 0.03);
    if (lastPlay[name] && now - lastPlay[name] < gap) return;
    lastPlay[name] = now;
    try { if (hero) { heroSfx(name, v); } else SFX[name](v == null ? 1 : v); } catch (e) { /* ไม่เป็นไร */ }
  }

  /* ---------- เพลงประจำยุค (สร้างจากสเกลเพนทาโทนิก วนต่อเนื่อง) ---------- */
  const ERA_MUS = [
    { bpm: 72, root: 2, scale: [0, 2, 5, 7, 9], lead: 'triangle', drone: 0, perc: 0, name: 'สุโขทัย' },
    { bpm: 84, root: 4, scale: [0, 2, 4, 7, 9], lead: 'triangle', drone: 1, perc: 1, name: 'อยุธยา' },
    { bpm: 102, root: 9, scale: [0, 3, 5, 7, 10], lead: 'sawtooth', drone: 1, perc: 2, name: 'สงคราม' },
    { bpm: 116, root: 7, scale: [0, 2, 4, 7, 9], lead: 'square', drone: 1, perc: 3, name: 'ปัจจุบัน' }
  ];
  function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
  let mel = 2;
  function musicStep(t, i) {
    const M = ERA_MUS[Math.min(era, ERA_MUS.length - 1)], beat = 60 / M.bpm / 2, sc = M.scale, base = 12 + M.root;
    const bar = Math.floor(i / 8), pos = i % 8;
    // เมโลดี้: เดินขึ้นลงบนสเกล
    if (pos % 2 === 0 || rnd() < 0.35) {
      mel = Math.max(0, Math.min(sc.length * 2 - 1, mel + Math.floor(rnd() * 5) - 2));
      if (pos === 0 && rnd() < 0.5) mel = (bar % 2) ? 4 : 2;
      const deg = sc[mel % sc.length] + 12 * Math.floor(mel / sc.length);
      if (rnd() < 0.82) tone({ f: FREQ(base + deg + 12), dur: beat * (pos % 4 === 0 ? 1.8 : 1.0), type: M.lead, v: M.lead === 'sawtooth' ? 0.1 : 0.16, bus: bMus, at: t, a: 0.01 });
    }
    // เบส/ดรอน
    if (pos === 0) tone({ f: FREQ(base - 12 + sc[(bar * 2) % sc.length]), dur: beat * 7.5, type: 'sine', v: 0.2, bus: bMus, at: t, a: 0.05 });
    if (M.drone && pos === 4) tone({ f: FREQ(base - 12 + 7), dur: beat * 3.5, type: 'sine', v: 0.1, bus: bMus, at: t, a: 0.05 });
    // เครื่องตี
    if (M.perc >= 1 && (pos === 0 || pos === 4)) tone({ f: 110, f2: 55, dur: 0.18, type: 'sine', v: 0.26, bus: bMus, at: t });
    if (M.perc >= 2 && (pos === 2 || pos === 6)) noise({ dur: 0.07, f: 2200, v: 0.1, bus: bMus, at: t });
    if (M.perc >= 3 && pos % 2 === 1) noise({ dur: 0.03, f: 7000, type: 'highpass', v: 0.06, bus: bMus, at: t });
    if (M.perc === 1 && (pos === 3 || pos === 7)) tone({ f: 330, f2: 300, dur: 0.1, type: 'triangle', v: 0.09, bus: bMus, at: t });
  }
  function sched() {
    if (!ctx || !musicOn) return;
    const M = ERA_MUS[Math.min(era, ERA_MUS.length - 1)], beat = 60 / M.bpm / 2;
    if (nextT < ctx.currentTime) nextT = ctx.currentTime + 0.05;
    while (nextT < ctx.currentTime + 0.6) { musicStep(nextT, step); step++; nextT += beat; }
  }
  function musicStart(e) {
    if (!init()) return;
    era = e || 0; musicOn = true; step = 0; seed = 7 + era * 13; mel = 2; nextT = 0;
    if (timer) clearInterval(timer);
    timer = setInterval(sched, 150); sched();
  }
  function musicEra(e) { era = e; step = Math.ceil(step / 8) * 8; }
  function musicStop() { musicOn = false; if (timer) { clearInterval(timer); timer = null; } }
  function suspend() { if (ctx && ctx.state === 'running') ctx.suspend(); }
  function resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }

  /* ---------- ธีมหน้าปก: ระเบิดต่ำ + ลมหวีดรับแสงแฟลร์ + ฆ้อง + เสียงเบสค้าง + ระฆังเพนทาโทนิกลอย ---------- */
  let ttGain = null, ttTimer = null, ttNodes = [];
  function titleStart() {
    if (!init() || ttGain) return;
    const t0 = ctx.currentTime + 0.05;
    ttGain = ctx.createGain(); ttGain.gain.value = 1; ttGain.connect(bMus);
    // ลมหวีดไต่ขึ้น พีคตอนแฟลร์ (~1.2 วินาที) แล้วระเบิดต่ำ + ฆ้อง
    noise({ dur: 1.5, f: 200, f2: 4200, q: 1.2, v: 0.5, bus: ttGain, at: t0 });
    tone({ f: 55, f2: 28, dur: 3.2, type: 'sine', v: 0.7, bus: ttGain, at: t0 + 1.15, a: 0.02 });
    noise({ dur: 1.6, f: 500, f2: 70, type: 'lowpass', v: 0.5, bus: ttGain, at: t0 + 1.15 });
    [1, 2.76, 5.4, 8.9].forEach(function (m, i) { tone({ f: 110 * m, dur: 3.6 / (1 + i * 0.45), type: 'sine', v: 0.3 / (1 + i * 0.55), bus: ttGain, at: t0 + 1.2, a: 0.01 }); });
    // เสียงเบสค้างแบบประสานเสียง (D, A, D, F, A) ค่อย ๆ ดังขึ้นและโยกช้า ๆ
    [38, 45, 50, 53, 57].forEach(function (semi, i) {
      const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      o.type = i % 2 ? 'triangle' : 'sine'; o.frequency.value = FREQ(semi - 48); o.detune.value = (i - 2) * 4;
      lfo.frequency.value = 0.08 + i * 0.03; lg.gain.value = 0.02; lfo.connect(lg); lg.connect(g.gain);
      g.gain.setValueAtTime(0.0001, t0 + 1.0); g.gain.linearRampToValueAtTime(0.07 / (1 + i * 0.2), t0 + 4.5);
      o.connect(g); g.connect(ttGain); o.start(t0 + 1.0); lfo.start(t0 + 1.0); ttNodes.push(o, lfo);
    });
    // ระฆังลอยเป็นระยะ (สเกลเพนทาโทนิก)
    const sc = [0, 2, 4, 7, 9];
    ttTimer = setInterval(function () {
      if (!ctx || ctx.state !== 'running' || !ttGain) return;
      const n = sc[Math.floor(Math.random() * sc.length)] + 12 * (1 + Math.floor(Math.random() * 2));
      tone({ f: FREQ(n), dur: 2.4, type: 'triangle', v: 0.11, bus: ttGain, a: 0.004 });
      tone({ f: FREQ(n) * 2.01, dur: 1.2, type: 'sine', v: 0.04, bus: ttGain, a: 0.004 });
    }, 1700);
    setTimeout(function () { if (ttGain) { /* ระฆังแรกหลังฆ้อง */ tone({ f: FREQ(21), dur: 2.4, type: 'triangle', v: 0.12, bus: ttGain }); } }, 3200);
  }
  function titleStop(sec) {
    if (!ttGain) return;
    const g = ttGain, t = ctx.currentTime; ttGain = null;
    clearInterval(ttTimer); ttTimer = null;
    g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0.0001, t + (sec || 1));
    const nodes = ttNodes; ttNodes = [];
    setTimeout(function () { nodes.forEach(function (n) { try { n.stop(); } catch (e) { /* ไม่เป็นไร */ } }); try { g.disconnect(); } catch (e) { /* ไม่เป็นไร */ } }, ((sec || 1) + 0.3) * 1000);
  }

  /* ---------- เสียงประกาศ (เสียงพูดของเบราว์เซอร์ ถ้ามีเสียงไทย) ---------- */
  let thVoice = null;
  function pickVoice() {
    if (!root.speechSynthesis) return null;
    const vs = root.speechSynthesis.getVoices();
    return vs.filter(function (v) { return /^th/i.test(v.lang); })[0] || null;
  }
  function say(text) {
    if (!vol.voice || !root.speechSynthesis || !root.SpeechSynthesisUtterance) return;
    try {
      if (!thVoice) thVoice = pickVoice();
      if (!thVoice) return;   // ไม่มีเสียงไทยในเครื่อง ใช้เสียงเอฟเฟกต์แทน
      const u = new root.SpeechSynthesisUtterance(text); u.voice = thVoice; u.lang = 'th-TH'; u.rate = 1.05; u.pitch = 0.9; u.volume = 1;
      root.speechSynthesis.cancel(); root.speechSynthesis.speak(u);
    } catch (e) { /* ไม่เป็นไร */ }
  }
  if (root.speechSynthesis) try { root.speechSynthesis.onvoiceschanged = function () { thVoice = pickVoice(); }; } catch (e) { /* ไม่เป็นไร */ }

  TR.Audio = { titleStart: titleStart, titleStop: titleStop, running: function () { return !!ctx && ctx.state === 'running'; }, init: init, play: play, setVol: setVol, musicStart: musicStart, musicEra: musicEra, musicStop: musicStop, suspend: suspend, resume: resume, say: say, ready: function () { return !!ctx; } };
})(window);
