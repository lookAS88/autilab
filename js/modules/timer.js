/* 3. Čakanie a časovač – plynutie času bez čísel: napĺňa sa nádoba, mizne kruh alebo sa odkrýva obrázok.
   Počas čakania dieťa robí pokojnú činnosť. */
(function () {
  'use strict';
  const AL = window.AL;
  const el = AL.el;
  const C = AL.Art.C;

  const fmtDuration = (m) => (m < 1 ? Math.round(m * 60) + ' s' : (Number.isInteger(m) ? m : m.toFixed(1).replace('.', ',')) + ' min');
  const fmtClock = (ms) => {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  };

  /* ---------- Vizualizácie ---------- */
  function jarVisual() {
    const body = 'M40 72 Q40 58 54 58 L146 58 Q160 58 160 72 L160 228 Q160 248 140 248 L60 248 Q40 248 40 228 Z';
    const svg = AL.frag(`<svg class="jar" viewBox="0 0 200 262" aria-hidden="true">
      <defs><clipPath id="jarClip"><path d="${body}"/></clipPath></defs>
      <path d="${body}" fill="${C.glass}"/>
      <g clip-path="url(#jarClip)">
        <g class="liquid" transform="translate(0 256)">
          <path class="wave" d="M-100 0 Q-75 -9 -50 0 T0 0 T50 0 T100 0 T150 0 T200 0 T250 0 T300 0 L300 320 L-100 320 Z" fill="#8FC1C9"/>
        </g>
      </g>
      <path d="${body}" fill="none" stroke="${C.ink}" stroke-width="6" stroke-linejoin="round"/>
      <rect x="52" y="30" width="96" height="30" rx="8" fill="${C.brown}" stroke="${C.ink}" stroke-width="6"/>
    </svg>`);
    const liquid = svg.querySelector('.liquid');
    return {
      node: svg,
      update(p) { liquid.setAttribute('transform', `translate(0 ${(256 - p * (256 - 70)).toFixed(1)})`); },
    };
  }

  function circleVisual() {
    const svg = AL.frag(`<svg class="disc" viewBox="0 0 200 200" aria-hidden="true">
      <circle cx="100" cy="100" r="95" fill="#FFFFFF" stroke="${C.ink}" stroke-width="5"/>
      <path class="sector" fill="${C.blue}"/>
      <circle cx="100" cy="100" r="10" fill="${C.ink}"/>
    </svg>`);
    const sector = svg.querySelector('.sector');
    const R = 86;
    return {
      node: svg,
      update(p) {
        const f = 1 - p; // zostávajúca časť
        let d = '';
        if (f >= 0.9995) d = `M100 ${100 - R} a${R} ${R} 0 1 1 0 ${2 * R} a${R} ${R} 0 1 1 0 ${-2 * R} Z`;
        else if (f > 0.0005) {
          const a = f * 2 * Math.PI;
          const x = 100 + R * Math.sin(a), y = 100 - R * Math.cos(a);
          d = `M100 100 L100 ${100 - R} A${R} ${R} 0 ${f > 0.5 ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)} Z`;
        }
        sector.setAttribute('d', d);
      },
    };
  }

  function revealVisual(picItem) {
    const N = 25;
    const wrap = el('div', { class: 'reveal-wrap' }, AL.picture(picItem));
    const grid = el('div', { class: 'reveal-grid' });
    const tiles = [];
    for (let i = 0; i < N; i++) { const t = el('div'); tiles.push(t); grid.append(t); }
    wrap.append(grid);
    const order = AL.shuffle(tiles.map((_, i) => i));
    return {
      node: wrap,
      update(p) {
        order.forEach((ti, k) => tiles[ti].classList.toggle('gone', p >= (k + 1) / N));
      },
    };
  }

  /* ---------- Nastavenie (vyberá väčšinou dospelý) ---------- */
  function setup(root) {
    const t = AL.Config.data.timer;
    const cards = AL.Config.data.pecs.cards;
    const durations = (t.durations || []).filter((d) => d > 0);
    const sel = {
      minutes: durations.includes(t.lastMinutes) ? t.lastMinutes : durations[Math.min(1, durations.length - 1)] || 1,
      visual: t.visual || 'jar',
      calm: t.calm || 'sit',
      next: cards.some((c) => c.id === t.nextCardId) ? t.nextCardId : null,
    };

    const group = (title, items, key) => {
      const box = el('div', { class: 'setup-options' });
      const tiles = items.map((it) => {
        const b = AL.tile({
          item: it.item, label: it.label, cls: 'small' + (it.item ? '' : ' text-only'),
          onClick: () => {
            sel[key] = it.value;
            tiles.forEach((x) => x.classList.toggle('selected', x === b));
            AL.Sound.tap();
          },
        });
        b.classList.toggle('selected', sel[key] === it.value);
        box.append(b);
        return b;
      });
      return el('div', { class: 'setup-row' }, el('h3', null, title), box);
    };

    root.append(el('h1', { class: 'screen-title' }, 'Čakáme'));
    const wrap = el('div', { class: 'timer-setup' },
      group('Ako dlho?', durations.map((m) => ({ label: fmtDuration(m), value: m })), 'minutes'),
      group('Čo uvidíš?', AL.VISUALS.map((v) => ({ item: { art: v.art }, label: v.label, value: v.id })), 'visual'),
      group('Počas čakania', AL.CALM.map((c) => ({ item: { art: c.art }, label: c.label, value: c.id })), 'calm'),
      group('Potom', [{ label: 'Nič', value: null }].concat(cards.map((c) => ({ item: c, label: c.label, value: c.id }))), 'next'));

    const start = el('button', { class: 'tile start-tile', type: 'button' }, el('span', { html: AL.Icon('play') }), el('span', { class: 'tile-label' }, 'Začať'));
    start.addEventListener('click', () => {
      Object.assign(t, { lastMinutes: sel.minutes, visual: sel.visual, calm: sel.calm, nextCardId: sel.next });
      AL.Config.save();
      AL.go('timer', { run: true, ...sel });
    });
    wrap.append(start);
    root.append(wrap);
  }

  /* ---------- Beh časovača ---------- */
  function runTimer(root, params, scope) {
    const t = AL.Config.data.timer;
    const total = Math.max(5, params.minutes * 60) * 1000;
    const calm = AL.CALM.find((c) => c.id === params.calm) || AL.CALM[0];
    const next = AL.Config.data.pecs.cards.find((c) => c.id === params.next) || null;
    const revealItem = next || (t.revealPhoto ? { photo: t.revealPhoto, art: 'scene' } : { art: 'scene' });

    const vis = params.visual === 'circle' ? circleVisual() : params.visual === 'reveal' ? revealVisual(revealItem) : jarVisual();
    vis.update(0);

    const title = el('h1', { class: 'screen-title' }, 'Čakáme');
    const side = el('div', { class: 'timer-side' });

    let calmCard;
    if (calm.id === 'breathe') {
      const txt = el('div', { class: 'side-text' }, 'Nádych');
      calmCard = el('div', { class: 'side-card' }, el('div', { class: 'breath' }, el('div', { class: 'ball' })),
        el('div', null, el('div', { class: 'side-label' }, 'Teraz'), txt));
      let inhale = true;
      scope.interval(() => { inhale = !inhale; txt.textContent = inhale ? 'Nádych' : 'Výdych'; }, 4000);
    } else {
      calmCard = el('div', { class: 'side-card' }, AL.picture({ art: calm.art }),
        el('div', null, el('div', { class: 'side-label' }, 'Teraz'), el('div', { class: 'side-text' }, calm.label)));
    }
    side.append(calmCard);
    if (next) {
      side.append(el('div', { class: 'side-card' }, AL.picture(next),
        el('div', null, el('div', { class: 'side-label' }, 'Potom'), el('div', { class: 'side-text' }, next.label))));
    }
    const clock = el('div', { class: 'adult-time' });
    if (t.showAdultTime) side.append(clock);

    root.append(title, el('div', { class: 'timer-run' }, el('div', { class: 'timer-visual' }, vis.node), side));

    const releaseAwake = AL.keepAwake(scope);
    const startAt = performance.now();
    let last = 0;
    let finished = false;

    scope.timeout(async () => {
      await AL.Speech.say('Teraz čakáme. ' + calm.label + '.');
      if (next && !scope.dead) AL.Speech.say('Potom: ' + next.label + '.');
    }, 300);

    scope.raf((now) => {
      if (finished || now - last < 200) return;
      last = now;
      const elapsed = now - startAt;
      const p = Math.min(1, elapsed / total);
      vis.update(p);
      clock.textContent = 'Pre dospelých: zostáva ' + fmtClock(total - elapsed);
      if (p >= 1) finish();
    });

    function finish() {
      finished = true;
      vis.update(1);
      title.textContent = 'Hotovo!';
      clock.textContent = '';
      if (t.endSound) { try { AL.Sound.bell(); } catch (e) { /* ticho – koniec čakania musí prebehnúť vždy */ } }
      scope.timeout(releaseAwake, 60000); // po skončení ešte minútu nechať obrazovku svietiť, potom môže zhasnúť
      calmCard.replaceWith(el('div', { class: 'side-card' },
        el('div', { class: 'done-mark', style: { width: '96px', height: '96px', borderRadius: '50%', background: 'var(--sage-soft)', display: 'grid', placeItems: 'center', flex: 'none' },
          html: AL.Icon('bigCheck').replace('stroke="currentColor"', 'stroke="#7FA88B"').replace('<svg ', '<svg style="width:60%;height:60%" ') }),
        el('div', null, el('div', { class: 'side-text' }, 'Výborne sme počkali.'))));
      const again = AL.tile({ label: 'Hotovo', cls: 'small', onClick: () => AL.go('timer') });
      again.style.alignSelf = 'center';
      again.style.minWidth = '200px';
      side.append(again);
      scope.timeout(async () => {
        await AL.Speech.say('Čakanie skončilo. Výborne!');
        if (next && !scope.dead) AL.Speech.say('Teraz: ' + next.label + '.');
      }, t.endSound ? 1400 : 300);
    }
  }

  AL.screens.timer = {
    render(root, params, scope) {
      if (params.run) runTimer(root, params, scope);
      else setup(root);
    },
  };
})();
