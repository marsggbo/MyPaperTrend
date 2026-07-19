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
  });
}

function renderTracked() {
  MPT.storage.local.listProfiles().then(function (ps) {
    if (!ps.length) { $('trackedList').textContent = T('trackedNone'); return; }
    $('trackedList').innerHTML = '<b>' + T('trackedList') + '</b> ' + ps.map(function (p) { return (p.name || p.id) + ' (' + p.papers + ')'; }).join(', ');
  });
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
  MPT.getSettings().then(function (s) {
    var wasGoogle = s.storage === 'gdrive';
    return (wasGoogle ? MPT.googleAuth.signOut() : Promise.resolve()).then(function () {
      return MPT.patchSettings({ storage: 'local' });
    });
  }).then(function () { $('storage').value = 'local'; toggleBoxes(); refreshAccount(); });
};

$('btnGitHub').onclick = function () {
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
    });
  }).catch(function (e) { $('ghAuthBox').innerHTML = '❌ ' + e.message; })
    .then(function () { $('btnGitHub').disabled = false; });
};

$('btnGoogle').onclick = function () {
  $('btnGoogle').disabled = true;
  $('acctStatus').textContent = 'Opening Google sign-in…';
  MPT.googleAuth.signIn().then(function () {
    return MPT.patchSettings({ storage: 'gdrive' });
  }).then(function () {
    $('storage').value = 'gdrive'; toggleBoxes(); refreshAccount();
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

$('dash').onclick = function () { chrome.tabs.create({ url: chrome.runtime.getURL('src/ui/dashboard.html') }); };
