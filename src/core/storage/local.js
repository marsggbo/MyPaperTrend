/* MyPaperTrend — local StorageProvider, keyed per Scholar profile.
   Each profile is stored under `mpt_doc__<scholar_id>` so different people's data never mix. */
(function (g) {
  var MPT = (g.MPT = g.MPT || {});
  MPT.storage = MPT.storage || {};
  var PREFIX = 'mpt_doc__';
  var LEGACY = 'mpt_doc';

  function key(id) { return PREFIX + id; }

  /* One-time move of the old single-doc store into a per-profile key. */
  function migrateLegacy() {
    return chrome.storage.local.get(LEGACY).then(function (o) {
      if (!o[LEGACY]) return;
      var d = MPT.migrate(o[LEGACY]);
      var id = (d.profile && d.profile.scholar_id) || '';
      if (!id) { return chrome.storage.local.remove(LEGACY); }
      var set = {}; set[key(id)] = d;
      return chrome.storage.local.set(set)
        .then(function () { return MPT.setTracked(id, true); })
        .then(function () { return chrome.storage.local.remove(LEGACY); });
    });
  }

  MPT.storage.local = {
    id: 'local',

    ensureMigrated: function () { return migrateLegacy(); },

    loadFor: function (id) {
      if (!id) return Promise.resolve(null);
      return chrome.storage.local.get(key(id)).then(function (o) { return o[key(id)] ? MPT.migrate(o[key(id)]) : null; });
    },
    saveFor: function (id, doc) {
      var set = {}; set[key(id)] = doc;
      return chrome.storage.local.set(set);
    },
    removeFor: function (id) { return chrome.storage.local.remove(key(id)); },

    /* List every tracked profile (for the popup / dashboard switcher). */
    listProfiles: function () {
      return chrome.storage.local.get(null).then(function (obj) {
        return Object.keys(obj).filter(function (k) { return k.indexOf(PREFIX) === 0; }).map(function (k) {
          var d = MPT.migrate(obj[k]);
          return {
            id: k.slice(PREFIX.length),
            name: (d.profile && d.profile.name) || '',
            papers: Object.keys(d.papers || {}).length,
            updated: d.updated || ''
          };
        });
      });
    },

    /* Primary-profile convenience wrappers used by popup/dashboard. */
    load: function () {
      return migrateLegacy().then(function () {
        return MPT.getSettings().then(function (s) {
          if (s.activeProfileId) return MPT.storage.local.loadFor(s.activeProfileId);
          // no active profile yet: fall back to the first tracked profile, if any
          return MPT.storage.local.listProfiles().then(function (ps) {
            return ps.length ? MPT.storage.local.loadFor(ps[0].id) : null;
          });
        });
      });
    },
    save: function (doc) {
      var id = doc && doc.profile && doc.profile.scholar_id;
      return id ? MPT.storage.local.saveFor(id, doc) : Promise.resolve();
    },
    exportJSON: function () { return this.load().then(function (d) { return JSON.stringify(d || MPT.emptyDoc(), null, 2); }); },
    importJSON: function (text) {
      var d = MPT.migrate(JSON.parse(text));
      return this.save(d);
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : self);
