/* MyPaperTrend — local StorageProvider (chrome.storage.local, the default). */
(function (g) {
  var MPT = (g.MPT = g.MPT || {});
  MPT.storage = MPT.storage || {};
  var KEY = 'mpt_doc';

  MPT.storage.local = {
    id: 'local',
    load: function () {
      return chrome.storage.local.get(KEY).then(function (o) { return o[KEY] ? MPT.migrate(o[KEY]) : null; });
    },
    save: function (doc) {
      return chrome.storage.local.set({ mpt_doc: doc });
    },
    exportJSON: function () {
      return this.load().then(function (d) { return JSON.stringify(d || MPT.emptyDoc(), null, 2); });
    },
    importJSON: function (text) {
      var d = MPT.migrate(JSON.parse(text));
      return this.save(d);
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : self);
