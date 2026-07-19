/* MyPaperTrend — settings page logic. */
var $ = function (id) { return document.getElementById(id); };

function toggleBoxes() {
  $('ghBox').classList.toggle('hidden', $('storage').value !== 'github');
  $('scraperBox').classList.toggle('hidden', $('fetch').value !== 'scraperapi');
  $('serpBox').classList.toggle('hidden', $('fetch').value !== 'serpapi');
}

MPT.getSettings().then(function (s) {
  $('autoUpdate').checked = !!s.autoUpdate;
  $('autoTime').value = s.autoUpdateTime || '03:00';
  $('storage').value = s.storage;
  $('ghOwner').value = s.github.owner;
  $('ghRepo').value = s.github.repo;
  $('ghPath').value = s.github.path || 'citations.json';
  $('ghBranch').value = s.github.branch || 'main';
  $('ghToken').value = s.github.token;
  $('fetch').value = s.fetch.provider;
  $('scraperKey').value = s.fetch.scraperapi_key;
  $('serpKey').value = s.fetch.serpapi_key;
  $('enrich').checked = !!s.enrich;
  toggleBoxes();
});

// show which scholars are currently tracked
MPT.storage.local.listProfiles().then(function (ps) {
  if (!ps.length) { $('trackedList').textContent = 'No scholars tracked yet — open a Scholar profile and flip the Track switch.'; return; }
  $('trackedList').innerHTML = '<b>Tracked scholars:</b> ' + ps.map(function (p) {
    return (p.name || p.id) + ' (' + p.papers + ')';
  }).join(', ');
});

$('storage').onchange = toggleBoxes;
$('fetch').onchange = toggleBoxes;

$('save').onclick = function () {
  var s = {
    autoUpdate: $('autoUpdate').checked,
    autoUpdateTime: $('autoTime').value || '03:00',
    storage: $('storage').value,
    github: {
      owner: $('ghOwner').value.trim(), repo: $('ghRepo').value.trim(),
      path: ($('ghPath').value.trim() || 'citations-{id}.json'),
      branch: ($('ghBranch').value.trim() || 'main'),
      token: $('ghToken').value.trim()
    },
    fetch: {
      provider: $('fetch').value,
      scraperapi_key: $('scraperKey').value.trim(),
      serpapi_key: $('serpKey').value.trim()
    },
    enrich: $('enrich').checked,
    onboarded: true
  };
  // patch (not overwrite) so trackedIds / activeProfileId are preserved
  MPT.patchSettings(s).then(function () {
    var el = $('saved'); el.classList.add('show');
    setTimeout(function () { el.classList.remove('show'); }, 1500);
  });
};

$('dash').onclick = function () { chrome.tabs.create({ url: chrome.runtime.getURL('src/ui/dashboard.html') }); };

/* ── GitHub sign-in (Device Flow) ── */
function refreshAccount() {
  MPT.getSettings().then(function (s) {
    var signedIn = s.storage === 'github' && s.github.token && s.github.owner;
    $('ghStatus').textContent = signedIn ? ('✓ Signed in — syncing to ' + s.github.owner + '/' + s.github.repo) : 'Not signed in (data stays local).';
    $('ghLogout').style.display = signedIn ? '' : 'none';
    $('ghLogin').textContent = signedIn ? '🔄 Re-authorize GitHub' : '🔓 Sign in with GitHub';
  });
}
refreshAccount();

$('ghLogin').onclick = function () {
  $('ghLogin').disabled = true;
  $('ghAuthBox').style.display = '';
  $('ghAuthBox').innerHTML = 'Starting…';
  MPT.githubAuth.login(function (code) {
    $('ghAuthBox').innerHTML =
      '1. Open <a href="' + code.verification_uri + '" target="_blank"><b>' + code.verification_uri + '</b></a><br>' +
      '2. Enter this code: <b style="font-size:1.2em;letter-spacing:2px">' + code.user_code + '</b><br>' +
      '<span style="color:var(--muted)">Waiting for you to authorize… (this box updates automatically)</span>';
  }).then(function (res) {
    return MPT.getSettings().then(function (s) {
      var gh = Object.assign({}, s.github, { token: res.token, owner: res.repo.owner, repo: res.repo.repo, path: 'citations-{id}.json', branch: 'main' });
      return MPT.patchSettings({ storage: 'github', github: gh });
    }).then(function () {
      $('ghAuthBox').innerHTML = '✅ Signed in as <b>' + res.login + '</b>. Cloud sync is on — history will be pushed to <b>' + res.repo.owner + '/' + res.repo.repo + '</b>.';
      $('storage').value = 'github';
      $('ghOwner').value = res.repo.owner; $('ghRepo').value = res.repo.repo;
      $('ghPath').value = 'citations-{id}.json'; $('ghBranch').value = 'main'; $('ghToken').value = res.token;
      toggleBoxes(); refreshAccount();
    });
  }).catch(function (e) {
    $('ghAuthBox').innerHTML = '❌ ' + e.message;
  }).then(function () { $('ghLogin').disabled = false; });
};

$('ghLogout').onclick = function () {
  MPT.getSettings().then(function (s) {
    var gh = Object.assign({}, s.github, { token: '' });
    return MPT.patchSettings({ storage: 'local', github: gh });
  }).then(function () {
    $('ghToken').value = ''; $('storage').value = 'local'; toggleBoxes();
    $('ghAuthBox').style.display = 'none'; refreshAccount();
  });
};
