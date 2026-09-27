/* Konfigurácia a predvolený obsah. Rodič všetko upraví v Rodičovskej zóne. */
(function () {
  'use strict';
  const AL = window.AL;

  const step = (text, art) => ({ id: AL.uid('s'), text, art, photo: null, audio: null });

  AL.SITUATIONS = [
    { id: 'lost', art: 'lost', question: 'Kto ti pomôže, keď sa stratíš?', short: 'Pomôže, keď sa stratím', answer: '{name} ti pomôže.' },
    { id: 'hurt', art: 'hurt', question: 'Kto ti pomôže, keď ťa niečo bolí?', short: 'Pomôže, keď ma niečo bolí', answer: '{name} ti pomôže.' },
    { id: 'home', art: 'home', question: 'Kto býva s tebou doma?', short: 'Býva so mnou doma', answer: '{name} býva s tebou.' },
  ];

  AL.CALM = [
    { id: 'sit', art: 'chair', label: 'Sedím potichu' },
    { id: 'breathe', art: 'breathe', label: 'Dýchame pomaly' },
    { id: 'book', art: 'book', label: 'Pozerám knižku' },
    { id: 'toy', art: 'toy', label: 'Držím hračku' },
  ];

  AL.VISUALS = [
    { id: 'jar', art: 'jarIcon', label: 'Nádoba' },
    { id: 'circle', art: 'circleIcon', label: 'Kruh' },
    { id: 'reveal', art: 'revealIcon', label: 'Obrázok' },
  ];

  AL.defaults = function () {
    return {
      version: 1,
      child: { name: '' },
      settings: {
        voiceURI: null,
        rate: 0.9,
        feedbackVolume: 0.55,
        praiseVoice: true,
        reduceMotion: false,
        modules: { pecs: true, routines: true, timer: true, sensory: true, faces: true, show: true },
      },
      show: {
        askEachTime: true,   // pred každým spustením vybrať skupinu a počet obrázkov
        count: 3,            // počet obrázkov na obrazovke (2–6)
        setId: null,
        prompt: 'where',     // 'name' = „pes" · 'where' = „Kde je pes?" · 'show' = „Ukáž pes"
        correct: 'name',     // 'name' = „Správne, pes" · 'thisIs' = „Správne, to je pes"
        wrongSay: true,      // po chybe povedať „Nesprávne"
        hintAfter2: false,   // po dvoch chybách jemne ukázať správny obrázok
        showName: true,      // pri zväčšenom obrázku zobraziť aj názov
        rounds: 10,
        phrases: { where: null, show: null, correct: null, correctThisIs: null, wrong: null },
        sets: [
          {
            id: AL.uid('set'), name: 'Zvieratá',
            items: [['pes', 'dog'], ['mačka', 'cat'], ['krava', 'cow'], ['ryba', 'fish'], ['vták', 'bird']]
              .map(([name, art]) => ({ id: AL.uid('it'), name, art, photo: null, audio: null })),
          },
          {
            id: AL.uid('set'), name: 'Veci doma',
            items: [['pohár', 'water'], ['macko', 'toy'], ['kniha', 'book'], ['stolička', 'chair'], ['tričko', 'tshirt'], ['topánky', 'shoes']]
              .map(([name, art]) => ({ id: AL.uid('it'), name, art, photo: null, audio: null })),
          },
        ],
      },
      pecs: {
        allowTap: true,
        returnDelay: 6,
        cards: [
          { id: AL.uid('c'), label: 'Piť', phrase: 'Chcem piť.', art: 'water', photo: null, audio: null, active: true },
          { id: AL.uid('c'), label: 'Hračka', phrase: 'Chcem sa hrať.', art: 'toy', photo: null, audio: null, active: true },
          { id: AL.uid('c'), label: 'WC', phrase: 'Potrebujem na záchod.', art: 'wc', photo: null, audio: null, active: true },
          { id: AL.uid('c'), label: 'Jesť', phrase: 'Chcem jesť.', art: 'food', photo: null, audio: null, active: false },
          { id: AL.uid('c'), label: 'Pomoc', phrase: 'Potrebujem pomoc.', art: 'help', photo: null, audio: null, active: false },
          { id: AL.uid('c'), label: 'Oddych', phrase: 'Chcem si oddýchnuť.', art: 'rest', photo: null, audio: null, active: false },
          { id: AL.uid('c'), label: 'Von', phrase: 'Chcem ísť von.', art: 'outside', photo: null, audio: null, active: false },
          { id: AL.uid('c'), label: 'Objatie', phrase: 'Chcem objať.', art: 'hug', photo: null, audio: null, active: false },
        ],
      },
      routines: [
        {
          id: AL.uid('r'), title: 'Umývanie rúk', art: 'wash', photo: null,
          steps: [step('Pusti vodu', 'tap'), step('Použi mydlo', 'soap'), step('Umy si ruky', 'wash')],
        },
        {
          id: AL.uid('r'), title: 'Toaleta', art: 'wc', photo: null,
          steps: [step('Sadni si na WC', 'wc'), step('Spláchni', 'flush'), step('Umy si ruky', 'wash')],
        },
        {
          id: AL.uid('r'), title: 'Obliekanie', art: 'tshirt', photo: null,
          steps: [step('Obleč si tričko', 'tshirt'), step('Obleč si nohavice', 'pants'), step('Obuj si ponožky', 'socks')],
        },
        {
          id: AL.uid('r'), title: 'Čistenie zubov', art: 'toothbrush', photo: null,
          steps: [step('Daj pastu na kefku', 'toothpaste'), step('Čisti si zuby', 'toothbrush'), step('Vypláchni si ústa', 'water')],
        },
      ],
      timer: {
        durations: [0.5, 1, 2, 5, 10],
        visual: 'jar',
        calm: 'breathe',
        nextCardId: null,
        revealPhoto: null,
        endSound: true,
        showAdultTime: true,
      },
      sensory: {
        startVolume: 10,
        maxVolume: 70,
        sounds: [
          { id: 'vacuum', label: 'Vysávač', art: 'vacuum', photo: null, audio: null, synth: 'vacuum' },
          { id: 'dryer', label: 'Sušič na ruky', art: 'dryer', photo: null, audio: null, synth: 'dryer' },
          { id: 'baby', label: 'Plačúce bábätko', art: 'baby', photo: null, audio: null, synth: 'baby' },
          { id: 'bell', label: 'Zvonček', art: 'bell', photo: null, audio: null, synth: 'bell' },
        ],
      },
      faces: {
        options: 3,
        rounds: 5,
        modes: { find: true, name: true, help: true },
        persons: [
          { id: AL.uid('p'), name: 'Mama', art: 'mom', photo: null, audio: null, tags: ['hurt', 'home'] },
          { id: AL.uid('p'), name: 'Ocko', art: 'dad', photo: null, audio: null, tags: ['hurt', 'home'] },
          { id: AL.uid('p'), name: 'Súrodenec', art: 'sibling', photo: null, audio: null, tags: ['home'] },
          { id: AL.uid('p'), name: 'Lekár', art: 'doctor', photo: null, audio: null, tags: ['hurt'] },
          { id: AL.uid('p'), name: 'Policajt', art: 'police', photo: null, audio: null, tags: ['lost'] },
        ],
      },
      log: [],
    };
  };

  /** Doplní chýbajúce kľúče z predvolených hodnôt (pri aktualizácii aplikácie) */
  function mergeDefaults(target, defs) {
    for (const [k, v] of Object.entries(defs)) {
      if (!(k in target)) target[k] = v;
      else if (v && typeof v === 'object' && !Array.isArray(v) && target[k] && typeof target[k] === 'object' && !Array.isArray(target[k])) {
        mergeDefaults(target[k], v);
      }
    }
    return target;
  }

  const saveNow = async () => {
    await AL.DB.put('kv', 'config', JSON.parse(JSON.stringify(AL.Config.data)));
    AL.Config.onSaved && AL.Config.onSaved();
  };
  const saveLater = AL.debounce(() => saveNow().catch((e) => console.error('Uloženie zlyhalo', e)), 350);

  AL.Config = {
    data: null,
    onSaved: null,
    async load() {
      const stored = await AL.DB.get('kv', 'config');
      this.data = stored ? mergeDefaults(stored, AL.defaults()) : AL.defaults();
      if (!stored) await saveNow();
      return this.data;
    },
    save() { saveLater(); },
    saveNow,
    async reset() {
      await AL.Media.clearAll();
      this.data = AL.defaults();
      await saveNow();
    },
    log(entry) {
      const d = this.data;
      d.log.push({ ...entry, at: Date.now() });
      if (d.log.length > 500) d.log.splice(0, d.log.length - 500);
      this.save();
    },
    get s() { return this.data.settings; },
  };
})();
