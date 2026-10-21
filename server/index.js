'use strict';
// ตัวส่งต่อคำสั่ง: เกมรันอยู่ที่ฝั่งผู้เล่นทุกคน เซิร์ฟเวอร์นี้แค่รับคำสั่ง ใส่ลำดับ แล้วกระจายให้คนในห้อง
const http = require('http');
const { WebSocketServer } = require('ws');
const PORT = process.env.PORT || 8080;
const rooms = new Map();   // code -> { members: Map(id -> {ws,name}), host, seq, started }

const server = http.createServer(function (req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.url === '/ping' || req.url === '/') { res.end('ok'); return; }
  res.statusCode = 404; res.end('not found');
});
const wss = new WebSocketServer({ server, maxPayload: 4096 });

function send(ws, o) { if (ws.readyState === 1) ws.send(JSON.stringify(o)); }
function bcast(room, o) { room.members.forEach(function (m) { send(m.ws, o); }); }
function roster(room) { return Array.from(room.members, function (e) { return { id: e[0], name: e[1].name }; }); }
function code() { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 4; i++) s += a[Math.floor(Math.random() * a.length)]; return s; }

wss.on('connection', function (ws) {
  let room = null, id = 0, last = 0, n = 0;
  ws.isAlive = true; ws.on('pong', function () { ws.isAlive = true; });
  ws.on('message', function (raw) {
    const now = Date.now(); if (now - last < 1000) { if (++n > 60) return; } else { last = now; n = 0; }   // กันยิงถี่เกิน
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    if (!m || typeof m.t !== 'string') return;
    if (m.t === 'create' || m.t === 'join') {
      if (room) return;
      let c = String(m.room || '').toUpperCase().slice(0, 6);
      if (m.t === 'create') { do { c = code(); } while (rooms.has(c)); rooms.set(c, { members: new Map(), host: 0, seq: 0, started: false, nextId: 1 }); }
      const r = rooms.get(c);
      if (!r) return send(ws, { t: 'err', msg: 'ไม่พบห้อง' });
      if (r.started) return send(ws, { t: 'err', msg: 'ห้องนี้เริ่มเกมไปแล้ว' });
      if (r.members.size >= 10) return send(ws, { t: 'err', msg: 'ห้องเต็ม' });
      room = r; room.code = c; id = r.nextId++; if (!r.host) r.host = id;
      r.members.set(id, { ws: ws, name: String(m.name || 'ผู้เล่น').slice(0, 14) });
      send(ws, { t: 'joined', room: c, id: id, host: r.host });
      bcast(r, { t: 'roster', host: r.host, list: roster(r) });
    } else if (!room) { return; }
    else if (m.t === 'start' && id === room.host && !room.started) {
      room.started = true;
      bcast(room, { t: 'start', seed: (Math.random() * 4294967296) >>> 0, list: roster(room), at: room.seq });
    } else if (m.t === 'cmd' && room.started) {
      bcast(room, { t: 'cmd', uid: id, seq: ++room.seq, tick: m.tick | 0, c: m.c });   // เรียงลำดับโดยเซิร์ฟเวอร์ ทุกคนได้ชุดเดียวกัน
    } else if (m.t === 'hash' && room.started) {
      bcast(room, { t: 'hash', uid: id, tick: m.tick | 0, h: m.h });                 // ไว้ตรวจว่าเกมเพี้ยนกันไหม
    }
  });
  ws.on('close', function () {
    if (!room) return;
    room.members.delete(id);
    if (!room.members.size) { rooms.delete(room.code); return; }
    if (room.host === id) room.host = room.members.keys().next().value;
    bcast(room, { t: room.started ? 'left' : 'roster', uid: id, host: room.host, list: roster(room) });
  });
});
setInterval(function () { wss.clients.forEach(function (ws) { if (!ws.isAlive) return ws.terminate(); ws.isAlive = false; ws.ping(); }); }, 25000);   // ping ทุก 25 วิ กันหลุด
server.listen(PORT, function () { console.log('relay on :' + PORT); });
