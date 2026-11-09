// Page 2: the cloth ring. Photo prints on cloth standing edge-on around a ring, like a rolodex (the
// ClothRing component in vendor/scrollstage, pulled from the cloth carousel in Backup/js/main.js),
// seen from above. The prints come and go like the other pages' content (css/slides.css): row by
// row from the back, rising in out of a blur and leaving upwards (downwards when going back). Drag to
// turn it, click a print to bring it to the front; the cloth bends, flutters and catches the
// cursor's air.
// A plain script: uses window.Scrollstage (js/lib/scrollstage.js) and watchSlide() (js/whenactive.js).
(() => {
const { Stage, ClothRing } = window.Scrollstage;

// the prints: placeholder photos from picsum.photos (3:4 like the prints; a fixed seed each, so the
// same photo every time). Picsum sends CORS headers, so WebGL can use them; they need a connection.
// The ring repeats them to fill its 20 cards.
const PHOTO_COUNT = 10;
const PHOTOS = Array.from({ length: PHOTO_COUNT }, (_, i) => `https://picsum.photos/seed/aqari-${i + 1}/600/800`);

const canvas = document.querySelector('.gallery-canvas');
if (canvas) {
  startGallery(canvas).catch((err) => console.warn('Image slider unavailable.', err));
}

async function startGallery(canvas) {
  const slide = canvas.closest('.slide');

  // the page is laid out at Full HD and zoomed to fit the screen (css/style.css): draw at the
  // screen's real resolution (the zoom times the device pixel ratio, capped at 1.5)
  const ratio = () => {
    const r = Math.min(innerWidth / 1920, innerHeight / 1080) * Math.min(1.5, window.devicePixelRatio || 1);
    return [r, r];
  };
  const stage = new Stage({
    canvas,
    fullscreen: false,
    antialias: true,
    dpr: ratio(),
    fov: 42,
  });
  addEventListener('resize', () => { stage.dpr = ratio(); stage.resize(); });

  const slider = stage.add(new ClothRing({
    images: PHOTOS,
    count: 20,
    // fewer prints than the ring was drawn for, at the same size (the radius 32 prints would make)
    radius: 32 * 0.4 / (2 * Math.PI),
    cardSize: [1, 4 / 3],
    spacing: 0.4,
    cornerRadius: 0.035,
    speed: 0.075,             // the prints at the front come in from the right and leave to the left
    // the cloth waves like a flag in a steady wind; the cursor blows on the prints near it
    flag: 1,
    air: 1.3,
    // come and go with the pages: the same move (94 px), fade and blur, timing and easing as the
    // [data-anim] content in css/slides.css, one row of the ring at a time (the defaults in ClothRing)
    entrance: 'page',
  }));
  // high, looking down across the ring, at the size of the ring in Aqari_Revised (page 2)
  // (distance: smaller = closer / bigger prints; height: lower = flatter view of the ring)
  ClothRing.cameraFor(stage, slider, { distance: 1.45 });

  // draw only while the page is showing, and while the cards leave after it is left
  let stopTimer = 0;
  watchSlide(slide, {
    enter: () => { clearTimeout(stopTimer); slider.show(); stage.start(); },
    leave: () => {
      // the deck moved on (this page is now above the current one): up; it went back: down
      slider.hide(slide.classList.contains('is-before') ? -1 : 1);
      clearTimeout(stopTimer);
      stopTimer = setTimeout(() => stage.stop(), 1300);
    },
  });
  // passed over while hidden (a jump, or the deck going back past it): wait on the side the page's
  // content now waits on, so the prints come in from there, as the text on other pages does
  const rest = () => {
    if (!slide.classList.contains('is-active')) slider.restSide(slide.classList.contains('is-before') ? -1 : 1);
  };
  new MutationObserver(rest).observe(slide, { attributes: true, attributeFilter: ['class'] });
  rest();                     // opened further on (index.html#page-5): the prints wait above
}
})();
