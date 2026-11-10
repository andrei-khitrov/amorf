/* AMORF — главная: фазовый скролл. Частичная система на canvas:
   решётка (SOLID) → провис и течение (FLUID) → рассеивание (VEIL).
   Параметры пиннинга — cinetica.studio: top top → bottom bottom, scrub. */
(() => {
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const STATES = [
    { w: 'SOLID', d: 'Жёсткая геометрия. Плотности от 210 до 420 г/м². Форма держится без тела.' },
    { w: 'FLUID', d: 'Вещество теряет структуру. Узлы провисают, линии стекают вниз по силуэту.' },
    { w: 'VEIL', d: 'Связи распадаются. Остаётся взвесь — прозрачность от 42 граммов на метр.' }
  ];

  function initPhaseScroll(destroy) {
    const sec = document.querySelector('.pscroll');
    if (!sec) return;
    const cvs = sec.querySelector('[data-matter-cv]');
    const wordEl = sec.querySelector('[data-matter-word]');
    const descEl = sec.querySelector('[data-matter-desc]');
    const nEl = sec.querySelector('[data-matter-n]');
    const tEl = sec.querySelector('[data-matter-t]');
    const bars = sec.querySelectorAll('.pscroll__bar i');
    const ctx = cvs.getContext('2d');

    let W = 0, H = 0, dpr = 1;
    const size = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = cvs.clientWidth; H = cvs.clientHeight;
      cvs.width = W * dpr; cvs.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    };

    /* решётка узлов */
    let nodes = [], cols = 0, rows = 0, gap = 0;
    function build() {
      nodes = [];
      gap = Math.max(34, Math.min(64, W / 24));
      cols = Math.ceil(W / gap) + 2;
      rows = Math.ceil(H / gap) + 2;
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
          nodes.push({
            x0: (c - .5) * gap, y0: (r - .5) * gap,
            seed: Math.random() * Math.PI * 2,
            v: .5 + Math.random(),          // индивидуальная скорость
            drift: (Math.random() - .5)     // куда сносит в паре
          });
    }

    let prog = 0, raf = 0, alive = true, t0 = performance.now();
    function draw(now) {
      if (!alive) return;
      raf = requestAnimationFrame(draw);
      const r = sec.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      const t = REDUCED ? 0 : (now - t0) / 1000;
      const snd = window.AmorfSound ? window.AmorfSound.level() : 0;
      ctx.clearRect(0, 0, W, H);

      /* p: 0..1 весь путь; фазы: 0-.5 solid→melt, .5-1 melt→vapor */
      const p = prog;
      const melt = Math.min(1, Math.max(0, p * 2));          // 0..1 к плавлению
      const vap  = Math.min(1, Math.max(0, (p - .5) * 2));   // 0..1 к пару

      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        /* плавление: провис вниз + волна; пар: разлёт и дрожь */
        const sag = melt * (Math.sin(n.x0 * .012 + t * .7 + n.seed) * 14 + 26) * (n.y0 / H + .3);
        const flow = melt * Math.sin(t * n.v + n.seed) * 8;
        const scatterX = vap * (Math.sin(n.seed * 7.3) * 140 * n.drift * 2 + Math.sin(t * n.v * 2.1 + n.seed) * 26);
        const scatterY = vap * (-(n.seed / Math.PI) * 90 - Math.sin(t * n.v * 1.7 + n.seed * 2) * 30) - vap * vap * 60;
        const jx = (melt * 1.5 + vap * 3 + snd * 6) * Math.sin(t * 11 * n.v + n.seed * 5);
        n.x = n.x0 + flow + scatterX + jx;
        n.y = n.y0 + sag + scatterY;
      }
      /* связи: живы в solid, рвутся к пару */
      const linkA = (1 - vap) * .32;
      if (linkA > .01) {
        ctx.strokeStyle = `rgba(232,232,227,${linkA})`;
        ctx.beginPath();
        for (let r0 = 0; r0 < rows; r0++)
          for (let c0 = 0; c0 < cols; c0++) {
            const i = r0 * cols + c0, n = nodes[i];
            if (c0 < cols - 1) {
              const m = nodes[i + 1];
              if (Math.abs(n.x - m.x) < gap * 1.9) { ctx.moveTo(n.x, n.y); ctx.lineTo(m.x, m.y); }
            }
            if (r0 < rows - 1) {
              const m = nodes[i + cols];
              if (Math.abs(n.y - m.y) < gap * 2.2) { ctx.moveTo(n.x, n.y); ctx.lineTo(m.x, m.y); }
            }
          }
        ctx.stroke();
      }
      /* узлы */
      for (const n of nodes) {
        const a = .28 + vap * .5 + snd * .2;
        const s = 1.1 + vap * 1.3;
        ctx.fillStyle = `rgba(232,232,227,${Math.min(.9, a)})`;
        ctx.fillRect(n.x - s / 2, n.y - s / 2, s, s);
      }
    }

    let stIdx = 0;
    function setState(i) {
      if (i === stIdx) return;
      stIdx = i;
      wordEl.style.opacity = 0;
      setTimeout(() => {
        wordEl.textContent = STATES[i].w;
        descEl.textContent = STATES[i].d;
        wordEl.style.opacity = 1;
        if (window.AmorfSound) window.AmorfSound.blip(180 + i * 140, 320 + i * 220, .28, .1, 'triangle');
      }, 160);
      if (nEl) nEl.textContent = `0${i + 1} / 03`;
      bars.forEach((b, j) => b.classList.toggle('is-on', j <= i));
    }
    wordEl.style.transition = 'opacity .16s linear';

    size();
    addEventListener('resize', size);
    raf = requestAnimationFrame(draw);

    if (!REDUCED) {
      ScrollTrigger.create({
        trigger: sec, start: 'top top', end: 'bottom bottom', scrub: true,
        onUpdate: self => {
          prog = self.progress;
          if (tEl) tEl.textContent = (prog * 1.4).toFixed(2);
          setState(prog < .33 ? 0 : prog < .72 ? 1 : 2);
        }
      });
    } else {
      prog = 0;
    }
    destroy.push(() => { alive = false; cancelAnimationFrame(raf); removeEventListener('resize', size); });
  }

  window.AmorfPages = window.AmorfPages || {};
  window.AmorfPages['index.html'] = initPhaseScroll;
})();
