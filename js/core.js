/* AutiLab – spoločné pomocné funkcie. Všetko žije v mennom priestore window.AL. */
(function () {
  'use strict';

  const AL = (window.AL = window.AL || {});
  AL.VERSION = '1.4 (2026-09-28)';
  AL.screens = {};
  AL.modules = {};

  /** Vytvorí DOM element: el('div', {class: 'x', onclick: fn}, child1, 'text', ...) */
  AL.el = function (tag, attrs, ...children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v === undefined || v === null || v === false) continue;
        if (k === 'class') node.className = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
        else if (k === 'html') node.innerHTML = v;
        else if (k === 'dataset') Object.assign(node.dataset, v);
        else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
        else if (v === true) node.setAttribute(k, '');
        else node.setAttribute(k, v);
      }
    }
    AL.append(node, children);
    return node;
  };

  AL.append = function (node, children) {
    for (const c of children.flat(Infinity)) {
      if (c === null || c === undefined || c === false) continue;
      node.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return node;
  };

  /** Element zo SVG/HTML reťazca */
  AL.frag = function (html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  };

  AL.uid = function (prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  };

  AL.shuffle = function (arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  AL.sample = (arr) => arr[Math.floor(Math.random() * arr.length)];
  AL.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  AL.clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  AL.debounce = function (fn, ms) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  };

  AL.escape = function (s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  };

  AL.formatDate = function (ts) {
    const d = new Date(ts);
    const p = (n) => String(n).padStart(2, '0');
    return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
  };

  /** Časovače a posluchy, ktoré sa automaticky upracú pri odchode z obrazovky */
  AL.Scope = class {
    constructor() { this.fns = []; }
    timeout(fn, ms) { const id = setTimeout(fn, ms); this.fns.push(() => clearTimeout(id)); return id; }
    interval(fn, ms) { const id = setInterval(fn, ms); this.fns.push(() => clearInterval(id)); return id; }
    raf(fn) {
      let id, alive = true;
      const loop = (t) => { if (!alive) return; fn(t); id = requestAnimationFrame(loop); };
      id = requestAnimationFrame(loop);
      this.fns.push(() => { alive = false; cancelAnimationFrame(id); });
    }
    on(target, ev, fn, opts) { target.addEventListener(ev, fn, opts); this.fns.push(() => target.removeEventListener(ev, fn, opts)); }
    add(fn) { this.fns.push(fn); }
    dispose() { this.dead = true; while (this.fns.length) { try { this.fns.pop()(); } catch (e) { console.warn(e); } } }
  };
})();
