/* Spoločné UI prvky: obrázky, dlaždice, tlačidlo "podrž" pre dospelých, ťahanie, navigácia medzi obrazovkami. */
(function () {
  'use strict';
  const AL = window.AL;
  const el = AL.el;

  /** Obrázok položky – fotografia od rodiča, inak vstavaná ilustrácia */
  AL.picture = function (item, opts) {
    opts = opts || {};
    const label = opts.label || item.label || item.name || item.title || item.text || '';
    const wrap = el('div', { class: 'pic' + (opts.cls ? ' ' + opts.cls : '') });
    const url = AL.Media.url(item.photo);
    if (url) {
      wrap.append(el('img', { src: url, alt: label, draggable: 'false' }));
    } else {
      wrap.classList.add('art');
      wrap.innerHTML = AL.Art.svg(item.art || opts.fallback || 'person', label);
    }
    return wrap;
  };

  /** Veľká dotyková dlaždica s obrázkom a popisom */
  AL.tile = function ({ item, label, sub, onClick, cls, picOpts }) {
    const b = el('button', { class: 'tile' + (cls ? ' ' + cls : ''), type: 'button' },
      item ? AL.picture(item, picOpts) : null,
      label ? el('span', { class: 'tile-label' }, label) : null,
      sub ? el('span', { class: 'tile-sub' }, sub) : null);
    if (onClick) b.addEventListener('click', onClick);
    return b;
  };

  /**
   * Tlačidlo pre dospelých: reaguje iba na podržanie (dieťa ho náhodným dotykom nespustí).
   * Počas držania sa pomaly napĺňa krúžok.
   */
  AL.holdButton = function ({ side = 'left', icon = 'home', ms = 1800, hint = 'Podržte', onDone }) {
    const R = 27;
    const CIRC = 2 * Math.PI * R;
    const btn = el('button', { class: `hold-btn ${side}`, type: 'button', 'aria-label': hint });
    btn.innerHTML = `<svg class="ring" viewBox="0 0 60 60" aria-hidden="true"><circle class="track" cx="30" cy="30" r="${R}"/>` +
      `<circle class="fill" cx="30" cy="30" r="${R}" stroke-dasharray="${CIRC}" stroke-dashoffset="${CIRC}"/></svg>` +
      `<span class="ico">${AL.Icon(icon)}</span><span class="hold-hint">${AL.escape(hint)}</span>`;
    const fill = btn.querySelector('.fill');
    let start = 0, raf = 0, hintT = 0, active = false;
    const tick = () => {
      const p = Math.min(1, (performance.now() - start) / ms);
      fill.style.strokeDashoffset = CIRC * (1 - p);
      if (p >= 1) { cancel(); onDone(); return; }
      raf = requestAnimationFrame(tick);
    };
    const begin = (e) => {
      if (active) return;
      e && e.preventDefault();
      active = true;
      start = performance.now();
      btn.classList.add('holding', 'show-hint');
      clearTimeout(hintT);
      raf = requestAnimationFrame(tick);
      if (e && e.pointerId !== undefined) { try { btn.setPointerCapture(e.pointerId); } catch (err) { /* nič */ } }
    };
    const cancel = () => {
      if (!active) return;
      active = false;
      cancelAnimationFrame(raf);
      btn.classList.remove('holding');
      fill.style.strokeDashoffset = CIRC;
      hintT = setTimeout(() => btn.classList.remove('show-hint'), 1400);
    };
    btn.addEventListener('pointerdown', begin);
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => btn.addEventListener(ev, cancel));
    btn.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) begin(e); });
    btn.addEventListener('keyup', (e) => { if (e.key === 'Enter' || e.key === ' ') cancel(); });
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
    return btn;
  };

  /**
   * Potiahnutie prvku na cieľ (napr. karta na pásku). Krátky dotyk bez pohybu = onTap.
   * Cieľ má veľkorysý okraj, aby to zvládli aj deti s jemnou motorikou v rozvoji.
   */
  AL.draggable = function (node, { getTarget, onDrop, onTap, onMiss }) {
    node.style.touchAction = 'none';
    let st = null;
    const MARGIN = 40;
    const isOver = (t, x, y, ghost) => {
      if (!t) return false;
      const r = t.getBoundingClientRect();
      const inR = (px, py) => px > r.left - MARGIN && px < r.right + MARGIN && py > r.top - MARGIN && py < r.bottom + MARGIN;
      if (inR(x, y)) return true;
      if (ghost) {
        const g = ghost.getBoundingClientRect();
        return inR(g.left + g.width / 2, g.top + g.height / 2);
      }
      return false;
    };
    node.addEventListener('pointerdown', (e) => {
      if ((e.button && e.button !== 0) || st) return;
      st = { id: e.pointerId, x: e.clientX, y: e.clientY, r: node.getBoundingClientRect(), dragging: false, ghost: null };
      try { node.setPointerCapture(e.pointerId); } catch (err) { /* nič */ }
    });
    node.addEventListener('pointermove', (e) => {
      if (!st || e.pointerId !== st.id) return;
      const dx = e.clientX - st.x, dy = e.clientY - st.y;
      if (!st.dragging && Math.hypot(dx, dy) > 14) {
        st.dragging = true;
        const g = node.cloneNode(true);
        g.classList.add('drag-ghost');
        Object.assign(g.style, { left: st.r.left + 'px', top: st.r.top + 'px', width: st.r.width + 'px', height: st.r.height + 'px' });
        document.body.append(g);
        st.ghost = g;
        node.classList.add('drag-origin');
      }
      if (st.dragging) {
        st.ghost.style.transform = `translate(${dx}px, ${dy}px) scale(1.03)`;
        const t = getTarget();
        t && t.classList.toggle('drop-hover', isOver(t, e.clientX, e.clientY, st.ghost));
      }
    });
    const end = (e, cancelled) => {
      if (!st || e.pointerId !== st.id) return;
      const s = st;
      st = null;
      const t = getTarget();
      t && t.classList.remove('drop-hover');
      if (!s.dragging) { if (!cancelled && onTap) onTap(); return; }
      if (!cancelled && isOver(t, e.clientX, e.clientY, s.ghost)) {
        s.ghost.remove();
        node.classList.remove('drag-origin');
        onDrop();
      } else {
        s.ghost.classList.add('returning');
        s.ghost.style.transform = 'translate(0, 0)';
        setTimeout(() => { s.ghost.remove(); node.classList.remove('drag-origin'); onMiss && onMiss(); }, 400);
      }
    };
    node.addEventListener('pointerup', (e) => end(e, false));
    node.addEventListener('pointercancel', (e) => end(e, true));
  };

  /** Jemné navedenie na správnu možnosť (pomalé modré pulzovanie, bez zvuku chyby) */
  AL.hint = function (node) {
    if (!node) return;
    node.classList.remove('hint-pulse');
    void node.offsetWidth;
    node.classList.add('hint-pulse');
    setTimeout(() => node.classList.remove('hint-pulse'), 5600);
  };

  /** Pokojný panel "Hotovo" */
  AL.donePanel = function ({ title, text, actions }) {
    return el('div', { class: 'done-panel' },
      el('div', { class: 'done-mark', html: AL.Icon('bigCheck').replace('stroke="currentColor"', 'stroke="#7FA88B"') }),
      el('h2', null, title),
      text ? el('p', null, text) : null,
      actions && actions.length ? el('div', { class: 'row' }, actions.map((a) =>
        AL.tile({ item: a.item, label: a.label, onClick: a.onClick, cls: 'small' }))) : null);
  };

  /**
   * Obrazovka zostane zapnutá (napr. počas čakania alebo prehrávania zvuku).
   * Vráti funkciu, ktorá obrazovku opäť uvoľní; pri odchode z obrazovky sa uvoľní automaticky.
   */
  AL.keepAwake = function (scope) {
    let lock = null;
    let active = true;
    const request = async () => {
      if (!active || !navigator.wakeLock || document.visibilityState !== 'visible') return;
      try { lock = await navigator.wakeLock.request('screen'); } catch (e) { /* nepodporované / nepovolené */ }
      if (!active && lock) { try { lock.release(); } catch (e) { /* nič */ } lock = null; }
    };
    const onVis = () => request();
    document.addEventListener('visibilitychange', onVis);
    const release = () => {
      if (!active) return;
      active = false;
      document.removeEventListener('visibilitychange', onVis);
      if (lock) { try { lock.release(); } catch (e) { /* nič */ } lock = null; }
    };
    request();
    if (scope) scope.add(release);
    return release;
  };

  /* ---------- Navigácia ---------- */
  let current = null;

  AL.go = function (name, params) {
    const screen = AL.screens[name];
    if (!screen) return;
    if (current) {
      current.scope.dispose();
      try { current.cleanup && current.cleanup(); } catch (e) { console.warn(e); }
    }
    AL.Speech.stop();
    const stage = document.getElementById('stage');
    stage.innerHTML = '';
    document.querySelectorAll('.drag-ghost').forEach((g) => g.remove());
    const isParent = !!screen.adult;
    document.body.classList.toggle('parent-mode', isParent);
    document.body.classList.toggle('child', !isParent);
    const scope = new AL.Scope();
    const root = el('section', { class: `screen screen-${name}` });
    if (isParent) root.className = 'pz-screen';
    stage.append(root);
    if (!isParent && name !== 'home') {
      stage.append(AL.holdButton({ side: 'left', icon: 'home', hint: 'Podržte pre návrat', onDone: () => AL.go('home') }));
    }
    const cleanup = screen.render(root, params || {}, scope);
    current = { name, scope, cleanup };
    window.scrollTo(0, 0);
  };

  AL.applySettings = function () {
    document.body.classList.toggle('reduce-motion', !!AL.Config.s.reduceMotion);
  };

  // Na detských obrazovkách žiadne kontextové menu pri dlhom podržaní
  document.addEventListener('contextmenu', (e) => {
    if (!document.body.classList.contains('parent-mode')) e.preventDefault();
  });

  /* Android: systémové „Späť" (tlačidlo alebo potiahnutie od okraja obrazovky) by aplikáciu zavrelo.
     Pri dotykoch si udržiavame zásobu až 3 „poistných" záznamov v histórii – každé „Späť" jeden spotrebuje
     a obrazovka ostane. Hĺbku nesie samotný záznam (history.state), takže sa nemôže rozísť so skutočnosťou.
     Prehliadač rešpektuje len záznamy vytvorené hneď po dotyku používateľa, preto pridávame pri pointerup/keydown
     (pointerup je pri dotyku udalosť, ktorá prehliadaču potvrdí aktivitu), nikdy nie v popstate. */
  const armBackGuard = () => {
    const depth = (history.state && history.state.autilab) || 0;
    if (depth >= 3) return;
    try { history.pushState({ autilab: depth + 1 }, ''); } catch (e) { /* nič */ }
  };
  window.addEventListener('pointerup', armBackGuard, true);
  window.addEventListener('keydown', armBackGuard, true);

  /* Inštalácia na plochu (Android Chrome): vlastné tlačidlo v Rodičovskej zóne namiesto vyskakovacieho pásu */
  AL.isInstalled = () => window.matchMedia('(display-mode: fullscreen)').matches || window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  AL.installPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); AL.installPrompt = e; });
  window.addEventListener('appinstalled', () => { AL.installPrompt = null; });
  AL.isAndroid = /Android/i.test(navigator.userAgent);
})();
