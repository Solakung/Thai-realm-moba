'use strict';
// ตัวส่งต่อคำสั่ง: เกมรันอยู่ที่เครื่องผู้เล่นทุกคน เซิร์ฟเวอร์นี้ไม่รู้กติกาเกมเลย ทำแค่ 3 อย่าง
//  1) เป็น "นาฬิกากลาง": ส่งหมายเลขจังหวะ (turn) ให้ทุกคนทุก 50 ms
//  2) รับคำสั่งผู้เล่น แล้วแปะกับจังหวะปัจจุบัน กระจายให้ทุกคนเหมือนกัน (ทุกเครื่องจึงเห็นคำสั่งชุดเดียวกัน ลำดับเดียวกัน)
//  3) เทียบ hash สถานะเกมจากแต่ละเครื่อง ถ้าไม่ตรงแจ้งว่าเพี้ยน
// ใครหลุด เซิร์ฟเวอร์ใส่คำสั่ง drop ให้ บอทเข้าคุมตัวแทน
const http = require('http');
const { WebSocketServer } = require('ws');
const PORT = process.env.PORT || 8080;
const TURN_MS = 50, MAX_PLAYERS = 10;
const OK_CMD = { in: 1, cast: 1, spell: 1, recall: 1, buy: 1, sell: 1, up: 1, item: 1, ward: 1, atk: 1, lock: 1, set: 1, sig: 1, sur: 1 };   // ไม่มี drop: ห้ามผู้เล่นปลอมคำสั่งนี้
const rooms = new Map();
const tokGen = function () { let t = ''; for (let i = 0; i < 16; i++) t += 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]; return t; };
const GRACE_MS = 5 * 60 * 1000;   // ห้องที่คนหลุดหมดยังเก็บไว้ให้กลับเข้าได้นาน 5 นาที

const server = http.createServer(function (req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.url === '/ping' || req.url === '/') { res.end('ok'); return; }
  res.statusCode = 404; res.end('not found');
});
const wss = new WebSocketServer({ server, maxPayload: 2048 });

function send(ws, o) { if (ws.readyState === 1) ws.send(JSON.stringify(o)); }
function bcast(room, o) { const s = JSON.stringify(o); room.members.forEach(function (m) { if (m.ws.readyState === 1) m.ws.send(s); }); }
function roster(room) { return Array.from(room.members, function (e) { const m = e[1]; return { uid: e[0], name: m.name, hero: m.hero, emblem: m.emblem, spell: m.spell, lane: m.lane, team: m.team, ready: m.ready }; }); }
function code() { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 4; i++) s += a[Math.floor(Math.random() * a.length)]; return s; }
const str = function (v, n) { return typeof v === 'string' ? v.slice(0, n) : ''; };
function teamCount(room, t) { let n = 0; room.members.forEach(function (m) { if (m.team === t) n++; }); return n; }
function pushRoster(room) { bcast(room, { t: 'roster', host: room.host, list: roster(room) }); }

function startRoom(room) {
  room.started = true; room.t0 = Date.now(); room.turn = 0; room.pend = []; room.hashes = new Map(); room.log = [];
  const list = roster(room).map(function (m) { return { uid: m.uid, name: m.name, hero: m.hero, emblem: m.emblem, spell: m.spell, lane: m.lane, team: m.team }; });
  room.seed = (Math.random() * 2147483647) >>> 0; room.list = list; room.seats = {}; room.gone = {};
  room.members.forEach(function (m, uid) { room.seats[uid] = { tok: m.tok, name: m.name, hero: m.hero, emblem: m.emblem, spell: m.spell, lane: m.lane, team: m.team }; });
  bcast(room, { t: 'start', seed: room.seed, list: list });
  room.timer = setInterval(function () {
    const n = Math.floor((Date.now() - room.t0) / TURN_MS);
    if (n <= room.turn) return;
    room.turn = n;
    const o = { t: 'u', n: n }; if (room.pend.length) { o.c = room.pend; room.pend = []; room.log.push([n, o.c]); }   // log = ไว้ให้คนที่หลุดกลับมาเล่นตามทัน
    bcast(room, o);
  }, TURN_MS);
}
function closeRoom(room) { if (room.timer) clearInterval(room.timer); if (room.graceT) clearTimeout(room.graceT); rooms.delete(room.code); }

wss.on('connection', function (ws) {
  let room = null, id = 0, winStart = 0, cnt = 0;
  ws.isAlive = true; ws.on('pong', function () { ws.isAlive = true; });
  ws.on('message', function (raw) {
    const now = Date.now(); if (now - winStart > 1000) { winStart = now; cnt = 0; } if (++cnt > 80) return;   // กันยิงถี่เกิน
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    if (!m || typeof m.t !== 'string') return;
    if (m.t === 'rejoin') {   // กลับเข้าห้องที่เล่นอยู่ (หลุด/รีเฟรช) ด้วยโทเคนที่ได้ตอนเข้าห้อง
      if (room) return;
      const r = rooms.get(str(m.room, 6).toUpperCase()), uid = m.uid | 0, seat = r && r.seats && r.seats[uid];
      if (!r || !r.started || !seat || seat.tok !== str(m.tok, 20)) return send(ws, { t: 'err', msg: 'กลับเข้าห้องไม่ได้ (ห้องปิดแล้วหรือรหัสไม่ตรง)', fatal: true });
      const old = r.members.get(uid); if (old && old.ws && old.ws !== ws) { old.ws.isOld = true; try { old.ws.close(); } catch (e) { /* ไม่เป็นไร */ } }
      const since = m.since | 0;
      room = r; id = uid; if (r.graceT) { clearTimeout(r.graceT); r.graceT = null; }
      send(ws, { t: 'rejoined', room: r.code, uid: id, host: r.host });
      if (since <= 0) send(ws, { t: 'start', seed: r.seed, list: r.list, rejoin: true });
      const part = r.log.filter(function (e) { return e[0] > since; });
      for (let i = 0; i < part.length; i += 200) send(ws, { t: 'catchup', log: part.slice(i, i + 200) });
      send(ws, { t: 'u', n: r.turn });
      r.members.set(id, { ws: ws, tok: seat.tok, name: seat.name, hero: seat.hero, emblem: seat.emblem, spell: seat.spell, lane: seat.lane, team: seat.team, ready: true });
      if (r.gone && r.gone[id]) { delete r.gone[id]; r.pend.push([id, { k: 'take' }]); }   // คืนตัวจากบอทให้เจ้าของ
      return;
    }
    if (m.t === 'create' || m.t === 'join') {
      if (room) return;
      let c = str(m.room, 6).toUpperCase();
      if (m.t === 'create') { do { c = code(); } while (rooms.has(c)); rooms.set(c, { code: c, members: new Map(), host: 0, started: false, nextId: 1, turn: 0, pend: [], timer: null, hashes: new Map() }); }
      const r = rooms.get(c);
      if (!r) return send(ws, { t: 'err', msg: 'ไม่พบห้อง ' + c });
      if (r.started) return send(ws, { t: 'err', msg: 'ห้องนี้เริ่มเกมไปแล้ว' });
      if (r.members.size >= MAX_PLAYERS) return send(ws, { t: 'err', msg: 'ห้องเต็ม' });
      room = r; id = r.nextId++; if (!r.host) r.host = id;
      const tm = teamCount(r, 0) <= teamCount(r, 1) ? 0 : 1;
      const tok = tokGen();
      r.members.set(id, { ws: ws, tok: tok, name: str(m.name, 14) || 'ผู้เล่น', hero: null, emblem: 'kro', spell: 'heal', lane: 1, team: tm, ready: false });
      send(ws, { t: 'joined', room: c, uid: id, tok: tok });
      pushRoster(r);
    } else if (!room) { return; }
    else if (m.t === 'pick' && !room.started) {
      const me = room.members.get(id);
      me.hero = str(m.hero, 20) || null; me.emblem = str(m.emblem, 10) || 'kro'; me.spell = str(m.spell, 10) || 'heal';
      me.lane = typeof m.lane === 'number' ? Math.max(-1, Math.min(2, m.lane | 0)) : 1;
      me.ready = !!m.ready;
      if ((m.team === 0 || m.team === 1) && m.team !== me.team && teamCount(room, m.team) < 5) me.team = m.team;
      pushRoster(room);
    } else if (m.t === 'start') {
      if (id !== room.host || room.started) return;
      let ok = true; room.members.forEach(function (x) { if (!x.ready) ok = false; });
      if (!ok) return send(ws, { t: 'err', msg: 'ยังมีคนไม่พร้อม' });
      if (teamCount(room, 0) > 5 || teamCount(room, 1) > 5) return send(ws, { t: 'err', msg: 'ทีมละไม่เกิน 5 คน' });
      startRoom(room);
    } else if (m.t === 'cmd' && room.started) {
      if (!m.c || typeof m.c.k !== 'string' || !OK_CMD[m.c.k] || JSON.stringify(m.c).length > 300) return;
      room.pend.push([id, m.c]);
    } else if (m.t === 'hash' && room.started) {
      const tk = m.tick | 0; let e = room.hashes.get(tk); if (!e) { e = {}; room.hashes.set(tk, e); }
      e[id] = str(m.h, 16);
      const vals = Object.keys(e).map(function (k) { return e[k]; });
      if (vals.length >= room.members.size) { room.hashes.delete(tk); if (vals.some(function (v) { return v !== vals[0]; })) bcast(room, { t: 'desync', tick: tk, hs: e }); }
      if (room.hashes.size > 20) room.hashes.delete(room.hashes.keys().next().value);
    }
  });
  ws.on('close', function () {
    if (!room) return;
    if (ws.isOld) return;   // ถูกแทนที่ด้วยการเชื่อมต่อใหม่ของคนเดิม
    const seatM = room.members.get(id);
    room.members.delete(id);
    if (room.started) {
      room.seats = room.seats || {}; room.gone = room.gone || {};
      if (seatM) room.seats[id] = { tok: seatM.tok, name: seatM.name, hero: seatM.hero, emblem: seatM.emblem, spell: seatM.spell, lane: seatM.lane, team: seatM.team };
      room.gone[id] = true; room.pend.push([id, { k: 'drop' }]);
      if (!room.members.size) { room.graceT = setTimeout(function () { closeRoom(room); }, GRACE_MS); return; }
      if (room.host === id) room.host = room.members.keys().next().value;
      return;
    }
    if (!room.members.size) { closeRoom(room); return; }
    if (room.host === id) room.host = room.members.keys().next().value;
    pushRoster(room);
  });
});
setInterval(function () { wss.clients.forEach(function (ws) { if (!ws.isAlive) return ws.terminate(); ws.isAlive = false; ws.ping(); }); }, 25000);   // ping ทุก 25 วินาที กันหลุด/กันเครื่องฟรีหลับ
server.listen(PORT, function () { console.log('relay on :' + PORT); });
