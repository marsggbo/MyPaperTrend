/* MyPaperTrend — background service worker. */
importScripts(
  '../core/schema.js',
  '../core/normalizer.js',
  '../core/settings.js',
  '../core/storage/local.js',
  '../core/storage/github.js'
);

var MPT = globalThis.MPT;
var ALARM = 'mpt-daily';
var pendingTabs = {};   // tabId -> cleanup fn (for scheduled background-tab updates)

/* ── first-run onboarding + schedule ── */
chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/ui/onboarding.html') });
  }
  reschedule();
});
chrome.runtime.onStartup.addListener(reschedule);

/* re-arm the daily alarm whenever settings change */
chrome.storage.onChanged.addListener(function (changes, area) {
  if (area === 'local' && changes.mpt_settings) reschedule();
});

/* ── daily alarm at the user-chosen local time ── */
function nextFireAt(hhmm) {
  var parts = (hhmm || '03:00').split(':');
  var h = parseInt(parts[0], 10) || 0, m = parseInt(parts[1], 10) || 0;
  var now = new Date();
  var t = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
  if (t.getTime() <= now.getTime()) t.setDate(t.getDate() + 1);
  return t.getTime();
}
function reschedule() {
  return MPT.getSettings().then(function (s) {
    return chrome.alarms.clear(ALARM).then(function () {
      if (!s.autoUpdate) return;
      chrome.alarms.create(ALARM, { when: nextFireAt(s.autoUpdateTime), periodInMinutes: 1440 });
    });
  });
}
chrome.alarms.onAlarm.addListener(function (a) { if (a.name === ALARM) runAutoUpdate(); });

/* Open each tracked profile in a hidden background tab so the content script can capture
   ALL papers (DOM read), then close it. No scraping API needed. */
function runAutoUpdate() {
  return MPT.getSettings().then(function (s) {
    if (!s.autoUpdate || !s.trackedIds.length) return;
    var ids = s.trackedIds.slice();
    var today = MPT.todayStr();
    function next() {
      if (!ids.length) return;
      var id = ids.shift();
      MPT.storage.local.loadFor(id).then(function (doc) {
        if (doc && doc.updated === today) { next(); return; } // already fresh today
        openAndCapture(id).then(next);
      });
    }
    next();
  });
}
function openAndCapture(id) {
  return new Promise(function (res) {
    var url = 'https://scholar.google.com/citations?user=' + encodeURIComponent(id) + '&hl=en&pagesize=100#mpt-auto';
    chrome.tabs.create({ url: url, active: false }, function (tab) {
      if (!tab) { res(); return; }
      var timer = setTimeout(cleanup, 90000); // safety: close after 90s
      function cleanup() { clearTimeout(timer); delete pendingTabs[tab.id]; try { chrome.tabs.remove(tab.id); } catch (e) {} res(); }
      pendingTabs[tab.id] = cleanup;
    });
  });
}

/* ── message router ── */
chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (!msg || !msg.type) return;
  if (msg.type === 'AUTO_DONE') {
    var id = sender && sender.tab && sender.tab.id;
    if (id != null && pendingTabs[id]) pendingTabs[id]();
    return;
  } else if (msg.type === 'OPEN' && msg.page) {
    chrome.tabs.create({ url: chrome.runtime.getURL(msg.page) });
  } else if (msg.type === 'SYNC_GITHUB' && msg.doc) {
    syncGithub(msg.doc).then(function (merged) { sendResponse({ ok: true, doc: merged }); })
      .catch(function (e) { console.warn('[MyPaperTrend] github sync', e); sendResponse({ ok: false, error: String(e) }); });
    return true;
  } else if (msg.type === 'PULL_GITHUB') {
    pullGithub(msg.scholarId).then(function (merged) { sendResponse({ ok: true, doc: merged }); })
      .catch(function (e) { console.warn('[MyPaperTrend] github pull', e); sendResponse({ ok: false, error: String(e) }); });
    return true;
  } else if (msg.type === 'ENRICH') {
    enrich(msg.scholarId).then(function (n) { sendResponse({ ok: true, enriched: n }); })
      .catch(function (e) { console.warn('[MyPaperTrend] enrich', e); sendResponse({ ok: false, error: String(e) }); });
    return true;
  }
});

/* Give each scholar its own file so different people never share one JSON. */
function pathForId(tmpl, id) {
  tmpl = tmpl || 'citations-{id}.json';
  if (tmpl.indexOf('{id}') >= 0) return tmpl.replace('{id}', id);
  var dot = tmpl.lastIndexOf('.');
  return dot > 0 ? tmpl.slice(0, dot) + '-' + id + tmpl.slice(dot) : tmpl + '-' + id;
}
function githubFor(s, id) {
  return MPT.storage.makeGithub(Object.assign({}, s.github, { path: pathForId(s.github.path, id) }));
}

/* Read-modify-write: merge remote + local, save merged to BOTH (never clobbers
   the seeded history with an empty/partial local store). Returns the merged doc. */
function syncGithub(localDoc) {
  return MPT.getSettings().then(function (s) {
    var id = localDoc && localDoc.profile && localDoc.profile.scholar_id;
    if (s.storage !== 'github' || !s.github.token || !s.github.owner || !s.github.repo || !id) return null;
    var gh = githubFor(s, id);
    return gh.load().then(function (remote) {
      var merged = MPT.mergeDocs(remote, localDoc);
      return gh.save(merged)
        .then(function () { return MPT.storage.local.saveFor(id, merged); })
        .then(function () { return merged; });
    });
  });
}

/* Pull remote and merge into local (used on first run / manual sync) for one profile. */
function pullGithub(scholarId) {
  return MPT.getSettings().then(function (s) {
    var id = scholarId || s.activeProfileId;
    if (s.storage !== 'github' || !s.github.token || !s.github.owner || !s.github.repo || !id) return null;
    var gh = githubFor(s, id);
    return Promise.all([gh.load(), MPT.storage.local.loadFor(id)]).then(function (r) {
      var merged = MPT.mergeDocs(r[0], r[1]);
      return MPT.storage.local.saveFor(id, merged).then(function () { return merged; });
    });
  });
}

/* ── Semantic Scholar metadata enrichment (best-effort, throttled) ── */
var S2 = 'https://api.semanticscholar.org/graph/v1/paper/search/match';
var S2_FIELDS = 'title,year,venue,authors,tldr,abstract,externalIds,openAccessPdf,url';
var ENRICH_MIN_INTERVAL = 6 * 3600 * 1000; // 6h
var ENRICH_MAX_PER_RUN = 8;

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

function s2Match(title) {
  var url = S2 + '?query=' + encodeURIComponent(title) + '&fields=' + encodeURIComponent(S2_FIELDS);
  return fetch(url, { headers: { 'User-Agent': 'MyPaperTrend' } }).then(function (r) {
    if (!r.ok) throw new Error('S2 ' + r.status);
    return r.json();
  }).then(function (j) {
    var p = (j.data || [])[0];
    if (!p) return null;
    var ext = p.externalIds || {}, tldr = p.tldr || {};
    return {
      authors: (p.authors || []).map(function (a) { return a.name || ''; }),
      venue: p.venue || '',
      tldr: tldr.text || '',
      abstract: p.abstract || '',
      arxiv: ext.ArXiv || '', doi: ext.DOI || '',
      s2url: p.url || '', pdf: (p.openAccessPdf || {}).url || ''
    };
  });
}

function enrich(scholarId) {
  var throttleKey = 'mpt_last_enrich__' + (scholarId || 'primary');
  return chrome.storage.local.get(throttleKey).then(function (o) {
    var now = Date.now();
    if (o[throttleKey] && now - o[throttleKey] < ENRICH_MIN_INTERVAL) return 0;
    return MPT.getSettings().then(function (s) {
      if (!s.enrich) return 0;
      var loader = scholarId ? MPT.storage.local.loadFor(scholarId) : MPT.storage.local.load();
      return loader.then(function (doc) {
        if (!doc) return 0;
        var today = MPT.todayStr();
        var todo = Object.keys(doc.papers).filter(function (t) {
          var m = doc.papers[t].meta || {};
          if (m.tldr || m.abstract) return false;
          if (m._tried && MPT.daysBetween(m._tried, today) < 14) return false;
          return true;
        }).slice(0, ENRICH_MAX_PER_RUN);
        if (!todo.length) { var z = {}; z[throttleKey] = now; return chrome.storage.local.set(z).then(function () { return 0; }); }

        var count = 0;
        var chain = Promise.resolve();
        todo.forEach(function (title) {
          chain = chain.then(function () {
            return s2Match(title).then(function (meta) {
              if (meta) { doc.papers[title].meta = meta; count++; }
              else { doc.papers[title].meta = doc.papers[title].meta || {}; doc.papers[title].meta._tried = today; }
            }).catch(function () {
              doc.papers[title].meta = doc.papers[title].meta || {}; doc.papers[title].meta._tried = today;
            }).then(function () { return sleep(1200); });
          });
        });
        return chain.then(function () {
          var z = {}; z[throttleKey] = now;
          return MPT.storage.local.save(doc)
            .then(function () { return chrome.storage.local.set(z); })
            .then(function () { return count; });
        });
      });
    });
  });
}
