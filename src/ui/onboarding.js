/* MyPaperTrend — onboarding logic. */
function apply() {
  MPT.applyI18n(document);
  document.querySelectorAll('.lang span').forEach(function (el) {
    el.classList.toggle('on', el.getAttribute('data-lang') === MPT.getLang());
  });
}

MPT.getSettings().then(function (s) { MPT.setLangValue(s.lang || MPT.detectLang()); apply(); });

document.querySelectorAll('.lang span').forEach(function (el) {
  el.onclick = function () {
    var l = el.getAttribute('data-lang');
    MPT.setLangValue(l);
    MPT.patchSettings({ lang: l });
    apply();
  };
});

function finish(openOptions) {
  MPT.patchSettings({ onboarded: true }).then(function () {
    if (openOptions) { location.href = 'options.html'; }
    else { chrome.tabs.getCurrent(function (t) { if (t) chrome.tabs.remove(t.id); else window.close(); }); }
  });
}
document.getElementById('start').onclick = function () { finish(false); };
document.getElementById('advanced').onclick = function () { finish(true); };
