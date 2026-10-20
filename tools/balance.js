/* รันบอทต่อกันแบบไม่เรนเดอร์ แล้วสรุปอัตราชนะ
   ใช้: node tools/balance.js [จำนวนแมตช์=100] [seed เริ่มต้น=1]
   ผลลัพธ์เป็นตารางในเทอร์มินัล และบันทึก tools/balance-result.json
   หมายเหตุ: บอทไม่ได้เล่นเหมือนมนุษย์ ผลนี้บอกได้ว่ามีตัวเลขที่พังชัดเจนหรือไม่ ไม่ได้รับประกันสมดุลสำหรับผู้เล่นจริง */
'use strict';
const path = require('path');
const fs = require('fs');
require(path.join(__dirname, '..', 'js', 'data.js'));
require(path.join(__dirname, '..', 'js', 'sim.js'));
require(path.join(__dirname, '..', 'js', 'ai.js'));
const TR = globalThis.TR;

const N = parseInt(process.argv[2] || '100', 10);
const seed0 = parseInt(process.argv[3] || '1', 10);

const heroes = {}, emblems = {}, byEra = [0, 0, 0, 0], sides = [0, 0], draws = { n: 0 };
TR.HEROES.forEach(function (h) { heroes[h.id] = { games: 0, wins: 0, kills: 0, deaths: 0 }; });
TR.EMBLEM_ORDER.forEach(function (e) { emblems[e] = { games: 0, wins: 0 }; });
const hxe = {}; // ฮีโร่ × ชุดใจ

let totalTime = 0;
const t0 = Date.now();
for (let i = 0; i < N; i++) {
  const g = TR.Sim.createGame({ seed: seed0 + i });
  const maxTicks = Math.ceil(TR.CFG.maxTime / TR.CFG.dt);
  while (!g.over && g.tick < maxTicks) TR.Sim.step(g);
  let winner = g.winner;
  if (!g.over) { // หมดเวลา: ตัดสินจากเลือดป้อมที่เหลือ
    const hp = [0, 0];
    g.units.forEach(function (u) { if (u.type === 'tower' && !u.dead) hp[u.team] += u.hp; });
    winner = hp[0] === hp[1] ? -1 : (hp[0] > hp[1] ? 0 : 1);
  }
  if (winner < 0) { draws.n++; continue; }
  sides[winner]++;
  byEra[g.era]++;
  totalTime += g.t;
  g.units.forEach(function (u) {
    if (u.type !== 'hero') return;
    const h = heroes[u.def.id], won = u.team === winner;
    h.games++; if (won) h.wins++; h.kills += u.kills; h.deaths += u.deaths;
    const e = emblems[u.emblem]; e.games++; if (won) e.wins++;
    const k = u.def.id + '/' + u.emblem;
    hxe[k] = hxe[k] || { games: 0, wins: 0 };
    hxe[k].games++; if (won) hxe[k].wins++;
  });
}

function pct(w, n) { return n ? (100 * w / n).toFixed(1) + '%' : '-'; }
console.log('แมตช์: ' + N + '  เสมอ/หมดเวลา: ' + draws.n + '  เวลาเฉลี่ย: ' + (totalTime / Math.max(1, N - draws.n) / 60).toFixed(1) + ' นาที  (รัน ' + ((Date.now() - t0) / 1000).toFixed(1) + ' วินาที)');
console.log('ทีมซ้ายชนะ ' + sides[0] + '  ทีมขวาชนะ ' + sides[1] + '  (ความเอนเอียงฝั่ง ถ้าต่างกันมาก = ปัญหาแมพ/บอท)');
console.log('จบเกมในยุค: ' + TR.ERAS.map(function (e, i) { return e.name + ' ' + byEra[i]; }).join(' | '));
console.log('\nฮีโร่ (เกณฑ์ผ่าน 45-55%):');
TR.HEROES.forEach(function (h) {
  const s = heroes[h.id];
  const wr = s.games ? 100 * s.wins / s.games : 0;
  const flag = s.games && (wr > 55 || wr < 45) ? '  <-- นอกเกณฑ์' : '';
  console.log('  ' + (h.name + '                    ').slice(0, 22) + ' ' + TR.ROLES[h.role].name.padEnd(9) + ' ยุค' + TR.ERAS[h.era].name.padEnd(8) + ' ' + pct(s.wins, s.games).padStart(6) + '  K/D ' + (s.kills / Math.max(1, s.games)).toFixed(1) + '/' + (s.deaths / Math.max(1, s.games)).toFixed(1) + flag);
});
console.log('\nชุดใจ:');
TR.EMBLEM_ORDER.forEach(function (e) { console.log('  ' + TR.EMBLEMS[e].name.padEnd(8) + pct(emblems[e].wins, emblems[e].games) + '  (n=' + emblems[e].games + ')'); });

fs.writeFileSync(path.join(__dirname, 'balance-result.json'), JSON.stringify({ matches: N, seed0: seed0, draws: draws.n, sides: sides, byEra: byEra, heroes: heroes, emblems: emblems, heroEmblem: hxe }, null, 2));
