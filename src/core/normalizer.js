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
      var c = Number.isFinite(p.citations) ? Math.max(0, Math.floor(p.citations)) : 0;
      var incHist = {}; incHist[today] = c;
      var inc = { year: p.year || '', pub_id: p.pub_id || '', first_seen: today, history: incHist, meta: {} };
      var matchKey = MPT.findPaperKey(doc.papers, title, p.pub_id);
      if (matchKey) {
        var m = MPT.mergePaperEntries(matchKey, doc.papers[matchKey], title, inc, true);
        if (m.title !== matchKey && !doc.papers[m.title]) {
          delete doc.papers[matchKey];
          doc.papers[m.title] = m.entry;
        } else {
          doc.papers[matchKey] = m.entry;
        }
      } else {
        doc.papers[MPT.safePaperKey(doc.papers, title, inc)] = inc;
      }
    });
    doc.updated = today;
    return doc;
  };

  /* Titles present in the snapshot that the doc has never seen. */
  MPT.diffNewPapers = function (doc, result) {
    doc = MPT.migrate(doc) || MPT.emptyDoc();
    var seenInSnap = {};
    var out = [];
    (result.papers || []).forEach(function (p) {
      var t = (p.title || '').trim();
      if (!t) return;
      if (MPT.findPaperKey(doc.papers, t, p.pub_id)) return;
      var dedupKey = p.pub_id || MPT.normTitle(t) || t;
      if (seenInSnap[dedupKey]) return;
      seenInSnap[dedupKey] = 1;
      out.push(t);
    });
    return out;
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
    Object.keys(a.papers || {}).forEach(function (ta) {
      out.papers[ta] = a.papers[ta];
    });
    Object.keys(b.papers || {}).forEach(function (tb) {
      var pb = b.papers[tb];
      var matchKey = MPT.findPaperKey(out.papers, tb, pb && pb.pub_id);
      if (matchKey) {
        var m = MPT.mergePaperEntries(matchKey, out.papers[matchKey], tb, pb, true);
        if (m.title !== matchKey && !out.papers[m.title]) {
          delete out.papers[matchKey];
          out.papers[m.title] = m.entry;
        } else {
          out.papers[matchKey] = m.entry;
        }
      } else {
        out.papers[MPT.safePaperKey(out.papers, tb, pb)] = pb;
      }
    });
    return MPT.dedupeDoc(out);
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
        title: t, year: entry.year || '', pubId: entry.pub_id || '', meta: entry.meta || {},
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
