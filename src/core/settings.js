/* MyPaperTrend — settings (stored in chrome.storage.local). */
(function (g) {
  var MPT = (g.MPT = g.MPT || {});
  var KEY = 'mpt_settings';

  MPT.DEFAULT_SETTINGS = {
    storage: 'local',                 // 'local' | 'github'
    github: { token: '', owner: '', repo: '', path: 'citations-{id}.json', branch: 'main' },
    fetch: { provider: 'dom', scraperapi_key: '', serpapi_key: '' },
    enrich: true,                     // pull authors/abstract/links from Semantic Scholar
    trackedIds: [],                   // scholars the user chose to follow (toggle on)
    activeProfileId: '',              // last-viewed tracked profile (default view in popup/dashboard)
    autoUpdate: true,                 // daily background-tab refresh of tracked profiles
    autoUpdateTime: '03:00',          // local time HH:MM for the daily refresh
    lang: '',                         // '' = auto-detect | 'en' | 'zh'
    overlayCollapsed: false,          // remember the folded state of the on-page panel
    onboarded: false
  };

  /* True unless the extension was reloaded while this (content-script) context is still alive. */
  MPT.ctxValid = function () {
    try { return !!(g.chrome && chrome.runtime && chrome.runtime.id); } catch (e) { return false; }
  };

  function normalize(s) {
    s = s || {};
    var d = MPT.DEFAULT_SETTINGS;
    // migrate the old single "primary profile" model into the tracked set
    var tracked = s.trackedIds || (s.primaryScholarId ? [s.primaryScholarId] : []);
    return {
      storage: s.storage || d.storage,
      github: Object.assign({}, d.github, s.github || {}),
      fetch: Object.assign({}, d.fetch, s.fetch || {}),
      enrich: s.enrich !== undefined ? s.enrich : d.enrich,
      trackedIds: tracked.slice(),
      activeProfileId: s.activeProfileId || tracked[0] || '',
      autoUpdate: s.autoUpdate !== undefined ? s.autoUpdate : d.autoUpdate,
      autoUpdateTime: s.autoUpdateTime || d.autoUpdateTime,
      lang: s.lang || '',
      overlayCollapsed: !!s.overlayCollapsed,
      onboarded: !!s.onboarded
    };
  }

  MPT.getSettings = function () {
    return new Promise(function (resolve) {
      if (!MPT.ctxValid()) return resolve(normalize({}));
      try {
        var p = chrome.storage.local.get(KEY);
        p.then(function (o) { resolve(normalize(o[KEY])); }, function () { resolve(normalize({})); });
      } catch (e) { resolve(normalize({})); }  // extension context invalidated
    });
  };

  /* update a subset of settings without clobbering the rest */
  MPT.patchSettings = function (patch) {
    return MPT.getSettings().then(function (s) {
      return MPT.saveSettings(Object.assign({}, s, patch));
    });
  };

  MPT.isTracked = function (id) {
    return MPT.getSettings().then(function (s) { return s.trackedIds.indexOf(id) >= 0; });
  };
  MPT.setTracked = function (id, on) {
    return MPT.getSettings().then(function (s) {
      var set = s.trackedIds.filter(function (x) { return x !== id; });
      if (on) set.push(id);
      var patch = { trackedIds: set };
      if (on) patch.activeProfileId = id;
      return MPT.saveSettings(Object.assign({}, s, patch));
    });
  };

  MPT.saveSettings = function (s) {
    if (!MPT.ctxValid()) return Promise.resolve();
    try { return chrome.storage.local.set({ mpt_settings: s }); } catch (e) { return Promise.resolve(); }
  };
})(typeof globalThis !== 'undefined' ? globalThis : self);
