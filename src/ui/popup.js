/* MyPaperTrend — popup logic. */
function fmt(n) { return (n >= 0 ? '+' : '') + n; }

function openPage(page) { chrome.tabs.create({ url: chrome.runtime.getURL(page) }); }

MPT.storage.local.load().then(function (doc) {
  var sub = document.getElementById('sub');
  var stats = document.getElementById('stats');
  if (!doc || !Object.keys(doc.papers || {}).length) {
    sub.textContent = 'No data yet';
    stats.innerHTML = '<div class="empty">Open your <a href="https://scholar.google.com/citations" target="_blank">Google Scholar profile</a> once and the trend panel will start recording your citations here.</div>';
    return;
  }
  var m = MPT.buildRenderModel(doc);
  var total = m.totals[m.totals.length - 1] || 0;
  var todayNew = m.totalDeltas[m.totalDeltas.length - 1] || 0;
  sub.textContent = (m.profile.name ? m.profile.name + ' · ' : '') + 'updated ' + (m.updated || '—');
  stats.className = '';
  stats.innerHTML =
    '<div class="grid">' +
    '<div class="tile"><div class="n">' + total.toLocaleString() + '</div><div class="l">total citations</div></div>' +
    '<div class="tile"><div class="n ' + (todayNew > 0 ? 'up' : todayNew < 0 ? 'down' : '') + '">' + fmt(todayNew) + '</div><div class="l">latest change</div></div>' +
    '<div class="tile"><div class="n">' + m.papers.length + '</div><div class="l">papers</div></div>' +
    '<div class="tile"><div class="n">' + m.dates.length + '</div><div class="l">days tracked</div></div>' +
    '</div>';
});

document.getElementById('dash').onclick = function () { openPage('src/ui/dashboard.html'); };
document.getElementById('settings').onclick = function () { openPage('src/ui/options.html'); };
document.getElementById('scholar').onclick = function () {
  MPT.storage.local.load().then(function (doc) {
    var id = doc && doc.profile && doc.profile.scholar_id;
    chrome.tabs.create({ url: id ? 'https://scholar.google.com/citations?user=' + id : 'https://scholar.google.com/citations' });
  });
};
document.getElementById('export').onclick = function () {
  MPT.storage.local.exportJSON().then(function (txt) {
    var blob = new Blob([txt], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'mypapertrend-export.json';
    document.body.appendChild(a); a.click(); a.remove();
  });
};
document.getElementById('import').onclick = function () { document.getElementById('file').click(); };
document.getElementById('file').onchange = function (e) {
  var f = e.target.files[0]; if (!f) return;
  f.text().then(function (txt) {
    return MPT.storage.local.importJSON(txt);
  }).then(function () { location.reload(); })
    .catch(function (err) { alert('Import failed: ' + err.message); });
};
