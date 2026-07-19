/* MyPaperTrend — settings page logic. */
var $ = function (id) { return document.getElementById(id); };

function toggleBoxes() {
  $('ghBox').classList.toggle('hidden', $('storage').value !== 'github');
  $('scraperBox').classList.toggle('hidden', $('fetch').value !== 'scraperapi');
  $('serpBox').classList.toggle('hidden', $('fetch').value !== 'serpapi');
}

MPT.getSettings().then(function (s) {
  $('primaryId').value = s.primaryScholarId || '';
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

$('storage').onchange = toggleBoxes;
$('fetch').onchange = toggleBoxes;

$('save').onclick = function () {
  var s = {
    primaryScholarId: $('primaryId').value.trim(),
    storage: $('storage').value,
    github: {
      owner: $('ghOwner').value.trim(), repo: $('ghRepo').value.trim(),
      path: ($('ghPath').value.trim() || 'citations.json'),
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
  MPT.saveSettings(s).then(function () {
    var el = $('saved'); el.classList.add('show');
    setTimeout(function () { el.classList.remove('show'); }, 1500);
  });
};

$('dash').onclick = function () { chrome.tabs.create({ url: chrome.runtime.getURL('src/ui/dashboard.html') }); };
