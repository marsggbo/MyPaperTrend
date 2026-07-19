/* MyPaperTrend — full dashboard (reads local doc → RenderModel). */
(function () {
  var MODEL = null;
  var charts = {};
  var currentSort = 'cites';

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmt(n) { return (n >= 0 ? '+' : '') + n; }
  function isDark() { return window.matchMedia && window.matchMedia('(prefers-color-scheme:dark)').matches; }
  function colors() { var d = isDark(); return { grid: d ? 'rgba(255,255,255,.06)' : 'rgba(15,23,42,.05)', tick: d ? '#8ea0b8' : '#94a3b8' }; }

  Chart.defaults.font.family = '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
  Chart.defaults.font.size = 11;

  var crosshair = {
    id: 'crosshair',
    afterDraw: function (chart) {
      var t = chart.tooltip; if (!t || !t._active || !t._active.length) return;
      var x = t._active[0].element.x, a = chart.chartArea, ctx = chart.ctx;
      ctx.save(); ctx.beginPath(); ctx.moveTo(x, a.top); ctx.lineTo(x, a.bottom);
      ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
      ctx.strokeStyle = isDark() ? 'rgba(129,140,248,.55)' : 'rgba(99,102,241,.45)';
      ctx.stroke(); ctx.restore();
    }
  };

  function trendTooltip(dates) {
    return {
      backgroundColor: isDark() ? 'rgba(17,26,46,.96)' : 'rgba(255,255,255,.98)',
      titleColor: isDark() ? '#f1f5f9' : '#0f172a', bodyColor: isDark() ? '#cbd5e1' : '#334155',
      borderColor: isDark() ? 'rgba(129,140,248,.4)' : 'rgba(99,102,241,.25)', borderWidth: 1,
      padding: 11, cornerRadius: 9, displayColors: false, bodySpacing: 5,
      callbacks: {
        title: function (items) { return '📅 ' + dates[items[0].dataIndex]; },
        label: function (ctx) {
          var i = ctx.dataIndex, v = ctx.parsed.y, out = ['Citations:  ' + v.toLocaleString()];
          if (i > 0) { var d = v - ctx.dataset.data[i - 1]; out.push('New:  ' + fmt(d) + (d > 0 ? ' 📈' : d < 0 ? ' 📉' : ' —')); }
          else out.push('New:  — (first day)');
          return out;
        }
      }
    };
  }

  function lineChart(canvas, labels, data, dates, h) {
    var ctx = canvas.getContext('2d');
    var grad = ctx.createLinearGradient(0, 0, 0, h || 240);
    grad.addColorStop(0, 'rgba(99,102,241,.26)'); grad.addColorStop(1, 'rgba(99,102,241,0)');
    var col = colors();
    return new Chart(ctx, {
      type: 'line',
      data: { labels: labels, datasets: [{ data: data, borderColor: '#6366f1', backgroundColor: grad, fill: true, tension: .35, borderWidth: 2.5, pointRadius: data.length > 60 ? 0 : 2.5, pointHoverRadius: 6, hoverRadius: 6, pointBackgroundColor: '#6366f1', pointBorderColor: '#fff', pointBorderWidth: 1.5 }] },
      plugins: [crosshair],
      options: {
        responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
        plugins: { legend: { display: false }, tooltip: trendTooltip(dates) },
        scales: { x: { grid: { display: false }, ticks: { color: col.tick, maxTicksLimit: 12 } }, y: { grid: { color: col.grid }, ticks: { color: col.tick } } }
      }
    });
  }

  /* ── detail panel ── */
  function linkBtn(href, label) { return '<a class="pd-link" href="' + href + '" target="_blank" rel="noopener">' + label + '</a>'; }
  function buildDetail(p, gi) {
    var m = p.meta || {}, h = '';
    if (m.tldr) h += '<div class="pd-tldr"><b>💡 TL;DR</b> ' + esc(m.tldr) + '</div>';
    if (m.authors && m.authors.length) h += '<div class="pd-authors">👥 ' + esc(m.authors.slice(0, 10).join(', ')) + (m.authors.length > 10 ? ' et al.' : '') + '</div>';
    var links = [linkBtn('https://scholar.google.com/scholar?q=' + encodeURIComponent(p.title), '🎓 Scholar')];
    if (m.arxiv) links.push(linkBtn('https://arxiv.org/abs/' + encodeURIComponent(m.arxiv), '📄 arXiv'));
    if (m.doi) links.push(linkBtn('https://doi.org/' + encodeURIComponent(m.doi), '🔗 DOI'));
    if (m.pdf) links.push(linkBtn(m.pdf, '⬇ PDF'));
    if (m.s2url) links.push(linkBtn(m.s2url, '🔎 SemanticScholar'));
    h += '<div class="pd-links">' + links.join('') + '</div>';
    if (m.abstract) h += '<div class="pd-abstract clamp" id="abs-' + gi + '">' + esc(m.abstract) + '</div><span class="pd-more" data-gi="' + gi + '">Show more ▾</span>';
    else if (!m.tldr) h += '<div class="pd-nometa">ℹ️ No abstract yet (metadata fills in automatically via Semantic Scholar).</div>';
    h += '<div class="pd-chart"><canvas id="chart-' + gi + '"></canvas></div>';
    return h;
  }

  /* ── list ── */
  function getSorted() {
    var q = (document.getElementById('searchInput').value || '').toLowerCase();
    var list = MODEL.papers.filter(function (p) { return !q || p.title.toLowerCase().indexOf(q) >= 0; });
    if (currentSort === 'cites') list.sort(function (a, b) { return b.latest - a.latest; });
    else if (currentSort === 'growth') list.sort(function (a, b) { return (b.latest - b.prev) - (a.latest - a.prev); });
    else if (currentSort === 'new') list.sort(function (a, b) { return (a.firstSeen < b.firstSeen ? 1 : a.firstSeen > b.firstSeen ? -1 : 0) || (b.latest - a.latest); });
    else list.sort(function (a, b) { return (parseInt(b.year) || 0) - (parseInt(a.year) || 0); });
    return list;
  }

  function renderList() {
    Object.keys(charts).forEach(function (k) { try { charts[k].destroy(); } catch (e) {} });
    charts = {};
    var papers = getSorted();
    if (!papers.length) { document.getElementById('list').innerHTML = '<div class="loading">No papers found.</div>'; return; }
    var medals = ['🥇', '🥈', '🥉'], byCites = currentSort === 'cites', html = '';
    papers.forEach(function (p, idx) {
      var gi = MODEL.papers.indexOf(p);
      var diff = p.latest - p.prev;
      var cls = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat';
      var txt = diff > 0 ? '+' + diff : diff < 0 ? String(diff) : '—';
      var rank = (byCites && idx < 3) ? '<span class="rank medal">' + medals[idx] + '</span>' : '<span class="rank">' + (idx + 1) + '</span>';
      var tag = p.isNew ? '<span class="tag-new">new</span>' : '';
      html += '<div class="paper" id="paper-' + gi + '" data-gi="' + gi + '">'
        + '<div class="paper-head">' + rank
        + '<div class="paper-info"><div class="paper-title">' + tag + '<span class="tt" title="' + esc(p.title) + '">' + esc(p.title) + '</span></div>'
        + '<div class="paper-meta">' + (p.year ? '<span>📅 ' + esc(p.year) + '</span>' : '')
        + (p.meta && p.meta.venue ? '<span>🏛 ' + esc(p.meta.venue.length > 34 ? p.meta.venue.slice(0, 34) + '…' : p.meta.venue) + '</span>' : '')
        + '<span>📊 ' + p.series.length + ' days</span>'
        + (p.totalGain > 0 ? '<span>↗ +' + p.totalGain + ' since tracked</span>' : '') + '</div></div>'
        + '<div class="paper-stats"><span class="cites-num">' + p.latest.toLocaleString() + '</span><span class="badge ' + cls + '">' + txt + '</span></div>'
        + '<span class="arrow">▼</span></div>'
        + '<div class="paper-chart"><div class="paper-chart-inner">' + buildDetail(p, gi) + '</div></div></div>';
    });
    document.getElementById('list').innerHTML = html;
  }

  function toggleCard(gi) {
    var el = document.getElementById('paper-' + gi); if (!el) return;
    var was = el.classList.contains('open');
    document.querySelectorAll('.paper.open').forEach(function (x) { x.classList.remove('open'); });
    if (was) return;
    el.classList.add('open');
    if (!charts[gi]) {
      var p = MODEL.papers[gi];
      charts[gi] = lineChart(document.getElementById('chart-' + gi),
        p.series.map(function (s) { return s.date.slice(5); }),
        p.series.map(function (s) { return s.citations; }),
        p.series.map(function (s) { return s.date; }), 230);
    }
  }

  /* event delegation (MV3 CSP forbids inline handlers) */
  function wireList() {
    document.getElementById('list').addEventListener('click', function (e) {
      var more = e.target.closest('.pd-more');
      if (more) {
        e.stopPropagation();
        var a = document.getElementById('abs-' + more.getAttribute('data-gi'));
        var clamped = a.classList.toggle('clamp');
        more.textContent = clamped ? 'Show more ▾' : 'Show less ▴';
        return;
      }
      var head = e.target.closest('.paper-head');
      if (head) { toggleCard(+head.parentNode.getAttribute('data-gi')); }
    });
  }

  /* ── milestones (crossing multiples of 50 within 60 days) ── */
  function renderMilestones() {
    var STEP = 50, WINDOW = 60, maxDate = MODEL.dates[MODEL.dates.length - 1] || '';
    var ev = [];
    MODEL.papers.forEach(function (p) {
      for (var i = 1; i < p.series.length; i++) {
        var lo = Math.floor(p.series[i - 1].citations / STEP), hi = Math.floor(p.series[i].citations / STEP);
        for (var m = lo + 1; m <= hi; m++) ev.push({ date: p.series[i].date, title: p.title, T: m * STEP });
      }
    });
    ev = ev.filter(function (e) { return maxDate && MPT.daysBetween(e.date, maxDate) <= WINDOW; });
    ev.sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : b.T - a.T; });
    ev = ev.slice(0, 8);
    if (!ev.length) return;
    document.getElementById('milestones').innerHTML = ev.map(function (e) {
      return '<div class="ms-item"><span class="ms-badge">' + e.T.toLocaleString() + '+ 🎯</span><span class="ms-title" title="' + esc(e.title) + '">' + esc(e.title) + '</span><span class="ms-date">' + e.date + '</span></div>';
    }).join('');
    document.getElementById('milestonesSec').style.display = '';
  }

  /* ── stats + overall ── */
  function renderTop() {
    var m = MODEL;
    var total = m.totals[m.totals.length - 1] || 0;
    var todayNew = m.totalDeltas[m.totalDeltas.length - 1] || 0;
    var last7 = m.totalDeltas.slice(-7);
    var avg7 = last7.length ? last7.reduce(function (a, v) { return a + v; }, 0) / last7.length : 0;
    var allD = m.totalDeltas.slice(1);
    var avgAll = allD.length ? allD.reduce(function (a, v) { return a + v; }, 0) / allD.length : 0;
    document.getElementById('lastUpdated').textContent =
      (m.profile.name ? m.profile.name + ' · ' : '') + 'Last updated: ' + (m.updated || '—') + ' · ' + m.papers.length + ' papers over ' + m.dates.length + ' days';
    document.getElementById('stats').innerHTML =
      card('📚', 'Total Citations', total.toLocaleString(), fmt(todayNew) + ' latest', todayNew) +
      card('🔥', 'Latest New', fmt(todayNew), 'vs previous capture', todayNew) +
      card('📄', 'Papers Tracked', m.papers.length, m.newCount > 0 ? ('✨ ' + m.newCount + ' new') : (m.dates.length + ' days'), m.newCount) +
      (m.hindex != null ? card('🏅', 'h-index', m.hindex, m.i10 != null ? ('i10: ' + m.i10) : '', 0) : '') +
      card('📈', '7-Day Avg', avg7.toFixed(1), 'all-time avg ' + avgAll.toFixed(1) + '/day', avg7);
    lineChart(document.getElementById('overallChart'), m.dates.map(function (d) { return d.slice(5); }), m.totals, m.dates, 240);
  }
  function card(ico, label, value, sub, dir) {
    var cls = dir > 0 ? 'up' : dir < 0 ? 'down' : '';
    return '<div class="stat-card"><div class="stat-top"><span class="stat-label">' + label + '</span><span class="stat-ico">' + ico + '</span></div>'
      + '<div class="stat-value">' + value + '</div><div class="stat-change ' + cls + '">' + sub + '</div></div>';
  }

  /* ── render one profile's doc ── */
  function showDoc(doc) {
    document.getElementById('milestonesSec').style.display = 'none';
    if (!doc || !Object.keys(doc.papers || {}).length) {
      document.getElementById('list').innerHTML = '<div class="empty">No data yet.<br>Open your <a href="https://scholar.google.com/citations" target="_blank">Google Scholar profile</a> and the trend panel will start recording your citations.</div>';
      document.getElementById('lastUpdated').textContent = 'No data yet';
      document.getElementById('stats').innerHTML = '';
      return;
    }
    MODEL = MPT.buildRenderModel(doc);
    renderTop();
    renderMilestones();
    renderList();
  }

  /* ── boot ── */
  Promise.all([MPT.storage.local.listProfiles(), MPT.getSettings()]).then(function (r) {
    var profiles = r[0], settings = r[1];
    var sel = document.getElementById('profileSel');
    var current = settings.activeProfileId || (profiles[0] && profiles[0].id) || '';

    if (profiles.length > 1) {
      sel.style.display = '';
      sel.innerHTML = profiles.map(function (p) {
        var label = (p.name || p.id) + ' · ' + p.papers + ' papers';
        return '<option value="' + p.id + '"' + (p.id === current ? ' selected' : '') + '>' + label + '</option>';
      }).join('');
      sel.addEventListener('change', function () { MPT.storage.local.loadFor(sel.value).then(showDoc); });
    }

    // static controls
    wireList();
    document.getElementById('searchInput').addEventListener('input', renderList);
    document.querySelectorAll('.sort-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        currentSort = b.getAttribute('data-sort');
        document.querySelectorAll('.sort-btn').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active'); renderList();
      });
    });

    (current ? MPT.storage.local.loadFor(current) : MPT.storage.local.load()).then(showDoc);
  });
})();
