/* MyPaperTrend — onboarding logic. */
function finish(openOptions) {
  MPT.getSettings().then(function (s) { s.onboarded = true; return MPT.saveSettings(s); }).then(function () {
    if (openOptions) { location.href = 'options.html'; }
    else { chrome.tabs.getCurrent(function (t) { if (t) chrome.tabs.remove(t.id); else window.close(); }); }
  });
}
document.getElementById('start').onclick = function () { finish(false); };
document.getElementById('advanced').onclick = function () { finish(true); };
