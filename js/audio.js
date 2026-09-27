/* Zvuk: jemná spätná väzba, reč (TTS alebo nahratý hlas rodiča), senzorické zvuky a nahrávanie. */
(function () {
  'use strict';
  const AL = window.AL;

  /* ---------- Audio kontext ---------- */
  let ctx = null;
  function ac() {
    if (!ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      ctx = new Ctx();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  AL.audioContext = ac;
  // Prehliadače povolia zvuk až po prvom dotyku
  ['pointerdown', 'keydown'].forEach((ev) => window.addEventListener(ev, () => ac(), { once: false, passive: true }));

  /* ---------- Jemná spätná väzba (žiadne trúbenie, žiadne chybové zvuky) ---------- */
  function softNote(freq, when, dur, peak) {
    const c = ac();
    if (!c) return;
    const vol = AL.Config.s.feedbackVolume;
    if (vol <= 0) return;
    const t = c.currentTime + when;
    const g = c.createGain();
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2400;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak * vol, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    [1, 2].forEach((mult, i) => {
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq * mult;
      const og = c.createGain();
      og.gain.value = i === 0 ? 1 : 0.18;
      o.connect(og).connect(g);
      o.start(t);
      o.stop(t + dur + 0.05);
    });
    g.connect(lp).connect(c.destination);
  }

  AL.Sound = {
    /** krátky pokojný dvojtón – správna odpoveď / krok hotový */
    chime() { softNote(523.25, 0, 0.9, 0.16); softNote(659.25, 0.14, 1.1, 0.14); },
    /** tiché ťuknutie pri výbere */
    tap() { softNote(440, 0, 0.35, 0.07); },
    /** celá úloha dokončená – tri mäkké tóny */
    done() { softNote(523.25, 0, 1.1, 0.14); softNote(659.25, 0.22, 1.1, 0.13); softNote(783.99, 0.44, 1.6, 0.12); },
    /** koniec čakania – ako tichá spievajúca miska */
    bell() {
      const c = ac();
      if (!c) return;
      const vol = AL.Config.s.feedbackVolume;
      const t = c.currentTime;
      [[392, 0.2], [784, 0.07], [1176, 0.03]].forEach(([f, a]) => {
        const o = c.createOscillator();
        const g = c.createGain();
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(a * vol, t + 0.06);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 4);
        o.connect(g).connect(c.destination);
        o.start(t);
        o.stop(t + 4.1);
      });
    },
  };

  /* ---------- Reč ---------- */
  const synth = window.speechSynthesis || null;
  let voices = [];

  function loadVoices() { voices = synth ? synth.getVoices() : []; }
  if (synth) {
    loadVoices();
    synth.addEventListener && synth.addEventListener('voiceschanged', loadVoices);
  }

  // Tablety (iPad, Android) púšťajú reč až potom, čo prvá veta zaznie priamo pri dotyku – "odomkneme" ju tichou vetou
  let speechUnlocked = false;
  window.addEventListener('pointerdown', () => {
    if (!synth || speechUnlocked) return;
    speechUnlocked = true;
    try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; synth.speak(u); } catch (e) { /* nič */ }
  }, { passive: true });

  /* Nahrávky sa prehrávajú cez Web Audio: po prvom dotyku fungujú aj bez ďalšieho dotyku (dôležité na tabletoch) */
  const decoded = new Map(); // id nahrávky → AudioBuffer
  async function decodeMedia(id) {
    if (decoded.has(id)) return decoded.get(id);
    const blob = await AL.Media.blob(id);
    const buf = await ac().decodeAudioData(await blob.arrayBuffer());
    decoded.set(id, buf);
    return buf;
  }
  AL.decodeMedia = decodeMedia;

  let gen = 0;        // každé nové hovorenie zruší predchádzajúce
  let current = null; // { gen, stop() }

  function playRecording(id, my) {
    return new Promise((resolve) => {
      let finished = false;
      const done = () => { if (finished) return; finished = true; if (current && current.gen === my) current = null; resolve(); };
      decodeMedia(id).then((buf) => {
        if (my !== gen) return done();
        const c = ac();
        const src = c.createBufferSource();
        src.buffer = buf;
        src.connect(c.destination);
        src.onended = done;
        current = { gen: my, stop: () => { try { src.stop(); } catch (e) { /* nič */ } done(); } };
        src.start();
      }).catch(() => {
        // formát, ktorý Web Audio nevie dekódovať – skúsime obyčajný prehrávač
        if (my !== gen) return done();
        const a = new Audio(AL.Media.url(id));
        current = { gen: my, stop: () => { a.pause(); done(); } };
        a.onended = a.onerror = done;
        a.play().catch(done);
      });
    });
  }

  function speakText(text, my) {
    if (!synth || !text) return Promise.resolve();
    const v = AL.Speech.pickVoice();
    // Slovenčinu nečítame automaticky cudzím (napr. anglickým) hlasom – dieťa by to mýlilo.
    // Rodič môže iný hlas zvoliť ručne; inak ostane text a nahratý hlas.
    if (!v && voices.length) return Promise.resolve();
    return new Promise((resolve) => {
      let finished = false;
      const done = () => { if (finished) return; finished = true; if (current && current.gen === my) current = null; resolve(); };
      const u = new SpeechSynthesisUtterance(text);
      if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = 'sk-SK'; }
      u.rate = AL.Config.s.rate || 0.9;
      u.pitch = 1;
      u.volume = 1;
      u.onend = done;
      u.onerror = done;
      current = { gen: my, stop: done };
      setTimeout(done, 1500 + text.length * 120); // poistka, ak prehliadač neohlási koniec
      // Chrome občas "zabudne" prehovoriť hneď po cancel()
      setTimeout(() => { if (my === gen && !finished) synth.speak(u); }, 60);
    });
  }

  const part = (text, audioId, my) => (audioId && AL.Media.has(audioId) ? playRecording(audioId, my) : speakText(text, my));

  AL.Speech = {
    supported: !!synth,
    voices: () => voices,
    /** Vráti vhodný hlas: zvolený rodičom → slovenský → český → null */
    pickVoice() {
      const s = AL.Config.s;
      if (s.voiceURI) {
        const v = voices.find((x) => x.voiceURI === s.voiceURI);
        if (v) return v;
      }
      const sk = voices.filter((v) => /^sk/i.test(v.lang));
      if (sk.length) return sk.find((v) => /natural|online/i.test(v.name)) || sk[0];
      return voices.find((v) => /^cs/i.test(v.lang)) || null;
    },
    hasSlovak: () => voices.some((v) => /^sk/i.test(v.lang)),
    /** Vie aplikácia vysloviť text syntetickým hlasom? */
    canSpeak() { return !!synth && (!voices.length || !!this.pickVoice()); },
    stop() {
      gen++;
      if (synth) synth.cancel();
      if (current) { const c = current; current = null; c.stop(); }
    },
    /** Povie text. Ak existuje nahrávka (id média), prehrá ju namiesto syntetického hlasu. */
    say(text, audioId) {
      this.stop();
      return part(text, audioId, gen);
    },
    /**
     * Povie vetu poskladanú z častí, napr. [{text:'Kde je', audio: nahrávka}, {text:'pes', audio: nahrávka}].
     * Ak nie je nahratá žiadna časť, povie celú vetu naraz syntetickým hlasom (prirodzenejšia intonácia).
     */
    async sequence(parts, fullText) {
      this.stop();
      const my = gen;
      if (!parts.some((p) => p.audio && AL.Media.has(p.audio))) return part(fullText, null, my);
      for (const p of parts) {
        if (my !== gen) return;
        await part(p.text, p.audio, my);
        if (my !== gen) return;
        await AL.sleep(80);
      }
    },
    /** Pochvala – krátka, prirodzená a rodovo neutrálna */
    praise() {
      if (!AL.Config.s.praiseVoice) return Promise.resolve();
      const name = (AL.Config.data.child.name || '').trim();
      const base = AL.sample(['Výborne!', 'Super!', 'Dobrá práca!', 'Skvelé!']);
      return this.say(name && Math.random() < 0.5 ? base.replace('!', ', ' + name + '!') : base);
    },
  };

  /* ---------- Senzorické zvuky ---------- */
  const noiseCache = {};
  function noiseBuffer(kind) {
    const c = ac();
    if (noiseCache[kind]) return noiseCache[kind];
    const len = c.sampleRate * 3;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0, b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      else if (kind === 'pink') { b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2; }
      else d[i] = w * 0.6;
    }
    noiseCache[kind] = buf;
    return buf;
  }

  /** Každý syntetický zvuk vracia {nodes, timers, stopDelay} a pripája sa do `out` */
  const SYNTHS = {
    vacuum(c, out, env) {
      const nodes = [];
      const n1 = c.createBufferSource(); n1.buffer = noiseBuffer('brown'); n1.loop = true;
      const bp1 = c.createBiquadFilter(); bp1.type = 'bandpass'; bp1.frequency.value = 520; bp1.Q.value = 0.7;
      const g1 = c.createGain(); g1.gain.value = 1.1;
      n1.connect(bp1).connect(g1).connect(out);
      const n2 = c.createBufferSource(); n2.buffer = noiseBuffer('white'); n2.loop = true;
      const bp2 = c.createBiquadFilter(); bp2.type = 'bandpass'; bp2.frequency.value = 1900; bp2.Q.value = 0.9;
      const g2 = c.createGain(); g2.gain.value = 0.32;
      n2.connect(bp2).connect(g2).connect(out);
      const motor = c.createOscillator(); motor.type = 'sawtooth';
      motor.frequency.setValueAtTime(30, c.currentTime);
      motor.frequency.exponentialRampToValueAtTime(96, c.currentTime + 1.6);
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 650;
      const gm = c.createGain(); gm.gain.value = 0.14;
      motor.connect(lp).connect(gm).connect(out);
      const whine = c.createOscillator(); whine.frequency.value = 2650;
      const gw = c.createGain(); gw.gain.value = 0.012;
      whine.connect(gw).connect(out);
      const lfo = c.createOscillator(); lfo.frequency.value = 0.35;
      const lg = c.createGain(); lg.gain.value = 5;
      lfo.connect(lg).connect(motor.frequency);
      [n1, n2, motor, whine, lfo].forEach((s) => { s.start(); nodes.push(s); });
      env(1.4);
      return { nodes, stopDelay: 0.9 };
    },
    dryer(c, out, env) {
      const nodes = [];
      const n1 = c.createBufferSource(); n1.buffer = noiseBuffer('white'); n1.loop = true;
      const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 850;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7000;
      const g1 = c.createGain(); g1.gain.value = 0.9;
      n1.connect(hp).connect(lp).connect(g1).connect(out);
      const n2 = c.createBufferSource(); n2.buffer = noiseBuffer('brown'); n2.loop = true;
      const lp2 = c.createBiquadFilter(); lp2.type = 'lowpass'; lp2.frequency.value = 260;
      const g2 = c.createGain(); g2.gain.value = 0.8;
      n2.connect(lp2).connect(g2).connect(out);
      const hum = c.createOscillator(); hum.frequency.value = 148;
      const gh = c.createGain(); gh.gain.value = 0.035;
      hum.connect(gh).connect(out);
      [n1, n2, hum].forEach((s) => { s.start(); nodes.push(s); });
      env(0.5);
      return { nodes, stopDelay: 0.6 };
    },
    bell(c, out, env) {
      const timers = [];
      const ding = (freq, t) => {
        [[1, 0.5, 'sine'], [2.01, 0.12, 'sine'], [3, 0.06, 'triangle']].forEach(([m, a, type]) => {
          const o = c.createOscillator(); o.type = type; o.frequency.value = freq * m;
          const g = c.createGain();
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(a, t + 0.01);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 1.9);
          o.connect(g).connect(out);
          o.start(t); o.stop(t + 2);
        });
      };
      const ring = () => { const t = c.currentTime + 0.05; ding(659.25, t); ding(523.25, t + 0.6); };
      ring();
      timers.push(setInterval(ring, 3800));
      env(0.02);
      return { nodes: [], timers, stopDelay: 0.3 };
    },
    baby(c, out, env) {
      const timers = [];
      let alive = true;
      const cry = () => {
        if (!alive) return;
        const t = c.currentTime + 0.05;
        const dur = 0.9 + Math.random() * 0.5;
        const base = 360 + Math.random() * 60;
        const o = c.createOscillator(); o.type = 'sawtooth';
        o.frequency.setValueAtTime(base, t);
        o.frequency.linearRampToValueAtTime(base * 1.42, t + 0.18);
        o.frequency.linearRampToValueAtTime(base * 1.3, t + dur * 0.7);
        o.frequency.linearRampToValueAtTime(base * 0.95, t + dur);
        const vib = c.createOscillator(); vib.frequency.value = 6.5;
        const vg = c.createGain(); vg.gain.value = 16;
        vib.connect(vg).connect(o.frequency);
        const g = c.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.9, t + 0.08);
        g.gain.setValueAtTime(0.8, t + dur - 0.18);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        [[1050, 6, 1], [2250, 8, 0.55], [3350, 10, 0.25]].forEach(([f, q, a]) => {
          const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
          const fg = c.createGain(); fg.gain.value = a * 2.2;
          o.connect(bp).connect(fg).connect(g);
        });
        g.connect(out);
        o.start(t); vib.start(t);
        o.stop(t + dur + 0.05); vib.stop(t + dur + 0.05);
        // krátky nádych medzi plačom
        const nt = t + dur + 0.12;
        const n = c.createBufferSource(); n.buffer = noiseBuffer('white');
        const nb = c.createBiquadFilter(); nb.type = 'bandpass'; nb.frequency.value = 1600; nb.Q.value = 1.2;
        const ng = c.createGain();
        ng.gain.setValueAtTime(0.0001, nt);
        ng.gain.exponentialRampToValueAtTime(0.12, nt + 0.08);
        ng.gain.exponentialRampToValueAtTime(0.0001, nt + 0.28);
        n.connect(nb).connect(ng).connect(out);
        n.start(nt); n.stop(nt + 0.3);
        timers.push(setTimeout(cry, (dur + 0.45 + Math.random() * 0.35) * 1000));
      };
      cry();
      env(0.02);
      return { nodes: [], timers, stopDelay: 0.3, kill: () => { alive = false; } };
    },
  };

  /**
   * Prehrávač pre senzorický trenažér. Hlasitosť 0..1 sa mapuje kvadraticky (vnímanie ucha) a strop nastavuje rodič.
   */
  AL.SensoryPlayer = class {
    constructor(sound) {
      this.sound = sound;
      this.playing = false;
      this.volume = 0;
      this.run = null;
    }
    gainFor(v) {
      const cap = AL.clamp(AL.Config.data.sensory.maxVolume / 100, 0, 1);
      return Math.pow(v, 2) * cap;
    }
    setVolume(v) {
      this.volume = AL.clamp(v, 0, 1);
      if (this.run) this.run.master.gain.setTargetAtTime(this.gainFor(this.volume), ac().currentTime, 0.06);
    }
    async start() {
      if (this.playing) return;
      const c = ac();
      if (!c) return;
      this.playing = true;
      const master = c.createGain();
      master.gain.value = this.gainFor(this.volume);
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -10;
      comp.ratio.value = 6;
      const envGain = c.createGain();
      envGain.gain.value = 0;
      envGain.connect(master).connect(comp).connect(c.destination);
      const env = (rise) => {
        envGain.gain.setValueAtTime(0, c.currentTime);
        envGain.gain.linearRampToValueAtTime(1, c.currentTime + rise);
      };
      const run = { master, envGain, comp, nodes: [], timers: [], stopDelay: 0.4 };
      this.run = run;

      if (this.sound.audio && AL.Media.has(this.sound.audio)) {
        try {
          const buf = await decodeMedia(this.sound.audio);
          if (!this.playing || this.run !== run) return;
          const src = c.createBufferSource();
          src.buffer = buf;
          src.loop = true;
          src.connect(envGain);
          src.start();
          run.nodes.push(src);
          env(0.4);
        } catch (e) {
          console.warn('Nahrávku sa nepodarilo prehrať, použije sa syntetický zvuk', e);
          this.startSynth(c, envGain, env, run);
        }
      } else {
        this.startSynth(c, envGain, env, run);
      }
    }
    startSynth(c, out, env, run) {
      const fn = SYNTHS[this.sound.synth];
      if (!fn) return;
      const r = fn(c, out, env);
      run.nodes.push(...(r.nodes || []));
      run.timers.push(...(r.timers || []));
      run.stopDelay = r.stopDelay || 0.4;
      run.kill = r.kill;
    }
    stop() {
      if (!this.playing || !this.run) { this.playing = false; return; }
      const c = ac();
      const run = this.run;
      this.run = null;
      this.playing = false;
      run.kill && run.kill();
      run.timers.forEach((t) => { clearInterval(t); clearTimeout(t); });
      const t = c.currentTime;
      run.envGain.gain.cancelScheduledValues(t);
      run.envGain.gain.setValueAtTime(run.envGain.gain.value, t);
      run.envGain.gain.linearRampToValueAtTime(0, t + run.stopDelay);
      setTimeout(() => {
        run.nodes.forEach((n) => { try { n.stop(); } catch (e) { /* už zastavené */ } });
        try { run.master.disconnect(); run.comp.disconnect(); } catch (e) { /* nič */ }
      }, run.stopDelay * 1000 + 80);
    }
  };

  /* ---------- Nahrávanie hlasu ---------- */
  AL.Recorder = {
    // Mikrofón prehliadač povolí len na zabezpečenej adrese (súbor v PC, https, localhost).
    // Na tablete cez http://192.168… sa namiesto toho otvorí diktafón / výber súboru.
    supported: !!(window.isSecureContext && navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder),
    rec: null,
    async start() {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const rec = new MediaRecorder(stream);
      const chunks = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      this.rec = rec;
      this.done = new Promise((resolve) => {
        rec.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          resolve(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }));
        };
      });
      rec.start();
    },
    async stop() {
      if (!this.rec) return null;
      this.rec.stop();
      this.rec = null;
      return this.done;
    },
    get active() { return !!this.rec; },
  };
})();
