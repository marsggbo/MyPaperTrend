/* MyPaperTrend — lightweight i18n (English + Chinese). */
(function (g) {
  var MPT = (g.MPT = g.MPT || {});

  var DICT = {
    en: {
      brand: 'MyPaperTrend',
      track: 'Track', tracking: 'Tracking',
      lastCaptured: 'Last captured: {date} · {papers} papers · {days} days',
      totalCites: 'total cites', todaysNew: "today's new", papers: 'papers',
      hindex: 'h-index', daysTracked: 'days tracked', newPapers: 'new papers',
      vsPrev: 'vs prev capture',
      captureAll: 'Capture all pages', capturing: 'Capturing…',
      dashboard: 'Dashboard', fullDashboard: 'Full dashboard', settings: 'Settings', exportJSON: 'Export',
      noteTotal: 'Total comes from Scholar’s metrics (correct even when paginated). Click a 📈 under any paper to see its history.',
      hintMore: 'This profile has more papers than shown. Click “Capture all pages” to record every paper.',
      madeBy: 'Made by', onGitHub: 'on GitHub',
      trackPrompt: 'Turn on the switch to track {name}’s citation trend. Data is kept per-scholar and stored locally — nothing is recorded until you switch it on.',
      thisScholar: 'this scholar',
      collapse: 'Collapse', expand: 'Expand',
      citations: 'Citations', newCites: 'New', firstDay: '— (first day)',
      citeHistory: 'Citation history', noHistory: 'No history yet',
      // pages
      openScholar: 'Open my Scholar profile', importData: 'Import data (JSON)', exportData: 'Export data (JSON)',
      noData: 'No data yet', latestChange: 'latest change',
      lang: 'Language', langAuto: 'Auto', save: 'Save settings',
      dashPapers: 'Papers', dashTrend: 'Total Citations — All-Time Trend', dashMilestones: 'Recent Milestones',
      sort: 'Sort', sortCites: 'Citations', sortGrowth: 'Growth', sortYear: 'Year', sortNew: 'Newest',
      searchPh: '🔍 Search papers…',
      stTotal: 'Total Citations', stLatest: 'Latest New', stPapers: 'Papers Tracked', stAvg: '7-Day Avg',
      openDashboard: 'Open full dashboard',
      // settings page
      settingsTitle: 'MyPaperTrend Settings',
      acctTitle: 'Account & cloud sync',
      acctHint: 'Choose where your history is stored. Local keeps everything in this browser. GitHub / Google Drive sync one file per scholar to your own account — no manual token needed.',
      storLocal: 'Local only', storGitHub: 'GitHub', storGoogle: 'Google Drive',
      notSignedIn: 'Not signed in — data stays local.',
      syncedGh: 'Synced to {repo}', syncedGg: 'Synced to your Google Drive',
      whereGh: '📁 Saved as {repo}/citations-<scholarId>.json (one file per scholar).',
      whereGg: '📁 Saved in your Google Drive → MyPaperTrend folder, as “mypapertrend-<scholarId>.json” (one per scholar).',
      trackTitle: 'Tracking & auto-update',
      trackHint: 'Track a scholar by flipping the Track switch on their profile. Each is stored separately. Auto-update opens each tracked profile in a hidden tab at the time below, records all papers, and closes it — no scraping API needed.',
      autoDaily: 'Auto-update tracked scholars daily', autoTimeLabel: 'Daily update time (local)',
      trackedNone: 'No scholars tracked yet — open a Scholar profile and flip the Track switch.',
      trackedList: 'Tracked scholars:',
      sourceTitle: 'Data source (advanced)',
      sourceHint: 'Default reads your Scholar page directly — free and never blocked. Add a paid API only if you want background updates without opening the browser.',
      enrichLabel: 'Enrich papers with authors / abstract / links via Semantic Scholar',
      // onboarding
      obTitle: 'Welcome to MyPaperTrend', obSubtitle: 'Your Google Scholar citations, tracked over time — right on your profile.',
      obStep1t: 'Open a profile & flip “Track”', obStep1d: 'Go to any Scholar profile (yours or anyone you follow) and turn on the Track switch. Nothing is recorded until you do — so different people’s data never mix.',
      obStep2t: 'It reads the page directly — no scraping API, no login', obStep2d: 'MyPaperTrend reads the numbers already on your screen (including Scholar’s own total, correct even when paginated). Google never blocks it.',
      obStep3t: 'Set it and forget it', obStep3d: 'Turn on daily auto-update in Settings and pick a time — it refreshes every tracked scholar automatically. Or click “Capture all pages” any time.',
      obPrivacy: 'Your data stays on your device. History is stored locally — no account required. You can export it any time, or connect Google Drive / GitHub in Advanced settings.',
      obStart: 'Get started', obAdvanced: 'Advanced settings'
    },
    zh: {
      brand: 'MyPaperTrend',
      track: '追踪', tracking: '追踪中',
      lastCaptured: '最近采集：{date} · {papers} 篇 · {days} 天',
      totalCites: '总引用', todaysNew: '今日新增', papers: '论文数',
      hindex: 'h 指数', daysTracked: '追踪天数', newPapers: '新论文',
      vsPrev: '较上次',
      captureAll: '采集全部论文', capturing: '采集中…',
      dashboard: '看板', fullDashboard: '完整看板', settings: '设置', exportJSON: '导出',
      noteTotal: '总量取自 Scholar 的指标框（分页也准确）。点击任意论文下方的 📈 查看它的历史引用。',
      hintMore: '该主页论文比当前页显示的多。点「采集全部论文」记录每一篇。',
      madeBy: '作者', onGitHub: 'GitHub 项目',
      trackPrompt: '打开开关即可追踪 {name} 的引用趋势。数据按学者分别存储、默认存在本地——不打开就不会记录。',
      thisScholar: '该学者',
      collapse: '收起', expand: '展开',
      citations: '引用总数', newCites: '当日新增', firstDay: '— (首日)',
      citeHistory: '历史引用', noHistory: '暂无历史数据',
      openScholar: '打开我的 Scholar 主页', importData: '导入数据 (JSON)', exportData: '导出数据 (JSON)',
      noData: '暂无数据', latestChange: '最新变化',
      lang: '语言', langAuto: '自动', save: '保存设置',
      dashPapers: '论文', dashTrend: '总引用趋势', dashMilestones: '近期里程碑',
      sort: '排序', sortCites: '引用', sortGrowth: '增长', sortYear: '年份', sortNew: '最新',
      searchPh: '🔍 搜索论文…',
      stTotal: '总引用', stLatest: '最新新增', stPapers: '追踪论文', stAvg: '7 日均值',
      openDashboard: '打开完整看板',
      settingsTitle: 'MyPaperTrend 设置',
      acctTitle: '账号与云同步',
      acctHint: '选择数据存储位置。「仅本地」把一切留在此浏览器；GitHub / Google Drive 会把每个学者同步为一个文件到你自己的账号——无需手填 token。',
      storLocal: '仅本地', storGitHub: 'GitHub', storGoogle: 'Google Drive',
      notSignedIn: '未登录——数据仅存本地。',
      syncedGh: '已同步到 {repo}', syncedGg: '已同步到你的 Google Drive',
      whereGh: '📁 保存为 {repo}/citations-<学者ID>.json（每位学者一个文件）。',
      whereGg: '📁 保存在你的 Google Drive → MyPaperTrend 文件夹里，命名为「mypapertrend-<学者ID>.json」（每位学者一个）。',
      trackTitle: '追踪与自动更新',
      trackHint: '在学者主页打开「追踪」开关即可追踪，每位学者分开存储。自动更新会在下方设定的时间用隐藏标签页打开每个已追踪主页、记录全部论文后关闭——无需任何爬虫 API。',
      autoDaily: '每天自动更新已追踪的学者', autoTimeLabel: '每日更新时间（本地）',
      trackedNone: '尚未追踪任何学者——打开某个 Scholar 主页并打开「追踪」开关。',
      trackedList: '已追踪学者：',
      sourceTitle: '数据来源（高级）',
      sourceHint: '默认直接读取你的 Scholar 页面——免费且不会被封。只有想在不打开浏览器时后台更新，才需要加付费 API。',
      enrichLabel: '通过 Semantic Scholar 补充作者/摘要/链接',
      obTitle: '欢迎使用 MyPaperTrend', obSubtitle: '把你的 Google Scholar 引用趋势，直接展示在主页上。',
      obStep1t: '打开主页并开启「追踪」', obStep1d: '打开任意 Scholar 主页（你自己的或你关注的人），打开「追踪」开关。不打开就不会记录——不同人的数据永不混。',
      obStep2t: '直接读取页面——无需爬虫 API、无需登录', obStep2d: 'MyPaperTrend 读取你屏幕上已有的数字（包括 Scholar 自己的总量，分页也准确），Google 不会拦截。',
      obStep3t: '设置一次，之后自动', obStep3d: '在设置里开启每日自动更新并选择时间，它会自动刷新每位已追踪学者；也可随时点「采集全部论文」。',
      obPrivacy: '你的数据留在本机。历史存在本地——无需账号。可随时导出，或在高级设置里连接 Google Drive / GitHub。',
      obStart: '开始使用', obAdvanced: '高级设置'
    }
  };

  MPT.LANGS = ['en', 'zh'];
  MPT._lang = 'en';

  MPT.detectLang = function () {
    var n = ((g.navigator && g.navigator.language) || 'en').toLowerCase();
    return n.indexOf('zh') === 0 ? 'zh' : 'en';
  };
  MPT.setLangValue = function (l) {
    MPT._lang = (l === 'zh' || l === 'en') ? l : MPT.detectLang();
  };
  MPT.getLang = function () { return MPT._lang; };
  /* Replace text of [data-i18n] and placeholders of [data-i18n-ph] elements. */
  MPT.applyI18n = function (root) {
    root = root || (g.document);
    if (!root) return;
    root.querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = MPT.t(el.getAttribute('data-i18n')); });
    root.querySelectorAll('[data-i18n-ph]').forEach(function (el) { el.placeholder = MPT.t(el.getAttribute('data-i18n-ph')); });
  };
  MPT.t = function (key, vars) {
    var d = DICT[MPT._lang] || DICT.en;
    var s = d[key] != null ? d[key] : (DICT.en[key] != null ? DICT.en[key] : key);
    if (vars) Object.keys(vars).forEach(function (k) { s = s.split('{' + k + '}').join(vars[k]); });
    return s;
  };
})(typeof globalThis !== 'undefined' ? globalThis : self);
