/* Rodičovská zóna – nastavenia, vlastné fotografie a hlas, rutiny, osoby, zvuky, prehľad a záloha.
   Vstup: na úvodnej obrazovke podržať ikonu vpravo hore 3 sekundy. */
(function () {
  'use strict';
  const AL = window.AL;
  const el = AL.el;
  const D = () => AL.Config.data;
  const save = () => AL.Config.save();

  const openRoutines = new Set();
  let activeRec = null;
  let recStarting = false;

  /* ---------- Malé stavebné prvky formulára ---------- */
  const icon = (n) => el('span', { html: AL.Icon(n), style: { display: 'inline-flex' } });

  function btn(label, iconName, onClick, cls) {
    const b = el('button', { class: 'btn' + (cls ? ' ' + cls : ''), type: 'button' }, iconName ? icon(iconName) : null, label);
    if (onClick) b.addEventListener('click', onClick);
    return b;
  }

  function field(label, input, inline) {
    return el('label', { class: 'pz-field' + (inline ? ' inline' : '') }, inline ? [input, el('span', null, label)] : [el('span', null, label), input]);
  }

  function textField(label, obj, key, opts) {
    opts = opts || {};
    const i = el('input', { type: 'text', value: obj[key] == null ? '' : obj[key], placeholder: opts.placeholder, maxlength: '80' });
    i.addEventListener('input', () => { obj[key] = i.value; save(); opts.onInput && opts.onInput(i.value); });
    return field(label, i);
  }

  function numberField(label, obj, key, { min, max, step = 1 }) {
    const i = el('input', { type: 'number', value: obj[key], min, max, step, style: { width: '110px' } });
    i.addEventListener('change', () => {
      let v = parseFloat(i.value);
      if (isNaN(v)) v = obj[key];
      v = AL.clamp(v, min, max);
      i.value = v;
      obj[key] = v;
      save();
    });
    return field(label, i);
  }

  function checkField(label, obj, key, opts) {
    opts = opts || {};
    const i = el('input', { type: 'checkbox' });
    i.checked = !!obj[key];
    i.addEventListener('change', () => {
      if (opts.validate && opts.validate(i.checked) === false) { i.checked = !i.checked; return; }
      obj[key] = i.checked;
      save();
      opts.after && opts.after(i.checked);
    });
    return field(label, i, true);
  }

  function rangeField(label, obj, key, { min, max, step, fmt }, after) {
    const out = el('strong', { style: { color: 'var(--ink)' } }, fmt(obj[key]));
    const i = el('input', { type: 'range', min, max, step, value: obj[key] });
    i.addEventListener('input', () => { obj[key] = parseFloat(i.value); out.textContent = fmt(obj[key]); save(); after && after(); });
    return el('label', { class: 'pz-field' }, el('span', null, label, ' ', out), i);
  }

  function selectField(label, obj, key, options, after) {
    const s = el('select');
    options.forEach((o) => {
      const op = el('option', null, o.label);
      if ((obj[key] == null ? null : obj[key]) === (o.value == null ? null : o.value)) op.selected = true;
      s.append(op);
    });
    s.addEventListener('change', () => { obj[key] = options[s.selectedIndex].value; save(); after && after(); });
    return field(label, s);
  }

  function note(text, warn) { return el('div', { class: 'pz-note' + (warn ? ' warn' : '') }, text); }

  function flashError(host, msg) {
    const n = note(msg, true);
    host.append(n);
    setTimeout(() => n.remove(), 7000);
  }

  function confirmButton(label, iconName, question, onYes) {
    const wrap = el('span', { class: 'confirm-inline' });
    const show = () => {
      wrap.innerHTML = '';
      wrap.append(btn(label, iconName, ask, 'danger'));
    };
    let busy = false; // dvojité ťuknutie na „Áno" nesmie mazať dvakrát
    const ask = () => {
      wrap.innerHTML = '';
      wrap.append(el('span', null, question), btn('Áno', null, async () => {
        if (busy) return;
        busy = true;
        wrap.innerHTML = '';
        try { await onYes(); } finally { busy = false; }
      }, 'danger'), btn('Nie', null, show));
    };
    show();
    return wrap;
  }

  /** Odstráni prvok z poľa, len ak tam ešte je (splice s indexOf = -1 by zmazal posledný prvok) */
  const drop = (arr, x) => { const i = arr.indexOf(x); if (i >= 0) arr.splice(i, 1); };

  const move = (arr, i, d) => {
    const j = i + d;
    if (j < 0 || j >= arr.length) return false;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    return true;
  };

  async function removeMedia(...ids) { for (const id of ids) if (id) await AL.Media.remove(id); }

  /* ---------- Obrázok: fotografia (fotoaparát, súbor, schránka, pretiahnutie) alebo ilustrácia ---------- */
  const CLIP_HELP = 'Obrázok z internetu: na počítači kliknite naň pravým tlačidlom → „Kopírovať obrázok" a tu stlačte „Vložiť obrázok" (alebo kliknite na náhľad a stlačte Ctrl+V). Na tablete obrázok podržte prstom → „Stiahnuť / Uložiť obrázok" a potom ho vyberte cez „Fotka / súbor".';
  const canReadClipboard = () => !!(window.isSecureContext && navigator.clipboard && navigator.clipboard.read);
  let pasteTarget = null; // editor, do ktorého pôjde obrázok vložený cez Ctrl+V

  async function storePhoto(item, blob) {
    const small = await AL.resizeImage(blob);
    const id = await AL.Media.add(small, 'img');
    const old = item.photo;
    item.photo = id;
    await removeMedia(old);
  }

  async function readClipboardImage() {
    for (const it of await navigator.clipboard.read()) {
      const type = it.types.find((t) => t.startsWith('image/'));
      if (type) return it.getType(type);
    }
    return null;
  }

  function imageEditor(item, opts) {
    opts = opts || {};
    const box = el('div', { class: 'pz-img', style: { display: 'flex', flexDirection: 'column', gap: '8px', width: opts.compact ? '160px' : '200px', flex: 'none' } });
    const host = opts.host || box;
    let picker = null;
    const closePicker = () => { if (picker) { picker.remove(); picker = null; } };
    const changed = () => { save(); render(); opts.onChange && opts.onChange(); };
    const setPhoto = async (blob) => {
      try { await storePhoto(item, blob); changed(); } catch (e) { flashError(host, e.message || 'Fotografiu sa nepodarilo uložiť.'); }
    };

    function render() {
      box.innerHTML = '';
      // accept=image/* → na tablete sa ponúkne fotoaparát aj galéria
      const input = el('input', { type: 'file', accept: 'image/*' });
      input.addEventListener('change', () => { const f = input.files && input.files[0]; input.value = ''; if (f) setPhoto(f); });
      const btns = el('div', { class: 'pz-btns' },
        el('label', { class: 'btn' }, icon('camera'), item.photo ? 'Zmeniť fotku' : 'Fotka / súbor', input));
      if (canReadClipboard()) {
        btns.append(btn('Vložiť obrázok', 'image', async () => {
          try {
            const b = await readClipboardImage();
            if (b) setPhoto(b); else flashError(host, 'Schránka neobsahuje obrázok. ' + CLIP_HELP);
          } catch (e) { flashError(host, 'Prehliadač nepovolil prístup ku schránke. ' + CLIP_HELP); }
        }));
      }
      if (item.photo) btns.append(btn('Bez fotky', 'trash', async () => { await removeMedia(item.photo); item.photo = null; changed(); }));
      if (opts.allowArt !== false) {
        btns.append(btn('Ilustrácia', 'image', () => {
          if (picker) return closePicker();
          picker = el('div', { class: 'art-picker', style: { width: '100%' } });
          AL.Art.catalog.forEach((id) => {
            const b = el('button', { type: 'button', title: id, html: AL.Art.svg(id) });
            b.addEventListener('click', async () => {
              item.art = id;
              if (item.photo) { await removeMedia(item.photo); item.photo = null; }
              closePicker();
              changed();
            });
            picker.append(b);
          });
          host.append(picker);
        }));
      }
      const thumb = el('div', { class: 'pz-thumb drop-target', tabindex: '0', title: 'Obrázok sem môžete pretiahnuť zo súboru alebo vložiť (Ctrl+V)', style: { width: opts.compact ? '104px' : '140px' } }, AL.picture(item));
      const mark = () => { pasteTarget = setPhoto; };
      thumb.addEventListener('focus', mark);
      box.addEventListener('pointerdown', mark);
      thumb.addEventListener('dragover', (e) => { e.preventDefault(); thumb.classList.add('drag-over'); });
      thumb.addEventListener('dragleave', () => thumb.classList.remove('drag-over'));
      thumb.addEventListener('drop', (e) => {
        e.preventDefault();
        thumb.classList.remove('drag-over');
        const f = [...((e.dataTransfer && e.dataTransfer.files) || [])].find((x) => x.type.startsWith('image/'));
        if (f) setPhoto(f); else flashError(host, CLIP_HELP);
      });
      box.append(thumb, btns);
    }
    render();
    return box;
  }

  /* ---------- Nahrávanie z mikrofónu ---------- */
  function recordButton(labelIdle, onBlob, host) {
    if (!AL.Recorder.supported) {
      // Napr. tablet cez http://192.168… – mikrofón prehliadač nepovolí, otvoríme diktafón alebo výber zvukového súboru
      const input = el('input', { type: 'file', accept: 'audio/*', capture: '' });
      input.addEventListener('change', async () => { const f = input.files && input.files[0]; input.value = ''; if (f) await onBlob(f); });
      return el('label', { class: 'btn', title: 'Otvorí diktafón alebo výber zvukového súboru' }, icon('mic'), labelIdle, input);
    }
    const b = btn(labelIdle, 'mic', async () => {
      if (recStarting) return; // dvojité ťuknutie počas spúšťania mikrofónu
      // nahrávanie začaté na tlačidle, ktoré už nie je na obrazovke (prekreslenie, iná záložka) → zahodiť
      if (activeRec && !activeRec.isConnected) { await AL.Recorder.stop(); activeRec = null; }
      if (activeRec && activeRec !== b) return;
      if (activeRec === b) {
        const blob = await AL.Recorder.stop();
        activeRec = null;
        b.classList.remove('recording');
        b.lastChild.textContent = labelIdle;
        if (blob && blob.size > 0) await onBlob(blob);
        return;
      }
      recStarting = true;
      try {
        await AL.Recorder.start();
        activeRec = b;
        b.classList.add('recording');
        b.lastChild.textContent = 'Zastaviť nahrávanie';
      } catch (e) {
        flashError(host, 'Mikrofón nie je dostupný. Povoľte ho v prehliadači (ikona zámku/kamery pri adrese).');
      } finally {
        recStarting = false;
      }
    });
    return b;
  }

  /** Vlastný hlas rodiča pre vetu / krok / meno. Bez nahrávky sa použije syntetický hlas (ak je slovenský). */
  function voiceEditor(item, getText, host) {
    const box = el('div', { class: 'pz-btns' });
    const setAudio = async (blob) => {
      const id = await AL.Media.add(blob, 'aud');
      const old = item.audio;
      item.audio = id;
      await removeMedia(old);
      save();
      render();
    };
    function render() {
      box.innerHTML = '';
      box.append(btn('Vypočuť', 'volHigh', () => AL.Speech.say(getText(), item.audio)));
      const rec = recordButton(item.audio ? 'Nahrať hlas znova' : 'Nahrať môj hlas', setAudio, host || box);
      if (rec) box.append(rec);
      if (AL.Recorder.supported) {
        const up = el('input', { type: 'file', accept: 'audio/*' });
        up.addEventListener('change', async () => { const f = up.files && up.files[0]; up.value = ''; if (f) await setAudio(f); });
        box.append(el('label', { class: 'btn', title: 'Vložiť zvukový súbor, napr. nahrávku z mobilu' }, icon('upload'), 'Súbor', up));
      }
      if (item.audio) box.append(btn('Zmazať nahrávku', 'trash', async () => { await removeMedia(item.audio); item.audio = null; save(); render(); }));
      box.append(el('span', { style: { fontSize: '.85rem', color: 'var(--ink-faint)' } },
        item.audio ? 'Nahratý váš hlas' : AL.Speech.canSpeak() ? 'Syntetický hlas' : 'Bez nahrávky (zatiaľ ticho)'));
    }
    render();
    return box;
  }

  /* ---------- Karty záložiek ---------- */
  const TABS = [
    { id: 'general', label: 'Všeobecné' },
    { id: 'pecs', label: 'Komunikácia' },
    { id: 'routines', label: 'Rutiny' },
    { id: 'timer', label: 'Čakanie' },
    { id: 'sensory', label: 'Zvuky' },
    { id: 'faces', label: 'Tváre' },
    { id: 'show', label: 'Ukáž' },
    { id: 'progress', label: 'Prehľad' },
    { id: 'backup', label: 'Záloha' },
  ];

  const R = {};

  R.general = function (sec, ctx) {
    const s = AL.Config.s;
    sec.append(el('h2', null, 'Dieťa'),
      el('div', { class: 'pz-card' },
        textField('Meno dieťaťa (nepovinné – použije sa pri pozdrave a pochvale)', D().child, 'name', { placeholder: 'napr. Peťo' })));

    // Hlas
    const voices = AL.Speech.voices().slice().sort((a, b) => (/^sk/i.test(b.lang) - /^sk/i.test(a.lang)) || a.name.localeCompare(b.name));
    const voiceCard = el('div', { class: 'pz-card' });
    if (!AL.Speech.supported) voiceCard.append(note('Tento prehliadač nepodporuje syntetickú reč. Nahrajte vlastný hlas pri kartách, alebo použite Microsoft Edge či Google Chrome.', true));
    else if (!AL.Speech.hasSlovak() && AL.isAndroid) voiceCard.append(note('Nenašiel sa slovenský hlas, preto aplikácia zatiaľ vety nevyslovuje (iba prehrá váš nahratý hlas). V tablete: Nastavenia → Všeobecná správa (alebo Systém) → Jazyk a vstup → Prevod textu na reč → preferovaný nástroj „Google" → ozubené koliesko → Inštalovať hlasové údaje → Slovenčina. Potom aplikáciu úplne zatvorte a znova otvorte. Alebo pri kartách nahrajte vlastný hlas – pre dieťa je najprirodzenejší.', true));
    else if (!AL.Speech.hasSlovak()) voiceCard.append(note('Nenašiel sa slovenský hlas, preto aplikácia zatiaľ vety nevyslovuje (iba prehrá váš nahratý hlas). Riešenia: (1) vo Windows pridajte slovenský hlas: Nastavenia → Čas a jazyk → Reč → Pridať hlasy → Slovenčina – funguje aj bez internetu; (2) otvorte aplikáciu v Microsoft Edge s pripojením na internet (hlasy Viktória a Lukáš); (3) pri kartách nahrajte vlastný hlas – pre dieťa je najprirodzenejší.', true));
    voiceCard.append(
      selectField('Hlas', s, 'voiceURI', [{ value: null, label: 'Automaticky (slovenský, ak je k dispozícii)' }]
        .concat(voices.map((v) => ({ value: v.voiceURI, label: `${v.name} (${v.lang})` })))),
      rangeField('Rýchlosť reči', s, 'rate', { min: 0.6, max: 1.2, step: 0.05, fmt: (v) => Math.round(v * 100) + ' %' }),
      el('div', { class: 'pz-btns' }, btn('Vyskúšať hlas', 'volHigh', () => AL.Speech.say('Ahoj! Chcem piť.'))));
    sec.append(el('h2', null, 'Hlas aplikácie'), voiceCard);
    if (AL.Speech.supported && !voices.length && window.speechSynthesis.addEventListener) {
      ctx.scope.on(window.speechSynthesis, 'voiceschanged', () => ctx.rerender());
    }

    sec.append(el('h2', null, 'Spätná väzba'), el('div', { class: 'pz-card' },
      rangeField('Hlasitosť jemných zvukov (pochvala, dokončenie)', s, 'feedbackVolume', { min: 0, max: 1, step: 0.05, fmt: (v) => Math.round(v * 100) + ' %' }),
      el('div', { class: 'pz-btns' }, btn('Vyskúšať zvuk', 'play', () => AL.Sound.chime())),
      checkField('Pochvala hlasom („Výborne!", „Super!")', s, 'praiseVoice'),
      checkField('Obmedziť pohyb a animácie', s, 'reduceMotion', { after: () => AL.applySettings() })));

    const modCard = el('div', { class: 'pz-card' },
      note('Dieťa uvidí na úvodnej obrazovke iba zapnuté aktivity. Ak necháte zapnutú jedinú, dieťa sa nemôže „stratiť" v aplikácii.'));
    AL.MODULE_LIST.forEach((m) => modCard.append(checkField(`${m.label} – ${m.desc}`, s.modules, m.id)));
    sec.append(el('h2', null, 'Aktivity na úvodnej obrazovke'), modCard);

    sec.append(el('h2', null, 'Ovládanie pre dospelých'), el('div', { class: 'pz-card' },
      note('Dieťa sa pohybuje len priamym dotykom – bez menu, bez tlačidla späť. Dospelý sa vráti na úvod podržaním ikony domčeka vľavo hore (2 s). Do Rodičovskej zóny sa dostanete podržaním ikony vpravo hore na úvodnej obrazovke (3 s).'),
      el('div', { class: 'pz-btns' }, btn('Celá obrazovka', 'arrow', () => { const d = document.documentElement; (d.requestFullscreen || d.webkitRequestFullscreen || (() => {})).call(d); }))));

    // Tablet: inštalácia na plochu a zamknutie dieťaťa v aplikácii
    const tab = el('div', { class: 'pz-card' });
    if (AL.isInstalled()) {
      tab.append(note('✓ Aplikácia je nainštalovaná a beží na celú obrazovku.'));
    } else if (AL.installPrompt) {
      tab.append(note('Nainštalujte aplikáciu na plochu – potom sa otvára ikonou, na celú obrazovku a funguje aj bez internetu.'),
        el('div', { class: 'pz-btns' }, btn('Nainštalovať na plochu', 'download', async () => {
          const p = AL.installPrompt;
          AL.installPrompt = null;
          p.prompt();
          try { await p.userChoice; } catch (e) { /* nič */ }
          ctx.rerender();
        }, 'primary')));
    } else if (location.protocol === 'https:') {
      tab.append(note('Inštalácia: v prehliadači Chrome ťuknite na ⋮ (vpravo hore) → „Pridať na plochu" alebo „Inštalovať aplikáciu".'));
    } else {
      tab.append(note('Na tablet si aplikáciu nainštalujete z jej internetovej adresy (https://…) – postup je v súbore README.md.'));
    }
    tab.append(note('Aby dieťa aplikáciu nezavrelo: v tablete zapnite „Pripnutie aplikácie" (Nastavenia → Zabezpečenie a súkromie → Ďalšie nastavenia zabezpečenia → Pripnúť aplikáciu; na Samsungu „Pripnúť okná"). Potom otvorte prehľad aplikácií, ťuknite na ikonu AutiLab nad oknom → „Pripnúť túto aplikáciu". Odopnete podržaním tlačidiel Späť a Prehľad (pri gestách potiahnutím nahor a podržaním).'));
    tab.append(el('div', { style: { fontSize: '.85rem', color: 'var(--ink-faint)' } }, 'Verzia aplikácie: ' + AL.VERSION));
    sec.append(el('h2', null, 'Tablet'), tab);
  };

  R.pecs = function (sec, ctx) {
    const p = D().pecs;
    sec.append(note('Dieťa vidí zapnuté karty (odporúčame 2–3, najviac 4). Najlepšie fungujú skutočné fotografie predmetov z vášho domova – vlastný pohár, obľúbená hračka, vaše WC. Nahrajte aj vetu vlastným hlasom.'));
    sec.append(el('div', { class: 'pz-card' },
      checkField('Dovoliť aj ťuknutie (karta sama prejde na pásku) – vhodné pre deti s ťažšou jemnou motorikou', p, 'allowTap'),
      numberField('Karta sa vráti z pásky späť po (sekundách)', p, 'returnDelay', { min: 2, max: 60 })));

    p.cards.forEach((c, i) => {
      const card = el('div', { class: 'pz-card' + (c.active ? '' : ' inactive') });
      const activeCount = () => p.cards.filter((x) => x.active).length;
      card.append(el('div', { class: 'pz-row' },
        imageEditor(c, { host: card }),
        el('div', { class: 'pz-fields' },
          checkField('Zobraziť dieťaťu', c, 'active', {
            validate: (on) => {
              if (on && activeCount() >= 4) { flashError(card, 'Naraz môžu byť zapnuté najviac 4 karty – menej je pre dieťa prehľadnejšie.'); return false; }
              return true;
            },
            after: (on) => card.classList.toggle('inactive', !on),
          }),
          textField('Názov na karte', c, 'label'),
          textField('Veta, ktorú aplikácia povie', c, 'phrase', { placeholder: 'Chcem piť.' }),
          voiceEditor(c, () => c.phrase || c.label, card),
          el('div', { class: 'pz-btns' },
            btn('Vyššie', 'up', () => { if (move(p.cards, i, -1)) { save(); ctx.rerender(); } }),
            btn('Nižšie', 'down', () => { if (move(p.cards, i, 1)) { save(); ctx.rerender(); } }),
            confirmButton('Odstrániť', 'trash', 'Odstrániť kartu?', async () => {
              await removeMedia(c.photo, c.audio);
              drop(p.cards, c);
              save();
              ctx.rerender();
            })))));
      sec.append(card);
    });
    sec.append(el('div', { class: 'pz-btns' }, btn('Pridať kartu', 'plus', () => {
      p.cards.push({ id: AL.uid('c'), label: 'Nová karta', phrase: 'Chcem…', art: 'hug', photo: null, audio: null, active: false });
      save();
      ctx.rerender();
    }, 'primary')));
  };

  R.routines = function (sec, ctx) {
    const list = D().routines;
    sec.append(note('Každú činnosť rozdeľte na 2 až 6 jednoduchých krokov (ideálne 3). Fotografie z vašej kúpeľne a vlastný hlas pomáhajú dieťaťu preniesť nácvik do reálneho života.'));
    list.forEach((r, ri) => {
      const d = el('details', { class: 'pz-card' });
      if (openRoutines.has(r.id)) d.open = true;
      d.addEventListener('toggle', () => { if (d.open) openRoutines.add(r.id); else openRoutines.delete(r.id); });
      const sumPic = AL.picture(r);
      const sumTitle = el('span', null, r.title);
      d.append(el('summary', null, sumPic, sumTitle, el('span', { style: { color: 'var(--ink-faint)', fontWeight: 400, fontSize: '.9rem' } }, `(${r.steps.length} ${r.steps.length === 1 ? 'krok' : r.steps.length < 5 ? 'kroky' : 'krokov'})`)));

      d.append(el('div', { class: 'pz-row' },
        imageEditor(r, { host: d, onChange: () => ctx.rerender() }),
        el('div', { class: 'pz-fields' }, textField('Názov činnosti', r, 'title', { onInput: (v) => { sumTitle.textContent = v; } }))));

      const stepsBox = el('div', { class: 'pz-steps' });
      r.steps.forEach((s, si) => {
        const row = el('div', { class: 'pz-step' });
        row.append(el('span', { class: 'num' }, String(si + 1) + '.'),
          imageEditor(s, { host: row, compact: true }),
          el('div', { class: 'pz-fields' },
            textField('Text kroku', s, 'text'),
            voiceEditor(s, () => s.text, row),
            el('div', { class: 'pz-btns' },
              btn('Vyššie', 'up', () => { if (move(r.steps, si, -1)) { save(); ctx.rerender(); } }),
              btn('Nižšie', 'down', () => { if (move(r.steps, si, 1)) { save(); ctx.rerender(); } }),
              r.steps.length > 1 ? confirmButton('Odstrániť krok', 'trash', 'Naozaj?', async () => {
                await removeMedia(s.photo, s.audio);
                drop(r.steps, s);
                save();
                ctx.rerender();
              }) : null)));
        stepsBox.append(row);
      });
      d.append(stepsBox);
      d.append(el('div', { class: 'pz-btns' },
        r.steps.length < 6 ? btn('Pridať krok', 'plus', () => {
          r.steps.push({ id: AL.uid('s'), text: 'Nový krok', art: 'wash', photo: null, audio: null });
          save();
          ctx.rerender();
        }) : null,
        btn('Vyššie', 'up', () => { if (move(list, ri, -1)) { save(); ctx.rerender(); } }),
        btn('Nižšie', 'down', () => { if (move(list, ri, 1)) { save(); ctx.rerender(); } }),
        confirmButton('Odstrániť činnosť', 'trash', `Odstrániť „${r.title}"?`, async () => {
          await removeMedia(r.photo, ...r.steps.flatMap((s) => [s.photo, s.audio]));
          drop(list, r);
          save();
          ctx.rerender();
        })));
      sec.append(d);
    });
    sec.append(el('div', { class: 'pz-btns' }, btn('Pridať činnosť', 'plus', () => {
      const r = {
        id: AL.uid('r'), title: 'Nová činnosť', art: 'stepsTile', photo: null,
        steps: [1, 2, 3].map((n) => ({ id: AL.uid('s'), text: 'Krok ' + n, art: 'wash', photo: null, audio: null })),
      };
      list.push(r);
      openRoutines.add(r.id);
      save();
      ctx.rerender();
    }, 'primary')));
  };

  R.timer = function (sec) {
    const t = D().timer;
    const PRESETS = [0.5, 1, 2, 3, 5, 10, 15, 20];
    const durBox = el('div', { class: 'pz-tags' });
    PRESETS.forEach((m) => {
      const i = el('input', { type: 'checkbox' });
      i.checked = t.durations.includes(m);
      i.addEventListener('change', () => {
        const set = new Set(t.durations);
        if (i.checked) set.add(m); else set.delete(m);
        if (!set.size) { i.checked = true; return; }
        t.durations = [...set].sort((a, b) => a - b);
        save();
      });
      durBox.append(field(m < 1 ? Math.round(m * 60) + ' s' : m + ' min', i, true));
    });
    sec.append(note('Deti s PAS často nerozumejú pojmom ako „o 5 minút". Časovač preto neukazuje čísla – čas plynie viditeľne. Začnite krátkymi časmi (30 s – 1 min) a predlžujte ich postupne. Pri „Potom" ukážte dieťaťu, čo príde po čakaní – s voľbou „Obrázok" sa postupne odkrýva práve táto karta.'));
    sec.append(el('div', { class: 'pz-card' },
      el('div', { class: 'pz-field' }, el('span', null, 'Časy, z ktorých sa vyberá'), durBox),
      selectField('Predvolené zobrazenie', t, 'visual', AL.VISUALS.map((v) => ({ value: v.id, label: v.label }))),
      selectField('Predvolená pokojná činnosť', t, 'calm', AL.CALM.map((c) => ({ value: c.id, label: c.label }))),
      checkField('Na konci jemný tón (ako tichá miska)', t, 'endSound'),
      checkField('Zobraziť zostávajúci čas malým písmom (pre dospelých)', t, 'showAdultTime')));

    const rv = { get photo() { return t.revealPhoto; }, set photo(v) { t.revealPhoto = v; }, art: 'scene' };
    const card = el('div', { class: 'pz-card' }, el('strong', null, 'Obrázok, ktorý sa odkrýva (ak nie je zvolené „Potom")'));
    card.append(el('div', { class: 'pz-row' }, imageEditor(rv, { host: card, allowArt: false }),
      el('div', { class: 'pz-fields' }, note('Napr. fotografia miesta, kam pôjdete, alebo obľúbenej veci. Bez fotografie sa použije pokojná krajinka.'))));
    sec.append(card);
  };

  R.sensory = function (sec, ctx) {
    const s = D().sensory;
    sec.append(note('Postup: v pokojnej chvíli, krátko, začnite na nízkej hlasitosti. Dieťa samo rozhoduje, kedy zvuk zapne a vypne – práve pocit kontroly znižuje úzkosť. Strop hlasitosti zvyšujte postupne podľa toho, čo dieťa zvláda (pozrite záložku Prehľad).'));
    sec.append(note('Zabudované zvuky sú syntetické napodobeniny. Najväčší účinok má skutočná nahrávka zvuku z vášho okolia (váš vysávač, zvonček pri vašich dverách) – nahrajte ju mobilom a vložte sem, alebo ju nahrajte priamo mikrofónom.', true));
    sec.append(el('div', { class: 'pz-card' },
      rangeField('Počiatočná hlasitosť posuvníka', s, 'startVolume', { min: 0, max: 100, step: 1, fmt: (v) => v + ' %' }),
      rangeField('Strop hlasitosti (maximum, ktoré dieťa posuvníkom dosiahne)', s, 'maxVolume', { min: 5, max: 100, step: 1, fmt: (v) => v + ' %' })));

    s.sounds.forEach((snd, i) => {
      const card = el('div', { class: 'pz-card' });
      const status = el('span', { style: { fontSize: '.85rem', color: 'var(--ink-faint)' } });
      const btns = el('div', { class: 'pz-btns' });
      let preview = null;
      function renderBtns() {
        btns.innerHTML = '';
        status.textContent = snd.audio ? 'Používa sa vaša nahrávka' : snd.synth ? 'Používa sa zabudovaný (syntetický) zvuk' : 'Chýba zvuk – dieťa ho zatiaľ neuvidí';
        const input = el('input', { type: 'file', accept: 'audio/*' });
        input.addEventListener('change', async () => {
          const f = input.files && input.files[0];
          if (!f) return;
          if (f.size > 15 * 1024 * 1024) return flashError(card, 'Súbor je príliš veľký (max. 15 MB). Stačí krátka nahrávka 10–30 sekúnd.');
          await setAudio(f);
        });
        btns.append(el('label', { class: 'btn' }, icon('upload'), 'Vložiť zvukový súbor', input));
        const rec = recordButton('Nahrať mikrofónom', setAudio, card);
        if (rec) btns.append(rec);
        btns.append(btn('Vypočuť ukážku (3 s)', 'play', () => {
          if (preview) return;
          preview = new AL.SensoryPlayer(snd);
          preview.setVolume(0.6);
          preview.start();
          setTimeout(() => { preview && preview.stop(); preview = null; }, 3000);
        }));
        if (snd.audio) btns.append(btn(snd.synth ? 'Späť na zabudovaný zvuk' : 'Odstrániť nahrávku', 'trash', async () => { await removeMedia(snd.audio); snd.audio = null; save(); renderBtns(); }));
        btns.append(status);
      }
      async function setAudio(blob) {
        const id = await AL.Media.add(blob, 'snd');
        const old = snd.audio;
        snd.audio = id;
        await removeMedia(old);
        save();
        renderBtns();
      }
      renderBtns();
      ctx.scope.add(() => { if (preview) preview.stop(); });
      card.append(el('div', { class: 'pz-row' },
        imageEditor(snd, { host: card }),
        el('div', { class: 'pz-fields' },
          textField('Názov', snd, 'label'),
          btns,
          el('div', { class: 'pz-btns' },
            btn('Vyššie', 'up', () => { if (move(s.sounds, i, -1)) { save(); ctx.rerender(); } }),
            btn('Nižšie', 'down', () => { if (move(s.sounds, i, 1)) { save(); ctx.rerender(); } }),
            confirmButton('Odstrániť', 'trash', 'Odstrániť zvuk?', async () => {
              await removeMedia(snd.photo, snd.audio);
              drop(s.sounds, snd);
              save();
              ctx.rerender();
            })))));
      sec.append(card);
    });
    sec.append(el('div', { class: 'pz-btns' }, btn('Pridať vlastný zvuk', 'plus', () => {
      s.sounds.push({ id: AL.uid('snd'), label: 'Nový zvuk', art: 'speaker', photo: null, audio: null, synth: null });
      save();
      ctx.rerender();
    }, 'primary')));
  };

  R.faces = function (sec, ctx) {
    const f = D().faces;
    sec.append(note('Nahrajte skutočné fotografie tvárí zblízka, na pokojnom pozadí (mama, otec, súrodenec, pani učiteľka, váš lekár…). Ilustrácie slúžia len ako ukážka. Pri osobách označte, v akej situácii dieťaťu pomôžu – z toho vzniknú otázky typu „Kto ti pomôže, keď sa stratíš?".'));
    sec.append(el('div', { class: 'pz-card' },
      selectField('Počet možností na výber', f, 'options', [{ value: 2, label: '2 (jednoduchšie)' }, { value: 3, label: '3' }]),
      numberField('Počet otázok v jednom kole', f, 'rounds', { min: 1, max: 20 }),
      el('div', { class: 'pz-field' }, el('span', null, 'Typy otázok'),
        el('div', { class: 'pz-tags' },
          checkField('„Kde je …?" – dieťa hľadá fotografiu', f.modes, 'find'),
          checkField('„Kto je to?" – dieťa vyberá meno', f.modes, 'name'),
          checkField('„Kto ti pomôže …?" – bezpečné osoby', f.modes, 'help')))));

    f.persons.forEach((p) => {
      const card = el('div', { class: 'pz-card' });
      const tags = el('div', { class: 'pz-tags' });
      AL.SITUATIONS.forEach((sit) => {
        const i = el('input', { type: 'checkbox' });
        i.checked = p.tags.includes(sit.id);
        i.addEventListener('change', () => {
          p.tags = p.tags.filter((t) => t !== sit.id);
          if (i.checked) p.tags.push(sit.id);
          save();
        });
        tags.append(field(sit.short, i, true));
      });
      card.append(el('div', { class: 'pz-row' },
        imageEditor(p, { host: card }),
        el('div', { class: 'pz-fields' },
          textField('Meno / oslovenie (ako ho dieťa používa)', p, 'name', { placeholder: 'napr. Mama, Ocko, Janka' }),
          el('div', { class: 'pz-field' }, el('span', null, 'Táto osoba…'), tags),
          el('div', { class: 'pz-field' }, el('span', null, 'Meno vyslovené vaším hlasom (nepovinné)'), voiceEditor(p, () => p.name, card)),
          el('div', { class: 'pz-btns' }, confirmButton('Odstrániť osobu', 'trash', 'Naozaj?', async () => {
            await removeMedia(p.photo, p.audio);
            drop(f.persons, p);
            save();
            ctx.rerender();
          })))));
      sec.append(card);
    });
    sec.append(el('div', { class: 'pz-btns' }, btn('Pridať osobu', 'plus', () => {
      f.persons.push({ id: AL.uid('p'), name: '', art: 'person', photo: null, audio: null, tags: [] });
      save();
      ctx.rerender();
    }, 'primary')));
  };

  const openSets = new Set();

  /** Z názvu súboru „pes.jpg" urobí „pes"; názvy z fotoaparátu (IMG_1234) vynechá */
  const nameFromFile = (fname) => {
    const n = fname.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s*\(\d+\)\s*$/, '').replace(/\s+/g, ' ').trim();
    const generic = /^(img|dsc|dcim|pxl|mvimg|photo|foto|image|images|obrázok|download|stiahnuť|stiahnuté|unnamed|untitled|screenshot|snímka|whatsapp|received|signal|fb|tmp)(?![a-záäčďéíĺľňóôŕšťúýž])/i;
    return !n || generic.test(n) || /\d{4,}/.test(n) || /^[\d\s]+$/.test(n) ? '' : n.toLocaleLowerCase('sk');
  };

  R.show = function (sec, ctx) {
    const s = D().show;
    const P = AL.SHOW_PHRASES;
    sec.append(note('Dieťa počuje názov a ťukne na správny obrázok. Pri správnej odpovedi sa obrázok zväčší na celú obrazovku a zopakuje sa názov. Pri nesprávnej zaznie „Nesprávne", zadanie sa zopakuje a obrázky sa premiešajú – správny obrázok sa presunie inam. Jeho miesto je náhodné, aby sa nedalo uhádnuť. Tip: pridajte viac fotiek s rovnakým názvom (napr. rôzne psy) – dieťa sa naučí, že „pes" je každý pes; spolu na obrazovke sa nikdy neukážu.'));

    sec.append(el('h2', null, 'Nastavenia'), el('div', { class: 'pz-card' },
      selectField('Počet obrázkov na obrazovke', s, 'count', [2, 3, 4, 5, 6].map((n) => ({ value: n, label: String(n) }))),
      checkField('Pri každom spustení vybrať skupinu a počet obrázkov (na začiatku aktivity)', s, 'askEachTime'),
      selectField('Zadanie', s, 'prompt', [
        { value: 'name', label: 'Len názov – „pes"' },
        { value: 'where', label: 'Otázka – „Kde je pes?"' },
        { value: 'show', label: 'Pokyn – „Ukáž pes"' },
      ], () => ctx.rerender()),
      selectField('Po správnej odpovedi', s, 'correct', [
        { value: 'name', label: '„Správne, pes"' },
        { value: 'thisIs', label: '„Správne, to je pes"' },
      ], () => ctx.rerender()),
      checkField('Po nesprávnej odpovedi povedať „Nesprávne" (inak sa zadanie len zopakuje)', s, 'wrongSay', { after: () => ctx.rerender() }),
      checkField('Po dvoch chybách jemne ukázať správny obrázok', s, 'hintAfter2'),
      checkField('Pri zväčšenom obrázku zobraziť aj názov textom', s, 'showName'),
      numberField('Počet úloh v jednom kole', s, 'rounds', { min: 3, max: 30 })));

    const used = { where: s.prompt === 'where', show: s.prompt === 'show', correct: s.correct === 'name', correctThisIs: s.correct === 'thisIs', wrong: s.wrongSay };
    const phr = el('div', { class: 'pz-card' },
      note('Nahrajte krátke slová vlastným hlasom. Aplikácia ich spojí s názvom obrázka, napr. „Kde je" + „pes". Stačí nahrať tie, ktoré práve používate (označené ✓).'));
    Object.keys(P).forEach((k) => {
      const proxy = { get audio() { return s.phrases[k]; }, set audio(v) { s.phrases[k] = v; } };
      phr.append(el('div', { class: 'pz-row center', style: { opacity: used[k] ? '1' : '.55' } },
        el('strong', { style: { minWidth: '160px' } }, (used[k] ? '✓ ' : '') + '„' + P[k] + '"'),
        voiceEditor(proxy, () => P[k], phr)));
    });
    sec.append(el('h2', null, 'Spoločné slová vaším hlasom'), phr);

    sec.append(el('h2', null, 'Skupiny obrázkov'));
    sec.append(note('Obrázky odfoťte fotoaparátom (na tablete „Fotka / súbor" ponúkne aj fotoaparát) alebo vložte z internetu. Pri každom obrázku nahrajte jeho názov vlastným hlasom. ' + CLIP_HELP));
    if (!AL.Speech.canSpeak()) {
      const missing = s.sets.reduce((n, st) => n + st.items.filter((i) => !i.audio).length, 0);
      if (missing) sec.append(note(`Pri ${missing} obrázkoch chýba nahratý názov a slovenský syntetický hlas nie je dostupný – dieťa zadanie nepočuje, zobrazí sa iba text.`, true));
    }

    s.sets.forEach((set) => {
      const d = el('details', { class: 'pz-card' });
      if (openSets.has(set.id)) d.open = true;
      d.addEventListener('toggle', () => { if (d.open) openSets.add(set.id); else openSets.delete(set.id); });
      const title = el('span', null, set.name);
      d.append(el('summary', null, AL.picture(set.items[0] || { art: 'placeholder' }), title,
        el('span', { style: { color: 'var(--ink-faint)', fontWeight: 400, fontSize: '.9rem' } }, `(${set.items.length} ${set.items.length === 1 ? 'obrázok' : set.items.length < 5 ? 'obrázky' : 'obrázkov'})`)));
      d.append(el('div', { class: 'pz-fields' }, textField('Názov skupiny', set, 'name', { onInput: (v) => { title.textContent = v; } })));
      if (set.items.length < 2) d.append(note('Skupina potrebuje aspoň 2 obrázky, inak ju dieťa neuvidí.', true));
      const unnamed = set.items.filter((i) => !(i.name || '').trim() && !i.audio).length;
      if (unnamed) d.append(note(`${unnamed} ${unnamed === 1 ? 'obrázok nemá' : 'obrázky nemajú'} názov ani nahrávku – dieťaťu sa nezobrazí, kým ho nedoplníte.`, true));

      const list = el('div', { class: 'pz-steps' });
      set.items.forEach((it, ii) => {
        const row = el('div', { class: 'pz-step' });
        row.append(imageEditor(it, { host: row, compact: true, onChange: ii === 0 ? () => ctx.rerender() : null }),
          el('div', { class: 'pz-fields' },
            textField('Názov (čo dieťa počuje)', it, 'name', { placeholder: 'napr. pes' }),
            voiceEditor(it, () => it.name, row),
            el('div', { class: 'pz-btns' },
              btn('Vyššie', 'up', () => { if (move(set.items, ii, -1)) { save(); ctx.rerender(); } }),
              btn('Nižšie', 'down', () => { if (move(set.items, ii, 1)) { save(); ctx.rerender(); } }),
              confirmButton('Odstrániť', 'trash', 'Naozaj?', async () => {
                await removeMedia(it.photo, it.audio);
                drop(set.items, it);
                save();
                ctx.rerender();
              }))));
        list.append(row);
      });
      d.append(list);

      const status = el('span', { style: { fontSize: '.9rem', color: 'var(--ink-soft)' } });
      const multi = el('input', { type: 'file', accept: 'image/*', multiple: true });
      multi.addEventListener('change', async () => {
        const files = [...(multi.files || [])];
        multi.value = '';
        if (!files.length) return;
        let done = 0;
        for (const f of files) {
          status.textContent = `Ukladám ${++done} / ${files.length}…`;
          const it = { id: AL.uid('it'), name: nameFromFile(f.name), art: 'placeholder', photo: null, audio: null };
          try { await storePhoto(it, f); set.items.push(it); } catch (e) { /* nie je obrázok – preskočiť */ }
        }
        openSets.add(set.id);
        save();
        ctx.rerender();
      });
      d.append(el('div', { class: 'pz-btns' },
        btn('Pridať obrázok', 'plus', () => {
          set.items.push({ id: AL.uid('it'), name: '', art: 'placeholder', photo: null, audio: null });
          openSets.add(set.id);
          save();
          ctx.rerender();
        }),
        el('label', { class: 'btn' }, icon('upload'), 'Pridať viac fotiek naraz', multi),
        status,
        confirmButton('Odstrániť skupinu', 'trash', `Odstrániť „${set.name}"?`, async () => {
          await removeMedia(...set.items.flatMap((i) => [i.photo, i.audio]));
          drop(s.sets, set);
          save();
          ctx.rerender();
        })));
      sec.append(d);
    });
    sec.append(el('div', { class: 'pz-btns' }, btn('Pridať skupinu', 'plus', () => {
      const set = { id: AL.uid('set'), name: 'Nová skupina', items: [] };
      s.sets.push(set);
      openSets.add(set.id);
      save();
      ctx.rerender();
    }, 'primary')));
  };

  R.progress = function (sec, ctx) {
    const logs = D().log.slice().reverse();
    const sens = logs.filter((l) => l.type === 'sensory');
    const faces = logs.filter((l) => l.type === 'faces');
    const fmtSec = (s) => (s >= 60 ? Math.floor(s / 60) + ' min ' : '') + (s % 60) + ' s';

    sec.append(el('h2', null, 'Senzorický trenažér'));
    if (!sens.length) sec.append(note('Zatiaľ žiadne záznamy. Zobrazí sa tu, akú najvyššiu hlasitosť dieťa samo zvolilo a ako dlho zvuk počúvalo.'));
    else {
      const byId = {};
      sens.forEach((l) => {
        const b = byId[l.soundId] || (byId[l.soundId] = { label: l.label, best: 0, count: 0, last: l });
        b.best = Math.max(b.best, l.level);
        b.count++;
      });
      const sum = el('table', { class: 'pz-table' }, el('tr', null, el('th', null, 'Zvuk'), el('th', null, 'Najvyššia zvolená hlasitosť'), el('th', null, 'Posledne'), el('th', null, 'Počet sedení')));
      Object.values(byId).forEach((b) => sum.append(el('tr', null, el('td', null, b.label),
        el('td', null, el('span', { class: 'bar-mini', style: { width: Math.max(4, b.best * 1.4) + 'px' } }), b.best + ' %'),
        el('td', null, b.last.level + ' %, ' + fmtSec(b.last.seconds)), el('td', null, String(b.count)))));
      sec.append(sum);
      const t = el('table', { class: 'pz-table' }, el('tr', null, el('th', null, 'Kedy'), el('th', null, 'Zvuk'), el('th', null, 'Najvyššia hlasitosť'), el('th', null, 'Dĺžka')));
      sens.slice(0, 40).forEach((l) => t.append(el('tr', null, el('td', null, AL.formatDate(l.at)), el('td', null, l.label),
        el('td', null, el('span', { class: 'bar-mini', style: { width: Math.max(4, l.level * 1.4) + 'px' } }), `${l.level} % (strop ${l.cap} %)`), el('td', null, fmtSec(l.seconds)))));
      sec.append(el('div', { style: { fontSize: '.9rem', color: 'var(--ink-soft)' } }, 'Posledné sedenia:'), t);
    }

    sec.append(el('h2', null, 'Rozpoznávanie tvárí'));
    if (!faces.length) sec.append(note('Zatiaľ žiadne záznamy. Po každom kole sa tu zobrazí, koľko odpovedí bolo správnych hneď na prvý pokus. Dieťa samo toto skóre nevidí.'));
    else {
      const t = el('table', { class: 'pz-table' }, el('tr', null, el('th', null, 'Kedy'), el('th', null, 'Správne na prvý pokus')));
      faces.slice(0, 40).forEach((l) => t.append(el('tr', null, el('td', null, AL.formatDate(l.at)),
        el('td', null, el('span', { class: 'bar-mini', style: { width: Math.max(4, (l.firstTry / l.total) * 140) + 'px', background: 'var(--sage)' } }), `${l.firstTry} z ${l.total}`))));
      sec.append(t);
    }

    const shows = logs.filter((l) => l.type === 'show');
    sec.append(el('h2', null, 'Ukáž'));
    if (!shows.length) sec.append(note('Zatiaľ žiadne záznamy. Po každom kole sa tu zobrazí, koľko obrázkov dieťa našlo hneď na prvý pokus a pri ktorých názvoch sa mýlilo.'));
    else {
      const agg = {};
      shows.slice(0, 20).forEach((l) => Object.entries(l.errors || {}).forEach(([n, c]) => { agg[n] = (agg[n] || 0) + c; }));
      const hardest = Object.entries(agg).sort((a, b) => b[1] - a[1]).slice(0, 8);
      if (hardest.length) sec.append(note('Najviac chýb (posledných 20 kôl): ' + hardest.map(([n, c]) => `${n} (${c}×)`).join(', ') + '. Tieto obrázky môžete precvičiť s menším počtom obrázkov na obrazovke.'));
      const t = el('table', { class: 'pz-table' }, el('tr', null, el('th', null, 'Kedy'), el('th', null, 'Skupina'), el('th', null, 'Obrázkov'), el('th', null, 'Správne na prvý pokus'), el('th', null, 'Chyby pri')));
      shows.slice(0, 40).forEach((l) => t.append(el('tr', null, el('td', null, AL.formatDate(l.at)), el('td', null, l.set), el('td', null, String(l.count)),
        el('td', null, el('span', { class: 'bar-mini', style: { width: Math.max(4, (l.firstTry / l.total) * 140) + 'px', background: 'var(--sage)' } }), `${l.firstTry} z ${l.total}`),
        el('td', null, Object.entries(l.errors || {}).map(([n, c]) => (c > 1 ? `${n} (${c}×)` : n)).join(', ') || '–'))));
      sec.append(t);
    }

    if (logs.length) {
      sec.append(el('div', { class: 'pz-btns' }, confirmButton('Vymazať prehľad', 'trash', 'Vymazať všetky záznamy?', () => {
        D().log = [];
        save();
        ctx.rerender();
      })));
    }
  };

  R.backup = function (sec) {
    const info = el('div', { class: 'pz-note' }, 'Údaje (nastavenia, fotografie, nahrávky) sú uložené iba v tomto prehliadači na tomto zariadení a nikam sa neodosielajú. Ak vymažete údaje prehliadača alebo otvoríte aplikáciu v inom prehliadači, neuvidíte ich – preto si občas stiahnite zálohu.');
    sec.append(info);
    if (AL.storageError) sec.append(note('Úložisko prehliadača nie je dostupné – zmeny sa neuložia. Skúste otvoriť aplikáciu v Microsoft Edge alebo Google Chrome (nie v súkromnom okne).', true));
    const usage = el('div', { style: { fontSize: '.9rem', color: 'var(--ink-soft)' } });
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then((e) => { usage.textContent = `Využité miesto: ${(e.usage / 1048576).toFixed(1)} MB`; }).catch(() => {});
    }

    const exportBtn = btn('Stiahnuť zálohu', 'download', async () => {
      exportBtn.disabled = true;
      try {
        const media = {};
        for (const id of AL.Media.ids()) {
          const blob = await AL.Media.blob(id);
          if (blob) media[id] = await AL.blobToDataURL(blob);
        }
        const data = { app: 'autilab', version: 1, exportedAt: new Date().toISOString(), config: D(), media };
        const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
        const a = el('a', { href: url, download: `autilab-zaloha-${new Date().toISOString().slice(0, 10)}.json` });
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      } finally { exportBtn.disabled = false; }
    }, 'primary');

    const importBox = el('span', { class: 'confirm-inline' });
    const fileIn = el('input', { type: 'file', accept: 'application/json,.json' });
    fileIn.addEventListener('change', async () => {
      const f = fileIn.files && fileIn.files[0];
      if (!f) return;
      let data;
      try {
        data = JSON.parse(await f.text());
        if (data.app !== 'autilab' || !data.config) throw new Error();
      } catch (e) { flashError(sec, 'Súbor nie je platná záloha AutiLab.'); return; }
      importBox.innerHTML = '';
      importBox.append(el('span', null, 'Nahradiť všetky súčasné údaje zálohou?'),
        btn('Áno, obnoviť', null, async (ev) => {
          const b = ev.currentTarget;
          if (b.disabled) return;
          b.disabled = true;
          let writing = false;
          try {
            // 1) celú zálohu najprv prevedieme – ak je poškodená, súčasné údaje ostanú nedotknuté
            const entries = [];
            for (const [id, url] of Object.entries(data.media || {})) entries.push([id, await AL.dataURLToBlob(url)]);
            // 2) zapíšeme médiá zo zálohy a nastavenia, 3) až potom zmažeme médiá, ktoré v zálohe nie sú
            writing = true;
            for (const [id, blob] of entries) await AL.DB.put('media', id, blob);
            await AL.DB.put('kv', 'config', data.config);
            const keep = new Set(entries.map(([id]) => id));
            for (const id of await AL.DB.keys('media')) if (!keep.has(id)) await AL.DB.del('media', id);
            location.reload();
          } catch (e) {
            b.disabled = false;
            flashError(sec, writing
              ? 'Obnovenie sa nedokončilo (málo miesta v zariadení?). Skúste to znova – vaše fotky a nahrávky zatiaľ nič nezmazalo.'
              : 'Súbor zálohy je poškodený alebo neúplný. Vaše súčasné údaje zostali nezmenené.');
          }
        }, 'danger'),
        btn('Zrušiť', null, () => { importBox.innerHTML = ''; }));
    });

    sec.append(el('h2', null, 'Záloha'), el('div', { class: 'pz-card' },
      el('div', { class: 'pz-btns' }, exportBtn, el('label', { class: 'btn' }, icon('upload'), 'Obnoviť zo zálohy', fileIn), importBox),
      el('div', { style: { fontSize: '.9rem', color: 'var(--ink-soft)' } }, 'Zálohu môžete použiť aj na prenesenie obsahu do iného počítača či prehliadača.'),
      usage));

    sec.append(el('h2', null, 'Obnoviť pôvodný stav'), el('div', { class: 'pz-card' },
      note('Vymaže všetky vaše fotografie, nahrávky, úpravy a prehľad a vráti predvolený obsah.'),
      el('div', { class: 'pz-btns' }, confirmButton('Obnoviť pôvodný stav', 'trash', 'Naozaj vymazať všetko?', async () => {
        await AL.Config.reset();
        location.reload();
      }))));
  };

  /* ---------- Obrazovka ---------- */
  AL.screens.parent = {
    adult: true,
    render(root, params, scope) {
      let tab = params.tab && R[params.tab] ? params.tab : 'general';
      const saved = el('span', { class: 'pz-saved' }, '✓ Uložené');
      let savedT = null;
      AL.Config.onSaved = () => {
        saved.classList.add('show');
        clearTimeout(savedT);
        savedT = setTimeout(() => saved.classList.remove('show'), 1500);
      };
      const back = btn('Späť do aplikácie', 'back', () => AL.go('home'), 'primary');
      const tabs = el('nav', { class: 'pz-tabs' });
      const body = el('div', { class: 'pz-section' });
      const ctx = { scope, rerender: null };

      const show = (id, keepScroll) => {
        tab = id;
        const y = window.scrollY;
        [...tabs.children].forEach((b) => b.classList.toggle('on', b.dataset.tab === id));
        pasteTarget = null;
        // nedokončené nahrávanie zahodíme, inak by mikrofón bežal ďalej a tlačidlá by nereagovali
        if (AL.Recorder.active) AL.Recorder.stop();
        activeRec = null;
        body.innerHTML = '';
        R[id](body, ctx);
        window.scrollTo(0, keepScroll ? y : 0);
      };
      ctx.rerender = () => show(tab, true);

      // Ctrl+V s obrázkom v schránke → vloží sa do naposledy použitého náhľadu obrázka
      scope.on(document, 'paste', (e) => {
        if (!pasteTarget) return;
        const f = [...((e.clipboardData && e.clipboardData.files) || [])].find((x) => x.type.startsWith('image/'));
        if (!f) return;
        e.preventDefault();
        pasteTarget(f);
      });
      TABS.forEach((t) => {
        const b = el('button', { type: 'button', dataset: { tab: t.id } }, t.label);
        b.addEventListener('click', () => { AL.Speech.stop(); show(t.id); });
        tabs.append(b);
      });

      root.append(el('div', { class: 'pz' },
        el('div', { class: 'pz-top' }, el('h1', null, 'Rodičovská zóna'), saved, back),
        tabs, body));
      show(tab);

      return async () => {
        AL.Config.onSaved = null;
        clearTimeout(savedT);
        if (AL.Recorder.active) await AL.Recorder.stop();
        activeRec = null;
        AL.Config.saveNow().catch(() => {});
        AL.applySettings();
      };
    },
  };
})();
