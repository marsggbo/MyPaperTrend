/* MyPaperTrend — build-time config. */
(function (g) {
  var MPT = (g.MPT = g.MPT || {});
  // GitHub OAuth App client id (public; safe to embed). Device Flow — no secret needed.
  MPT.GITHUB_CLIENT_ID = 'Ov23licUUKuxf0swLxVo';
  MPT.GITHUB_SCOPE = 'public_repo';              // public data repo; use 'repo' for private
  MPT.DATA_TEMPLATE = 'marsggbo/mypapertrend-data'; // forked when a new user signs in
  MPT.DATA_REPO_NAME = 'mypapertrend-data';
})(typeof globalThis !== 'undefined' ? globalThis : self);
