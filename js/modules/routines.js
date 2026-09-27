/* 2. Sociálny príbeh – kroky bežných rutín (sebaobsluha)
   Úkon je rozdelený na pár jednoduchých krokov. Dieťa odškrtne každý krok dotykom. */
(function () {
  'use strict';
  const AL = window.AL;
  const el = AL.el;

  function chooser(root, list) {
    root.append(el('h1', { class: 'screen-title' }, 'Čo budeme robiť?'));
    const grid = el('div', { class: 'tile-grid routine-choose' });
    list.forEach((r) => grid.append(AL.tile({
      item: r,
      label: r.title,
      onClick: () => { AL.Sound.tap(); AL.go('routines', { id: r.id }); },
    })));
    root.append(grid);
  }

  function run(root, routine, list, scope) {
    const steps = routine.steps;
    let idx = 0;
    let finished = false;

    const head = el('div', { class: 'routine-head' }, AL.picture(routine), el('h1', { class: 'screen-title' }, routine.title));
    const row = el('div', { class: 'routine-steps' });
    const nodes = steps.map((s, i) => {
      const pic = AL.picture(s);
      pic.append(el('div', { class: 'step-check', html: AL.Icon('bigCheck').replace('stroke="currentColor"', 'stroke="#7FA88B"') }));
      const n = el('button', { class: 'tile step', type: 'button', 'aria-label': `Krok ${i + 1}: ${s.text}` },
        el('span', { class: 'step-num' }, String(i + 1)), pic, el('span', { class: 'tile-label' }, s.text));
      n.addEventListener('click', () => onStep(i));
      if (i > 0) row.append(el('span', { class: 'step-arrow', html: AL.Icon('arrow') }));
      row.append(n);
      return n;
    });

    const paint = () => nodes.forEach((n, i) => {
      n.classList.toggle('done', i < idx);
      n.classList.toggle('current', i === idx);
    });

    const sayStep = (i) => AL.Speech.say(steps[i].text, steps[i].audio);

    function onStep(i) {
      if (finished) return;
      if (i < idx) return; // hotový krok – žiadna reakcia
      if (i > idx) { // ešte nie je na rade – jemne ukážeme, ktorý krok je teraz
        AL.hint(nodes[idx]);
        sayStep(idx);
        return;
      }
      idx++;
      paint();
      AL.Sound.chime();
      if (idx < steps.length) {
        const now = idx;
        scope.timeout(() => { if (idx === now) sayStep(now); }, 750);
      } else {
        finished = true;
        scope.timeout(finish, 1300);
      }
    }

    function finish() {
      AL.Sound.done();
      root.innerHTML = '';
      const actions = [{ label: 'Ešte raz', onClick: () => AL.go('routines', { id: routine.id }) }];
      if (list.length > 1) actions.push({ label: 'Iná činnosť', onClick: () => AL.go('routines') });
      root.append(AL.donePanel({ title: 'Hotovo!', text: routine.title + ' – zvládnuté.', actions }));
      scope.timeout(async () => {
        await AL.Speech.praise();
        if (!scope.dead) AL.Speech.say('Hotovo. ' + routine.title + ' máme zvládnuté.');
      }, 600);
    }

    paint();
    root.append(head, row);
    scope.timeout(async () => {
      await AL.Speech.say(routine.title + '.');
      if (!scope.dead && !finished && idx === 0) sayStep(0);
    }, 350);
  }

  AL.screens.routines = {
    render(root, params, scope) {
      const list = AL.Config.data.routines.filter((r) => r.steps.length);
      if (!list.length) {
        root.append(el('h1', { class: 'screen-title' }, 'Zatiaľ tu nie sú žiadne rutiny'),
          el('p', { class: 'screen-sub' }, 'Rodič ich pridá v Rodičovskej zóne → Rutiny.'));
        return;
      }
      const routine = params.id ? list.find((r) => r.id === params.id) : list.length === 1 ? list[0] : null;
      if (routine) run(root, routine, list, scope);
      else chooser(root, list);
    },
  };
})();
