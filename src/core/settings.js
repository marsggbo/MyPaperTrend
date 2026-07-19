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
    onboarded: false
  };

  MPT.getSettings = function () {
    return chrome.storage.local.get(KEY).then(function (o) {
      var s = o[KEY] || {};
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
    return chrome.storage.local.set({ mpt_settings: s });
  };
})(typeof globalThis !== 'undefined' ? globalThis : self);
