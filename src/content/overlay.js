/* MyPaperTrend — overlay panel injected onto the Scholar profile page. */
(function (g) {
  var MPT = (g.MPT = g.MPT || {});
  var chart = null;
  var busy = false;
  var lastOpts = null;

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
    '#mpt-root .mpt-chart{height:180px;position:relative}',
    '#mpt-root .mpt-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}',
    '#mpt-root .mpt-btn{font-size:12px;font-weight:600;padding:7px 12px;border-radius:8px;border:1px solid #e6e9ef;',
    'background:#f7f9fc;color:#334155;cursor:pointer;transition:all .15s}',
    '#mpt-root .mpt-btn:hover{border-color:#6366f1;color:#4f46e5}',
    '#mpt-root .mpt-btn.primary{background:#6366f1;border-color:#6366f1;color:#fff}',
    '#mpt-root .mpt-btn[disabled]{opacity:.5;cursor:default}',
    '#mpt-root .mpt-note{font-size:11px;color:#94a3b8;margin-top:8px}',
    '@media(prefers-color-scheme:dark){',
    '#mpt-root{background:#111a2e;border-color:#243149;color:#f1f5f9;box-shadow:0 2px 12px rgba(0,0,0,.4)}',
    '#mpt-root .mpt-chip,#mpt-root .mpt-btn{background:#0d1526;border-color:#243149;color:#cbd5e1}',
    '#mpt-root .mpt-chip .n{color:#a5b4fc}#mpt-root .mpt-btn.primary{background:#6366f1;color:#fff}}'
  ].join('');

  function injectCSS() {
    if (document.getElementById('mpt-style')) return;
    var s = document.createElement('style');
    s.id = 'mpt-style';
    s.textContent = CSS;
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

  function fmt(n) { return (n >= 0 ? '+' : '') + n; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function trendTooltip(dates) {
    var dark = window.matchMedia && window.matchMedia('(prefers-color-scheme:dark)').matches;
    return {
      backgroundColor: dark ? 'rgba(17,26,46,.96)' : 'rgba(255,255,255,.98)',
      titleColor: dark ? '#f1f5f9' : '#0f172a', bodyColor: dark ? '#cbd5e1' : '#334155',
      borderColor: dark ? 'rgba(129,140,248,.4)' : 'rgba(99,102,241,.25)', borderWidth: 1,
      padding: 10, cornerRadius: 8, displayColors: false,
      callbacks: {
        title: function (items) { return '📅 ' + dates[items[0].dataIndex]; },
        label: function (ctx) {
          var i = ctx.dataIndex, v = ctx.parsed.y, out = ['Citations: ' + v.toLocaleString()];
          if (i > 0) { var d = v - ctx.dataset.data[i - 1]; out.push('New: ' + fmt(d) + (d > 0 ? ' 📈' : d < 0 ? ' 📉' : ' —')); }
          return out;
        }
      }
    };
  }

  var crosshair = {
    id: 'mptCrosshair',
    afterDraw: function (c) {
      var t = c.tooltip;
      if (!t || !t._active || !t._active.length) return;
      var x = t._active[0].element.x, a = c.chartArea, ctx = c.ctx;
      var dark = window.matchMedia && window.matchMedia('(prefers-color-scheme:dark)').matches;
      ctx.save(); ctx.beginPath(); ctx.moveTo(x, a.top); ctx.lineTo(x, a.bottom);
      ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
      ctx.strokeStyle = dark ? 'rgba(129,140,248,.55)' : 'rgba(99,102,241,.45)';
      ctx.stroke(); ctx.restore();
    }
  };

  function drawChart(canvas, model) {
    var dark = window.matchMedia && window.matchMedia('(prefers-color-scheme:dark)').matches;
    var ctx = canvas.getContext('2d');
    var grad = ctx.createLinearGradient(0, 0, 0, 180);
    grad.addColorStop(0, 'rgba(99,102,241,.28)'); grad.addColorStop(1, 'rgba(99,102,241,0)');
    if (chart) { chart.destroy(); chart = null; }
    chart = new g.Chart(ctx, {
      type: 'line',
      data: {
        labels: model.dates.map(function (d) { return d.slice(5); }),
        datasets: [{
          data: model.totals, borderColor: '#6366f1', backgroundColor: grad,
          fill: true, tension: .35, borderWidth: 2.5,
          pointRadius: model.dates.length > 60 ? 0 : 2.5, pointHoverRadius: 6, hoverRadius: 6,
          pointBackgroundColor: '#6366f1', pointBorderColor: '#fff', pointBorderWidth: 1.5
        }]
      },
      plugins: [crosshair],
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { display: false }, tooltip: trendTooltip(model.dates) },
        scales: {
          x: { grid: { display: false }, ticks: { color: dark ? '#8ea0b8' : '#94a3b8', maxTicksLimit: 10 } },
          y: { grid: { color: dark ? 'rgba(255,255,255,.06)' : 'rgba(15,23,42,.05)' }, ticks: { color: dark ? '#8ea0b8' : '#94a3b8' } }
        }
      }
    });
  }

  MPT.overlay = {
    setBusy: function (b) {
      busy = b;
      var btn = document.getElementById('mpt-capture');
      if (btn) { btn.disabled = b; btn.textContent = b ? '⏳ Capturing…' : '🔄 Capture all pages'; }
    },

    render: function (model, opts) {
      lastOpts = opts || lastOpts || {};
      injectCSS();
      if (!g.Chart) { console.warn('[MyPaperTrend] Chart.js not loaded'); }
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
          '<div class="mpt-chip"><div class="n">' + model.dates.length + '</div><div class="l">days tracked</div></div>' +
        '</div>' +
        '<div class="mpt-chart"><canvas id="mpt-canvas"></canvas></div>' +
        '<div class="mpt-actions">' +
          '<button class="mpt-btn primary" id="mpt-capture">🔄 Capture all pages</button>' +
          '<button class="mpt-btn" id="mpt-dash">📊 Full dashboard</button>' +
          '<button class="mpt-btn" id="mpt-export">⬇ Export JSON</button>' +
          '<button class="mpt-btn" id="mpt-settings">⚙ Settings</button>' +
        '</div>' +
        '<div class="mpt-note">Data is stored locally in your browser. Only the currently shown rows are captured on each visit — click “Capture all pages” to include every paper (and newly added ones).</div>';

      if (g.Chart && model.dates.length) drawChart(document.getElementById('mpt-canvas'), model);

      document.getElementById('mpt-capture').onclick = function () {
        if (busy || !lastOpts.onCaptureAll) return;
        lastOpts.onCaptureAll();
      };
      document.getElementById('mpt-dash').onclick = function () {
        chrome.runtime.sendMessage({ type: 'OPEN', page: 'src/ui/dashboard.html' });
      };
      document.getElementById('mpt-settings').onclick = function () {
        chrome.runtime.sendMessage({ type: 'OPEN', page: 'src/ui/options.html' });
      };
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
