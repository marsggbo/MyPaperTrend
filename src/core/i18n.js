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
      openDashboard: 'Open full dashboard'
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
      openDashboard: '打开完整看板'
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
