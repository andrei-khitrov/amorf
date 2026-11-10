/* AMORF — контакты: генеративная SVG-подобная карта-схема на canvas.
   Не тайлы, а схема квартала: сетка улиц, метка шоурума, пульс. */
(() => {
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function init(destroy) {
    const cvs = document.querySelector('[data-map]');
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    let W = 0, H = 0, dpr = 1, raf = 0, alive = true;
    const t0 = performance.now();

    /* псевдослучайная, но стабильная сетка квартала */
    const R = seed => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
    let streets = [];
    function build() {
      const rnd = R(20260823);
      streets = [];
      for (let i = 0; i < 7; i++)
        streets.push({ o: 'h', p: .1 + i * .13 + (rnd() - .5) * .05, w: rnd() > .7 ? 2 : 1 });
      for (let i = 0; i < 9; i++)
        streets.push({ o: 'v', p: .06 + i * .105 + (rnd() - .5) * .04, w: rnd() > .75 ? 2 : 1 });
    }
    const size = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = cvs.clientWidth; H = cvs.clientHeight;
      cvs.width = W * dpr; cvs.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const PIN = { x: .58, y: .46 };
    const METRO = { x: .18, y: .72 };

    function draw(now) {
      if (!alive) return;
      raf = requestAnimationFrame(draw);
      const r = cvs.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      const t = REDUCED ? 0 : (now - t0) / 1000;
      ctx.clearRect(0, 0, W, H);

      /* улицы */
      for (const s of streets) {
        ctx.strokeStyle = s.w > 1 ? 'rgba(232,232,227,.22)' : 'rgba(232,232,227,.1)';
        ctx.lineWidth = s.w;
        ctx.beginPath();
        if (s.o === 'h') { ctx.moveTo(0, s.p * H); ctx.lineTo(W, s.p * H); }
        else { ctx.moveTo(s.p * W, 0); ctx.lineTo(s.p * W, H); }
        ctx.stroke();
      }
      /* маршрут метро → шоурум */
      ctx.strokeStyle = 'rgba(232,232,227,.5)';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([5, 6]);
      ctx.lineDashOffset = -t * 14;
      ctx.beginPath();
      ctx.moveTo(METRO.x * W, METRO.y * H);
      ctx.lineTo(METRO.x * W, .46 * H);
      ctx.lineTo(PIN.x * W, PIN.y * H);
      ctx.stroke();
      ctx.setLineDash([]);

      /* метро */
      ctx.fillStyle = 'rgba(147,143,138,.9)';
      ctx.font = '10px "Geist Mono", monospace';
      ctx.beginPath(); ctx.arc(METRO.x * W, METRO.y * H, 4, 0, 7); ctx.fill();
      ctx.fillText('М КУРСКАЯ', METRO.x * W + 10, METRO.y * H + 3);

      /* пин шоурума: пульс */
      const px = PIN.x * W, py = PIN.y * H;
      const pulse = REDUCED ? 0 : (t % 2) / 2;
      ctx.strokeStyle = `rgba(255,74,28,${.6 * (1 - pulse)})`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(px, py, 8 + pulse * 26, 0, 7); ctx.stroke();
      ctx.fillStyle = '#ff4a1c';
      ctx.beginPath(); ctx.arc(px, py, 5, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(232,232,227,.95)';
      ctx.font = '11px "Geist Mono", monospace';
      ctx.fillText('AMORF · НИЖНИЙ СУСАЛЬНЫЙ 5С19', px + 14, py - 8);
      ctx.fillStyle = 'rgba(147,143,138,.8)';
      ctx.fillText('12:00–21:00 ЕЖЕДНЕВНО', px + 14, py + 8);

      /* рамка-прицел по углам */
      ctx.strokeStyle = 'rgba(232,232,227,.4)';
      ctx.lineWidth = 1;
      const c = 14;
      [[6, 6, 1, 1], [W - 6, 6, -1, 1], [6, H - 6, 1, -1], [W - 6, H - 6, -1, -1]].forEach(([x, y, sx, sy]) => {
        ctx.beginPath();
        ctx.moveTo(x + c * sx, y); ctx.lineTo(x, y); ctx.lineTo(x, y + c * sy);
        ctx.stroke();
      });
    }

    build(); size();
    addEventListener('resize', size);
    raf = requestAnimationFrame(draw);
    destroy.push(() => { alive = false; cancelAnimationFrame(raf); removeEventListener('resize', size); });
  }

  window.AmorfPages = window.AmorfPages || {};
  window.AmorfPages['contact.html'] = init;
})();
