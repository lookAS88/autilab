/* Lokálne úložisko: IndexedDB (nastavenia + fotografie a nahrávky ako Blob). Nič neopúšťa zariadenie. */
(function () {
  'use strict';
  const AL = window.AL;

  const DB_NAME = 'autilab';
  const DB_VERSION = 1;
  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
        if (!db.objectStoreNames.contains('media')) db.createObjectStore('media');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  async function tx(store, mode, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const t = db.transaction(store, mode);
      const s = t.objectStore(store);
      let result;
      const r = fn(s);
      if (r && 'onsuccess' in r) r.onsuccess = () => { result = r.result; };
      t.oncomplete = () => resolve(result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  }

  AL.DB = {
    open,
    get: (store, key) => tx(store, 'readonly', (s) => s.get(key)),
    put: (store, key, val) => tx(store, 'readwrite', (s) => s.put(val, key)),
    del: (store, key) => tx(store, 'readwrite', (s) => s.delete(key)),
    keys: (store) => tx(store, 'readonly', (s) => s.getAllKeys()),
    clear: (store) => tx(store, 'readwrite', (s) => s.clear()),
  };

  /* Médiá – po štarte sa všetky načítajú do objektových URL, aby sa obrázky dali vykresliť synchrónne */
  const urls = new Map();

  AL.Media = {
    async init() {
      const keys = await AL.DB.keys('media');
      for (const k of keys) {
        // jeden poškodený záznam nesmie zablokovať celú aplikáciu
        try {
          const blob = await AL.DB.get('media', k);
          if (blob) urls.set(k, URL.createObjectURL(blob));
        } catch (e) { console.warn('Médium sa nepodarilo načítať', k, e); }
      }
    },
    url(id) { return id ? urls.get(id) || null : null; },
    has(id) { return !!id && urls.has(id); },
    async add(blob, prefix) {
      const id = AL.uid(prefix || 'm');
      await AL.DB.put('media', id, blob);
      urls.set(id, URL.createObjectURL(blob));
      return id;
    },
    async remove(id) {
      if (!id) return;
      const u = urls.get(id);
      if (u) URL.revokeObjectURL(u);
      urls.delete(id);
      await AL.DB.del('media', id);
    },
    blob(id) { return AL.DB.get('media', id); },
    ids() { return [...urls.keys()]; },
    async clearAll() {
      for (const u of urls.values()) URL.revokeObjectURL(u);
      urls.clear();
      await AL.DB.clear('media');
    },
  };

  /** Zmenší fotografiu (max. strana 1000 px), aby databáza zostala malá */
  AL.resizeImage = function (file, max = 1000, quality = 0.86) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const src = URL.createObjectURL(file);
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.round(img.naturalWidth * scale);
        const h = Math.round(img.naturalHeight * scale);
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const g = c.getContext('2d');
        g.fillStyle = '#fff';
        g.fillRect(0, 0, w, h);
        g.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(src);
        c.toBlob((b) => (b ? resolve(b) : reject(new Error('Obrázok sa nepodarilo spracovať'))), 'image/jpeg', quality);
      };
      img.onerror = () => { URL.revokeObjectURL(src); reject(new Error('Súbor nie je obrázok')); };
      img.src = src;
    });
  };

  AL.blobToDataURL = (blob) => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });

  AL.dataURLToBlob = async (dataURL) => (await fetch(dataURL)).blob();
})();
