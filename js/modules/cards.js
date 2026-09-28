/* 7. Kartotéka – dieťa listuje „knihou" kategórií (1 kategória = 1 alebo viac strán) a vyberá si obrázok.
   Ťuk na obrázok: obrázok sa plynulo zväčší a zaznie jeho názov (nahrávka rodiča alebo hlas).
   Nie je to úloha so správnou odpoveďou – žiadna pochvala ani zvonček, len pokojné zopakovanie názvu. */
(function () {
  'use strict';
  const AL = window.AL;
  const el = AL.el;

  // kde dieťa skončilo (platí počas behu aplikácie) – po návrate z domova pokračuje na tej istej strane
  let pos = null;

  const upper = (s) => String(s || '').toLocaleUpperCase('sk');
  const CHEVRON = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;

  // obrázok, ktorý rodič ešte nedokončil (bez fotky či ilustrácie, alebo bez názvu aj nahrávky), dieťa neuvidí –
  // inak by videlo prázdny fotoaparát a po ťuknutí ticho
  const hasPicture = (x) => AL.Media.has(x.photo) || (!!x.art && x.art !== 'placeholder');
  const ready = (it) => hasPicture(it) && (!!(it.name || '').trim() || !!it.audio);
  AL.cardsReady = ready;

  /** Kniha: aktívne kategórie s aspoň jedným hotovým obrázkom, rozdelené na strany po perPage */
  function buildBook(cfg) {
    const per = AL.clamp(Math.round(cfg.perPage) || 6, 2, 12);
    const lib = new Map((cfg.library || []).map((i) => [i.id, i]));
    const pages = [];
    const cats = (cfg.categories || []).filter((c) => c.active !== false).map((c) => {
      const items = [...new Set(c.items || [])].map((id) => lib.get(id)).filter((it) => it && ready(it));
      // kategória bez vlastného obrázka sa na prepínači ukáže prvým obrázkom zo svojho zoznamu
      return { cat: c, items, cover: hasPicture(c) ? c : items[0] };
    }).filter((c) => c.items.length);
    cats.forEach((c, ci) => {
      c.first = pages.length;
      c.count = Math.ceil(c.items.length / per);
      for (let p = 0; p < c.count; p++) pages.push({ ci, p, items: c.items.slice(p * per, (p + 1) * per) });
    });
    return { per, cats, pages, multi: cats.some((c) => c.count > 1) };
  }

  /** Zmenší písmo, kým sa text nezmestí do jedného riadku (potom ho ešte skráti trojbodka) */
  function fitText(node, base, minRatio) {
    node.style.fontSize = base + 'px';
    let f = base;
    while (node.scrollWidth > node.clientWidth + 1 && f > base * minRatio) {
      f -= base * 0.06;
      node.style.fontSize = f + 'px';
    }
  }

  /** Najväčšie štvorcové políčka pre n obrázkov v oblasti W×H (extra = okraj dlaždice, lab = výška názvu) */
  function bestFit(n, W, H, g, extraOf, lab) {
    let best = { q: 0, cols: n, rows: 1 };
    for (let cols = 1; cols <= n; cols++) {
      const rows = Math.ceil(n / cols);
      if ((cols - 1) * rows >= n) continue; // prázdny stĺpec navyše nemá zmysel
      const cw = (W - g * (cols - 1)) / cols, ch = (H - g * (rows - 1)) / rows;
      const q = Math.min(cw - extraOf(cw), ch - lab - extraOf(cw));
      if (q > best.q + 0.5) best = { q, cols, rows };
    }
    return best;
  }

  function run(root, scope, book) {
    const cfg = AL.Config.data.cards;
    const stage = document.getElementById('stage');
    const { per, cats, pages } = book;
    const rm = () => !!AL.Config.s.reduceMotion || !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    let cur = 0, shown = -1, swapT = 0, zoom = null, closedAt = 0, geo = null, introT = 0;

    // pokračovať tam, kde dieťa skončilo
    if (pos) {
      const c = cats.find((x) => x.cat.id === pos.cat);
      // pamätáme si poradie prvého obrázka strany – po zmene počtu obrázkov na strane dieťa uvidí tie isté obrázky
      if (c) cur = c.first + Math.min(c.count - 1, Math.floor((pos.item || 0) / per));
    }

    root.classList.add('cards-screen');
    const titleBtn = el('button', { class: 'cards-title-btn', type: 'button' });
    const title = el('h1', { class: 'cards-title' }, titleBtn);
    const grid = el('div', { class: 'cards-grid' });
    const pageStage = el('div', { class: 'cards-stage' }, grid);
    const prev = el('button', { class: 'cards-arrow prev', type: 'button', 'aria-label': 'Predchádzajúca strana', html: CHEVRON('M15 4.5L7.5 12l7.5 7.5') });
    const next = el('button', { class: 'cards-arrow next', type: 'button', 'aria-label': 'Ďalšia strana', html: CHEVRON('M9 4.5l7.5 7.5L9 19.5') });
    const dots = el('div', { class: 'cards-dots', 'aria-hidden': 'true' });
    const main = el('div', { class: 'cards-main' }, pageStage, dots);
    const arrows = pages.length > 1;
    if (arrows) main.append(prev, next);
    root.append(title, main);

    let bar = null, barTiles = [];
    if (cats.length > 1) {
      bar = el('div', { class: 'cards-bar' });
      barTiles = cats.map((c, ci) => {
        const b = el('button', { class: 'cards-cat', type: 'button', 'aria-label': c.cat.name },
          AL.picture(c.cover, { label: c.cat.name }), el('span', { class: 'cards-cat-name' }, upper(c.cat.name)));
        b.addEventListener('click', () => {
          if (zoom || swapT) return;
          AL.Sound.tap();
          if (pages[cur].ci === ci) { clearTimeout(introT); introT = 0; sayCat(ci); } else goTo(c.first);
        });
        bar.append(b);
        return b;
      });
      root.append(bar);
    }

    const sayCat = (ci) => { const c = cats[ci].cat; AL.Speech.say(c.name, c.audio); };
    titleBtn.addEventListener('click', () => { if (!zoom) { clearTimeout(introT); introT = 0; sayCat(pages[cur].ci); } });
    // počas prelínania ďalší ťuk ignorujeme – rýchle dvojité ťuknutie by preskočilo stranu, ktorú dieťa nevidelo
    prev.addEventListener('click', () => { if (cur > 0 && !zoom && !swapT) { AL.Sound.tap(); goTo(cur - 1); } });
    next.addEventListener('click', () => { if (cur < pages.length - 1 && !zoom && !swapT) { AL.Sound.tap(); goTo(cur + 1); } });

    /* ---------- Rozloženie (pri každej zmene veľkosti / otočení) ---------- */
    function layout() {
      const vw = window.innerWidth, vh = window.innerHeight, vmin = Math.min(vw, vh);
      const g = Math.round(AL.clamp(vmin * 0.022, 10, 24));
      root.style.setProperty('--cg', g + 'px');
      const cs = getComputedStyle(root);
      const W = root.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);

      // lišta kategórií: do 7 kategórií jeden riadok, pri viacerých (alebo úzkej obrazovke) dva
      if (bar) {
        const n = cats.length, bg = Math.round(g * 0.7);
        let bp = Math.round(AL.clamp(vh * 0.085, 40, 84));
        let rows = 1, cols = n;
        let bw = Math.min(bp * 1.9, (W - bg * (cols - 1)) / cols);
        if (n > 7 || bw < 58) {
          rows = 2; cols = Math.ceil(n / 2);
          bw = Math.min(bp * 1.9, (W - bg * (cols - 1)) / cols);
          bp = Math.round(bp * 0.82);
        }
        bp = Math.floor(Math.max(28, Math.min(bp, bw - 16)));
        const bf = Math.round(AL.clamp(bp * 0.2, 11, 17));
        bar.style.setProperty('--cbw', Math.floor(bw) + 'px');
        bar.style.setProperty('--cbp', bp + 'px');
        bar.style.setProperty('--cbf', bf + 'px');
        bar.classList.toggle('tight', bw < 84); // úzke dlaždice: bez rozostupu písmen, nech sa názov zmestí
        bar.style.gap = bg + 'px';
        bar.style.maxWidth = Math.ceil(cols * Math.floor(bw) + (cols - 1) * bg) + 2 + 'px';
      }

      // šípky po stranách; na úzkej obrazovke na výšku radšej pod obrázkami (obrázky budú väčšie)
      const A = Math.round(AL.clamp(vmin * 0.1, 64, 92));
      const dh = book.multi ? 14 : 0;
      const extraOf = (cw) => 2 * Math.round(AL.clamp(cw * 0.035, 4, 12)) + 6;
      const mw = main.clientWidth, mh = main.clientHeight;
      const fitFor = (lab) => {
        const side = bestFit(per, mw - (arrows ? 2 * (A + g) : 0), mh - (dh ? dh + g : 0), g, extraOf, lab);
        const below = arrows && vh > vw ? bestFit(per, mw, mh - A - g, g, extraOf, lab) : null;
        return below && below.q > side.q * 1.08 ? { ...below, below: true } : side;
      };
      let lf = cfg.showNames ? Math.round(AL.clamp(vmin * 0.03, 15, 28)) : 0;
      let lab = lf ? Math.ceil(lf * 1.25) + 6 : 0;
      let fit = fitFor(lab);
      // nízka obrazovka (telefón na šírku): radšej bez názvov pod obrázkami, nech sú obrázky čitateľné.
      // Na tablete názvy vždy ostávajú (rodič ich zapol) – vypnú sa len pri malých obrázkoch.
      if (lab && fit.q < 100) {
        const alt = fitFor(0);
        if (alt.q > fit.q && (fit.q < 64 || alt.q > fit.q * 1.2)) { fit = alt; lf = 0; lab = 0; }
      }
      const useBelow = !!fit.below;
      root.classList.toggle('cards-below', useBelow);
      grid.classList.toggle('no-names', !lf);

      // rovnaká veľkosť a pozície políčok na každej strane každej kategórie (závisí len od perPage);
      // nikdy nie väčšie, ako sa zmestí – inak by obrázky a šípka vyšli mimo obrazovky
      const q = Math.max(16, Math.floor(Math.min(fit.q, 380)));
      const tp = Math.round(AL.clamp(q * 0.035, 4, 12));
      const cw = q + 2 * tp + 6;
      const gw = fit.cols * cw + (fit.cols - 1) * g;
      // šípky tesne pri obrázkoch, nie až pri okraji obrazovky
      dots.style.display = dh || useBelow ? '' : 'none';
      if (!arrows) {
        main.style.gridTemplateColumns = gw + 'px';
        main.style.gridTemplateRows = dh ? `minmax(0, 1fr) ${dh}px` : 'minmax(0, 1fr)';
        main.style.gridTemplateAreas = dh ? '"stage" "dots"' : '"stage"';
      } else if (useBelow) {
        main.style.gridTemplateColumns = `${A}px ${Math.max(20, gw - 2 * (A + g))}px ${A}px`;
        main.style.gridTemplateRows = `minmax(0, 1fr) ${A}px`;
        main.style.gridTemplateAreas = '"stage stage stage" "prev dots next"';
      } else {
        main.style.gridTemplateColumns = `${A}px ${gw}px ${A}px`;
        main.style.gridTemplateRows = dh ? `minmax(0, 1fr) ${dh}px` : 'minmax(0, 1fr)';
        main.style.gridTemplateAreas = dh ? '"prev stage next" ". dots ."' : '"prev stage next"';
      }
      main.style.gap = g + 'px';
      root.style.setProperty('--arrow', A + 'px');
      grid.style.gridTemplateColumns = `repeat(${fit.cols}, ${cw}px)`;
      grid.style.gridTemplateRows = `repeat(${fit.rows}, ${cw + lab}px)`;
      grid.style.gap = g + 'px';
      grid.style.setProperty('--q', q + 'px');
      grid.style.setProperty('--tp', tp + 'px');
      grid.style.setProperty('--lf', lf + 'px');
      geo = { lf };
      fitAll();
      if (zoom) sizeZoom();
    }

    function fitAll() {
      if (!geo) return;
      const tf = Math.round(AL.clamp(Math.min(window.innerWidth, window.innerHeight) * 0.075, 28, 64));
      fitText(titleBtn, tf, 0.5);
      if (geo.lf) grid.querySelectorAll('.cards-name').forEach((n) => fitText(n, geo.lf, 0.72));
      barTiles.forEach((b) => { const n = b.lastChild; n.style.fontSize = ''; const f = parseFloat(getComputedStyle(n).fontSize); fitText(n, f, 0.7); });
    }

    /* ---------- Strana ---------- */
    function paint() {
      const page = pages[cur], c = cats[page.ci];
      shown = cur;
      pos = { cat: c.cat.id, item: page.p * per };
      titleBtn.textContent = upper(c.cat.name);
      titleBtn.setAttribute('aria-label', c.cat.name);
      grid.innerHTML = '';
      for (let i = 0; i < per; i++) {
        const it = page.items[i];
        if (!it) { grid.append(el('div', { class: 'cards-tile empty', 'aria-hidden': 'true' })); continue; }
        const t = el('button', { class: 'cards-tile', type: 'button', 'aria-label': it.name || 'Obrázok' },
          AL.picture(it, { label: it.name || 'Obrázok' }),
          cfg.showNames ? el('span', { class: 'cards-name' }, it.name || '') : null);
        t.addEventListener('click', () => openZoom(it, c.cat, t));
        grid.append(t);
      }
      dots.innerHTML = '';
      if (c.count > 1) for (let p = 0; p < c.count; p++) dots.append(el('span', { class: p === page.p ? 'on' : null }));
      prev.style.visibility = cur > 0 ? '' : 'hidden';
      next.style.visibility = cur < pages.length - 1 ? '' : 'hidden';
      barTiles.forEach((b, i) => b.classList.toggle('on', i === page.ci));
      fitAll();
    }

    // jemné prelínanie (bez posúvania); pri obmedzenom pohybe okamžite
    function goTo(i) {
      i = AL.clamp(i, 0, pages.length - 1);
      // úvodný názov kategórie ešte nezaznel → povieme ho po prelistovaní (aj keď kategória ostala rovnaká)
      const introPending = !!introT;
      clearTimeout(introT);
      introT = 0;
      if (i === cur && shown === cur) return;
      const before = pages[shown] ? pages[shown].ci : -1;
      cur = i;
      const swap = () => {
        swapT = 0;
        if (scope.dead) return;
        paint();
        root.classList.remove('cards-swap');
        if (cfg.sayCategory && (pages[cur].ci !== before || introPending)) sayCat(pages[cur].ci);
      };
      if (rm()) { swap(); return; }
      root.classList.add('cards-swap');
      if (!swapT) swapT = scope.timeout(swap, 260);
    }

    /* ---------- Zväčšený obrázok ---------- */
    function logPick(it, cat) {
      const picks = cfg.picks || (cfg.picks = []);
      const now = Date.now();
      for (let i = picks.length - 1; i >= 0 && now - picks[i].at < 5000; i--) if (picks[i].id === it.id) return;
      picks.push({ id: it.id, cat: cat.id, at: now });
      if (picks.length > 400) picks.splice(0, picks.length - 400);
      AL.Config.save();
    }

    function sizeZoom() {
      const vw = window.innerWidth, vh = window.innerHeight;
      const nf = Math.round(AL.clamp(Math.min(vw, vh) * 0.075, 30, 72));
      const nameH = zoom.name ? Math.ceil(nf * 1.3) + 16 : 0;
      const zs = Math.floor(Math.min(vw * 0.92, (vh - nameH) * 0.92, 900));
      zoom.pic.style.width = zoom.pic.style.height = zs + 'px';
      if (zoom.name) { zoom.name.style.maxWidth = Math.floor(vw * 0.92) + 'px'; fitText(zoom.name, nf, 0.5); }
    }

    // posun + zmenšenie, ktoré položí zväčšený obrázok presne na obrázok v dlaždici
    const flip = (from, to) => `translate(${from.left + from.width / 2 - (to.left + to.width / 2)}px, ${from.top + from.height / 2 - (to.top + to.height / 2)}px) scale(${from.width / to.width})`;

    function openZoom(it, cat, tile) {
      // počas zatvárania predchádzajúceho obrázka už ďalší ťuk platí (okrem 250 ms po ťuku, ktorý zatváral – dvojitý ťuk)
      if ((zoom && !zoom.closing) || performance.now() - closedAt < 250 || root.classList.contains('cards-swap')) return;
      clearTimeout(introT); // úvodné „JEDLO" nesmie prerušiť názov obrázka
      introT = 0;
      AL.Speech.say(it.name || '', it.audio);
      logPick(it, cat);
      const pic = el('div', { class: 'cards-zoom-pic' }, AL.picture(it, { label: it.name || 'Obrázok' }));
      const name = cfg.zoomName && (it.name || '').trim() ? el('div', { class: 'cards-zoom-name' }, it.name) : null;
      const ov = el('div', { class: 'cards-zoom' }, el('div', { class: 'cards-zoom-bg' }), el('div', { class: 'cards-zoom-body' }, pic, name));
      const z = zoom = { ov, pic, name, tile, at: performance.now(), timer: 0 };
      stage.append(ov);
      sizeZoom();
      const from = tile.querySelector('.pic').getBoundingClientRect();
      tile.style.visibility = 'hidden';
      if (!rm()) {
        pic.style.transition = 'none';
        pic.style.transform = flip(from, pic.getBoundingClientRect());
        void pic.offsetWidth;
        pic.style.transition = '';
        pic.style.transform = '';
      }
      ov.classList.add('in');
      // dvojitý ťuk nesmie obrázok hneď zavrieť
      ov.addEventListener('click', () => { if (performance.now() - z.at >= 500) closeZoom(); });
      const secs = +cfg.autoClose || 0;
      if (secs > 0) z.timer = scope.timeout(closeZoom, secs * 1000);
    }

    function closeZoom() {
      if (!zoom || zoom.closing) return;
      const z = zoom;
      z.closing = true;
      closedAt = performance.now();
      clearTimeout(z.timer);
      if (!rm() && z.tile.isConnected) z.pic.style.transform = flip(z.tile.querySelector('.pic').getBoundingClientRect(), z.pic.getBoundingClientRect());
      z.ov.classList.remove('in');
      z.ov.classList.add('out'); // .out prepúšťa dotyky na obrázky pod ním
      scope.timeout(() => {
        z.ov.remove();
        if (zoom === z) zoom = null;
        if (!zoom || zoom.tile !== z.tile) z.tile.style.visibility = '';
      }, rm() ? 20 : 480);
    }

    scope.add(() => { if (zoom) zoom.ov.remove(); zoom = null; });
    scope.on(window, 'resize', layout);

    paint();
    layout();
    if (cfg.sayCategory) introT = scope.timeout(() => sayCat(pages[cur].ci), 400);
  }

  AL.screens.cards = {
    render(root, params, scope) {
      const book = buildBook(AL.Config.data.cards || {});
      if (!book.pages.length) {
        root.append(el('h1', { class: 'screen-title' }, 'Zatiaľ tu nie sú obrázky'),
          el('p', { class: 'screen-sub' }, 'Rodič pridá obrázky v Rodičovskej zóne → Kartotéka.'));
        return;
      }
      run(root, scope, book);
    },
  };
})();
