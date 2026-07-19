/* MyPaperTrend — GitHub Device Flow login (no client secret, no backend).
   Runs from an extension page / SW (host_permissions bypass CORS on github.com). */
(function (g) {
  var MPT = (g.MPT = g.MPT || {});
  var A = (MPT.githubAuth = {});

  function form(obj) {
    return Object.keys(obj).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(obj[k]); }).join('&');
  }
  var JSON_HDR = { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' };

  /* 1) ask GitHub for a device + user code */
  A.startDeviceFlow = function (scope) {
    return fetch('https://github.com/login/device/code', {
      method: 'POST', headers: JSON_HDR,
      body: form({ client_id: MPT.GITHUB_CLIENT_ID, scope: scope || MPT.GITHUB_SCOPE })
    }).then(function (r) { return r.json(); });
  };

  /* 2) poll until the user authorizes (or it fails) */
  A.poll = function (deviceCode, interval) {
    var wait = (interval || 5) * 1000;
    return new Promise(function (resolve, reject) {
      function tick() {
        fetch('https://github.com/login/oauth/access_token', {
          method: 'POST', headers: JSON_HDR,
          body: form({ client_id: MPT.GITHUB_CLIENT_ID, device_code: deviceCode, grant_type: 'urn:ietf:params:oauth:grant-type:device_code' })
        }).then(function (r) { return r.json(); }).then(function (j) {
          if (j.access_token) return resolve(j.access_token);
          if (j.error === 'authorization_pending') return void setTimeout(tick, wait);
          if (j.error === 'slow_down') { wait += 5000; return void setTimeout(tick, wait); }
          reject(new Error(j.error_description || j.error || 'device flow failed'));
        }).catch(reject);
      }
      setTimeout(tick, wait);
    });
  };

  A.getLogin = function (token) {
    return fetch('https://api.github.com/user', { headers: { Authorization: 'token ' + token, Accept: 'application/vnd.github+json' } })
      .then(function (r) { return r.json(); }).then(function (u) { return u.login; });
  };

  /* Ensure the signed-in user has a data repo (own it → use it; else fork the template). */
  A.setupRepo = function (token, login) {
    var repo = MPT.DATA_REPO_NAME;
    var hdr = { Authorization: 'token ' + token, Accept: 'application/vnd.github+json' };
    return fetch('https://api.github.com/repos/' + login + '/' + repo, { headers: hdr }).then(function (r) {
      if (r.ok) return { owner: login, repo: repo };
      return fetch('https://api.github.com/repos/' + MPT.DATA_TEMPLATE + '/forks', { method: 'POST', headers: hdr })
        .then(function (fr) {
          if (!fr.ok && fr.status !== 202) throw new Error('fork failed (' + fr.status + ')');
          return { owner: login, repo: repo };
        });
    });
  };

  /* Full flow: onCode({user_code, verification_uri, ...}) shows the code to the user. */
  A.login = function (onCode, scope) {
    return A.startDeviceFlow(scope).then(function (d) {
      if (d.error) throw new Error(d.error_description || d.error);
      onCode(d);
      return A.poll(d.device_code, d.interval).then(function (token) {
        return A.getLogin(token).then(function (login) {
          return A.setupRepo(token, login).then(function (repo) {
            return { token: token, login: login, repo: repo };
          });
        });
      });
    });
  };
})(typeof globalThis !== 'undefined' ? globalThis : self);
