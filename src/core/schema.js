/* MyPaperTrend — schema & migration (see docs/SCHEMA.md).
   Populates a shared global MPT namespace; safe in content scripts and extension pages. */
(function (g) {
  var MPT = (g.MPT = g.MPT || {});

  MPT.SCHEMA_VERSION = 2;
  MPT.NEW_WINDOW_DAYS = 14; // a paper is "NEW" if first seen within this many days

  MPT.pad2 = function (n) { return String(n).padStart(2, '0'); };

  /* local-timezone date YYYY-MM-DD */
  MPT.todayStr = function () {
    var d = new Date();
    return d.getFullYear() + '-' + MPT.pad2(d.getMonth() + 1) + '-' + MPT.pad2(d.getDate());
  };

  MPT.emptyDoc = function (profile) {
    return {
      schema: MPT.SCHEMA_VERSION,
      profile: profile || { scholar_id: '' },
      updated: '',
      source: '',
      papers: {}
    };
  };

  /* Accept v1 (flat title->entry) or v2 (wrapped). Always return a deduplicated v2 doc. */
  MPT.normTitle = function (t) {
    return String(t || '')
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim();
  };

  function maxDateOf(h) {
    var ds = Object.keys(h || {});
    if (!ds.length) return '';
    var m = ds[0];
    for (var i = 1; i < ds.length; i++) if (ds[i] > m) m = ds[i];
    return m;
  }
  function minDateOf(h) {
    var ds = Object.keys(h || {});
    if (!ds.length) return '';
    var m = ds[0];
    for (var i = 1; i < ds.length; i++) if (ds[i] < m) m = ds[i];
    return m;
  }
  function latestCitesOf(h) {
    var d = maxDateOf(h);
    return d ? (h[d] || 0) : 0;
  }
  function upperCount(s) {
    var m = String(s || '').match(/[A-Z]/g);
    return m ? m.length : 0;
  }

  /* Choose the cleaner/newer display title when two records refer to the same paper. */
  MPT.pickPaperTitle = function (titleA, a, titleB, b) {
    titleA = String(titleA || '').trim();
    titleB = String(titleB || '').trim();
    if (!titleA) return titleB;
    if (!titleB) return titleA;
    if (titleA === titleB) return titleA;
    var ntA = MPT.normTitle(titleA), ntB = MPT.normTitle(titleB);
    var maxA = maxDateOf(a && a.history), maxB = maxDateOf(b && b.history);
    if (ntA && ntA === ntB) {
      // Identical words (only capitalization / punctuation differs):
      // prefer clean punctuation (no trailing dot) and richer acronym/Title-Case capitalization.
      var dotA = /\.$/.test(titleA) ? 1 : 0, dotB = /\.$/.test(titleB) ? 1 : 0;
      if (dotA !== dotB) return dotA < dotB ? titleA : titleB;
      var upA = upperCount(titleA), upB = upperCount(titleB);
      if (upA !== upB) return upB > upA ? titleB : titleA;
    }
    // Different wording (same pub_id after title edit) or tied casing: prefer newer snapshot.
    return maxB >= maxA ? titleB : titleA;
  };

  /* Merge two paper entries representing the same publication.
     When preferBOnTie is true (snapshot update or local-over-remote sync), b wins same-date ties;
     otherwise (intra-doc deduplication) Math.max wins same-date ties. */
  MPT.mergePaperEntries = function (titleA, a, titleB, b, preferBOnTie) {
    a = a || {}; b = b || {};
    var ha = a.history || {}, hb = b.history || {};
    var mergedHist = {};
    Object.keys(ha).forEach(function (d) { mergedHist[d] = ha[d]; });
    Object.keys(hb).forEach(function (d) {
      var v = hb[d];
      mergedHist[d] = (preferBOnTie || mergedHist[d] === undefined) ? v : Math.max(mergedHist[d], v);
    });
    var history = {};
    Object.keys(mergedHist).sort().forEach(function (d) { history[d] = mergedHist[d]; });
    var minH = minDateOf(history);
    var fa = a.first_seen || '', fb = b.first_seen || '';
    var first_seen = fa && fb ? (fa < fb ? fa : fb) : (fa || fb);
    if (minH && (!first_seen || minH < first_seen)) first_seen = minH;

    var maxA = maxDateOf(ha), maxB = maxDateOf(hb);
    var year = (maxB >= maxA ? (b.year || a.year) : (a.year || b.year)) || '';
    var pub_id = b.pub_id || a.pub_id || '';

    var metaA = a.meta || {}, metaB = b.meta || {};
    var richA = !!(metaA.tldr || metaA.abstract), richB = !!(metaB.tldr || metaB.abstract);
    var meta = richB && !richA
      ? Object.assign({}, metaA, metaB)
      : richA && !richB
        ? Object.assign({}, metaB, metaA)
        : Object.assign({}, metaA, metaB);

    return {
      title: MPT.pickPaperTitle(titleA, a, titleB, b),
      entry: { year: year, pub_id: pub_id, first_seen: first_seen, history: history, meta: meta }
    };
  };

  /* Find an existing key in `papersObj` that represents the same paper as (title, pubId).
     1. Exact non-empty `pub_id` match -> same Scholar publication row.
     2. Normalized title match ONLY when at least one side lacks `pub_id` (so two genuinely
        distinct Scholar rows with different `pub_id`s are never conflated). */
  MPT.findPaperKey = function (papersObj, title, pubId) {
    if (!papersObj) return null;
    var keys = Object.keys(papersObj);
    if (pubId) {
      for (var i = 0; i < keys.length; i++) {
        var e = papersObj[keys[i]];
        if (e && e.pub_id === pubId) return keys[i];
      }
    }
    var nt = MPT.normTitle(title);
    if (!nt) return null;
    var bestKey = null, bestCites = -1;
    for (var j = 0; j < keys.length; j++) {
      var k = keys[j], cand = papersObj[k];
      if (!cand) continue;
      if (pubId && cand.pub_id && cand.pub_id !== pubId) continue;
      if (MPT.normTitle(k) === nt) {
        var c = latestCitesOf(cand.history);
        if (c > bestCites) { bestCites = c; bestKey = k; }
      }
    }
    return bestKey;
  };

  MPT.safePaperKey = function (papersObj, title, entry) {
    var base = String(title || '').trim() || 'Untitled';
    if (!papersObj[base]) return base;
    var tag = (entry && entry.year) || ((entry && entry.pub_id || '').split(':').pop().slice(0, 4)) || '2';
    var k = base + ' (' + tag + ')';
    var n = 2;
    while (papersObj[k]) { k = base + ' (' + tag + '-' + (n++) + ')'; }
    return k;
  };

  /* Deduplicate `doc.papers` in place (merges same-pub_id and legacy case/punctuation splits). */
  MPT.dedupeDoc = function (doc) {
    if (!doc || !doc.papers || typeof doc.papers !== 'object') return doc;
    var src = doc.papers;
    var items = Object.keys(src).map(function (k) { return { title: k, entry: src[k] || {} }; });
    // Place entries with pub_id & higher citations first so legacy pub_id="" records attach to the primary entry.
    items.sort(function (x, y) {
      var px = x.entry.pub_id ? 1 : 0, py = y.entry.pub_id ? 1 : 0;
      if (px !== py) return py - px;
      var cx = latestCitesOf(x.entry.history), cy = latestCitesOf(y.entry.history);
      if (cx !== cy) return cy - cx;
      var dx = maxDateOf(x.entry.history), dy = maxDateOf(y.entry.history);
      return dx < dy ? 1 : dx > dy ? -1 : 0;
    });
    var out = {};
    items.forEach(function (it) {
      var rawTitle = String(it.title || '').trim();
      if (!rawTitle) return;
      var e = it.entry;
      var matchKey = MPT.findPaperKey(out, rawTitle, e.pub_id);
      if (matchKey) {
        var m = MPT.mergePaperEntries(matchKey, out[matchKey], rawTitle, e, false);
        if (m.title !== matchKey && !out[m.title]) {
          delete out[matchKey];
          out[m.title] = m.entry;
        } else {
          out[matchKey] = m.entry;
        }
      } else {
        var normEntry = MPT.mergePaperEntries(rawTitle, null, rawTitle, e, true).entry;
        out[MPT.safePaperKey(out, rawTitle, normEntry)] = normEntry;
      }
    });
    var sorted = {};
    Object.keys(out).sort(function (ka, kb) {
      var ca = latestCitesOf(out[ka].history), cb = latestCitesOf(out[kb].history);
      if (ca !== cb) return cb - ca;
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    }).forEach(function (k) { sorted[k] = out[k]; });
    doc.papers = sorted;
    return doc;
  };

  MPT.migrate = function (doc) {
    if (!doc) return null;
    var v2;
    if (doc.schema === 2 && doc.papers) {
      v2 = doc;
    } else if (!doc.schema && !doc.papers && typeof doc === 'object') {
      // Heuristic: v1 was a flat map of title -> {year, history, ...}
      v2 = { schema: 2, profile: { scholar_id: '' }, updated: '', source: '', papers: doc };
    } else {
      // Unknown but has papers -> normalize schema field
      v2 = { schema: 2, profile: doc.profile || { scholar_id: '' }, updated: doc.updated || '', source: doc.source || '', papers: doc.papers || {} };
    }
    return MPT.dedupeDoc(v2);
  };

  MPT.daysBetween = function (a, b) {
    return Math.round((new Date(b) - new Date(a)) / 864e5);
  };
})(typeof globalThis !== 'undefined' ? globalThis : self);
