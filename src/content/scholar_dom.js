/* MyPaperTrend — Google Scholar profile DOM reader (the default, block-proof fetcher).
   Reads the already-rendered page in the user's own session; makes no extra requests. */
(function (g) {
  var MPT = (g.MPT = g.MPT || {});

  MPT.dom = {
    getScholarId: function () {
      try { return new URL(location.href).searchParams.get('user') || ''; } catch (e) { return ''; }
    },
    getName: function () {
      var el = document.getElementById('gsc_prf_in');
      return el ? el.textContent.trim() : '';
    },
    isProfilePage: function () {
      return !!MPT.dom.getScholarId() && !!document.getElementById('gsc_a_b');
    },
    /* Authoritative profile totals from Scholar's own metrics box (#gsc_rsb_st).
       Correct even when the publication list is paginated/collapsed. */
    parseMetrics: function () {
      var cells = document.querySelectorAll('#gsc_rsb_st .gsc_rsb_std');
      if (!cells.length) return null;
      var num = function (el) { return el ? (parseInt(el.textContent.replace(/[^0-9]/g, ''), 10) || 0) : 0; };
      // order: [0]=Citations(All) [1]=Citations(Since) [2]=h(All) [3]=h(Since) [4]=i10(All) [5]=i10(Since)
      return { citations: num(cells[0]), hindex: num(cells[2]), i10: num(cells[4]) };
    },
    parseRows: function () {
      var rows = document.querySelectorAll('#gsc_a_b .gsc_a_tr');
      var out = [];
      rows.forEach(function (r) {
        var a = r.querySelector('.gsc_a_at');
        if (!a) return;
        var title = a.textContent.trim();
        if (!title) return;
        var pub_id = '';
        try { pub_id = new URLSearchParams(a.href.split('?')[1]).get('citation_for_view') || ''; } catch (e) {}
        var cEl = r.querySelector('.gsc_a_ac');
        var citations = parseInt((cEl ? cEl.textContent : '').replace(/[^0-9]/g, ''), 10) || 0;
        var yEl = r.querySelector('.gsc_a_h');
        var year = yEl ? yEl.textContent.trim() : '';
        out.push({ title: title, citations: citations, year: year, pub_id: pub_id });
      });
      return out;
    },
    _rowCount: function () { return document.querySelectorAll('#gsc_a_b .gsc_a_tr').length; },
    _waitForMore: function (prevCount, timeout) {
      timeout = timeout || 8000;
      return new Promise(function (res) {
        var start = Date.now();
        var iv = setInterval(function () {
          var now = MPT.dom._rowCount();
          var btn = document.getElementById('gsc_bpf_more');
          var done = now > prevCount || (btn && btn.disabled) || (Date.now() - start > timeout);
          if (done) { clearInterval(iv); setTimeout(res, 300); }
        }, 200);
      });
    },
    /* Click "Show more" until every publication row is loaded. */
    loadAll: function (maxClicks) {
      maxClicks = maxClicks || 40;
      var clicks = 0;
      function step() {
        var btn = document.getElementById('gsc_bpf_more');
        if (!btn || btn.disabled || clicks >= maxClicks) return Promise.resolve();
        var before = MPT.dom._rowCount();
        btn.click();
        clicks++;
        return MPT.dom._waitForMore(before).then(step);
      }
      return step();
    },
    /* A snapshot of currently-loaded rows + authoritative profile metrics.
       Per-paper history only covers visible rows; the total comes from the metrics box. */
    snapshot: function () {
      return {
        scholar_id: MPT.dom.getScholarId(),
        name: MPT.dom.getName(),
        fetched_at: new Date().toISOString(),
        source: 'dom',
        ok: true,
        metrics: MPT.dom.parseMetrics(),
        papers: MPT.dom.parseRows()
      };
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : self);
