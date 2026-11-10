/* AMORF — каталог: фильтры (фаза/тип/размер), сортировка, режим растра,
   плотность сетки. Строка управления — serotoninn.com /all-products/. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const PHASES = window.AMORF_PHASES, ITEMS = window.AMORF_ITEMS;
  const fmt = n => new Intl.NumberFormat('ru-RU').format(n) + ' ₽';

  function card(p) {
    const ph = PHASES[p.phase];
    const tag = p.new ? '<span class="pcard__tag pcard__tag--hot">Новое</span>' : '';
    return `<article class="pcard" data-id="${p.id}">${tag}
 <a href="product.html?sku=${p.sku}" aria-label="${p.kind} ${p.name} — ${fmt(p.price)}">
  <div class="matter" data-cursor="Открыть">
   <img class="matter__img" src="assets/img/p/${p.id}-a.webp" width="720" height="960"
     alt="${p.kind} ${p.name}, ${p.material.toLowerCase()}, ${p.color.toLowerCase()}" loading="lazy">
   <img class="matter__img matter__img--b" src="assets/img/p/${p.id}-b.webp" width="720" height="960" alt="" aria-hidden="true" loading="lazy">
   <canvas class="matter__ras" aria-hidden="true"></canvas>
  </div>
  <div class="pcard__row"><h3 class="pcard__n">${p.name}</h3><span class="pcard__p">${fmt(p.price)}</span></div>
  <p class="pcard__m">${p.kind} · ${ph.n} ${ph.ru} · ${p.color}</p>
 </a></article>`;
  }

  function init(destroy) {
    const grid = $('[data-grid]');
    if (!grid) return;
    const empty = $('[data-empty]');
    const state = { phase: new Set(), kind: new Set(), size: new Set(), sort: 'phase', ras: false };

    /* фаза из адресной строки: catalog.html?phase=veil */
    const q = new URLSearchParams(location.search).get('phase');
    if (q && PHASES[q]) {
      state.phase.add(q);
      const h1 = $('.chead__t'), lb = $('.chead .lbl');
      if (h1) h1.textContent = PHASES[q].ru;
      if (lb) lb.textContent = `Каталог · Фаза ${PHASES[q].n} · ${PHASES[q].lat}`;
      document.title = `Фаза ${PHASES[q].n} «${PHASES[q].ru}» — каталог AMORF`;
    }

    function apply() {
      let list = ITEMS.filter(p =>
        (!state.phase.size || state.phase.has(p.phase)) &&
        (!state.kind.size || state.kind.has(p.kind)) &&
        (!state.size.size ||
          p.sizes.some(s => state.size.has(s) && !p.gone.includes(s))));
      const order = { solid: 0, melt: 1, vapor: 2, core: 3 };
      if (state.sort === 'asc') list.sort((a, b) => a.price - b.price);
      else if (state.sort === 'desc') list.sort((a, b) => b.price - a.price);
      else if (state.sort === 'new') list.sort((a, b) => (b.new ? 1 : 0) - (a.new ? 1 : 0));
      else list.sort((a, b) => order[a.phase] - order[b.phase]);

      grid.innerHTML = list.map(card).join('');
      grid.dataset.mode = state.ras ? 'ras' : '';
      empty.hidden = !!list.length;
      const out = $('[data-count-out]');
      if (out) out.textContent = String(list.length).padStart(2, '0');

      /* пере-инициализация карточек: растр, ховеры, звук */
      if (window.gsap) {
        gsap.fromTo(grid.children, { opacity: 0, y: 26 },
          { opacity: 1, y: 0, duration: .6, ease: 'power3.out', stagger: .04, overwrite: true });
      }
      hydrate(grid);
      if (state.ras) rasterAll();
      ScrollTrigger.refresh();
    }

    /* растр — общий модуль из main.js */
    const raster = (img, cvs) => window.AmorfRaster.rasterize(img, cvs);
    function rasterAll() {
      $$('.matter', grid).forEach(m => {
        const img = $('.matter__img', m), cvs = $('.matter__ras', m);
        if (!raster(img, cvs))
          img.addEventListener('load', () => raster(img, cvs), { once: true });
      });
    }

    function hydrate(scope) {
      $$('.matter', scope).forEach(box => {
        const b = $('.matter__img--b', box);
        let t = null;
        box.addEventListener('pointerenter', () => {
          if (state.ras) return;
          box.classList.add('is-ras');
          raster($('.matter__img', box), $('.matter__ras', box));
          clearTimeout(t);
          t = setTimeout(() => { b.style.opacity = 1; box.classList.remove('is-ras'); }, 200);
        });
        box.addEventListener('pointerleave', () => {
          if (state.ras) return;
          clearTimeout(t);
          box.classList.add('is-ras');
          t = setTimeout(() => { b.style.opacity = 0; box.classList.remove('is-ras'); }, 200);
        });
      });
      $$('a', scope).forEach(el => {
        if (el.dataset.sfx) return; el.dataset.sfx = '1';
        el.addEventListener('pointerenter', () => window.AmorfSound && AmorfSound.tick());
        el.addEventListener('click', () => window.AmorfSound && AmorfSound.click());
      });
    }

    /* чипы */
    $$('[data-filter]').forEach(ch => {
      const kind = ch.dataset.filter, val = ch.dataset.value;
      if (kind === 'phase' && state.phase.has(val)) ch.setAttribute('aria-pressed', 'true');
      ch.addEventListener('click', () => {
        const set = state[kind];
        set.has(val) ? set.delete(val) : set.add(val);
        ch.setAttribute('aria-pressed', String(set.has(val)));
        apply();
      });
    });
    $$('[data-reset]').forEach(b => b.addEventListener('click', () => {
      state.phase.clear(); state.kind.clear(); state.size.clear();
      $$('[data-filter]').forEach(c => c.setAttribute('aria-pressed', 'false'));
      history.replaceState({}, '', 'catalog.html');
      const h1 = $('.chead__t'), lb = $('.chead .lbl');
      if (h1) h1.textContent = 'Все фазы';
      if (lb) lb.textContent = 'Каталог · 24 изделия';
      document.title = 'Каталог AMORF — 24 изделия четырёх фаз';
      apply();
    }));
    const sort = $('[data-sort]');
    sort && sort.addEventListener('change', () => { state.sort = sort.value; apply(); });

    const mode = $('[data-mode-toggle]');
    mode && mode.addEventListener('click', () => {
      state.ras = !state.ras;
      mode.setAttribute('aria-pressed', String(state.ras));
      grid.dataset.mode = state.ras ? 'ras' : '';
      if (state.ras) rasterAll();
      $$('.matter', grid).forEach(m => m.classList.toggle('is-ras', state.ras));
      window.AmorfSound && AmorfSound.blip(state.ras ? 240 : 500, state.ras ? 560 : 200, .18, .12, 'square');
    });

    $$('[data-cols]').forEach(b => b.addEventListener('click', () => {
      $$('[data-cols]').forEach(x => x.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', 'true');
      grid.dataset.cols = b.dataset.cols;
      ScrollTrigger.refresh();
    }));

    apply();
  }

  window.AmorfPages = window.AmorfPages || {};
  window.AmorfPages['catalog.html'] = init;
})();
