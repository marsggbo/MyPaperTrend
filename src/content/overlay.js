/* MyPaperTrend — overlay panel injected onto the Scholar profile page. */
(function (g) {
  var MPT = (g.MPT = g.MPT || {});
  var totalChart = null;
  var paperCharts = {};       // idx -> Chart
  var busy = false;
  var lastOpts = null;
  var curModel = null;

  var CSS = [
    '#mpt-root{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;',
    'background:#fff;border:1px solid #e6e9ef;border-radius:14px;padding:16px 18px;margin:14px 0;',
    'box-shadow:0 2px 8px rgba(15,23,42,.06);color:#0f172a;max-width:100%}',
    '#mpt-root *{box-sizing:border-box}',
    '#mpt-root .mpt-hd{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px}',
    '#mpt-root .mpt-title{font-size:15px;font-weight:800;display:flex;align-items:center;gap:6px;letter-spacing:-.2px}',
    '#mpt-root .mpt-sub{font-size:11.5px;color:#64748b}',
    '#mpt-root .mpt-chips{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px}',
    '#mpt-root .mpt-chip{background:#f7f9fc;border:1px solid #e6e9ef;border-radius:10px;padding:8px 12px;min-width:96px}',
    '#mpt-root .mpt-chip .n{font-size:19px;font-weight:800;line-height:1;color:#4f46e5}',
    '#mpt-root .mpt-chip .l{font-size:10.5px;color:#64748b;text-transform:uppercase;letter-spacing:.04em;margin-top:4px}',
    '#mpt-root .mpt-chip .d{font-size:11px;margin-top:3px}',
    '#mpt-root .up{color:#10b981}#mpt-root .down{color:#ef4444}',
    '#mpt-root .mpt-sec{font-size:12px;font-weight:700;color:#334155;margin:14px 2px 8px}',
    '#mpt-root .mpt-chart{height:180px;position:relative}',
    // per-paper accordion
    '#mpt-root .mpt-papers{max-height:340px;overflow-y:auto;border:1px solid #e6e9ef;border-radius:10px}',
    '#mpt-root .mpt-paper{border-bottom:1px solid #eef1f6}',
    '#mpt-root .mpt-paper:last-child{border-bottom:0}',
    '#mpt-root .mpt-ph{display:flex;align-items:center;gap:8px;padding:8px 11px;cursor:pointer;background:#fff}',
    '#mpt-root .mpt-ph:hover{background:#f7f9fc}',
    '#mpt-root .mpt-rank{font-size:11px;font-weight:700;color:#94a3b8;width:18px;text-align:center;flex-shrink:0}',
    '#mpt-root .mpt-pt{flex:1;min-width:0;font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:6px}',
    '#mpt-root .mpt-tagnew{font-size:9px;font-weight:800;text-transform:uppercase;padding:1px 5px;border-radius:5px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;flex-shrink:0}',
    '#mpt-root .mpt-pc{font-size:13px;font-weight:800;color:#4f46e5;flex-shrink:0}',
    '#mpt-root .mpt-pb{font-size:11px;font-weight:700;padding:1px 6px;border-radius:999px;flex-shrink:0;min-width:34px;text-align:center}',
    '#mpt-root .mpt-pb.up{background:rgba(16,185,129,.15);color:#10b981}',
    '#mpt-root .mpt-pb.down{background:rgba(239,68,68,.12);color:#ef4444}',
    '#mpt-root .mpt-pb.flat{background:#eef1f6;color:#94a3b8}',
    '#mpt-root .mpt-arrow{font-size:9px;color:#94a3b8;transition:transform .25s;flex-shrink:0}',
    '#mpt-root .mpt-paper.open .mpt-arrow{transform:rotate(180deg)}',
    '#mpt-root .mpt-pchart{max-height:0;overflow:hidden;transition:max-height .3s ease}',
    '#mpt-root .mpt-paper.open .mpt-pchart{max-height:220px}',
    '#mpt-root .mpt-pchart-in{height:180px;padding:8px 11px 12px}',
    // actions
    '#mpt-root .mpt-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}',
    '#mpt-root .mpt-btn{font-size:12px;font-weight:600;padding:7px 12px;border-radius:8px;border:1px solid #e6e9ef;',
    'background:#f7f9fc;color:#334155;cursor:pointer;transition:all .15s}',
    '#mpt-root .mpt-btn:hover{border-color:#6366f1;color:#4f46e5}',
    '#mpt-root .mpt-btn.primary{background:#6366f1;border-color:#6366f1;color:#fff}',
    '#mpt-root .mpt-btn[disabled]{opacity:.5;cursor:default}',
    '#mpt-root .mpt-note{font-size:11px;color:#94a3b8;margin-top:8px}',
    '#mpt-root .mpt-credit{font-size:11px;color:#94a3b8;margin-top:10px;padding-top:9px;border-top:1px solid #eef1f6;text-align:center}',
    '#mpt-root .mpt-credit a{color:#6366f1;text-decoration:none;font-weight:600}',
    '#mpt-root .mpt-optin{font-size:12.5px;color:#475569;line-height:1.55;margin:6px 0 12px}',
    '@media(prefers-color-scheme:dark){',
    '#mpt-root .mpt-credit{border-color:#1c2740}#mpt-root .mpt-optin{color:#94a3b8}',
    '#mpt-root{background:#111a2e;border-color:#243149;color:#f1f5f9;box-shadow:0 2px 12px rgba(0,0,0,.4)}',
    '#mpt-root .mpt-chip,#mpt-root .mpt-btn,#mpt-root .mpt-papers{background:#0d1526;border-color:#243149;color:#cbd5e1}',
    '#mpt-root .mpt-ph{background:#111a2e}#mpt-root .mpt-ph:hover{background:#0d1526}',
    '#mpt-root .mpt-paper{border-color:#1c2740}#mpt-root .mpt-sec{color:#94a3b8}',
    '#mpt-root .mpt-chip .n,#mpt-root .mpt-pc{color:#a5b4fc}#mpt-root .mpt-btn.primary{background:#6366f1;color:#fff}}'
  ].join('');

  function injectCSS() {
    if (document.getElementById('mpt-style')) return;
    var s = document.createElement('style');
    s.id = 'mpt-style'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  function mount() {
    var root = document.getElementById('mpt-root');
    if (root) return root;
    root = document.createElement('div');
    root.id = 'mpt-root';
    var anchor = document.getElementById('gsc_prf') || document.getElementById('gsc_bdy');
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(root, anchor.nextSibling);
    else document.body.insertBefore(root, document.body.firstChild);
    return root;
  }

  function dark() { return window.matchMedia && window.matchMedia('(prefers-color-scheme:dark)').matches; }
  function fmt(n) { return (n >= 0 ? '+' : '') + n; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var CREDIT = '<div class="mpt-credit">Made by <a href="https://github.com/marsggbo" target="_blank" rel="noopener">marsggbo</a> · <a href="https://github.com/marsggbo/MyPaperTrend" target="_blank" rel="noopener">MyPaperTrend on GitHub</a></div>';

  function trendTooltip(dates) {
    var d = dark();
    return {
      backgroundColor: d ? 'rgba(17,26,46,.96)' : 'rgba(255,255,255,.98)',
      titleColor: d ? '#f1f5f9' : '#0f172a', bodyColor: d ? '#cbd5e1' : '#334155',
      borderColor: d ? 'rgba(129,140,248,.4)' : 'rgba(99,102,241,.25)', borderWidth: 1,
      padding: 10, cornerRadius: 8, displayColors: false,
      callbacks: {
        title: function (items) { return '📅 ' + dates[items[0].dataIndex]; },
        label: function (ctx) {
          var i = ctx.dataIndex, v = ctx.parsed.y, out = ['Citations: ' + v.toLocaleString()];
          if (i > 0) { var dd = v - ctx.dataset.data[i - 1]; out.push('New: ' + fmt(dd) + (dd > 0 ? ' 📈' : dd < 0 ? ' 📉' : ' —')); }
          return out;
        }
      }
    };
  }

  var crosshair = {
    id: 'mptCrosshair',
    afterDraw: function (c) {
      var t = c.tooltip; if (!t || !t._active || !t._active.length) return;
      var x = t._active[0].element.x, a = c.chartArea, ctx = c.ctx;
      ctx.save(); ctx.beginPath(); ctx.moveTo(x, a.top); ctx.lineTo(x, a.bottom);
      ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
      ctx.strokeStyle = dark() ? 'rgba(129,140,248,.55)' : 'rgba(99,102,241,.45)';
      ctx.stroke(); ctx.restore();
    }
  };

  function lineChart(canvas, labels, data, dates, h) {
    if (!g.Chart) return null;
    var ctx = canvas.getContext('2d');
    var grad = ctx.createLinearGradient(0, 0, 0, h || 180);
    grad.addColorStop(0, 'rgba(99,102,241,.26)'); grad.addColorStop(1, 'rgba(99,102,241,0)');
    var d = dark();
    return new g.Chart(ctx, {
      type: 'line',
      data: { labels: labels, datasets: [{ data: data, borderColor: '#6366f1', backgroundColor: grad, fill: true, tension: .35, borderWidth: 2.5, pointRadius: data.length > 60 ? 0 : 2.5, pointHoverRadius: 6, hoverRadius: 6, pointBackgroundColor: '#6366f1', pointBorderColor: '#fff', pointBorderWidth: 1.5 }] },
      plugins: [crosshair],
      options: {
        responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
        plugins: { legend: { display: false }, tooltip: trendTooltip(dates) },
        scales: {
          x: { grid: { display: false }, ticks: { color: d ? '#8ea0b8' : '#94a3b8', maxTicksLimit: 9 } },
          y: { grid: { color: d ? 'rgba(255,255,255,.06)' : 'rgba(15,23,42,.05)' }, ticks: { color: d ? '#8ea0b8' : '#94a3b8' } }
        }
      }
    });
  }

  function destroyCharts() {
    if (totalChart) { try { totalChart.destroy(); } catch (e) {} totalChart = null; }
    Object.keys(paperCharts).forEach(function (k) { try { paperCharts[k].destroy(); } catch (e) {} });
    paperCharts = {};
  }

  /* one-open-at-a-time accordion, lazy chart render (consistent with the dashboard) */
  function togglePaper(idx) {
    var el = document.querySelector('#mpt-root .mpt-paper[data-idx="' + idx + '"]');
    if (!el) return;
    var wasOpen = el.classList.contains('open');
    document.querySelectorAll('#mpt-root .mpt-paper.open').forEach(function (x) { x.classList.remove('open'); });
    if (wasOpen) return;
    el.classList.add('open');
    if (!paperCharts[idx]) {
      var p = curModel.papers[idx];
      paperCharts[idx] = lineChart(
        el.querySelector('canvas'),
        p.series.map(function (s) { return s.date.slice(5); }),
        p.series.map(function (s) { return s.citations; }),
        p.series.map(function (s) { return s.date; }), 180
      );
    }
  }

  function paperListHTML(model) {
    var sorted = model.papers.slice().sort(function (a, b) { return b.latest - a.latest; });
    return sorted.map(function (p) {
      var idx = model.papers.indexOf(p);
      var diff = p.latest - p.prev;
      var cls = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat';
      var txt = diff > 0 ? '+' + diff : diff < 0 ? String(diff) : '—';
      var rank = sorted.indexOf(p) + 1;
      var tag = p.isNew ? '<span class="mpt-tagnew">new</span>' : '';
      return '<div class="mpt-paper" data-idx="' + idx + '">' +
        '<div class="mpt-ph">' +
          '<span class="mpt-rank">' + rank + '</span>' +
          '<span class="mpt-pt" title="' + esc(p.title) + '">' + tag + '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(p.title) + '</span></span>' +
          '<span class="mpt-pc">' + p.latest.toLocaleString() + '</span>' +
          '<span class="mpt-pb ' + cls + '">' + txt + '</span>' +
          '<span class="mpt-arrow">▼</span>' +
        '</div>' +
        '<div class="mpt-pchart"><div class="mpt-pchart-in"><canvas></canvas></div></div>' +
      '</div>';
    }).join('');
  }

  MPT.overlay = {
    /* Shown on a profile that isn't your primary and isn't tracked yet — nothing is
       stored until the user explicitly opts in, so unrelated profiles never pile up. */
    renderOptIn: function (info, handlers) {
      injectCSS();
      var root = mount();
      root.innerHTML =
        '<div class="mpt-hd"><div class="mpt-title">📈 MyPaperTrend</div></div>' +
        '<div class="mpt-optin">This isn\'t your tracked profile' + (info.name ? ' (<b>' + esc(info.name) + '</b>)' : '') +
        '. To avoid mixing different people\'s data, MyPaperTrend only tracks profiles you choose.</div>' +
        '<div class="mpt-actions">' +
          '<button class="mpt-btn primary" id="mpt-track">➕ Track this profile</button>' +
          '<button class="mpt-btn" id="mpt-primary">⭐ Set as my profile</button>' +
          '<button class="mpt-btn" id="mpt-dash">📊 Dashboard</button>' +
        '</div>' + CREDIT;
      document.getElementById('mpt-track').onclick = function () { handlers.onTrack && handlers.onTrack(); };
      document.getElementById('mpt-primary').onclick = function () { handlers.onSetPrimary && handlers.onSetPrimary(); };
      document.getElementById('mpt-dash').onclick = function () { chrome.runtime.sendMessage({ type: 'OPEN', page: 'src/ui/dashboard.html' }); };
    },

    setBusy: function (b) {
      busy = b;
      var btn = document.getElementById('mpt-capture');
      if (btn) { btn.disabled = b; btn.textContent = b ? '⏳ Capturing…' : '🔄 Capture all pages'; }
    },

    render: function (model, opts) {
      lastOpts = opts || lastOpts || {};
      curModel = model;
      injectCSS();
      destroyCharts();
      var root = mount();

      var total = model.totals[model.totals.length - 1] || 0;
      var todayNew = model.totalDeltas[model.totalDeltas.length - 1] || 0;
      var newPapers = (opts && opts.newTitles && opts.newTitles.length) || model.newCount || 0;

      root.innerHTML =
        '<div class="mpt-hd">' +
          '<div><div class="mpt-title">📈 MyPaperTrend</div>' +
          '<div class="mpt-sub">Last captured: ' + esc(model.updated || '—') + ' · ' + model.papers.length + ' papers · ' + model.dates.length + ' days</div></div>' +
          (newPapers ? '<div class="mpt-chip"><div class="n up">' + newPapers + '</div><div class="l">new papers</div></div>' : '') +
        '</div>' +
        '<div class="mpt-chips">' +
          '<div class="mpt-chip"><div class="n">' + total.toLocaleString() + '</div><div class="l">total cites</div></div>' +
          '<div class="mpt-chip"><div class="n">' + fmt(todayNew) + '</div><div class="l">today\'s new</div><div class="d ' + (todayNew > 0 ? 'up' : todayNew < 0 ? 'down' : '') + '">vs prev capture</div></div>' +
          '<div class="mpt-chip"><div class="n">' + model.papers.length + '</div><div class="l">papers</div></div>' +
          (model.hindex != null ? '<div class="mpt-chip"><div class="n">' + model.hindex + '</div><div class="l">h-index</div></div>' : '') +
          '<div class="mpt-chip"><div class="n">' + model.dates.length + '</div><div class="l">days tracked</div></div>' +
        '</div>' +
        '<div class="mpt-sec">📊 Total citations trend</div>' +
        '<div class="mpt-chart"><canvas id="mpt-canvas"></canvas></div>' +
        '<div class="mpt-sec">📄 Per-paper — click a paper to expand its trend</div>' +
        '<div class="mpt-papers" id="mpt-papers">' + paperListHTML(model) + '</div>' +
        '<div class="mpt-actions">' +
          '<button class="mpt-btn primary" id="mpt-capture">🔄 Capture all pages</button>' +
          '<button class="mpt-btn" id="mpt-dash">📊 Full dashboard</button>' +
          '<button class="mpt-btn" id="mpt-export">⬇ Export JSON</button>' +
          '<button class="mpt-btn" id="mpt-settings">⚙ Settings</button>' +
        '</div>' +
        '<div class="mpt-note">The total comes from Scholar\'s own metrics (always correct). Per-paper trends update for the papers shown on this page — click “Capture all pages” to include every paper (and newly added ones).</div>' +
        CREDIT;

      if (g.Chart && model.dates.length) {
        totalChart = lineChart(document.getElementById('mpt-canvas'),
          model.dates.map(function (d) { return d.slice(5); }), model.totals, model.dates, 180);
      }

      // accordion via event delegation (no inline handlers)
      document.getElementById('mpt-papers').addEventListener('click', function (e) {
        var head = e.target.closest('.mpt-ph'); if (!head) return;
        togglePaper(+head.parentNode.getAttribute('data-idx'));
      });

      document.getElementById('mpt-capture').onclick = function () { if (!busy && lastOpts.onCaptureAll) lastOpts.onCaptureAll(); };
      document.getElementById('mpt-dash').onclick = function () { chrome.runtime.sendMessage({ type: 'OPEN', page: 'src/ui/dashboard.html' }); };
      document.getElementById('mpt-settings').onclick = function () { chrome.runtime.sendMessage({ type: 'OPEN', page: 'src/ui/options.html' }); };
      document.getElementById('mpt-export').onclick = function () {
        MPT.storage.local.exportJSON().then(function (txt) {
          var blob = new Blob([txt], { type: 'application/json' });
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'mypapertrend-' + (model.updated || 'export') + '.json';
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
        });
      };
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : self);
