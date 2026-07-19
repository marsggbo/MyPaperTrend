/* MyPaperTrend — normalizer: merge snapshots into the doc, derive the RenderModel. */
(function (g) {
  var MPT = (g.MPT = g.MPT || {});

  /* Merge a ProviderResult snapshot into the doc (mutates & returns). */
  MPT.mergeSnapshot = function (doc, result) {
    doc = MPT.migrate(doc) || MPT.emptyDoc();
    var today = MPT.todayStr();
    if (result.scholar_id) doc.profile.scholar_id = doc.profile.scholar_id || result.scholar_id;
    if (result.name && !doc.profile.name) doc.profile.name = result.name;
    doc.source = result.source || doc.source;
    // authoritative profile totals (correct even when the paper list is paginated)
    if (result.metrics && Number.isFinite(result.metrics.citations) && result.metrics.citations > 0) {
      doc.profile.metrics = doc.profile.metrics || {};
      doc.profile.metrics[today] = result.metrics;
    }
    (result.papers || []).forEach(function (p) {
      var title = (p.title || '').trim();
      if (!title) return;
      var entry = doc.papers[title];
      if (!entry) {
        entry = doc.papers[title] = { year: p.year || '', pub_id: p.pub_id || '', first_seen: today, history: {}, meta: {} };
      }
      if (!entry.first_seen) entry.first_seen = today;
      if (!entry.year && p.year) entry.year = p.year;
      if (!entry.pub_id && p.pub_id) entry.pub_id = p.pub_id;
      var c = Number.isFinite(p.citations) ? Math.max(0, Math.floor(p.citations)) : 0;
      entry.history[today] = c;
    });
    doc.updated = today;
    return doc;
  };

  /* Titles present in the snapshot that the doc has never seen. */
  MPT.diffNewPapers = function (doc, result) {
    var existing = {};
    Object.keys((doc && doc.papers) || {}).forEach(function (t) { existing[t] = 1; });
    return (result.papers || [])
      .map(function (p) { return (p.title || '').trim(); })
      .filter(function (t) { return t && !existing[t]; });
  };

  /* Union two docs (histories, first_seen=min, richer meta wins). Non-destructive:
     used to reconcile a local store with a remote (GitHub) store before writing. */
  MPT.mergeDocs = function (a, b) {
    a = MPT.migrate(a); b = MPT.migrate(b);
    if (!a) return b || MPT.emptyDoc();
    if (!b) return a;
    var out = MPT.emptyDoc();
    var baseProfile = a.profile && a.profile.scholar_id ? a.profile : b.profile || out.profile;
    out.profile = Object.assign({}, baseProfile);
    out.profile.metrics = Object.assign({}, (b.profile && b.profile.metrics) || {}, (a.profile && a.profile.metrics) || {});
    out.updated = (a.updated || '') > (b.updated || '') ? a.updated : b.updated;
    out.source = a.updated >= b.updated ? (a.source || b.source) : (b.source || a.source);
    var titles = {};
    Object.keys(a.papers || {}).forEach(function (t) { titles[t] = 1; });
    Object.keys(b.papers || {}).forEach(function (t) { titles[t] = 1; });
    Object.keys(titles).forEach(function (t) {
      var pa = (a.papers || {})[t], pb = (b.papers || {})[t];
      if (!pa) { out.papers[t] = pb; return; }
      if (!pb) { out.papers[t] = pa; return; }
      var history = Object.assign({}, pa.history || {}, pb.history || {});
      var fa = pa.first_seen || '', fb = pb.first_seen || '';
      var first_seen = fa && fb ? (fa < fb ? fa : fb) : (fa || fb);
      var metaA = pa.meta || {}, metaB = pb.meta || {};
      var richA = metaA.tldr || metaA.abstract, richB = metaB.tldr || metaB.abstract;
      var meta = richB && !richA ? metaB : richA ? metaA : Object.assign({}, metaB, metaA);
      out.papers[t] = {
        year: pa.year || pb.year || '',
        pub_id: pa.pub_id || pb.pub_id || '',
        first_seen: first_seen,
        history: history,
        meta: meta
      };
    });
    return out;
  };

  /* Build the RenderModel that all views consume (see docs/SCHEMA.md §4). */
  MPT.buildRenderModel = function (doc) {
    doc = MPT.migrate(doc) || MPT.emptyDoc();
    var papersObj = doc.papers || {};
    var titles = Object.keys(papersObj);

    var metrics = (doc.profile && doc.profile.metrics) || {};
    var metricDates = Object.keys(metrics).sort();

    var dateSet = {};
    titles.forEach(function (t) {
      Object.keys(papersObj[t].history || {}).forEach(function (d) { dateSet[d] = 1; });
    });
    metricDates.forEach(function (d) { dateSet[d] = 1; });
    var dates = Object.keys(dateSet).sort();
    var maxDate = dates[dates.length - 1] || '';
    var firstDate = dates[0] || '';

    var histArr = titles.map(function (t) {
      var h = papersObj[t].history || {};
      return Object.keys(h).sort().map(function (d) { return { date: d, citations: h[d] }; });
    });

    /* Total per date: prefer the authoritative Scholar metric (correct under pagination);
       before any metric was recorded, fall back to the sum of per-paper last-known counts. */
    var acc = {}, mi = 0;
    var totals = dates.map(function (date) {
      while (mi < metricDates.length - 1 && metricDates[mi + 1] <= date) mi++;
      var haveMetric = metricDates.length && metricDates[mi] <= date;
      if (haveMetric) return metrics[metricDates[mi]].citations;
      var sum = 0;
      histArr.forEach(function (hs, i) {
        var lo = acc[i] || 0;
        for (var k = lo; k < hs.length; k++) { if (hs[k].date <= date) { acc[i] = k; } else break; }
        if (hs.length && hs[0].date <= date) sum += hs[acc[i]].citations;
      });
      return sum;
    });
    var totalDeltas = totals.map(function (v, i) { return i === 0 ? 0 : v - totals[i - 1]; });
    var latestMetric = metricDates.length ? metrics[metricDates[metricDates.length - 1]] : null;

    var papers = [];
    var newCount = 0;
    titles.forEach(function (t, i) {
      var entry = papersObj[t];
      var hs = histArr[i];
      var series = hs.map(function (pt, k) {
        return { date: pt.date, citations: pt.citations, delta: k === 0 ? null : pt.citations - hs[k - 1].citations };
      });
      var latest = hs.length ? hs[hs.length - 1].citations : 0;
      var prev = hs.length > 1 ? hs[hs.length - 2].citations : latest;
      var firstSeen = entry.first_seen || (hs.length ? hs[0].date : '');
      var isNew = !!firstSeen && !!maxDate && MPT.daysBetween(firstSeen, maxDate) <= MPT.NEW_WINDOW_DAYS && firstSeen !== firstDate;
      if (isNew) newCount++;
      papers.push({
        title: t, year: entry.year || '', meta: entry.meta || {},
        series: series, latest: latest, prev: prev, firstSeen: firstSeen,
        isNew: isNew, totalGain: hs.length ? latest - hs[0].citations : 0
      });
    });

    return {
      profile: { scholarId: doc.profile.scholar_id || '', name: doc.profile.name || '' },
      dates: dates, totals: totals, totalDeltas: totalDeltas,
      papers: papers, updated: doc.updated || maxDate, newCount: newCount,
      hindex: latestMetric ? latestMetric.hindex : null,
      i10: latestMetric ? latestMetric.i10 : null,
      hasMetrics: metricDates.length > 0
    };
  };
})(typeof globalThis !== 'undefined' ? globalThis : self);
