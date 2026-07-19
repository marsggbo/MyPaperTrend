/* MyPaperTrend — settings page logic. */
var $ = function (id) { return document.getElementById(id); };
function T(k, v) { return MPT.t(k, v); }

function toggleBoxes() {
  $('ghBox').classList.toggle('hidden', $('storage').value !== 'github');
  $('scraperBox').classList.toggle('hidden', $('fetch').value !== 'scraperapi');
  $('serpBox').classList.toggle('hidden', $('fetch').value !== 'serpapi');
}

function applyLang() {
  MPT.applyI18n(document);
  refreshAccount();
  renderTracked();
}

/* highlight the active storage button + status line */
function refreshAccount() {
  MPT.getSettings().then(function (s) {
    ['btnLocal', 'btnGitHub', 'btnGoogle'].forEach(function (id) {
      $(id).classList.toggle('active', $(id).getAttribute('data-storage') === s.storage);
    });
    var st = T('notSignedIn'), where = '';
    if (s.storage === 'github' && s.github.owner) {
      st = T('syncedGh', { repo: s.github.owner + '/' + s.github.repo });
      where = T('whereGh', { repo: s.github.owner + '/' + s.github.repo });
    } else if (s.storage === 'gdrive') {
      st = T('syncedGg'); where = T('whereGg');
    }
    $('acctStatus').textContent = st;
    $('acctWhere').textContent = where;
    var cloud = s.storage !== 'local';
    $('btnSync').style.display = cloud ? '' : 'none';
    $('syncHint').textContent = cloud ? T('syncHint') : '';
    if (s.storage !== 'github') { $('ghAuthBox').style.display = 'none'; }
  });
}

function doSyncAll() {
  $('syncStatus').textContent = T('syncing');
  return new Promise(function (res) {
    chrome.runtime.sendMessage({ type: 'SYNC_ALL' }, function (resp) {
      $('syncStatus').textContent = (resp && resp.ok) ? T('syncedCount', { n: resp.count }) : ('❌ ' + (resp && resp.error || 'sync failed'));
      renderTracked(); refreshAccount(); res();
    });
  });
}

function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function parseScholarId(s) {
  s = (s || '').trim();
  var m = /[?&]user=([^&]+)/.exec(s);
  if (m) return m[1];
  return /^[A-Za-z0-9_-]{8,}$/.test(s) ? s : '';
}

var trackedSort = { key: 'name', dir: 1 };

function renderTracked() {
  Promise.all([MPT.getSettings(), MPT.storage.local.listProfiles()]).then(function (r) {
    var s = r[0], byId = {};
    r[1].forEach(function (p) { byId[p.id] = p; });
    var rows = s.trackedIds.map(function (id) {
      var p = byId[id];
      return { id: id, name: (p && p.name) || id, papers: (p && p.papers) || 0, updated: (p && p.updated) || '', captured: !!p };
    });
    var k = trackedSort.key, dir = trackedSort.dir;
    rows.sort(function (a, b) {
      if (k === 'papers') return (a.papers - b.papers) * dir;
      return String(a[k]).localeCompare(String(b[k])) * dir;
    });

    var wrap = $('trackedWrap');
    if (!rows.length) { wrap.innerHTML = '<div class="tt-empty">' + T('trackedNone') + '</div>'; return; }

    function th(key, label, num) {
      var cls = (key === trackedSort.key ? 'sorted' + (trackedSort.dir < 0 ? ' asc' : '') : '') + (num ? ' num' : '');
      return '<th data-key="' + key + '" class="' + cls + '">' + label + '</th>';
    }
    var html = '<table class="tt"><thead><tr>' +
      th('name', T('thScholar')) + th('papers', T('thPapers'), true) + th('updated', T('thUpdated')) + '<th></th></tr></thead><tbody>';
    rows.forEach(function (row) {
      html += '<tr>' +
        '<td><a href="https://scholar.google.com/citations?user=' + encodeURIComponent(row.id) + '" target="_blank" rel="noopener">' + esc(row.name) + '</a></td>' +
        '<td class="num">' + (row.captured ? row.papers : '<span style="color:var(--muted)">' + T('notCaptured') + '</span>') + '</td>' +
        '<td>' + (row.updated || '—') + '</td>' +
        '<td class="act">' + (row.captured ? '' : '<button class="cap" data-id="' + esc(row.id) + '">' + T('capture') + '</button> ') +
          '<button class="rm" data-id="' + esc(row.id) + '" data-name="' + esc(row.name) + '" title="' + T('removeConfirm', { name: esc(row.name) }) + '">✕</button></td>' +
      '</tr>';
    });
    html += '</tbody></table>';
    wrap.innerHTML = html;

    wrap.querySelectorAll('th[data-key]').forEach(function (el) {
      el.onclick = function () {
        var key = el.getAttribute('data-key');
        if (trackedSort.key === key) trackedSort.dir *= -1; else { trackedSort.key = key; trackedSort.dir = 1; }
        renderTracked();
      };
    });
    wrap.querySelectorAll('.rm').forEach(function (b) {
      b.onclick = function () { removeScholar(b.getAttribute('data-id'), b.getAttribute('data-name')); };
    });
    wrap.querySelectorAll('.cap').forEach(function (b) {
      b.onclick = function () { captureNow(b.getAttribute('data-id'), b); };
    });
  });
}

function removeScholar(id, name) {
  if (!confirm(T('removeConfirm', { name: name }))) return;
  MPT.setTracked(id, false)
    .then(function () { return MPT.storage.local.removeFor(id); })
    .then(renderTracked);
}
function captureNow(id, btn) {
  if (btn) { btn.disabled = true; btn.textContent = '…'; }
  chrome.runtime.sendMessage({ type: 'CAPTURE_NOW', scholarId: id }, function () { renderTracked(); });
}

/* ── load ── */
MPT.getSettings().then(function (s) {
  MPT.setLangValue(s.lang || MPT.detectLang());
  $('langSel').value = s.lang || '';
  $('storage').value = s.storage;
  $('ghOwner').value = s.github.owner; $('ghRepo').value = s.github.repo;
  $('ghPath').value = s.github.path || 'citations-{id}.json'; $('ghBranch').value = s.github.branch || 'main'; $('ghToken').value = s.github.token;
  $('fetch').value = s.fetch.provider;
  $('scraperKey').value = s.fetch.scraperapi_key; $('serpKey').value = s.fetch.serpapi_key;
  $('enrich').checked = !!s.enrich;
  $('autoUpdate').checked = !!s.autoUpdate;
  $('autoTime').value = s.autoUpdateTime || '03:00';
  toggleBoxes();
  applyLang();
});

$('langSel').onchange = function () {
  MPT.setLangValue($('langSel').value);
  MPT.patchSettings({ lang: $('langSel').value }).then(applyLang);
};
$('fetch').onchange = toggleBoxes;

/* ── account buttons ── */
$('btnLocal').onclick = function () {
  $('ghAuthBox').style.display = 'none'; $('ghAuthBox').innerHTML = ''; $('syncStatus').textContent = '';
  MPT.getSettings().then(function (s) {
    var wasGoogle = s.storage === 'gdrive';
    return (wasGoogle ? MPT.googleAuth.signOut() : Promise.resolve()).then(function () {
      return MPT.patchSettings({ storage: 'local' });
    });
  }).then(function () { $('storage').value = 'local'; toggleBoxes(); refreshAccount(); });
};

$('btnSync').onclick = function () { doSyncAll(); };

$('btnGitHub').onclick = function () {
  $('syncStatus').textContent = '';
  $('btnGitHub').disabled = true;
  $('ghAuthBox').style.display = ''; $('ghAuthBox').textContent = 'Starting…';
  MPT.githubAuth.login(function (code) {
    $('ghAuthBox').innerHTML =
      '1. ' + '<a href="' + code.verification_uri + '" target="_blank"><b>' + code.verification_uri + '</b></a><br>' +
      '2. Code: <b style="font-size:1.2em;letter-spacing:2px">' + code.user_code + '</b><br>' +
      '<span style="color:var(--muted)">Waiting for authorization…</span>';
  }).then(function (res) {
    return MPT.getSettings().then(function (s) {
      var gh = Object.assign({}, s.github, { token: res.token, owner: res.repo.owner, repo: res.repo.repo, path: 'citations-{id}.json', branch: 'main' });
      return MPT.patchSettings({ storage: 'github', github: gh });
    }).then(function () {
      $('ghAuthBox').innerHTML = '✅ ' + res.login + ' → ' + res.repo.owner + '/' + res.repo.repo;
      $('storage').value = 'github'; $('ghOwner').value = res.repo.owner; $('ghRepo').value = res.repo.repo;
      $('ghPath').value = 'citations-{id}.json'; $('ghBranch').value = 'main'; $('ghToken').value = res.token;
      toggleBoxes(); refreshAccount();
      return doSyncAll();   // create/pull cloud files right away
    });
  }).catch(function (e) { $('ghAuthBox').innerHTML = '❌ ' + e.message; })
    .then(function () { $('btnGitHub').disabled = false; });
};

$('btnGoogle').onclick = function () {
  $('ghAuthBox').style.display = 'none'; $('ghAuthBox').innerHTML = '';
  $('btnGoogle').disabled = true;
  $('acctStatus').textContent = 'Opening Google sign-in…';
  MPT.googleAuth.signIn().then(function () {
    return MPT.patchSettings({ storage: 'gdrive' });
  }).then(function () {
    $('storage').value = 'gdrive'; toggleBoxes(); refreshAccount();
    return doSyncAll();   // creates the MyPaperTrend Drive folder + files now
  }).catch(function (e) { $('acctStatus').textContent = '❌ ' + e.message; })
    .then(function () { $('btnGoogle').disabled = false; });
};

/* ── save ── */
$('save').onclick = function () {
  var patch = {
    storage: $('storage').value,
    github: { owner: $('ghOwner').value.trim(), repo: $('ghRepo').value.trim(), path: ($('ghPath').value.trim() || 'citations-{id}.json'), branch: ($('ghBranch').value.trim() || 'main'), token: $('ghToken').value.trim() },
    fetch: { provider: $('fetch').value, scraperapi_key: $('scraperKey').value.trim(), serpapi_key: $('serpKey').value.trim() },
    enrich: $('enrich').checked,
    autoUpdate: $('autoUpdate').checked,
    autoUpdateTime: $('autoTime').value || '03:00',
    onboarded: true
  };
  MPT.patchSettings(patch).then(function () {
    var el = $('saved'); el.classList.add('show'); setTimeout(function () { el.classList.remove('show'); }, 1500);
  });
};

$('btnAddScholar').onclick = function () {
  var id = parseScholarId($('addScholar').value);
  if (!id) { alert(T('addInvalid')); return; }
  MPT.setTracked(id, true).then(function () {
    $('addScholar').value = '';
    renderTracked();
    chrome.runtime.sendMessage({ type: 'CAPTURE_NOW', scholarId: id }, function () { renderTracked(); });
  });
};
$('addScholar').onkeydown = function (e) { if (e.key === 'Enter') $('btnAddScholar').click(); };

$('dash').onclick = function () { chrome.tabs.create({ url: chrome.runtime.getURL('src/ui/dashboard.html') }); };
