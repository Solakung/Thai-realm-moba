/* ตรวจว่าเกมให้ผลเหมือนเดิมทุกครั้ง (จำเป็นสำหรับออนไลน์แบบทุกเครื่องรันเกมเอง)
   Node:     node tools/detcheck.js [seed=7] [วินาทีเกม=240]   -> รัน 2 รอบเทียบกัน แล้วพิมพ์ hash
   เบราว์เซอร์: โหลดไฟล์นี้แล้วเรียก detRun(TR, seed, วินาที) เทียบ hash กับของ Node
   ผู้เล่นถูกสั่งด้วยสคริปต์คงที่ (เดิน/ใช้สกิล/ซื้อของ/ตะเกียง) เพื่อให้ครอบคลุมทางผู้เล่น */
(function (root) {
  'use strict';
  function hashState(g) {
    let h = 2166136261 >>> 0;
    const buf = new Float64Array(1), u32 = new Uint32Array(buf.buffer);
    function mix(v) { buf[0] = v; h = Math.imul(h ^ u32[0], 16777619) >>> 0; h = Math.imul(h ^ u32[1], 16777619) >>> 0; }
    for (const u of g.units) { mix(u.id); mix(u.x); mix(u.y); mix(u.hp); if (u.type === 'hero') { mix(u.gold); mix(u.xp); mix(u.level); mix(u.kills); mix(u.deaths); mix(u.items.length); } }
    mix(g.t); mix(g.score[0]); mix(g.score[1]); mix(g.wards.length); mix(g.projs.length);
    return h.toString(16);
  }
  function detRun(TR, seed, secs) {
    const g = TR.Sim.createGame({ seed: seed, playerHero: 'chang', playerEmblem: 'kro', playerSpell: 'heal', playerLane: 1 });
    const pl = g.player, out = [], n = Math.ceil(secs / TR.CFG.dt);
    for (let i = 0; i < n && !g.over; i++) {
      // สคริปต์ผู้เล่น (ไม่ใช้ตัวสุ่ม): เดินวนตามจังหวะ ใช้สกิลเป็นช่วง ๆ
      const ph = Math.floor(i / 60) % 4;
      pl.input.dx = ph === 0 ? 1 : (ph === 2 ? -1 : 0); pl.input.dy = ph === 1 ? 1 : (ph === 3 ? -1 : 0);
      if (i % 37 === 5) TR.Sim.castSkill(g, pl, i % 3, { dx: 1, dy: ph === 1 ? 1 : 0, k: 1 });
      if (i % 400 === 3 && i > 0) { TR.Sim.upgradeSkill && TR.Sim.upgradeSkill(g, pl, (i / 400) % 3 | 0); }
      if (i % 90 === 0) { TR.Sim.buy(g, pl, ['atk1', 'cdr1', 'def1', 'spd1'][(i / 90 | 0) % 4]); }
      if (i % 233 === 7) TR.Sim.placeWard(g, pl);
      TR.Sim.step(g);
      if (i % 200 === 199) out.push(hashState(g));
    }
    out.push('end:' + g.tick + ':' + hashState(g));
    return out;
  }
  root.detRun = detRun;
  if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
    const path = require('path');
    require(path.join(__dirname, '..', 'js', 'data.js')); require(path.join(__dirname, '..', 'js', 'sim.js')); require(path.join(__dirname, '..', 'js', 'ai.js'));
    const seed = parseInt(process.argv[2] || '7', 10), secs = parseInt(process.argv[3] || '240', 10);
    const a = detRun(globalThis.TR, seed, secs), b = detRun(globalThis.TR, seed, secs);
    const same = JSON.stringify(a) === JSON.stringify(b);
    console.log('รอบ 1 == รอบ 2 :', same ? 'ตรงกัน ✔' : 'ไม่ตรง ✘', '(' + a.length + ' จุดตรวจ)');
    console.log('hash ท้ายเกม:', a[a.length - 1]);
    if (!same) { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) { console.log('ต่างกันครั้งแรกที่จุดตรวจ', i); break; } process.exit(1); }
  }
})(typeof window !== 'undefined' ? window : globalThis);
