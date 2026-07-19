/* MyPaperTrend — compact, collapsible panel injected at the top of the Scholar profile. */
(function (g) {
  var MPT = (g.MPT = g.MPT || {});
  var totalChart = null;
  var busy = false;
  var lastOpts = null;
  var curModel = null;

  var CSS = [
    '#mpt-root{font-family:Arial,"Roboto",-apple-system,BlinkMacSystemFont,sans-serif;background:#fff;',
    'border:1px solid #dadce0;border-radius:8px;margin:14px 0;color:#202124;max-width:100%;overflow:hidden}',
    '#mpt-root *{box-sizing:border-box}',
    '#mpt-root .mpt-bar{display:flex;align-items:center;gap:10px;padding:10px 14px;background:#f8f9fb;border-bottom:1px solid #ecedf0}',
    '#mpt-root.collapsed .mpt-bar{border-bottom:0}',
    '#mpt-root .mpt-brand{font-size:14px;font-weight:700;flex:1;display:flex;align-items:center;gap:6px;letter-spacing:-.2px}',
    '#mpt-root .mpt-lang{display:flex;gap:2px;font-size:11px;font-weight:700}',
    '#mpt-root .mpt-lang span{cursor:pointer;padding:2px 6px;border-radius:5px;color:#80868b}',
    '#mpt-root .mpt-lang span.on{background:#e8f0fe;color:#1a73e8}',
    '#mpt-root .mpt-toggle{display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-size:11.5px;font-weight:700;color:#5f6368;user-select:none}',
    '#mpt-root .mpt-sw{width:32px;height:18px;border-radius:999px;background:#c4c7c5;position:relative;transition:background .2s;flex-shrink:0}',
    '#mpt-root .mpt-sw::after{content:"";position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:#fff;transition:transform .2s;box-shadow:0 1px 2px rgba(0,0,0,.3)}',
    '#mpt-root .mpt-toggle.on .mpt-sw{background:#1a73e8}#mpt-root .mpt-toggle.on .mpt-sw::after{transform:translateX(14px)}',
    '#mpt-root .mpt-chevron{cursor:pointer;color:#80868b;font-size:11px;padding:2px 4px;transition:transform .2s}',
    '#mpt-root.collapsed .mpt-chevron{transform:rotate(-90deg)}',
    '#mpt-root .mpt-body{padding:14px}',
    '#mpt-root.collapsed .mpt-body{display:none}',
    '#mpt-root .mpt-chips{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px}',
    '#mpt-root .mpt-chip{background:#f8f9fb;border:1px solid #ecedf0;border-radius:8px;padding:8px 12px;min-width:92px}',
    '#mpt-root .mpt-chip .n{font-size:18px;font-weight:700;line-height:1;color:#1a73e8}',
    '#mpt-root .mpt-chip .l{font-size:10.5px;color:#80868b;margin-top:4px}',
    '#mpt-root .mpt-chip .d{font-size:10.5px;margin-top:2px;color:#80868b}',
    '#mpt-root .up{color:#188038}#mpt-root .down{color:#d93025}',
    '#mpt-root .mpt-chart{height:170px;position:relative}',
    '#mpt-root .mpt-actions{display:flex;gap:8px;margin-top:14px}',
    '#mpt-root .mpt-btn{flex:1;text-align:center;font-size:12px;font-weight:600;padding:8px 6px;border-radius:8px;',
    'border:1px solid #dadce0;background:#fff;color:#3c4043;cursor:pointer;transition:all .15s;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '#mpt-root .mpt-btn:hover{background:#f1f3f4;border-color:#1a73e8;color:#1a73e8}',
    '#mpt-root .mpt-btn[disabled]{opacity:.5;cursor:default}',
    '#mpt-root .mpt-hint{font-size:11.5px;color:#8a6d00;background:#fef7e0;border:1px solid #feefc3;border-radius:6px;padding:7px 10px;margin-top:10px;line-height:1.5}',
    '#mpt-root .mpt-note{font-size:11px;color:#9aa0a6;margin-top:10px;line-height:1.5}',
    '#mpt-root .mpt-optin{font-size:12.5px;color:#5f6368;line-height:1.55;padding:12px 14px}',
    '#mpt-root .mpt-credit{font-size:10.5px;color:#9aa0a6;margin-top:10px;padding-top:9px;border-top:1px solid #ecedf0;text-align:center}',
    '#mpt-root .mpt-credit a{color:#1a73e8;text-decoration:none;font-weight:600}',
    '@media(prefers-color-scheme:dark){',
    '#mpt-root{background:#202124;border-color:#3c4043;color:#e8eaed}',
    '#mpt-root .mpt-bar{background:#282a2d;border-color:#3c4043}',
    '#mpt-root .mpt-chip{background:#282a2d;border-color:#3c4043}#mpt-root .mpt-chip .n{color:#8ab4f8}',
    '#mpt-root .mpt-lang span.on{background:#283142;color:#8ab4f8}',
    '#mpt-root .mpt-btn{background:#202124;border-color:#3c4043;color:#e8eaed}#mpt-root .mpt-btn:hover{background:#282a2d;border-color:#8ab4f8;color:#8ab4f8}',
    '#mpt-root .mpt-credit{border-color:#3c4043}#mpt-root .mpt-credit a{color:#8ab4f8}',
    '#mpt-root .mpt-hint{background:#332b00;border-color:#5c4b00;color:#fdd663}}'
  ].join('');

  function injectCSS() {
    if (document.getElementById('mpt-style')) return;
    var s = document.createElement('style'); s.id = 'mpt-style'; s.textContent = CSS;
    document.head.appendChild(s);
  }
  function mount() {
    var root = document.getElementById('mpt-root');
    if (root) return root;
    root = document.createElement('div'); root.id = 'mpt-root';
    // Insert above the articles table so the panel width lines up with the paper list
    // and never overlaps the avatar / profile header.
    var table = document.getElementById('gsc_a_t');
    if (table && table.parentNode) { table.parentNode.insertBefore(root, table); return root; }
    var anchor = document.getElementById('gsc_prf') || document.getElementById('gsc_bdy');
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(root, anchor.nextSibling);
    else document.body.insertBefore(root, document.body.firstChild);
    return root;
  }
  function fmt(n) { return (n >= 0 ? '+' : '') + n; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function T(k, v) { return MPT.t(k, v); }

  function langHTML() {
    var l = MPT.getLang();
    return '<div class="mpt-lang"><span data-lang="en" class="' + (l === 'en' ? 'on' : '') + '">EN</span>' +
      '<span data-lang="zh" class="' + (l === 'zh' ? 'on' : '') + '">中</span></div>';
  }
  function wireLang(root) {
    root.querySelectorAll('.mpt-lang span').forEach(function (el) {
      el.onclick = function () {
        var l = el.getAttribute('data-lang');
        MPT.setLangValue(l);
        MPT.patchSettings({ lang: l });
        if (curModel && curModel.__off) MPT.overlay.renderToggleOff(curModel.__off, lastOpts);
        else MPT.overlay.render(curModel, lastOpts);
        if (lastOpts && lastOpts.onLangChange) lastOpts.onLangChange();
      };
    });
  }

  MPT.overlay = {
    setBusy: function (b) {
      busy = b;
      var btn = document.getElementById('mpt-capture');
      if (btn) { btn.disabled = b; btn.textContent = b ? T('capturing') : T('captureAll'); }
    },

    /* Untracked profile: only the header + a Track switch; nothing stored yet. */
    renderToggleOff: function (info, handlers) {
      injectCSS();
      lastOpts = handlers || lastOpts || {};
      curModel = { __off: info };
      var root = mount(); root.className = '';
      root.innerHTML =
        '<div class="mpt-bar">' +
          '<div class="mpt-brand">📈 ' + T('brand') + '</div>' + langHTML() +
          '<div class="mpt-toggle" id="mpt-toggle"><span>' + T('track') + '</span><span class="mpt-sw"></span></div>' +
        '</div>' +
        '<div class="mpt-body"><div class="mpt-optin" style="padding:0">' + T('trackPrompt', { name: esc(info.name || T('thisScholar')) }) + '</div>' +
        '<div class="mpt-credit">' + T('madeBy') + ' <a href="https://marsggbo.github.io/" target="_blank" rel="noopener">marsggbo</a> · <a href="https://github.com/marsggbo/MyPaperTrend" target="_blank" rel="noopener">' + T('onGitHub') + '</a></div></div>';
      document.getElementById('mpt-toggle').onclick = function () { handlers.onToggle && handlers.onToggle(); };
      wireLang(root);
    },

    render: function (model, opts) {
      lastOpts = opts || lastOpts || {};
      curModel = model;
      injectCSS();
      if (totalChart) { try { totalChart.destroy(); } catch (e) {} totalChart = null; }
      var root = mount();
      var collapsed = !!(opts && opts.collapsed);
      root.className = collapsed ? 'collapsed' : '';

      var total = model.totals[model.totals.length - 1] || 0;
      var todayNew = model.totalDeltas[model.totalDeltas.length - 1] || 0;
      var newPapers = (opts && opts.newTitles && opts.newTitles.length) || model.newCount || 0;

      root.innerHTML =
        '<div class="mpt-bar">' +
          '<div class="mpt-brand">📈 ' + T('brand') + '</div>' + langHTML() +
          '<div class="mpt-toggle on" id="mpt-toggle" title="' + esc(T('tracking')) + '"><span>' + T('tracking') + '</span><span class="mpt-sw"></span></div>' +
          '<span class="mpt-chevron" id="mpt-chevron">▼</span>' +
        '</div>' +
        '<div class="mpt-body">' +
          '<div style="font-size:11px;color:#80868b;margin-bottom:10px">' + T('lastCaptured', { date: esc(model.updated || '—'), papers: model.papers.length, days: model.dates.length }) + '</div>' +
          '<div class="mpt-chips">' +
            '<div class="mpt-chip"><div class="n">' + total.toLocaleString() + '</div><div class="l">' + T('totalCites') + '</div></div>' +
            '<div class="mpt-chip"><div class="n">' + fmt(todayNew) + '</div><div class="l">' + T('todaysNew') + '</div><div class="d ' + (todayNew > 0 ? 'up' : todayNew < 0 ? 'down' : '') + '">' + T('vsPrev') + '</div></div>' +
            '<div class="mpt-chip"><div class="n">' + model.papers.length + '</div><div class="l">' + T('papers') + '</div></div>' +
            (model.hindex != null ? '<div class="mpt-chip"><div class="n">' + model.hindex + '</div><div class="l">' + T('hindex') + '</div></div>' : '') +
            (newPapers ? '<div class="mpt-chip"><div class="n up">' + newPapers + '</div><div class="l">' + T('newPapers') + '</div></div>' : '') +
          '</div>' +
          '<div class="mpt-chart"><canvas id="mpt-canvas"></canvas></div>' +
          ((opts && opts.hasMore) ? '<div class="mpt-hint">⚠️ ' + T('hintMore') + '</div>' : '') +
          '<div class="mpt-actions">' +
            '<button class="mpt-btn" id="mpt-capture">🔄 ' + T('captureAll') + '</button>' +
            '<button class="mpt-btn" id="mpt-dash">📊 ' + T('fullDashboard') + '</button>' +
            '<button class="mpt-btn" id="mpt-export">⬇ ' + T('exportJSON') + '</button>' +
            '<button class="mpt-btn" id="mpt-settings">⚙ ' + T('settings') + '</button>' +
          '</div>' +
          '<div class="mpt-note">' + T('noteTotal') + '</div>' +
          '<div class="mpt-credit">' + T('madeBy') + ' <a href="https://marsggbo.github.io/" target="_blank" rel="noopener">marsggbo</a> · <a href="https://github.com/marsggbo/MyPaperTrend" target="_blank" rel="noopener">' + T('onGitHub') + '</a></div>' +
        '</div>';

      if (g.Chart && model.dates.length) {
        totalChart = MPT.chart.line(document.getElementById('mpt-canvas'),
          model.dates.map(function (d, i) { return { date: d, citations: model.totals[i] }; }), 170);
      }

      document.getElementById('mpt-chevron').onclick = function () {
        var c = root.classList.toggle('collapsed');
        MPT.patchSettings({ overlayCollapsed: c });
      };
      var tg = document.getElementById('mpt-toggle');
      if (tg) tg.onclick = function () { if (lastOpts.onToggle) lastOpts.onToggle(); };
      document.getElementById('mpt-capture').onclick = function () { if (!busy && lastOpts.onCaptureAll) lastOpts.onCaptureAll(); };
      document.getElementById('mpt-dash').onclick = function () { chrome.runtime.sendMessage({ type: 'OPEN', page: 'src/ui/dashboard.html' }); };
      document.getElementById('mpt-settings').onclick = function () { chrome.runtime.sendMessage({ type: 'OPEN', page: 'src/ui/options.html' }); };
      document.getElementById('mpt-export').onclick = function () {
        MPT.storage.local.exportJSON().then(function (txt) {
          var blob = new Blob([txt], { type: 'application/json' });
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob); a.download = 'mypapertrend-' + (model.updated || 'export') + '.json';
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
        });
      };
      wireLang(root);
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : self);
