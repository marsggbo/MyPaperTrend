/* MyPaperTrend — donate page. */
MPT.getSettings().then(function (s) {
  MPT.setLangValue(s.lang || MPT.detectLang());
  MPT.applyI18n(document);
});
['wcImg', 'apImg'].forEach(function (id) {
  var img = document.getElementById(id);
  img.addEventListener('error', function () {
    img.style.display = 'none';
    var miss = img.nextElementSibling;
    if (miss) miss.style.display = 'block';
  });
});
