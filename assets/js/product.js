/* AMORF — карточка товара. Композиция — serotoninn.com /products/:
   размерные чипы, индикатор остатка, нумерованный аккордеон. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const PHASES = window.AMORF_PHASES, ITEMS = window.AMORF_ITEMS;
  const fmt = n => new Intl.NumberFormat('ru-RU').format(n) + ' ₽';

  function init(destroy) {
    const gal = $('[data-gal]');
    if (!gal) return;
    const sku = new URLSearchParams(location.search).get('sku');
    const p = ITEMS.find(x => x.sku === sku) || ITEMS[12]; /* v-01 по умолчанию */
    const ph = PHASES[p.phase];

    document.title = `${p.kind} ${p.name} — ${fmt(p.price)} — AMORF`;
    const md = $('meta[name="description"]');
    if (md) md.setAttribute('content',
      `${p.kind} ${p.name}: ${p.material.toLowerCase()}, ${p.gsm} г/м², ${p.origin}. Фаза ${ph.n} «${ph.ru}». Цена ${fmt(p.price)}.`);

    $('[data-bc]').textContent = p.name;
    $('[data-phase-lb]').textContent = `Фаза ${ph.n} · ${ph.ru} · ${p.sku}`;
    $('[data-name]').textContent = p.name;
    $('[data-price]').textContent = fmt(p.price);
    $('[data-sub]').textContent = p.sub;
    $('[data-color]').textContent = p.color;
    $('[data-swatch]').style.background = p.hex;
    $('[data-care]').textContent = p.care;

    /* галерея: два кадра целиком + два фрагмента с приближением */
    const full = (s, i, wide) => `
      <div class="matter${wide ? ' matter--wide' : ''}" data-swap data-cursor="Фаза">
        <img class="matter__img" src="assets/img/p/${p.id}-${s}.webp" width="720" height="960"
          alt="${p.kind} ${p.name}, ${i ? 'вид со спины' : 'вид спереди'}" ${i ? 'loading="lazy"' : ''}>
        <img class="matter__img matter__img--b" src="assets/img/p/${p.id}-${i ? 'a' : 'b'}.webp"
          width="720" height="960" alt="" aria-hidden="true" loading="lazy">
        <canvas class="matter__ras" aria-hidden="true"></canvas>
      </div>`;
    const frag = s => `
      <div class="matter" style="aspect-ratio:1/1">
        <img class="matter__img" src="assets/img/p/${p.id}-${s}.webp" width="720" height="960"
          style="object-position:50% ${s === 'a' ? '18%' : '38%'};transform:scale(1.55)"
          alt="Фрагмент: фактура материала «${p.material}»" loading="lazy">
        <canvas class="matter__ras" aria-hidden="true"></canvas>
      </div>`;
    /* перед во всю ширину → две фактуры в ряд → спина во всю ширину: дыр в сетке нет */
    gal.innerHTML = full('a', 0, false) + frag('a') + frag('b') + full('b', 1, true);

    /* паспорт материала */
    $('[data-spec]').innerHTML = [
      ['Материал', p.material], ['Состав', p.comp],
      ['Плотность', `${p.gsm} г/м²`], ['Происхождение', p.origin],
      ['Фаза', `${ph.n} · ${ph.ru} / ${ph.lat}`], ['Артикул', p.sku]
    ].map(([k, v]) => `<div class="spec__r"><span class="spec__k">${k}</span><span>${v}</span></div>`).join('');

    /* размеры */
    const sizesBox = $('[data-sizes]');
    let chosen = null;
    sizesBox.innerHTML = p.sizes.map(s =>
      `<button class="size" type="button" data-s="${s}" aria-pressed="false"
        ${p.gone.includes(s) ? 'disabled' : ''}>${s}</button>`).join('');
    const stock = $('[data-stock]');
    const setStock = s => {
      if (!s) {
        stock.innerHTML = p.stock <= 12
          ? `<span class="stock${p.stock <= 4 ? ' stock--low' : ''}"><i></i>Тираж фазы: осталось ${p.stock} изделий</span>`
          : `<span class="stock"><i></i>В наличии</span>`;
      } else if (s === p.low) {
        stock.innerHTML = `<span class="stock stock--low"><i></i>Размер ${s}: осталась последняя</span>`;
      } else {
        stock.innerHTML = `<span class="stock"><i></i>Размер ${s} в наличии</span>`;
      }
    };
    setStock(null);
    $$('.size', sizesBox).forEach(b => b.addEventListener('click', () => {
      $$('.size', sizesBox).forEach(x => x.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', 'true');
      chosen = b.dataset.s;
      setStock(chosen);
      $('[data-add-msg]').textContent = '';
    }));

    /* в корзину */
    const addBtn = $('[data-add]'), msg = $('[data-add-msg]');
    addBtn.addEventListener('click', () => {
      if (!chosen) {
        msg.textContent = 'Сначала выберите размер.'; msg.dataset.state = 'bad';
        window.AmorfSound && AmorfSound.blip(220, 120, .2, .14, 'square');
        return;
      }
      window.AmorfCart.add({ id: p.id, sku: p.sku, name: p.name, kind: p.kind, price: p.price, size: chosen });
      msg.textContent = `${p.name} · ${chosen} — в корзине.`; msg.dataset.state = 'ok';
    });

    /* мобильная шапка над галереей + липкая полоса покупки */
    const pdp = document.querySelector('.pdp');
    if (pdp) {
      const mh = document.createElement('div');
      mh.className = 'pdp__mobhead';
      mh.innerHTML = `<span class="h">${p.name}</span><span class="p">${fmt(p.price)}</span>`;
      pdp.prepend(mh);
      const bar = document.createElement('div');
      bar.className = 'mobbar';
      bar.innerHTML = `<span class="mobbar__p">${fmt(p.price)}</span>
        <button class="btn btn--solid" type="button">В корзину</button>`;
      document.body.appendChild(bar);
      bar.querySelector('button').addEventListener('click', () => {
        if (!chosen) {
          $('[data-sizes]').scrollIntoView({ behavior: 'smooth', block: 'center' });
          msg.textContent = 'Сначала выберите размер.'; msg.dataset.state = 'bad';
          return;
        }
        addBtn.click();
      });
      const onScroll = () => bar.classList.toggle('is-on', scrollY > innerHeight * .6);
      addEventListener('scroll', onScroll, { passive: true });
      destroy.push(() => { removeEventListener('scroll', onScroll); bar.remove(); });
    }

    /* в этой же фазе */
    const rel = ITEMS.filter(x => x.phase === p.phase && x.id !== p.id).slice(0, 4);
    $('[data-related]').innerHTML = rel.map(r => `
      <article class="pcard">
       <a href="product.html?sku=${r.sku}" aria-label="${r.kind} ${r.name} — ${fmt(r.price)}">
        <div class="matter" data-swap data-cursor="Открыть">
         <img class="matter__img" src="assets/img/p/${r.id}-a.webp" width="720" height="960"
           alt="${r.kind} ${r.name}, ${r.material.toLowerCase()}" loading="lazy">
         <img class="matter__img matter__img--b" src="assets/img/p/${r.id}-b.webp" width="720" height="960" alt="" aria-hidden="true" loading="lazy">
         <canvas class="matter__ras" aria-hidden="true"></canvas>
        </div>
        <div class="pcard__row"><h3 class="pcard__n">${r.name}</h3><span class="pcard__p">${fmt(r.price)}</span></div>
        <p class="pcard__m">${r.kind} · ${PHASES[r.phase].n} ${PHASES[r.phase].ru}</p>
       </a></article>`).join('');
  }

  window.AmorfPages = window.AmorfPages || {};
  window.AmorfPages['product.html'] = init;
})();
