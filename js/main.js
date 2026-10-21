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
    if (room && !online && roomBanned(id)) { toast('ฮีโร่ตัวนี้ถูกแบน'); return; }
    sel.hero = id;
    const h = TR.HERO_BY_ID[id];
    if (!sel.emblem || !sel.emblemTouched) sel.emblem = bestEmblem(id);
    lobbySync();
    Array.prototype.forEach.call($('heroGrid').children, function (c) { c.classList.toggle('sel', c.dataset.id === id); });
    const info = $('heroInfo');
    info.innerHTML = '';
    function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
    info.appendChild(el('h2', '', h.name));
    info.appendChild(el('div', 'tags', 'ยุค' + TR.ERAS[h.era].name + ' · ' + TR.ROLES[h.role].name + ' · ยุครุ่งเรือง +' + Math.round((CFG.peak - 1) * 100) + '% ตอนยุคของตัวเอง'));
    if (h.passive) info.appendChild(el('div', 'sk', '<b>✨ พลังติดตัว · ' + h.passive.name + '</b> — ' + h.passive.desc));
    info.appendChild(el('div', 'sw', '<b class="g">จุดแข็ง</b> ' + h.strength + '<br><b class="w">จุดอ่อน</b> ' + h.weakness));
    h.skills.forEach(function (s, i) {
      info.appendChild(el('div', 'sk', '<b>' + (i === 2 ? 'อัลติ' : 'สกิล ' + (i + 1)) + ' · ' + s.name + '</b> (' + s.cd + ' วิ) — ' + s.desc));
    });
    buildEmblems(); buildSpells(); buildLanes(); rmBuild();
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
  function twinGrids(ids, mk) {   // วาดปุ่มลงทั้งตารางหน้าเมนูและตารางในห้องออนไลน์ให้ตรงกัน
    ids.forEach(function (id) { const grid = $(id); grid.innerHTML = ''; mk(grid); });
  }
  function buildLanes() {
    twinGrids(['laneGrid', 'rmLane'], function (grid) {
      LANES.forEach(function (l) {
        const b = document.createElement('button'); b.className = sel.lane === l[0] ? 'sel' : '';
        b.innerHTML = '<span class="ic">' + l[1] + '</span>' + l[2];
        b.addEventListener('click', function () { sel.lane = l[0]; try { localStorage.setItem('tr_lane', String(l[0])); } catch (e) { /* ไม่เป็นไร */ } buildLanes(); lobbySync(); });
        grid.appendChild(b);
      });
    });
  }
  function buildSpells() {
    twinGrids(['spellGrid', 'rmSpell'], function (grid) {
      TR.SPELLS.forEach(function (sp) {
        const b = document.createElement('button');
        b.className = (grid.id === 'spellGrid' ? 'spbtn' : '') + (sel.spell === sp.id ? ' sel' : '');
        b.innerHTML = '<span class="ic">' + sp.icon + '</span>' + sp.name; b.title = sp.desc;
        b.addEventListener('click', function () { sel.spell = sp.id; try { localStorage.setItem('tr_spell', sp.id); } catch (e) { /* ไม่เป็นไร */ } buildSpells(); lobbySync(); });
        grid.appendChild(b);
      });
    });
    const sp = TR.SPELL_BY_ID[sel.spell];
    $('spellInfo').innerHTML = '<b>' + sp.icon + ' ' + sp.name + '</b> · คูลดาวน์ ' + sp.cd + ' วิ<br>' + sp.desc;
  }
  function buildEmblems() {
    const fit = TR.FIT[sel.hero];
    twinGrids(['emblemGrid', 'rmEmblem'], function (grid) {
      TR.EMBLEM_ORDER.forEach(function (k, i) {
        const em = TR.EMBLEMS[k];
        const b = document.createElement('button');
        const full = grid.id === 'emblemGrid';
        b.className = (full ? 'ebtn' : '') + (sel.emblem === k ? ' sel' : '');
        b.style.borderColor = sel.emblem === k ? em.color : '';
        b.innerHTML = full ? '<div class="en" style="color:' + em.color + '">' + em.name + '</div><div class="ef fit-' + fit[i] + '">เหมาะ: ' + TR.FIT_LABEL[fit[i]] + '</div>'
          : '<span style="color:' + em.color + '">' + em.name + '</span> <small class="fit-' + fit[i] + '">' + TR.FIT_LABEL[fit[i]] + '</small>';
        b.addEventListener('click', function () { sel.emblem = k; sel.emblemTouched = true; buildEmblems(); lobbySync(); });
        grid.appendChild(b);
      });
    });
    const em = TR.EMBLEMS[sel.emblem];
    $('emblemInfo').innerHTML = '<b>' + em.name + '</b> · ' + em.stat + ' · ราคา: ' + em.cost + '<br>พลังแฝง: ' + em.latent;
  }

  /* ---------- เริ่ม/จบเกม ---------- */
  /* โหมดกราฟิก: '3d' = กล้องเอียง+โมเดล poly (ค่าเริ่มต้น) / '2d' = มุมบนตรงแบบเดิม ใช้ตุ๊กตา 2D เบากว่า */
  let gfx = '3d', autoMul = 1, noAutoUntil = 0;
  function applyQuality() {   // ระดับภาพ: auto = เริ่ม 1.5x บนจอสัมผัส แล้วลดเองถ้าเครื่องหน่วง · high 2x · mid 1.25x · low 1x×0.75
    const touch = !(window.matchMedia && matchMedia('(pointer:fine)').matches), m = ctl.gq || 'auto';
    if (m === 'high') TR.Render.setQuality(2, 1, 2.6e6);
    else if (m === 'mid') TR.Render.setQuality(1.25, 1, 1.6e6);
    else if (m === 'low') TR.Render.setQuality(1, 0.75, 0.9e6);
    else TR.Render.setQuality(touch ? 1.5 : 2, autoMul, touch ? 1.5e6 : 2.6e6);
  }
  try { if (localStorage.getItem('tr_gfx') === '2d') gfx = '2d'; } catch (e) { /* ไม่เป็นไร */ }
  function fit() { applyQuality(); TR.Render.resize(canvas, window.innerWidth, window.innerHeight); }
  function applyGfx(mode, save) {
    gfx = mode === '2d' ? '2d' : '3d';
    TR.Render.setTilt(gfx === '3d' ? 0.74 : 1); TR.Render.setMode3d(gfx === '3d');
    if (gfx === '3d' && !TR.Render.is3d()) gfx = '2d';
    $('gfxMode').textContent = gfx === '3d' ? '3D' : '2D คลาสสิก'; if ($('gfxMode2')) $('gfxMode2').textContent = $('gfxMode').textContent;
    if (save) { try { localStorage.setItem('tr_gfx', gfx); } catch (e) { /* ไม่เป็นไร */ } }
    fit(); slowN = 0; ftEma = 0; if (save) noAutoUntil = performance.now() + 90000;   // สลับเองแล้ว 90 วินาทีแรกไม่ให้ระบบอัตโนมัติสลับซ้ำ
  }
  let toastT = 0;
  function toast(msg) { const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(function () { t.hidden = true; }, 4200); }
  // ตรวจความลื่น: ถ้าเวลาวาดเฉลี่ยสูงต่อเนื่อง ~3 วินาที สลับเป็น 2D ให้เอง (ไม่บันทึกเป็นค่าถาวร)
  let ftEma = 0, slowN = 0;
  function watchPerf(ms) {
    ftEma = ftEma ? ftEma * 0.9 + ms * 0.1 : ms;
    if (ftEma <= 24 || performance.now() < noAutoUntil) { slowN = 0; return; }
    if (++slowN <= 90) return;
    slowN = 0; ftEma = 0;
    if ((ctl.gq || 'auto') === 'auto' && autoMul > 0.55) {   // ขั้นแรก: ลดความละเอียดภาพก่อน (เห็นต่างเล็กน้อยแต่เบาขึ้นมาก)
      autoMul = Math.max(0.5, autoMul * 0.8); fit(); toast('เครื่องดูหนัก — ลดความละเอียดภาพให้อัตโนมัติ (ปรับได้ที่ตั้งค่า → คุณภาพภาพ)');
    } else if (gfx === '3d') {
      applyGfx('2d', false); toast('ยังหนักอยู่ — สลับเป็น 2D ให้อัตโนมัติ · สลับกลับได้ที่ปุ่มหยุดเกม → กราฟิก');
    }
  }

  /* ---------- ตั้งค่าการควบคุม (เก็บในเครื่อง) ---------- */
  const CTL_DEF = { atkMode: 'button', prio: 'near', dragAim: true, mouseAim: !!(window.matchMedia && matchMedia('(pointer:fine)').matches), autoSkill: false, size: 1, autoBuy: true, gq: 'auto', mini: 1, sfx: 1, music: 0.6, voice: true };
  let ctl = Object.assign({}, CTL_DEF);
  try { const sv = JSON.parse(localStorage.getItem('tr_ctl') || 'null'); if (sv) Object.keys(CTL_DEF).forEach(function (k) { if (sv[k] !== undefined) ctl[k] = sv[k]; }); } catch (e) { /* ไม่เป็นไร */ }
  const CTL_ROWS = [
    { k: 'atkMode', t: 'โหมดตีปกติ', opts: [['button', 'กดปุ่มโจมตี'], ['auto', 'ตีอัตโนมัติ']], d: 'กดปุ่ม ⚔️ หรือ Space ถึงจะตี กดค้างตีต่อเนื่อง แตะครั้งเดียวตี 1 ครั้ง' },
    { k: 'prio', t: 'เป้าหมายที่ตีก่อน', opts: [['near', 'ใกล้สุด'], ['lowhp', 'เลือดน้อยสุด'], ['hero', 'ฮีโร่ก่อน']], d: 'ใช้กับการตีปกติ ปุ่มเล็ก 🗡️ สั่งตีลูกกระจ๊อก (เลือดน้อยก่อน) ส่วน 🏯 สั่งตีป้อม' },
    { k: 'dragAim', t: 'การเล็งสกิล', opts: [[true, 'แตะ = ออโต้ / ลาก = เล็ง'], [false, 'แตะอย่างเดียว (ออโต้)']], d: 'ลากนิ้วออกจากปุ่มสกิลเพื่อเล็งทิศหรือจุด ปล่อยเพื่อใช้ ลากไกลสุดเพื่อยกเลิก' },
    { k: 'mouseAim', t: 'เมาส์เล็งสกิล (คอมพิวเตอร์)', opts: [[true, 'เปิด'], [false, 'ปิด']], d: 'กด Q/E/R แล้วสกิลพุ่งไปทางเมาส์ ปิดไว้จะเล็งเป้าใกล้สุดให้เอง' },
    { k: 'autoSkill', t: 'อัปเลเวลสกิลอัตโนมัติ', opts: [[false, 'เลือกเอง'], [true, 'อัตโนมัติ']], d: 'เลเวลขึ้นได้แต้มสกิล 1 แต้ม กดลูกศร ▲ บนปุ่มสกิลเพื่ออัป' },
    { k: 'autoBuy', t: 'ซื้อไอเทมตามเซ็ตอัตโนมัติ', opts: [[true, 'เปิด'], [false, 'ปิด']], d: 'ตอนอยู่ที่ฐานหรือตอนตาย ระบบซื้อไอเทมในเซ็ตของคุณให้ตามลำดับเมื่อเงินพอ (จัดเซ็ตได้ในร้านค้า) ปิดไว้จะซื้อเองหรือแตะไอเทมแนะนำด้านซ้ายจอ' },
    { k: 'mini', t: 'ขนาดมินิแมพ', opts: [[0.8, 'เล็ก'], [1, 'กลาง'], [1.3, 'ใหญ่']], d: 'แตะหรือลากบนมินิแมพเพื่อแอบดูจุดอื่น (ปล่อยแล้วกลับมาที่ตัวเอง) ตอนตายจะค้างตำแหน่งไว้ให้' },
    { k: 'sfx', t: 'เสียงเอฟเฟกต์', opts: [[0, 'ปิด'], [0.5, 'เบา'], [1, 'ปกติ']], d: '' },
    { k: 'music', t: 'เพลงประจำยุค', opts: [[0, 'ปิด'], [0.35, 'เบา'], [0.6, 'ปกติ'], [1, 'ดัง']], d: 'เพลงสร้างสดในเครื่อง เปลี่ยนทำนองตามยุคของแมตช์' },
    { k: 'voice', t: 'เสียงประกาศ (ฆ่าคนแรก/ฆ่าต่อเนื่อง)', opts: [[true, 'เปิด'], [false, 'ปิด']], d: 'ใช้เสียงพูดภาษาไทยของเบราว์เซอร์ ถ้าเครื่องไม่มีเสียงไทยจะใช้เสียงเอฟเฟกต์แทน' },
    { k: 'gq', t: 'คุณภาพภาพ', opts: [['auto', 'อัตโนมัติ'], ['high', 'คมชัด'], ['mid', 'สมดุล'], ['low', 'ประหยัด']], d: 'เครื่องหน่วงให้ลองสมดุล/ประหยัด — ภาพเบาลงมาก · อัตโนมัติจะลดความละเอียดเองเมื่อเครื่องหน่วง ก่อนสลับเป็น 2D' },
    { k: 'size', t: 'ขนาดปุ่ม', opts: [[0.85, 'เล็ก'], [1, 'กลาง'], [1.18, 'ใหญ่']], d: '' }
  ];
  function saveCtl() { try { localStorage.setItem('tr_ctl', JSON.stringify(ctl)); } catch (e) { /* ไม่เป็นไร */ } }
  function applyCtl() {
    if (typeof autoMul !== 'undefined' && TR.Render.resize && canvas.width) { autoMul = ctl.gq === 'auto' ? autoMul : 1; fit(); }
    if (g && g.player) act({ k: 'set', atkMode: ctl.atkMode, prio: ctl.prio, autoSkill: !!ctl.autoSkill });
    layoutCtl(); layoutMini();
    TR.Audio.setVol({ sfx: ctl.sfx, music: ctl.music, voice: ctl.voice });
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
  document.addEventListener('pointerdown', function (e) { if (e.target.closest && e.target.closest('button') && TR.Audio.ready()) TR.Audio.play('ping'); }, true);

  /* ---------- จัดวางปุ่ม: ปุ่มโจมตีใหญ่มุมขวาล่าง สกิลเรียงโค้งรอบปุ่ม ---------- */
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
    set($('wdBtn'), spX + 2 * (SP + 8 * f), M + SP / 2, SP);
    itPos = { x: spX, y: M + SP + 10 * f + SP / 2, size: SP, step: SP + 8 * f };
    layoutItems();
  }
  // ไอเทมใช้งาน: ปุ่มซ้อนอยู่เหนือปุ่มสเปล/กลับพระนคร
  var itPos, IT_KEYS = ['KeyG', 'KeyH', 'KeyT', 'KeyY', 'KeyB', 'KeyN'], IT_LBL = ['G', 'H', 'T', 'Y', 'B', 'N'];
  function layoutItems() {
    if (!itPos) return;
    const bs = $('itBox').children;
    for (let i = 0; i < bs.length; i++) { const b = bs[i], size = itPos.size; b.style.width = b.style.height = size + 'px'; b.style.right = (itPos.x + i * itPos.step - size / 2) + 'px'; b.style.bottom = (itPos.y - size / 2) + 'px'; }
  }
  function syncItems(pl) {
    const ids = TR.Sim.itemActives(pl), key = ids.join(',');
    const box = $('itBox');
    if (box.dataset.k !== key) {
      box.dataset.k = key; box.innerHTML = '';
      ids.forEach(function (id, i) {
        const fx = TR.ITEM_FX[id], b = document.createElement('button');
        b.className = 'spb itb'; b.setAttribute('aria-label', fx.active); b.dataset.id = id;
        b.innerHTML = '<span class="ic">' + fx.icon + '</span><span class="nm">' + fx.active + '</span><span class="key">' + IT_LBL[i] + '</span><span class="cd"></span>';
        b.addEventListener('pointerdown', function (e) { e.preventDefault(); useItemKey(i); });
        box.appendChild(b);
      });
      layoutItems();
    }
    const bs = box.children;
    for (let i = 0; i < bs.length; i++) {
      const left = TR.Sim.itemCdLeft(g, pl, bs[i].dataset.id);
      bs[i].classList.toggle('wait', left > 0 || pl.dead); bs[i].querySelector('.cd').textContent = left > 0 ? Math.ceil(left) : '';
    }
  }
  function useItemKey(i) {
    if (!g || !playing || paused) return;
    const ids = TR.Sim.itemActives(g.player); if (ids[i]) act({ k: 'item', id: ids[i] });
  }
  window.addEventListener('resize', function () { layoutCtl(); layoutMini(); });
  function layoutMini() {
    const base = Math.round((window.innerHeight <= 460 ? 150 : 214) * ctl.mini), rs = 'max(10px, env(safe-area-inset-right))';
    mini.style.width = base + 'px'; mini.style.height = Math.round(base * 0.375) + 'px';
    mini.width = base * 2; mini.height = Math.round(base * 0.75);
    $('pauseBtn').style.right = 'calc(' + rs + ' + ' + (base + 10) + 'px)'; $('shopBtn').style.right = 'calc(' + rs + ' + ' + (base + 50) + 'px)';
    $('boardBtn').style.right = 'calc(' + rs + ' + ' + (base + 130) + 'px)'; $('chatBtn').style.right = 'calc(' + rs + ' + ' + (base + 90) + 'px)'; $('chatPanel').style.right = 'calc(' + rs + ' + ' + (base + 10) + 'px)';
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
  // ส่วนแชตข้อความ (เฉพาะออนไลน์): วลีด่วน + ช่องพิมพ์ (ส่งหาทีม/ทุกคน)
  function buildChatOnline() {
    const box = $('chatPanel'), w = document.createElement('div'); w.id = 'chatOnline';
    w.innerHTML = '<div id="chatLog"></div><div id="chatQuick"></div><div id="chatIn"><input id="chatTx" maxlength="80" placeholder="พิมพ์แล้วกด Enter = ส่งทีม" autocomplete="off"><button id="chatTeam" class="ghost">ทีม</button><button id="chatAll" class="ghost">ทุกคน</button></div>';
    box.appendChild(w);
    ['ช่วยด้วย!', 'ขอบคุณ', 'เก่งมาก', 'ไปตีมังกร', 'GG'].forEach(function (t) { const b = document.createElement('button'); b.textContent = t; b.addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); chatSend(t, 'team'); }); $('chatQuick').appendChild(b); });
    const go = function (to) { const i = $('chatTx'); chatSend(i.value, to); i.value = ''; };
    $('chatTeam').addEventListener('click', function () { go('team'); }); $('chatAll').addEventListener('click', function () { go('all'); });
    $('chatTx').addEventListener('keydown', function (e) { e.stopPropagation(); if (e.key === 'Enter') go('team'); else if (e.key === 'Escape') { e.target.blur(); $('chatPanel').hidden = true; } });
    $('chatTx').addEventListener('keyup', function (e) { e.stopPropagation(); });
  }
  function sendSignal(id) {
    if (!g || !playing || paused) return;
    const pt = TR.Render.camPoint(g);
    act({ k: 'sig', type: id, x: pt.x, y: pt.y });
    feed('คุณ: ' + TR.SIGNALS[id].icon + ' ' + TR.SIGNALS[id].name, g.player.team);
    $('chatPanel').hidden = true;
  }
  $('chatBtn').addEventListener('pointerdown', function (e) { e.preventDefault(); if (!g || !playing) return; $('chatPanel').hidden = !$('chatPanel').hidden; $('chatOnline').classList.toggle('on', !!online); });
  buildChat(); buildChatOnline();
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
    act({ k: 'atk', on: !!on, type: type });
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

  /* ---------- รายละเอียดสกิลตอนกดค้าง/เอาเมาส์ชี้: ชนิดดาเมจ ตัวเลขจริงตามค่าสถานะและเลเวลสกิล ---------- */
  const FXN = { counter: 'สวนกลับ', dash: 'พุ่งชน', shot: 'กระสุน', trap: 'กับดัก', cone: 'ลูกแฉก', nova: 'คลื่นรอบตัว', blast: 'ระเบิดพื้นที่', zone: 'พื้นที่ต่อเนื่อง', combo: 'ชุดต่อเนื่อง', strike: 'พุ่งฟัน', chain: 'ลูกโซ่' };
  function skMulAt(slot, lv) { return slot < 2 ? CFG.skillBase + CFG.skillStep * lv : CFG.ultBase + CFG.ultStep * lv; }
  function skillTipHtml(pl, i) {
    const def = pl.def, s = def.skills[i], lv = pl.sl[i], maxLv = 3, shown = Math.max(1, lv);
    const mag = !!def.skillMag, pw = (pl.dmgBase || 1) * (pl.m ? pl.m.dmg : 1);
    const cd = s.cd * (1 - CFG.skillCd * (shown - 1)) * (1 - Math.min(CFG.cdrCap, pl.itm ? pl.itm.cdr : 0));
    const spec = TR.Sim.skillAim(s);
    const val = function (d, l) { return Math.round(d * pw * skMulAt(i, l)); };
    let rows = '', anyDmg = false;
    s.fx.forEach(function (f) {
      const nm = FXN[f.k] || '', parts = [];
      if (f.dmg) {
        anyDmg = true;
        const hits = f.n && (f.k === 'cone' || f.k === 'combo' || f.k === 'chain') ? ' × ' + f.n + (f.k === 'cone' ? ' ดอก' : ' ครั้ง') : '';
        const tick = f.tick ? ' ทุก ' + f.tick + ' วิ' : '';
        parts.push('<b class="dm ' + (mag ? 'mg' : 'ph') + '">' + val(f.dmg, shown) + '</b>' + hits + tick + (lv < maxLv ? ' <small>(เลเวลสูงสุด ' + val(f.dmg, maxLv) + ')</small>' : ''));
      }
      if (f.reduce) parts.push('ลดดาเมจที่โดน ' + Math.round(f.reduce * 100) + '%');
      if (f.stun) parts.push('สตัน ' + f.stun + ' วิ'); if (f.root) parts.push('ตรึง ' + f.root + ' วิ'); if (f.blind) parts.push('ตาบอด');
      if (f.slow) parts.push(Array.isArray(f.slow) ? 'ชะลอ ' + Math.round(f.slow[0] * 100) + '% นาน ' + f.slow[1] + ' วิ' : 'ชะลอ ' + Math.round(f.slow * 100) + '%');
      if (f.pct && f.k === 'heal') parts.push('ฟื้นเลือด ' + Math.round(f.pct * 100) + '% ของเลือดสูงสุด' + (f.hot ? ' ต่อเนื่อง ' + f.hot + ' วิ' : '') + (f.who === 'lowest' ? ' (เพื่อนเลือดน้อยสุดในระยะ)' : ''));
      if (f.heal) parts.push('ฟื้นเลือดผู้ที่อยู่ในพื้นที่');
      if (f.lifesteal) parts.push('ดูดเลือด ' + Math.round(f.lifesteal * 100) + '%'); if (f.ccImmune) parts.push('กันสถานะคุม');
      if (f.dmgMul) parts.push('ดาเมจ +' + Math.round((f.dmgMul - 1) * 100) + '%'); if (f.speedMul) parts.push('วิ่ง ' + (f.speedMul >= 1 ? '+' : '') + Math.round((f.speedMul - 1) * 100) + '%');
      if (f.armorAdd) parts.push('เกราะ +' + Math.round(f.armorAdd * 100) + '%'); if (f.stealth) parts.push('ล่องหน');
      if (f.dur && f.k !== 'zone') parts.push('นาน ' + f.dur + ' วิ'); if (f.k === 'zone' && f.dur) parts.push('คงอยู่ ' + f.dur + ' วิ');
      if (f.execBelow) parts.push('ปิดจ๊อบเป้าเลือดต่ำกว่า ' + Math.round(f.execBelow * 100) + '% (ดาเมจ ×' + (f.execMul || 1) + ')');
      if (f.rootedMul) parts.push('ใส่เป้าที่ถูกตรึง ×' + f.rootedMul); if (f.mark || f.k === 'mark') parts.push('ติดเป้าหมาย');
      if (f.k === 'taunt') parts.push('ยั่วให้ศัตรูหันมาตี');
      if (parts.length) rows += '<div class="tr"><span class="tk">' + (nm || '•') + '</span><span>' + parts.join(' · ') + '</span></div>';
    });
    const typ = anyDmg ? (mag ? '<span class="chip mg">🔮 ดาเมจเวทมนตร์ · ลดด้วยค่าต้านเวทของเป้า</span>' : '<span class="chip ph">⚔️ ดาเมจกายภาพ · ลดด้วยเกราะของเป้า</span>') : '<span class="chip">✨ สกิลเสริม/ไม่ทำดาเมจ</span>';
    const rng = spec.range ? 'ระยะ ' + Math.round(spec.range) + (spec.r ? ' · รัศมี ' + Math.round(spec.r) : '') : (spec.r ? 'รัศมี ' + Math.round(spec.r) : 'ใช้กับตัวเอง');
    return '<div class="th"><b>' + esc(s.name) + '</b> <small>' + SK_KEYS[i] + ' · ' + (lv ? 'เลเวล ' + lv + '/' + maxLv : 'ยังไม่ได้เรียน (แสดงค่าเลเวล 1)') + '</small></div>'
      + '<div class="tc">' + typ + ' <span class="chip">⏱ คูลดาวน์ ' + cd.toFixed(1) + ' วิ</span> <span class="chip">📏 ' + rng + '</span></div>'
      + '<div class="td">' + esc(s.desc) + '</div>' + (rows ? '<div class="tb">' + rows + '</div>' : '')
      + (anyDmg ? '<div class="tn">ตัวเลขคำนวณจากพลังโจมตีตอนนี้ของคุณ (เลเวล ' + pl.level + ' + ไอเทม) ก่อนหักเกราะ/ต้านเวทของเป้า</div>' : '');
  }
  const skTip = $('skTip');
  function skTipShow(b, i) { if (!g || !g.player) return; skTip.innerHTML = skillTipHtml(g.player, i); skTip.hidden = false; const r = b.getBoundingClientRect(); skTip.style.left = Math.max(8, Math.min(window.innerWidth - skTip.offsetWidth - 8, r.right - skTip.offsetWidth)) + 'px'; skTip.style.top = Math.max(8, r.top - skTip.offsetHeight - 10) + 'px'; }
  function skTipHide() { skTip.hidden = true; }
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
      b.querySelector('.up').addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); if (g) act({ k: 'up', i: i }); });
      b.addEventListener('pointerdown', function (e) {
        if (e.target.classList.contains('up')) return;
        e.preventDefault(); if (!g || !playing || paused) return;
        try { b.setPointerCapture(e.pointerId); } catch (x) { /* ไม่เป็นไร */ }
        const r = b.getBoundingClientRect();
        drag = { id: e.pointerId, cx: r.left + r.width / 2, cy: r.top + r.height / 2, on: false };
        clearTimeout(drag.tt); drag.tt = setTimeout(function () { skTipShow(b, i); }, 230);   // กดค้าง: ขึ้นรายละเอียดสกิล
        if (aimSpec.type === 'self' || !ctl.dragAim) { queue.push({ slot: i }); drag.done = true; }
      });
      b.addEventListener('pointermove', function (e) {
        if (!drag || drag.done || e.pointerId !== drag.id) return;
        const vx = e.clientX - drag.cx, vy = e.clientY - drag.cy, len = Math.hypot(vx, vy);
        if (len < AIM_PX) { drag.on = false; TR.Render.setAim(null); b.classList.remove('aiming'); return; }
        if (!drag.on) { clearTimeout(drag.tt); skTipHide(); }   // เริ่มลากเล็ง: ซ่อนรายละเอียดสกิลไม่ให้บังการเล็ง
        drag.on = true; b.classList.add('aiming');
        const d = [vx, vy / K()], dl = Math.hypot(d[0], d[1]) || 1;
        // ลากแล้วตำแหน่งตามนิ้ว: สกิลพื้นที่/พุ่ง ใช้ระยะจริงในโลกคูณซูมจอ (ระยะไกลลากไกลขึ้น) ไม่ใช่จอยสติกคงที่ — ปล่อยใกล้ปุ่ม = ยกเลิก
        const area = aimSpec.type === 'point' || aimSpec.type === 'line';
        const pxFull = area ? Math.max(70, Math.min(200, aimSpec.range * TR.Render.zoomCss(canvas) * 0.62)) : FULL_PX;
        drag.aim = { dx: d[0] / dl, dy: d[1] / dl, k: Math.max(area ? 0.06 : 0.2, Math.min(1, len / pxFull)) };
        drag.cancel = len > Math.max(CANCEL_PX, pxFull * 1.8);
        TR.Render.setAim({ type: aimSpec.type, range: aimSpec.range, r: aimSpec.r, dx: drag.aim.dx, dy: drag.aim.dy, k: drag.aim.k, cancel: drag.cancel });
      });
      const end = function (e) {
        if (!drag || e.pointerId !== drag.id) return;
        TR.Render.setAim(null); b.classList.remove('aiming'); clearTimeout(drag.tt); skTipHide();
        if (!drag.done) { if (drag.on) { if (!drag.cancel) queue.push({ slot: i, aim: drag.aim }); } else queue.push({ slot: i }); }
        drag = null;
      };
      b.addEventListener('pointerup', end);
      b.addEventListener('pointercancel', function (e) { if (drag && e.pointerId === drag.id) { clearTimeout(drag.tt); skTipHide(); TR.Render.setAim(null); b.classList.remove('aiming'); drag = null; } });
      b.addEventListener('mouseenter', function () { if (window.matchMedia && matchMedia('(pointer:fine)').matches) skTipShow(b, i); });
      b.addEventListener('mouseleave', skTipHide);
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
    if (best) act({ k: 'lock', id: best.id });
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

  /* ---------- ชื่อผู้เล่น ---------- */
  const esc = function (t) { return String(t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  const cleanName = function (t) { return String(t || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 14); };
  let myName = '';
  try { myName = cleanName(localStorage.getItem('tr_name')); } catch (e) { /* ไม่เป็นไร */ }
  // ชื่อที่แสดง: ผู้เล่นที่ตั้งชื่อไว้ = "ชื่อ · ฮีโร่" ตัวอื่น = ชื่อฮีโร่
  function pn(u) { return u.isPlayer && u.pname ? esc(u.pname) + ' · ' + esc(u.def.name) : esc(u.def.name); }

  /* ---------- หน้าโหลด (ใช้ตอนรอเชื่อมต่อออนไลน์/เซิร์ฟเวอร์ตื่น) ---------- */
  const TIPS = ['ยืนในพุ่มไม้เพื่อซ่อนตัว ศัตรูจะมองไม่เห็นจนกว่าจะเข้าใกล้ ตีหรือใช้สกิลจะเผยตัวชั่วครู่', 'ตะเกียงส่องทาง 🏮 (กด N) ช่วยให้เห็นศัตรูที่แอบในพุ่ม วางที่พุ่มกลางแมพก่อนปะทะ', 'ตีป้อมโดยไม่มีลูกกระจ๊อกช่วยดัน ดาเมจจะเบาลงมาก พาลูกกระจ๊อกไปด้วยเสมอ', 'ตายแล้วดูสรุปความตายที่มุมซ้าย ถ้าโดนเวทเยอะให้ซื้อสายต้านเวท', 'ทุกยุคป้อมจะเปลี่ยนไป ฮีโร่ของยุคนั้นจะแข็งขึ้น วางแผนรอบเปลี่ยนยุค', 'กด Tab ค้างเพื่อดูตารางคะแนนและไอเทมของทุกคน', 'ไอเทมชั้น 3 บางชิ้นกดใช้ได้ (G/H/T/Y) ใช้ให้ถูกจังหวะพลิกเกมได้'];
  const Loading = {
    order: [], idx: 0, flip: 0, ti: null,
    img: function (id) { return 'img/hero_' + id + '.jpg'; },
    slide: function () {
      if (!Loading.order.length) Loading.order = TR.HEROES.map(function (h) { return h.id; }).sort(function () { return Math.random() - 0.5; });
      const id = Loading.order[Loading.idx++ % Loading.order.length], h = TR.HERO_BY_ID[id];
      const on = $(Loading.flip ? 'ldA' : 'ldB'), off = $(Loading.flip ? 'ldB' : 'ldA'); Loading.flip ^= 1;
      const im = new Image();
      im.onload = function () {
        on.style.backgroundImage = 'url(' + im.src + ')'; on.classList.remove('on'); void on.offsetWidth; on.classList.add('on'); off.classList.remove('on');
        $('ldEra').textContent = 'ยุค' + TR.ERAS[h.era].name + ' · ' + TR.ROLES[h.role].name; $('ldName').textContent = h.name;
        $('ldPas').textContent = h.passive ? '✨ ' + h.passive.name + ' — ' + h.passive.desc : '';
      };
      im.src = Loading.img(id);
    },
    show: function (msg, pct) {
      $('loading').hidden = false; Loading.set(msg, pct);
      const tip = function () { $('ldTip').textContent = '💡 ' + TIPS[Math.floor(Math.random() * TIPS.length)]; };
      tip(); Loading.slide(); clearInterval(Loading.ti);
      Loading.ti = setInterval(function () { Loading.slide(); tip(); }, 4200);
    },
    set: function (msg, pct) { if (msg != null) $('ldMsg').textContent = msg; if (pct != null) $('ldBar').style.width = Math.max(0, Math.min(100, pct)) + '%'; },
    hide: function () { clearInterval(Loading.ti); $('loading').hidden = true; }
  };
  TR.Loading = Loading;

  /* ---------- หน้าปกเกม: แตะเพื่อเริ่ม + ตั้งชื่อ ---------- */
  const titleCv = $('titleCv'), titleCtx = titleCv.getContext('2d');
  let titleOn = true, titleT0 = 0, embers = [];
  const rnd = Math.random;
  function mkEmber(w, h, fresh) { return { x: rnd() * w, y: fresh ? h + 10 : rnd() * h, vy: 12 + rnd() * 46, vx: (rnd() - 0.5) * 14, r: 0.6 + rnd() * 2.1, ph: rnd() * 6.28, a: 0.25 + rnd() * 0.7 }; }
  // หน้าปก: พื้นดำ แสงทอง ควันหมอก ลำแสงหมุนช้า ประกายลอยขึ้น เส้นแฟลร์พาดผ่านโลโก้ตอนเปิดตัว
  function drawTitle(ts) {
    if (!titleOn) return;
    requestAnimationFrame(drawTitle);
    const dpr = Math.min(2, window.devicePixelRatio || 1), w = window.innerWidth, h = window.innerHeight, c = titleCtx;
    if (titleCv.width !== Math.round(w * dpr) || titleCv.height !== Math.round(h * dpr)) { titleCv.width = Math.round(w * dpr); titleCv.height = Math.round(h * dpr); embers = []; }
    if (!titleT0) titleT0 = ts;
    const t = (ts - titleT0) / 1000, fade = Math.min(1, t / 1.4);
    if (!embers.length) for (let i = 0; i < Math.round(Math.min(90, w * h / 9000)); i++) embers.push(mkEmber(w, h, false));
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.fillStyle = '#03050a'; c.fillRect(0, 0, w, h);
    const lr = $('ttLogo').getBoundingClientRect(), cx = w / 2, cy = lr.height ? lr.top + lr.height / 2 : h * 0.4;   // ศูนย์กลางแสงอยู่ที่โลโก้
    c.globalCompositeOperation = 'lighter';
    // แสงทองกลางจอ
    const gl = c.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.55); const pulse = 0.85 + Math.sin(t * 1.3) * 0.15;
    gl.addColorStop(0, 'rgba(255,170,60,' + (0.22 * fade * pulse) + ')'); gl.addColorStop(0.35, 'rgba(120,70,20,' + (0.12 * fade) + ')'); gl.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = gl; c.fillRect(0, 0, w, h);
    // ลำแสงหมุนช้า
    c.save(); c.translate(cx, cy);
    for (let i = 0; i < 9; i++) {
      const a = t * 0.05 + i * (Math.PI * 2 / 9), L = Math.max(w, h) * 0.9, wd = 0.07 + 0.03 * Math.sin(t * 0.7 + i);
      const g2 = c.createLinearGradient(0, 0, Math.cos(a) * L, Math.sin(a) * L); g2.addColorStop(0, 'rgba(255,200,110,' + (0.10 * fade) + ')'); g2.addColorStop(1, 'rgba(255,200,110,0)');
      c.fillStyle = g2; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a - wd) * L, Math.sin(a - wd) * L); c.lineTo(Math.cos(a + wd) * L, Math.sin(a + wd) * L); c.fill();
    }
    c.restore();
    // หมอกลอย
    for (let i = 0; i < 4; i++) {
      const fx = ((t * (6 + i * 3) + i * w * 0.4) % (w * 1.6)) - w * 0.3, fy = h * (0.62 + i * 0.1), fr = w * 0.5;
      const fg = c.createRadialGradient(fx, fy, 0, fx, fy, fr); fg.addColorStop(0, 'rgba(70,90,130,' + (0.10 * fade) + ')'); fg.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = fg; c.fillRect(fx - fr, fy - fr, fr * 2, fr * 2);
    }
    // เส้นแฟลร์แนวนอนตอนเปิดตัวโลโก้ (t 0.9–2.6 วินาที)
    const ft = (t - 0.9) / 1.7;
    if (ft > 0 && ft < 1) {
      const k = Math.sin(ft * Math.PI), len = w * (0.15 + 0.85 * Math.min(1, ft * 1.6));
      const fg2 = c.createLinearGradient(cx - len, 0, cx + len, 0); fg2.addColorStop(0, 'rgba(255,220,150,0)'); fg2.addColorStop(0.5, 'rgba(255,240,200,' + (0.95 * k) + ')'); fg2.addColorStop(1, 'rgba(255,220,150,0)');
      c.fillStyle = fg2; c.fillRect(cx - len, cy - 1.5 - 5 * k, len * 2, 3 + 10 * k * 0);
      const sg = c.createRadialGradient(cx, cy, 0, cx, cy, 120 * k + 20); sg.addColorStop(0, 'rgba(255,245,215,' + (0.8 * k) + ')'); sg.addColorStop(1, 'rgba(255,200,100,0)'); c.fillStyle = sg; c.fillRect(cx - 200, cy - 200, 400, 400);
    }
    // ประกายทองลอยขึ้น
    for (const e of embers) {
      e.y -= e.vy * 0.016; e.x += e.vx * 0.016 + Math.sin(t * 0.8 + e.ph) * 0.25;
      if (e.y < -10) Object.assign(e, mkEmber(w, h, true));
      const tw = 0.55 + 0.45 * Math.sin(t * 2.2 + e.ph);
      c.fillStyle = 'rgba(255,196,90,' + (e.a * tw * fade) + ')'; c.beginPath(); c.arc(e.x, e.y, e.r, 0, 6.283); c.fill();
      c.fillStyle = 'rgba(255,150,40,' + (e.a * tw * fade * 0.18) + ')'; c.beginPath(); c.arc(e.x, e.y, e.r * 4, 0, 6.283); c.fill();
    }
    c.globalCompositeOperation = 'source-over';
    // ขอบมืด
    const vg = c.createRadialGradient(cx, h * 0.5, Math.min(w, h) * 0.35, cx, h * 0.5, Math.max(w, h) * 0.85); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.78)');
    c.fillStyle = vg; c.fillRect(0, 0, w, h);
  }
  // เริ่มโชว์หน้าปกพร้อมเสียง: ถ้าเบราว์เซอร์ยังไม่อนุญาตเสียง จะมีหน้าดำให้แตะก่อน (การแตะนี้คือสิ่งที่ปลดล็อกเสียง)
  function titleGo(ts) {
    $('title').classList.remove('gated'); titleT0 = 0; embers = [];
    TR.Audio.setVol({ sfx: ctl.sfx, music: ctl.music, voice: ctl.voice });
    TR.Audio.titleStart();
  }
  function startTitle() {
    $('titleVer').textContent = TR.VERSION; $('nameIn').value = myName;
    requestAnimationFrame(drawTitle);
    TR.Net.wake();
    TR.Audio.init();
    if (TR.Audio.running()) titleGo();
    else {
      const g = function () { $('ttGate').removeEventListener('pointerdown', g); window.removeEventListener('keydown', g); TR.Audio.init(); TR.Audio.resume(); titleGo(); };
      $('ttGate').addEventListener('pointerdown', g); window.addEventListener('keydown', g);
      // ถ้าผู้เล่นปิดเสียงทั้งหมดไว้แล้ว ไม่ต้องมีหน้าดำ
      if (ctl.music <= 0 && ctl.sfx <= 0) titleGo();
    }
  }
  function leaveTitle() {
    const v = cleanName($('nameIn').value);
    if (!v) { const i = $('nameIn'); i.classList.remove('bad'); void i.offsetWidth; i.classList.add('bad'); i.focus(); return; }
    myName = v; try { localStorage.setItem('tr_name', v); } catch (e) { /* ไม่เป็นไร */ }
    titleOn = false; $('title').hidden = true;
    if (TR.Audio.init()) TR.Audio.play('ui');
    TR.Net.wake();
    let rc = ''; try { rc = (new URLSearchParams(location.search).get('room') || '').toUpperCase().slice(0, 4); } catch (e) { /* ไม่เป็นไร */ }
    if (rc.length === 4) { lobbyOpen(); $('lbCode').value = rc; $('lbJoin').click(); }   // เปิดจากลิงก์ชวนเพื่อน
    else rejoinSaved();   // ถ้าเพิ่งหลุด/รีเฟรชกลางเกมออนไลน์ ให้กลับเข้าห้องเดิมเอง
  }
  $('titleGo').addEventListener('click', leaveTitle);
  $('nameIn').addEventListener('keydown', function (e) { if (e.key === 'Enter') leaveTitle(); });
  $('nameIn').addEventListener('input', function () { this.classList.remove('bad'); });

  // ช่องทางเดียวที่ผู้เล่นสั่งงานเกม: ออฟไลน์ทำทันที (ออนไลน์จะส่งผ่านเครือข่ายแทน)
  let net = null, online = false, onWait = true, starve = 0, onBuf = 3, lastStarve = 0;
  function act(c) { return net ? net.send(c) : TR.Sim.exec(g, g.player, c); }
  let tutorial = false, banPick = [];
  const hn = function (id) { return TR.HERO_BY_ID[id].name; };
  const opt = { diff: 'normal', ban: false };
  try { const d = localStorage.getItem('tr_diff'); if (TR.DIFFS[d]) opt.diff = d; opt.ban = localStorage.getItem('tr_banmode') === '1'; } catch (e) { /* ไม่เป็นไร */ }
  function startGame() {
    online = false; net = null;
    beginGame({ playerHero: sel.hero, playerEmblem: sel.emblem, playerSpell: sel.spell, playerLane: sel.lane, playerName: myName, tutorial: tutorial, diff: tutorial ? 'normal' : opt.diff, playerBans: tutorial ? [] : banPick });
  }
  function beginGame(gopts) {
    if (endTimer) { clearTimeout(endTimer); endTimer = null; }
    g = TR.Sim.createGame(gopts);
    window.TRGame = g; lastIn = [0, 0]; onWait = true; starve = 0;
    acc = 0; paused = false; playing = true; queue.length = 0; shopOpen = false; $('shop').hidden = true; $('chatPanel').hidden = true;
    $('menu').hidden = true; $('result').hidden = true; $('pauseBox').hidden = true;
    $('hud').hidden = false; $('pauseBtn').style.display = 'block';
    $('feed').innerHTML = '';
    document.body.classList.add('playing');
    buildSkillButtons(g.player.def); applyCtl(); build = loadBuild(g.player); quickSig = ''; wasDead = false; TR.Render.clearCam();
    const spd = TR.SPELL_BY_ID[g.player.spell];
    $('spBtn').querySelector('.ic').textContent = spd.icon; $('spBtn').querySelector('.nm').textContent = spd.name; $('spBtn').classList.remove('img'); $('spBtn').style.backgroundImage = ''; setIcon($('spBtn'), 'sp_' + spd.id);
    const em = TR.EMBLEMS[g.player.emblem];
    $('meName').innerHTML = pn(g.player) + ' <span style="color:' + em.color + '">· ใจ' + em.name + '</span>';
    TR.Audio.init(); applyCtl(); TR.Audio.titleStop(1.2); TR.Audio.musicStart(0); TR.Audio.resume();
    tutStart();
    const bn = g.bans.me.concat(g.bans.bot).length ? ' · แบน: ' + g.bans.me.map(hn).join(', ') + (online ? ' (ฟ้า) ' : ' (เรา) ') + g.bans.bot.map(hn).join(', ') + (online ? ' (แดง)' : ' (ศัตรู)') : '';
    banner('ยุค' + TR.ERAS[0].name + ' เริ่มแล้ว', TR.ERAS[0].note + ' · ฮีโร่ยุคนี้แข็งขึ้น: ' + heroesOfEra(0) + bn, 4500);
    fit();
    lastTs = performance.now();
    showIntro();
  }

  /* ---------- เสียงจากซิม (ลดเสียงตามระยะ) ---------- */
  function drainSfx() {
    const A = TR.Audio, pl = g.player;
    for (const e of g.sfx) {
      let v = 1;
      if (!e.own) { const d = Math.hypot(e.x - pl.x, e.y - pl.y); if (d > 900) continue; v = 1 - d / 1000; }
      A.play(e.n, v);
    }
    g.sfx.length = 0;
  }

  /* ---------- โหมดสอนเล่น ---------- */
  const TUT = [
    { t: 'เดิน', x: 'ใช้ WASD/ลูกศร หรือจอยสติ๊กซ้ายล่าง เดินออกจากฐานไปทางเลนกลางสักหน่อย', ok: function (p) { return Math.hypot(p.x - 100, p.y - 600) > 450; } },
    { t: 'ตีปกติ', x: 'ไปหาลูกกระจ๊อกของศัตรู แล้วกดปุ่มโจมตี (Space) ปราบให้ได้ 1 ตัว (ลูกกระจ๊อกไว้ให้เก็บทอง)', ok: function (p) { return p.cs >= 1; } },
    { t: 'อัปสกิล', x: 'กดลูกศร ▲ บนปุ่มสกิลเพื่อเรียนสกิล (หรือเปิดอัปอัตโนมัติในตั้งค่า)', ok: function (p) { return p.sl[0] + p.sl[1] + p.sl[2] >= 1; } },
    { t: 'ใช้สกิล', x: 'กด Q / E หรือแตะปุ่มสกิล ใช้สกิลที่เรียนไว้ ลากนิ้วออกจากปุ่มเพื่อเล็งทิศ', ok: function (p) { return p.lastCast > 0; } },
    { t: 'พุ่มไม้', x: 'เดินเข้าพุ่มไม้ข้างเลน ศัตรูจะมองไม่เห็นคุณจนกว่าจะเข้าใกล้ (ตีหรือใช้สกิลแล้วจะเผยตัวชั่วครู่)', ok: function (p) { return p.bush >= 0; } },
    { t: 'กลับพระนคร', x: 'กดปุ่มกลับพระนคร (C) ยืนนิ่ง ๆ รอจนกลับฐาน (ถูกตีจะถูกยกเลิก)', ok: function (p, st) { if (p.recall) st.rc = true; return st.rc && !p.recall && Math.hypot(p.x - 100, p.y - 600) < 250; } },
    { t: 'ซื้อไอเทม', x: 'ตอนนี้คุณอยู่ที่ฐานแล้ว เปิดร้านค้า (B) ซื้อไอเทมสักชิ้น — ตอนเริ่มมีทอง 800 ให้ (ซื้อได้เฉพาะตอนอยู่ที่ฐานหรือตอนตาย)', ok: function (p) { return p.items.length >= 1; } },
    { t: 'โค่นป้อม', x: 'ไปกับลูกกระจ๊อกฝั่งเรา แล้วทำลายป้อมศัตรูแรกให้พัง ถ้าไม่มีลูกกระจ๊อกช่วยดัน ตีป้อมจะเจ็บน้อยมาก!', ok: function (p, st, gm) { return gm.units.some(function (u) { return u.type === 'tower' && u.team === 1 && u.dead && !u.king; }); } }
  ];
  let tutI = 0, tutSt = {};
  function tutStart() {
    $('tut').hidden = !tutorial; tutI = 0; tutSt = {};
    if (tutorial) tutShow();
  }
  function tutShow() {
    const s = TUT[tutI];
    $('tut').querySelector('.tt').textContent = 'บทเรียน ' + (tutI + 1) + '/' + TUT.length + ' · ' + s.t;
    $('tut').querySelector('.tx').textContent = s.x;
  }
  function tutTick(pl) {
    if (!g.tutorial || $('tut').hidden) return;
    $('tut').style.visibility = shopOpen ? 'hidden' : 'visible';
    if (TUT[tutI].ok(pl, tutSt, g)) {
      TR.Audio.play('levelup'); tutI++; tutSt = {};
      if (tutI >= TUT.length) { $('tut').querySelector('.tt').textContent = 'จบบทเรียนแล้ว 🎉'; $('tut').querySelector('.tx').textContent = 'พร้อมลงสนามจริง — กดพัก (P) แล้วกลับเมนูเพื่อเริ่มเกม 5v5'; setTimeout(function () { $('tut').hidden = true; }, 9000); }
      else tutShow();
    }
  }
  $('tutSkip').addEventListener('click', function () { $('tut').hidden = true; });

  /* ---------- สถิติสะสมข้ามเกม (เก็บในเครื่อง) ---------- */
  function loadProfile() {
    try { const p = JSON.parse(localStorage.getItem('tr_profile') || 'null'); if (p && p.heroes) return p; } catch (e) { /* ไม่เป็นไร */ }
    return { games: 0, wins: 0, kills: 0, deaths: 0, assists: 0, towers: 0, secs: 0, bestKills: 0, bestStreak: 0, heroes: {} };
  }
  function recordProfile(win) {
    try {
      const p = loadProfile(), pl = g.player, h = p.heroes[pl.def.id] || (p.heroes[pl.def.id] = { g: 0, w: 0, k: 0, d: 0, a: 0 });
      p.games++; if (win) p.wins++; p.kills += pl.kills; p.deaths += pl.deaths; p.assists += pl.assists; p.towers += pl.stTowers; p.secs += Math.round(g.t);
      p.bestKills = Math.max(p.bestKills, pl.kills);
      h.g++; if (win) h.w++; h.k += pl.kills; h.d += pl.deaths; h.a += pl.assists;
      localStorage.setItem('tr_profile', JSON.stringify(p));
    } catch (e) { /* ไม่เป็นไร */ }
  }
  function showProfile() {
    const p = loadProfile(), chip = function (v, l) { return '<div class="chip"><b>' + v + '</b>' + l + '</div>'; };
    const kda = p.deaths ? ((p.kills + p.assists) / p.deaths).toFixed(2) : (p.kills + p.assists);
    let html = '<div class="chips">' + chip(p.games, 'แมตช์') + chip(p.games ? Math.round(100 * p.wins / p.games) + '%' : '-', 'ชนะ') + chip(p.kills + ' / ' + p.deaths + ' / ' + p.assists, 'ฆ่า/ตาย/ช่วย') + chip(kda, 'KDA') + chip(p.towers, 'ป้อมที่พัง') + chip(p.bestKills, 'ฆ่าสูงสุดต่อเกม') + chip(Math.round(p.secs / 60), 'นาทีที่เล่น') + '</div>';
    const ids = Object.keys(p.heroes).sort(function (a, b) { return p.heroes[b].g - p.heroes[a].g; });
    if (ids.length) {
      html += '<table><tr><th>ฮีโร่</th><th>แมตช์</th><th>ชนะ</th><th>ฆ่า/ตาย/ช่วย</th></tr>';
      ids.forEach(function (id) { const h = p.heroes[id], d = TR.HERO_BY_ID[id]; if (!d) return; html += '<tr><td>' + d.name + '</td><td>' + h.g + '</td><td>' + Math.round(100 * h.w / h.g) + '%</td><td>' + h.k + ' / ' + h.d + ' / ' + h.a + '</td></tr>'; });
      html += '</table>';
    } else html += '<p style="color:var(--dim)">ยังไม่มีสถิติ — เล่นแมตช์แรกเลย (โหมดสอนเล่นไม่นับ)</p>';
    $('profBody').innerHTML = html; $('profSet').hidden = false;
  }
  $('profBtn').addEventListener('click', showProfile);
  $('profClose').addEventListener('click', function () { $('profSet').hidden = true; });
  $('profReset').addEventListener('click', function () { if (confirm('ล้างสถิติสะสมทั้งหมด?')) { try { localStorage.removeItem('tr_profile'); } catch (e) { /* ไม่เป็นไร */ } showProfile(); } });

  /* ---------- ตะเกียงส่องทาง ---------- */
  function placeWardKey() {
    if (!g || !playing || paused) return;
    if (!act({ k: 'ward' })) toast(g.player.wardN <= 0 ? 'ตะเกียงหมด รอได้คืน' : 'วางตะเกียงใกล้กันเกินไป');
  }
  $('wdBtn').addEventListener('pointerdown', function (e) { e.preventDefault(); placeWardKey(); });
  function wardHud(pl) {
    const b = $('wdBtn'); b.querySelector('.nm').textContent = 'ตะเกียง ×' + pl.wardN;
    b.classList.toggle('wait', pl.wardN <= 0 || pl.dead); b.querySelector('.cd').textContent = pl.wardN <= 0 ? Math.ceil(pl.wardCd) : '';
  }

  /* ---------- ตารางคะแนน (กด Tab ค้าง หรือปุ่ม 📋) ---------- */
  let boardLock = false;
  function boardShow(on) { if (!g || !playing) return; $('board').hidden = !(on || boardLock); if (!$('board').hidden) boardRender(); }
  $('boardBtn').addEventListener('pointerdown', function (e) { e.preventDefault(); boardLock = !boardLock; boardShow(false); });
  function boardRender() {
    const hs = g.units.filter(function (u) { return u.type === 'hero'; });
    let html = '<table><tr><th>ฮีโร่</th><th>Lv</th><th>ฆ่า/ตาย/ช่วย</th><th>ลูกกระจ๊อก</th><th>ทองรวม</th><th>ไอเทม</th></tr>';
    [0, 1].forEach(function (t) {
      const sum = hs.filter(function (u) { return u.team === t; });
      html += '<tr class="tm"><td colspan="6" class="' + (t === 0 ? 'b' : 'r') + '">ทีม' + (t === 0 ? 'ฟ้า' : 'แดง') + ' · ฆ่า ' + g.score[t] + ' · ทอง ' + Math.round(sum.reduce(function (a, u) { return a + u.goldTotal; }, 0)) + '</td></tr>';
      sum.sort(function (a, b) { return a.slot - b.slot; }).forEach(function (u) {
        html += '<tr class="' + (u === g.player ? 'me' : '') + '"><td class="' + (t === 0 ? 'b' : 'r') + '">' + pn(u) + (u.dead ? ' 💀' : '') + '</td><td>' + u.level + '</td><td>' + u.kills + '/' + u.deaths + '/' + u.assists + '</td><td>' + u.cs + '</td><td>' + Math.round(u.goldTotal) + '</td><td class="it">' + u.items.map(function (id) { return TR.ITEM_BY_ID[id].icon; }).join('') + '</td></tr>';
      });
    });
    $('board').innerHTML = html + '</table>';
  }

  /* ---------- สรุปความตาย ---------- */
  function recapHud(pl) {
    const r = pl.recap, box = $('recap');
    if (!pl.dead || !r || g.t - r.t > 20) { box.hidden = true; return; }
    const mx = Math.max(1, r.rows.length ? r.rows[0].d : 1);
    let html = '<h4>💀 ถูก ' + r.by + ' ปราบ</h4><div style="color:#ddd;margin-bottom:3px">ดาเมจที่ได้รับ 10 วิสุดท้าย ' + r.total + ' (เวท ' + r.magPct + '%)</div>';
    r.rows.forEach(function (w) { html += '<div class="rw"><span style="min-width:62px">' + w.n + '</span><i style="width:' + Math.round(100 * w.d / mx * 0.7) + 'px"></i><span>' + w.d + '</span></div>'; });
    if (r.total > 0) html += '<div class="tip">' + (r.magPct >= 55 ? '💡 โดนเวทเป็นหลัก ลองซื้อสายต้านเวท' : (r.magPct <= 30 ? '💡 โดนกายภาพเป็นหลัก ลองซื้อสายป้องกัน/เกราะ' : '💡 โดนทั้งสองแบบ ผสมเกราะกับต้านเวท')) + '</div>';
    box.innerHTML = html; box.hidden = false;
  }

  /* ---------- ความยากบอท + โหมดแบน (เมนู) ---------- */
  function buildOptRows() {
    const d = $('diffRow'), b = $('banRow'); d.innerHTML = ''; b.innerHTML = '';
    Object.keys(TR.DIFFS).forEach(function (k) {
      const x = document.createElement('button'); x.textContent = 'บอท' + TR.DIFFS[k].name; x.title = TR.DIFFS[k].note; x.className = opt.diff === k ? 'sel' : '';
      x.addEventListener('click', function () { opt.diff = k; try { localStorage.setItem('tr_diff', k); } catch (e) { /* ไม่เป็นไร */ } buildOptRows(); }); d.appendChild(x);
    });
    [[false, 'ไม่แบนฮีโร่'], [true, 'โหมดแบนฮีโร่']].forEach(function (o) {
      const x = document.createElement('button'); x.textContent = o[1]; x.className = opt.ban === o[0] ? 'sel' : '';
      x.addEventListener('click', function () { opt.ban = o[0]; try { localStorage.setItem('tr_banmode', o[0] ? '1' : '0'); } catch (e) { /* ไม่เป็นไร */ } buildOptRows(); }); b.appendChild(x);
    });
  }
  function openBan() {
    banPick = [];
    $('banHint').textContent = 'เลือกฮีโร่ที่ไม่อยากให้ใครใช้ได้ ' + CFG.ban.n + ' ตัว (บอทศัตรูแบนของเขาเองด้วย) · ฮีโร่ของคุณแบนไม่ได้';
    const grid = $('banGrid'); grid.innerHTML = '';
    TR.HEROES.forEach(function (h) {
      if (h.id === sel.hero) return;
      const b = document.createElement('button'), cv = document.createElement('canvas'); cv.width = 64; cv.height = 72;
      TR.Render.drawHeroIcon(cv.getContext('2d'), h, 64, 72, 0); b.appendChild(cv); b.appendChild(document.createTextNode(h.name));
      b.addEventListener('click', function () {
        const i = banPick.indexOf(h.id);
        if (i >= 0) banPick.splice(i, 1); else { if (banPick.length >= CFG.ban.n) banPick.shift(); banPick.push(h.id); }
        Array.prototype.forEach.call(grid.children, function (c, j) { c.classList.toggle('sel', banPick.indexOf(TR.HEROES.filter(function (x) { return x.id !== sel.hero; })[j].id) >= 0); });
        $('banGo').disabled = banPick.length === 0;
      });
      grid.appendChild(b);
    });
    $('banGo').disabled = true; $('banSet').hidden = false;
  }
  $('banGo').addEventListener('click', function () { $('banSet').hidden = true; startGame(); });
  $('banSkip').addEventListener('click', function () { $('banSet').hidden = true; banPick = []; startGame(); });

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
        t.innerHTML = '<div class="n">' + pn(u) + (u === g.player ? ' (คุณ)' : '') + '</div><div class="r">' + TR.ROLES[u.role].name + ' · ใจ' + TR.EMBLEMS[u.emblem].name + '</div>';
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
    playing = false; g = null; lobbyLeave(); $('board').hidden = true; $('recap').hidden = true; TR.Audio.musicStop(); $('tut').hidden = true;
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
        if (e.state === 'spawn') { TR.Audio.play('boss'); banner('ยักษ์วัดแจ้งปรากฏกลางป่า!', 'ฆ่าได้ทั้งทีมได้บัฟและทอง · ระวังการสแลมพื้นที่', 5000); }
        else { feed('ทีม' + (e.team === 0 ? 'ฟ้า' : 'แดง') + 'ปราบยักษ์วัดแจ้งได้', e.team); banner('ทีม' + (e.team === 0 ? 'ฟ้า' : 'แดง') + 'ปราบยักษ์วัดแจ้ง', 'ทั้งทีมได้บัฟและทอง · ยักษ์จะกลับมาใน 3 นาที', 4500); }
      }
      else if (e.k === 'announce') {
        const mine = e.team === g.player.team, big = e.kind === 'multi' || e.kind === 'ace' || (e.kind === 'streak' && e.n >= 5);
        TR.Audio.play(e.kind === 'ace' ? 'ace' : (e.kind === 'multi' || e.kind === 'streak' ? 'multi' : 'first')); TR.Audio.say(e.text);
        banner(e.text, e.sub, big ? 3800 : 2800, 'ann ' + e.kind + (mine ? ' mine' : ' foe') + (big ? ' big' : ''));
        feed((mine ? '🔥 ' : '💀 ') + e.text + ' ' + e.sub, e.team);
      }
      else if (e.k === 'chat') { if (e.team === g.player.team) TR.Audio.play('ping'); feed(e.who + ': ' + e.text, e.team); }
      else if (e.k === 'jungle') feed(e.killer + ' ได้บัฟ' + e.name + ' (' + e.text + ')', e.kteam);
      else if (e.k === 'tower') { TR.Audio.play('tower'); feed('ป้อม' + e.name + (e.team === 0 ? 'ฝั่งเรา' : 'ฝั่งศัตรู') + 'พังแล้ว', 1 - e.team); }
      else if (e.k === 'warn') { TR.Audio.play('warn'); banner('อีก ' + CFG.eraWarn + ' วินาทีเข้าสู่ยุค' + TR.ERAS[e.era].name, 'ป้อมจะเปลี่ยนเป็น: ' + TR.ERAS[e.era].short, 4500); }
      else if (e.k === 'era') { TR.Audio.play('gong'); TR.Audio.musicEra(e.era); TR.Audio.say('เข้าสู่ยุค' + TR.ERAS[e.era].name); banner('เข้าสู่ยุค' + TR.ERAS[e.era].name, TR.ERAS[e.era].note + ' · ฮีโร่ยุครุ่งเรือง: ' + heroesOfEra(e.era), 5500); }
      else if (e.k === 'over') { endTimer = setTimeout(showResult, 1800); }
    }
  }

  function showResult() {
    const pl = g.player, win = g.winner === pl.team;
    TR.Audio.musicStop(); TR.Audio.play(win ? 'win' : 'lose');
    if (!g.tutorial) recordProfile(win);
    $('tut').hidden = true;
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
        html += '<tr class="' + (u === pl ? 'me' : '') + '"><td class="' + (t === 0 ? 'b' : 'r') + '">' + pn(u) + (u === mvp[t] ? '<span class="mvp">MVP</span>' : '') + (u === pl ? ' (คุณ)' : '') + '</td><td>' + u.level + '</td><td>' + u.kills + '/' + u.deaths + '/' + u.assists + '</td>' +
          bar(u.stDmg, mDmg, Math.round(u.stDmg)) + bar(u.stTaken, mTk, Math.round(u.stTaken)) + bar(u.stHeal, mHl, Math.round(u.stHeal)) + bar(u.stTwr, mTw, Math.round(u.stTwr)) +
          '<td>' + u.stTowers + '</td><td>' + u.stMon + '</td><td>' + u.cs + '</td><td>' + Math.round(u.goldTotal) + '</td></tr>';
      });
    });
    $('resTable').innerHTML = html + '</table>';
    $('result').hidden = false;
  }

  /* ---------- อินพุต ---------- */
  window.addEventListener('keydown', function (e) {
    if (!playing || (e.target && e.target.tagName === 'INPUT')) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].indexOf(e.code) >= 0) e.preventDefault();
    if (e.repeat) return;
    keys[e.code] = true;
    if (e.code === 'Tab') { e.preventDefault(); boardShow(true); return; }
    if (e.code === 'KeyV') { $('chatPanel').hidden = !$('chatPanel').hidden; $('chatOnline').classList.toggle('on', !!online); return; }
    if (!$('chatPanel').hidden && /^Digit[1-5]$/.test(e.code)) { sendSignal(SIG_ORDER[+e.code.slice(5) - 1]); return; }
    if (e.code === 'KeyQ' || e.code === 'Digit1') keySkill(0);
    else if (e.code === 'KeyE' || e.code === 'Digit2') keySkill(1);
    else if (e.code === 'KeyR' || e.code === 'Digit3') keySkill(2);
    else if (e.code === 'Space' || e.code === 'KeyJ') atkPress(null, true, $('atkBtn'));
    else if (e.code === 'KeyZ') atkPress('minion', true, $('atkMin'));
    else if (e.code === 'KeyX') atkPress('tower', true, $('atkTwr'));
    else if (e.code === 'KeyF') castPlayerSpell();
    else if (e.code === 'KeyC') recallPlayer();
    else if (e.code === 'KeyN') placeWardKey();
    else if (IT_KEYS.indexOf(e.code) >= 0) useItemKey(IT_KEYS.indexOf(e.code));
    else if (e.code === 'KeyB') toggleShop();
    else if (e.code === 'Escape' && shopOpen) toggleShop(false);
    else if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
  });
  window.addEventListener('keyup', function (e) { if (e.code === 'Tab') boardShow(false); keys[e.code] = false; if (e.code === 'Space' || e.code === 'KeyJ') atkPress(null, false, $('atkBtn')); else if (e.code === 'KeyZ') atkPress('minion', false, $('atkMin')); else if (e.code === 'KeyX') atkPress('tower', false, $('atkTwr')); });
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
    if (!ctl.autoBuy || g.tutorial || !TR.Sim.canShop(pl)) return;
    for (let n = 0; n < 6; n++) {
      const st = buildSteps(pl)[0]; if (!st) return;
      const net = TR.Sim.netCost(pl, st); if (net == null || pl.gold < net) return;
      if (!act({ k: 'buy', id: st.id })) return;
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
        if (act({ k: 'buy', id: st.id })) { toast('🛒 ซื้อ ' + st.name); quickSig = ''; shopSig = ''; }
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
    const eh = document.createElement('div'); eh.className = 'sline'; eh.textContent = '🏯 ไอเทมประจำยุค (ปลดล็อกตามยุค · ประกอบจากชิ้นย่อย หักราคาให้)'; list.appendChild(eh);
    TR.ERA_ITEMS.forEach(function (it) {
      const have = pl.items.indexOf(it.id) >= 0, net = TR.Sim.netCost(pl, it), locked = (pl.era | 0) < it.era;
      const afford = net != null && pl.gold >= net;
      const b = document.createElement('button');
      b.className = 'sitem' + (have ? ' have' : (afford && can ? ' can' : (net == null ? ' no' : ''))) + (shopSel === it.id ? ' sel' : '');
      b.innerHTML = '<span class="ic">' + it.icon + '</span><span class="nm">' + it.name + '</span><span class="co">' + (have ? '✓' : (locked ? '🔒' + TR.ERAS[it.era].name : (net == null ? '—' : net))) + '</span>';
      b.addEventListener('click', function () { shopSel = it.id; renderShop(true); });
      list.appendChild(b);
    });
    const info = $('shopInfo');
    if (!shopSel) { info.textContent = 'แตะไอเทมเพื่อดูรายละเอียด · แต่ละสายอัปเกรดต่อกันได้ ชั้นบนหักราคาชิ้นล่างที่มี'; return; }
    const it = TR.ITEM_BY_ID[shopSel], have = pl.items.indexOf(it.id) >= 0, net = TR.Sim.netCost(pl, it);
    const lower = TR.Sim.ownedInLine(pl, it.line);
    info.innerHTML = '<span class="tx"><b>' + it.icon + ' ' + it.name + '</b> (' + (it.recipe ? 'ประจำยุค' + TR.ERAS[it.era].name : 'ชั้น ' + it.tier) + ')<br>' + TR.itemDesc(it) + (lower && !have && net != null ? ' · ต่อยอดจาก ' + lower.name : '') + '</span>';
    const btn = document.createElement('button');
    if (have) { btn.textContent = 'ขาย +' + Math.floor(it.cost * 0.7); btn.disabled = !can; btn.addEventListener('click', function () { if (act({ k: 'sell', id: it.id })) renderShop(true); }); }
    else { btn.textContent = net == null ? 'ซื้อไม่ได้' : 'ซื้อ ' + net; btn.disabled = !can || net == null || pl.gold < net; btn.addEventListener('click', function () { if (act({ k: 'buy', id: it.id })) renderShop(true); }); }
    info.appendChild(btn);
    if (it.recipe) return;   // ไอเทมประจำยุคไม่เข้าเซ็ตซื้ออัตโนมัติ
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
    if (paused && !online) TR.Audio.suspend(); else TR.Audio.resume();
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

  function castPlayerSpell() { if (g && playing && !paused) act({ k: 'spell' }); }
  function recallPlayer() { if (!g || !playing || paused) return; act({ k: 'recall' }); }
  $('spBtn').addEventListener('pointerdown', function (e) { e.preventDefault(); castPlayerSpell(); });
  $('rcBtn').addEventListener('pointerdown', function (e) { e.preventDefault(); recallPlayer(); });
  let lastIn = [0, 0];
  function readInput() {
    const pl = g.player;
    let dx = 0, dy = 0;
    if (keys.KeyA || keys.ArrowLeft) dx -= 1;
    if (keys.KeyD || keys.ArrowRight) dx += 1;
    if (keys.KeyW || keys.ArrowUp) dy -= 1;
    if (keys.KeyS || keys.ArrowDown) dy += 1;
    if (stick.active) { dx += stick.dx; dy += stick.dy; }
    if (!net || dx !== lastIn[0] || dy !== lastIn[1]) { lastIn = [dx, dy]; act({ k: 'in', dx: dx, dy: dy }); }
    while (queue.length) { const q = queue.shift(); act({ k: 'cast', slot: q.slot, aim: q.aim }); }
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
    syncItems(pl); tutTick(pl); wardHud(pl); recapHud(pl); if (!$('board').hidden) boardRender();
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
      if (!$('lobby').hidden && room) rmDraw();
      if (!$('menu').hidden) { const sz = sizeStage(); if (sz) TR.Render.drawStage(stageCtx, sz.w, sz.h, stageState, TR.HERO_BY_ID[sel.hero], sz.dpr); }
      return;
    }
    if (introEnd) {
      if (performance.now() >= introEnd) endIntro();
      lastTs = ts;
      camCache = TR.Render.draw(ctx, g, 1);
      return;
    }
    if (!paused || online) {
      acc += Math.min(0.25, (ts - lastTs) / 1000);
      if (online) stepOnline();
      else if (TR.Render.hitStopLeft() > 0 && !(g.over)) { acc = Math.min(acc, CFG.dt); }   // หน่วงเฟรมเฉพาะโหมดเดี่ยว: แค่เลื่อนเวลาก้าวถัดไป ผลจำลองเท่าเดิม
      else while (acc >= CFG.dt) { readInput(); TR.Sim.step(g); acc -= CFG.dt; }
      handleEvents(); drainSfx();
    }
    lastTs = ts;
    const dt0 = performance.now();
    camCache = TR.Render.draw(ctx, g, paused ? 1 : acc / CFG.dt);
    if (!paused) watchPerf(performance.now() - dt0);
    if (ts - hudT > 100) { hudT = ts; updateHud(); pingShow($('pingTag')); }
    if (ts - miniT > 200) { miniT = ts; TR.Render.drawMinimap(mctx, g, mini.width, mini.height, camCache); }
  }

  /* ---------- ออนไลน์: ห้อง/ล็อบบี้ และตัวเดินเกมตามจังหวะกลาง ----------
     ทุกเครื่องรันเกมเอง รับเฉพาะ "คำสั่ง + หมายเลขจังหวะ" จากเซิร์ฟเวอร์ แล้วเดินเกมตามจังหวะนั้นเป๊ะ ๆ */
  let room = null;   // { code, uid, host, list, ready, sent }
  // แสดงค่าความหน่วง: เขียว <80 ms, เหลือง <160, แดงเกินนั้น (ออนไลน์เท่านั้น)
  function pingShow(el) {
    if (!el) return;
    if (!online && !(room && !$('lobby').hidden)) { el.hidden = true; return; }
    const r = TR.Online.ping(); el.hidden = false;
    if (r < 0) { el.textContent = TR.Online.isOpen() ? '📶 …' : '📶 ขาดการเชื่อมต่อ'; el.className = TR.Online.isOpen() ? '' : 'r'; return; }
    el.textContent = '📶 ' + Math.round(r) + ' ms'; el.className = r < 80 ? 'g' : (r < 160 ? 'y' : 'r');
  }
  function lbStatus(t) { $('lbStatus').textContent = t || ''; }
  function lbPick(ready) {
    return { t: 'pick', hero: sel.hero, emblem: sel.emblem || bestEmblem(sel.hero), spell: sel.spell, lane: sel.lane, ready: !!ready };
  }
  function lobbySync() {
    if (!room || online) return;
    if (room.ready) room.ready = false;
    TR.Online.send(lbPick(false)); renderRoom();   // เลือกอะไรเพื่อนเห็นทันที (เปลี่ยนแล้วต้องกดพร้อมใหม่)
  }
  function lobbyOpen() {
    if (!TR.Net.configured()) { toast('ยังไม่ได้ตั้งค่าเซิร์ฟเวอร์ออนไลน์'); return; }
    TR.Net.wake(); $('lobby').hidden = false;
  }
  function lobbyLeave() {
    TR.Online.close(); rjClear(); room = null; online = false; net = null; lastKnown = 0; rcTry = 0; clearTimeout(rcTimer); $('lobby').hidden = true; $('lobby').classList.remove('full'); $('lbEntry').hidden = false; $('lbRoom').hidden = true; lbStatus('');
  }
  /* ---------- กลับเข้าเกมเมื่อหลุด: เก็บโทเคนห้องไว้ในเครื่อง ---------- */
  const RJ_KEY = 'tr_rejoin';
  function rjSave(o) { try { localStorage.setItem(RJ_KEY, JSON.stringify(Object.assign(o, { t: Date.now() }))); } catch (e) { /* ไม่เป็นไร */ } }
  function rjLoad() { try { const o = JSON.parse(localStorage.getItem(RJ_KEY) || 'null'); return o && o.room && o.tok && Date.now() - o.t < 25 * 60 * 1000 ? o : null; } catch (e) { return null; } }
  function rjClear() { try { localStorage.removeItem(RJ_KEY); } catch (e) { /* ไม่เป็นไร */ } }
  let rcTry = 0, rcTimer = null;
  function turnsIn(m) { if (g && online && m.log) for (let i = 0; i < m.log.length; i++) for (const x of m.log[i][1]) if (x && typeof x[0] === 'number' && x[1] && typeof x[1] === 'object') TR.Sim.submit(g, x[0], x[1], m.log[i][0]); }
  function onHandlers(first) {
    return {
      open: function () { if (first) { if (first.t !== 'rejoin') first.name = myName; TR.Online.send(first); } lbStatus('เชื่อมต่อแล้ว'); },
      joined: function (m) { room = { code: m.room, uid: m.uid, host: 0, list: [], ready: false, tok: m.tok }; rjSave({ room: m.room, uid: m.uid, tok: m.tok }); $('lbEntry').hidden = true; $('lbRoom').hidden = false; $('lobby').classList.add('full'); $('lbCodeTx').textContent = m.room; rmBuild(); lbStatus(''); TR.Online.send(lbPick(false)); },
      rejoined: function (m) {
        const sv = rjLoad(); rcTry = 0; clearTimeout(rcTimer);
        if (!room) room = { code: m.room, uid: m.uid, host: m.host, list: [], ready: true, tok: sv ? sv.tok : '' };
        $('banner').classList.remove('on');
      },
      roster: function (m) {
        if (!room) return; room.host = m.host; room.list = m.list; room.banMode = !!m.banMode; room.bans = m.bans || [[], []];
        if (room.banMode && roomBanned(sel.hero)) { const nx = TR.HEROES.find(function (h) { return !roomBanned(h.id) && !room.list.some(function (x) { return x.hero === h.id && x.uid !== room.uid; }); }); if (nx) { sel.hero = nx.id; sel.emblem = bestEmblem(nx.id); TR.Online.send(lbPick(false)); } }
        if (!room.banMode) banning = false;
        renderRoom();
      },
      chat: chatIn,
      err: function (m) { lbStatus('⚠ ' + m.msg); $('lbCreate').disabled = $('lbJoin').disabled = false; if (m.fatal) { rjClear(); toast(m.msg); if (!g) { room = null; $('lobby').hidden = true; } } },
      start: function (m) { if (m.rejoin) { online = true; } startOnline(m); },
      catchup: turnsIn,
      u: onTurn,
      desync: function (m) { console.warn('desync', m); toast('⚠ เกมของแต่ละเครื่องเริ่มไม่ตรงกัน (tick ' + m.tick + ')'); },
      close: function () {
        $('lbCreate').disabled = $('lbJoin').disabled = false;
        if (online && g && !g.over) autoRejoin();
        else if (!online) { room = null; $('lobby').classList.remove('full'); $('lbEntry').hidden = false; $('lbRoom').hidden = true; lbStatus('⚠ เชื่อมต่อไม่ได้ ลองใหม่อีกครั้ง'); }
      }
    };
  }
  // หลุดกลางเกม: ลองต่อใหม่เองหลายรอบ (เกมที่ค้างอยู่ใช้ต่อได้ ขอเฉพาะคำสั่งที่ตกหล่น)
  function autoRejoin() {
    const sv = rjLoad(); if (!room || !sv) { banner('หลุดจากเซิร์ฟเวอร์', 'กดหยุดเกม (P) แล้วออกเมนูได้', 8000, 'bad'); return; }
    if (rcTry >= 12) { banner('ต่อเซิร์ฟเวอร์ไม่ได้', 'เกมนี้เล่นต่อไม่ได้แล้ว กดหยุดเกม (P) แล้วออกเมนู', 15000, 'bad'); return; }
    const since = lastKnown || TR.Online.known(); rcTry++;
    banner('กำลังเชื่อมต่อใหม่…', 'ครั้งที่ ' + rcTry + ' · เกมของคุณยังอยู่ บอทคุมตัวแทนชั่วคราว', 30000, 'bad');
    rcTimer = setTimeout(function () { TR.Online.open(onHandlers({ t: 'rejoin', room: sv.room, uid: sv.uid, tok: sv.tok, since: since }), since); }, Math.min(8000, 800 * rcTry));
  }
  let lastKnown = 0, catchT = 0;
  function lbConnect(first) {
    lbStatus('กำลังเชื่อมต่อ… ครั้งแรกอาจใช้เวลาถึง 1 นาที เพราะเซิร์ฟเวอร์ฟรีต้องตื่นก่อน');
    $('lbCreate').disabled = $('lbJoin').disabled = true;
    TR.Online.open(onHandlers(first));
  }
  // เปิดเกมใหม่/รีเฟรชแล้วกลับเข้าห้องเดิมที่ยังเล่นอยู่
  function rejoinSaved() {
    const sv = rjLoad(); if (!sv) return false;
    $('lobby').hidden = false; $('lbEntry').hidden = true; lbStatus('กำลังกลับเข้าเกมห้อง ' + sv.room + '…');
    TR.Online.open(onHandlers({ t: 'rejoin', room: sv.room, uid: sv.uid, tok: sv.tok, since: 0 }));
    return true;
  }
  const rmCv = $('rmStage'), rmCtx = rmCv.getContext('2d'), rmState = { side: 1 };
  (function () {   // ลากหมุน/ซูม/ดับเบิลคลิกรีเซ็ต เหมือนเวทีหน้าเมนู
    let lx = 0, down = false;
    rmCv.addEventListener('pointerdown', function (e) { down = true; lx = e.clientX; try { rmCv.setPointerCapture(e.pointerId); } catch (x) { /* ไม่เป็นไร */ } if (TR.Stage3D) TR.Stage3D.dragStart(rmState); });
    rmCv.addEventListener('pointermove', function (e) { if (!down) return; const dx = e.clientX - lx; lx = e.clientX; if (dx && TR.Stage3D) TR.Stage3D.dragMove(rmState, dx); });
    const up = function () { down = false; if (TR.Stage3D) TR.Stage3D.dragEnd(rmState); };
    rmCv.addEventListener('pointerup', up); rmCv.addEventListener('pointercancel', up);
    rmCv.addEventListener('wheel', function (e) { if (!TR.Stage3D) return; e.preventDefault(); TR.Stage3D.zoomBy(rmState, e.deltaY < 0 ? 1.08 : 1 / 1.08); }, { passive: false });
    rmCv.addEventListener('dblclick', function () { if (TR.Stage3D) TR.Stage3D.resetView(rmState); });
  })();
  function rmDraw() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2), w = rmCv.clientWidth, h = rmCv.clientHeight; if (!w || !h) return;
    if (rmCv.width !== Math.round(w * dpr) || rmCv.height !== Math.round(h * dpr)) { rmCv.width = Math.round(w * dpr); rmCv.height = Math.round(h * dpr); }
    TR.Render.drawStage(rmCtx, w, h, rmState, TR.HERO_BY_ID[sel.hero], dpr);
  }
  function rmBuild() {   // การ์ดเลือกฮีโร่ + ข้อมูลตัวที่เลือก ในหน้าห้อง
    const box = $('rmHeroes'); if (!box) return;
    if (!box.children.length) {
      TR.HEROES.forEach(function (h) {
        const b = document.createElement('button'); b.className = 'rh'; b.dataset.id = h.id;
        const cv = document.createElement('canvas'); cv.width = 112; cv.height = 128; TR.Render.drawHeroIcon(cv.getContext('2d'), h, 112, 128, 0);
        const n = document.createElement('div'); n.textContent = h.name;
        b.appendChild(cv); b.appendChild(n);
        b.addEventListener('click', function () { if (banning && room && room.banMode) TR.Online.send({ t: 'ban', hero: h.id }); else pickHero(h.id); });
        box.appendChild(b);
      });
    }
    const h = TR.HERO_BY_ID[sel.hero];
    Array.prototype.forEach.call(box.children, function (c) {
      c.classList.toggle('sel', c.dataset.id === sel.hero);
      const owner = room && room.list.find(function (x) { return x.hero === c.dataset.id && x.uid !== room.uid; });
      c.classList.toggle('taken', !!owner);
      const bt = room && room.bans ? (room.bans[0].indexOf(c.dataset.id) >= 0 ? 0 : (room.bans[1].indexOf(c.dataset.id) >= 0 ? 1 : -1)) : -1;
      c.classList.toggle('banned', bt >= 0);
      let bn = c.querySelector('.bn');
      if (bt >= 0) { if (!bn) { bn = document.createElement('div'); bn.className = 'bn'; c.appendChild(bn); } bn.textContent = 'แบนโดยทีม' + (bt === 0 ? 'ฟ้า' : 'แดง'); } else if (bn) bn.remove();
      let w = c.querySelector('.who');
      if (owner) { if (!w) { w = document.createElement('div'); w.className = 'who'; c.appendChild(w); } w.textContent = owner.name; } else if (w) w.remove();
    });
    if (rmState.id !== sel.hero) TR.Render.stageReset(rmState, sel.hero);
    $('rmInfo').innerHTML = '<b>' + esc(h.name) + '</b><br>ยุค' + TR.ERAS[h.era].name + ' · ' + TR.ROLES[h.role].name + '<br>' + esc(h.strength) + '<br><small>' + h.skills.map(function (k) { return esc(k.name); }).join(' · ') + '</small>';
  }
  setInterval(function () { if (room && !$('lobby').hidden) pingShow($('lbPing')); }, 1000);
  const LANE_NAME = { '-1': '🌲 ป่า', 0: '⬆️ บน', 1: '⏺️ กลาง', 2: '⬇️ ล่าง' };
  function renderRoom() {
    if (!room) return;
    const me = room.list.find(function (x) { return x.uid === room.uid; });
    [0, 1].forEach(function (t) {
      const box = $('lbT' + t); box.innerHTML = '';
      room.list.filter(function (x) { return x.team === t; }).forEach(function (x) {
        const dup = x.hero && room.list.some(function (y) { return y.uid < x.uid && y.hero === x.hero; });
        const d = document.createElement('div'); d.className = 'lb-p' + (x.uid === room.uid ? ' me' : '');
        const em = x.emblem && TR.EMBLEMS[x.emblem], sp = x.spell && TR.SPELL_BY_ID[x.spell];
        d.innerHTML = '<div class="row1"><span>' + esc(x.name) + (x.uid === room.host ? ' 👑' : '') + '</span><span class="' + (dup ? 'dup' : (x.ready ? 'ok' : 'no')) + '">' + (x.hero ? hn(x.hero) : 'ยังไม่เลือก') + (x.ready ? ' ✔' : '') + '</span></div>'
          + '<div class="sub">' + (em ? em.name : '-') + ' · ' + (LANE_NAME[x.lane] || '') + ' · ' + (sp ? sp.icon + sp.name : '') + '</div>';
        box.appendChild(d);
      });
    });
    rmBuild();
    const dupMine = me && room.list.some(function (y) { return y.uid !== room.uid && y.hero === sel.hero; });
    $('lbReady').textContent = me && me.ready ? 'ยกเลิกพร้อม' : 'พร้อม';
    $('lbReady').disabled = !!dupMine && !(me && me.ready);
    $('lbHint').textContent = dupMine ? 'ฮีโร่นี้มีเพื่อนเลือกแล้ว เลือกตัวอื่นก่อน' : 'เลือกฮีโร่ ชุดใจ เลน สเปล ในหน้านี้ แล้วกด "พร้อม" · ที่ว่างในทีมบอทเติมให้';
    const host = room.uid === room.host;
    $('lbBanRow').hidden = !(host || room.banMode);
    $('lbBanMode').hidden = !host; $('lbBanMode').textContent = room.banMode ? '🚫 โหมดแบน: เปิด' : '🚫 โหมดแบน: ปิด';
    $('lbBanDo').hidden = !room.banMode; $('lbBanDo').classList.toggle('on', banning); $('lbBanDo').textContent = banning ? '✔ กำลังแบน (แตะการ์ด)' : '🚫 แตะการ์ดเพื่อแบน';
    $('rmHeroes').classList.toggle('banning', !!(banning && room.banMode));
    if (room.banMode && !dupMine) $('lbHint').textContent = 'โหมดแบน: ทีมละ ' + CFG.ban.n + ' ตัว (ใครในทีมกดแบนแทนทีมได้ กดซ้ำเพื่อถอน) · แบนแล้ว ฟ้า: ' + (room.bans[0].map(hn).join(', ') || '-') + ' · แดง: ' + (room.bans[1].map(hn).join(', ') || '-');
    $('lbStart').hidden = !host;
    $('lbStart').disabled = !(host && room.list.length && room.list.every(function (x) { return x.ready; }));
  }
  let banning = false;
  function roomBanned(id) { return !!(room && room.banMode && room.bans && (room.bans[0].indexOf(id) >= 0 || room.bans[1].indexOf(id) >= 0)); }
  $('lbBanMode').addEventListener('click', function () { TR.Online.send({ t: 'banmode', on: !(room && room.banMode) }); });
  $('lbBanDo').addEventListener('click', function () { banning = !banning; renderRoom(); });
  /* ---------- แชตข้อความ (ในห้อง + ในเกม): ส่งผ่านเซิร์ฟเวอร์คนละช่องกับคำสั่งเกม ไม่กระทบจังหวะเกม ---------- */
  const chatLog = [];
  function chatSend(txt, to) { txt = (txt || '').trim(); if (!txt || !room) return; TR.Online.send({ t: 'chat', m: txt.slice(0, 80), to: to || 'all' }); }
  function chatLine(m) {
    const d = document.createElement('div'); d.className = m.team === 0 ? 'b' : 'r';
    d.innerHTML = (m.to === 'team' ? '<i>[ทีม]</i> ' : '') + '<b>' + esc(m.name) + ':</b> ' + esc(m.m); return d;
  }
  function chatIn(m) {
    if (!m || typeof m.m !== 'string') return;
    chatLog.push(m); if (chatLog.length > 40) chatLog.shift();
    ['lbChatLog', 'chatLog'].forEach(function (id) { const b = $(id); if (!b) return; b.appendChild(chatLine(m)); while (b.children.length > 40) b.removeChild(b.firstChild); b.scrollTop = b.scrollHeight; });
    if (online && g) { feed((m.to === 'team' ? '[ทีม] ' : '') + m.name + ': ' + m.m, m.team); TR.Audio.play('ui'); }
  }
  function lbChatSend() { const i = $('lbChatIn'); chatSend(i.value, 'all'); i.value = ''; }
  $('lbChatGo').addEventListener('click', lbChatSend);
  $('lbChatIn').addEventListener('keydown', function (e) { e.stopPropagation(); if (e.key === 'Enter') lbChatSend(); });
  function startOnline(m) {
    if (!room) return;
    if (m.rejoin) { room.uid = room.uid; }
    $('lobby').hidden = true; $('lobby').classList.remove('full'); online = true; onBuf = 3; lastStarve = 0;
    net = { send: function (c) { return TR.Online.send({ t: 'cmd', c: c }); } };
    tutorial = false;
    beginGame({ seed: m.seed, humans: m.list, me: room.uid, diff: 'normal', roomBans: m.bans });
  }
  function onTurn(m) {
    if (!g || !online) return;
    if (m.c) for (let i = 0; i < m.c.length; i++) { const x = m.c[i]; if (x && typeof x[0] === 'number' && x[1] && typeof x[1] === 'object') TR.Sim.submit(g, x[0], x[1], m.n); }
  }
  function stepOnline() {
    const known = TR.Online.known(); lastKnown = Math.max(lastKnown, known);
    if (g.over) rjClear();
    if (known - g.tick > 80) {   // ตามเกมให้ทัน (กลับเข้าเกมหลังหลุด): เดินเต็มเร็วโดยไม่ส่งคำสั่ง/hash
      const t0 = performance.now(); while (g.tick < known && !g.over && performance.now() - t0 < 12) TR.Sim.step(g);
      acc = 0; if (performance.now() - catchT > 300) { catchT = performance.now(); banner('กำลังตามเกม…', Math.round(g.tick / known * 100) + '% (กลับเข้าเกมแล้ว)', 1200); }
      return;
    }
    if (onWait) { if (known - g.tick >= onBuf) onWait = false; else { acc = 0; return; } }
    let n = 0;
    while (g.tick < known && !g.over && n < 12 && (acc >= CFG.dt || known - g.tick > onBuf + 3)) {
      readInput(); TR.Sim.step(g); if (acc >= CFG.dt) acc -= CFG.dt; n++;
      if (g.tick % 200 === 0) TR.Online.send({ t: 'hash', tick: g.tick, h: TR.Sim.hash(g) });
    }
    if (acc >= CFG.dt && g.tick >= known) {   // ข้อมูลไม่ทัน: ห้ามสะสมเวลา และเพิ่มบัฟเฟอร์ถ้าสะดุดบ่อย
      acc = CFG.dt; starve++;
      if (performance.now() - lastStarve > 4000 && starve > 3 && onBuf < 8) { onBuf++; starve = 0; lastStarve = performance.now(); }
    }
    if (acc > CFG.dt * 2) acc = CFG.dt * 2;
  }
  $('onBtn').addEventListener('click', lobbyOpen);
  $('lbClose').addEventListener('click', lobbyLeave);
  $('lbCreate').addEventListener('click', function () { lbConnect({ t: 'create' }); });
  $('lbJoin').addEventListener('click', function () { const c = $('lbCode').value.trim().toUpperCase(); if (c.length < 4) { lbStatus('ใส่รหัสห้อง 4 ตัว'); return; } lbConnect({ t: 'join', room: c }); });
  $('lbCode').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('lbJoin').click(); });
  $('lbReady').addEventListener('click', function () { if (!room) return; const me = room.list.find(function (x) { return x.uid === room.uid; }); room.ready = !(me && me.ready); TR.Online.send(lbPick(room.ready)); });
  $('lbTeam').addEventListener('click', function () { if (!room) return; const me = room.list.find(function (x) { return x.uid === room.uid; }); const p = lbPick(false); p.team = me && me.team ? 0 : 1; room.ready = false; TR.Online.send(p); });
  $('lbStart').addEventListener('click', function () { TR.Online.send({ t: 'start' }); });
  $('lbCopy').addEventListener('click', function () {
    const url = location.origin + location.pathname + '?room=' + (room ? room.code : '');
    try { navigator.clipboard.writeText(url); toast('คัดลอกลิงก์แล้ว ส่งให้เพื่อนได้เลย'); } catch (e) { toast(url); }
  });

  /* ---------- ผูกปุ่ม ---------- */
  $('startBtn').addEventListener('click', function () { tutorial = false; if (opt.ban) openBan(); else { banPick = []; startGame(); } });
  $('tutBtn').addEventListener('click', function () { tutorial = true; startGame(); });
  $('againBtn').addEventListener('click', function () { if (online) toMenu(); else startGame(); });
  $('menuBtn').addEventListener('click', toMenu);
  $('surBtn').addEventListener('click', function () {
    if (!g) return;
    g.player.surMsg = '';
    act({ k: 'sur' });
    $('surMsg').textContent = g.player.surMsg || (net ? 'ส่งโหวตแล้ว' : '');
    if (g.over) { paused = false; $('pauseBox').hidden = true; lastTs = performance.now(); handleEvents(); }
  });
  $('pauseBtn').addEventListener('click', togglePause);
  $('resumeBtn').addEventListener('click', togglePause);
  $('quitBtn').addEventListener('click', toMenu);
  $('updBtn').addEventListener('click', showUpdate);
  $('gfxBtn2').addEventListener('click', function () { applyGfx(gfx === '3d' ? '2d' : '3d', true); $('gfxMode2').textContent = gfx === '3d' ? '3D' : '2D คลาสสิก'; });
  $('gfxBtn').addEventListener('click', function () { applyGfx(gfx === '3d' ? '2d' : '3d', true); });
  applyGfx(gfx, false);
  $('updClose').addEventListener('click', closeUpdate);
  window.addEventListener('resize', fit);

  buildMenu(); buildOptRows();
  startTitle();
  fit();
  if (getSeen() !== TR.VERSION) { $('updDot').hidden = false; showUpdate(); }
  requestAnimationFrame(frame);
})();
