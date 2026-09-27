/* 4. Senzorický trenažér – desenzibilizácia na nepríjemné zvuky.
   Dieťa má plnú kontrolu: samo spustí zvuk, samo ho zastaví a posuvníkom určí hlasitosť (strop nastavuje rodič). */
(function () {
  'use strict';
  const AL = window.AL;
  const el = AL.el;

  AL.screens.sensory = {
    render(root, params, scope) {
      const cfg = AL.Config.data.sensory;
      const sounds = cfg.sounds.filter((s) => s.synth || s.audio);
      if (!sounds.length) {
        root.append(el('h1', { class: 'screen-title' }, 'Zatiaľ tu nie sú žiadne zvuky'));
        return;
      }
      let current = sounds.find((s) => s.id === cfg.lastId) || sounds[0];
      let player = null;
      let releaseAwake = null;
      let session = null;

      /* výber zvuku */
      const choose = el('div', { class: 'sens-choose' });
      const chooseTiles = sounds.map((s) => {
        const b = AL.tile({ item: s, label: s.label, cls: 'small', onClick: () => select(s) });
        choose.append(b);
        return b;
      });

      /* obrázok + jemné vlny podľa hlasitosti */
      const picBox = el('div', { class: 'sens-picture' });
      const waves = AL.frag(`<svg class="sens-waves" viewBox="0 0 60 120" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round">
        <path d="M8 44 Q20 60 8 76" opacity="0"/><path d="M22 30 Q42 60 22 90" opacity="0"/><path d="M36 16 Q64 60 36 104" opacity="0"/></svg>`);
      const wavePaths = [...waves.querySelectorAll('path')];

      /* ovládanie */
      const playBtn = el('button', { class: 'big-round play', type: 'button', 'aria-label': 'Spustiť zvuk', html: AL.Icon('play') });
      const stopBtn = el('button', { class: 'big-round stop', type: 'button', 'aria-label': 'Zastaviť zvuk', html: AL.Icon('stop') });
      const slider = el('input', { type: 'range', min: '0', max: '100', step: '1', value: String(cfg.startVolume), 'aria-label': 'Hlasitosť' });
      const bars = el('div', { class: 'vol-bars', 'aria-hidden': 'true' });
      const barEls = [1, 2, 3, 4, 5].map((i) => { const b = el('span', { style: { height: 12 + i * 8 + 'px' } }); bars.append(b); return b; });

      const controls = el('div', { class: 'sens-controls' },
        el('div', { class: 'sens-buttons' },
          el('div', { class: 'round-wrap' }, playBtn, 'Zapnúť'),
          el('div', { class: 'round-wrap' }, stopBtn, 'Vypnúť')),
        el('div', { class: 'vol' }, el('span', { class: 'vol-ico', html: AL.Icon('volLow') }), slider, el('span', { class: 'vol-ico big', html: AL.Icon('volHigh') })),
        bars);

      const vol = () => Number(slider.value) / 100;

      const paint = () => {
        const v = vol();
        const on = !!(player && player.playing);
        slider.style.setProperty('--fill', slider.value + '%');
        playBtn.classList.toggle('active', on);
        stopBtn.classList.toggle('active', false);
        wavePaths.forEach((p, i) => p.setAttribute('opacity', on ? String(AL.clamp((v - i * 0.3) / 0.3, 0, 1) * 0.9) : '0'));
        barEls.forEach((b, i) => b.classList.toggle('on', on && v >= (i + 0.5) / 5 - 0.1 && v > 0));
      };

      const endSession = () => {
        if (!session) return;
        const secs = Math.round((Date.now() - session.start) / 1000);
        if (secs >= 1) AL.Config.log({ type: 'sensory', soundId: session.id, label: session.label, level: Math.round(session.max * 100), cap: cfg.maxVolume, seconds: secs });
        session = null;
      };

      const start = () => {
        if (player && player.playing) return;
        if (vol() === 0) slider.value = String(Math.max(1, cfg.startVolume));
        player = new AL.SensoryPlayer(current);
        player.setVolume(vol());
        player.start();
        session = { id: current.id, label: current.label, start: Date.now(), max: vol() };
        if (!releaseAwake) releaseAwake = AL.keepAwake(scope); // obrazovka svieti len počas prehrávania
        paint();
      };
      const stop = () => {
        if (player) player.stop();
        player = null;
        if (releaseAwake) { releaseAwake(); releaseAwake = null; }
        endSession();
        paint();
      };

      function select(s) {
        if (s === current && player && player.playing) return;
        stop();
        current = s;
        cfg.lastId = s.id;
        AL.Config.save();
        chooseTiles.forEach((b, i) => b.classList.toggle('selected', sounds[i] === s));
        picBox.innerHTML = '';
        picBox.append(AL.picture(s), waves);
        AL.Speech.say(s.label);
      }

      playBtn.addEventListener('click', start);
      stopBtn.addEventListener('click', stop);
      slider.addEventListener('input', () => {
        const v = vol();
        if (v > 0 && !(player && player.playing)) start();
        if (player) player.setVolume(v);
        if (session) session.max = Math.max(session.max, v);
        paint();
      });

      root.append(choose, el('div', { class: 'sens-main' }, picBox, controls));
      chooseTiles.forEach((b, i) => b.classList.toggle('selected', sounds[i] === current));
      picBox.append(AL.picture(current), waves);
      paint();

      return () => stop();
    },
  };
})();
