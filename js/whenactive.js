// Calls enter() when a slide becomes the current page (js/slides.js gives it .is-active) and
// leave() when it stops being it, so each three.js scene only draws while its page is showing.
// A plain script: watchSlide() and loopWhileActive() are global; load it before js/gallery.js.
function watchSlide(slide, { enter, leave }) {
  let active = null;
  const check = () => {
    const now = slide.classList.contains('is-active');
    if (now === active) return;
    active = now;
    (now ? enter : leave)?.();
  };
  new MutationObserver(check).observe(slide, { attributes: true, attributeFilter: ['class'] });
  check();
}

/**
 * A frame loop that runs while its slide is showing, and for `keep` ms after it is left (while
 * the scene plays its exit). `draw(seconds, dt)` is called each frame.
 */
function loopWhileActive(slide, draw, { keep = 1500, onEnter, onLeave } = {}) {
  let raf = 0, last = 0, leftAt = -Infinity, active = false;
  const frame = (now) => {
    if (!active && now - leftAt > keep) { raf = 0; return; }
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    draw(now / 1000, dt);
  };
  watchSlide(slide, {
    enter: () => {
      active = true;
      onEnter?.();
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    },
    leave: () => {
      active = false;
      leftAt = performance.now();
      onLeave?.();
    },
  });
}
