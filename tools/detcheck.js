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
    pl.gold = 6000;   // ให้มีเงินซื้อของตั้งแต่ต้นเพื่อให้คำสั่งทุกชนิดได้ทำงานจริง
    for (let i = 0; i < n && !g.over; i++) {
      // สคริปต์ผู้เล่น: ส่งคำสั่งผ่านคิว submit (จังหวะล่วงหน้า 3 tick) เหมือนที่ออนไลน์จะทำ ไม่ใช้ตัวสุ่ม
      const ph = Math.floor(i / 60) % 4, S = TR.Sim, T = g.tick + 3, send = function (c) { S.submit(g, pl.id, c, T); };
      if (i % 60 === 0) send({ k: 'in', dx: ph === 0 ? 1 : (ph === 2 ? -1 : 0), dy: ph === 1 ? 1 : (ph === 3 ? -1 : 0) });
      if (i % 37 === 5) send({ k: 'cast', slot: i % 3, aim: { dx: 1, dy: ph === 1 ? 1 : 0, k: 1 } });
      if (i === 1) send({ k: 'up', i: 0 });
      if (i % 400 === 3 && i > 0) send({ k: 'up', i: (i / 400) % 3 | 0 });
      if (i % 90 === 0) send({ k: 'buy', id: ['atk1', 'cdr1', 'def1', 'spd1', 'def2', 'ward1'][(i / 90 | 0) % 6] });
      if (i % 700 === 11) send({ k: 'sell', id: 'atk1' });
      if (i % 233 === 7) send({ k: 'ward' });
      if (i % 151 === 9) send({ k: 'spell' });
      if (i % 311 === 13) send({ k: 'recall' });
      if (i % 120 === 17) send({ k: 'atk', on: (i / 120 | 0) % 2 === 0, type: (i / 240 | 0) % 3 === 1 ? 'minion' : null });
      if (i % 200 === 19) { const e = g.units.find(function (x) { return x.type === 'hero' && x.team === 1 && !x.dead; }); if (e) send({ k: 'lock', id: e.id }); }
      if (i % 500 === 21) send({ k: 'item', id: 'def3' });
      if (i % 600 === 23) send({ k: 'sig', type: 'go', x: 1600, y: 600 });
      if (i === 30) send({ k: 'set', atkMode: 'auto', prio: 'hero', autoSkill: true });
      if (i === 40) send({ k: 'nonsense', x: 1 }), send({ k: 'in', dx: NaN, dy: 99999 }), send({ k: 'buy', id: 12345 });   // คำสั่งขยะต้องไม่ทำให้พัง
      TR.Sim.step(g);
      if (i % 200 === 199) out.push(hashState(g));
    }
    out.push('end:' + g.tick + ':' + hashState(g));
    detRun.last = { items: pl.items.join(','), sl: pl.sl.join(','), cast: pl.lastCast > 0, kills: pl.kills, deaths: pl.deaths, x: Math.round(pl.x), wards: g.wards.length };
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
    console.log('ผู้เล่นสคริปต์ทำอะไรได้บ้าง:', JSON.stringify(detRun.last));
    if (!same) { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) { console.log('ต่างกันครั้งแรกที่จุดตรวจ', i); break; } process.exit(1); }
  }
})(typeof window !== 'undefined' ? window : globalThis);
