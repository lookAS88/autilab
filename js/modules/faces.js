/* 5. Rozpoznávanie tvárí najbližších a bezpečných osôb.
   Otázky: "Kde je mama?" (vyber fotku), "Kto je to?" (vyber meno), "Kto ti pomôže, keď sa stratíš?" (vyber fotku).
   Nesprávny dotyk nemá žiadny negatívny zvuk – správna možnosť sa len jemne rozžiari. */
(function () {
  'use strict';
  const AL = window.AL;
  const el = AL.el;

  const joinOr = (names) => names.length <= 1 ? names.join('') : names.slice(0, -1).join(', ') + ' alebo ' + names[names.length - 1];

  function buildQuestion(persons, cfg, mode, lastTargetId) {
    const n = Math.max(2, Math.min(cfg.options || 3, 3));
    if (mode === 'help') {
      const sits = AL.SITUATIONS.filter((s) => persons.some((p) => p.tags.includes(s.id)) && persons.some((p) => !p.tags.includes(s.id)));
      if (!sits.length) return null;
      const sit = AL.sample(sits);
      const yes = persons.filter((p) => p.tags.includes(sit.id));
      const no = persons.filter((p) => !p.tags.includes(sit.id));
      const target = AL.sample(yes.filter((p) => p.id !== lastTargetId).length ? yes.filter((p) => p.id !== lastTargetId) : yes);
      const options = AL.shuffle([target, ...AL.shuffle(no).slice(0, n - 1)]);
      return { mode, target, options, sit };
    }
    const pool = persons.filter((p) => p.id !== lastTargetId);
    const target = AL.sample(pool.length ? pool : persons);
    const others = AL.shuffle(persons.filter((p) => p.id !== target.id)).slice(0, n - 1);
    return { mode, target, options: AL.shuffle([target, ...others]) };
  }

  AL.screens.faces = {
    render(root, params, scope) {
      const cfg = AL.Config.data.faces;
      const persons = cfg.persons.filter((p) => (p.name || '').trim());
      if (persons.length < 2) {
        root.append(el('h1', { class: 'screen-title' }, 'Najprv pridajte aspoň dve osoby'),
          el('p', { class: 'screen-sub' }, 'Rodič nahrá fotografie v Rodičovskej zóne → Tváre.'));
        return;
      }
      let modes = Object.keys(cfg.modes).filter((m) => cfg.modes[m]);
      if (!modes.length) modes = ['find'];

      const total = AL.clamp(cfg.rounds || 5, 1, 20);
      let qi = 0;
      let firstTryCount = 0;
      let lastTarget = null;
      let lastKey = null;
      let q = null;
      let missed = false;
      let locked = false;

      const promptBox = el('div', { class: 'faces-prompt' });
      const optionsBox = el('div', { class: 'faces-options' });
      const dots = el('div', { class: 'progress-dots', 'aria-hidden': 'true' });
      for (let i = 0; i < total; i++) dots.append(el('span'));
      root.append(promptBox, optionsBox, dots);

      const promptText = () => {
        if (q.mode === 'find') return `Kde je ${q.target.name}?`;
        if (q.mode === 'name') return `Kto je to? ${joinOr(q.options.map((o) => o.name))}?`;
        return q.sit.question;
      };
      const sayPrompt = () => {
        if (q.mode === 'find') return AL.Speech.sequence([{ text: 'Kde je' }, { text: q.target.name, audio: q.target.audio }], promptText());
        return AL.Speech.say(promptText());
      };

      function next() {
        if (qi >= total) return finish();
        // rovnaký typ otázky nechceme hneď po sebe (ak je z čoho vyberať)
        const keyOf = (x) => x.mode + (x.sit ? ':' + x.sit.id : '');
        let tries = 0;
        let cand = null;
        do {
          cand = buildQuestion(persons, cfg, AL.sample(modes), lastTarget);
          tries++;
        } while ((!cand || keyOf(cand) === lastKey) && tries < 12);
        q = cand || buildQuestion(persons, cfg, 'find', lastTarget);
        lastTarget = q.target.id;
        lastKey = keyOf(q);
        missed = false;
        locked = false;
        renderQuestion();
      }

      function renderQuestion() {
        promptBox.innerHTML = '';
        optionsBox.innerHTML = '';
        const replay = el('button', { class: 'replay', type: 'button', 'aria-label': 'Zopakovať otázku', html: AL.Icon('volHigh') });
        replay.addEventListener('click', sayPrompt);

        if (q.mode === 'find') {
          promptBox.append(el('span', { class: 'q' }, 'Kde je'), el('span', { class: 'name-chip' }, q.target.name), replay);
        } else if (q.mode === 'name') {
          promptBox.append(el('span', { class: 'q' }, 'Kto je to?'), el('div', { class: 'prompt-pic' }, AL.picture(q.target)), replay);
        } else {
          promptBox.append(el('div', { class: 'prompt-pic', style: { width: 'clamp(90px, 11vw, 140px)' } }, AL.picture({ art: q.sit.art })), el('span', { class: 'q' }, q.sit.question), replay);
        }

        q.nodes = q.options.map((p) => {
          const node = q.mode === 'name'
            ? AL.tile({ label: p.name, cls: 'name-opt' })
            : AL.tile({ item: p, picOpts: { label: 'Fotografia' } });
          node.addEventListener('click', () => answer(p, node));
          optionsBox.append(node);
          return node;
        });
        [...dots.children].forEach((d, i) => d.classList.toggle('on', i < qi));
        scope.timeout(sayPrompt, 350);
      }

      async function answer(p, node) {
        if (locked) return;
        if (p.id !== q.target.id) {
          // žiadny chybový zvuk ani červená – iba jemné navedenie
          missed = true;
          AL.hint(q.nodes[q.options.indexOf(q.target)]);
          return;
        }
        locked = true;
        if (!missed) firstTryCount++;
        node.classList.add('gentle-good');
        q.nodes.forEach((n) => { if (n !== node) n.style.opacity = '.45'; });
        AL.Sound.chime();
        const reply = q.mode === 'help' ? 'Áno! ' + q.sit.answer.replace('{name}', p.name) : 'Áno! To je ' + p.name + '.';
        await AL.sleep(350);
        if (scope.dead) return;
        await AL.Speech.say(reply);
        if (scope.dead) return;
        qi++;
        [...dots.children].forEach((d, i) => d.classList.toggle('on', i < qi));
        scope.timeout(next, 900);
      }

      function finish() {
        AL.Config.log({ type: 'faces', total, firstTry: firstTryCount });
        AL.Sound.done();
        root.innerHTML = '';
        root.append(AL.donePanel({
          title: 'Výborne!',
          text: 'Poznáš svojich blízkych.',
          actions: [{ label: 'Ešte raz', onClick: () => AL.go('faces') }],
        }));
        scope.timeout(() => AL.Speech.praise(), 500);
      }

      next();
    },
  };
})();
