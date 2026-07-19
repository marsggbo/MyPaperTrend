/* MyPaperTrend — settings (stored in chrome.storage.local). */
(function (g) {
  var MPT = (g.MPT = g.MPT || {});
  var KEY = 'mpt_settings';

  MPT.DEFAULT_SETTINGS = {
    storage: 'local',                 // 'local' | 'github'
    github: { token: '', owner: '', repo: '', path: 'citations.json', branch: 'main' },
    fetch: { provider: 'dom', scraperapi_key: '', serpapi_key: '' },
    enrich: true,                     // pull authors/abstract/links from Semantic Scholar
    primaryScholarId: '',             // the user's own profile (auto-tracked; others are opt-in)
    onboarded: false
  };

  MPT.getSettings = function () {
    return chrome.storage.local.get(KEY).then(function (o) {
      var s = o[KEY] || {};
      var d = MPT.DEFAULT_SETTINGS;
      return {
        storage: s.storage || d.storage,
        github: Object.assign({}, d.github, s.github || {}),
        fetch: Object.assign({}, d.fetch, s.fetch || {}),
        enrich: s.enrich !== undefined ? s.enrich : d.enrich,
        primaryScholarId: s.primaryScholarId || '',
        onboarded: !!s.onboarded
      };
    });
  };

  /* update a subset of settings without clobbering the rest */
  MPT.patchSettings = function (patch) {
    return MPT.getSettings().then(function (s) {
      return MPT.saveSettings(Object.assign({}, s, patch));
    });
  };

  MPT.saveSettings = function (s) {
    return chrome.storage.local.set({ mpt_settings: s });
  };
})(typeof globalThis !== 'undefined' ? globalThis : self);
