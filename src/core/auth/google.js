/* MyPaperTrend — Google sign-in via chrome.identity (Drive access). */
(function (g) {
  var MPT = (g.MPT = g.MPT || {});
  var A = (MPT.googleAuth = {});

  /* Get an OAuth token. interactive=true prompts consent (needs a user gesture). */
  A.getToken = function (interactive) {
    return new Promise(function (resolve, reject) {
      if (!g.chrome || !chrome.identity) return reject(new Error('chrome.identity unavailable'));
      chrome.identity.getAuthToken({ interactive: !!interactive }, function (token) {
        if (chrome.runtime.lastError || !token) {
          return reject(new Error((chrome.runtime.lastError && chrome.runtime.lastError.message) || 'no token'));
        }
        resolve(token);
      });
    });
  };

  A.signIn = function () { return A.getToken(true); };

  /* Drop the cached token (and best-effort revoke). */
  A.signOut = function () {
    return A.getToken(false).then(function (token) {
      return new Promise(function (resolve) {
        chrome.identity.removeCachedAuthToken({ token: token }, function () {
          fetch('https://accounts.google.com/o/oauth2/revoke?token=' + token).catch(function () {}).then(resolve, resolve);
        });
      });
    }).catch(function () {});
  };

  /* Fetch that refreshes the token once on 401. */
  A.authedFetch = function (url, opts) {
    return A.getToken(false).then(function (token) {
      opts = opts || {}; opts.headers = Object.assign({}, opts.headers, { Authorization: 'Bearer ' + token });
      return fetch(url, opts).then(function (r) {
        if (r.status !== 401) return r;
        return new Promise(function (res) { chrome.identity.removeCachedAuthToken({ token: token }, res); })
          .then(function () { return A.getToken(true); })
          .then(function (t2) { opts.headers.Authorization = 'Bearer ' + t2; return fetch(url, opts); });
      });
    });
  };
})(typeof globalThis !== 'undefined' ? globalThis : self);
