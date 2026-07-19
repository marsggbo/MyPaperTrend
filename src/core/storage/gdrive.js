/* MyPaperTrend — Google Drive StorageProvider.
   All files live in a dedicated "MyPaperTrend" folder, one JSON per scholar. drive.file scope. */
(function (g) {
  var MPT = (g.MPT = g.MPT || {});
  MPT.storage = MPT.storage || {};
  var DRIVE = 'https://www.googleapis.com/drive/v3';
  var UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
  var BOUNDARY = 'mpt-boundary-6f2a';
  var FOLDER = 'MyPaperTrend';
  var folderCache = null;

  function fileName(id) { return 'mypapertrend-' + id + '.json'; }

  /* Resolve JSON, or throw with the API's error body (so 403 "API not enabled" is visible). */
  function okJson(r, label) {
    if (r.ok) return r.json();
    return r.text().then(function (t) {
      var msg = t;
      try { msg = (JSON.parse(t).error || {}).message || t; } catch (e) {}
      if (r.status === 403 && /has not been used|is disabled|accessNotConfigured/i.test(t)) {
        msg = 'Google Drive API is not enabled for this project. Enable it at console.cloud.google.com → APIs & Services → Library → Google Drive API.';
      }
      throw new Error(label + ' ' + r.status + ': ' + String(msg).slice(0, 220));
    });
  }

  function ensureFolder(H) {
    if (folderCache) return Promise.resolve(folderCache);
    var q = "name='" + FOLDER + "' and mimeType='application/vnd.google-apps.folder' and trashed=false";
    return fetch(DRIVE + '/files?spaces=drive&fields=' + encodeURIComponent('files(id,name)') + '&q=' + encodeURIComponent(q), { headers: H })
      .then(function (r) { return okJson(r, 'Drive folder list'); })
      .then(function (j) {
        if (j.files && j.files[0]) { folderCache = j.files[0].id; return folderCache; }
        return fetch(DRIVE + '/files', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, H), body: JSON.stringify({ name: FOLDER, mimeType: 'application/vnd.google-apps.folder' }) })
          .then(function (r) { return okJson(r, 'Drive folder create'); })
          .then(function (f) { folderCache = f.id; return folderCache; });
      });
  }

  /* List scholar ids that have a file in the MyPaperTrend folder. */
  MPT.storage.gdriveListIds = function (token) {
    var H = { Authorization: 'Bearer ' + token };
    return ensureFolder(H).then(function (folderId) {
      var q = "'" + folderId + "' in parents and trashed=false and name contains 'mypapertrend-'";
      return fetch(DRIVE + '/files?spaces=drive&fields=' + encodeURIComponent('files(id,name)') + '&q=' + encodeURIComponent(q), { headers: H })
        .then(function (r) { if (!r.ok) throw new Error('Drive list ' + r.status); return r.json(); })
        .then(function (j) {
          return (j.files || []).map(function (f) { var m = /^mypapertrend-(.+)\.json$/.exec(f.name); return m ? m[1] : null; }).filter(Boolean);
        });
    });
  };

  MPT.storage.makeGdrive = function (token, id) {
    var name = fileName(id);
    var H = { Authorization: 'Bearer ' + token };
    var JH = Object.assign({ 'Content-Type': 'application/json' }, H);

    function find(folderId) {
      var q = "name='" + name + "' and '" + folderId + "' in parents and trashed=false";
      return fetch(DRIVE + '/files?spaces=drive&fields=' + encodeURIComponent('files(id,name)') + '&q=' + encodeURIComponent(q), { headers: H })
        .then(function (r) { if (!r.ok) throw new Error('Drive list ' + r.status); return r.json(); })
        .then(function (j) { return (j.files && j.files[0]) || null; });
    }
    function chk(r) { if (!r.ok) return r.text().then(function (t) { throw new Error('Drive save ' + r.status + ': ' + t); }); }

    return {
      id: 'gdrive',
      load: function () {
        return ensureFolder(H).then(find).then(function (f) {
          if (!f) return null;
          return fetch(DRIVE + '/files/' + f.id + '?alt=media', { headers: H })
            .then(function (r) { if (!r.ok) throw new Error('Drive get ' + r.status); return r.json(); })
            .then(function (d) { return MPT.migrate(d); });
        });
      },
      save: function (doc) {
        var body = JSON.stringify(doc, null, 2);
        return ensureFolder(H).then(function (folderId) {
          return find(folderId).then(function (f) {
            if (f) {
              return fetch(UPLOAD + '/files/' + f.id + '?uploadType=media', { method: 'PATCH', headers: JH, body: body }).then(chk);
            }
            var meta = JSON.stringify({ name: name, parents: [folderId] });
            var multipart = '--' + BOUNDARY + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + meta +
              '\r\n--' + BOUNDARY + '\r\nContent-Type: application/json\r\n\r\n' + body + '\r\n--' + BOUNDARY + '--';
            return fetch(UPLOAD + '/files?uploadType=multipart', {
              method: 'POST', headers: Object.assign({ 'Content-Type': 'multipart/related; boundary=' + BOUNDARY }, H), body: multipart
            }).then(chk);
          });
        });
      },
      exportJSON: function () { return this.load().then(function (d) { return JSON.stringify(d || MPT.emptyDoc(), null, 2); }); },
      importJSON: function (text) { return this.save(MPT.migrate(JSON.parse(text))); }
    };
  };
})(typeof globalThis !== 'undefined' ? globalThis : self);
