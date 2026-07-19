/* MyPaperTrend — content orchestrator (runs on the Scholar profile page). */
(function (g) {
  var MPT = g.MPT;
  if (!MPT || !MPT.dom || !MPT.dom.isProfilePage()) return;

  var store = MPT.storage.local;
  var settings = null;
  var scholarId = MPT.dom.getScholarId();
  var scholarName = MPT.dom.getName();

  function isPrimary() { return settings && settings.primaryScholarId === scholarId; }
  function githubEnabled() {
    return isPrimary() && settings.storage === 'github' && settings.github && settings.github.token;
  }

  function render(doc, newTitles) {
    MPT.overlay.render(MPT.buildRenderModel(doc), {
      newTitles: newTitles, onCaptureAll: onCaptureAll, isPrimary: isPrimary()
    });
  }

  function captureAndRender(fullSnapshot) {
    return store.loadFor(scholarId).then(function (existing) {
      var doc = MPT.migrate(existing) || MPT.emptyDoc({ scholar_id: scholarId, name: scholarName });
      if (!doc.profile.scholar_id) doc.profile.scholar_id = scholarId;
      var snap = MPT.dom.snapshot();
      var newTitles = MPT.diffNewPapers(doc, snap);
      doc = MPT.mergeSnapshot(doc, snap);
      return store.saveFor(scholarId, doc).then(function () {
        render(doc, newTitles);
        if (githubEnabled()) {
          chrome.runtime.sendMessage({ type: 'SYNC_GITHUB', doc: doc }, function (resp) {
            if (resp && resp.ok && resp.doc) render(resp.doc, newTitles);
          });
        }
        if (settings && settings.enrich && fullSnapshot) {
          chrome.runtime.sendMessage({ type: 'ENRICH', scholarId: scholarId });
        }
      });
    });
  }

  function onCaptureAll() {
    MPT.overlay.setBusy(true);
    MPT.dom.loadAll().then(function () { return captureAndRender(true); })
      .catch(function (e) { console.warn('[MyPaperTrend] captureAll', e); })
      .then(function () { MPT.overlay.setBusy(false); });
  }

  function startTracking() {
    return captureAndRender(false);
  }

  function boot() {
    return store.loadFor(scholarId).then(function (existing) {
      var known = !!existing;
      // First profile ever seen becomes the primary (the user's own).
      if (!settings.primaryScholarId) {
        return MPT.patchSettings({ primaryScholarId: scholarId }).then(function () {
          settings.primaryScholarId = scholarId;
          return afterRole(known);
        });
      }
      return afterRole(known);
    });
  }

  function afterRole(known) {
    if (isPrimary() || known) {
      // primary profile, or a profile we already track → update it
      if (githubEnabled()) {
        return new Promise(function (res) {
          chrome.runtime.sendMessage({ type: 'PULL_GITHUB' }, function () { startTracking().then(res); });
        });
      }
      return startTracking();
    }
    // a different, untracked profile → don't store anything until the user opts in
    MPT.overlay.renderOptIn({ scholarId: scholarId, name: scholarName }, {
      onTrack: function () { startTracking(); },
      onSetPrimary: function () {
        MPT.patchSettings({ primaryScholarId: scholarId }).then(function () {
          settings.primaryScholarId = scholarId; startTracking();
        });
      }
    });
    return Promise.resolve();
  }

  MPT.storage.local.ensureMigrated()
    .then(function () { return MPT.getSettings(); })
    .then(function (s) { settings = s; return boot(); })
    .catch(function (e) { console.warn('[MyPaperTrend]', e); });
})(typeof globalThis !== 'undefined' ? globalThis : self);
