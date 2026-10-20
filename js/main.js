/* Thai Realm — หน้าเมนู ควบคุม HUD ลูปเกม และกล่องข้อความอัปเดต */
(function () {
  'use strict';
  const TR = window.TR, CFG = TR.CFG;
  const $ = function (id) { return document.getElementById(id); };
  const canvas = $('game'), ctx = canvas.getContext('2d');
  const mini = $('mini'), mctx = mini.getContext('2d');

  const stageCv = $('stageCv'), stageCtx = stageCv.getContext('2d'), stageState = { side: 1 };
  let introEnd = 0;
  let sel = { hero: TR.HEROES[0].id, emblem: null, spell: 'heal', lane: 1 };
  try { const sl = parseInt(localStorage.getItem('tr_lane'), 10); if ([-1, 0, 1, 2].indexOf(sl) >= 0) sel.lane = sl; } catch (e) { /* ไม่เป็นไร */ }
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
    buildEmblems(); buildSpells(); buildLanes();
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

  const LANES = [[0, '⬆️', 'เลนบน'], [1, '⏺️', 'เลนกลาง'], [2, '⬇️', 'เลนล่าง'], [-1, '🌲', 'ตีป่า']];
  function buildLanes() {
    const grid = $('laneGrid'); grid.innerHTML = '';
    LANES.forEach(function (l) {
      const b = document.createElement('button'); b.className = sel.lane === l[0] ? 'sel' : '';
      b.innerHTML = '<span class="ic">' + l[1] + '</span>' + l[2];
      b.addEventListener('click', function () { sel.lane = l[0]; try { localStorage.setItem('tr_lane', String(l[0])); } catch (e) { /* ไม่เป็นไร */ } buildLanes(); });
      grid.appendChild(b);
    });
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
  const CTL_DEF = { atkMode: 'button', prio: 'near', dragAim: true, mouseAim: !!(window.matchMedia && matchMedia('(pointer:fine)').matches), autoSkill: false, size: 1, autoBuy: true, mini: 1 };
  let ctl = Object.assign({}, CTL_DEF);
  try { const sv = JSON.parse(localStorage.getItem('tr_ctl') || 'null'); if (sv) Object.keys(CTL_DEF).forEach(function (k) { if (sv[k] !== undefined) ctl[k] = sv[k]; }); } catch (e) { /* ไม่เป็นไร */ }
  const CTL_ROWS = [
    { k: 'atkMode', t: 'โหมดตีปกติ', opts: [['button', 'กดปุ่มโจมตี (แบบ AoV)'], ['auto', 'ตีอัตโนมัติ']], d: 'แบบ AoV: กดปุ่ม ⚔️ หรือ Space ถึงจะตี กดค้างตีต่อเนื่อง แตะครั้งเดียวตี 1 ครั้ง' },
    { k: 'prio', t: 'เป้าหมายที่ตีก่อน', opts: [['near', 'ใกล้สุด'], ['lowhp', 'เลือดน้อยสุด'], ['hero', 'ฮีโร่ก่อน']], d: 'ใช้กับการตีปกติ ปุ่มเล็ก 🗡️ สั่งตีลูกกระจ๊อก (เลือดน้อยก่อน) ส่วน 🏯 สั่งตีป้อม' },
    { k: 'dragAim', t: 'การเล็งสกิล', opts: [[true, 'แตะ = ออโต้ / ลาก = เล็ง'], [false, 'แตะอย่างเดียว (ออโต้)']], d: 'ลากนิ้วออกจากปุ่มสกิลเพื่อเล็งทิศหรือจุด ปล่อยเพื่อใช้ ลากไกลสุดเพื่อยกเลิก' },
    { k: 'mouseAim', t: 'เมาส์เล็งสกิล (คอมพิวเตอร์)', opts: [[true, 'เปิด'], [false, 'ปิด']], d: 'กด Q/E/R แล้วสกิลพุ่งไปทางเมาส์ ปิดไว้จะเล็งเป้าใกล้สุดให้เอง' },
    { k: 'autoSkill', t: 'อัปเลเวลสกิลอัตโนมัติ', opts: [[false, 'เลือกเอง'], [true, 'อัตโนมัติ']], d: 'เลเวลขึ้นได้แต้มสกิล 1 แต้ม กดลูกศร ▲ บนปุ่มสกิลเพื่ออัป' },
    { k: 'autoBuy', t: 'ซื้อไอเทมตามเซ็ตอัตโนมัติ', opts: [[true, 'เปิด'], [false, 'ปิด']], d: 'ตอนอยู่ที่ฐานหรือตอนตาย ระบบซื้อไอเทมในเซ็ตของคุณให้ตามลำดับเมื่อเงินพอ (จัดเซ็ตได้ในร้านค้า) ปิดไว้จะซื้อเองหรือแตะไอเทมแนะนำด้านซ้ายจอ' },
    { k: 'mini', t: 'ขนาดมินิแมพ', opts: [[0.8, 'เล็ก'], [1, 'กลาง'], [1.3, 'ใหญ่']], d: 'แตะหรือลากบนมินิแมพเพื่อแอบดูจุดอื่น (ปล่อยแล้วกลับมาที่ตัวเอง) ตอนตายจะค้างตำแหน่งไว้ให้' },
    { k: 'size', t: 'ขนาดปุ่ม', opts: [[0.85, 'เล็ก'], [1, 'กลาง'], [1.18, 'ใหญ่']], d: '' }
  ];
  function saveCtl() { try { localStorage.setItem('tr_ctl', JSON.stringify(ctl)); } catch (e) { /* ไม่เป็นไร */ } }
  function applyCtl() {
    if (g && g.player) { const pl = g.player; pl.atkMode = ctl.atkMode; pl.prio = ctl.prio; pl.autoSkill = !!ctl.autoSkill; }
    layoutCtl(); layoutMini();
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
    const f = Math.max(0.88, Math.min(1.05, Math.min(window.innerHeight / 480, window.innerWidth / 760))) * ctl.size;
    const ATK = 86 * f, SK = 64 * f, ULT = 76 * f, SM = 44 * f, SP = 52 * f, M = 14 + 4;
    const set = function (el, cx, cy, size) { el.style.width = el.style.height = size + 'px'; el.style.right = (cx - size / 2) + 'px'; el.style.bottom = (cy - size / 2) + 'px'; };
    const cx0 = M + ATK / 2, cy0 = M + ATK / 2, rr = ATK * 0.5 + SK * 0.5 + 26 * f;
    set($('atkBtn'), cx0, cy0, ATK);
    const sk = $('skills').children;
    const pos = [[164, rr * 1.04], [124, rr * 1.16], [82, rr * 1.16]];
    for (let i = 0; i < sk.length && i < 3; i++) {
      const a = pos[i][0] * Math.PI / 180, r = pos[i][1], size = i === 2 ? ULT : SK;
      set(sk[i], cx0 - Math.cos(a) * r, cy0 + Math.sin(a) * r, size);
    }
    // แถวล่าง (ซ้ายไปขวาจากปุ่มโจมตี): ตีลูกกระจ๊อก, ตีป้อม, สเปล, กลับพระนคร
    const y0 = M + SM / 2, g1 = cx0 + ATK / 2 + SM / 2 + 4 * f;
    set($('atkMin'), g1, y0, SM); set($('atkTwr'), g1 + SM + 6 * f, y0, SM);
    const spX = g1 + SM + 6 * f + SM / 2 + SP / 2 + 16 * f;
    set($('spBtn'), spX, M + SP / 2, SP); set($('rcBtn'), spX + SP + 8 * f, M + SP / 2, SP);
  }
  window.addEventListener('resize', function () { layoutCtl(); layoutMini(); });
  function layoutMini() {
    const base = Math.round((window.innerHeight <= 460 ? 150 : 214) * ctl.mini), rs = 'max(10px, env(safe-area-inset-right))';
    mini.style.width = base + 'px'; mini.style.height = Math.round(base * 0.375) + 'px';
    mini.width = base * 2; mini.height = Math.round(base * 0.75);
    $('pauseBtn').style.right = 'calc(' + rs + ' + ' + (base + 10) + 'px)'; $('shopBtn').style.right = 'calc(' + rs + ' + ' + (base + 50) + 'px)';
    $('chatBtn').style.right = 'calc(' + rs + ' + ' + (base + 90) + 'px)'; $('chatPanel').style.right = 'calc(' + rs + ' + ' + (base + 10) + 'px)';
    $('feed').style.top = (Math.round(base * 0.375) + (window.innerHeight <= 460 ? 10 : 16)) + 'px';
  }
  /* ---------- สัญญาณทีม: ส่งไปที่จุดที่กล้องมองอยู่ (ตัวเอง / จุดที่แอบดู / ตอนตายคือจุดที่ดูอยู่) ---------- */
  const SIG_ORDER = ['go', 'group', 'danger', 'retreat', 'defend'];
  function buildChat() {
    const box = $('chatPanel'); box.innerHTML = '<small>ส่งไปที่จุดที่กล้องมองอยู่ (แตะมินิแมพค้างแล้วกดส่งเพื่อปักหมุดที่อื่น)</small>';
    SIG_ORDER.forEach(function (id, i) {
      const sg = TR.SIGNALS[id], b = document.createElement('button');
      b.innerHTML = '<span>' + sg.icon + '</span><span>' + sg.name + '</span><span class="k">' + (i + 1) + '</span>';
      b.addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); sendSignal(id); });
      box.appendChild(b);
    });
  }
  function sendSignal(id) {
    if (!g || !playing || paused) return;
    const pt = TR.Render.camPoint(g);
    TR.Sim.signal(g, g.player.team, id, pt.x, pt.y, g.player);
    feed('คุณ: ' + TR.SIGNALS[id].icon + ' ' + TR.SIGNALS[id].name, g.player.team);
    $('chatPanel').hidden = true;
  }
  $('chatBtn').addEventListener('pointerdown', function (e) { e.preventDefault(); if (!g || !playing) return; $('chatPanel').hidden = !$('chatPanel').hidden; });
  buildChat();
  // แตะ/ลากมินิแมพ: แอบดูจุดอื่น (ตอนตายจะค้างไว้)
  let miniDrag = null;
  function miniMove(e) { const w = TR.Render.minimapToWorld(mini, e.clientX, e.clientY); TR.Render.setCamFree(w.x, w.y); }
  mini.addEventListener('pointerdown', function (e) { if (!g || !playing) return; e.preventDefault(); try { mini.setPointerCapture(e.pointerId); } catch (x) { /* ไม่เป็นไร */ } miniDrag = e.pointerId; miniMove(e); });
  mini.addEventListener('pointermove', function (e) { if (miniDrag === e.pointerId) miniMove(e); });
  const miniEnd = function (e) { if (miniDrag !== e.pointerId) return; miniDrag = null; if (g && !g.player.dead) TR.Render.clearCam(); };
  mini.addEventListener('pointerup', miniEnd); mini.addEventListener('pointercancel', miniEnd);
  function setIcon(el, motif, size) {
    const u = TR.SkillIcon && TR.SkillIcon.urlMotif ? TR.SkillIcon.urlMotif(motif, size || 96) : '';
    if (u) { el.style.backgroundImage = 'url(' + u + ')'; el.classList.add('img'); }
  }
  setIcon($('atkMin'), 'atkminion'); setIcon($('atkTwr'), 'atktower'); setIcon($('rcBtn'), 'recall');

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
  // ตอนตาย: ลากจอเลื่อนดูสนามรบ แตะฮีโร่เพื่อติดตาม / ตอนมีชีวิต: แตะศัตรูเพื่อล็อกเป้า แตะซ้ำเพื่อปลด
  let pan = null;
  canvas.addEventListener('pointerdown', function (e) {
    if (!g || !playing || paused || e.button > 0) return;
    const pl = g.player;
    if (pl.dead) { pan = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false }; try { canvas.setPointerCapture(e.pointerId); } catch (x) { /* ไม่เป็นไร */ } return; }
    const w = TR.Render.screenToWorld(canvas, e.clientX, e.clientY);
    let best = null, bd = 34;
    for (const u of g.units) {
      if (u.dead || u.team === pl.team || (u.type !== 'hero' && u.type !== 'monster')) continue;
      const d = Math.hypot(u.x - w.x, u.y - (w.y + 12)) - u.radius;
      if (d < bd) { bd = d; best = u; }
    }
    if (best) pl.lockT = pl.lockT === best ? null : best;
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!pan || e.pointerId !== pan.id) return;
    if (!pan.moved && Math.hypot(e.clientX - pan.sx, e.clientY - pan.sy) < 8) return;
    pan.moved = true;
    const a = TR.Render.screenToWorld(canvas, pan.x, pan.y), b = TR.Render.screenToWorld(canvas, e.clientX, e.clientY);
    TR.Render.panCam(b.x - a.x, b.y - a.y); pan.x = e.clientX; pan.y = e.clientY;
  });
  const panEnd = function (e) {
    if (!pan || e.pointerId !== pan.id) return;
    const was = pan; pan = null;
    if (was.moved || !g) return;
    const w = TR.Render.screenToWorld(canvas, e.clientX, e.clientY); let best = null, bd = 44;
    for (const u of g.units) { if (u.dead || u.type !== 'hero') continue; const d = Math.hypot(u.x - w.x, u.y - (w.y + 12)); if (d < bd) { bd = d; best = u; } }
    if (best) { TR.Render.followUnit(best); toast('กำลังดู ' + best.def.name + (best.team === g.player.team ? ' (ฝั่งเรา)' : ' (ศัตรู)')); }
  };
  canvas.addEventListener('pointerup', panEnd); canvas.addEventListener('pointercancel', panEnd);

  function startGame() {
    if (endTimer) { clearTimeout(endTimer); endTimer = null; }
    g = TR.Sim.createGame({ playerHero: sel.hero, playerEmblem: sel.emblem, playerSpell: sel.spell, playerLane: sel.lane });
    window.TRGame = g;
    acc = 0; paused = false; playing = true; queue.length = 0; shopOpen = false; $('shop').hidden = true; $('chatPanel').hidden = true;
    $('menu').hidden = true; $('result').hidden = true; $('pauseBox').hidden = true;
    $('hud').hidden = false; $('pauseBtn').style.display = 'block';
    $('feed').innerHTML = '';
    document.body.classList.add('playing');
    buildSkillButtons(g.player.def); applyCtl(); build = loadBuild(g.player); quickSig = ''; wasDead = false; TR.Render.clearCam();
    const spd = TR.SPELL_BY_ID[g.player.spell];
    $('spBtn').querySelector('.ic').textContent = spd.icon; $('spBtn').querySelector('.nm').textContent = spd.name; $('spBtn').classList.remove('img'); $('spBtn').style.backgroundImage = ''; setIcon($('spBtn'), 'sp_' + spd.id);
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
  function banner(t, sub, ms, cls) {
    const b = $('banner'); b.className = cls || '';
    b.innerHTML = t + (sub ? '<small>' + sub + '</small>' : '');
    void b.offsetWidth; b.classList.add('on');
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
      else if (e.k === 'announce') {
        const mine = e.team === g.player.team, big = e.kind === 'multi' || e.kind === 'ace' || (e.kind === 'streak' && e.n >= 5);
        banner(e.text, e.sub, big ? 3800 : 2800, 'ann ' + e.kind + (mine ? ' mine' : ' foe') + (big ? ' big' : ''));
        feed((mine ? '🔥 ' : '💀 ') + e.text + ' ' + e.sub, e.team);
      }
      else if (e.k === 'chat') feed(e.who + ': ' + e.text, e.team);
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
    $('resSub').textContent = 'เวลาแมตช์ ' + mm + ':' + String(ss).padStart(2, '0') + ' · จบในยุค' + TR.ERAS[g.era].name;
    const heroes = g.units.filter(function (u) { return u.type === 'hero'; });
    const score = function (u) { return u.kills * 3 + u.assists * 1.5 + u.stDmg / 1000 + u.stTwr / 700 + u.stHeal / 900 + u.stMon * 0.3 - u.deaths * 2; };
    const mvpOf = function (team) { let b = null; heroes.forEach(function (u) { if (u.team === team && (!b || score(u) > score(b))) b = u; }); return b; };
    const mvp = [mvpOf(0), mvpOf(1)];
    const mx = function (k) { return Math.max(1, Math.max.apply(null, heroes.map(function (u) { return u[k]; }))); };
    const mDmg = mx('stDmg'), mTk = mx('stTaken'), mHl = mx('stHeal'), mTw = mx('stTwr');
    const towersDown = [0, 0];
    g.units.forEach(function (u) { if (u.type === 'tower' && u.dead && !u.king) towersDown[1 - u.team]++; });
    const tg = [0, 1].map(function (t) { return Math.round(heroes.filter(function (u) { return u.team === t; }).reduce(function (a, u) { return a + u.goldTotal; }, 0)); });
    const chip = function (v, l) { return '<div class="chip"><b>' + v + '</b>' + l + '</div>'; };
    $('resSummary').innerHTML = chip(g.score[0] + ' : ' + g.score[1], 'ฆ่ารวม (ฟ้า : แดง)') + chip(towersDown[0] + ' : ' + towersDown[1], 'ป้อมที่พัง (ฟ้า : แดง)') + chip(tg[0] + ' : ' + tg[1], 'ทองรวม (ฟ้า : แดง)') +
      chip(g.waveNo, 'คลื่นมินเนียนที่ปล่อย');
    const bar = function (v, m, txt) { return '<td class="bar"><i style="width:' + Math.round(100 * v / m) + '%"></i><b>' + txt + '</b></td>'; };
    let html = '<table><tr><th>ฮีโร่</th><th>เลเวล</th><th>ฆ่า/ตาย/ช่วย</th><th>ดาเมจใส่ฮีโร่</th><th>ดาเมจที่รับ</th><th>ฟื้นฟู</th><th>ดาเมจป้อม</th><th>ป้อม</th><th>ป่า</th><th>ลูกกระจ๊อก</th><th>ทอง</th></tr>';
    [0, 1].forEach(function (t) {
      html += '<tr class="tm"><td colspan="11" class="' + (t === 0 ? 'b' : 'r') + '">ทีม' + (t === 0 ? 'ฟ้า' : 'แดง') + (g.winner === t ? ' · ชนะ' : '') + '</td></tr>';
      heroes.filter(function (u) { return u.team === t; }).sort(function (a, b) { return a.slot - b.slot; }).forEach(function (u) {
        html += '<tr class="' + (u === pl ? 'me' : '') + '"><td class="' + (t === 0 ? 'b' : 'r') + '">' + u.def.name + (u === mvp[t] ? '<span class="mvp">MVP</span>' : '') + (u === pl ? ' (คุณ)' : '') + '</td><td>' + u.level + '</td><td>' + u.kills + '/' + u.deaths + '/' + u.assists + '</td>' +
          bar(u.stDmg, mDmg, Math.round(u.stDmg)) + bar(u.stTaken, mTk, Math.round(u.stTaken)) + bar(u.stHeal, mHl, Math.round(u.stHeal)) + bar(u.stTwr, mTw, Math.round(u.stTwr)) +
          '<td>' + u.stTowers + '</td><td>' + u.stMon + '</td><td>' + u.cs + '</td><td>' + Math.round(u.goldTotal) + '</td></tr>';
      });
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
    if (e.code === 'KeyV') { $('chatPanel').hidden = !$('chatPanel').hidden; return; }
    if (!$('chatPanel').hidden && /^Digit[1-5]$/.test(e.code)) { sendSignal(SIG_ORDER[+e.code.slice(5) - 1]); return; }
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

  /* ---------- เซ็ตไอเทมของฉัน + ไอเทมแนะนำลอยซ้ายจอ + ซื้ออัตโนมัติ ---------- */
  let build = [], quickSig = '';
  function defaultBuild(pl) { return (TR.ITEM_BUILD[pl.role] || TR.ITEM_BUILD.fighter).slice(0, CFG.shopSlots).map(function (l) { return TR.itemAt(l, 3).id; }); }
  function loadBuild(pl) {
    try { const sv = JSON.parse(localStorage.getItem('tr_build_' + pl.def.id) || 'null'); if (Array.isArray(sv) && sv.length && sv.every(function (id) { return TR.ITEM_BY_ID[id]; })) return sv.slice(0, CFG.shopSlots); } catch (e) { /* ไม่เป็นไร */ }
    return defaultBuild(pl);
  }
  function saveBuild() { try { localStorage.setItem('tr_build_' + g.player.def.id, JSON.stringify(build)); } catch (e) { /* ไม่เป็นไร */ } quickSig = ''; }
  function buildAdd(id) {
    const it = TR.ITEM_BY_ID[id], i = build.findIndex(function (b) { return TR.ITEM_BY_ID[b].line === it.line; });
    if (i >= 0) build[i] = id; else if (build.length >= CFG.shopSlots) { toast('เซ็ตเต็มแล้ว (' + CFG.shopSlots + ' สาย) เอาของเดิมออกก่อน'); return; } else build.push(id);
    saveBuild();
  }
  function buildRemove(id) { build = build.filter(function (b) { return b !== id; }); saveBuild(); }
  function buildFront(id) { build = [id].concat(build.filter(function (b) { return b !== id; })); saveBuild(); }
  // ขั้นถัดไปของแต่ละสายในเซ็ต (ชั้นที่เหลือต่อจากที่ถืออยู่) เรียงตามลำดับเซ็ต
  function buildSteps(pl) {
    const out = [];
    build.forEach(function (id) {
      const t = TR.ITEM_BY_ID[id], have = TR.Sim.ownedInLine(pl, t.line), tier = have ? have.tier : 0;
      if (tier >= t.tier) return;
      out.push(TR.itemAt(t.line, tier + 1));
    });
    return out;
  }
  function autoBuy(pl) {
    if (!ctl.autoBuy || !TR.Sim.canShop(pl)) return;
    for (let n = 0; n < 6; n++) {
      const st = buildSteps(pl)[0]; if (!st) return;
      const net = TR.Sim.netCost(pl, st); if (net == null || pl.gold < net) return;
      if (!TR.Sim.buy(g, pl, st.id)) return;
      toast('🛒 ซื้อ ' + st.name + ' ให้ตามเซ็ต'); shopSig = '';
    }
  }
  function renderQuick(pl) {
    const steps = buildSteps(pl).slice(0, 4), can = TR.Sim.canShop(pl);
    const sig = steps.map(function (st) { const n = TR.Sim.netCost(pl, st); return st.id + ':' + (n == null ? 'x' : (pl.gold >= n ? 1 : 0)); }).join(',') + '|' + can;
    if (sig === quickSig) return; quickSig = sig;
    const box = $('quick'); box.innerHTML = '';
    steps.forEach(function (st) {
      const n = TR.Sim.netCost(pl, st), afford = n != null && pl.gold >= n;
      const b = document.createElement('button');
      b.className = 'qi' + (n == null ? ' no' : (afford ? (can ? ' can' : ' ready') : ' poor'));
      b.innerHTML = '<span class="ic">' + st.icon + '</span><span class="co">' + (n == null ? '—' : n) + '</span>';
      b.title = st.name;
      b.addEventListener('pointerdown', function (e) {
        e.preventDefault(); e.stopPropagation();
        const cur = g.player, net = TR.Sim.netCost(cur, st);
        if (net == null) { toast(st.name + ': ซื้อไม่ได้ (ช่องเต็ม)'); return; }
        if (!TR.Sim.canShop(cur)) { toast(ctl.autoBuy ? 'ไม่อยู่ที่ฐาน — ระบบจะซื้อ ' + st.name + ' ให้เมื่อกลับถึงฐาน (กด C กลับพระนคร)' : 'ต้องอยู่ที่ฐานหรือตอนตายถึงจะซื้อได้'); return; }
        if (cur.gold < net) { toast('เงินไม่พอ ' + st.name + ' ขาดอีก ' + Math.ceil(net - cur.gold)); return; }
        if (TR.Sim.buy(g, cur, st.id)) { toast('🛒 ซื้อ ' + st.name); quickSig = ''; shopSig = ''; }
      });
      box.appendChild(b);
    });
    box.hidden = !steps.length;
  }

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
    const sig = pl.items.join(',') + '|' + can + '|' + (shopSel || '') + '|' + Math.floor(pl.gold / 50) + '|' + build.join(',');
    if (!force && sig === shopSig) return;
    shopSig = sig;
    const own = $('shopOwned'); own.innerHTML = '';
    for (let i = 0; i < CFG.shopSlots; i++) {
      const id = pl.items[i], d = document.createElement('div');
      d.className = 'slot' + (id ? ' on' : ''); d.textContent = id ? TR.ITEM_BY_ID[id].icon : '';
      if (id) { d.title = 'แตะเพื่อเลือก: ' + TR.ITEM_BY_ID[id].name; d.addEventListener('click', function () { shopSel = id; renderShop(true); }); }
      own.appendChild(d);
    }
    const bb = $('shopBuild'); bb.innerHTML = '';
    for (let i = 0; i < CFG.shopSlots; i++) {
      const id = build[i], d = document.createElement('div');
      d.className = 'slot' + (id ? ' on' : ''); d.textContent = id ? TR.ITEM_BY_ID[id].icon : '＋';
      if (id) { d.title = TR.ITEM_BY_ID[id].name; d.addEventListener('click', function () { shopSel = id; renderShop(true); }); }
      bb.appendChild(d);
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
    const inB = build.indexOf(it.id) >= 0, bt = document.createElement('button'); bt.className = 'alt';
    bt.textContent = inB ? '− เอาออกจากเซ็ต' : '＋ เพิ่มเข้าเซ็ต'; bt.addEventListener('click', function () { if (inB) buildRemove(it.id); else buildAdd(it.id); renderShop(true); });
    info.appendChild(bt);
    if (inB && build[0] !== it.id) { const fb = document.createElement('button'); fb.className = 'alt'; fb.textContent = '⇧ ซื้อก่อน'; fb.addEventListener('click', function () { buildFront(it.id); renderShop(true); }); info.appendChild(fb); }
  }
  $('buildReset').addEventListener('click', function () { if (!g) return; build = defaultBuild(g.player); saveBuild(); renderShop(true); toast('ใช้เซ็ตแนะนำของสาย' + TR.ROLES[g.player.role].name + ' แล้ว'); });
  $('shopBtn').addEventListener('click', function () { toggleShop(); });
  $('shopClose').addEventListener('click', function () { toggleShop(false); });

  function togglePause() {
    if (!playing || !g || g.over) return;
    paused = !paused;
    $('pauseBox').hidden = !paused;
    if (paused && g) { const left = CFG.surrender.after - g.t; $('surBtn').disabled = left > 0; $('surBtn').textContent = left > 0 ? '🏳️ ยอมแพ้ (ได้หลังนาทีที่ ' + Math.floor(CFG.surrender.after / 60) + ')' : '🏳️ โหวตยอมแพ้'; $('surMsg').textContent = ''; }
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
  let wasDead = false;
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
    autoBuy(pl); renderQuick(pl);
    if (shopOpen) renderShop(false);
    const dead = !!pl.dead;
    if (wasDead && !dead) TR.Render.clearCam();
    wasDead = dead; $('specHint').hidden = !dead;
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
  $('surBtn').addEventListener('click', function () {
    if (!g) return;
    const r = TR.Sim.callSurrender(g, g.player.team);
    $('surMsg').textContent = r.msg;
    if (r.passed) { paused = false; $('pauseBox').hidden = true; lastTs = performance.now(); handleEvents(); }
  });
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
