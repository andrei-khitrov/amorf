/* AMORF — материя: интерактивная модель решётки.
   Температура: узлы держат связи → провисают → рассеиваются.
   Управляется ползунками, кнопкой «прогнать фазы» и звуком. */
(() => {
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);

  const ZONES = [
    { max: .34, state: 'Solid', phase: '01 · SOLID', beh: 'Форма держится без тела', link: 'catalog.html?phase=solid' },
    { max: .55, state: 'Fluid', phase: '02 · FLUID', beh: 'Материал ищет нижнюю точку', link: 'catalog.html?phase=fluid' },
    { max: .82, state: 'Veil', phase: '03 · VEIL', beh: 'Слои видны на просвет', link: 'catalog.html?phase=veil' },
    { max: 1.01, state: 'Core', phase: '04 · CORE', beh: 'Состояние, которое не меняется', link: 'catalog.html?phase=core' }
  ];

  function init(destroy) {
    const cvs = $('[data-lab]');
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    const rng = $('[data-lab-range]'), dens = $('[data-lab-dens]');
    const out = $('[data-lab-out]'), dout = $('[data-lab-dens-out]');
    const stEl = $('[data-lab-state]'), phEl = $('[data-lab-phase]'), behEl = $('[data-lab-beh]');
    const link = $('[data-lab-link]'), play = $('[data-lab-play]');

    let temp = .2, grid = 26, nodes = [], W = 0, H = 0, dpr = 1;
    const size = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = cvs.clientWidth; H = cvs.clientHeight || W;
      cvs.width = W * dpr; cvs.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    };
    function build() {
      nodes = [];
      const g = W / grid;
      for (let r = 0; r <= grid; r++)
        for (let c = 0; c <= grid; c++)
          nodes.push({ x0: c * g, y0: r * g, seed: Math.random() * Math.PI * 2, v: .5 + Math.random() });
    }

    let raf = 0, alive = true;
    const t0 = performance.now();
    function draw(now) {
      if (!alive) return;
      raf = requestAnimationFrame(draw);
      const r = cvs.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      const t = REDUCED ? 0 : (now - t0) / 1000;
      const snd = window.AmorfSound ? window.AmorfSound.level() : 0;
      ctx.clearRect(0, 0, W, H);

      const melt = Math.min(1, temp / .55);
      const vap = Math.max(0, (temp - .55) / .45);
      const g = W / grid, cols = grid + 1;

      for (const n of nodes) {
        const sag = melt * (Math.sin(n.x0 * .02 + t * .8 + n.seed) * 6 + 12) * (n.y0 / H + .2);
        const sx = vap * Math.sin(n.seed * 9.1) * 70 + vap * Math.sin(t * n.v * 1.9 + n.seed) * 18;
        const sy = -vap * ((n.seed / Math.PI) * 55 + Math.sin(t * n.v * 1.4 + n.seed * 3) * 16);
        const j = (melt + vap * 2 + snd * 5) * Math.sin(t * 9 * n.v + n.seed * 4);
        n.x = n.x0 + sx + j; n.y = n.y0 + sag + sy;
      }
      const linkA = (1 - vap) * .4;
      if (linkA > .01) {
        ctx.strokeStyle = `rgba(232,232,227,${linkA})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let r0 = 0; r0 <= grid; r0++)
          for (let c0 = 0; c0 <= grid; c0++) {
            const i = r0 * cols + c0, n = nodes[i];
            if (c0 < grid) { const m = nodes[i + 1]; if (Math.abs(n.x - m.x) < g * 2) { ctx.moveTo(n.x, n.y); ctx.lineTo(m.x, m.y); } }
            if (r0 < grid) { const m = nodes[i + cols]; if (Math.abs(n.y - m.y) < g * 2.3) { ctx.moveTo(n.x, n.y); ctx.lineTo(m.x, m.y); } }
          }
        ctx.stroke();
      }
      for (const n of nodes) {
        const s = 1.4 + vap * 1.6;
        ctx.fillStyle = `rgba(232,232,227,${.3 + vap * .5})`;
        ctx.fillRect(n.x - s / 2, n.y - s / 2, s, s);
      }
    }

    function update() {
      out.textContent = temp.toFixed(2);
      const z = ZONES.find(z => temp < z.max);
      stEl.textContent = z.state; phEl.textContent = z.phase; behEl.textContent = z.beh;
      link.setAttribute('href', z.link);
    }
    rng.addEventListener('input', () => { temp = rng.value / 100; update(); });
    dens.addEventListener('input', () => { grid = +dens.value; dout.textContent = dens.value; build(); });

    let playing = false;
    play.addEventListener('click', () => {
      if (playing) return; playing = true;
      const o = { v: 0 };
      window.AmorfSound && AmorfSound.blip(120, 700, 1.2, .1, 'sawtooth');
      gsap.to(o, { v: 100, duration: 5.5, ease: 'power1.inOut',
        onUpdate: () => { temp = o.v / 100; rng.value = o.v; update(); },
        onComplete: () => {
          gsap.to(o, { v: 20, duration: 1.6, ease: 'power2.out', delay: .5,
            onUpdate: () => { temp = o.v / 100; rng.value = o.v; update(); },
            onComplete: () => { playing = false; } });
        } });
    });

    size(); update();
    addEventListener('resize', size);
    raf = requestAnimationFrame(draw);
    destroy.push(() => { alive = false; cancelAnimationFrame(raf); removeEventListener('resize', size); });
  }

  window.AmorfPages = window.AmorfPages || {};
  window.AmorfPages['material.html'] = init;
})();
