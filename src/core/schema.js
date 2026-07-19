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

  /* Accept v1 (flat title->entry) or v2 (wrapped). Always return a v2 doc. */
  MPT.migrate = function (doc) {
    if (!doc) return null;
    if (doc.schema === 2 && doc.papers) return doc;
    // Heuristic: v1 was a flat map of title -> {year, history, ...}
    if (!doc.schema && !doc.papers && typeof doc === 'object') {
      return { schema: 2, profile: { scholar_id: '' }, updated: '', source: '', papers: doc };
    }
    // Unknown but has papers -> normalize schema field
    return { schema: 2, profile: doc.profile || { scholar_id: '' }, updated: doc.updated || '', source: doc.source || '', papers: doc.papers || {} };
  };

  MPT.daysBetween = function (a, b) {
    return Math.round((new Date(b) - new Date(a)) / 864e5);
  };
})(typeof globalThis !== 'undefined' ? globalThis : self);
