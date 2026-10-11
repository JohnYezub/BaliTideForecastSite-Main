// Bali Tide Forecast — motion triggers (~0.8 KB minified). No dependencies.
// 1) adds .in to every .bt-reveal container once it scrolls into view
// 2) moves the "now" marker (--bt-now) to the current time of day in Bali (Asia/Makassar)
(() => {
  const de = document.documentElement;
  const io = 'IntersectionObserver' in window
    ? new IntersectionObserver((es) => es.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      }), { threshold: 0.2, rootMargin: '0px 0px -8% 0px' })
    : null;

  function setNow(date = new Date()) {
    const src = document.querySelector('[data-bt-dist]');
    if (!src) return;
    const dist = src.dataset.btDist.split(',').map(Number);
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Makassar', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(date);
    const v = (t) => +parts.find((p) => p.type === t).value;
    const frac = (v('hour') * 60 + v('minute')) / 1440;
    de.style.setProperty('--bt-now', (dist[Math.round(frac * (dist.length - 1))] * 100).toFixed(2) + '%');
  }

  function init(root = document) {
    setNow();
    const els = root.querySelectorAll('.bt-reveal:not(.in)');
    if (io && de.classList.contains('motion')) els.forEach((el) => io.observe(el));
    else els.forEach((el) => el.classList.add('in'));
  }

  window.btMotion = { init, setNow };
  init();
})();
