/* =====================================================================
   Slides: one scroll gesture = one step.
   Kept apart from js/main.js (the three.js scenes): this file only switches
   classes and attributes; css/slides.css does the motion, and each three.js
   scene watches its own slide's .is-active class.

   A slide can hold several steps (data-steps="4"): scrolling moves through
   its steps first, then on to the next slide. Inside a slide:
     data-step="k"         on the slide: the current step (0-based)
     [data-step-item="n"]  .is-current when n = k, .is-past when n < k
     [data-stack="n"]      data-pos = n - k (card stacks: 0 front, 1, 2 behind, -1 gone)
     [data-ring="n"]       data-slot = (n - k) mod count (cards taking turns in a ring: on the
                           numbers page 0 left, 1 middle, 2 right). A card that changes place gets
                           .is-moving for a moment; one that goes round the back (first to last
                           place, or back) gets .is-wrapping instead.
     [data-count="N"]      counts up from 0 to N: all of them as their slide comes in, and a
                           ring card's again each time it arrives in the middle (slot 1)
   On <html>: data-slide (the current slide's id) and data-section (its
   data-section), so things outside the slides (the header logo, the
   section nav) can follow.

   Input: mouse wheel / trackpad, touch swipe, keyboard (arrows, Page Up/Down,
   Space, Home, End), and links to #page-N (or #page-N/step).
   ===================================================================== */

{ // a block, so nothing here becomes a page-wide global (this is a plain script, not a module)
const root = document.querySelector('.slides');

if (root) {
  const html = document.documentElement;
  const slides = [...root.querySelectorAll('.slide')];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const stepsOf = (slide) => Math.max(1, parseInt(slide.dataset.steps, 10) || 1);

  // every stop in order: { slide index, step }
  const stops = [];
  slides.forEach((slide, s) => { for (let k = 0; k < stepsOf(slide); k++) stops.push({ s, k }); });
  const firstStop = (s) => stops.findIndex((p) => p.s === s);

  // stagger order of the animated items in each slide (read by the CSS as --i);
  // an element can set its own --i in the HTML to come in earlier or later
  for (const slide of slides) {
    slide.querySelectorAll('[data-anim]').forEach((el, i) => {
      if (!el.style.getPropertyValue('--i')) el.style.setProperty('--i', i);
    });
  }

  let pos = -1;            // no stop yet: the first render plays the entrance
  let lockedUntil = 0;     // ignore input until the current move has settled

  const fromHash = () => {
    const m = /^#(page-\d+)(?:\/(\d+))?$/.exec(location.hash);
    if (!m) return 0;
    const s = slides.findIndex((el) => el.id === m[1]);
    if (s === -1) return 0;
    const k = Math.min(stepsOf(slides[s]), Math.max(1, parseInt(m[2], 10) || 1)) - 1;
    return firstStop(s) + k;
  };

  /* ---------- count-up numbers ---------- */
  const fmt = new Intl.NumberFormat('en-US');
  function countUp(el, delay) {
    cancelAnimationFrame(el._raf);
    clearTimeout(el._start);
    const to = Number(el.dataset.count);
    if (reduceMotion.matches) { el.textContent = fmt.format(to); return; }
    el.textContent = '0';
    const dur = 1600;
    el._start = setTimeout(() => {
      const t0 = performance.now();
      const tick = (now) => {
        const t = Math.min(1, Math.max(0, (now - t0) / dur));   // a frame stamped before t0 counts as 0
        const e = t === 1 ? 1 : 1 - 2 ** (-10 * t);           // ease-out expo
        el.textContent = fmt.format(Math.round(to * e));
        if (t < 1) el._raf = requestAnimationFrame(tick);
      };
      el._raf = requestAnimationFrame(tick);
    }, delay);
  }

  function setStep(slide, k) {
    slide.dataset.step = String(k);
    slide.style.setProperty('--step', k);
    slide.querySelectorAll('[data-step-item]').forEach((el) => {
      const n = parseInt(el.dataset.stepItem, 10);
      el.classList.toggle('is-current', n === k);
      el.classList.toggle('is-past', n < k);
    });
    slide.querySelectorAll('[data-stack]').forEach((el) => {
      el.dataset.pos = String(parseInt(el.dataset.stack, 10) - k);
    });
    const ring = slide.querySelectorAll('[data-ring]');
    ring.forEach((el) => {
      const n = ring.length, slot = (((parseInt(el.dataset.ring, 10) - k) % n) + n) % n;
      const was = el.dataset.slot == null ? null : parseInt(el.dataset.slot, 10);
      el.dataset.slot = String(slot);
      if (was == null || was === slot) return;
      const cls = Math.abs(slot - was) === n - 1 ? 'is-wrapping' : 'is-moving';
      el.classList.remove('is-moving', 'is-wrapping');
      void el.offsetWidth;                             // restart the animation
      el.classList.add(cls);
      clearTimeout(el._moveEnd);
      el._moveEnd = setTimeout(() => el.classList.remove(cls), 1100);
      // arriving in the middle on a step of the page already showing: count again
      if (slot === 1 && slide.classList.contains('is-active')) {
        el.querySelectorAll('[data-count]').forEach((n) => countUp(n, 150));
      }
    });
  }

  function render() {
    const { s, k } = stops[pos];
    // the page coming in: its numbers count up as they blur in (css/slides.css, after the cards)
    if (!slides[s].classList.contains('is-active')) {
      slides[s].querySelectorAll('[data-count]').forEach((n) => countUp(n, 900));
    }
    slides.forEach((slide, i) => {
      if (i === s) setStep(slide, k);
      slide.classList.toggle('is-active', i === s);
      slide.classList.toggle('is-before', i < s);
      slide.inert = i !== s;                           // only the current page is focusable / read out
    });
    root.dataset.page = String(s + 1);
    html.dataset.slide = slides[s].id;
    html.dataset.section = slides[s].dataset.section || '';
    document.querySelectorAll('.section-nav a').forEach((a) => {
      if (a.dataset.section === html.dataset.section) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }

  function go(next, { force = false } = {}) {
    next = Math.max(0, Math.min(stops.length - 1, next));
    if (next === pos) return;
    const now = performance.now();
    if (!force && now < lockedUntil) return;
    const prev = pos;
    const sameSlide = prev !== -1 && stops[prev].s === stops[next].s;
    lockedUntil = now + (reduceMotion.matches ? 450 : sameSlide ? 850 : 1000);
    pos = next;
    render();
    const { s, k } = stops[pos];
    history.replaceState(null, '', `#${slides[s].id}${stepsOf(slides[s]) > 1 ? `/${k + 1}` : ''}`);
  }

  /* ---------- wheel / trackpad ----------
     A trackpad flick keeps sending wheel events (momentum) for a second or more. One
     gesture moves one step: after a move, wheel input is ignored until it pauses. */
  const WHEEL_GAP = 220;       // ms of quiet that marks the start of a new gesture
  const WHEEL_THRESHOLD = 30;  // px of wheel travel needed to turn the page
  let lastWheel = 0, wheelSum = 0, gestureUsed = false;

  window.addEventListener('wheel', (e) => {
    if (e.ctrlKey) return;     // pinch-zoom on trackpads
    e.preventDefault();
    const now = performance.now();
    if (now - lastWheel > WHEEL_GAP) { gestureUsed = false; wheelSum = 0; }
    lastWheel = now;
    if (gestureUsed || now < lockedUntil) return;

    const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * innerHeight : e.deltaY;
    wheelSum += dy;
    if (Math.abs(wheelSum) >= WHEEL_THRESHOLD) {
      gestureUsed = true;
      go(pos + Math.sign(wheelSum));
      wheelSum = 0;
    }
  }, { passive: false });

  /* ---------- touch swipe ---------- */
  let touchY = null, touchX = null;
  window.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) { touchY = null; return; }
    touchY = e.touches[0].clientY;
    touchX = e.touches[0].clientX;
  }, { passive: true });
  window.addEventListener('touchend', (e) => {
    if (touchY == null) return;
    const t = e.changedTouches[0];
    const dy = touchY - t.clientY, dx = touchX - t.clientX;
    touchY = null;
    if (Math.abs(dy) > 50 && Math.abs(dy) > Math.abs(dx) * 1.2) go(pos + Math.sign(dy));
  }, { passive: true });

  /* ---------- keyboard (Left / Right too: presentation clickers send them) ---------- */
  window.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const t = e.target;
    const typing = t.closest?.('input, textarea, select, [contenteditable=""], [contenteditable="true"]');
    if (typing) return;
    const onControl = t.closest?.('button, a, summary');
    let next = null;
    switch (e.key) {
      case 'ArrowDown': case 'ArrowRight': case 'PageDown': next = pos + 1; break;
      case 'ArrowUp':   case 'ArrowLeft':  case 'PageUp':   next = pos - 1; break;
      case 'Home': next = 0; break;
      case 'End':  next = stops.length - 1; break;
      case ' ':
        if (onControl) return;                      // Space presses buttons
        next = pos + (e.shiftKey ? -1 : 1);
        break;
      default: return;
    }
    e.preventDefault();
    go(next);
  });

  /* ---------- #page-N links (the section nav) ---------- */
  document.addEventListener('click', (e) => {
    const link = e.target.closest?.('a[href^="#page-"]');
    if (!link) return;
    const s = slides.findIndex((el) => `#${el.id}` === link.getAttribute('href'));
    if (s === -1) return;
    e.preventDefault();
    go(firstStop(s), { force: true });
  });
  window.addEventListener('hashchange', () => go(fromHash(), { force: true }));

  /* ---------- start: play the entrance of the stop in the URL (default: the first) ---------- */
  const start = fromHash();
  slides.forEach((slide) => setStep(slide, 0));       // every page waiting below, at its first step
  requestAnimationFrame(() => requestAnimationFrame(() => go(start, { force: true })));
}
}
