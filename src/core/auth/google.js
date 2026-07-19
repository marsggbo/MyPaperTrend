/* MyPaperTrend — Google sign-in.
   Chrome: chrome.identity.getAuthToken (auto-refresh).
   Edge / other Chromium: falls back to launchWebAuthFlow (needs a Web OAuth client). */
(function (g) {
  var MPT = (g.MPT = g.MPT || {});
  var A = (MPT.googleAuth = {});
  var SCOPE = 'https://www.googleapis.com/auth/drive.file';
  var TOKEN_KEY = 'mpt_gtoken';

  /* ---- path A: chrome.identity.getAuthToken (Chrome only) ---- */
  function chromeToken(interactive) {
    return new Promise(function (resolve, reject) {
      if (!(g.chrome && chrome.identity && chrome.identity.getAuthToken)) return reject(new Error('no getAuthToken'));
      try {
        chrome.identity.getAuthToken({ interactive: !!interactive }, function (t) {
          if (chrome.runtime.lastError || !t) return reject(new Error((chrome.runtime.lastError && chrome.runtime.lastError.message) || 'no token'));
          resolve(t);
        });
      } catch (e) { reject(e); }
    });
  }

  /* ---- path B: launchWebAuthFlow implicit token (Edge & co.) ---- */
  function storedToken() {
    return chrome.storage.local.get(TOKEN_KEY).then(function (o) {
      var tk = o[TOKEN_KEY];
      return (tk && tk.expiry > Date.now() + 60000) ? tk.token : null;
    });
  }
  function webToken(interactive) {
    return storedToken().then(function (valid) {
      if (valid) return valid;
      if (!interactive) throw new Error('Google token expired — sign in again.');
      if (!MPT.GOOGLE_WEB_CLIENT_ID) throw new Error('This browser needs a Google "Web application" OAuth client. Ask the developer to set GOOGLE_WEB_CLIENT_ID.');
      var redirect = chrome.identity.getRedirectURL();
      var url = 'https://accounts.google.com/o/oauth2/v2/auth' +
        '?client_id=' + encodeURIComponent(MPT.GOOGLE_WEB_CLIENT_ID) +
        '&response_type=token' +
        '&redirect_uri=' + encodeURIComponent(redirect) +
        '&scope=' + encodeURIComponent(SCOPE) +
        '&prompt=consent';
      return new Promise(function (resolve, reject) {
        chrome.identity.launchWebAuthFlow({ url: url, interactive: true }, function (redir) {
          if (chrome.runtime.lastError || !redir) return reject(new Error((chrome.runtime.lastError && chrome.runtime.lastError.message) || 'sign-in cancelled'));
          var m = /[#&]access_token=([^&]+)/.exec(redir);
          if (!m) return reject(new Error('no token returned'));
          var e = /[#&]expires_in=([^&]+)/.exec(redir);
          var token = decodeURIComponent(m[1]);
          var expiry = Date.now() + ((e ? parseInt(e[1], 10) : 3600) * 1000);
          var set = {}; set[TOKEN_KEY] = { token: token, expiry: expiry };
          chrome.storage.local.set(set).then(function () { resolve(token); });
        });
      });
    });
  }

  A.getToken = function (interactive) {
    return chromeToken(interactive).catch(function () { return webToken(interactive); });
  };
  A.signIn = function () { return A.getToken(true); };

  A.signOut = function () {
    var done = chrome.storage.local.remove(TOKEN_KEY);
    return done.then(function () {
      return chromeToken(false).then(function (token) {
        return new Promise(function (res) {
          chrome.identity.removeCachedAuthToken({ token: token }, function () {
            fetch('https://accounts.google.com/o/oauth2/revoke?token=' + token).catch(function () {}).then(res, res);
          });
        });
      }).catch(function () {});
    });
  };

  A.authedFetch = function (url, opts) {
    return A.getToken(false).then(function (token) {
      opts = opts || {}; opts.headers = Object.assign({}, opts.headers, { Authorization: 'Bearer ' + token });
      return fetch(url, opts);
    });
  };
})(typeof globalThis !== 'undefined' ? globalThis : self);
