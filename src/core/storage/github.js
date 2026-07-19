/* MyPaperTrend — GitHub StorageProvider (optional cloud mirror / public dashboard feed).
   Used by the background worker (has host permission for api.github.com). */
(function (g) {
  var MPT = (g.MPT = g.MPT || {});
  MPT.storage = MPT.storage || {};

  function b64encodeUtf8(str) { return btoa(unescape(encodeURIComponent(str))); }
  function b64decodeUtf8(b64) { return decodeURIComponent(escape(atob(b64.replace(/\n/g, '')))); }

  MPT.storage.makeGithub = function (cfg) {
    var base = 'https://api.github.com/repos/' + cfg.owner + '/' + cfg.repo +
      '/contents/' + cfg.path.split('/').map(encodeURIComponent).join('/');
    var branch = cfg.branch || 'main';
    var headers = {
      'Authorization': 'token ' + cfg.token,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };

    function getFile() {
      return fetch(base + '?ref=' + encodeURIComponent(branch), { headers: headers }).then(function (r) {
        if (r.status === 404) return null;
        if (!r.ok) throw new Error('GitHub GET ' + r.status);
        return r.json();
      });
    }

    return {
      id: 'github',
      load: function () {
        return getFile().then(function (f) {
          if (!f || !f.content) return null;
          return MPT.migrate(JSON.parse(b64decodeUtf8(f.content)));
        });
      },
      save: function (doc) {
        return getFile().then(function (f) {
          var body = {
            message: 'Update citations ' + (doc.updated || ''),
            content: b64encodeUtf8(JSON.stringify(doc, null, 2)),
            branch: branch
          };
          if (f && f.sha) body.sha = f.sha;
          return fetch(base, { method: 'PUT', headers: headers, body: JSON.stringify(body) }).then(function (r) {
            if (!r.ok) return r.text().then(function (t) { throw new Error('GitHub PUT ' + r.status + ': ' + t); });
          });
        });
      },
      exportJSON: function () { return this.load().then(function (d) { return JSON.stringify(d || MPT.emptyDoc(), null, 2); }); },
      importJSON: function (text) { return this.save(MPT.migrate(JSON.parse(text))); }
    };
  };
})(typeof globalThis !== 'undefined' ? globalThis : self);
