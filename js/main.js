/* Thai Realm — หน้าเมนู ควบคุม HUD ลูปเกม และกล่องข้อความอัปเดต */
(function () {
  'use strict';
  const TR = window.TR, CFG = TR.CFG;
  const $ = function (id) { return document.getElementById(id); };
  const canvas = $('game'), ctx = canvas.getContext('2d');
  const mini = $('mini'), mctx = mini.getContext('2d');

  const stageCv = $('stageCv'), stageCtx = stageCv.getContext('2d'), stageState = { side: 1 };
  let introEnd = 0;
  let sel = { hero: TR.HEROES[0].id, emblem: null, spell: 'heal' };
  try { const sv = localStorage.getItem('tr_spell'); if (sv && TR.SPELL_BY_ID[sv]) sel.spell = sv; } catch (e) { /* ไม่เป็นไร */ }
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
    buildEmblems(); buildSpells();
    const nm = $('stageName');
    nm.querySelector('.et').textContent = 'ยุค' + TR.ERAS[h.era].name;
    nm.querySelector('.nm').textContent = h.name;
    nm.querySelector('.rl').textContent = TR.ROLES[h.role].name + ' · ' + h.strength;
    nm.classList.remove('anim'); void nm.offsetWidth; nm.classList.add('anim');
    TR.Render.stageReset(stageState, id);
  }

  /* ลากเพื่อหมุนฮีโร่ 3D (เมาส์/นิ้ว), บีบนิ้วหรือล้อเมาส์เพื่อซูม, ดับเบิลคลิกกลับด้านหน้า */
  (function () {
    const pts = new Map(); let lastX = 0, pinch = 0;
    const hint = $('stageHint');
    function dist() { const a = Array.from(pts.values()); return Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) || 1; }
    function used() { if (hint) hint.classList.add('gone'); }
    stageCv.addEventListener('pointerdown', function (e) {
      if (!TR.Stage3D) return;
      try { stageCv.setPointerCapture(e.pointerId); } catch (x) {}
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1) { lastX = e.clientX; TR.Stage3D.dragStart(stageState); stageCv.classList.add('grabbing'); }
      else if (pts.size === 2) pinch = dist();
    });
    stageCv.addEventListener('pointermove', function (e) {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size >= 2) { const d = dist(); TR.Stage3D.zoomBy(stageState, d / pinch); pinch = d; used(); }
      else { const dx = e.clientX - lastX; lastX = e.clientX; if (dx) { TR.Stage3D.dragMove(stageState, dx); used(); } }
    });
    function up(e) {
      if (!pts.delete(e.pointerId)) return;
      if (pts.size === 0) { TR.Stage3D.dragEnd(stageState); stageCv.classList.remove('grabbing'); }
      else if (pts.size === 1) { const p = Array.from(pts.values())[0]; lastX = p.x; }
    }
    stageCv.addEventListener('pointerup', up); stageCv.addEventListener('pointercancel', up);
    stageCv.addEventListener('wheel', function (e) { if (!TR.Stage3D) return; e.preventDefault(); TR.Stage3D.zoomBy(stageState, e.deltaY < 0 ? 1.08 : 1 / 1.08); used(); }, { passive: false });
    stageCv.addEventListener('dblclick', function () { if (TR.Stage3D) TR.Stage3D.resetView(stageState); });
  })();

  function sizeStage() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2), w = stageCv.clientWidth, h = stageCv.clientHeight;
    if (!w || !h) return false;
    if (stageCv.width !== Math.round(w * dpr) || stageCv.height !== Math.round(h * dpr)) { stageCv.width = Math.round(w * dpr); stageCv.height = Math.round(h * dpr); }
    return { w: w, h: h, dpr: dpr };
  }

  function buildSpells() {
    const grid = $('spellGrid'); grid.innerHTML = '';
    TR.SPELLS.forEach(function (sp) {
      const b = document.createElement('button');
      b.className = 'spbtn' + (sel.spell === sp.id ? ' sel' : '');
      b.innerHTML = '<span class="ic">' + sp.icon + '</span>' + sp.name;
      b.addEventListener('click', function () { sel.spell = sp.id; try { localStorage.setItem('tr_spell', sp.id); } catch (e) { /* ไม่เป็นไร */ } buildSpells(); });
      grid.appendChild(b);
    });
    const sp = TR.SPELL_BY_ID[sel.spell];
    $('spellInfo').innerHTML = '<b>' + sp.icon + ' ' + sp.name + '</b> · คูลดาวน์ ' + sp.cd + ' วิ<br>' + sp.desc;
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
  /* โหมดกราฟิก: '3d' = กล้องเอียง+โมเดล poly (ค่าเริ่มต้น) / '2d' = มุมบนตรงแบบเดิม ใช้ตุ๊กตา 2D เบากว่า */
  let gfx = '3d';
  try { if (localStorage.getItem('tr_gfx') === '2d') gfx = '2d'; } catch (e) { /* ไม่เป็นไร */ }
  function fit() { TR.Render.resize(canvas, window.innerWidth, window.innerHeight); }
  function applyGfx(mode, save) {
    gfx = mode === '2d' ? '2d' : '3d';
    TR.Render.setTilt(gfx === '3d' ? 0.74 : 1); TR.Render.setMode3d(gfx === '3d');
    if (gfx === '3d' && !TR.Render.is3d()) gfx = '2d';
    $('gfxMode').textContent = gfx === '3d' ? '3D' : '2D คลาสสิก';
    if (save) { try { localStorage.setItem('tr_gfx', gfx); } catch (e) { /* ไม่เป็นไร */ } }
    fit(); slowN = 0; ftEma = 0;
  }
  let toastT = 0;
  function toast(msg) { const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(function () { t.hidden = true; }, 4200); }
  // ตรวจความลื่น: ถ้าเวลาวาดเฉลี่ยสูงต่อเนื่อง ~3 วินาที สลับเป็น 2D ให้เอง (ไม่บันทึกเป็นค่าถาวร)
  let ftEma = 0, slowN = 0;
  function watchPerf(ms) {
    ftEma = ftEma ? ftEma * 0.9 + ms * 0.1 : ms;
    if (gfx === '3d' && ftEma > 24) { if (++slowN > 180) { applyGfx('2d', false); toast('เครื่องดูหนัก — สลับเป็นกราฟิก 2D ให้อัตโนมัติ (เปลี่ยนกลับได้ที่เมนู)'); } } else slowN = Math.max(0, slowN - 2);
  }

  /* ---------- ตั้งค่าการควบคุม (เก็บในเครื่อง) ---------- */
  const CTL_DEF = { atkMode: 'button', prio: 'near', dragAim: true, mouseAim: !!(window.matchMedia && matchMedia('(pointer:fine)').matches), autoSkill: false, size: 1 };
  let ctl = Object.assign({}, CTL_DEF);
  try { const sv = JSON.parse(localStorage.getItem('tr_ctl') || 'null'); if (sv) Object.keys(CTL_DEF).forEach(function (k) { if (sv[k] !== undefined) ctl[k] = sv[k]; }); } catch (e) { /* ไม่เป็นไร */ }
  const CTL_ROWS = [
    { k: 'atkMode', t: 'โหมดตีปกติ', opts: [['button', 'กดปุ่มโจมตี (แบบ AoV)'], ['auto', 'ตีอัตโนมัติ']], d: 'แบบ AoV: กดปุ่ม ⚔️ หรือ Space ถึงจะตี กดค้างตีต่อเนื่อง แตะครั้งเดียวตี 1 ครั้ง' },
    { k: 'prio', t: 'เป้าหมายที่ตีก่อน', opts: [['near', 'ใกล้สุด'], ['lowhp', 'เลือดน้อยสุด'], ['hero', 'ฮีโร่ก่อน']], d: 'ใช้กับการตีปกติ ปุ่มเล็ก 🗡️ สั่งตีลูกกระจ๊อก (เลือดน้อยก่อน) ส่วน 🏯 สั่งตีป้อม' },
    { k: 'dragAim', t: 'การเล็งสกิล', opts: [[true, 'แตะ = ออโต้ / ลาก = เล็ง'], [false, 'แตะอย่างเดียว (ออโต้)']], d: 'ลากนิ้วออกจากปุ่มสกิลเพื่อเล็งทิศหรือจุด ปล่อยเพื่อใช้ ลากไกลสุดเพื่อยกเลิก' },
    { k: 'mouseAim', t: 'เมาส์เล็งสกิล (คอมพิวเตอร์)', opts: [[true, 'เปิด'], [false, 'ปิด']], d: 'กด Q/E/R แล้วสกิลพุ่งไปทางเมาส์ ปิดไว้จะเล็งเป้าใกล้สุดให้เอง' },
    { k: 'autoSkill', t: 'อัปเลเวลสกิลอัตโนมัติ', opts: [[false, 'เลือกเอง'], [true, 'อัตโนมัติ']], d: 'เลเวลขึ้นได้แต้มสกิล 1 แต้ม กดลูกศร ▲ บนปุ่มสกิลเพื่ออัป' },
    { k: 'size', t: 'ขนาดปุ่ม', opts: [[0.85, 'เล็ก'], [1, 'กลาง'], [1.18, 'ใหญ่']], d: '' }
  ];
  function saveCtl() { try { localStorage.setItem('tr_ctl', JSON.stringify(ctl)); } catch (e) { /* ไม่เป็นไร */ } }
  function applyCtl() {
    if (g && g.player) { const pl = g.player; pl.atkMode = ctl.atkMode; pl.prio = ctl.prio; pl.autoSkill = !!ctl.autoSkill; }
    layoutCtl();
  }
  function buildCtlRows() {
    const box = $('ctlRows'); box.innerHTML = '';
    CTL_ROWS.forEach(function (r) {
      const row = document.createElement('div'); row.className = 'crow';
      row.innerHTML = '<div class="cl">' + r.t + '</div>';
      const seg = document.createElement('div'); seg.className = 'cseg';
      r.opts.forEach(function (o) {
        const b = document.createElement('button'); b.textContent = o[1]; b.className = ctl[r.k] === o[0] ? 'sel' : '';
        b.addEventListener('click', function () { ctl[r.k] = o[0]; saveCtl(); applyCtl(); buildCtlRows(); });
        seg.appendChild(b);
      });
      row.appendChild(seg);
      if (r.d) { const d = document.createElement('div'); d.className = 'cd2'; d.textContent = r.d; row.appendChild(d); }
      box.appendChild(row);
    });
  }
  function openCtl() { buildCtlRows(); $('ctlSet').hidden = false; }
  $('ctlBtn').addEventListener('click', openCtl);
  $('ctlBtn2').addEventListener('click', openCtl);
  $('ctlClose').addEventListener('click', function () { $('ctlSet').hidden = true; });

  /* ---------- จัดวางปุ่มแบบ AoV: ปุ่มโจมตีใหญ่มุมขวาล่าง สกิลเรียงโค้งรอบปุ่ม ---------- */
  function layoutCtl() {
    const f = Math.max(0.6, Math.min(1.05, Math.min(window.innerHeight / 540, window.innerWidth / 800))) * ctl.size;
    const ATK = 86 * f, SK = 64 * f, ULT = 76 * f, SM = 42 * f, SP = 52 * f, M = 14 + 4;
    const set = function (el, cx, cy, size) { el.style.width = el.style.height = size + 'px'; el.style.right = (cx - size / 2) + 'px'; el.style.bottom = (cy - size / 2) + 'px'; };
    const cx0 = M + ATK / 2, cy0 = M + ATK / 2, rr = ATK * 0.5 + SK * 0.5 + 14 * f;
    set($('atkBtn'), cx0, cy0, ATK);
    const sk = $('skills').children;
    const pos = [[180, rr * 1.0], [133, rr * 1.06], [88, rr * 1.04]];
    for (let i = 0; i < sk.length && i < 3; i++) {
      const a = pos[i][0] * Math.PI / 180, r = pos[i][1], size = i === 2 ? ULT : SK;
      set(sk[i], cx0 - Math.cos(a) * r, cy0 + Math.sin(a) * r, size);
    }
    const colX = cx0 + rr + SK / 2 + SM / 2 + 10 * f;
    set($('atkMin'), colX, M + SM / 2, SM); set($('atkTwr'), colX, M + SM * 1.5 + 8 * f, SM);
    const spX = colX + SM / 2 + SP / 2 + 10 * f;
    set($('spBtn'), spX, M + SP / 2, SP); set($('rcBtn'), spX, M + SP * 1.5 + 8 * f, SP);
  }
  window.addEventListener('resize', layoutCtl);

  /* ---------- ปุ่มโจมตี / สั่งตีลูกกระจ๊อก / สั่งตีป้อม ---------- */
  function atkPress(type, on, el) {
    if (!g || !playing) return; const pl = g.player;
    if (on) { pl.atkType = type; pl.atkHold = true; pl.atkBuf = g.t + 0.45; } else { pl.atkHold = false; pl.atkType = null; }
    if (el) el.classList.toggle('on', on);
  }
  [['atkBtn', null], ['atkMin', 'minion'], ['atkTwr', 'tower']].forEach(function (d) {
    const el = $(d[0]);
    el.addEventListener('pointerdown', function (e) { e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (x) { /* ไม่เป็นไร */ } atkPress(d[1], true, el); });
    const up = function (e) { atkPress(d[1], false, el); };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
  });

  /* ---------- ปุ่มสกิล: แตะ = ใช้ทันที (เล็งออโต้) / ลาก = เล็งเอง / ▲ = อัปเลเวล ---------- */
  const AIM_PX = 16, CANCEL_PX = 170, FULL_PX = 95;
  function buildSkillButtons(def) {
    const box = $('skills');
    box.innerHTML = '';
    def.skills.forEach(function (s, i) {
      const b = document.createElement('button');
      b.className = 'skill' + (i === 2 ? ' ult' : '');
      const url = TR.SkillIcon ? TR.SkillIcon.url(def, i, 112) : '';
      if (url) b.style.backgroundImage = 'url(' + url + ')';
      b.innerHTML = '<span class="key">' + SK_KEYS[i] + '</span><span class="nm">' + s.name + '</span><span class="lv"></span><span class="cd"></span><span class="up">▲</span>';
      const aimSpec = TR.Sim.skillAim(s);
      let drag = null;
      const K = function () { return TR.Render.tilt.K || 1; };
      b.querySelector('.up').addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); if (g) TR.Sim.upgradeSkill(g, g.player, i); });
      b.addEventListener('pointerdown', function (e) {
        if (e.target.classList.contains('up')) return;
        e.preventDefault(); if (!g || !playing || paused) return;
        try { b.setPointerCapture(e.pointerId); } catch (x) { /* ไม่เป็นไร */ }
        const r = b.getBoundingClientRect();
        drag = { id: e.pointerId, cx: r.left + r.width / 2, cy: r.top + r.height / 2, on: false };
        if (aimSpec.type === 'self' || !ctl.dragAim) { queue.push({ slot: i }); drag.done = true; }
      });
      b.addEventListener('pointermove', function (e) {
        if (!drag || drag.done || e.pointerId !== drag.id) return;
        const vx = e.clientX - drag.cx, vy = e.clientY - drag.cy, len = Math.hypot(vx, vy);
        if (len < AIM_PX) { drag.on = false; TR.Render.setAim(null); b.classList.remove('aiming'); return; }
        drag.on = true; b.classList.add('aiming');
        const d = [vx, vy / K()], dl = Math.hypot(d[0], d[1]) || 1;
        drag.aim = { dx: d[0] / dl, dy: d[1] / dl, k: Math.max(0.2, Math.min(1, len / FULL_PX)) };
        drag.cancel = len > CANCEL_PX;
        TR.Render.setAim({ type: aimSpec.type, range: aimSpec.range, r: aimSpec.r, dx: drag.aim.dx, dy: drag.aim.dy, k: drag.aim.k, cancel: drag.cancel });
      });
      const end = function (e) {
        if (!drag || e.pointerId !== drag.id) return;
        TR.Render.setAim(null); b.classList.remove('aiming');
        if (!drag.done) { if (drag.on) { if (!drag.cancel) queue.push({ slot: i, aim: drag.aim }); } else queue.push({ slot: i }); }
        drag = null;
      };
      b.addEventListener('pointerup', end);
      b.addEventListener('pointercancel', function (e) { if (drag && e.pointerId === drag.id) { TR.Render.setAim(null); b.classList.remove('aiming'); drag = null; } });
      box.appendChild(b);
    });
    layoutCtl();
  }

  // คีย์บอร์ด/เมาส์: กดปุ่มสกิลแล้วพุ่งไปทางเมาส์ (ถ้าเปิดไว้)
  let mouse = { x: 0, y: 0, in: false };
  canvas.addEventListener('mousemove', function (e) { mouse.x = e.clientX; mouse.y = e.clientY; mouse.in = true; });
  canvas.addEventListener('mouseleave', function () { mouse.in = false; });
  function keySkill(i) {
    if (!g) return;
    const spec = TR.Sim.skillAim(g.player.def.skills[i]);
    if (ctl.mouseAim && mouse.in && spec.type !== 'self') {
      const pl = g.player, w = TR.Render.screenToWorld(canvas, mouse.x, mouse.y);
      const dx = w.x - pl.x, dy = w.y - pl.y, len = Math.hypot(dx, dy) || 1;
      queue.push({ slot: i, aim: { dx: dx / len, dy: dy / len, k: Math.max(0.2, Math.min(1, len / Math.max(1, spec.range))) } });
    } else queue.push({ slot: i });
  }
  // แตะ/คลิกที่ศัตรูเพื่อล็อกเป้า (ฮีโร่และมอนป่า) แตะซ้ำเพื่อปลด
  canvas.addEventListener('pointerdown', function (e) {
    if (!g || !playing || paused || e.button > 0) return;
    const w = TR.Render.screenToWorld(canvas, e.clientX, e.clientY), pl = g.player;
    let best = null, bd = 34;
    for (const u of g.units) {
      if (u.dead || u.team === pl.team || (u.type !== 'hero' && u.type !== 'monster')) continue;
      const d = Math.hypot(u.x - w.x, u.y - (w.y + 12)) - u.radius;
      if (d < bd) { bd = d; best = u; }
    }
    if (best) pl.lockT = pl.lockT === best ? null : best;
  });

  function startGame() {
    if (endTimer) { clearTimeout(endTimer); endTimer = null; }
    g = TR.Sim.createGame({ playerHero: sel.hero, playerEmblem: sel.emblem, playerSpell: sel.spell });
    window.TRGame = g;
    acc = 0; paused = false; playing = true; queue.length = 0; shopOpen = false; $('shop').hidden = true;
    $('menu').hidden = true; $('result').hidden = true; $('pauseBox').hidden = true;
    $('hud').hidden = false; $('pauseBtn').style.display = 'block';
    $('feed').innerHTML = '';
    document.body.classList.add('playing');
    buildSkillButtons(g.player.def); applyCtl();
    const spd = TR.SPELL_BY_ID[g.player.spell];
    $('spBtn').querySelector('.ic').textContent = spd.icon; $('spBtn').querySelector('.nm').textContent = spd.name;
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
    shopOpen = false; $('shop').hidden = true; $('hud').hidden = true; $('result').hidden = true; $('menu').hidden = false; $('pauseBtn').style.display = 'none';
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
      else if (e.k === 'boss') {
        if (e.state === 'spawn') banner('ยักษ์วัดแจ้งปรากฏกลางป่า!', 'ฆ่าได้ทั้งทีมได้บัฟและทอง · ระวังการสแลมพื้นที่', 5000);
        else { feed('ทีม' + (e.team === 0 ? 'ฟ้า' : 'แดง') + 'ปราบยักษ์วัดแจ้งได้', e.team); banner('ทีม' + (e.team === 0 ? 'ฟ้า' : 'แดง') + 'ปราบยักษ์วัดแจ้ง', 'ทั้งทีมได้บัฟและทอง · ยักษ์จะกลับมาใน 3 นาที', 4500); }
      }
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
    if (e.code === 'KeyQ' || e.code === 'Digit1') keySkill(0);
    else if (e.code === 'KeyE' || e.code === 'Digit2') keySkill(1);
    else if (e.code === 'KeyR' || e.code === 'Digit3') keySkill(2);
    else if (e.code === 'Space' || e.code === 'KeyJ') atkPress(null, true, $('atkBtn'));
    else if (e.code === 'KeyZ') atkPress('minion', true, $('atkMin'));
    else if (e.code === 'KeyX') atkPress('tower', true, $('atkTwr'));
    else if (e.code === 'KeyF') castPlayerSpell();
    else if (e.code === 'KeyC') recallPlayer();
    else if (e.code === 'KeyB') toggleShop();
    else if (e.code === 'Escape' && shopOpen) toggleShop(false);
    else if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
  });
  window.addEventListener('keyup', function (e) { keys[e.code] = false; if (e.code === 'Space' || e.code === 'KeyJ') atkPress(null, false, $('atkBtn')); else if (e.code === 'KeyZ') atkPress('minion', false, $('atkMin')); else if (e.code === 'KeyX') atkPress('tower', false, $('atkTwr')); });
  window.addEventListener('blur', function () { for (const k in keys) keys[k] = false; });
  document.addEventListener('visibilitychange', function () { if (document.hidden && playing && !paused) togglePause(); });
  window.addEventListener('contextmenu', function (e) { if (playing) e.preventDefault(); });

  /* ---------- ร้านค้า ---------- */
  let shopOpen = false, shopSig = '', shopSel = null;
  function toggleShop(force) {
    if (!playing || !g || g.over) return;
    shopOpen = force === undefined ? !shopOpen : force;
    $('shop').hidden = !shopOpen; shopSig = '';
    if (shopOpen) renderShop(true);
  }
  function renderShop(force) {
    const pl = g.player, can = TR.Sim.canShop(pl);
    $('shopGold').textContent = '💰 ' + Math.floor(pl.gold);
    $('shopWhere').textContent = can ? 'ซื้อ/ขายได้ตอนนี้' : 'ซื้อได้เมื่ออยู่ที่ฐานหรือตอนตาย';
    const sig = pl.items.join(',') + '|' + can + '|' + (shopSel || '') + '|' + Math.floor(pl.gold / 50);
    if (!force && sig === shopSig) return;
    shopSig = sig;
    const own = $('shopOwned'); own.innerHTML = '';
    for (let i = 0; i < CFG.shopSlots; i++) {
      const id = pl.items[i], d = document.createElement('div');
      d.className = 'slot' + (id ? ' on' : ''); d.textContent = id ? TR.ITEM_BY_ID[id].icon : '';
      if (id) { d.title = 'แตะเพื่อเลือก: ' + TR.ITEM_BY_ID[id].name; d.addEventListener('click', function () { shopSel = id; renderShop(true); }); }
      own.appendChild(d);
    }
    const list = $('shopList'); list.innerHTML = '';
    TR.ITEM_LINES.forEach(function (ln) {
      const lb = document.createElement('div'); lb.className = 'sline'; lb.textContent = ln.icon + ' ' + ln.name; list.appendChild(lb);
      for (let t = 1; t <= 3; t++) {
        const it = TR.itemAt(ln.id, t), have = pl.items.indexOf(it.id) >= 0, net = TR.Sim.netCost(pl, it);
        const afford = net != null && pl.gold >= net;
        const b = document.createElement('button');
        b.className = 'sitem' + (have ? ' have' : (afford && can ? ' can' : (net == null ? ' no' : ''))) + (shopSel === it.id ? ' sel' : '');
        b.innerHTML = '<span class="ic">' + it.icon + '</span><span class="nm">' + it.name + '</span><span class="co">' + (have ? '✓' : (net == null ? '—' : net)) + '</span>';
        b.addEventListener('click', function () { shopSel = it.id; renderShop(true); });
        list.appendChild(b);
      }
    });
    const info = $('shopInfo');
    if (!shopSel) { info.textContent = 'แตะไอเทมเพื่อดูรายละเอียด · แต่ละสายอัปเกรดต่อกันได้ ชั้นบนหักราคาชิ้นล่างที่มี'; return; }
    const it = TR.ITEM_BY_ID[shopSel], have = pl.items.indexOf(it.id) >= 0, net = TR.Sim.netCost(pl, it);
    const lower = TR.Sim.ownedInLine(pl, it.line);
    info.innerHTML = '<span class="tx"><b>' + it.icon + ' ' + it.name + '</b> (ชั้น ' + it.tier + ')<br>' + TR.itemDesc(it) + (lower && !have && net != null ? ' · ต่อยอดจาก ' + lower.name : '') + '</span>';
    const btn = document.createElement('button');
    if (have) { btn.textContent = 'ขาย +' + Math.floor(it.cost * 0.7); btn.disabled = !can; btn.addEventListener('click', function () { if (TR.Sim.sell(g, pl, it.id)) renderShop(true); }); }
    else { btn.textContent = net == null ? 'ซื้อไม่ได้' : 'ซื้อ ' + net; btn.disabled = !can || net == null || pl.gold < net; btn.addEventListener('click', function () { if (TR.Sim.buy(g, pl, it.id)) renderShop(true); }); }
    info.appendChild(btn);
  }
  $('shopBtn').addEventListener('click', function () { toggleShop(); });
  $('shopClose').addEventListener('click', function () { toggleShop(false); });

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

  function castPlayerSpell() { if (g && playing && !paused) TR.Sim.castSpell(g, g.player); }
  function recallPlayer() { if (!g || !playing || paused) return; const pl = g.player; if (pl.recall) TR.Sim.cancelRecall(g, pl); else TR.Sim.startRecall(g, pl); }
  $('spBtn').addEventListener('pointerdown', function (e) { e.preventDefault(); castPlayerSpell(); });
  $('rcBtn').addEventListener('pointerdown', function (e) { e.preventDefault(); recallPlayer(); });
  function readInput() {
    const pl = g.player;
    let dx = 0, dy = 0;
    if (keys.KeyA || keys.ArrowLeft) dx -= 1;
    if (keys.KeyD || keys.ArrowRight) dx += 1;
    if (keys.KeyW || keys.ArrowUp) dy -= 1;
    if (keys.KeyS || keys.ArrowDown) dy += 1;
    if (stick.active) { dx += stick.dx; dy += stick.dy; }
    pl.input.dx = dx; pl.input.dy = dy;
    while (queue.length) { const q = queue.shift(); TR.Sim.castSkill(g, pl, q.slot, q.aim); }
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
    $('meInfo').textContent = 'Lv ' + pl.level + ' · ทอง ' + Math.floor(pl.gold) + ' · ฆ่า ' + pl.kills + '/' + pl.deaths + (pl.peak ? ' · ยุครุ่งเรือง' : '');
    const canBuy = TR.Sim.canShop(pl) && TR.ITEMS.some(function (it) { const n = TR.Sim.netCost(pl, it); return n != null && pl.gold >= n; });
    $('shopDot').hidden = !canBuy;
    if (shopOpen) renderShop(false);
    const spb = $('spBtn'), sc = pl.spCd;
    spb.classList.toggle('wait', sc > 0 || pl.dead); spb.querySelector('.cd').textContent = sc > 0 ? Math.ceil(sc) : '';
    $('rcBtn').classList.toggle('wait', !!pl.recall); $('rcBtn').querySelector('.cd').textContent = pl.recall ? Math.max(0, Math.ceil(pl.recall.end - g.t)) : '';
    const btns = $('skills').children;
    for (let i = 0; i < btns.length; i++) {
      const cd = pl.cd[i], b = btns[i], lv = pl.sl[i], max = i < 2 ? CFG.skillMax : 3;
      const locked = lv <= 0;
      b.classList.toggle('lock', locked);
      b.classList.toggle('wait', !locked && (cd > 0 || pl.dead));
      b.classList.toggle('canup', TR.Sim.canUpgrade(pl, i));
      b.querySelector('.cd').textContent = !locked && cd > 0 ? Math.ceil(cd) : '';
      b.querySelector('.lv').textContent = '●'.repeat(lv) + '○'.repeat(Math.max(0, max - lv));
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
    const dt0 = performance.now();
    camCache = TR.Render.draw(ctx, g, paused ? 1 : acc / CFG.dt);
    if (!paused) watchPerf(performance.now() - dt0);
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
  $('gfxBtn').addEventListener('click', function () { applyGfx(gfx === '3d' ? '2d' : '3d', true); });
  applyGfx(gfx, false);
  $('updClose').addEventListener('click', closeUpdate);
  window.addEventListener('resize', fit);

  buildMenu();
  fit();
  if (getSeen() !== TR.VERSION) { $('updDot').hidden = false; showUpdate(); }
  requestAnimationFrame(frame);
})();
