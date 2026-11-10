/* AMORF — лукбук: горизонтальный пиннинг-скролл.
   Механика — cinetica.studio: scrub по всей высоте, лента едет на ширину трека. */
(() => {
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function init(destroy) {
    const track = document.querySelector('[data-lookh]');
    if (!track) return;
    const sec = track.closest('.lookh');
    const nEl = document.querySelector('[data-look-n]');
    const frames = track.children.length;

    if (REDUCED || matchMedia('(max-width: 760px)').matches) {
      /* мобильный и reduced: обычная горизонтальная прокрутка пальцем */
      sec.style.overflowX = 'auto';
      track.style.height = 'auto';
      track.style.paddingBlock = '20px 50px';
      Array.from(track.children).forEach(f => f.style.height = 'min(62svh,520px)');
      return;
    }

    const dist = () => track.scrollWidth - innerWidth;
    const tween = gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: {
        trigger: sec, start: 'top top', end: () => '+=' + (dist() + innerHeight * .25),
        scrub: true, pin: true, invalidateOnRefresh: true,
        onUpdate: self => {
          if (nEl) nEl.textContent =
            String(Math.min(frames, 1 + Math.floor(self.progress * frames))).padStart(2, '0') +
            ' / ' + String(frames).padStart(2, '0');
        }
      }
    });
    /* лёгкий параллакс внутри кадров */
    Array.from(track.children).forEach(f => {
      const img = f.querySelector('img');
      gsap.fromTo(img, { xPercent: -4 }, { xPercent: 4, ease: 'none',
        scrollTrigger: { trigger: sec, start: 'top top', end: () => '+=' + dist(), scrub: true } });
    });
    destroy.push(() => tween.kill());
  }

  window.AmorfPages = window.AmorfPages || {};
  window.AmorfPages['lookbook.html'] = init;
})();
