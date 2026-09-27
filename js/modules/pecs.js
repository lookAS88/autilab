/* 1. Komunikácia výmenou obrázkov (PECS / AAC mini)
   Dieťa pretiahne (alebo ťukne) veľký obrázok na pásku dole a aplikácia zrozumiteľne vysloví vetu. */
(function () {
  'use strict';
  const AL = window.AL;
  const el = AL.el;

  AL.screens.pecs = {
    render(root, params, scope) {
      const cfg = AL.Config.data.pecs;
      const cards = cfg.cards.filter((c) => c.active).slice(0, 4);

      if (!cards.length) {
        root.append(el('h1', { class: 'screen-title' }, 'Zatiaľ tu nie sú žiadne obrázky'),
          el('p', { class: 'screen-sub' }, 'Rodič ich zapne v Rodičovskej zóne → Komunikácia.'));
        return;
      }

      const grid = el('div', { class: 'pecs-cards' });
      const strip = el('div', { class: 'pecs-strip', role: 'button', tabindex: '0', 'aria-label': 'Páska na vetu' });
      let placed = null;
      let returnTimer = null;
      let busy = false;

      const showEmpty = () => {
        strip.className = 'pecs-strip';
        strip.innerHTML = '';
        strip.append(el('div', { class: 'strip-hint', html: AL.Icon('hand') + '<span>Sem daj obrázok</span>' }));
      };

      const scheduleReturn = () => {
        clearTimeout(returnTimer);
        returnTimer = setTimeout(reset, Math.max(2, cfg.returnDelay || 6) * 1000);
      };
      scope.add(() => clearTimeout(returnTimer));

      const speak = async (card) => {
        clearTimeout(returnTimer);
        await AL.Speech.say(card.phrase || card.label, card.audio);
        if (placed && placed.card === card) scheduleReturn();
      };

      const reset = () => {
        if (!placed) return;
        const slot = placed.slot;
        slot.classList.remove('empty');
        const c = slot.querySelector('.pecs-card');
        c.classList.remove('fade-in');
        void c.offsetWidth;
        c.classList.add('fade-in');
        placed = null;
        showEmpty();
      };

      const place = (card, slot) => {
        if (placed) placed.slot.classList.remove('empty');
        placed = { card, slot };
        slot.classList.add('empty');
        strip.className = 'pecs-strip filled';
        strip.innerHTML = '';
        strip.append(
          el('div', { class: 'strip-pic' }, AL.picture(card)),
          el('div', { class: 'strip-text' }, card.phrase || card.label),
          el('span', { class: 'strip-speaker', html: AL.Icon('volHigh') }));
        speak(card);
      };

      /* Ťuknutie: karta pomaly "preletí" na pásku, aby dieťa videlo súvislosť */
      const flyTo = (node, card, slot) => {
        if (busy) return;
        busy = true;
        const from = node.getBoundingClientRect();
        const to = strip.getBoundingClientRect();
        const ghost = node.cloneNode(true);
        ghost.classList.add('drag-ghost');
        Object.assign(ghost.style, { left: from.left + 'px', top: from.top + 'px', width: from.width + 'px', height: from.height + 'px', transition: 'transform 520ms cubic-bezier(.4,0,.2,1), opacity 520ms' });
        document.body.append(ghost);
        node.classList.add('drag-origin');
        const scale = Math.min(1, (to.height * 0.8) / from.height);
        const dx = to.left + 40 - from.left - (from.width * (1 - scale)) / 2;
        const dy = to.top + to.height / 2 - (from.top + from.height / 2);
        requestAnimationFrame(() => { ghost.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`; ghost.style.opacity = '.6'; });
        setTimeout(() => {
          ghost.remove();
          node.classList.remove('drag-origin');
          busy = false;
          place(card, slot);
        }, AL.Config.s.reduceMotion ? 30 : 540);
      };

      cards.forEach((card) => {
        const slot = el('div', { class: 'pecs-slot' });
        const node = el('div', { class: 'tile pecs-card', role: 'button', tabindex: '0', 'aria-label': card.label },
          AL.picture(card), el('span', { class: 'tile-label' }, card.label));
        slot.append(node);
        grid.append(slot);
        AL.draggable(node, {
          getTarget: () => strip,
          onDrop: () => place(card, slot),
          onTap: () => { if (cfg.allowTap) flyTo(node, card, slot); else AL.hint(strip); },
          onMiss: () => AL.hint(strip),
        });
        node.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flyTo(node, card, slot); } });
      });

      strip.addEventListener('click', () => { if (placed) speak(placed.card); });
      strip.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && placed) { e.preventDefault(); speak(placed.card); } });

      showEmpty();
      root.append(grid, strip);
    },
  };
})();
