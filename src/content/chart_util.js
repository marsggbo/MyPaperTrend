/* MyPaperTrend — shared Chart.js helpers (used by the overlay and the inline per-paper charts). */
(function (g) {
  var MPT = (g.MPT = g.MPT || {});
  var C = (MPT.chart = {});

  function dark() { return g.matchMedia && g.matchMedia('(prefers-color-scheme:dark)').matches; }
  function fmt(n) { return (n >= 0 ? '+' : '') + n; }

  var ACCENT = '#1a73e8';                 // Scholar blue
  var ACCENT_RGB = '26,115,232';

  C.crosshair = {
    id: 'mptCrosshair',
    afterDraw: function (c) {
      var t = c.tooltip; if (!t || !t._active || !t._active.length) return;
      var x = t._active[0].element.x, a = c.chartArea, ctx = c.ctx;
      ctx.save(); ctx.beginPath(); ctx.moveTo(x, a.top); ctx.lineTo(x, a.bottom);
      ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
      ctx.strokeStyle = dark() ? 'rgba(138,180,248,.55)' : 'rgba(26,115,232,.4)';
      ctx.stroke(); ctx.restore();
    }
  };

  C.tooltip = function (dates) {
    var d = dark();
    return {
      backgroundColor: d ? 'rgba(32,33,36,.97)' : 'rgba(255,255,255,.98)',
      titleColor: d ? '#e8eaed' : '#202124', bodyColor: d ? '#bdc1c6' : '#3c4043',
      borderColor: d ? 'rgba(138,180,248,.4)' : 'rgba(26,115,232,.25)', borderWidth: 1,
      padding: 10, cornerRadius: 8, displayColors: false,
      callbacks: {
        title: function (items) { return '📅 ' + dates[items[0].dataIndex]; },
        label: function (ctx) {
          var i = ctx.dataIndex, v = ctx.parsed.y, out = [MPT.t('citations') + ': ' + v.toLocaleString()];
          if (i > 0) { var dd = v - ctx.dataset.data[i - 1]; out.push(MPT.t('newCites') + ': ' + fmt(dd) + (dd > 0 ? ' 📈' : dd < 0 ? ' 📉' : ' —')); }
          else out.push(MPT.t('newCites') + ': ' + MPT.t('firstDay'));
          return out;
        }
      }
    };
  };

  /* Build a citation trend line chart. `series` = [{date, citations}]. */
  C.line = function (canvas, series, h) {
    if (!g.Chart) return null;
    var dates = series.map(function (s) { return s.date; });
    var data = series.map(function (s) { return s.citations; });
    var ctx = canvas.getContext('2d');
    var grad = ctx.createLinearGradient(0, 0, 0, h || 170);
    grad.addColorStop(0, 'rgba(' + ACCENT_RGB + ',.20)'); grad.addColorStop(1, 'rgba(' + ACCENT_RGB + ',0)');
    var d = dark();
    return new g.Chart(ctx, {
      type: 'line',
      data: {
        labels: dates.map(function (x) { return x.slice(5); }),
        datasets: [{
          data: data, borderColor: ACCENT, backgroundColor: grad, fill: true, tension: .35, borderWidth: 2,
          pointRadius: data.length > 60 ? 0 : 2.5, pointHoverRadius: 6, hoverRadius: 6,
          pointBackgroundColor: ACCENT, pointBorderColor: '#fff', pointBorderWidth: 1.5
        }]
      },
      plugins: [C.crosshair],
      options: {
        responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
        plugins: { legend: { display: false }, tooltip: C.tooltip(dates) },
        scales: {
          x: { grid: { display: false }, ticks: { color: d ? '#9aa0a6' : '#80868b', maxTicksLimit: 9, font: { size: 10 } } },
          y: { grid: { color: d ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)' }, ticks: { color: d ? '#9aa0a6' : '#80868b', font: { size: 10 } } }
        }
      }
    });
  };
})(typeof globalThis !== 'undefined' ? globalThis : self);
