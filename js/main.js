/* Thai Realm — หน้าเมนู ควบคุม HUD ลูปเกม และกล่องข้อความอัปเดต */
(function () {
  'use strict';
  const TR = window.TR, CFG = TR.CFG;
  const $ = function (id) { return document.getElementById(id); };
  const canvas = $('game'), ctx = canvas.getContext('2d');
  const mini = $('mini'), mctx = mini.getContext('2d');

  const stageCv = $('stageCv'), stageCtx = stageCv.getContext('2d'), stageState = { side: 1 };
  let introEnd = 0;
  let sel = { hero: TR.HEROES[0].id, emblem: null };
  let g = null, acc = 0, lastTs = 0, paused = false, playing = false, hudT = 0, miniT = 0, camCache = null, endTimer = null;
  const keys = {}, queue = [];
  const stick = { active: false, id: null, dx: 0, dy: 0, ox: 0, oy: 0 };
  const SK_KEYS = ['Q', 'E', 'R'];

  /* ---------- เก็บเวอร์ชันที่เคยเห็น ---------- */
  function getSeen() { try { return localStorage.getItem('tr_seen_version') || ''; } catch (e) { return ''; } }
  function setSeen(v) { try { localStorage.setItem('tr_seen_version', v); } catch (e) { /* ไม่เป็นไร */ } }
  function cmpVer(a, b) {
    const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number);
    for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d; }
    return 0;
  }

  /* ---------- กล่องข้อความอัปเดต ---------- */
  function showUpdate() {
    const seen = getSeen();
    const box = $('updBody');
    box.innerHTML = '';
    TR.CHANGELOG.forEach(function (c) {
      const isNew = !seen || cmpVer(c.version, seen) > 0;
      const d = document.createElement('div');
      d.className = 'ver';
      const head = document.createElement('div'); head.className = 'vh';
      head.textContent = 'v' + c.version + ' · ' + c.title;
      if (isNew) { const n = document.createElement('span'); n.className = 'new'; n.textContent = 'ใหม่'; head.appendChild(n); }
      const dt = document.createElement('div'); dt.className = 'vd'; dt.textContent = c.date;
      const ul = document.createElement('ul');
      c.items.forEach(function (t) { const li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
      d.appendChild(head); d.appendChild(dt); d.appendChild(ul);
      box.appendChild(d);
    });
    $('updateModal').hidden = false;
  }
  function closeUpdate() { $('updateModal').hidden = true; setSeen(TR.VERSION); $('updDot').hidden = true; }

  /* ---------- เมนู ---------- */
  function buildMenu() {
    $('ver').textContent = TR.VERSION;
    const grid = $('heroGrid');
    grid.innerHTML = '';
    TR.HEROES.forEach(function (h) {
      const b = document.createElement('button');
      b.className = 'hcard'; b.dataset.id = h.id;
      const cv = document.createElement('canvas'); cv.width = 112; cv.height = 128;
      TR.Render.drawHeroIcon(cv.getContext('2d'), h, 112, 128, 0);
      const era = document.createElement('div'); era.className = 'era'; era.textContent = TR.ERAS[h.era].name;
      const n = document.createElement('div'); n.className = 'n'; n.textContent = h.name;
      const r = document.createElement('div'); r.className = 'r'; r.textContent = TR.ROLES[h.role].name;
      b.appendChild(era); b.appendChild(cv); b.appendChild(n); b.appendChild(r);
      b.addEventListener('click', function () { pickHero(h.id); });
      grid.appendChild(b);
    });
    pickHero(sel.hero);
  }

  function bestEmblem(heroId) {
    const f = TR.FIT[heroId]; let bi = 0;
    for (let i = 1; i < 4; i++) if (f[i] > f[bi]) bi = i;
    return TR.EMBLEM_ORDER[bi];
  }

  function pickHero(id) {
    sel.hero = id;
    const h = TR.HERO_BY_ID[id];
    if (!sel.emblem || !sel.emblemTouched) sel.emblem = bestEmblem(id);
    Array.prototype.forEach.call($('heroGrid').children, function (c) { c.classList.toggle('sel', c.dataset.id === id); });
    const info = $('heroInfo');
    info.innerHTML = '';
    function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
    info.appendChild(el('h2', '', h.name));
    info.appendChild(el('div', 'tags', 'ยุค' + TR.ERAS[h.era].name + ' · ' + TR.ROLES[h.role].name + ' · ยุครุ่งเรือง +' + Math.round((CFG.peak - 1) * 100) + '% ตอนยุคของตัวเอง'));
    info.appendChild(el('div', 'sw', '<b class="g">จุดแข็ง</b> ' + h.strength + '<br><b class="w">จุดอ่อน</b> ' + h.weakness));
    h.skills.forEach(function (s, i) {
      info.appendChild(el('div', 'sk', '<b>' + (i === 2 ? 'อัลติ' : 'สกิล ' + (i + 1)) + ' · ' + s.name + '</b> (' + s.cd + ' วิ) — ' + s.desc));
    });
    buildEmblems();
    const nm = $('stageName');
    nm.querySelector('.et').textContent = 'ยุค' + TR.ERAS[h.era].name;
    nm.querySelector('.nm').textContent = h.name;
    nm.querySelector('.rl').textContent = TR.ROLES[h.role].name + ' · ' + h.strength;
    nm.classList.remove('anim'); void nm.offsetWidth; nm.classList.add('anim');
    TR.Render.stageReset(stageState, id);
  }

  function sizeStage() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2), w = stageCv.clientWidth, h = stageCv.clientHeight;
    if (!w || !h) return false;
    if (stageCv.width !== Math.round(w * dpr) || stageCv.height !== Math.round(h * dpr)) { stageCv.width = Math.round(w * dpr); stageCv.height = Math.round(h * dpr); }
    return { w: w, h: h, dpr: dpr };
  }

  function buildEmblems() {
    const grid = $('emblemGrid');
    grid.innerHTML = '';
    const fit = TR.FIT[sel.hero];
    TR.EMBLEM_ORDER.forEach(function (k, i) {
      const em = TR.EMBLEMS[k];
      const b = document.createElement('button');
      b.className = 'ebtn' + (sel.emblem === k ? ' sel' : '');
      b.style.borderColor = sel.emblem === k ? em.color : '';
      b.innerHTML = '<div class="en" style="color:' + em.color + '">' + em.name + '</div><div class="ef fit-' + fit[i] + '">เหมาะ: ' + TR.FIT_LABEL[fit[i]] + '</div>';
      b.addEventListener('click', function () { sel.emblem = k; sel.emblemTouched = true; buildEmblems(); });
      grid.appendChild(b);
    });
    const em = TR.EMBLEMS[sel.emblem];
    $('emblemInfo').innerHTML = '<b>' + em.name + '</b> · ' + em.stat + ' · ราคา: ' + em.cost + '<br>พลังแฝง: ' + em.latent;
  }

  /* ---------- เริ่ม/จบเกม ---------- */
  function fit() { TR.Render.resize(canvas, window.innerWidth, window.innerHeight); }

  function buildSkillButtons(def) {
    const box = $('skills');
    box.innerHTML = '';
    def.skills.forEach(function (s, i) {
      const b = document.createElement('button');
      b.className = 'skill' + (i === 2 ? ' ult' : '');
      b.innerHTML = '<span class="key">' + SK_KEYS[i] + '</span><span class="nm">' + s.name + '</span><span class="cd"></span>';
      b.addEventListener('pointerdown', function (e) { e.preventDefault(); queue.push(i); });
      box.appendChild(b);
    });
  }

  function startGame() {
    if (endTimer) { clearTimeout(endTimer); endTimer = null; }
    g = TR.Sim.createGame({ playerHero: sel.hero, playerEmblem: sel.emblem });
    window.TRGame = g;
    acc = 0; paused = false; playing = true; queue.length = 0;
    $('menu').hidden = true; $('result').hidden = true; $('pauseBox').hidden = true;
    $('hud').hidden = false; $('pauseBtn').style.display = 'block';
    $('feed').innerHTML = '';
    document.body.classList.add('playing');
    buildSkillButtons(g.player.def);
    const em = TR.EMBLEMS[g.player.emblem];
    $('meName').innerHTML = g.player.def.name + ' <span style="color:' + em.color + '">· ใจ' + em.name + '</span>';
    banner('ยุค' + TR.ERAS[0].name + ' เริ่มแล้ว', TR.ERAS[0].note + ' · ฮีโร่ยุคนี้แข็งขึ้น: ' + heroesOfEra(0), 4500);
    fit();
    lastTs = performance.now();
    showIntro();
  }

  /* ---------- หน้า VS ก่อนเริ่มแมตช์ ---------- */
  function showIntro() {
    const L = $('vsLeft'), Rr = $('vsRight');
    L.innerHTML = ''; Rr.innerHTML = '';
    $('vsTitle').textContent = 'ศึกข้ามยุค · เริ่มที่ยุค' + TR.ERAS[0].name;
    const hs = g.units.filter(function (u) { return u.type === 'hero'; });
    [0, 1].forEach(function (team) {
      hs.filter(function (u) { return u.team === team; }).sort(function (a, b) { return a.slot - b.slot; }).forEach(function (u, i) {
        const card = document.createElement('div');
        card.className = 'vs-card' + (u === g.player ? ' me' : '');
        card.style.animationDelay = (0.15 + i * 0.09) + 's';
        const cv = document.createElement('canvas'); cv.width = 92; cv.height = 104;
        TR.Render.drawHeroIcon(cv.getContext('2d'), u.def, 92, 104, 0);
        const t = document.createElement('div');
        t.innerHTML = '<div class="n">' + u.def.name + (u === g.player ? ' (คุณ)' : '') + '</div><div class="r">' + TR.ROLES[u.role].name + ' · ใจ' + TR.EMBLEMS[u.emblem].name + '</div>';
        card.appendChild(cv); card.appendChild(t);
        (team === 0 ? L : Rr).appendChild(card);
      });
    });
    const el = $('intro');
    el.classList.remove('out'); el.hidden = false;
    introEnd = performance.now() + 3400;
  }
  function endIntro() {
    if (!introEnd) return;
    introEnd = 0;
    const el = $('intro'); el.classList.add('out');
    setTimeout(function () { el.hidden = true; el.classList.remove('out'); }, 480);
    queue.length = 0; lastTs = performance.now(); acc = 0;
  }
  $('intro').addEventListener('pointerdown', function () { if (introEnd && performance.now() < introEnd - 600) introEnd = performance.now() + 50; });

  function toMenu() {
    playing = false; g = null;
    document.body.classList.remove('playing');
    $('hud').hidden = true; $('result').hidden = true; $('menu').hidden = false; $('pauseBtn').style.display = 'none';
  }

  function heroesOfEra(e) { return TR.HEROES.filter(function (h) { return h.era === e; }).map(function (h) { return h.name; }).join(', '); }

  let bannerT = null;
  function banner(t, sub, ms) {
    const b = $('banner');
    b.innerHTML = t + (sub ? '<small>' + sub + '</small>' : '');
    b.classList.add('on');
    clearTimeout(bannerT);
    bannerT = setTimeout(function () { b.classList.remove('on'); }, ms || 3500);
  }
  function feed(text, team) {
    const f = $('feed');
    const d = document.createElement('div');
    d.className = team === 0 ? 'b' : 'r'; d.textContent = text;
    f.appendChild(d);
    while (f.children.length > 5) f.removeChild(f.firstChild);
    setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 6000);
  }

  function handleEvents() {
    while (g.events.length) {
      const e = g.events.shift();
      if (e.k === 'kill') feed(e.killer + ' ปราบ ' + e.victim, e.kteam);
      else if (e.k === 'jungle') feed(e.killer + ' ได้บัฟ' + e.name + ' (' + e.text + ')', e.kteam);
      else if (e.k === 'tower') feed('ป้อม' + e.name + (e.team === 0 ? 'ฝั่งเรา' : 'ฝั่งศัตรู') + 'พังแล้ว', 1 - e.team);
      else if (e.k === 'warn') banner('อีก ' + CFG.eraWarn + ' วินาทีเข้าสู่ยุค' + TR.ERAS[e.era].name, 'ป้อมจะเปลี่ยนเป็น: ' + TR.ERAS[e.era].short, 4500);
      else if (e.k === 'era') banner('เข้าสู่ยุค' + TR.ERAS[e.era].name, TR.ERAS[e.era].note + ' · ฮีโร่ยุครุ่งเรือง: ' + heroesOfEra(e.era), 5500);
      else if (e.k === 'over') { endTimer = setTimeout(showResult, 1800); }
    }
  }

  function showResult() {
    const pl = g.player, win = g.winner === pl.team;
    $('resTitle').textContent = win ? 'ชนะแล้ว! ราชธานีศัตรูล่ม' : 'พ่ายแพ้ ราชธานีของเราล่ม';
    $('resTitle').style.color = win ? '#6ee7a0' : '#ff9b8a';
    const mm = Math.floor(g.t / 60), ss = Math.floor(g.t % 60);
    $('resSub').textContent = 'เวลาแมตช์ ' + mm + ':' + String(ss).padStart(2, '0') + ' · จบในยุค' + TR.ERAS[g.era].name + ' · ฆ่ารวม ' + g.score[0] + ' : ' + g.score[1];
    let html = '<table><tr><th>ฮีโร่</th><th>ชุดใจ</th><th>เลเวล</th><th>ฆ่า</th><th>ตาย</th><th>มินเนียน</th></tr>';
    g.units.filter(function (u) { return u.type === 'hero'; }).sort(function (a, b) { return a.team - b.team || a.slot - b.slot; }).forEach(function (u) {
      html += '<tr class="' + (u === pl ? 'me' : '') + '"><td class="' + (u.team === 0 ? 'b' : 'r') + '">' + u.def.name + '</td><td>' + TR.EMBLEMS[u.emblem].name + '</td><td>' + u.level + '</td><td>' + u.kills + '</td><td>' + u.deaths + '</td><td>' + u.cs + '</td></tr>';
    });
    $('resTable').innerHTML = html + '</table>';
    $('result').hidden = false;
  }

  /* ---------- อินพุต ---------- */
  window.addEventListener('keydown', function (e) {
    if (!playing) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].indexOf(e.code) >= 0) e.preventDefault();
    if (e.repeat) return;
    keys[e.code] = true;
    if (e.code === 'KeyQ' || e.code === 'Digit1') queue.push(0);
    else if (e.code === 'KeyE' || e.code === 'Digit2') queue.push(1);
    else if (e.code === 'KeyR' || e.code === 'Digit3') queue.push(2);
    else if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
  });
  window.addEventListener('keyup', function (e) { keys[e.code] = false; });
  window.addEventListener('blur', function () { for (const k in keys) keys[k] = false; });
  document.addEventListener('visibilitychange', function () { if (document.hidden && playing && !paused) togglePause(); });
  window.addEventListener('contextmenu', function (e) { if (playing) e.preventDefault(); });

  function togglePause() {
    if (!playing || !g || g.over) return;
    paused = !paused;
    $('pauseBox').hidden = !paused;
    lastTs = performance.now();
  }

  // จอยสติ๊กเสมือน
  const zone = $('stickZone'), base = $('stickBase'), knob = $('stickKnob');
  zone.addEventListener('pointerdown', function (e) {
    if (stick.active) return;
    e.preventDefault();
    stick.active = true; stick.id = e.pointerId;
    const r = zone.getBoundingClientRect();
    stick.ox = e.clientX; stick.oy = e.clientY;
    base.style.display = 'block'; base.style.left = (e.clientX - r.left - 55) + 'px'; base.style.top = (e.clientY - r.top - 55) + 'px';
    knob.style.transform = 'translate(0,0)';
    zone.setPointerCapture(e.pointerId);
  });
  zone.addEventListener('pointermove', function (e) {
    if (!stick.active || e.pointerId !== stick.id) return;
    let dx = e.clientX - stick.ox, dy = e.clientY - stick.oy;
    const l = Math.hypot(dx, dy), max = 50;
    if (l > max) { dx = dx / l * max; dy = dy / l * max; }
    knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    stick.dx = Math.abs(dx) < 8 && Math.abs(dy) < 8 ? 0 : dx / max;
    stick.dy = Math.abs(dx) < 8 && Math.abs(dy) < 8 ? 0 : dy / max;
  });
  function endStick(e) {
    if (e.pointerId !== stick.id) return;
    stick.active = false; stick.dx = 0; stick.dy = 0; base.style.display = 'none';
  }
  zone.addEventListener('pointerup', endStick);
  zone.addEventListener('pointercancel', endStick);

  function readInput() {
    const pl = g.player;
    let dx = 0, dy = 0;
    if (keys.KeyA || keys.ArrowLeft) dx -= 1;
    if (keys.KeyD || keys.ArrowRight) dx += 1;
    if (keys.KeyW || keys.ArrowUp) dy -= 1;
    if (keys.KeyS || keys.ArrowDown) dy += 1;
    if (stick.active) { dx += stick.dx; dy += stick.dy; }
    pl.input.dx = dx; pl.input.dy = dy;
    while (queue.length) TR.Sim.castSkill(g, pl, queue.shift());
  }

  /* ---------- HUD ---------- */
  function updateHud() {
    const pl = g.player, era = TR.ERAS[g.era];
    const toNext = g.era < TR.ERAS.length - 1 ? Math.max(0, (g.era + 1) * CFG.eraLen - g.t) : -1;
    $('eraTag').textContent = 'ยุค' + era.name + ' · ' + era.short;
    const tm = Math.floor(g.t);
    $('clock').textContent = Math.floor(tm / 60) + ':' + String(tm % 60).padStart(2, '0') + (toNext >= 0 ? ' (เปลี่ยนยุคใน ' + Math.floor(toNext / 60) + ':' + String(Math.floor(toNext % 60)).padStart(2, '0') + ')' : '');
    $('score').innerHTML = '<b class="b">' + g.score[0] + '</b> : <b class="r">' + g.score[1] + '</b>';
    const hp = Math.max(0, pl.hp);
    $('meHp').style.width = (100 * hp / pl.maxHp) + '%';
    $('meHpText').textContent = pl.dead ? 'ฟื้นใน ' + Math.max(0, Math.ceil(pl.respawnAt - g.t)) + ' วิ' : Math.ceil(hp) + ' / ' + Math.ceil(pl.maxHp);
    $('meInfo').textContent = 'Lv ' + pl.level + ' · ขั้นทอง ' + pl.tier + ' · ฆ่า ' + pl.kills + '/' + pl.deaths + (pl.peak ? ' · ยุครุ่งเรือง' : '');
    const btns = $('skills').children;
    for (let i = 0; i < btns.length; i++) {
      const cd = pl.cd[i], b = btns[i];
      b.classList.toggle('wait', cd > 0 || pl.dead);
      b.querySelector('.cd').textContent = cd > 0 ? Math.ceil(cd) : '';
    }
  }

  /* ---------- ลูปหลัก ---------- */
  function frame(ts) {
    requestAnimationFrame(frame);
    if (!playing || !g) {
      lastTs = ts;
      if (!$('menu').hidden) { const sz = sizeStage(); if (sz) TR.Render.drawStage(stageCtx, sz.w, sz.h, stageState, TR.HERO_BY_ID[sel.hero], sz.dpr); }
      return;
    }
    if (introEnd) {
      if (performance.now() >= introEnd) endIntro();
      lastTs = ts;
      camCache = TR.Render.draw(ctx, g, 1);
      return;
    }
    if (!paused) {
      acc += Math.min(0.25, (ts - lastTs) / 1000);
      while (acc >= CFG.dt) { readInput(); TR.Sim.step(g); acc -= CFG.dt; }
      handleEvents();
    }
    lastTs = ts;
    camCache = TR.Render.draw(ctx, g, paused ? 1 : acc / CFG.dt);
    if (ts - hudT > 100) { hudT = ts; updateHud(); }
    if (ts - miniT > 200) { miniT = ts; TR.Render.drawMinimap(mctx, g, mini.width, mini.height, camCache); }
  }

  /* ---------- ผูกปุ่ม ---------- */
  $('startBtn').addEventListener('click', startGame);
  $('againBtn').addEventListener('click', startGame);
  $('menuBtn').addEventListener('click', toMenu);
  $('pauseBtn').addEventListener('click', togglePause);
  $('resumeBtn').addEventListener('click', togglePause);
  $('quitBtn').addEventListener('click', toMenu);
  $('updBtn').addEventListener('click', showUpdate);
  $('updClose').addEventListener('click', closeUpdate);
  window.addEventListener('resize', fit);

  buildMenu();
  fit();
  if (getSeen() !== TR.VERSION) { $('updDot').hidden = false; showUpdate(); }
  requestAnimationFrame(frame);
})();
