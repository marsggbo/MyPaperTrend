/* MyPaperTrend — content orchestrator (runs on the Scholar profile page). */
(function (g) {
  var MPT = g.MPT;
  if (!MPT || !MPT.dom || !MPT.dom.isProfilePage()) return;

  var store = MPT.storage.local;
  var currentSettings = null;

  function captureAndRender(fullSnapshot) {
    return store.load().then(function (existing) {
      var doc = MPT.migrate(existing) || MPT.emptyDoc({ scholar_id: MPT.dom.getScholarId(), name: MPT.dom.getName() });
      if (!doc.profile.scholar_id) doc.profile.scholar_id = MPT.dom.getScholarId();
      if (!doc.profile.name) doc.profile.name = MPT.dom.getName();
      var snap = MPT.dom.snapshot();
      var newTitles = MPT.diffNewPapers(doc, snap);
      doc = MPT.mergeSnapshot(doc, snap);
      return store.save(doc).then(function () {
        var model = MPT.buildRenderModel(doc);
        MPT.overlay.render(model, { newTitles: newTitles, onCaptureAll: onCaptureAll });
        // optional mirror to GitHub + metadata enrichment via background
        if (currentSettings && currentSettings.storage === 'github' && currentSettings.github.token) {
          chrome.runtime.sendMessage({ type: 'SYNC_GITHUB', doc: doc });
        }
        if (currentSettings && currentSettings.enrich && fullSnapshot) {
          chrome.runtime.sendMessage({ type: 'ENRICH' });
        }
      });
    });
  }

  function onCaptureAll() {
    MPT.overlay.setBusy(true);
    MPT.dom.loadAll().then(function () {
      return captureAndRender(true);
    }).catch(function (e) { console.warn('[MyPaperTrend] captureAll', e); })
      .then(function () { MPT.overlay.setBusy(false); });
  }

  MPT.getSettings().then(function (s) {
    currentSettings = s;
    return captureAndRender(false);
  }).catch(function (e) { console.warn('[MyPaperTrend]', e); });
})(typeof globalThis !== 'undefined' ? globalThis : self);
