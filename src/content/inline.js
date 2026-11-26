/* MyPaperTrend — inject a 📈 icon under each paper in the native Scholar list;
   clicking it expands that paper's citation history inline (below the row). */
(function (g) {
  var MPT = (g.MPT = g.MPT || {});
  var charts = {};
  var LOGO = '';
  try { if (g.chrome && chrome.runtime && chrome.runtime.getURL) LOGO = chrome.runtime.getURL('icons/icon48.png'); } catch (e) {}
  function logoImg(px) { return LOGO ? '<img src="' + LOGO + '" style="width:' + px + 'px;height:' + px + 'px;border-radius:3px;vertical-align:middle" alt="">' : '📈'; }

  var CSS = [
    '.mpt-inline-ico{display:inline-block;margin-left:8px;cursor:pointer;font-size:12px;opacity:.6;',
    'vertical-align:middle;transition:opacity .15s;user-select:none}',
    '.mpt-inline-ico:hover{opacity:1}',
    '.gsc_a_tr.mpt-open .mpt-inline-ico{opacity:1}',
    '.mpt-detail>td{padding:0 !important;background:#f8f9fb;border-bottom:1px solid #e0e0e0}',
    '.mpt-detail-in{padding:10px 16px 14px 34px}',
    '.mpt-detail-h{font-size:12px;font-weight:600;color:#5f6368;margin-bottom:6px;font-family:Arial,sans-serif}',
    '.mpt-detail-in canvas{height:150px !important}',
    '@media(prefers-color-scheme:dark){',
    '.mpt-detail>td{background:#181a1c;border-color:#3c4043}.mpt-detail-h{color:#9aa0a6}}'
  ].join('');

  function injectCSS() {
    if (document.getElementById('mpt-inline-style')) return;
    var s = document.createElement('style'); s.id = 'mpt-inline-style'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function pubOf(row) {
    var a = row.querySelector('.gsc_a_at'); if (!a) return null;
    try { return { pub: new URLSearchParams(a.href.split('?')[1]).get('citation_for_view') || '', title: a.textContent.trim(), cell: a.parentNode }; }
    catch (e) { return { pub: '', title: a.textContent.trim(), cell: a.parentNode }; }
  }

  function closeAll() {
    Object.keys(charts).forEach(function (k) { try { charts[k].destroy(); } catch (e) {} });
    charts = {};
    document.querySelectorAll('#gsc_a_b .mpt-detail').forEach(function (el) { el.remove(); });
    document.querySelectorAll('#gsc_a_b .gsc_a_tr.mpt-open').forEach(function (el) { el.classList.remove('mpt-open'); });
  }

  function toggle(row, paper, idx) {
    var nxt = row.nextElementSibling;
    // independent toggle — multiple papers can stay open at once
    if (nxt && nxt.classList.contains('mpt-detail') && nxt.getAttribute('data-idx') === String(idx)) {
      if (charts[idx]) { try { charts[idx].destroy(); } catch (e) {} delete charts[idx]; }
      nxt.remove(); row.classList.remove('mpt-open'); return;
    }
    row.classList.add('mpt-open');
    var tr = document.createElement('tr');
    tr.className = 'mpt-detail'; tr.setAttribute('data-idx', idx);
    var td = document.createElement('td'); td.colSpan = 3;
    td.innerHTML = '<div class="mpt-detail-in"><div class="mpt-detail-h">' + logoImg(14) + ' ' + esc(MPT.t('citeHistory')) +
      ' · ' + paper.latest.toLocaleString() + ' ' + esc(MPT.t('citations').toLowerCase()) + '</div><canvas></canvas></div>';
    tr.appendChild(td);
    row.parentNode.insertBefore(tr, row.nextSibling);
    charts[idx] = MPT.chart.line(td.querySelector('canvas'), paper.series, 150);
  }

  MPT.inline = {
    clear: closeAll,
    inject: function (model) {
      closeAll();
      var oldIcos = document.querySelectorAll('#gsc_a_b .mpt-inline-ico');
      oldIcos.forEach(function (el) { el.remove(); });
      if (!model || !model.papers.length) return;
      injectCSS();

      var byPub = {}, byTitle = {};
      var norm = MPT.normTitle || function (s) { return String(s || '').toLowerCase(); };
      model.papers.forEach(function (p) {
        if (p.pubId) byPub[p.pubId] = p;
        var nt = norm(p.title);
        if (!byTitle[nt] || p.latest > byTitle[nt].latest) byTitle[nt] = p;
      });

      document.querySelectorAll('#gsc_a_b .gsc_a_tr').forEach(function (row) {
        var info = pubOf(row); if (!info) return;
        var p = (info.pub && byPub[info.pub]) || byTitle[norm(info.title)];
        if (!p || !p.series.length) return;
        var idx = model.papers.indexOf(p);
        var ico = document.createElement('span');
        ico.className = 'mpt-inline-ico';
        ico.innerHTML = logoImg(15);
        ico.title = MPT.t('citeHistory');
        ico.addEventListener('click', function (e) { e.stopPropagation(); e.preventDefault(); toggle(row, p, idx); });
        info.cell.appendChild(ico);
      });
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : self);
