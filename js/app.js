/* Úvodná obrazovka a štart aplikácie */
(function () {
  'use strict';
  const AL = window.AL;
  const el = AL.el;

  AL.MODULE_LIST = [
    { id: 'pecs', label: 'Chcem', art: 'pecsTile', desc: 'Komunikácia obrázkami' },
    { id: 'routines', label: 'Kroky', art: 'stepsTile', desc: 'Rutiny krok za krokom' },
    { id: 'timer', label: 'Čakám', art: 'hourglass', desc: 'Vizuálny časovač' },
    { id: 'sensory', label: 'Zvuky', art: 'speaker', desc: 'Senzorický trenažér' },
    { id: 'faces', label: 'Kto je to?', art: 'family', desc: 'Blízke a bezpečné osoby' },
    { id: 'show', label: 'Ukáž', art: 'pointTile', desc: 'Nájdi obrázok podľa názvu' },
    { id: 'cards', label: 'Kartotéka', art: 'cardsTile', desc: 'Výber činností a vecí podľa kategórií' },
  ];

  AL.screens.home = {
    render(root, params, scope) {
      const name = (AL.Config.data.child.name || '').trim();
      const mods = AL.MODULE_LIST.filter((m) => AL.Config.s.modules[m.id]);
      root.append(el('h1', { class: 'screen-title' }, name ? `Ahoj, ${name}!` : 'Ahoj!'));
      const grid = el('div', { class: `tile-grid home-grid count-${mods.length}` });
      mods.forEach((m) => grid.append(AL.tile({
        item: { art: m.art },
        label: m.label,
        onClick: () => { AL.Sound.tap(); AL.go(m.id); },
      })));
      if (!mods.length) grid.append(el('p', { class: 'screen-sub' }, 'Všetky aktivity sú vypnuté. Zapnite ich v Rodičovskej zóne.'));
      root.append(grid);

      // Nenápadná poznámka pre dospelých: prehliadač bez slovenského hlasu → aplikácia vety nevysloví
      const hint = el('p', { class: 'adult-hint' });
      const check = () => {
        hint.textContent = AL.Speech.supported && AL.Speech.voices().length && !AL.Speech.canSpeak()
          ? 'Pre dospelých: v prehliadači chýba slovenský hlas, vety zaznejú len z vašich nahrávok. Riešenie: Rodičovská zóna → Všeobecné → Hlas aplikácie.'
          : '';
        root.classList.toggle('has-hint', !!hint.textContent); // dlaždice nechajú poznámke miesto
      };
      check();
      scope.timeout(check, 1500); // zoznam hlasov sa v prehliadači načítava s oneskorením
      if (window.speechSynthesis && window.speechSynthesis.addEventListener) scope.on(window.speechSynthesis, 'voiceschanged', check);
      root.append(hint);

      root.append(AL.holdButton({ side: 'right', icon: 'gear', ms: 3000, hint: 'Rodičia: podržte 3 sekundy', onDone: () => AL.go('parent') }));
    },
  };

  async function boot() {
    const stage = document.getElementById('stage');
    try {
      await AL.DB.open();
      await AL.Media.init();
      await AL.Config.load();
    } catch (e) {
      console.error(e);
      AL.storageError = true;
      AL.Config.data = AL.defaults();
      // uložené údaje nesmieme prepísať predvolenými – nič neukladať, kým úložisko nefunguje
      AL.Config.save = () => {};
      AL.Config.saveNow = async () => {};
      AL.Config.log = () => {};
    }
    AL.applySettings();
    if (!stage) return;
    AL.go('home');

    // Požiadame prehliadač, aby údaje nemazal pri nedostatku miesta
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

    // Inštalácia ako aplikácia a offline režim fungujú len cez http(s), nie pri otvorení súboru
    if (location.protocol.startsWith('http')) {
      document.head.append(el('link', { rel: 'manifest', href: 'manifest.webmanifest' }));
      if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  boot();
})();
