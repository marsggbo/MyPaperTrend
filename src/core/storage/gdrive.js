/* MyPaperTrend — Google Drive StorageProvider.
   All files live in a dedicated "MyPaperTrend" folder, one JSON per scholar. drive.file scope. */
(function (g) {
  var MPT = (g.MPT = g.MPT || {});
  MPT.storage = MPT.storage || {};
  var DRIVE = 'https://www.googleapis.com/drive/v3';
  var UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
  var BOUNDARY = 'mpt-boundary-6f2a';
  var FOLDER = 'MyPaperTrend';
  var folderCache = null;   // per-context cache of the folder id

  /* token: valid OAuth access token. id: scholar id → filename. */
  MPT.storage.makeGdrive = function (token, id) {
    var name = 'mypapertrend-' + id + '.json';
    var H = { Authorization: 'Bearer ' + token };
    var JH = Object.assign({ 'Content-Type': 'application/json' }, H);

    function ensureFolder() {
      if (folderCache) return Promise.resolve(folderCache);
      var q = "name='" + FOLDER + "' and mimeType='application/vnd.google-apps.folder' and trashed=false";
      return fetch(DRIVE + '/files?spaces=drive&fields=' + encodeURIComponent('files(id,name)') + '&q=' + encodeURIComponent(q), { headers: H })
        .then(function (r) { if (!r.ok) throw new Error('Drive folder list ' + r.status); return r.json(); })
        .then(function (j) {
          if (j.files && j.files[0]) { folderCache = j.files[0].id; return folderCache; }
          return fetch(DRIVE + '/files', { method: 'POST', headers: JH, body: JSON.stringify({ name: FOLDER, mimeType: 'application/vnd.google-apps.folder' }) })
            .then(function (r) { if (!r.ok) throw new Error('Drive folder create ' + r.status); return r.json(); })
            .then(function (f) { folderCache = f.id; return folderCache; });
        });
    }

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
        return ensureFolder().then(find).then(function (f) {
          if (!f) return null;
          return fetch(DRIVE + '/files/' + f.id + '?alt=media', { headers: H })
            .then(function (r) { if (!r.ok) throw new Error('Drive get ' + r.status); return r.json(); })
            .then(function (d) { return MPT.migrate(d); });
        });
      },
      save: function (doc) {
        var body = JSON.stringify(doc, null, 2);
        return ensureFolder().then(function (folderId) {
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
