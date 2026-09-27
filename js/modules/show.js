/* 6. Ukáž – dieťa počuje názov (nahratý hlasom rodiča) a ťukne na správny obrázok.
   Správne: obrázok sa zväčší na celú obrazovku a zopakuje sa názov („Správne, pes").
   Nesprávne: „Nesprávne" + zopakovanie zadania a obrázky sa premiešajú (správny vždy na inú pozíciu). */
(function () {
  'use strict';
  const AL = window.AL;
  const el = AL.el;

  const PHRASES = { where: 'Kde je', show: 'Ukáž', correct: 'Správne', correctThisIs: 'Správne, to je', wrong: 'Nesprávne' };
  AL.SHOW_PHRASES = PHRASES;

  // obrázok bez názvu aj bez nahrávky by dieťa nemalo ako nájsť – vynecháme ho
  const playable = (set) => set.items.filter((i) => (i.name || '').trim() || i.audio);
  // viac fotiek s rovnakým názvom (napr. tri rôzne psy) je jeden pojem – nikdy nesmú byť naraz na obrazovke
  const keyOf = (i) => (i.name || '').trim().toLocaleLowerCase('sk') || '#' + i.id;
  const distinct = (items) => new Set(items.map(keyOf)).size;
  const usableSets = () => AL.Config.data.show.sets
    .map((s) => ({ id: s.id, name: s.name, items: playable(s) }))
    .filter((s) => distinct(s.items) >= 2);
  const maxCount = (set) => Math.min(6, distinct(set.items));

  const ph = (cfg, k) => ({ text: PHRASES[k], audio: cfg.phrases[k] });
  const nm = (item) => ({ text: item.name, audio: item.audio });

  function promptSpeech(cfg, item) {
    if (cfg.prompt === 'where') return AL.Speech.sequence([ph(cfg, 'where'), nm(item)], `Kde je ${item.name}?`);
    if (cfg.prompt === 'show') return AL.Speech.sequence([ph(cfg, 'show'), nm(item)], `Ukáž ${item.name}.`);
    return AL.Speech.say(item.name, item.audio);
  }
  function promptText(cfg, item) {
    if (cfg.prompt === 'where') return `Kde je ${item.name}?`;
    if (cfg.prompt === 'show') return `Ukáž ${item.name}`;
    return item.name;
  }
  function correctSpeech(cfg, item) {
    if (cfg.correct === 'thisIs') return AL.Speech.sequence([ph(cfg, 'correctThisIs'), nm(item)], `Správne, to je ${item.name}.`);
    return AL.Speech.sequence([ph(cfg, 'correct'), nm(item)], `Správne, ${item.name}.`);
  }

  /* ---------- Výber skupiny a počtu obrázkov (pred každým spustením) ---------- */
  function setup(root, sets) {
    const cfg = AL.Config.data.show;
    let set = sets.find((s) => s.id === cfg.setId) || sets[0];
    let count = AL.clamp(cfg.count || 3, 2, maxCount(set));

    root.append(el('h1', { class: 'screen-title' }, 'Ukáž'));
    const wrap = el('div', { class: 'timer-setup' });

    const countBox = el('div', { class: 'setup-options' });
    const paintCounts = () => {
      countBox.innerHTML = '';
      count = AL.clamp(count, 2, maxCount(set));
      for (let n = 2; n <= maxCount(set); n++) {
        const b = AL.tile({ label: String(n), cls: 'small text-only', onClick: () => { count = n; paintCounts(); AL.Sound.tap(); } });
        b.classList.toggle('selected', n === count);
        countBox.append(b);
      }
    };

    if (sets.length > 1) {
      const box = el('div', { class: 'setup-options' });
      const tiles = sets.map((s) => {
        const b = AL.tile({
          item: s.items[0], label: s.name, cls: 'small',
          onClick: () => { set = s; tiles.forEach((t) => t.classList.toggle('selected', t === b)); paintCounts(); AL.Sound.tap(); },
        });
        b.classList.toggle('selected', s === set);
        box.append(b);
        return b;
      });
      wrap.append(el('div', { class: 'setup-row' }, el('h3', null, 'Skupina obrázkov'), box));
    }
    paintCounts();
    wrap.append(el('div', { class: 'setup-row' }, el('h3', null, 'Počet obrázkov'), countBox));

    const start = el('button', { class: 'tile start-tile', type: 'button' }, el('span', { html: AL.Icon('play') }), el('span', { class: 'tile-label' }, 'Začať'));
    start.addEventListener('click', () => {
      cfg.setId = set.id;
      cfg.count = count;
      AL.Config.save();
      AL.go('show', { run: true, setId: set.id, count });
    });
    wrap.append(start);
    root.append(wrap);
  }

  /* ---------- Hra ---------- */
  function game(root, set, count, scope) {
    const cfg = AL.Config.data.show;
    const items = set.items;
    const total = AL.clamp(cfg.rounds || 10, 1, 50);
    const stage = document.getElementById('stage');
    let trial = 0, firstTry = 0, errors = 0, locked = true;
    let target = null, lastTarget = null, lastPos = -1, options = [], queue = [];
    let promptTimer = 0;
    const errorsBy = {};
    const nodes = new Map();

    root.classList.add('show-screen');
    const replay = el('button', { class: 'replay', type: 'button', 'aria-label': 'Zopakovať zadanie', html: AL.Icon('volHigh') });
    const qText = el('span', { class: 'q' });
    const top = el('div', { class: 'faces-prompt show-top' }, qText, replay);
    const grid = el('div', { class: 'show-grid' });
    const dots = el('div', { class: 'progress-dots', 'aria-hidden': 'true' });
    for (let i = 0; i < total; i++) dots.append(el('span'));
    root.append(top, grid, dots);

    const sayPrompt = () => promptSpeech(cfg, target);
    replay.addEventListener('click', () => { if (!locked) sayPrompt(); });

    // každý obrázok príde na rad rovnako často, ten istý nie dvakrát po sebe
    const nextTarget = () => {
      if (!queue.length) {
        queue = AL.shuffle(items);
        if (queue.length > 1 && lastTarget && keyOf(queue[0]) === keyOf(lastTarget)) queue.push(queue.shift());
      }
      return queue.shift();
    };

    /* Pozícia správneho obrázka:
       - po chybe sa vždy presunie inam (obrázky sa premiešajú),
       - v novej úlohe pri 3+ obrázkoch nikdy nie je tam, kde bol naposledy,
       - pri 2 obrázkoch je náhodná, ale najviac 2× po sebe na tej istej strane
         (prísne striedanie vľavo/vpravo by sa dalo uhádnuť bez počúvania). */
    const finals = []; // pozície, na ktorých dieťa správny obrázok našlo
    const place = (pos) => {
      const others = AL.shuffle(options.filter((o) => o !== target));
      others.splice(pos, 0, target);
      options = others;
      lastPos = pos;
    };
    const arrangeNew = () => {
      const n = options.length;
      let pos;
      if (n >= 3) pos = AL.sample([...Array(n).keys()].filter((p) => p !== lastPos));
      else {
        pos = Math.random() < 0.5 ? 0 : 1;
        const k = finals.length;
        if (k >= 2 && finals[k - 1] === pos && finals[k - 2] === pos) pos = 1 - pos;
      }
      place(pos);
    };
    const arrangeAfterMistake = () => {
      const positions = [...Array(options.length).keys()].filter((p) => p !== lastPos);
      place(AL.sample(positions.length ? positions : [0]));
    };

    // „nesprávne" obrázky: len iné pojmy (iný názov), z každého jeden náhodný obrázok
    const pickDistractors = () => {
      const groups = new Map();
      items.forEach((i) => {
        const k = keyOf(i);
        if (k === keyOf(target)) return;
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(i);
      });
      return AL.shuffle([...groups.values()]).slice(0, count - 1).map((g) => AL.sample(g));
    };

    // najväčšie štvorcové dlaždice, ktoré sa zmestia (na výšku aj na šírku, tablet aj PC)
    const layout = () => {
      const n = options.length;
      if (!n) return;
      const gap = parseFloat(getComputedStyle(grid).columnGap) || 24;
      const cs = getComputedStyle(root);
      const W = root.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const H = window.innerHeight - grid.getBoundingClientRect().top - dots.offsetHeight - parseFloat(cs.paddingBottom) - parseFloat(cs.rowGap || 0);
      let best = { size: 0, cols: n };
      for (let cols = 1; cols <= n; cols++) {
        const rows = Math.ceil(n / cols);
        const size = Math.min((W - gap * (cols - 1)) / cols, (H - gap * (rows - 1)) / rows);
        if (size > best.size + 0.5) best = { size, cols };
      }
      const size = Math.max(90, Math.min(420, Math.floor(best.size)));
      grid.style.setProperty('--cols', best.cols);
      grid.style.setProperty('--size', size + 'px');
      // obmedzená šírka → riadky sa zalomia podľa zvoleného počtu stĺpcov a posledný riadok je v strede
      grid.style.maxWidth = best.cols * size + (best.cols - 1) * gap + 1 + 'px';
    };
    scope.on(window, 'resize', layout);

    const renderGrid = () => {
      grid.innerHTML = '';
      nodes.clear();
      options.forEach((o) => {
        const t = AL.tile({ item: o, cls: 'show-tile', picOpts: { label: 'Obrázok' } });
        t.dataset.item = o.id;
        t.addEventListener('click', () => choose(o, t));
        nodes.set(o, t);
        grid.append(t);
      });
      layout();
    };

    const paintDots = () => [...dots.children].forEach((d, i) => d.classList.toggle('on', i < trial));

    function newTrial() {
      target = nextTarget();
      lastTarget = target;
      errors = 0;
      options = [target, ...pickDistractors()];
      arrangeNew();
      renderGrid();
      // bez nahrávky a bez slovenského hlasu aspoň text (pre dospelého / čítajúce dieťa)
      qText.textContent = !target.audio && !AL.Speech.canSpeak() ? promptText(cfg, target) : '';
      locked = false;
      promptTimer = scope.timeout(sayPrompt, 450);
    }

    async function choose(o, t) {
      if (locked) return;
      locked = true;
      clearTimeout(promptTimer);
      AL.Speech.stop();

      if (o === target) {
        if (errors === 0) firstTry++;
        finals.push(lastPos);
        await celebrate(t, o);
        if (scope.dead) return;
        trial++;
        paintDots();
        if (trial >= total) finish(); else newTrial();
        return;
      }

      errors++;
      errorsBy[target.name] = (errorsBy[target.name] || 0) + 1;
      if (cfg.wrongSay) await AL.Speech.say('Nesprávne.', cfg.phrases.wrong);
      if (scope.dead) return;
      grid.classList.add('shuffling');
      await AL.sleep(AL.Config.s.reduceMotion ? 20 : 300);
      if (scope.dead) return;
      arrangeAfterMistake();
      renderGrid();
      grid.classList.remove('shuffling');
      if (cfg.hintAfter2 && errors >= 2) AL.hint(nodes.get(target));
      locked = false;
      sayPrompt();
    }

    /* Správny obrázok plynulo narastie z dlaždice na celú obrazovku */
    function zoomIn(t, o) {
      const from = t.querySelector('.pic').getBoundingClientRect();
      const nameH = cfg.showName ? 120 : 0;
      const zs = Math.floor(Math.min(window.innerWidth * 0.92, (window.innerHeight - nameH) * 0.92, 900));
      const pic = el('div', { class: 'zoom-pic', style: { width: zs + 'px', height: zs + 'px' } }, AL.picture(o));
      const ov = el('div', { class: 'show-zoom' }, el('div', { class: 'zoom-bg' }),
        el('div', { class: 'zoom-body' }, pic, cfg.showName ? el('div', { class: 'zoom-name' }, o.name) : null));
      stage.append(ov);
      scope.add(() => ov.remove());
      t.style.visibility = 'hidden';
      const to = pic.getBoundingClientRect();
      pic.style.transition = 'none';
      pic.style.transform = `translate(${from.left + from.width / 2 - (to.left + to.width / 2)}px, ${from.top + from.height / 2 - (to.top + to.height / 2)}px) scale(${from.width / to.width})`;
      void pic.offsetWidth;
      pic.style.transition = '';
      pic.style.transform = '';
      ov.classList.add('in');
      return ov;
    }

    async function celebrate(t, o) {
      const ov = zoomIn(t, o);
      AL.Sound.chime();
      await AL.sleep(400);
      if (scope.dead) return;
      await correctSpeech(cfg, o);
      if (scope.dead) return;
      await AL.sleep(1300);
      if (scope.dead) return;
      ov.classList.add('out');
      await AL.sleep(420);
      ov.remove();
    }

    function finish() {
      AL.Config.log({ type: 'show', set: set.name, count: options.length, total, firstTry, errors: errorsBy });
      AL.Sound.done();
      root.innerHTML = '';
      root.classList.remove('show-screen');
      const actions = [{ label: 'Ešte raz', onClick: () => AL.go('show', { run: true, setId: set.id, count }) }];
      if (cfg.askEachTime) actions.push({ label: 'Iné obrázky', onClick: () => AL.go('show') });
      root.append(AL.donePanel({ title: 'Výborne!', text: 'Hotovo.', actions }));
      scope.timeout(() => AL.Speech.praise(), 500);
    }

    newTrial();
  }

  AL.screens.show = {
    render(root, params, scope) {
      const cfg = AL.Config.data.show;
      const sets = usableSets();
      if (!sets.length) {
        root.append(el('h1', { class: 'screen-title' }, 'Zatiaľ tu nie sú obrázky'),
          el('p', { class: 'screen-sub' }, 'Rodič pridá aspoň 2 obrázky v Rodičovskej zóne → Ukáž.'));
        return;
      }
      if (cfg.askEachTime && !params.run) { setup(root, sets); return; }
      const set = sets.find((s) => s.id === (params.setId || cfg.setId)) || sets[0];
      const count = AL.clamp(params.count || cfg.count || 3, 2, maxCount(set));
      game(root, set, count, scope);
    },
  };
})();
