/* MyPaperTrend — GitHub StorageProvider (optional cloud mirror / public dashboard feed).
   Used by the background worker (has host permission for api.github.com). */
(function (g) {
  var MPT = (g.MPT = g.MPT || {});
  MPT.storage = MPT.storage || {};

  function b64encodeUtf8(str) { return btoa(unescape(encodeURIComponent(str))); }
  function b64decodeUtf8(b64) { return decodeURIComponent(escape(atob(b64.replace(/\n/g, '')))); }
  function ghMsg(t) { try { return JSON.parse(t).message || t; } catch (e) { return t; } }

  /* List scholar ids present in the repo (parsed from filenames matching the path template). */
  MPT.storage.githubListIds = function (cfg) {
    var tmpl = cfg.path || 'citations-{id}.json';
    var slash = tmpl.lastIndexOf('/');
    var dir = slash >= 0 ? tmpl.slice(0, slash) : '';
    var fn = slash >= 0 ? tmpl.slice(slash + 1) : tmpl;
    var esc = fn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace('\\{id\\}', '(.+)');
    var re = new RegExp('^' + esc + '$');
    var base = 'https://api.github.com/repos/' + cfg.owner + '/' + cfg.repo + '/contents/' +
      (dir ? dir.split('/').map(encodeURIComponent).join('/') : '');
    var headers = { 'Authorization': 'token ' + cfg.token, 'Accept': 'application/vnd.github+json' };
    return fetch(base + '?ref=' + encodeURIComponent(cfg.branch || 'main'), { headers: headers }).then(function (r) {
      if (r.status === 404) return [];
      if (!r.ok) throw new Error('GitHub list ' + r.status);
      return r.json();
    }).then(function (arr) {
      if (!Array.isArray(arr)) return [];
      return arr.filter(function (x) { return x.type === 'file'; })
        .map(function (x) { var m = re.exec(x.name); return m ? m[1] : null; }).filter(Boolean);
    });
  };

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
        if (!r.ok) return r.text().then(function (t) { throw new Error('GitHub GET ' + r.status + ': ' + ghMsg(t)); });
        return r.json();
      });
    }

    return {
      id: 'github',
      load: function () {
        return getFile().then(function (f) {
          if (!f || !f.content) return null;
          try { return MPT.migrate(JSON.parse(b64decodeUtf8(f.content))); }
          catch (e) { console.warn('[MyPaperTrend] github: unparseable remote, treating as empty'); return null; }
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
            if (!r.ok) return r.text().then(function (t) { throw new Error('GitHub PUT ' + r.status + ': ' + ghMsg(t)); });
          });
        });
      },
      exportJSON: function () { return this.load().then(function (d) { return JSON.stringify(d || MPT.emptyDoc(), null, 2); }); },
      importJSON: function (text) { return this.save(MPT.migrate(JSON.parse(text))); }
    };
  };
})(typeof globalThis !== 'undefined' ? globalThis : self);
