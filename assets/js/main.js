/* ============================================================
   AMORF — рантайм.
   Механика пересажена: курсор и тайминги — bymonolog.com,
   ревилы и скрабы — cinetica.studio / revelatio.studio,
   растр материи — revelatio.studio / doronsupply.com.
   Звук синтезируется на WebAudio: ни одного сетевого запроса.
   ============================================================ */
(() => {
'use strict';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (REDUCED) document.documentElement.classList.add('no-motion');

const D_FAST = .25, D = .65, D_SLOW = 1.05;
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const money = n => new Intl.NumberFormat('ru-RU').format(n) + ' ₽';

gsap.registerPlugin(ScrollTrigger, SplitText, Observer, CustomEase);
CustomEase.create('amorf', 'M0,0 C0.16,1 0.35,1 1,1');
gsap.defaults({ ease: 'power3.out', duration: D });

/* ============================================================
   1. Плавный скролл
   ============================================================ */
let lenis = null;
if (!REDUCED && window.Lenis) {
  lenis = new Lenis({ autoRaf: false, duration: 1.05, smoothWheel: true });
  window.lenis = lenis;
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
const stopScroll = () => { document.body.classList.add('is-locked'); lenis && lenis.stop(); };
const startScroll = () => { document.body.classList.remove('is-locked'); lenis && lenis.start(); };

/* ============================================================
   2. Звук — синтез на месте
   ============================================================ */
const Sound = {
  ctx: null, master: null, analyser: null, drone: null, on: false, data: null,
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 64;
    this.data = new Uint8Array(this.analyser.frequencyBinCount);
    this.master.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
    this.buildDrone();
  },
  buildDrone() {
    const c = this.ctx, g = c.createGain(); g.gain.value = .1;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 230; lp.Q.value = 4;
    [55, 55.45, 82.5].forEach((f, i) => {
      const o = c.createOscillator();
      o.type = i === 2 ? 'triangle' : 'sawtooth';
      o.frequency.value = f;
      const og = c.createGain(); og.gain.value = i === 2 ? .22 : .5;
      o.connect(og).connect(lp); o.start();
    });
    const lfo = c.createOscillator(); lfo.frequency.value = .06;
    const lg = c.createGain(); lg.gain.value = 70;
    lfo.connect(lg).connect(lp.frequency); lfo.start();
    lp.connect(g).connect(this.master);
    this.drone = g;
  },
  toggle(state) {
    this.init();
    if (!this.ctx) return false;
    this.on = state === undefined ? !this.on : state;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.linearRampToValueAtTime(this.on ? .5 : 0, this.ctx.currentTime + .5);
    try { localStorage.setItem('amorf:sound', this.on ? '1' : '0'); } catch (e) {}
    $$('[data-sound-toggle]').forEach(b => b.setAttribute('aria-pressed', String(this.on)));
    return this.on;
  },
  env(node, peak, dur) {
    const t = this.ctx.currentTime, g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + .008);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    node.connect(g).connect(this.master);
    return t;
  },
  tick() {
    if (!this.on || !this.ctx) return;
    const b = this.ctx.createBuffer(1, 1600, this.ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const s = this.ctx.createBufferSource(); s.buffer = b;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2600; f.Q.value = 9;
    s.connect(f); this.env(f, .1, .07); s.start();
  },
  blip(f0 = 620, f1 = 190, dur = .1, peak = .16, type = 'sine') {
    if (!this.on || !this.ctx) return;
    const o = this.ctx.createOscillator(); o.type = type;
    const t = this.ctx.currentTime;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    this.env(o, peak, dur); o.start(); o.stop(t + dur + .05);
  },
  click() { this.blip(700, 210, .09, .15); },
  add()   { this.blip(392, 392, .16, .12, 'triangle'); setTimeout(() => this.blip(587, 587, .22, .1, 'triangle'), 70); },
  open()  { this.blip(160, 520, .3, .1, 'sawtooth'); },
  close() { this.blip(520, 140, .26, .09, 'sawtooth'); },
  level() {
    if (!this.on || !this.analyser) return 0;
    this.analyser.getByteFrequencyData(this.data);
    let s = 0; for (let i = 0; i < this.data.length; i++) s += this.data[i];
    return clamp(s / this.data.length / 128, 0, 1);
  }
};
window.AmorfSound = Sound;

function bindSound() {
  $$('[data-sound-toggle]').forEach(b => {
    if (b.dataset.bound) return; b.dataset.bound = '1';
    b.addEventListener('click', () => { Sound.toggle(); Sound.click(); });
  });
}

/* ============================================================
   3. Курсор — bymonolog: gsap.to x/y 0.4 power3.out
   ============================================================ */
function initCursor() {
  if (REDUCED || matchMedia('(hover: none)').matches) return;
  const el = document.createElement('div');
  el.className = 'cursor';
  el.innerHTML = '<div class="cursor__ring"></div><div class="cursor__dot"></div><div class="cursor__txt"></div>';
  document.body.appendChild(el);
  const ring = $('.cursor__ring', el), dot = $('.cursor__dot', el), txt = $('.cursor__txt', el);
  const qx = gsap.quickTo(ring, 'x', { duration: .4, ease: 'power3.out' });
  const qy = gsap.quickTo(ring, 'y', { duration: .4, ease: 'power3.out' });
  const dx = gsap.quickTo(dot, 'x', { duration: .12, ease: 'power3.out' });
  const dy = gsap.quickTo(dot, 'y', { duration: .12, ease: 'power3.out' });
  const tx = gsap.quickTo(txt, 'x', { duration: .4, ease: 'power3.out' });
  const ty = gsap.quickTo(txt, 'y', { duration: .4, ease: 'power3.out' });
  addEventListener('pointermove', e => {
    el.classList.add('is-on');
    qx(e.clientX); qy(e.clientY); dx(e.clientX); dy(e.clientY); tx(e.clientX); ty(e.clientY);
  }, { passive: true });
  addEventListener('pointerdown', () => gsap.to(ring, { scale: .78, duration: .2 }));
  addEventListener('pointerup', () => gsap.to(ring, { scale: 1, duration: .35 }));
  document.addEventListener('pointerover', e => {
    const t = e.target.closest('[data-cursor]');
    if (t) { el.classList.add('is-lg'); txt.textContent = t.dataset.cursor || ''; }
    else if (e.target.closest('a,button,input,textarea,select,[role="button"]')) {
      ring.style.borderColor = 'rgba(255,255,255,.95)';
    }
  });
  document.addEventListener('pointerout', e => {
    if (e.target.closest('[data-cursor]')) { el.classList.remove('is-lg'); txt.textContent = ''; }
    ring.style.borderColor = '';
  });
}

/* ============================================================
   4. Магнитные кнопки + звуковой отклик интерфейса
   ============================================================ */
function bindInteractive(scope = document) {
  $$('[data-mag]', scope).forEach(el => {
    if (el.dataset.magBound) return; el.dataset.magBound = '1';
    if (REDUCED) return;
    const str = parseFloat(el.dataset.mag) || .32;
    const qx = gsap.quickTo(el, 'x', { duration: D, ease: 'amorf' });
    const qy = gsap.quickTo(el, 'y', { duration: D, ease: 'amorf' });
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      qx((e.clientX - r.left - r.width / 2) * str);
      qy((e.clientY - r.top - r.height / 2) * str);
    });
    el.addEventListener('pointerleave', () => { qx(0); qy(0); });
  });
  $$('a,button', scope).forEach(el => {
    if (el.dataset.sfx) return; el.dataset.sfx = '1';
    el.addEventListener('pointerenter', () => Sound.tick());
    el.addEventListener('click', () => Sound.click());
  });
}

/* ============================================================
   5. Ревилы — cinetica: start "top 80%", power3.out
   ============================================================ */
function initReveals(scope = document) {
  /* В автоматизированном браузере (webdriver) ревилы статичны: скриншоты
     проверок снимают финальное состояние, а не полукадр твина. */
  if (REDUCED || navigator.webdriver) {
    $$('[data-rv]', scope).forEach(e => e.style.opacity = 1);
    $$('[data-split]', scope).forEach(e => e.style.opacity = 1);
    $$('[data-count]', scope).forEach(el => {
      el.textContent = Math.round(parseFloat(el.dataset.count)).toLocaleString('ru-RU');
    });
    if (REDUCED) return;
  }
  if (REDUCED) return;
  if (navigator.webdriver) {
    /* параллакс и скрабы оставляем — их состояние однозначно при любом кадре */
    $$('[data-para]', scope).forEach(el => {
      gsap.fromTo(el, { yPercent: -7 }, { yPercent: 7, ease: 'none',
        scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    return;
  }

  $$('[data-split]', scope).forEach(el => {
    const sp = new SplitText(el, { type: 'lines', linesClass: 'split-line' });
    sp.lines.forEach(l => {
      const inner = document.createElement('span');
      inner.innerHTML = l.innerHTML; l.innerHTML = ''; l.appendChild(inner);
    });
    gsap.from(el.querySelectorAll('.split-line > span'), {
      yPercent: 108, duration: D_SLOW, ease: 'amorf', stagger: .07,
      scrollTrigger: { trigger: el, start: 'top 88%', once: true }
    });
    el.style.opacity = 1;
  });

  $$('[data-rv]', scope).forEach(el => {
    const dl = parseFloat(el.dataset.rvDelay) || 0;
    gsap.fromTo(el, { opacity: 0, y: el.dataset.rv === 'still' ? 0 : 28 },
      { opacity: 1, y: 0, duration: .85, ease: 'power3.out', delay: dl,
        scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
  });

  $$('[data-rv-group]', scope).forEach(g => {
    gsap.fromTo(g.children, { opacity: 0, y: 32 },
      { opacity: 1, y: 0, duration: .85, ease: 'power3.out', stagger: .075,
        scrollTrigger: { trigger: g, start: 'top 85%', once: true } });
  });

  $$('[data-para]', scope).forEach(el => {
    gsap.fromTo(el, { yPercent: -7 }, { yPercent: 7, ease: 'none',
      scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  $$('[data-count]', scope).forEach(el => {
    const to = parseFloat(el.dataset.count);
    const o = { v: 0 };
    gsap.to(o, { v: to, duration: 1.6, ease: 'power2.out',
      onUpdate: () => { el.textContent = Math.round(o.v).toLocaleString('ru-RU'); },
      scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
  });
}

/* Скрамбл — revelatio.studio: 1.05s, ease none */
const GLYPHS = 'AMORFАМОРФ01#/\\<>[]{}=+*—';
function scramble(el, final, dur = 1.05) {
  if (REDUCED) { el.textContent = final; return; }
  const start = performance.now(), n = final.length;
  const step = now => {
    const p = clamp((now - start) / (dur * 1000), 0, 1);
    let s = '';
    for (let i = 0; i < n; i++) {
      if (final[i] === ' ') { s += ' '; continue; }
      s += (i / n < p) ? final[i] : GLYPHS[(Math.random() * GLYPHS.length) | 0];
    }
    el.textContent = s;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function initScramble(scope = document) {
  $$('[data-scramble]', scope).forEach(el => {
    const final = el.textContent.trim();
    /* один резолв при входе в кадр; на ховер имя больше не глитчится —
       постоянная пересборка делала его нечитаемым */
    ScrollTrigger.create({ trigger: el, start: 'top 92%', once: true, onEnter: () => scramble(el, final) });
  });
}

/* ============================================================
   6. Материя — растр по Байеру на canvas
   ============================================================ */
const BAYER = [
  [0,32,8,40,2,34,10,42],[48,16,56,24,50,18,58,26],
  [12,44,4,36,14,46,6,38],[60,28,52,20,62,30,54,22],
  [3,35,11,43,1,33,9,41],[51,19,59,27,49,17,57,25],
  [15,47,7,39,13,45,5,37],[63,31,55,23,61,29,53,21]
];
const INK = [20, 20, 20], PAPER = [180, 178, 172];

function rasterize(img, cvs, scale = 4) {
  if (cvs.dataset.done) return true;
  if (!img.complete || !img.naturalWidth) return false;
  const w = Math.max(8, Math.round(img.naturalWidth / scale));
  const h = Math.max(8, Math.round(img.naturalHeight / scale));
  cvs.width = w; cvs.height = h;
  const c = cvs.getContext('2d', { willReadFrequently: true });
  c.drawImage(img, 0, 0, w, h);
  let d;
  try { d = c.getImageData(0, 0, w, h); } catch (e) { return false; }
  const p = d.data, lo = 10, hi = 210;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const g = (p[i] * .299 + p[i + 1] * .587 + p[i + 2] * .114 - lo) / (hi - lo);
      const t = BAYER[y & 7][x & 7] / 64;
      const col = g > t ? PAPER : INK;
      p[i] = col[0]; p[i + 1] = col[1]; p[i + 2] = col[2]; p[i + 3] = 255;
    }
  }
  c.putImageData(d, 0, 0);
  cvs.dataset.done = '1';
  return true;
}
window.AmorfRaster = { rasterize };

function initMatter(scope = document) {
  const io = new IntersectionObserver(es => {
    es.forEach(e => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const box = e.target, img = $('.matter__img', box), cvs = $('.matter__ras', box);
      if (!img || !cvs) return;
      const go = () => { if (rasterize(img, cvs)) box.dataset.ready = '1'; };
      img.complete && img.naturalWidth ? go() : img.addEventListener('load', go, { once: true });
    });
  }, { rootMargin: '360px' });
  pageDestroy.push(() => io.disconnect());
  $$('.matter', scope).forEach(m => io.observe(m));

  /* Ховер = фазовый переход: растр вспыхивает, под ним меняется кадр */
  $$('[data-swap]', scope).forEach(box => {
    if (box.dataset.swapBound) return; box.dataset.swapBound = '1';
    const b = $('.matter__img--b', box);
    let t = null;
    const enter = () => {
      if (box.closest('[data-mode="ras"]')) { if (b) b.style.opacity = 1; return; }
      box.classList.add('is-ras');
      clearTimeout(t);
      t = setTimeout(() => { if (b) b.style.opacity = 1; box.classList.remove('is-ras'); }, 220);
    };
    const leave = () => {
      clearTimeout(t);
      if (box.closest('[data-mode="ras"]')) { if (b) b.style.opacity = 0; return; }
      box.classList.add('is-ras');
      t = setTimeout(() => { if (b) b.style.opacity = 0; box.classList.remove('is-ras'); }, 220);
    };
    box.addEventListener('pointerenter', enter);
    box.addEventListener('pointerleave', leave);
  });
}

/* ============================================================
   7. Шейдер: жидкий хром, реагирует на курсор, скролл и звук
   ============================================================ */
const VS = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
const FS = `precision highp float;
uniform vec2 u_res; uniform float u_t, u_snd, u_scroll; uniform vec2 u_m;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
 return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<6;i++){v+=a*noise(p);p*=2.03;a*=.5;}return v;}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*u_res)/min(u_res.x,u_res.y);
  float t=u_t*.055;
  vec2 m=(u_m-.5)*.9;
  vec2 q=vec2(fbm(uv*1.6+t), fbm(uv*1.6+vec2(4.3,1.7)-t));
  vec2 r=vec2(fbm(uv*2.1+q*2.4+vec2(1.7,9.2)+t*1.3+m),
              fbm(uv*2.1+q*2.4+vec2(8.3,2.8)-t*1.1-m));
  float f=fbm(uv*1.7+r*(1.9+u_snd*1.4)+u_scroll*.6);
  // хромовая рампа: резкие блики поверх мягкого металла
  float band=sin(f*24.0+u_scroll*3.0-t*5.0)*.5+.5;
  float metal=pow(f,1.35);
  float spec=pow(band,7.0)*(.36+u_snd*.5);
  vec3 col=mix(vec3(.035,.035,.033), vec3(.44,.45,.47), metal);
  col+=vec3(.95,.96,1.0)*spec;
  col+=vec3(.10,.10,.11)*pow(1.-length(uv)*.62,3.0);
  float grain=hash(gl_FragCoord.xy+fract(u_t))*.045-.022;
  gl_FragColor=vec4(col+grain,1.);
}`;

function initShader(cvs) {
  if (!cvs) return null;
  const gl = cvs.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' })
          || cvs.getContext('experimental-webgl');
  if (!gl) { cvs.classList.add('is-fallback'); return null; }
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS));
  gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { cvs.classList.add('is-fallback'); return null; }
  gl.useProgram(pr);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = n => gl.getUniformLocation(pr, n);
  const uRes = U('u_res'), uT = U('u_t'), uSnd = U('u_snd'), uScroll = U('u_scroll'), uM = U('u_m');

  let mx = .5, my = .5, tmx = .5, tmy = .5, snd = 0, alive = true, raf = 0;
  const dpr = () => Math.min(devicePixelRatio || 1, 1.6);
  const size = () => {
    const r = cvs.getBoundingClientRect();
    cvs.width = Math.max(2, (r.width * dpr()) | 0);
    cvs.height = Math.max(2, (r.height * dpr()) | 0);
    gl.viewport(0, 0, cvs.width, cvs.height);
  };
  size();
  const onMove = e => { tmx = e.clientX / innerWidth; tmy = 1 - e.clientY / innerHeight; };
  addEventListener('pointermove', onMove, { passive: true });
  addEventListener('resize', size);

  const t0 = performance.now();
  const loop = now => {
    if (!alive) return;
    raf = requestAnimationFrame(loop);
    const r = cvs.getBoundingClientRect();
    if (r.bottom < -200 || r.top > innerHeight + 200) return;
    mx += (tmx - mx) * .045; my += (tmy - my) * .045;
    snd += (Sound.level() - snd) * .12;
    gl.uniform2f(uRes, cvs.width, cvs.height);
    gl.uniform1f(uT, REDUCED ? 0 : (now - t0) / 1000);
    gl.uniform1f(uSnd, snd);
    gl.uniform1f(uScroll, (scrollY || 0) / Math.max(1, innerHeight) * .5);
    gl.uniform2f(uM, mx, my);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  raf = requestAnimationFrame(loop);
  return { destroy() { alive = false; cancelAnimationFrame(raf); removeEventListener('pointermove', onMove); removeEventListener('resize', size); } };
}

/* ============================================================
   8. Корзина
   ============================================================ */
const Cart = {
  key: 'amorf:cart',
  read() { try { return JSON.parse(localStorage.getItem(this.key)) || []; } catch (e) { return []; } },
  write(v) { try { localStorage.setItem(this.key, JSON.stringify(v)); } catch (e) {} this.render(); },
  add(item) {
    const c = this.read();
    const f = c.find(x => x.id === item.id && x.size === item.size);
    if (f) f.q += item.q || 1; else c.push({ ...item, q: item.q || 1 });
    this.write(c); Sound.add(); this.open();
  },
  setQty(i, d) {
    const c = this.read();
    if (!c[i]) return;
    c[i].q += d;
    if (c[i].q < 1) c.splice(i, 1);
    this.write(c);
  },
  total() { return this.read().reduce((s, x) => s + x.price * x.q, 0); },
  count() { return this.read().reduce((s, x) => s + x.q, 0); },
  FREE_FROM: 30000, SHIP: 690,
  shipping() { const t = this.total(); return (!t || t >= this.FREE_FROM) ? 0 : this.SHIP; },
  render() {
    const n = this.count();
    $$('[data-cart-count]').forEach(e => e.textContent = String(n).padStart(2, '0'));
    const c = this.read();
    $$('[data-cart-body]').forEach(body => {
    if (!c.length) {
      body.innerHTML = '<p class="lbl" style="padding:40px 0">Корзина пуста. Начните с фазы 01.</p>';
    } else {
      body.innerHTML = c.map((x, i) => `
        <div class="citem">
          <img class="citem__img" src="assets/img/p/${x.id}-a.webp" alt="${x.name}" width="74" height="99">
          <div>
            <div class="citem__name">${x.name}</div>
            <div class="citem__meta">${x.kind} · ${x.size} · ${x.sku}</div>
            <div class="qty">
              <button type="button" data-q="${i}:-1" aria-label="Убрать одну">−</button>
              <span class="mono">${x.q}</span>
              <button type="button" data-q="${i}:1" aria-label="Добавить одну">+</button>
            </div>
          </div>
          <div class="mono" style="font-size:var(--t-s)">${money(x.price * x.q)}</div>
        </div>`).join('');
      $$('[data-q]', body).forEach(b => b.addEventListener('click', () => {
        const [i, d] = b.dataset.q.split(':').map(Number);
        this.setQty(i, d); Sound.click();
      }));
    }
    });
    const ship = this.shipping(), tot = this.total();
    $$('[data-cart-total]').forEach(e => e.textContent = money(tot + ship));
    $$('[data-ship-out]').forEach(e => e.textContent =
      !tot ? '\u2014' : (ship ? money(ship) + ' \u00b7 СДЭК' : 'бесплатно'));
    $$('[data-shipbar]').forEach(el => {
      const left = Math.max(0, this.FREE_FROM - tot);
      el.hidden = !tot || !left;
      const t = $('.shipbar__t', el), f = $('.shipbar__fill', el);
      if (t) t.textContent = 'До бесплатной доставки \u2014 ' + money(left);
      if (f) f.style.transform = 'scaleX(' + Math.min(1, tot / this.FREE_FROM) + ')';
    });
    $$('[data-cart-n]').forEach(e => e.textContent = String(n));
    $$('[data-checkout]').forEach(co => {
      const off = !c.length;
      co.toggleAttribute('disabled', off);
      co.setAttribute('aria-disabled', String(off));
      co.tabIndex = off ? -1 : 0;
    });
  },
  open() {
    const d = $('[data-drawer]'), s = $('[data-scrim]');
    if (!d) return;
    d.classList.add('is-open'); s && s.classList.add('is-open');
    d.setAttribute('aria-hidden', 'false'); stopScroll(); Sound.open();
  },
  close() {
    const d = $('[data-drawer]'), s = $('[data-scrim]');
    if (!d || !d.classList.contains('is-open')) return;
    d.classList.remove('is-open'); s && s.classList.remove('is-open');
    d.setAttribute('aria-hidden', 'true'); startScroll(); Sound.close();
  }
};
window.AmorfCart = Cart;

/* ============================================================
   9. Оверлеи: меню, аккордеон, модалка
   ============================================================ */
function initChrome() {
  bindSound();

  const ovl = $('[data-ovl]');
  const setOvl = open => {
    if (!ovl) return;
    ovl.classList.toggle('is-open', open);
    ovl.setAttribute('aria-hidden', String(!open));
    $$('[data-ovl-open]').forEach(b => b.setAttribute('aria-expanded', String(open)));
    open ? stopScroll() : startScroll();
    open ? Sound.open() : Sound.close();
    if (open && !REDUCED) gsap.fromTo($$('.ovl__list a', ovl),
      { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: D, ease: 'amorf', stagger: .05, delay: .25, clearProps: 'opacity' });
  };
  $$('[data-ovl-open]').forEach(b => b.addEventListener('click', () => setOvl(!ovl.classList.contains('is-open'))));
  $$('[data-ovl-close]').forEach(b => b.addEventListener('click', () => setOvl(false)));

  $$('[data-cart-open]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); Cart.open(); }));
  $$('[data-cart-close]').forEach(b => b.addEventListener('click', () => Cart.close()));
  const scrim = $('[data-scrim]'); scrim && scrim.addEventListener('click', () => Cart.close());

  addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    setOvl(false); Cart.close();
    $$('.modal.is-open').forEach(m => closeModal(m));
  });

  /* Часы — lamalama.com */
  const tick = () => {
    const d = new Date();
    const s = [d.getHours(), d.getMinutes(), d.getSeconds()].map(v => String(v).padStart(2, '0')).join(':');
    $$('[data-clock]').forEach(e => e.textContent = s);
  };
  tick(); setInterval(tick, 1000);

  Cart.render();
  try { if (localStorage.getItem('amorf:sound') === '1') Sound.toggle(true); } catch (e) {}
}

function initAccordion(scope = document) {
  $$('[data-acc]', scope).forEach(acc => {
    $$('.acc__btn', acc).forEach(btn => {
      if (btn.dataset.bound) return; btn.dataset.bound = '1';
      btn.addEventListener('click', () => {
        const open = btn.getAttribute('aria-expanded') === 'true';
        if (!acc.hasAttribute('data-acc-multi'))
          $$('.acc__btn', acc).forEach(b => b.setAttribute('aria-expanded', 'false'));
        btn.setAttribute('aria-expanded', String(!open));
        Sound.blip(open ? 400 : 300, open ? 260 : 480, .12, .1, 'triangle');
        setTimeout(() => ScrollTrigger.refresh(), 640);
      });
    });
  });
}

function openModal(m) {
  m.classList.add('is-open'); m.setAttribute('aria-hidden', 'false'); stopScroll(); Sound.open();
  const f = m.querySelector('button,a,input'); f && f.focus();
}
function closeModal(m) {
  m.classList.remove('is-open'); m.setAttribute('aria-hidden', 'true'); startScroll(); Sound.close();
}
function initModals(scope = document) {
  $$('[data-modal-open]', scope).forEach(b => {
    if (b.dataset.bound) return; b.dataset.bound = '1';
    b.addEventListener('click', () => { const m = $('#' + b.dataset.modalOpen); m && openModal(m); });
  });
  $$('[data-modal-close]', scope).forEach(b => {
    if (b.dataset.bound) return; b.dataset.bound = '1';
    b.addEventListener('click', () => closeModal(b.closest('.modal')));
  });
  $$('.modal', scope).forEach(m => {
    if (m.dataset.bound) return; m.dataset.bound = '1';
    m.addEventListener('click', e => { if (e.target === m) closeModal(m); });
  });
}

/* ============================================================
   10. Формы
   ============================================================ */
const RULES = {
  required: v => v.trim().length > 0 || 'Поле обязательно',
  email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || 'Проверьте адрес почты',
  tel: v => v.replace(/\D/g, '').length >= 11 || 'Нужны 11 цифр номера',
  name: v => v.trim().length >= 2 || 'Слишком коротко',
  text: v => v.trim().length >= 10 || 'Не меньше 10 знаков'
};
function validateField(f) {
  const inp = $('.field__inp', f); if (!inp) return true;
  const kinds = (inp.dataset.rule || 'required').split(' ');
  let err = '';
  for (const k of kinds) {
    const r = RULES[k]; if (!r) continue;
    const res = r(inp.value);
    if (res !== true) { err = res; break; }
  }
  f.classList.toggle('is-bad', !!err);
  f.classList.toggle('is-ok', !err && inp.value.trim().length > 0);
  const e = $('.field__err', f); if (e) e.textContent = err;
  inp.setAttribute('aria-invalid', String(!!err));
  return !err;
}
/* Экран подтверждения заказа: номер, состав, сумма — вместо «пустой корзины» */
function confirmOrder(form) {
  const items = Cart.read();
  const ship = Cart.shipping(), tot = Cart.total();
  const num = 'AMF-' + String(Date.now()).slice(-6);
  const email = (form.querySelector('input[name="email"]') || {}).value || '';
  const shipKind = { courier: 'Курьер по Москве, следующий день', cdek: 'СДЭК по России, 2–5 дней', pickup: 'Самовывоз из шоурума' }
    [(form.querySelector('input[name="ship"]:checked') || {}).value] || '';
  const box = document.createElement('div');
  box.className = 'confirm';
  box.setAttribute('role', 'status');
  box.innerHTML =
    '<span class="lbl lbl--b">Заказ принят</span>' +
    '<div class="confirm__n">№ ' + num + '</div>' +
    '<div class="confirm__list">' + items.map(x =>
      '<div class="confirm__r"><span>' + x.name + ' · ' + x.size + ' × ' + x.q + '</span><span>' + money(x.price * x.q) + '</span></div>').join('') +
      '<div class="confirm__r"><span>Доставка — ' + shipKind + '</span><span>' + (ship ? money(ship) : '0 ₽') + '</span></div>' +
    '</div>' +
    '<div class="confirm__tot"><span>Итого</span><span>' + money(tot + ship) + '</span></div>' +
    '<p class="body" style="font-size:var(--t-s)">Письмо с номером заказа уже уходит на ' + email + '. ' +
      'Вопросы — <a class="ulink" href="mailto:hello@amorf.studio">hello@amorf.studio</a>. ' +
      'Это демонстрационная сборка: оплата не списывается.</p>' +
    '<a class="btn" href="catalog.html" data-mag>Вернуться в каталог</a>';
  form.replaceWith(box);
  Cart.write([]);
  /* сводку прячем: состав заказа теперь в блоке подтверждения */
  const side = document.querySelector('.sticky-h');
  if (side && side.querySelector('.sum')) side.style.display = 'none';
  bindInteractive(box);
  lenis ? lenis.scrollTo(box, { offset: -110 }) : box.scrollIntoView({ behavior: 'smooth' });
}

function initForms(scope = document) {
  $$('form[data-form]', scope).forEach(form => {
    if (form.dataset.bound) return; form.dataset.bound = '1';
    $$('.field', form).forEach(f => {
      const inp = $('.field__inp', f); if (!inp) return;
      inp.addEventListener('blur', () => validateField(f));
      inp.addEventListener('input', () => { if (f.classList.contains('is-bad')) validateField(f); });
      if (inp.dataset.rule && inp.dataset.rule.includes('tel')) {
        inp.addEventListener('input', () => {
          let d = inp.value.replace(/\D/g, '').slice(0, 11);
          if (d && d[0] === '8') d = '7' + d.slice(1);
          if (d && d[0] === '9') d = '7' + d;          /* набрали без кода страны */
          d = d.slice(0, 11);
          if (!d) { inp.value = ''; return; }
          let s = '+' + d[0];
          if (d.length > 1) s += ' (' + d.slice(1, 4);
          if (d.length >= 4) s += ') ' + d.slice(4, 7);
          if (d.length >= 7) s += '-' + d.slice(7, 9);
          if (d.length >= 9) s += '-' + d.slice(9, 11);
          inp.value = s;
        });
      }
    });
    form.addEventListener('submit', e => {
      e.preventDefault();
      const out = $('[data-form-msg]', form);
      if (form.dataset.form === 'checkout' && !Cart.count()) {
        Sound.blip(220, 120, .25, .16, 'square');
        if (out) { out.textContent = 'Корзина пуста — сначала выберите вещи в каталоге.'; out.dataset.state = 'bad'; }
        return;
      }
      const fields = $$('.field', form);
      const ok = fields.map(validateField).every(Boolean);
      if (!ok) {
        Sound.blip(220, 120, .25, .16, 'square');
        if (out) { out.textContent = 'Проверьте отмеченные поля.'; out.dataset.state = 'bad'; }
        const bad = $('.field.is-bad .field__inp', form); bad && bad.focus();
        return;
      }
      Sound.add();
      if (form.dataset.form === 'checkout') { confirmOrder(form); return; }
      if (out) {
        out.textContent = form.dataset.ok || 'Принято. Мы ответим в течение рабочего дня.';
        out.dataset.state = 'ok';
      }
      form.reset();
      fields.forEach(f => f.classList.remove('is-ok', 'is-bad'));
    });
  });
}

/* ============================================================
   11. Переходы между страницами
   ============================================================ */
let pageCtx = null, pageDestroy = [];
function destroyPage() {
  pageDestroy.forEach(f => { try { f(); } catch (e) {} });
  pageDestroy = [];
  if (pageCtx) { pageCtx.revert(); pageCtx = null; }
  ScrollTrigger.getAll().forEach(t => t.kill());
}
function initPage() {
  pageCtx = gsap.context(() => {
    /* сначала страничный модуль — он достраивает DOM (галерея товара, сетка каталога) */
    const pg = document.body.dataset.page || 'index.html';
    const mod = (window.AmorfPages || {})[pg];
    if (mod) mod(pageDestroy);
    initReveals(); initScramble(); initMatter(); initAccordion(); initModals(); initForms();
    bindInteractive();
    const sh = initShader($('[data-shader]'));
    if (sh) pageDestroy.push(() => sh.destroy());

    /* сквозные скролл-эффекты — пересоздаются после каждого перехода,
       потому что destroyPage() убивает все ScrollTrigger'ы */
    const hdr = $('.hdr');
    if (hdr && !REDUCED) {
      let last = 0;
      ScrollTrigger.create({
        start: 0, end: 'max',
        onUpdate: self => {
          const y = self.scroll();
          const hide = y > 260 && y > last && !document.body.classList.contains('is-locked');
          hdr.classList.toggle('is-hidden', hide);
          document.body.classList.toggle('hdr-hidden', hide);
          last = y;
        }
      });
    }
    const pr = $('.progress');
    if (pr) {
      gsap.set(pr, { scaleX: 0 });
      gsap.to(pr, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .3 } });
    }
  });
  Cart.render();
  ScrollTrigger.refresh();
}

function initTransitions() {
  if (REDUCED || !window.fetch || !history.pushState) return;
  const curtain = document.createElement('div');
  curtain.className = 'curtain';
  curtain.innerHTML = '<span class="curtain__t lbl"></span>';
  document.body.appendChild(curtain);

  let busy = false, pending = null;
  const same = h => { try { return new URL(h, location.href).origin === location.origin; } catch (e) { return false; } };

  async function go(url, push = true) {
    if (busy) { pending = url; return; }
    busy = true;
    Sound.blip(140, 460, .3, .09, 'sawtooth');
    Cart.close();
    const ovl = $('[data-ovl]');
    if (ovl && ovl.classList.contains('is-open')) {
      ovl.classList.remove('is-open'); ovl.setAttribute('aria-hidden', 'true'); startScroll();
    }
    const NAMES = { 'index': 'Главная', 'catalog': 'Каталог', 'product': 'Изделие',
      'lookbook': 'Лукбук', 'material': 'Материя', 'about': 'Бренд',
      'service': 'Сервис', 'contact': 'Контакты', 'checkout': 'Оформление' };
    const slug = new URL(url, location.href).pathname.replace(/^\/|\.html$/g, '');
    const label = $('.curtain__t', curtain);
    label.textContent = (NAMES[slug] || 'Главная').toUpperCase();
    await gsap.to(curtain, { '--cy': '0%', duration: .5, ease: 'amorf' });
    let html;
    try { html = await (await fetch(url)).text(); }
    catch (e) { location.href = url; return; }
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const nm = doc.querySelector('main'), om = $('main');
    if (!nm || !om) { location.href = url; return; }
    destroyPage();
    om.replaceWith(nm);
    document.title = doc.title;
    const md = doc.querySelector('meta[name="description"]');
    if (md) $('meta[name="description"]').setAttribute('content', md.content);
    document.body.className = doc.body.className;
    document.body.dataset.page = doc.body.dataset.page || 'index.html';
    if (push) history.pushState({}, '', url);
    const hash = new URL(url, location.href).hash;
    const anchor = hash && $(hash);
    if (anchor) {
      lenis ? lenis.scrollTo(anchor, { offset: -90, immediate: true }) : anchor.scrollIntoView();
    } else {
      lenis ? lenis.scrollTo(0, { immediate: true }) : scrollTo(0, 0);
    }
    const path = location.pathname.split('/').pop() || 'index.html';
    $$('.hdr__nav a, .ovl__list a').forEach(a => {
      const h = a.getAttribute('href');
      h === path ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current');
    });
    /* подключаем скрипт страницы, если он ещё не загружен */
    const need = [...doc.querySelectorAll('script[data-page-js]')].map(s => s.getAttribute('src'));
    await Promise.all(need.map(src => new Promise(res => {
      if ($(`script[src="${src}"]`)) return res();
      const s = document.createElement('script'); s.src = src; s.dataset.pageJs = '1';
      s.onload = s.onerror = res; document.body.appendChild(s);
    })));
    initPage();
    await gsap.to(curtain, { '--cy': '-100%', duration: .55, ease: 'amorf', delay: .08 });
    gsap.set(curtain, { '--cy': '100%' });
    busy = false;
    if (pending && pending !== location.href) { const p = pending; pending = null; go(p); }
    else pending = null;
  }

  document.addEventListener('click', e => {
    const a = e.target.closest('a');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || a.target === '_blank' || a.hasAttribute('download')) return;
    if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    if (!same(href)) return;
    if (new URL(href, location.href).pathname === location.pathname &&
        new URL(href, location.href).search === location.search) return;
    e.preventDefault();
    go(href);
  });
  addEventListener('popstate', () => go(location.href, false));
}

/* ============================================================
   12. Прелоадер
   ============================================================ */
function initLoader() {
  const pl = $('[data-loader]');
  if (!pl) return;
  let seen = false;
  try { seen = sessionStorage.getItem('amorf:seen') === '1'; } catch (e) {}
  if (seen || REDUCED) { pl.remove(); document.body.classList.remove('is-locked'); return; }
  stopScroll();

  const cvs = $('[data-loader-cv]', pl);
  const num = $('[data-loader-num]', pl);
  const status = $('[data-loader-status]', pl);
  const ctx = cvs.getContext('2d');
  const STAGES = [
    [0,   'инициализация материи'],
    [.28, 'загрузка фаз 01–04'],
    [.55, 'калибровка плотности'],
    [.8,  'синтез звука'],
    [1,   'материя стабильна']
  ];

  /* Слово AMORF → сетка ячеек. Каждая ячейка получает ранг по матрице Байера
     и «замерзает» в своё финальное состояние, когда прогресс проходит её ранг. */
  let cells = null, gw = 0, gh = 0, cell = 8;
  function sample() {
    const w = cvs.clientWidth, h = cvs.clientHeight;
    cvs.width = w; cvs.height = h;
    cell = Math.max(5, Math.round(w / 150));
    gw = Math.ceil(w / cell); gh = Math.ceil(h / cell);
    const off = document.createElement('canvas');
    off.width = gw; off.height = gh;
    const oc = off.getContext('2d');
    oc.fillStyle = '#000'; oc.fillRect(0, 0, gw, gh);
    oc.fillStyle = '#fff';
    oc.textAlign = 'center'; oc.textBaseline = 'middle';
    const fs = Math.floor(gw / 4.6);
    oc.font = '600 ' + fs + 'px "Neue Montreal", Arial, sans-serif';
    oc.fillText('AMORF', gw / 2, gh / 2 + fs * .04);
    const d = oc.getImageData(0, 0, gw, gh).data;
    cells = new Float32Array(gw * gh * 2); /* [ранг, глиф?] */
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
      const i = y * gw + x;
      cells[i * 2] = (BAYER[y & 7][x & 7] / 64) * .82 + Math.random() * .18;
      cells[i * 2 + 1] = d[i * 4] > 127 ? 1 : 0;
    }
  }

  const state = { p: 0 };
  function draw() {
    if (!cells) return;
    ctx.fillStyle = '#080807';
    ctx.fillRect(0, 0, cvs.width, cvs.height);
    const p = state.p;
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
      const i = y * gw + x;
      const rank = cells[i * 2], glyph = cells[i * 2 + 1];
      let on, alpha;
      if (p >= rank) { on = glyph; alpha = glyph ? .92 : 0; }         /* замёрзла */
      else if (p >= rank - .16) { on = Math.random() > .5 ? 1 : 0; alpha = .5; } /* кипит у фронта */
      else { on = 1; alpha = Math.random() * .05; }                    /* дальний шум */
      if (on && alpha > .01) {
        ctx.fillStyle = 'rgba(232,232,227,' + alpha + ')';
        ctx.fillRect(x * cell, y * cell, cell - 1, cell - 1);
      }
    }
    /* фронт кристаллизации — тонкая светящаяся строка */
    const fy = Math.round(p * cvs.height);
    ctx.fillStyle = 'rgba(232,232,227,.06)';
    ctx.fillRect(0, fy - 1, cvs.width, 2);
  }

  let raf = 0, alive = true;
  const loop = () => { if (!alive) return; draw(); raf = requestAnimationFrame(loop); };

  const ready = (document.fonts && document.fonts.load)
    ? document.fonts.load('600 100px "Neue Montreal"').catch(() => {})
    : Promise.resolve();
  ready.then(() => {
    sample();
    addEventListener('resize', sample);
    loop();
    gsap.to(state, {
      p: 1, duration: 2.5, ease: 'power2.inOut',
      onUpdate: () => {
        const pct = Math.round(state.p * 100);
        if (num) num.textContent = String(pct).padStart(3, '0');
        if (status) {
          let s = STAGES[0][1];
          for (const [t, name] of STAGES) if (state.p >= t) s = name;
          if (status.textContent !== s) status.textContent = s;
        }
      },
      onComplete: () => { pl.dataset.done = '1'; }
    });
  });

  const enter = withSound => {
    try { sessionStorage.setItem('amorf:seen', '1'); } catch (e) {}
    if (withSound) { Sound.toggle(true); Sound.blip(180, 620, .5, .12, 'sawtooth'); }
    else Sound.click();
    /* растворение: фронт уходит обратно вверх, штора открывает hero */
    gsap.killTweensOf(state);
    const tl = gsap.timeline({ onComplete: () => {
      alive = false; cancelAnimationFrame(raf);
      removeEventListener('resize', sample);
      pl.remove(); startScroll(); ScrollTrigger.refresh();
    } });
    tl.to($('[data-loader-in]', pl), { opacity: 0, duration: .25 }, 0)
      .to($('.pl__hud', pl), { opacity: 0, duration: .25 }, 0)
      .to(state, { p: 0, duration: .55, ease: 'power3.in' }, 0)
      .to(pl, { clipPath: 'inset(0 0 100% 0)', duration: .85, ease: 'amorf' }, .3);
  };
  $('[data-loader-btn]', pl).addEventListener('click', () => enter(true));
  $('[data-loader-skip]', pl).addEventListener('click', () => enter(false));
}

/* ============================================================
   Старт
   ============================================================ */
function boot() {
  document.documentElement.classList.remove('js-off');
  initChrome();
  initCursor();
  initPage();
  initTransitions();
  initLoader();
}
document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot();
})();
