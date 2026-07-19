/* MyPaperTrend — content orchestrator (runs on the Scholar profile page). */
(function (g) {
  var MPT = g.MPT;
  if (!MPT || !MPT.dom || !MPT.dom.isProfilePage()) return;

  var store = MPT.storage.local;
  var settings = null;
  var scholarId = MPT.dom.getScholarId();
  var scholarName = MPT.dom.getName();
  var AUTO = location.hash.indexOf('mpt-auto') >= 0;   // opened by the daily scheduler

  function githubEnabled() {
    return settings && settings.storage === 'github' && settings.github && settings.github.token;
  }

  function renderFull(doc, newTitles) {
    MPT.overlay.render(MPT.buildRenderModel(doc), {
      tracked: true, newTitles: newTitles, onCaptureAll: onCaptureAll,
      hasMore: MPT.dom.hasMore(), onToggle: turnOff
    });
  }

  function captureAndRender(fullSnapshot, silent) {
    return store.loadFor(scholarId).then(function (existing) {
      var doc = MPT.migrate(existing) || MPT.emptyDoc({ scholar_id: scholarId, name: scholarName });
      if (!doc.profile.scholar_id) doc.profile.scholar_id = scholarId;
      var snap = MPT.dom.snapshot();
      var newTitles = MPT.diffNewPapers(doc, snap);
      doc = MPT.mergeSnapshot(doc, snap);
      return store.saveFor(scholarId, doc).then(function () {
        if (!silent) renderFull(doc, newTitles);
        if (githubEnabled()) {
          chrome.runtime.sendMessage({ type: 'SYNC_GITHUB', doc: doc }, function (resp) {
            if (!silent && resp && resp.ok && resp.doc) renderFull(resp.doc, newTitles);
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

  function turnOn() {
    MPT.setTracked(scholarId, true).then(function () {
      settings.trackedIds.push(scholarId);
      captureAndRender(false);
    });
  }
  function turnOff() {
    MPT.setTracked(scholarId, false).then(function () {
      settings.trackedIds = settings.trackedIds.filter(function (x) { return x !== scholarId; });
      MPT.overlay.renderToggleOff({ scholarId: scholarId, name: scholarName }, { onToggle: turnOn });
    });
  }

  /* ── scheduled background-tab update: read ALL papers, then let the SW close the tab ── */
  function runAuto() {
    var done = function () { chrome.runtime.sendMessage({ type: 'AUTO_DONE' }); };
    if (settings.trackedIds.indexOf(scholarId) < 0) { done(); return; }
    MPT.dom.loadAll().then(function () { return captureAndRender(true, true); })
      .catch(function (e) { console.warn('[MyPaperTrend] auto', e); })
      .then(done);
  }

  function runInteractive() {
    if (settings.trackedIds.indexOf(scholarId) >= 0) {
      MPT.setTracked(scholarId, true); // refresh activeProfileId
      if (githubEnabled()) {
        chrome.runtime.sendMessage({ type: 'PULL_GITHUB', scholarId: scholarId }, function () { captureAndRender(false); });
      } else {
        captureAndRender(false);
      }
    } else {
      // not tracked → show only the Track toggle; store nothing until turned on
      MPT.overlay.renderToggleOff({ scholarId: scholarId, name: scholarName }, { onToggle: turnOn });
    }
  }

  MPT.storage.local.ensureMigrated()
    .then(function () { return MPT.getSettings(); })
    .then(function (s) { settings = s; AUTO ? runAuto() : runInteractive(); })
    .catch(function (e) { console.warn('[MyPaperTrend]', e); });
})(typeof globalThis !== 'undefined' ? globalThis : self);
